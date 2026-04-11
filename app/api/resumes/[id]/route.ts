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

export async function DELETE(
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

    const { data: cv, error: fetchError } = await supabase
      .from("generated_cvs")
      .select("id, user_id")
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
      console.error("CV delete by ID error:", deleteError);
      return NextResponse.json({ message: "Failed to delete CV" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("CV by ID DELETE error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const updatePatch: Record<string, unknown> = {};

    if (typeof body?.name === "string") {
      const safeName = body.name.trim();
      if (!safeName) {
        return NextResponse.json({ message: "Name cannot be empty" }, { status: 400 });
      }
      if (safeName.length > 160) {
        return NextResponse.json({ message: "Name is too long" }, { status: 400 });
      }
      updatePatch.name = safeName;
    }

    if (typeof body?.htmlContent === "string") {
      const htmlContent = body.htmlContent.trim();
      if (!htmlContent) {
        return NextResponse.json({ message: "HTML content cannot be empty" }, { status: 400 });
      }
      updatePatch.html_content = htmlContent;
      updatePatch.status = "complete";
      updatePatch.progress = null;
      updatePatch.error_message = null;
      updatePatch.pdf_url = `/api/generated-cv/${cvId}/render`;
    }

    if (Object.keys(updatePatch).length === 0) {
      return NextResponse.json(
        { message: "Nothing to update. Provide name and/or htmlContent." },
        { status: 400 }
      );
    }

    const { data: cv, error: fetchError } = await supabase
      .from("generated_cvs")
      .select("id, user_id")
      .eq("id", cvId)
      .single();

    if (fetchError || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const { data: updatedCv, error: updateError } = await supabase
      .from("generated_cvs")
      .update(updatePatch)
      .eq("id", cvId)
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
      .single();

    if (updateError || !updatedCv) {
      console.error("CV patch error:", updateError);
      return NextResponse.json({ message: "Failed to update CV" }, { status: 500 });
    }

    return NextResponse.json(mapGeneratedCvRow(updatedCv));
  } catch (error) {
    console.error("CV by ID PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
