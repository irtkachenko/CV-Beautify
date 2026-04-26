import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { runAiEditJob } from "@lib/cv-jobs";

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
    const { data: cv, error: fetchError } = await supabase
      .from("generated_cvs")
      .select(`
        *,
        cv_templates (
          file_name
        )
      `)
      .eq("id", cvId)
      .single();

    if (fetchError || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json({ message: "Prompt is required" }, { status: 400 });
    }

    if (cv.status === "pending" || cv.status === "processing") {
      return NextResponse.json({ message: "CV is already being processed" }, { status: 409 });
    }

    const trimmedPrompt = prompt.trim();

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

    await runAiEditJob({
      supabase,
      cvId,
      cv,
      prompt: trimmedPrompt,
      useOriginalDocumentContext: Boolean(useOriginalDocumentContext),
    });

    return NextResponse.json({ jobId: cvId }, { status: 202 });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
