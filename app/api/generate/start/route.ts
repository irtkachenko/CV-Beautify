import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { runGenerateCvJob } from "@lib/cv-jobs";
import { comprehensivePromptValidation } from "@lib/prompt-validation";
import {
  countGeneratedCvsForUser,
  GENERATED_CV_LIMIT,
} from "@lib/services/generated-cv-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    // Parse form data (multipart for file upload)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const templateId = formData.get("templateId") as string;
    const generationPrompt = formData.get("generationPrompt") as string | null;

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

    // Check user's CV generation limit
    const usageResult = await countGeneratedCvsForUser(supabase, userId);
    if (!usageResult.ok) {
      return NextResponse.json({ message: usageResult.message }, { status: usageResult.status });
    }

    if (usageResult.data >= GENERATED_CV_LIMIT) {
      return NextResponse.json({ 
        message: `You have reached the maximum limit of ${GENERATED_CV_LIMIT} generated CVs. Please delete an existing CV to create a new one.` 
      }, { status: 429 });
    }

    const promptValidation = await comprehensivePromptValidation(generationPrompt || "", "generation");
    if (!promptValidation.isValid) {
      return NextResponse.json({ message: promptValidation.warning || "Prompt validation failed" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Create CV generation record
    console.log(`[generate:start] Attempting to create CV record for user ${userId}, template ${templateIdNum}`);
    
    const { data: newCv, error: createError } = await supabase
      .from("generated_cvs")
      .insert({
        user_id: userId,
        template_id: templateIdNum,
        status: "pending",
        error_message: null,
        progress: "Queued for processing...",
        name: file.name.replace(/\.docx$/i, ""),
        original_doc_text: null,
        original_doc_links: [],
      })
      .select()
      .single();

    console.log(`[generate:start] Insert result:`, { newCv, createError });

    if (createError || !newCv) {
      console.error("Failed to create CV record:", createError);
      return NextResponse.json({ message: "Failed to start CV generation" }, { status: 500 });
    }

    // Run the generation job with proper error handling
    runGenerateCvJob({
      supabase,
      cvId: newCv.id,
      fileBuffer,
      template,
      generationPrompt: promptValidation.cleanedPrompt || generationPrompt,
    }).catch((error) => {
      console.error(`[generate:${newCv.id}] Unhandled error in runGenerateCvJob:`, error);
      // Update status to failed if job crashes
      supabase
        .from("generated_cvs")
        .update({
          status: "failed",
          progress: null,
          error_message: error instanceof Error ? error.message : "Unknown error occurred during generation",
        })
        .eq("id", newCv.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error(`[generate:${newCv.id}] Failed to update status to failed:`, updateError);
          }
        });
    });

    return NextResponse.json({ jobId: newCv.id }, { status: 202 });
  } catch (error) {
    console.error("Generate start error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
