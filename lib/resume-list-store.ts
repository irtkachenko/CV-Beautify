import type { GeneratedCvResponse, ResumesListResponse } from "@shared/routes";

export const DEFAULT_RESUME_LIMIT = 5;

function sortResumes(cvs: GeneratedCvResponse[]): GeneratedCvResponse[] {
  return [...cvs].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
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
