import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const jobId = parseInt(params.jobId, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ message: "Invalid job id" }, { status: 400 });
    }

    const { data: cv, error } = await supabase
      .from("generated_cvs")
      .select(`
        *,
        cv_templates (
          id,
          name,
          file_name,
          screenshot_url,
          description
        )
      `)
      .eq("id", jobId)
      .single();

    if (error || !cv) {
      return NextResponse.json({ message: "CV generation job not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const statusResponse = {
      id: cv.id,
      status: cv.status,
      progress: cv.progress || undefined,
      pdfUrl: cv.pdf_url || undefined,
      htmlContent: cv.html_content || undefined,
      errorMessage: cv.error_message || undefined,
      name: cv.name || undefined,
      template: cv.cv_templates || undefined,
    };

    return NextResponse.json(statusResponse);
  } catch (error) {
    console.error("Generate status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
