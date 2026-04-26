import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";
import type { GeneratedCvResponse, ResumesListResponse } from "@shared/routes";

export const activeResumeJobsQueryKey = ["active-resume-jobs"];
const ACTIVE_JOB_GRACE_MS = 15000;

function mergeResumeLists(
  serverData: ResumesListResponse,
  activeJobs: GeneratedCvResponse[]
): ResumesListResponse {
  if (activeJobs.length === 0) {
    return serverData;
  }

  const mergedById = new Map<number, GeneratedCvResponse>();

  for (const cv of serverData.cvs) {
    mergedById.set(cv.id, cv);
  }

  for (const activeCv of activeJobs) {
    const existing = mergedById.get(activeCv.id);
    if (!existing) {
      mergedById.set(activeCv.id, activeCv);
      continue;
    }

    if (existing.status === "complete" || existing.status === "failed") {
      mergedById.set(activeCv.id, existing);
      continue;
    }

    mergedById.set(activeCv.id, {
      ...existing,
      ...activeCv,
      template: activeCv.template || existing.template,
    });
  }

  const mergedCvs = Array.from(mergedById.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    ...serverData,
    cvs: mergedCvs,
    count: mergedCvs.length,
    canCreateMore: mergedCvs.length < serverData.limit,
  };
}

export function useMyResumes() {
  const queryClient = useQueryClient();
  const resumesQuery = useQuery({
    queryKey: [api.resumes.list.path],
    staleTime: 1000, // 1 second stale time to allow quick updates
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authedFetch(api.resumes.list.path);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to fetch resumes");
      }
      const data = await res.json();
      return parseWithLogging(api.resumes.list.responses[200], data, "resumes.list");
    },
    retry: 2, // Retry 2 times for resume list
  });

  const activeJobsQuery = useQuery({
    queryKey: activeResumeJobsQueryKey,
    queryFn: async () => [] as GeneratedCvResponse[],
    initialData: [] as GeneratedCvResponse[],
    staleTime: Infinity,
  });

  const activeJobs = activeJobsQuery.data || [];
  const serverData = resumesQuery.data;

  useEffect(() => {
    if (!serverData) {
      return;
    }

    const serverIds = new Set(serverData.cvs.map((cv) => cv.id));
    const now = Date.now();

    queryClient.setQueryData<GeneratedCvResponse[]>(activeResumeJobsQueryKey, (current = []) =>
      current.filter((cv) => {
        if (serverIds.has(cv.id)) {
          return false;
        }

        const isTerminal = cv.status === "complete" || cv.status === "failed";
        if (!isTerminal) {
          return true;
        }

        const ageMs = now - new Date(cv.updatedAt).getTime();
        return ageMs < ACTIVE_JOB_GRACE_MS;
      })
    );
  }, [serverData, queryClient]);

  const mergedData = serverData
    ? mergeResumeLists(serverData, activeJobs)
    : activeJobs.length > 0
      ? {
          cvs: [...activeJobs].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          ),
          count: activeJobs.length,
          limit: 5,
          canCreateMore: activeJobs.length < 5,
        }
      : serverData;

  return {
    ...resumesQuery,
    data: mergedData,
  };
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.resumes.delete.path, { id });
      const res = await authedFetch(url, { 
        method: api.resumes.delete.method,
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(i18n.t("errors.resume_not_found") || "Resume not found");
        }
        throw new Error(i18n.t("errors.delete_resume_failed") || "Failed to delete resume");
      }
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ResumesListResponse | undefined>(
        [api.resumes.list.path],
        (current) => {
          if (!current) {
            return current;
          }

          const nextCvs = current.cvs.filter((cv) => cv.id !== id);
          return {
            ...current,
            cvs: nextCvs,
            count: nextCvs.length,
            canCreateMore: nextCvs.length < current.limit,
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      queryClient.setQueryData<GeneratedCvResponse[]>(activeResumeJobsQueryKey, (current = []) =>
        current.filter((cv) => cv.id !== id)
      );
      toast({
        title: i18n.t("toast.cv_deleted_title") || "Resume Deleted",
        description: i18n.t("toast.cv_deleted_desc") || "Your generated CV has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: i18n.t("toast.delete_failed_title") || "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
