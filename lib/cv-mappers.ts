import type { CvTemplate, GeneratedCvResponse, GeneratedCvStatus, OriginalDocLink } from "@shared/types/cv";

type RawTemplateRow = {
  id: number;
  name: string;
  file_name: string;
  screenshot_url: string;
  description: string | null;
  created_at?: string | null;
};

type RawGeneratedCvRow = {
  id: number;
  user_id: string;
  template_id: number;
  status: string;
  progress: string | null;
  pdf_url: string | null;
  html_content: string | null;
  original_doc_text: string | null;
  original_doc_links: unknown;
  name: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  cv_templates?: RawTemplateRow | null;
};

function normalizeStatus(value: string): GeneratedCvStatus {
  if (value === "pending" || value === "processing" || value === "complete" || value === "failed") {
    return value;
  }
  return "failed";
}

function normalizeOriginalLinks(value: unknown): OriginalDocLink[] | null {
  if (!Array.isArray(value)) return null;
  const links = value.filter(
    (item): item is OriginalDocLink =>
      typeof item === "object" &&
      item !== null &&
      "text" in item &&
      "href" in item &&
      typeof (item as { text: unknown }).text === "string" &&
      typeof (item as { href: unknown }).href === "string"
  );
  return links.length > 0 ? links : null;
}

export function mapTemplateRow(row: RawTemplateRow): CvTemplate {
  return {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    screenshotUrl: row.screenshot_url,
    description: row.description ?? null,
    createdAt: row.created_at ?? null,
  };
}

export function mapGeneratedCvRow(row: RawGeneratedCvRow): GeneratedCvResponse {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    status: normalizeStatus(row.status),
    progress: row.progress ?? null,
    pdfUrl: row.pdf_url ?? null,
    htmlContent: row.html_content ?? null,
    originalDocText: row.original_doc_text ?? null,
    originalDocLinks: normalizeOriginalLinks(row.original_doc_links),
    name: row.name ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    template: row.cv_templates ? mapTemplateRow(row.cv_templates) : undefined,
  };
}
