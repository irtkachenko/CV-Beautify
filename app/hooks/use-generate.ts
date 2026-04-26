import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { ResumesListResponse } from "@shared/routes";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";
import { upsertResumeInList } from "@lib/resume-list-store";

type GenerateCvInput = {
  templateId: number;
  file: File;
  generationPrompt?: string;
};

export function useGenerateCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCvInput) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("templateId", data.templateId.toString());
      if (data.generationPrompt?.trim()) {
        formData.append("generationPrompt", data.generationPrompt.trim());
      }
      formData.append("temperature", "0.5");

      const res = await authedFetch(api.generate.start.path, {
        method: api.generate.start.method,
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 429) {
          const error = await res.json();
          throw new Error(error.message || i18n.t("errors.validation_failed"));
        }
        throw new Error(i18n.t("errors.generate_start_failed"));
      }

      const responseData = await res.json();
      return parseWithLogging(api.generate.start.responses[202], responseData, "generate.start");
    },
    retry: 1,
    retryDelay: 2000,
    onSuccess: (response) => {
      queryClient.setQueryData<ResumesListResponse | undefined>(
        [api.resumes.list.path],
        (current) => upsertResumeInList(current, response.cv)
      );

      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      }, 5000);

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
}

export function usePollingJob(jobId: number, initialStatus: string) {
  const queryClient = useQueryClient();
  const isInitialTerminal = initialStatus === "complete" || initialStatus === "failed";

  const query = useQuery({
    queryKey: [api.generate.status.path, jobId],
    queryFn: async () => {
      const url = buildUrl(api.generate.status.path, { jobId });
      const res = await authedFetch(url);
      if (!res.ok) {
        throw new Error(i18n.t("errors.fetch_job_status_failed"));
      }

      const data = await res.json();
      return parseWithLogging(api.generate.status.responses[200], data, "generate.status");
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: !isInitialTerminal,
    refetchOnReconnect: !isInitialTerminal,
    refetchIntervalInBackground: !isInitialTerminal,
    retry: (failureCount) => failureCount < 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 16000),
    refetchInterval: (currentQuery) => {
      const currentStatus = currentQuery.state.data?.status || initialStatus;
      if (currentStatus === "pending" || currentStatus === "processing") {
        return 2000;
      }
      return false;
    },
    enabled: jobId > 0,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    queryClient.setQueryData<ResumesListResponse | undefined>(
      [api.resumes.list.path],
      (current) => {
        const existing = current?.cvs.find((cv) => cv.id === jobId);
        if (!existing) {
          return current;
        }

        return upsertResumeInList(current, {
          ...existing,
          status: query.data.status,
          progress: query.data.progress ?? existing.progress,
          pdfUrl: query.data.pdfUrl ?? existing.pdfUrl,
          htmlContent: query.data.htmlContent ?? existing.htmlContent,
          errorMessage: query.data.errorMessage ?? existing.errorMessage,
          name: query.data.name ?? existing.name,
          template: query.data.template ?? existing.template,
          updatedAt: new Date().toISOString(),
        });
      }
    );

    const isTerminalStatus = query.data.status === "complete" || query.data.status === "failed";
    if (isTerminalStatus) {
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.generate.status.path, jobId] });

      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      }, 2000);
    }
  }, [jobId, query.data, queryClient]);

  useEffect(() => {
    if (isInitialTerminal) {
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
    }
  }, [isInitialTerminal, queryClient]);

  return query;
}
