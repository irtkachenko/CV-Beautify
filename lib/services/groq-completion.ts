import Groq from "groq-sdk";
import { getModelChain } from "@lib/groq-models";

let cachedModelChain: string[] | null = null;

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unknown Groq error";
}

function isModelRetryableError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "").toLowerCase()
      : "";

  const isRetryable =
    code === "rate_limit_exceeded" ||
    message.includes("rate_limit_exceeded") ||
    message.includes("request too large") ||
    message.includes("tokens per minute") ||
    message.includes("overloaded");

  const isNonRetryable =
    (message.includes("model") &&
      (message.includes("not found") ||
        message.includes("does not exist") ||
        message.includes("unavailable"))) ||
    message.includes("model decommissioned") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    code === "invalid_api_key" ||
    code === "unauthorized";

  if (isNonRetryable) {
    console.warn(`[groq] Model permanently unavailable: ${message}`);
    return false;
  }

  return isRetryable;
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey });
}

async function getGroqModelChain(): Promise<string[]> {
  if (!cachedModelChain) {
    cachedModelChain = await getModelChain();
  }
  return cachedModelChain;
}

export async function runGroqCompletionWithFallback({
  messages,
  temperature,
  maxTokens,
}: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  maxTokens: number;
}) {
  const groq = getGroqClient();
  const modelChain = await getGroqModelChain();
  let lastError: unknown;
  const attemptedModels: string[] = [];
  const permanentFailures: string[] = [];

  console.info(`[groq] Trying ${modelChain.length} models in chain: ${modelChain.join(", ")}`);

  for (const model of modelChain) {
    attemptedModels.push(model);
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages,
      });

      const result = completion.choices[0]?.message?.content?.trim() || "";
      console.info(`[groq] Successfully used model '${model}'`);
      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = extractErrorMessage(error);
      const isRetryable = isModelRetryableError(error);
      const isLastModel = model === modelChain[modelChain.length - 1];

      if (!isRetryable) {
        permanentFailures.push(model);
      }

      console.warn(`[groq] model '${model}' failed: ${errorMessage} (retryable: ${isRetryable})`);
      if (!isRetryable || isLastModel) {
        break;
      }
    }
  }

  const errorSummary = `All Groq models failed. Attempted: ${attemptedModels.join(", ")}. Permanent failures: ${permanentFailures.join(", ") || "none"}. Last error: ${extractErrorMessage(lastError)}`;
  if (permanentFailures.length === modelChain.length) {
    throw new Error("No AI models are currently available. Please try again later or contact support.");
  }

  throw new Error(errorSummary);
}
