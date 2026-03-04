/**
 * Configuration parsing utilities
 */

/**
 * Parses a positive integer from environment variable
 * @param value Environment variable value
 * @param fallback Default value if parsing fails
 * @returns Parsed positive integer or fallback
 */
export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * Parses a bounded float from environment variable
 * @param value Environment variable value
 * @param fallback Default value if parsing fails
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns Parsed float within bounds or fallback
 */
export function parseBoundedFloat(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}

/**
 * Parses a string from environment variable with fallback
 * @param value Environment variable value
 * @param fallback Default value if value is empty/undefined
 * @returns String value or fallback
 */
export function parseString(value: string | undefined, fallback: string): string {
  if (!value || value.trim() === '') return fallback;
  return value.trim();
}

/**
 * Parses a boolean from environment variable
 * @param value Environment variable value
 * @param fallback Default value if parsing fails
 * @returns Boolean value or fallback
 */
export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}
