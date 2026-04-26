import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import i18n from "@lib/i18n";
import { parseWithLogging } from "@lib/validation";
import { authedFetch } from "@lib/authed-fetch";
import type { JobStatusResponse } from "@shared/types/cv";

type GenerateCvInput = {
  templateId: number;
  file: File;
  generationPrompt?: string;
};

export function useGenerateCv() {
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
}

export function usePollingJob(jobId: number, initialStatus: string) {
  const [data, setData] = useState<JobStatusResponse | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (jobId <= 0) {
      setData(undefined);
      setError(null);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let currentStatus = initialStatus;

    const fetchStatus = async () => {
      try {
        void authedFetch("/api/cv-jobs/run-next", { method: "POST" }).catch(() => null);
        const url = buildUrl(api.generate.status.path, { jobId });
        const res = await authedFetch(url);
        if (!res.ok) {
          if (res.status === 404 || res.status === 401 || res.status === 403) {
            currentStatus = "failed";
            setData({
              id: jobId,
              status: "failed",
              errorMessage:
                res.status === 404
                  ? "CV generation was removed or no longer exists."
                  : "You no longer have access to this CV generation.",
            });
            setError(null);
            return;
          }
          throw new Error(i18n.t("errors.fetch_job_status_failed"));
        }

        const raw = await res.json();
        const next = parseWithLogging(api.generate.status.responses[200], raw, "generate.status");
        if (cancelled) {
          return;
        }

        setData(next);
        setError(null);
        currentStatus = next.status;
        if (currentStatus === "complete" && !next.pdfUrl) {
          // Avoid terminal "success" without render URL; force another poll tick.
          currentStatus = "processing";
        }

        if (currentStatus === "pending" || currentStatus === "processing") {
          timeoutId = window.setTimeout(fetchStatus, 1500);
        }
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        const normalized = nextError instanceof Error ? nextError : new Error(i18n.t("errors.fetch_job_status_failed"));
        setError(normalized);

        if (currentStatus === "pending" || currentStatus === "processing") {
          timeoutId = window.setTimeout(fetchStatus, 4000);
        }
      }
    };

    if (currentStatus === "pending" || currentStatus === "processing") {
      void fetchStatus();
    }

    const handleFocus = () => {
      if (currentStatus === "pending" || currentStatus === "processing") {
        void fetchStatus();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [initialStatus, jobId]);

  return {
    data,
    error,
  };
}
