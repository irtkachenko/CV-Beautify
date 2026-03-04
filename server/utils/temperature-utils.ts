import { appConfig } from '../config/app-config';

/**
 * Clamps model temperature within configured bounds
 * @param value Temperature value to clamp
 * @returns Clamped temperature value
 */
export function clampModelTemperature(value: number): number {
  if (!Number.isFinite(value)) return appConfig.ai.defaultGenerationTemperature;
  if (value < appConfig.ai.modelTemperatureMin) return appConfig.ai.modelTemperatureMin;
  if (value > appConfig.ai.modelTemperatureMax) return appConfig.ai.modelTemperatureMax;
  return Math.round(value * 100) / 100;
}

/**
 * Parses model temperature from various input types
 * @param raw Raw temperature value (number or string)
 * @param fallback Default fallback value
 * @returns Parsed and clamped temperature
 */
export function parseModelTemperature(raw: unknown, fallback: number): number {
  if (typeof raw === "number") {
    return clampModelTemperature(raw);
  }
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      return clampModelTemperature(parsed);
    }
  }
  return clampModelTemperature(fallback);
}
