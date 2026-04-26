import type { GeneratedCvResponse, ResumesListResponse } from "@shared/routes";

export const DEFAULT_RESUME_LIMIT = 5;

function isTerminalStatus(status: GeneratedCvResponse["status"]): boolean {
  return status === "complete" || status === "failed";
}

function mergeResume(existing: GeneratedCvResponse, incoming: GeneratedCvResponse): GeneratedCvResponse {
  const shouldKeepExistingTerminal = isTerminalStatus(existing.status) && !isTerminalStatus(incoming.status);
  const preferred = shouldKeepExistingTerminal ? existing : incoming;
  const fallback = shouldKeepExistingTerminal ? incoming : existing;

  return {
    ...fallback,
    ...preferred,
    progress: preferred.progress ?? fallback.progress,
    pdfUrl: preferred.pdfUrl ?? fallback.pdfUrl,
    htmlContent: preferred.htmlContent ?? fallback.htmlContent,
    originalDocText: preferred.originalDocText ?? fallback.originalDocText,
    originalDocLinks: preferred.originalDocLinks ?? fallback.originalDocLinks,
    name: preferred.name ?? fallback.name,
    errorMessage: preferred.errorMessage ?? fallback.errorMessage,
    template: preferred.template || fallback.template,
    updatedAt: preferred.updatedAt || fallback.updatedAt,
    createdAt: preferred.createdAt || fallback.createdAt,
  };
}

function sortResumes(cvs: GeneratedCvResponse[]): GeneratedCvResponse[] {
  return [...cvs].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function createEmptyResumeList(limit = DEFAULT_RESUME_LIMIT): ResumesListResponse {
  return {
    cvs: [],
    count: 0,
    limit,
    canCreateMore: true,
  };
}

export function replaceResumeList(
  incoming: ResumesListResponse,
  limit = incoming.limit || DEFAULT_RESUME_LIMIT
): ResumesListResponse {
  const cvs = sortResumes(incoming.cvs);
  return {
    cvs,
    count: cvs.length,
    limit,
    canCreateMore: cvs.length < limit,
  };
}

export function mergeResumeLists(
  incoming: ResumesListResponse,
  current: ResumesListResponse | undefined,
  limit = incoming.limit || current?.limit || DEFAULT_RESUME_LIMIT
): ResumesListResponse {
  if (!current) {
    return replaceResumeList(incoming, limit);
  }

  const incomingById = new Map(incoming.cvs.map((cv) => [cv.id, cv]));
  const merged: GeneratedCvResponse[] = incoming.cvs.map((cv) => {
    const existing = current.cvs.find((currentCv) => currentCv.id === cv.id);
    return existing ? mergeResume(existing, cv) : cv;
  });

  for (const currentCv of current.cvs) {
    if (!incomingById.has(currentCv.id) && !isTerminalStatus(currentCv.status)) {
      merged.push(currentCv);
    }
  }

  const cvs = sortResumes(merged);
  return {
    cvs,
    count: cvs.length,
    limit,
    canCreateMore: cvs.length < limit,
  };
}

export function upsertResumeInList(
  current: ResumesListResponse | undefined,
  resume: GeneratedCvResponse,
  fallbackLimit = DEFAULT_RESUME_LIMIT
): ResumesListResponse {
  const base = current ?? createEmptyResumeList(fallbackLimit);
  const existingIndex = base.cvs.findIndex((cv) => cv.id === resume.id);
  const nextCvs = [...base.cvs];

  if (existingIndex >= 0) {
    nextCvs[existingIndex] = mergeResume(nextCvs[existingIndex], resume);
  } else {
    nextCvs.unshift(resume);
  }

  const cvs = sortResumes(nextCvs);
  return {
    ...base,
    cvs,
    count: cvs.length,
    canCreateMore: cvs.length < base.limit,
  };
}

export function removeResumeFromList(
  current: ResumesListResponse | undefined,
  resumeId: number
): ResumesListResponse | undefined {
  if (!current) {
    return current;
  }

  const cvs = current.cvs.filter((cv) => cv.id !== resumeId);
  return {
    ...current,
    cvs,
    count: cvs.length,
    canCreateMore: cvs.length < current.limit,
  };
}
