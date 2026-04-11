import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (cv.user_id !== user.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(cv);
  } catch (error) {
    console.error("CV by ID error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
