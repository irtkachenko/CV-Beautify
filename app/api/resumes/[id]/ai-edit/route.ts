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

    void runAiEditJob({
      supabase,
      cvId,
      cv,
      prompt: prompt.trim(),
      useOriginalDocumentContext: Boolean(useOriginalDocumentContext),
    });

    return NextResponse.json({ jobId: cvId }, { status: 202 });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
