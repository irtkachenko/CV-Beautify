/**
 * Validates user prompts for malicious content, profanity, and security risks
 * before sending to AI generation
 */

import { loadPrompt } from "./prompts";

export interface ValidationResult {
  isValid: boolean;
  warning?: string;
  cleanedPrompt?: string;
}

/**
 * Check if prompt contains potentially malicious content
 */
export function validatePrompt(prompt: string): ValidationResult {
  if (!prompt || !prompt.trim()) {
    return { isValid: true };
  }

  const lowerPrompt = prompt.toLowerCase().trim();

  // Security patterns to block
  const securityPatterns = [
    /javascript:/i,
    /<script/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i,
    /console\./i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /@import/i,
    /binding:/i,
  ];

  // Profanity patterns
  const profanityPatterns = [
    /fuck/i,
    /shit/i,
    /bitch/i,
    /asshole/i,
    /damn/i,
    /hell/i,
    /crap/i,
    /dick/i,
    /piss/i,
    /bastard/i,
    /whore/i,
    /slut/i,
    /cunt/i,
  ];

  // Suspicious patterns
  const suspiciousPatterns = [
    /\$\{.*\}/i,
    /{{.*}}/i,
    /<%.*%>/i,
    /\\x[0-9a-f]{2}/i,
    /\\u[0-9a-f]{4}/i,
  ];

  // Check for security issues
  for (const pattern of securityPatterns) {
    if (pattern.test(lowerPrompt)) {
      return {
        isValid: false,
        warning: "Prompt contains potentially malicious code or scripts that cannot be processed for security reasons.",
      };
    }
  }

  // Check for profanity
  for (const pattern of profanityPatterns) {
    if (pattern.test(lowerPrompt)) {
      return {
        isValid: false,
        warning: "Prompt contains inappropriate language that cannot be used in professional documents.",
      };
    }
  }

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return {
        isValid: false,
        warning: "Prompt contains suspicious patterns that cannot be processed for security reasons.",
      };
    }
  }

  // Check for extremely long prompts
  if (prompt.length > 2000) {
    return {
      isValid: false,
      warning: "Prompt is too long. Please keep your instructions concise and under 2000 characters.",
    };
  }

  // Clean up any potential issues while preserving intent
  let cleanedPrompt = prompt.trim();

  // Remove excessive whitespace
  cleanedPrompt = cleanedPrompt.replace(/\r\n/g, "\n");
  cleanedPrompt = cleanedPrompt.replace(/[ \t]+/g, " ");
  cleanedPrompt = cleanedPrompt.replace(/\n{3,}/g, "\n\n");

  return {
    isValid: true,
    cleanedPrompt: cleanedPrompt !== prompt ? cleanedPrompt : undefined,
  };
}

/**
 * Validates additional instruction specifically for CV generation
 */
export function validateGenerationPrompt(generationPrompt?: string | null): ValidationResult {
  if (!generationPrompt) {
    return { isValid: true };
  }

  const result = validatePrompt(generationPrompt);

  // Additional checks for CV generation
  if (result.isValid) {
    const inappropriatePatterns = [
      /(add|invent|create|fabricate).*(fake|false|made up)/i,
      /(lie|dishonest|fraud|misleading)/i,
    ];

    const lowerPrompt = generationPrompt.toLowerCase();
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(lowerPrompt)) {
        return {
          isValid: false,
          warning: "CV generation cannot include false or misleading information. Please provide honest and accurate instructions.",
        };
      }
    }
  }

  return result;
}

/**
 * Validates edit instruction specifically for CV editing
 */
export function validateEditPrompt(editPrompt: string): ValidationResult {
  const result = validatePrompt(editPrompt);

  // Additional checks for CV editing
  if (result.isValid) {
    const inappropriateEditPatterns = [
      /(add|invent|create|fabricate).*(fake|false|made up)/i,
      /(falsify|misrepresent|lie about)/i,
      /(change|rewrite|edit).*(dates|titles|companies|experience).*(to hide|to mislead|to fake)/i,
    ];

    const lowerPrompt = editPrompt.toLowerCase();
    for (const pattern of inappropriateEditPatterns) {
      if (pattern.test(lowerPrompt)) {
        return {
          isValid: false,
          warning: "Cannot make changes that involve removing or falsifying professional information.",
        };
      }
    }
  }

  return result;
}

/**
 * AI-based validation using Groq API as second layer of security
 */
export async function validatePromptWithAI(prompt: string, context: 'generation' | 'edit' = 'generation'): Promise<ValidationResult> {
  if (!prompt || !prompt.trim()) {
    return { isValid: true };
  }

  try {
    const Groq = require("groq-sdk").default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const promptTemplate = context === 'generation' ? 'validate-generation' : 'validate-edit';
    const systemPrompt = await loadPrompt(promptTemplate, { prompt });

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a strict safety validator for resume-generation prompts. Follow the validation rubric exactly and return only the requested verdict.",
        },
        { role: "user", content: systemPrompt }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || "";

    if (aiResponse === "SAFE") {
      return { isValid: true };
    } else if (aiResponse.startsWith("BLOCKED:")) {
      const reason = aiResponse.replace("BLOCKED:", "").trim();
      return {
        isValid: false,
        warning: reason || "Prompt blocked by AI safety check"
      };
    } else {
      // If AI response is unclear, be conservative and block
      return {
        isValid: false,
        warning: "Prompt could not be validated by AI safety check"
      };
    }
  } catch (error) {
    console.error("AI validation failed:", error);
    // If AI validation fails, be conservative and allow only if regex validation passed
    return { isValid: true, warning: "AI validation unavailable, proceeding with basic checks only" };
  }
}

/**
 * Comprehensive validation that combines regex checks and AI validation
 */
export async function comprehensivePromptValidation(
  prompt: string, 
  context: 'generation' | 'edit' = 'generation'
): Promise<ValidationResult> {
  // First, do regex-based validation
  const regexValidation = context === 'generation' 
    ? validateGenerationPrompt(prompt)
    : validateEditPrompt(prompt);

  if (!regexValidation.isValid) {
    return regexValidation;
  }

  // If regex validation passes, do AI validation
  const aiValidation = await validatePromptWithAI(prompt, context);
  
  // Combine results
  return {
    isValid: aiValidation.isValid,
    warning: aiValidation.warning || regexValidation.warning,
    cleanedPrompt: regexValidation.cleanedPrompt
  };
}
