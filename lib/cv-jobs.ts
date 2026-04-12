import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModelChain } from "./groq-models";

type TemplateRow = {
  id: number;
  name: string;
  file_name: string;
  screenshot_url: string;
  description: string | null;
};

type GeneratedCvRow = {
  id: number;
  user_id: string;
  template_id: number;
  html_content: string | null;
  original_doc_text: string | null;
  original_doc_links: unknown;
  name: string | null;
  cv_templates?: TemplateRow | null;
};

// Dynamic model chain will be fetched at runtime
let cachedModelChain: string[] | null = null;

async function getGroqModelChain(): Promise<string[]> {
  if (!cachedModelChain) {
    cachedModelChain = await getModelChain();
  }
  return cachedModelChain;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Unknown Groq error";
}

function isModelRetryableError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "").toLowerCase()
      : "";

  return (
    code === "rate_limit_exceeded" ||
    message.includes("rate_limit_exceeded") ||
    message.includes("request too large") ||
    message.includes("tokens per minute") ||
    message.includes("model") && message.includes("not found") ||
    message.includes("model decommissioned")
  );
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey });
}

async function resolveTemplateHtml(fileName: string): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "public", "templates", fileName),
    path.join(process.cwd(), ".bak-templates", fileName),
    path.join(process.cwd(), ".mock-data", "html-templates", fileName),
    path.join(process.cwd(), "dist", "public", "templates", fileName),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf-8");
    } catch {
      // Continue to next candidate
    }
  }

  throw new Error(`Template HTML not found for ${fileName}`);
}

async function setProgress(
  supabase: SupabaseClient,
  cvId: number,
  patch: { status?: "pending" | "processing" | "complete" | "failed"; progress?: string | null; error_message?: string | null; html_content?: string | null; pdf_url?: string | null; original_doc_text?: string | null; original_doc_links?: unknown }
) {
  const { error } = await supabase.from("generated_cvs").update(patch).eq("id", cvId);
  if (error) {
    throw new Error(`Failed to update CV ${cvId}: ${error.message}`);
  }
}

async function runGroqCompletionWithFallback({
  messages,
  temperature,
  maxTokens,
}: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  maxTokens: number;
}) {
  const groq = getGroqClient();
  const modelChain = await getGroqModelChain();
  let lastError: unknown;

  for (const model of modelChain) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages,
      });

      return completion.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
      lastError = error;
      const shouldTryNext = isModelRetryableError(error) && model !== modelChain[modelChain.length - 1];

      console.warn(`[groq] model '${model}' failed: ${extractErrorMessage(error)}`);
      if (!shouldTryNext) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All Groq models failed");
}

async function generateHtmlWithGroq({
  templateHtml,
  docText,
  generationPrompt,
}: {
  templateHtml: string;
  docText: string;
  generationPrompt?: string | null;
}) {
  const userPrompt = [
    "Fill the provided HTML resume template using the candidate data.",
    "Rules:",
    "- Preserve the template CSS, layout, and structure as much as possible.",
    "- Replace placeholder content with real content from candidate data.",
    "- Return only valid HTML, no markdown, no explanations.",
    generationPrompt ? `Additional instruction: ${generationPrompt}` : "",
    "",
    "Candidate data:",
    docText,
    "",
    "HTML template:",
    templateHtml,
  ]
    .filter(Boolean)
    .join("\n");

  return runGroqCompletionWithFallback({
    temperature: 0.3,
    maxTokens: 6000,
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume formatter. Return only complete HTML content suitable for direct rendering.",
      },
      { role: "user", content: userPrompt },
    ],
  });
}

async function editHtmlWithGroq({
  currentHtml,
  prompt,
  originalDocText,
}: {
  currentHtml: string;
  prompt: string;
  originalDocText?: string | null;
}) {
  const userPrompt = [
    "Edit the provided resume HTML according to the instruction.",
    "Rules:",
    "- Keep styling and layout intact.",
    "- Improve wording/content per instruction.",
    "- Return only valid HTML, no markdown, no explanations.",
    "",
    `Instruction: ${prompt}`,
    originalDocText ? `Original candidate context:\n${originalDocText}` : "",
    "",
    "Current HTML:",
    currentHtml,
  ]
    .filter(Boolean)
    .join("\n");

  return runGroqCompletionWithFallback({
    temperature: 0.4,
    maxTokens: 6000,
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume editor. Return only complete HTML content suitable for direct rendering.",
      },
      { role: "user", content: userPrompt },
    ],
  });
}

export async function runGenerateCvJob({
  supabase,
  cvId,
  fileBuffer,
  template,
  generationPrompt,
}: {
  supabase: SupabaseClient;
  cvId: number;
  fileBuffer: Buffer;
  template: TemplateRow;
  generationPrompt?: string | null;
}) {
  try {
    console.info(`[generate:${cvId}] Job started`);
    await setProgress(supabase, cvId, { status: "processing", progress: "Extracting document text...", error_message: null });

    const extracted = await mammoth.extractRawText({ buffer: fileBuffer });
    const docText = extracted.value?.trim();
    if (!docText) {
      throw new Error("Document text extraction failed or produced empty text");
    }

    await setProgress(supabase, cvId, {
      status: "processing",
      progress: "Loading template...",
      original_doc_text: docText,
      original_doc_links: [],
    });

    const templateHtml = await resolveTemplateHtml(template.file_name);

    await setProgress(supabase, cvId, {
      status: "processing",
      progress: "Generating CV with Groq...",
    });

    const html = await generateHtmlWithGroq({
      templateHtml,
      docText,
      generationPrompt,
    });

    if (!html || html.length < 200) {
      throw new Error("Groq returned empty or invalid HTML output");
    }

    await setProgress(supabase, cvId, {
      status: "complete",
      progress: null,
      error_message: null,
      html_content: html,
      pdf_url: `/api/generated-cv/${cvId}/render`,
    });

    console.info(`[generate:${cvId}] Job completed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    console.error(`[generate:${cvId}] Job failed:`, message);
    await setProgress(supabase, cvId, {
      status: "failed",
      progress: null,
      error_message: message,
    });
  }
}

export async function runAiEditJob({
  supabase,
  cvId,
  cv,
  prompt,
  useOriginalDocumentContext,
}: {
  supabase: SupabaseClient;
  cvId: number;
  cv: GeneratedCvRow;
  prompt: string;
  useOriginalDocumentContext?: boolean;
}) {
  try {
    console.info(`[ai-edit:${cvId}] Job started`);
    await setProgress(supabase, cvId, {
      status: "processing",
      progress: "Editing CV with Groq...",
      error_message: null,
    });

    let currentHtml = cv.html_content || "";
    if (!currentHtml) {
      if (!cv.cv_templates?.file_name) {
        throw new Error("Template information is missing for AI edit");
      }
      currentHtml = await resolveTemplateHtml(cv.cv_templates.file_name);
    }

    const html = await editHtmlWithGroq({
      currentHtml,
      prompt,
      originalDocText: useOriginalDocumentContext ? cv.original_doc_text : null,
    });

    if (!html || html.length < 200) {
      throw new Error("Groq returned empty or invalid HTML output for AI edit");
    }

    await setProgress(supabase, cvId, {
      status: "complete",
      progress: null,
      error_message: null,
      html_content: html,
      pdf_url: `/api/generated-cv/${cvId}/render`,
    });

    console.info(`[ai-edit:${cvId}] Job completed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI edit error";
    console.error(`[ai-edit:${cvId}] Job failed:`, message);
    await setProgress(supabase, cvId, {
      status: "failed",
      progress: null,
      error_message: message,
    });
  }
}
