/** Browser-facing API bases. Localhost env vars are proxied through Next.js. */

export function resolveBrowserApiUrl(
  configured: string | undefined,
  sameOriginPath: string
): string {
  const trimmed = (configured || "").trim().replace(/\/$/, "");
  if (!trimmed) return sameOriginPath;
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return sameOriginPath;
    }
    return trimmed;
  } catch {
    return sameOriginPath;
  }
}

export const API_URL = resolveBrowserApiUrl(
  process.env.NEXT_PUBLIC_API_URL,
  "/backend-api"
);

export const JOB_ENGINE_URL = resolveBrowserApiUrl(
  process.env.NEXT_PUBLIC_JOB_ENGINE_URL,
  "/job-engine-api"
);

export function formatErrorDetail(detail: unknown, fallback = "API error"): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "msg" in item) {
        return String((item as { msg: unknown }).msg);
      }
      return "";
    });
    const joined = parts.filter(Boolean).join("; ");
    if (joined) return joined;
  }
  return fallback;
}

export function formatUnknownError(err: unknown, fallback: string): string {
  if (err instanceof TypeError) return fallback;
  if (err instanceof Error && err.message) {
    if (err.message === "Failed to fetch" || err.message === "Load failed") {
      return fallback;
    }
    return err.message;
  }
  return fallback;
}
