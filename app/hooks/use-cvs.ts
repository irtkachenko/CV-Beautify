import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import i18n from "@/lib/i18n";
import { parseWithLogging } from "@/utils/validation";
import { authedFetch } from "@/lib/authed-fetch";

export function useMyResumes() {
  return useQuery({
    queryKey: [api.resumes.list.path],
    staleTime: 2 * 60 * 1000, // 2 minutes - resumes change frequently
    refetchOnMount: "always",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
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
