import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapGeneratedCvRow } from "@lib/cv-mappers";
import { getOwnedGeneratedCv } from "@lib/services/generated-cv-service";

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

    const cvResult = await getOwnedGeneratedCv(
      supabase,
      userId,
      jobId,
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
      const message = cvResult.status === 404 ? "CV generation job not found" : cvResult.message;
      return NextResponse.json({ message }, { status: cvResult.status });
    }

    const mappedCv = mapGeneratedCvRow(cvResult.data as any);
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

    return NextResponse.json(statusResponse, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Generate status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
