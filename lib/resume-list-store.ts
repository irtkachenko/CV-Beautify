import type { GeneratedCvResponse, ResumesListResponse } from "@shared/routes";

export const DEFAULT_RESUME_LIMIT = 5;

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

export function upsertResumeInList(
  current: ResumesListResponse | undefined,
  resume: GeneratedCvResponse,
  fallbackLimit = DEFAULT_RESUME_LIMIT
): ResumesListResponse {
  const base = current ?? createEmptyResumeList(fallbackLimit);
  const existingIndex = base.cvs.findIndex((cv) => cv.id === resume.id);
  const nextCvs = [...base.cvs];

  if (existingIndex >= 0) {
    nextCvs[existingIndex] = {
      ...nextCvs[existingIndex],
      ...resume,
      template: resume.template || nextCvs[existingIndex].template,
    };
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
