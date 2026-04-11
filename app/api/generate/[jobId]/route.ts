import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapGeneratedCvRow } from "@lib/cv-mappers";

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

    const mappedCv = mapGeneratedCvRow(cv);
    const statusResponse = {
      id: mappedCv.id,
      status: mappedCv.status,
      progress: mappedCv.progress || undefined,
      pdfUrl: mappedCv.pdfUrl || undefined,
      htmlContent: mappedCv.htmlContent || undefined,
      errorMessage: mappedCv.errorMessage || undefined,
      name: mappedCv.name || undefined,
      template: mappedCv.template || undefined,
    };

    return NextResponse.json(statusResponse);
  } catch (error) {
    console.error("Generate status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
