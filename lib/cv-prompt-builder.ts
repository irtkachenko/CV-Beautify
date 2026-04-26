import { renderPromptTemplate } from "./prompts";

export type PromptMessage = {
  role: "system" | "user";
  content: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
}

function splitDirectives(rawPrompt: string): string[] {
  const normalized = normalizeWhitespace(rawPrompt);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*;\s*/))
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function formatUserDirectives(rawPrompt?: string | null): string {
  const normalized = normalizeWhitespace(rawPrompt || "");
  const directives = splitDirectives(normalized);

  if (!normalized) {
    return [
      "RAW USER REQUEST:",
      "(none)",
      "",
      "INTERPRETED DIRECTIVES:",
      "- No extra user directives were provided.",
      "- Preserve template or document defaults except where safety or factual cleanup is needed.",
    ].join("\n");
  }

  return [
    "RAW USER REQUEST:",
    '"""',
    normalized,
    '"""',
    "",
    "INTERPRETED DIRECTIVES:",
    ...directives.map((directive) => `- ${directive}`),
  ].join("\n");
}

function formatOriginalContext(originalDocText?: string | null): string {
  const normalized = normalizeWhitespace(originalDocText || "");
  if (!normalized) {
    return "ORIGINAL CANDIDATE CONTEXT:\n(none)";
  }

  return [
    "ORIGINAL CANDIDATE CONTEXT:",
    '"""',
    normalized,
    '"""',
  ].join("\n");
}

export async function buildGenerationPromptMessages({
  templateHtml,
  docText,
  generationPrompt,
}: {
  templateHtml: string;
  docText: string;
  generationPrompt?: string | null;
}): Promise<PromptMessage[]> {
  const systemPrompt = await renderPromptTemplate("system-generate-cv");
  const userPrompt = await renderPromptTemplate("user-generate-cv", {
    user_directives: formatUserDirectives(generationPrompt),
    candidate_data: normalizeWhitespace(docText),
    template_html: templateHtml.trim(),
  });

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export async function buildEditPromptMessages({
  currentHtml,
  prompt,
  originalDocText,
}: {
  currentHtml: string;
  prompt: string;
  originalDocText?: string | null;
}): Promise<PromptMessage[]> {
  const systemPrompt = await renderPromptTemplate("system-edit-cv");
  const userPrompt = await renderPromptTemplate("user-edit-cv", {
    user_directives: formatUserDirectives(prompt),
    original_doc_context: formatOriginalContext(originalDocText),
    current_html: currentHtml.trim(),
  });

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
