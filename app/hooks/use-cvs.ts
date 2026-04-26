import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";

type UseMyResumesOptions = {
  enabled?: boolean;
};

const getResumesQueryKey = () => [api.resumes.list.path, Date.now()] as const;

export function useMyResumes(options: UseMyResumesOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const queryKey = getResumesQueryKey();
  
  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 0, // Always stale to force refetch
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? 3000 : false,
    refetchIntervalInBackground: true,
    networkMode: "always",
    retry: 2,
    queryFn: async () => {
      const res = await authedFetch(`${api.resumes.list.path}?_t=${Date.now()}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to fetch resumes");
      }
      const data = await res.json();
      return parseWithLogging(api.resumes.list.responses[200], data, "resumes.list");
    },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getResumesQueryKey() });
  }, [queryClient]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh,
  };
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      void queryClient.invalidateQueries({ queryKey: getResumesQueryKey() });
      toast({
        title: i18n.t("toast.cv_deleted_title") || "Resume Deleted",
        description: i18n.t("toast.cv_deleted_desc") || "Your generated CV has been removed.",
      });
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
    deletingId: deleteMutation.isPending ? deleteMutation.variables ?? null : null,
  };
}
