import type { SupabaseClient } from "@supabase/supabase-js";

export const GENERATED_CV_LIMIT = 5;

type OwnershipResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403 | 404 | 500; message: string };

export async function countGeneratedCvsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnershipResult<number>> {
  const { count, error } = await supabase
    .from("generated_cvs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    return { ok: false, status: 500, message: "Failed to validate CV limit" };
  }

  return { ok: true, data: count ?? 0 };
}

export async function getOwnedGeneratedCv<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  cvId: number,
  select: string
): Promise<OwnershipResult<T>> {
  const { data: cv, error } = await supabase
    .from("generated_cvs")
    .select(select)
    .eq("id", cvId)
    .single();

  if (error || !cv) {
    return { ok: false, status: 404, message: "CV not found" };
  }

  const ownerId =
    typeof cv === "object" && cv !== null && "user_id" in cv
      ? (cv as { user_id?: unknown }).user_id
      : null;

  if (typeof ownerId !== "string" || ownerId !== userId) {
    return { ok: false, status: 403, message: "Access denied" };
  }

  return { ok: true, data: cv as T };
}
