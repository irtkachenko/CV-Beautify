import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { runAiEditJob } from "@lib/cv-jobs";
import { comprehensivePromptValidation } from "@lib/prompt-validation";
import { getOwnedGeneratedCv } from "@lib/services/generated-cv-service";

export const dynamic = "force-dynamic";

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
        status: "processing",
        progress: "Editing CV with Groq...",
        error_message: null,
      })
      .eq("id", cvId);

    if (markProcessingError) {
      console.error(`[ai-edit:${cvId}] Failed to mark CV as processing:`, markProcessingError);
      return NextResponse.json({ message: "Failed to start AI edit" }, { status: 500 });
    }

    runAiEditJob({
      supabase,
      cvId,
      cv,
      prompt: promptValidation.cleanedPrompt || trimmedPrompt,
      useOriginalDocumentContext: Boolean(useOriginalDocumentContext),
    }).catch((error) => {
      console.error(`[ai-edit:${cvId}] Unhandled error in runAiEditJob:`, error);
      supabase
        .from("generated_cvs")
        .update({
          status: "failed",
          progress: null,
          error_message: error instanceof Error ? error.message : "Unknown error occurred during AI edit",
        })
        .eq("id", cvId)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error(`[ai-edit:${cvId}] Failed to update status to failed:`, updateError);
          }
        });
    });

    return NextResponse.json({ jobId: cvId }, { status: 202 });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
