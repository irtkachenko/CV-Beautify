export type GeneratedCvStatus = "pending" | "processing" | "complete" | "failed";

export interface OriginalDocLink {
  text: string;
  href: string;
}

export interface CvTemplate {
  id: number;
  name: string;
  fileName: string;
  screenshotUrl: string;
  description: string | null;
  createdAt: string | null;
}

export interface GeneratedCvResponse {
  id: number;
  userId: string;
  templateId: number;
  status: GeneratedCvStatus;
  progress: string | null;
  pdfUrl: string | null;
  htmlContent: string | null;
  originalDocText: string | null;
  originalDocLinks: OriginalDocLink[] | null;
  name: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  template?: CvTemplate;
}

export interface JobStatusResponse {
  id: number;
  status: GeneratedCvStatus;
  progress?: string;
  pdfUrl?: string;
  htmlContent?: string;
  errorMessage?: string;
  name?: string;
  template?: CvTemplate;
}
