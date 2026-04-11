import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";

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

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (cv.status === "processing") {
      return NextResponse.json({ message: "CV is already being processed" }, { status: 409 });
    }

    // Mark as processing
    const { error: updateError } = await supabase
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
