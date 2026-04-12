import Groq from "groq-sdk";

export interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

// Hardcoded fallback models in case API is unavailable
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant", 
  "meta-llama/llama-4-scout-17b-16e-instruct"
];

// Cache for models to avoid repeated API calls
let modelsCache: {
  models: GroqModel[];
  timestamp: number;
  ttl: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return modelsCache !== null && (Date.now() - modelsCache.timestamp) < modelsCache.ttl;
}

export async function getAvailableGroqModels(): Promise<GroqModel[]> {
  // Check cache first
  if (isCacheValid()) {
    return modelsCache!.models;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY is not configured, using fallback models");
    return FALLBACK_MODELS.map(id => ({
      id,
      object: "model",
      created: Date.now(),
      owned_by: "fallback"
    }));
  }

  const groq = new Groq({ apiKey });

  try {
    const models = await groq.models.list();
    
    // Cache the result
    modelsCache = {
      models: models.data,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    };
    
    return models.data;
  } catch (error) {
    console.error("Failed to fetch Groq models, using fallback:", error);
    
    // Return fallback models if API fails
    const fallbackModels = FALLBACK_MODELS.map(id => ({
      id,
      object: "model",
      created: Date.now(),
      owned_by: "fallback"
    }));
    
    // Cache fallback models for shorter time
    modelsCache = {
      models: fallbackModels,
      timestamp: Date.now(),
      ttl: 60000 // 1 minute for fallback
    };
    
    return fallbackModels;
  }
}

export async function getChatModels(): Promise<GroqModel[]> {
  const allModels = await getAvailableGroqModels();
  
  // Filter for chat models (models that support chat completions)
  const chatModels = allModels.filter(model => 
    model.id.includes('llama') || 
    model.id.includes('mixtral') ||
    model.id.includes('gemma') ||
    model.owned_by === 'Meta' ||
    model.owned_by === 'fallback'
  );

  return chatModels.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getModelChain(): Promise<string[]> {
  try {
    const chatModels = await getChatModels();
    const modelIds = chatModels.map(model => model.id);
    
    // Add environment models first if specified
    const envModels = (process.env.GROQ_MODELS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    
    // Add preferred model if specified
    const preferredModel = process.env.GROQ_MODEL?.trim();
    
    const chain = [
      ...envModels,
      ...(preferredModel ? [preferredModel] : []),
      ...modelIds
    ];
    
    // Remove duplicates while preserving order
    return chain.filter((value, index, array) => array.indexOf(value) === index);
  } catch (error) {
    console.error("Failed to get model chain, using fallback:", error);
    return FALLBACK_MODELS;
  }
}

export async function validateModel(modelId: string): Promise<boolean> {
  try {
    const models = await getChatModels();
    return models.some(model => model.id === modelId);
  } catch {
    // Check against fallback models
    return FALLBACK_MODELS.includes(modelId);
  }
}

export function clearModelsCache(): void {
  modelsCache = null;
}
