/** Centralized API client — sends requests to FastAPI backend with Supabase JWT. */

import { createClient } from "@/lib/supabase/client";
import { API_URL, formatErrorDetail } from "@/lib/api-base";
import type {
  AgentLogEvent,
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
  Application,
  WorkItem,
} from "@/lib/types";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new ApiError(401, "Not authenticated");
  }
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
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message ? err.message : "Failed to fetch";
    throw new ApiError(0, message);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, formatErrorDetail(body.detail, "API error"));
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

export async function getPipelineLogs(runId: string): Promise<AgentLogEvent[]> {
  const data = await request<{ events?: AgentLogEvent[] }>(`/pipeline/${runId}/logs`);
  return Array.isArray(data.events) ? data.events : [];
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
// Applications (Job OS)
// ---------------------------------------------------------------------------

export async function createApplication(postingId: string): Promise<Application> {
  return request<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ posting_id: postingId }),
  });
}

export async function listApplications(): Promise<Application[]> {
  return request<Application[]>("/applications");
}

export async function listInbox(): Promise<WorkItem[]> {
  return request<WorkItem[]>("/applications/inbox");
}

export async function getApplication(applicationId: string): Promise<Application> {
  return request<Application>(`/applications/${applicationId}`);
}

export async function reviewApplication(
  applicationId: string,
  data: { edited_letter?: string; approved: boolean; user_feedback?: string }
): Promise<Application> {
  return request<Application>(`/applications/${applicationId}/review`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function retryApplication(applicationId: string): Promise<Application> {
  return request<Application>(`/applications/${applicationId}/retry`, {
    method: "POST",
  });
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "submitted" | "interviewing" | "rejected" | "withdrawn"
): Promise<Application> {
  return request<Application>(`/applications/${applicationId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export { ApiError };
