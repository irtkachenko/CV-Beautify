import fs from "node:fs/promises";
import path from "node:path";

export async function readPromptTemplate(templateName: string): Promise<string> {
  const promptPath = path.join(process.cwd(), "prompts", `${templateName}.txt`);

  try {
    return await fs.readFile(promptPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to load prompt template ${templateName}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function renderPromptTemplate(templateName: string, variables: Record<string, string> = {}): Promise<string> {
  let prompt = await readPromptTemplate(templateName);

  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value);
  }

  return prompt;
}

export async function loadPrompt(templateName: string, variables: Record<string, string> = {}): Promise<string> {
  return renderPromptTemplate(templateName, variables);
}
