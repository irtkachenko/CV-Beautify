import { NextRequest, NextResponse } from "next/server";
import { getChatModels, validateModel, getModelChain, clearModelsCache } from "@lib/groq-models";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validate = searchParams.get("validate");
    const refresh = searchParams.get("refresh");
    const chain = searchParams.get("chain");
    
    if (validate) {
      // Validate a specific model
      const isValid = await validateModel(validate);
      return NextResponse.json({ 
        model: validate,
        isValid 
      });
    }
    
    if (refresh) {
      // Clear cache and refresh models
      clearModelsCache();
    }
    
    if (chain) {
      // Get the model chain with fallback logic
      const modelChain = await getModelChain();
      return NextResponse.json({
        modelChain,
        count: modelChain.length,
        timestamp: new Date().toISOString(),
        source: "dynamic_with_fallback"
      });
    }
    
    // Get all available chat models
    const models = await getChatModels();
    
    return NextResponse.json({
      models,
      count: models.length,
      timestamp: new Date().toISOString(),
      source: "dynamic_with_fallback"
    });
    
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch models",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
