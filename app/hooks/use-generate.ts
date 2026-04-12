import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, buildUrl } from "@shared/routes";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";

// Input type for file upload
type GenerateCvInput = {
  templateId: number;
  file: File;
  generationPrompt?: string;
};

export function useGenerateCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCvInput) => {
      console.log(`[useGenerateCv] Starting mutation with template: ${data.templateId}`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('templateId', data.templateId.toString());
      if (data.generationPrompt?.trim()) {
        formData.append('generationPrompt', data.generationPrompt.trim());
      }
      formData.append("temperature", "0.5");

      console.log(`[useGenerateCv] Sending request to ${api.generate.start.path}`);
      const res = await authedFetch(api.generate.start.path, {
        method: api.generate.start.method,
        body: formData,
        headers: {
          'x-language': i18n.language || 'ua'
        }
      });

      console.log(`[useGenerateCv] Response status: ${res.status}`);
      if (!res.ok) {
        if (res.status === 400 || res.status === 429) {
          const error = await res.json();
          console.log(`[useGenerateCv] API error:`, error);
          throw new Error(error.message || i18n.t("errors.validation_failed"));
        }
        console.log(`[useGenerateCv] Generic error, status: ${res.status}`);
        throw new Error(i18n.t("errors.generate_start_failed"));
      }

      const responseData = await res.json();
      const parsed = parseWithLogging(api.generate.start.responses[202], responseData, "generate.start");
      console.log(`[useGenerateCv] Mutation successful, got jobId:`, parsed.jobId);
      return parsed;
    },
    retry: 1, // Retry once for generation failures
    retryDelay: 2000, // Wait 2 seconds before retry
    onSuccess: () => {
      console.log(`[useGenerateCv] onSuccess callback triggered`);
      console.log(`[useGenerateCv] About to invalidate queries with key:`, [api.resumes.list.path]);
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      console.log(`[useGenerateCv] Queries invalidated`);
      // Also set the query to stale to ensure fresh data on next mount
      queryClient.setQueryData([api.resumes.list.path], (old: any) => undefined);
      console.log(`[useGenerateCv] Query data cleared`);
      
      // Small delay to ensure server has created the record before refetching
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: [api.resumes.list.path] });
        console.log(`[useGenerateCv] Forced refetch queries after delay`);
      }, 100);
      
      console.log(`[useGenerateCv] Invalidated queries and redirecting to my-resumes`);
      // Scroll to top to show the new CV being generated
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Hook for polling an individual CV's status
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

      const parsed = parseWithLogging(api.generate.status.responses[200], data, "generate.status");

      return parsed;
    },
    // Override global staleTime Infinity so polling can restart from cached complete state
    staleTime: 0,
    refetchOnMount: "always", // Always refetch on mount to get latest status
    refetchOnWindowFocus: !isInitialTerminal,
    refetchOnReconnect: !isInitialTerminal,
    refetchIntervalInBackground: !isInitialTerminal,
    // Retry logic for polling
    retry: (failureCount, error) => {
      // Aggressive retry for polling since it's critical
      if (failureCount < 5) {
        console.warn(`Job status poll attempt ${failureCount + 1} failed:`, error);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Faster retry for polling (1s, 2s, 4s, 8s, 16s max)
      return Math.min(1000 * 2 ** attemptIndex, 16000);
    },
    // Poll every 2 seconds if status is still pending or processing
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status || initialStatus;
      console.log(`[usePollingJob:${jobId}] Current status: ${currentStatus}, polling: ${currentStatus === "pending" || currentStatus === "processing"}`);
      if (currentStatus === "pending" || currentStatus === "processing") {
        return 2000;
      }
      console.log(`[usePollingJob:${jobId}] Stopping polling - status is ${currentStatus}`);
      return false;
    },
    enabled: jobId > 0, // Always enable polling, let refetchInterval control when to stop
  });

  // Handle side effects (like invalidating queries) in useEffect, not in queryFn
  useEffect(() => {
    // Invalidate when we get a terminal status OR when data changes from non-terminal to terminal
    const currentStatus = query.data?.status;
    const isTerminalStatus = currentStatus === "complete" || currentStatus === "failed";
    
    if (isTerminalStatus) {
      // Invalidate the resumes list to show updated status
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
      // Also invalidate this specific job query to ensure fresh data on remount
      queryClient.invalidateQueries({ queryKey: [api.generate.status.path, jobId] });
    }
  }, [query.data, queryClient, jobId]); // Use query.data instead of query.data?.status to catch all changes

  // Also invalidate if initial status is already terminal (for cases where component mounts after completion)
  useEffect(() => {
    const isInitialTerminal = initialStatus === "complete" || initialStatus === "failed";
    if (isInitialTerminal) {
      queryClient.invalidateQueries({ queryKey: [api.resumes.list.path] });
    }
  }, [initialStatus, queryClient, jobId]);

  return query;
}
