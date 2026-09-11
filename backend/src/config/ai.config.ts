export type AiConfig = {
  serviceUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

const DEFAULT_SERVICE_URL = "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 3_000;

export function readAiConfig(): AiConfig {
  const serviceUrl = (process.env.AI_SERVICE_URL ?? DEFAULT_SERVICE_URL).replace(/\/+$/, "");

  if (!/^https?:\/\/.+/i.test(serviceUrl)) {
    throw new Error("AI_SERVICE_URL must be an absolute http(s) URL");
  }

  const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("AI_TIMEOUT_MS must be a non-negative number");
  }

  const apiKey = process.env.AI_API_KEY?.trim() || undefined;

  return { serviceUrl, apiKey, timeoutMs };
}