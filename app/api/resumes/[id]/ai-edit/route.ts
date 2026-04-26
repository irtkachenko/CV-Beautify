import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { runAiEditJob } from "@lib/cv-jobs";
import { comprehensivePromptValidation } from "@lib/prompt-validation";
import { getOwnedGeneratedCv } from "@lib/services/generated-cv-service";
import { enqueueCvJob } from "@lib/cv-jobs-queue";

export const dynamic = "force-dynamic";

function isQueueTableMissing(message: string): boolean {
  return /(cv_jobs|table\s+.*cv_jobs|schema cache|does not exist)/i.test(message);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const cvId = parseInt(params.id, 10);
    if (isNaN(cvId)) {
      return NextResponse.json({ message: "Invalid CV id" }, { status: 400 });
    }

    const body = await request.json();
    const { prompt, useOriginalDocumentContext } = body;

    // Verify ownership
    const cvResult = await getOwnedGeneratedCv(
      supabase,
      userId,
      cvId,
      `
        *,
        cv_templates (
          file_name
        )
      `
    );

    if (!cvResult.ok) {
      return NextResponse.json({ message: cvResult.message }, { status: cvResult.status });
    }
    const cv = cvResult.data as any;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json({ message: "Prompt is required" }, { status: 400 });
    }

    if (cv.status === "pending" || cv.status === "processing") {
      return NextResponse.json({ message: "CV is already being processed" }, { status: 409 });
    }

    const trimmedPrompt = prompt.trim();
    const promptValidation = await comprehensivePromptValidation(trimmedPrompt, "edit");
    if (!promptValidation.isValid) {
      return NextResponse.json({ message: promptValidation.warning || "Prompt validation failed" }, { status: 400 });
    }

    const { error: markProcessingError } = await supabase
      .from("generated_cvs")
      .update({
        status: "pending",
        progress: "Queued for AI edit...",
        error_message: null,
      })
      .eq("id", cvId);

    if (markProcessingError) {
      console.error(`[ai-edit:${cvId}] Failed to mark CV as processing:`, markProcessingError);
      return NextResponse.json({ message: "Failed to start AI edit" }, { status: 500 });
    }

    const enqueueResult = await enqueueCvJob(supabase, {
      userId,
      cvId,
      jobType: "edit",
      payload: {
        prompt: promptValidation.cleanedPrompt || trimmedPrompt,
        useOriginalDocumentContext: Boolean(useOriginalDocumentContext),
      },
    });

    if (!enqueueResult.ok) {
      if (isQueueTableMissing(enqueueResult.message)) {
        runAiEditJob({
          supabase,
          cvId,
          cv,
          prompt: promptValidation.cleanedPrompt || trimmedPrompt,
          useOriginalDocumentContext: Boolean(useOriginalDocumentContext),
        }).catch((error) => {
          console.error(`[ai-edit:${cvId}] Fallback job failed:`, error);
        });
      } else {
        await supabase
          .from("generated_cvs")
          .update({
            status: "failed",
            progress: null,
            error_message: enqueueResult.message,
          })
          .eq("id", cvId);
        return NextResponse.json({ message: "Failed to enqueue AI edit" }, { status: 500 });
      }
    }

    return NextResponse.json({ jobId: cvId }, { status: 202 });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
