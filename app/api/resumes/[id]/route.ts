import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapGeneratedCvRow } from "@lib/cv-mappers";

export const dynamic = "force-dynamic";

export async function GET(
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
      .eq("id", cvId)
      .single();

    if (error || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(mapGeneratedCvRow(cv));
  } catch (error) {
    console.error("CV by ID error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
