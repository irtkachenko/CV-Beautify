import type { OriginalDocLink } from '@shared/schema';

const MAX_LINK_TEXT_LENGTH = 300;
const MAX_LINK_HREF_LENGTH = 2048;

/**
 * Decodes basic HTML entities
 * @param str String to decode
 * @returns Decoded string
 */
function decodeBasicEntities(str: string): string {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * Sanitizes href attribute
 * @param rawHref Raw href value
 * @returns Sanitized href or null if invalid
 */
export function sanitizeHref(rawHref: string): string | null {
  const decoded = decodeBasicEntities(rawHref).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!decoded) return null;
  if (decoded.length > MAX_LINK_HREF_LENGTH) return null;
  
  // Basic URL validation
  try {
    new URL(decoded);
    return decoded;
  } catch {
    // If not a valid URL, check if it's a relative path
    if (decoded.startsWith('/') || decoded.startsWith('./') || decoded.startsWith('../')) {
      return decoded;
    }
    return null;
  }
}

/**
 * Sanitizes link text and href
 * @param rawText Link text
 * @param rawHref Link href
 * @returns Sanitized link object or null if invalid
 */
export function sanitizeLink(rawText: string, rawHref: string): OriginalDocLink | null {
  const href = sanitizeHref(rawHref);
  if (!href) return null;

  const text = decodeBasicEntities(rawText).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!text || text.length > MAX_LINK_TEXT_LENGTH) return null;

  return { text, href };
}

/**
 * Sanitizes and validates original document links
 * @param rawLinks Raw links array
 * @returns Sanitized links array
 */
export function sanitizeOriginalLinks(rawLinks: unknown): OriginalDocLink[] {
  if (!Array.isArray(rawLinks)) return [];

  const dedupe = new Set<string>();
  const sanitized: OriginalDocLink[] = [];

  for (const rawLink of rawLinks) {
    if (
      rawLink &&
      typeof rawLink === "object" &&
      "text" in rawLink &&
      "href" in rawLink &&
      typeof rawLink.text === "string" &&
      typeof rawLink.href === "string"
    ) {
      const clean = sanitizeLink(rawLink.text, rawLink.href);
      if (clean && !dedupe.has(clean.href)) {
        dedupe.add(clean.href);
        sanitized.push(clean);
      }
    }
  }

  return sanitized;
}
