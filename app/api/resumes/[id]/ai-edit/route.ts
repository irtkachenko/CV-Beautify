import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient, supabaseServiceRoleClient } from "@/lib/supabase-server";

export async function POST(
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

    const body = await request.json();
    const { prompt, useOriginalDocumentContext, temperature } = body;

    // Verify ownership
    const { data: cv, error: fetchError } = await supabase
      .from("generated_cvs")
      .select("*")
      .eq("id", cvId)
      .single();

    if (fetchError || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== user.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (cv.status === "processing") {
      return NextResponse.json({ message: "CV is already being processed" }, { status: 409 });
    }

    // Mark as processing
    const adminSupabase = supabaseServiceRoleClient();
    const { error: updateError } = await adminSupabase
      .from("generated_cvs")
      .update({ status: "processing", progress: "Starting AI edit..." })
      .eq("id", cvId);

    if (updateError) {
      console.error("Failed to update CV status:", updateError);
      return NextResponse.json({ message: "Failed to start AI edit" }, { status: 500 });
    }

    // TODO: Trigger async AI edit process
    // This should be implemented as a background job or edge function
    // For now, we'll return 202 Accepted and the client can poll for status

    return NextResponse.json({ jobId: cvId }, { status: 202 });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
