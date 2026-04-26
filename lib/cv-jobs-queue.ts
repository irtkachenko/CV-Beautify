import type { SupabaseClient } from "@supabase/supabase-js";

export type CvJobType = "generate" | "edit";
export type CvJobStatus = "pending" | "processing" | "completed" | "failed";

export type CvJobRow = {
  id: number;
  user_id: string;
  cv_id: number;
  job_type: CvJobType;
  payload: Record<string, unknown> | null;
  status: CvJobStatus;
  attempts: number;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function enqueueCvJob(
  supabase: SupabaseClient,
  {
    userId,
    cvId,
    jobType,
    payload,
  }: {
    userId: string;
    cvId: number;
    jobType: CvJobType;
    payload?: Record<string, unknown>;
  }
): Promise<{ ok: true; job: CvJobRow } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("cv_jobs")
    .insert({
      user_id: userId,
      cv_id: cvId,
      job_type: jobType,
      payload: payload ?? {},
      status: "pending",
      attempts: 0,
      last_error: null,
      started_at: null,
      finished_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "Failed to enqueue CV job" };
  }

  return { ok: true, job: data as CvJobRow };
}

export async function claimNextPendingCvJobForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true; job: CvJobRow | null } | { ok: false; message: string }> {
  const staleCutoffIso = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  await supabase
    .from("cv_jobs")
    .update({
      status: "pending",
      last_error: "Worker lease expired; retrying job",
      started_at: null,
      finished_at: null,
    })
    .eq("user_id", userId)
    .eq("status", "processing")
    .lt("started_at", staleCutoffIso);

  const { data: next, error: fetchError } = await supabase
    .from("cv_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: fetchError.message || "Failed to fetch pending CV jobs" };
  }

  if (!next) {
    return { ok: true, job: null };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("cv_jobs")
    .update({
      status: "processing",
      attempts: (next.attempts || 0) + 1,
      started_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", next.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError) {
    return { ok: false, message: claimError.message || "Failed to claim CV job" };
  }

  if (!claimed) {
    return { ok: true, job: null };
  }

  return { ok: true, job: claimed as CvJobRow };
}

export async function completeCvJob(
  supabase: SupabaseClient,
  jobId: number
): Promise<void> {
  const { error } = await supabase
    .from("cv_jobs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || `Failed to complete job ${jobId}`);
  }
}

export async function failCvJob(
  supabase: SupabaseClient,
  jobId: number,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from("cv_jobs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      last_error: message,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message || `Failed to fail job ${jobId}`);
  }
}
