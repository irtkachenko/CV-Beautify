import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import {
  claimNextPendingCvJobForUser,
  completeCvJob,
  failCvJob,
  type CvJobRow,
} from "@lib/cv-jobs-queue";
import { runAiEditJob, runGenerateCvJobFromText } from "@lib/cv-jobs";
import { getOwnedGeneratedCv } from "@lib/services/generated-cv-service";

export const dynamic = "force-dynamic";

async function processGenerateJob(
  supabase: any,
  userId: string,
  job: CvJobRow
) {
  const cvResult = await getOwnedGeneratedCv(
    supabase,
    userId,
    job.cv_id,
    `
      *,
      cv_templates (
        id,
        name,
        file_name,
        screenshot_url,
        description
      )
    `
  );

  if (!cvResult.ok) {
    throw new Error(cvResult.message);
  }

  const cv = cvResult.data as any;
  if (!cv.cv_templates?.file_name) {
    throw new Error("Template information is missing");
  }
  if (!cv.original_doc_text || !String(cv.original_doc_text).trim()) {
    throw new Error("Original document text is missing");
  }

  const generationPrompt =
    typeof job.payload?.generationPrompt === "string"
      ? job.payload.generationPrompt
      : "";

  await runGenerateCvJobFromText({
    supabase,
    cvId: job.cv_id,
    template: cv.cv_templates,
    docText: cv.original_doc_text,
    generationPrompt,
  });
}

async function processEditJob(
  supabase: any,
  userId: string,
  job: CvJobRow
) {
  const cvResult = await getOwnedGeneratedCv(
    supabase,
    userId,
    job.cv_id,
    `
      *,
      cv_templates (
        file_name
      )
    `
  );

  if (!cvResult.ok) {
    throw new Error(cvResult.message);
  }

  const cv = cvResult.data as any;
  const prompt = typeof job.payload?.prompt === "string" ? job.payload.prompt.trim() : "";
  if (!prompt) {
    throw new Error("AI edit prompt is missing");
  }

  await runAiEditJob({
    supabase,
    cvId: job.cv_id,
    cv,
    prompt,
    useOriginalDocumentContext: Boolean(job.payload?.useOriginalDocumentContext),
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const claimed = await claimNextPendingCvJobForUser(supabase, userId);
    if (!claimed.ok) {
      return NextResponse.json({ message: claimed.message }, { status: 500 });
    }

    const job = claimed.job;
    if (!job) {
      return new NextResponse(null, { status: 204 });
    }

    try {
      if (job.job_type === "generate") {
        await processGenerateJob(supabase, userId, job);
      } else {
        await processEditJob(supabase, userId, job);
      }
      await completeCvJob(supabase, job.id);
      return NextResponse.json({ processed: true, jobId: job.id, cvId: job.cv_id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker error";
      await supabase
        .from("generated_cvs")
        .update({
          status: "failed",
          progress: null,
          error_message: message,
        })
        .eq("id", job.cv_id);
      await failCvJob(supabase, job.id, message);
      return NextResponse.json({ processed: false, message, jobId: job.id, cvId: job.cv_id }, { status: 500 });
    }
  } catch (error) {
    console.error("CV jobs worker route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
