import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient, supabaseServiceRoleClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
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

    // Parse form data (multipart for file upload)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const templateId = formData.get("templateId") as string;
    const generationPrompt = formData.get("generationPrompt") as string | null;
    const temperature = formData.get("temperature") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ message: "Template ID is required" }, { status: 400 });
    }

    const templateIdNum = parseInt(templateId, 10);
    if (isNaN(templateIdNum) || templateIdNum <= 0) {
      return NextResponse.json({ message: "Invalid template ID" }, { status: 400 });
    }

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from("cv_templates")
      .select("*")
      .eq("id", templateIdNum)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }

    // Extract text from DOCX file
    // TODO: Implement DOCX parsing (mammoth) on server side
    // For now, we'll create a placeholder
    const docxText = "Placeholder extracted text";
    const docxLinks: any[] = [];

    // Create CV generation record
    const adminSupabase = supabaseServiceRoleClient();
    const { data: newCv, error: createError } = await adminSupabase
      .from("generated_cvs")
      .insert({
        user_id: user.id,
        template_id: templateIdNum,
        status: "pending",
        name: file.name.replace(/\.docx$/i, ""),
        original_doc_text: docxText,
        original_doc_links: docxLinks,
      })
      .select()
      .single();

    if (createError || !newCv) {
      console.error("Failed to create CV record:", createError);
      return NextResponse.json({ message: "Failed to start CV generation" }, { status: 500 });
    }

    // TODO: Trigger async CV generation process
    // This should be implemented as a background job or edge function
    // For now, we'll return 202 Accepted and the client can poll for status

    return NextResponse.json({ jobId: newCv.id }, { status: 202 });
  } catch (error) {
    console.error("Generate start error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
