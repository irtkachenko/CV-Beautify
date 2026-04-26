import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";
import type { ResumesListResponse } from "@shared/routes";
import { replaceResumeList } from "@lib/resume-list-store";

type UseMyResumesOptions = {
  enabled?: boolean;
  watchProcessing?: boolean;
};

const RESUMES_QUERY_KEY = ["api", "resumes", "list"] as const;

async function fetchResumesList(): Promise<ResumesListResponse> {
  const res = await authedFetch(`${api.resumes.list.path}?_t=${Date.now()}`);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch resumes");
  }

  const data = await res.json();
  const parsed = parseWithLogging(api.resumes.list.responses[200], data, "resumes.list");
  return replaceResumeList(parsed);
}

export function useMyResumes(options: UseMyResumesOptions = {}) {
  const { enabled = true, watchProcessing = false } = options;
  const queryClient = useQueryClient();

  const query = useQuery<ResumesListResponse, Error>({
    queryKey: RESUMES_QUERY_KEY,
    queryFn: fetchResumesList,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: enabled,
    retry: 2,
    refetchInterval:
      enabled && watchProcessing
        ? (current) => {
            const resumes = current.state.data;
            const hasProcessing = Boolean(
              resumes?.cvs.some((cv) => cv.status === "pending" || cv.status === "processing")
            );
            const hasError = Boolean(current.state.error);
            return hasProcessing || hasError || !resumes ? 3000 : 10000;
          }
        : false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY });
  }, [queryClient]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading || query.isFetching,
    error: query.error ?? null,
    refresh,
  };
}

export function useDeleteResume() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
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

      return true;
    },
    onSuccess: () => {
      toast({
        title: i18n.t("toast.cv_deleted_title") || "Resume Deleted",
        description: i18n.t("toast.cv_deleted_desc") || "Your generated CV has been removed.",
      });
      void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: i18n.t("toast.delete_failed_title") || "Deletion Failed",
        description:
          error instanceof Error
            ? error.message
            : i18n.t("errors.delete_resume_failed") || "Failed to delete resume",
        variant: "destructive",
      });
    },
  });

  const deleteResume = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    deleteResume,
    deletingId: (deleteMutation.isPending ? deleteMutation.variables : null) ?? null,
  };
}
