export type HealthResponse = {
  service: string;
  status: "ok";
  timestamp: string;
};

// Server-side ưu tiên API_INTERNAL_URL (xem lib/api.ts#apiBaseUrl).
const apiUrl =
  (typeof window === "undefined" ? process.env.API_INTERNAL_URL : undefined) ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

export async function getBackendHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch(`${apiUrl}/health`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("BACKEND_UNAVAILABLE");
  }

  return (await response.json()) as HealthResponse;
}
