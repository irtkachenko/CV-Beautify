import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapGeneratedCvRow } from "@lib/cv-mappers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const { data: cvs, error } = await supabase
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
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch resumes:", error);
      return NextResponse.json({ message: "Failed to fetch resumes" }, { status: 500 });
    }

    const mappedCvs = (cvs || []).map(mapGeneratedCvRow);
    return NextResponse.json(mappedCvs);
  } catch (error) {
    console.error("Resumes route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Missing CV id" }, { status: 400 });
    }

    const cvId = parseInt(id, 10);
    if (isNaN(cvId)) {
      return NextResponse.json({ message: "Invalid CV id" }, { status: 400 });
    }

    // Verify ownership
    const { data: cv, error: fetchError } = await supabase
      .from("generated_cvs")
      .select("user_id")
      .eq("id", cvId)
      .single();

    if (fetchError || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("generated_cvs")
      .delete()
      .eq("id", cvId);

    if (deleteError) {
      console.error("CV delete error:", deleteError);
      return NextResponse.json({ message: "Failed to delete CV" }, { status: 500 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error("Resumes DELETE error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
