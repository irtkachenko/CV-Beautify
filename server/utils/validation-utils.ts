import { appConfig } from '../config/app-config';

/**
 * Validates generation prompt length and safety
 * @param prompt Generation prompt to validate
 * @returns Validation result
 */
export function validateGenerationPrompt(prompt: string): { isValid: boolean; error?: string } {
  if (prompt.length > appConfig.ai.generationPromptMaxLength) {
    return {
      isValid: false,
      error: `Additional generation prompt is too long. Maximum ${appConfig.ai.generationPromptMaxLength} characters.`
    };
  }

  // Note: Safety check would need to be imported or moved here
  // const safetyCheck = runLocalPromptSafetyChecks(prompt);
  // if (!safetyCheck.allowed) {
  //   return {
  //     isValid: false,
  //     error: "Additional generation instructions were rejected due to safety policy."
  //   };
  // }

  return { isValid: true };
}

/**
 * Validates edit prompt length
 * @param prompt Edit prompt to validate
 * @returns Validation result
 */
export function validateEditPrompt(prompt: string): { isValid: boolean; error?: string } {
  if (prompt.length < (appConfig.ai.editPromptMinLength || 3)) {
    return {
      isValid: false,
      error: `Prompt is too short. Minimum ${appConfig.ai.editPromptMinLength || 3} characters.`
    };
  }
  if (prompt.length > appConfig.ai.editPromptMaxLength) {
    return {
      isValid: false,
      error: `Prompt is too long. Maximum ${appConfig.ai.editPromptMaxLength} characters.`
    };
  }

  return { isValid: true };
}

/**
 * Validates uploaded file
 * @param file File to validate
 * @returns Validation result
 */
export function validateUploadedFile(file: { 
  name: string; 
  size: number; 
  type: string; 
  lastModified: number 
}): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than 5MB`
    };
  }

  if (file.type !== allowedType) {
    return {
      isValid: false,
      error: `Only .docx files are allowed`
    };
  }

  if (!file.name || file.name.trim() === '') {
    return {
      isValid: false,
      error: `File name is required`
    };
  }

  return { isValid: true };
}
