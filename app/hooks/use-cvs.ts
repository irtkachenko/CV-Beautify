import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import i18n from "@lib/i18n";
import { authedFetch } from "@lib/authed-fetch";
import { supabase } from "@lib/supabase";
import { mapGeneratedCvRow } from "@lib/cv-mappers";

type UseMyResumesOptions = {
  enabled?: boolean;
};

const RESUMES_QUERY_KEY = [api.resumes.list.path] as const;
const RESUME_LIMIT = 5;

export function useMyResumes(options: UseMyResumesOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: RESUMES_QUERY_KEY,
    enabled,
    staleTime: 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? 3000 : false,
    refetchIntervalInBackground: true,
    networkMode: "always",
    retry: 2,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data, error } = await supabase
        .from("generated_cvs")
        .select(
          `
            *,
            cv_templates (
              id,
              name,
              file_name,
              screenshot_url,
              description,
              created_at
            )
          `
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Failed to fetch resumes");
      }

      const mapped = (data || []).map((row) => mapGeneratedCvRow(row as any));
      return {
        cvs: mapped,
        count: mapped.length,
        limit: RESUME_LIMIT,
        canCreateMore: mapped.length < RESUME_LIMIT,
      };
    },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY });
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
      void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY });
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
