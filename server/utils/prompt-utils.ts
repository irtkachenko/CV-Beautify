/**
 * Utility functions for working with prompts
 */

/**
 * Replaces placeholders in prompt templates with actual values
 * @param template The prompt template with {{placeholder}} syntax
 * @param variables Object containing variable values
 * @returns The prompt with placeholders replaced
 */
export function replacePromptPlaceholders(
  template: string,
  variables: Record<string, string | number | boolean | undefined>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
  }
  
  return result;
}

/**
 * Creates a function to replace placeholders in a specific prompt template
 * @param template The prompt template
 * @returns A function that takes variables and returns the formatted prompt
 */
export function createPromptFormatter(template: string) {
  return (variables: Record<string, string | number | boolean | undefined>) => 
    replacePromptPlaceholders(template, variables);
}
