function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoundedFloat(
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

export const appConfig = {
  rateLimits: {
    aiRequestsPerHour: parsePositiveInt(process.env.AI_REQUESTS_PER_HOUR, 20),
    aiRequestsWindowMs: parsePositiveInt(process.env.AI_REQUEST_WINDOW_MS, 60 * 60 * 1000),
  },
  ai: {
    validationTemperature: parseBoundedFloat(process.env.AI_VALIDATION_TEMPERATURE, 0, 0, 2),
  },
  html: {
    maxGeneratedHtmlChars: parsePositiveInt(process.env.AI_MAX_GENERATED_HTML_CHARS, 500_000),
  },
};
