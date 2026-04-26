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
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch resumes:", error);
      return NextResponse.json({ message: "Failed to fetch resumes" }, { status: 500 });
    }

    const templateIds = Array.from(
      new Set((cvs || []).map((cv) => cv.template_id).filter((id): id is number => typeof id === "number"))
    );

    let templatesById = new Map<number, unknown>();
    if (templateIds.length > 0) {
      const { data: templates, error: templatesError } = await supabase
        .from("cv_templates")
        .select("id, name, file_name, screenshot_url, description, created_at")
        .in("id", templateIds);

      if (templatesError) {
        console.error("Failed to fetch templates for resumes:", templatesError);
        return NextResponse.json({ message: "Failed to fetch resumes" }, { status: 500 });
      }

      templatesById = new Map((templates || []).map((template) => [template.id, template]));
    }

    const mappedCvs = (cvs || []).map((cv) =>
      mapGeneratedCvRow({
        ...cv,
        cv_templates: templatesById.get(cv.template_id) ?? null,
      })
    );
    
    // Include CV count and limit information for frontend
    const response = {
      cvs: mappedCvs,
      count: mappedCvs.length,
      limit: GENERATED_CV_LIMIT,
      canCreateMore: mappedCvs.length < GENERATED_CV_LIMIT
    };
    
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Resumes route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
