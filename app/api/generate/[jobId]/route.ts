import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "../../../lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseServerClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

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

    if (cv.user_id !== user.id) {
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
