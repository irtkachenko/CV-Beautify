/**
 * Validates user prompts for malicious content, profanity, and security risks
 * before sending to AI generation
 */

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
    /on\w+\s*=/i, // onclick, onload, etc.
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

  // Profanity patterns (basic list - can be expanded)
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

  // Check for suspicious patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /\$\{.*\}/i, // Template injection
    /{{.*}}/i, // Template injection
    /<%.*%>/i, // Template injection
    /\\x[0-9a-f]{2}/i, // Hex encoding
    /\\u[0-9a-f]{4}/i, // Unicode encoding
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return {
        isValid: false,
        warning: "Prompt contains suspicious patterns that cannot be processed for security reasons.",
      };
    }
  }

  // Check for extremely long prompts that might be attempts to bypass filters
  if (prompt.length > 2000) {
    return {
      isValid: false,
      warning: "Prompt is too long. Please keep your instructions concise and under 2000 characters.",
    };
  }

  // Clean up any potential issues while preserving intent
  let cleanedPrompt = prompt.trim();

  // Remove any potential HTML tags that weren't caught by patterns
  cleanedPrompt = cleanedPrompt.replace(/<[^>]*>/g, '');

  // Remove excessive whitespace
  cleanedPrompt = cleanedPrompt.replace(/\s+/g, ' ');

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

  // Additional checks specific to CV generation
  if (result.isValid) {
    // Check for requests to generate inappropriate content
    const inappropriatePatterns = [
      /fake/i,
      /false/i,
      /lie/i,
      /dishonest/i,
      /misleading/i,
      /fraud/i,
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

  // Additional checks specific to CV editing
  if (result.isValid) {
    // Check for requests to make inappropriate changes
    const inappropriateEditPatterns = [
      /remove.*experience/i,
      /hide.*employment/i,
      /delete.*history/i,
      /fake.*skill/i,
      /add.*fake/i,
      /invent/i,
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

    const contextInstructions = context === 'generation' 
      ? "This is a prompt for generating a professional CV/resume."
      : "This is a prompt for editing an existing professional CV/resume.";

    const systemPrompt = `You are a content safety validator for professional document generation. ${contextInstructions}

Analyze the following prompt for:
1. Malicious code, scripts, or security threats
2. Inappropriate language, profanity, or offensive content  
3. Requests for fake, false, or misleading information
4. Unprofessional or harmful requests
5. Any content that would be inappropriate for a business/professional document

Respond with ONLY:
"SAFE" if the prompt is completely safe and appropriate
"BLOCKED: [brief reason]" if the prompt should be blocked

Be very strict - if there's any doubt, block it.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
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
