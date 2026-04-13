import fs from "node:fs/promises";
import path from "node:path";

export async function loadPrompt(templateName: string, variables: Record<string, string> = {}): Promise<string> {
  const promptPath = path.join(process.cwd(), "prompts", `${templateName}.txt`);
  
  try {
    let prompt = await fs.readFile(promptPath, "utf-8");
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value);
    }
    
    return prompt;
  } catch (error) {
    throw new Error(`Failed to load prompt template ${templateName}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
