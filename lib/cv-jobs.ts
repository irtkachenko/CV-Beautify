import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModelChain } from "./groq-models";
import { loadPrompt } from "./prompts";
import { comprehensivePromptValidation } from "./prompt-validation";

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

  // Rate limit and temporary issues are retryable
  const isRetryable = (
    code === "rate_limit_exceeded" ||
    message.includes("rate_limit_exceeded") ||
    message.includes("request too large") ||
    message.includes("tokens per minute") ||
    message.includes("overloaded")
  );

  // Model not found, decommissioned, or authentication errors are NOT retryable
  const isNonRetryable = (
    message.includes("model") && (message.includes("not found") || message.includes("does not exist") || message.includes("unavailable")) ||
    message.includes("model decommissioned") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    code === "invalid_api_key" ||
    code === "unauthorized"
  );

  if (isNonRetryable) {
    console.warn(`[groq] Model permanently unavailable: ${message}`);
    return false;
  }

  return isRetryable;
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
  const attemptedModels: string[] = [];
  const permanentFailures: string[] = [];

  console.info(`[groq] Trying ${modelChain.length} models in chain: ${modelChain.join(", ")}`);

  for (const model of modelChain) {
    attemptedModels.push(model);
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages,
      });

      const result = completion.choices[0]?.message?.content?.trim() || "";
      console.info(`[groq] Successfully used model '${model}'`);
      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = extractErrorMessage(error);
      const isRetryable = isModelRetryableError(error);
      const isLastModel = model === modelChain[modelChain.length - 1];

      if (!isRetryable) {
        permanentFailures.push(model);
      }

      console.warn(`[groq] model '${model}' failed: ${errorMessage} (retryable: ${isRetryable})`);
      
      if (!isRetryable || isLastModel) {
        break;
      }
    }
  }

  // Construct a comprehensive error message
  const errorSummary = `All Groq models failed. Attempted: ${attemptedModels.join(", ")}. Permanent failures: ${permanentFailures.join(", ") || "none"}. Last error: ${extractErrorMessage(lastError)}`;
  
  // If all models are permanently unavailable, provide a clear message
  if (permanentFailures.length === modelChain.length) {
    throw new Error("No AI models are currently available. Please try again later or contact support.");
  }

  throw new Error(errorSummary);
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
  // Validate the generation prompt with comprehensive AI + regex validation
  const validation = await comprehensivePromptValidation(generationPrompt || "", 'generation');
  if (!validation.isValid) {
    throw new Error(validation.warning || "Invalid prompt content");
  }

  const userPrompt = await loadPrompt("generate-cv", {
    additional_instruction: validation.cleanedPrompt || generationPrompt || "",
    doc_text: docText,
    template_html: templateHtml,
  });

  const result = await runGroqCompletionWithFallback({
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

  // Clean up markdown code block wrappers if present
  return result
    .replace(/^```html\s*\n?/i, '') // Remove opening ```html
    .replace(/^```\s*\n?/, '')      // Remove opening ```
    .replace(/\n?```\s*$/i, '')     // Remove closing ```
    .trim();
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
  // Validate the edit prompt with comprehensive AI + regex validation
  const validation = await comprehensivePromptValidation(prompt, 'edit');
  if (!validation.isValid) {
    throw new Error(validation.warning || "Invalid prompt content");
  }

  const userPrompt = await loadPrompt("edit-cv", {
    prompt: validation.cleanedPrompt || prompt,
    original_doc_context: originalDocText ? `Original candidate context:\n${originalDocText}` : "",
    current_html: currentHtml,
  });

  const result = await runGroqCompletionWithFallback({
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

  // Clean up markdown code block wrappers if present
  return result
    .replace(/^```html\s*\n?/i, '') // Remove opening ```html
    .replace(/^```\s*\n?/, '')      // Remove opening ```
    .replace(/\n?```\s*$/i, '')     // Remove closing ```
    .trim();
}

function extractStyleBlocks(html: string): string {
  const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) ?? [];
  const stylesheetLinks = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [];
  return [...styleMatches, ...stylesheetLinks].join("\n");
}

function ensureTemplateStyles(generatedHtml: string, fallbackTemplateHtml: string): string {
  if (/<style[\s\S]*?<\/style>/i.test(generatedHtml) || /rel=["']stylesheet["']/i.test(generatedHtml)) {
    return generatedHtml;
  }

  const styleBlock = extractStyleBlocks(fallbackTemplateHtml);
  if (!styleBlock) {
    return generatedHtml;
  }

  if (/<\/head>/i.test(generatedHtml)) {
    return generatedHtml.replace(/<\/head>/i, `${styleBlock}\n</head>`);
  }

  if (/<body[^>]*>/i.test(generatedHtml)) {
    return generatedHtml.replace(/<body[^>]*>/i, (match) => `${match}\n${styleBlock}\n`);
  }

  return `${styleBlock}\n${generatedHtml}`;
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

    const generatedHtml = await generateHtmlWithGroq({
      templateHtml,
      docText,
      generationPrompt,
    });

    const html = ensureTemplateStyles(generatedHtml, templateHtml);

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

    const generatedHtml = await editHtmlWithGroq({
      currentHtml,
      prompt,
      originalDocText: useOriginalDocumentContext ? cv.original_doc_text : null,
    });

    const html = ensureTemplateStyles(generatedHtml, currentHtml);

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
