import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

async function fetchResumesList(): Promise<ResumesListResponse> {
  const res = await authedFetch(api.resumes.list.path);
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
  const [data, setData] = useState<ResumesListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const isMountedRef = useRef(true);

  const refresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  const hasProcessing = useMemo(
    () => Boolean(data?.cvs.some((cv) => cv.status === "pending" || cv.status === "processing")),
    [data]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Always fetch fresh data - no caching
        const next = await fetchResumesList();
        if (!cancelled && isMountedRef.current) {
          setData(next);
        }
      } catch (nextError) {
        if (!cancelled && isMountedRef.current) {
          setError(nextError instanceof Error ? nextError : new Error("Failed to fetch resumes"));
          setData(null);
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Always refresh data every 3 seconds to ensure real-time updates
    const intervalId = window.setInterval(() => {
      setRefreshTick((tick) => tick + 1);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleFocus = () => {
      setRefreshTick((tick) => tick + 1);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export function useDeleteResume() {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const deleteResume = useCallback(
    async (id: number) => {
      setDeletingId(id);
      try {
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

        toast({
          title: i18n.t("toast.cv_deleted_title") || "Resume Deleted",
          description: i18n.t("toast.cv_deleted_desc") || "Your generated CV has been removed.",
        });
        return true;
      } catch (error) {
        toast({
          title: i18n.t("toast.delete_failed_title") || "Deletion Failed",
          description: error instanceof Error ? error.message : (i18n.t("errors.delete_resume_failed") || "Failed to delete resume"),
          variant: "destructive",
        });
        return false;
      } finally {
        if (isMountedRef.current) {
          setDeletingId(null);
        }
      }
    },
    [toast]
  );

  return {
    deleteResume,
    deletingId,
  };
}
