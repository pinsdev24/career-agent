/** Centralized API client — sends requests to FastAPI backend with Supabase JWT. */

import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  PipelineRun,
  PipelineStatusResponse,
  EntryMode,
  HITLOfferSelection,
  HITLLetterReview,
  SearchPreferences,
  ToneOfVoice,
  LanguagePreference,
  Memory,
  PlanUsage,
  PlanLimitsResponse,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  detail: unknown;  // raw detail from the API (string or structured object)
  code: string | undefined;  // e.g. "QUOTA_EXCEEDED"
  constructor(status: number, detail: unknown) {
    // Extract a human-readable message from either string or object detail
    const message =
      typeof detail === "string"
        ? detail
        : (detail as Record<string, unknown>)?.message as string ??
          (detail as Record<string, unknown>)?.detail as string ??
          "API error";
    super(message);
    this.status = status;
    this.detail = detail;
    this.code =
      typeof detail === "object" && detail !== null
        ? (detail as Record<string, unknown>).code as string | undefined
        : undefined;
  }

  /** Check if this is a quota exceeded error from the plan system. */
  get isQuotaExceeded(): boolean {
    return this.status === 403 && this.code === "QUOTA_EXCEEDED";
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError(401, "Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "API error");
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export async function uploadCV(file: File): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/profile/cv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new ApiError(res.status, body.detail);
  }

  return res.json();
}

export async function updatePreferences(
  tone_of_voice?: ToneOfVoice,
  search_preferences?: SearchPreferences,
  language_preference?: LanguagePreference,
): Promise<Profile> {
  return request<Profile>("/profile/preferences", {
    method: "PUT",
    body: JSON.stringify({ tone_of_voice, search_preferences, language_preference }),
  });
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function startPipeline(
  entry_mode: EntryMode,
  offer_url?: string
): Promise<PipelineStatusResponse> {
  return request<PipelineStatusResponse>("/pipeline/start", {
    method: "POST",
    body: JSON.stringify({ entry_mode, offer_url }),
  });
}

export async function getPipelineRun(runId: string): Promise<PipelineRun> {
  return request<PipelineRun>(`/pipeline/${runId}`);
}

export async function cancelPipeline(runId: string): Promise<{ status: string; cancelled: boolean }> {
  return request<{ status: string; cancelled: boolean }>(`/pipeline/${runId}/cancel`, {
    method: "POST",
  });
}

export async function markApplied(runId: string): Promise<{ status: string; updated: boolean }> {
  return request<{ status: string; updated: boolean }>(`/pipeline/${runId}/applied`, {
    method: "POST",
  });
}

export async function deletePipeline(runId: string): Promise<{ status: string; deleted: boolean }> {
  return request<{ status: string; deleted: boolean }>(`/pipeline/${runId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// HITL
// ---------------------------------------------------------------------------

export async function selectOffer(
  runId: string,
  data: HITLOfferSelection
): Promise<PipelineRun> {
  return request<PipelineRun>(`/hitl/${runId}/select-offer`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reviewLetter(
  runId: string,
  data: HITLLetterReview
): Promise<PipelineRun> {
  return request<PipelineRun>(`/hitl/${runId}/review-letter`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export async function getMemories(): Promise<Memory[]> {
  return request<Memory[]>("/memory");
}

export async function getMemory(key: string): Promise<Memory> {
  return request<Memory>(`/memory/${key}`);
}

export async function updateMemory(key: string, data: Record<string, any>): Promise<Memory> {
  return request<Memory>(`/memory/${key}`, {
    method: "PUT",
    body: JSON.stringify({ memory_data: data }),
  });
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function getUserPlan(): Promise<PlanUsage> {
  return request<PlanUsage>("/plans/current");
}

export async function getPlanLimits(): Promise<PlanLimitsResponse> {
  return request<PlanLimitsResponse>("/plans/limits");
}

export { ApiError };
