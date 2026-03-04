import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Створюємо DOM середовище для DOMPurify
const window = new JSDOM('').window;

// Ініціалізуємо DOMPurify з DOM середовищем
const purify = DOMPurify(window);

/**
 * Sanitizes HTML content using DOMPurify
 * @param dirty Dirty HTML string
 * @returns Sanitized HTML
 */
export function sanitizeWithDOMPurify(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return dirty;
  }
  
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'html', 'head', 'title', 'meta', 'body', 'div', 'span', 'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'section', 'article', 'header', 'footer', 'nav', 'aside', 'main'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Sanitizes CV content (removes only scripts, keeps most formatting)
 * @param dirty Dirty HTML string
 * @returns Sanitized HTML
 */
export function sanitizeCvContent(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return dirty;
  }
  
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'html', 'head', 'title', 'meta', 'body', 'div', 'span', 'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'section', 'article', 'header', 'footer', 'nav', 'aside', 'main',
      'address', 'blockquote', 'code', 'pre', 'q'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Sanitizes string values
 * @param value Value to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: any): string {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  // Remove null bytes and trim
  return value.replace(/\u0000/g, '').trim();
}

/**
 * Recursively sanitizes object properties
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Validates field length and throws error if too long
 * @param value Field value
 * @param fieldName Field name for error message
 * @param maxLength Maximum allowed length
 */
export function validateFieldLength(value: string, fieldName: string, maxLength: number): void {
  if (value && value.length > maxLength) {
    throw new Error(
      `${fieldName} is too long. Maximum ${maxLength} characters.`
    );
  }
}

/**
 * Validates HTML content for security issues
 * @param html HTML to validate
 * @returns Validation result
 */
export function validateHTML(html: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for dangerous patterns after sanitization
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      issues.push(`Potentially dangerous content detected: ${pattern.source}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
