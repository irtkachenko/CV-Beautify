import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapGeneratedCvRow } from "@lib/cv-mappers";
import { GENERATED_CV_LIMIT } from "@lib/services/generated-cv-service";

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
    
    // Include CV count and limit information for frontend
    const response = {
      cvs: mappedCvs,
      count: mappedCvs.length,
      limit: GENERATED_CV_LIMIT,
      canCreateMore: mappedCvs.length < GENERATED_CV_LIMIT
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Resumes route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
