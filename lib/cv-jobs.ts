import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEditPromptMessages, buildGenerationPromptMessages } from "./cv-prompt-builder";
import { runGroqCompletionWithFallback } from "@lib/services/groq-completion";
import {
  ensureTemplateStyles,
  extractHtmlFromModelResponse,
  normalizeCommonMojibake,
} from "@lib/services/cv-html";

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
  patch: {
    status?: "pending" | "processing" | "complete" | "failed";
    progress?: string | null;
    error_message?: string | null;
    html_content?: string | null;
    pdf_url?: string | null;
    original_doc_text?: string | null;
    original_doc_links?: unknown;
  }
) {
  const { error } = await supabase.from("generated_cvs").update(patch).eq("id", cvId);
  if (error) {
    throw new Error(`Failed to update CV ${cvId}: ${error.message}`);
  }
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
  const messages = await buildGenerationPromptMessages({
    templateHtml,
    docText,
    generationPrompt: generationPrompt || "",
  });

  const result = await runGroqCompletionWithFallback({
    temperature: 0.3,
    maxTokens: 6000,
    messages,
  });

  return normalizeCommonMojibake(extractHtmlFromModelResponse(result));
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
  const messages = await buildEditPromptMessages({
    currentHtml,
    prompt,
    originalDocText,
  });

  const result = await runGroqCompletionWithFallback({
    temperature: 0.4,
    maxTokens: 6000,
    messages,
  });

  return normalizeCommonMojibake(extractHtmlFromModelResponse(result));
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
    await setProgress(supabase, cvId, {
      status: "processing",
      progress: "Extracting document text...",
      error_message: null,
    });

    const extracted = await mammoth.extractRawText({ buffer: fileBuffer });
    const docText = normalizeCommonMojibake(extracted.value?.trim() || "");
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
