/** Client for the Job Engine microservice. */

import { createClient } from "@/lib/supabase/client";
import type { JobListResponse, JobPosting, JobSignalType } from "@/lib/job-engine-types";

const JOB_ENGINE_URL =
  process.env.NEXT_PUBLIC_JOB_ENGINE_URL || "http://localhost:8001";

class JobEngineError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  // Validate/refresh with the Auth server — getSession() alone can return a stale JWT.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new JobEngineError(401, "Not authenticated");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new JobEngineError(401, "Not authenticated");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${JOB_ENGINE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new JobEngineError(res.status, body.detail || "Job engine error");
  }
  return res.json();
}

export async function getRecommendedJobs(
  cursor?: string | null,
  limit = 20
): Promise<JobListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<JobListResponse>(`/v1/jobs/recommend?${params}`);
}

export async function searchJobs(opts: {
  q?: string;
  location?: string;
  remote?: boolean;
  cursor?: string | null;
  limit?: number;
}): Promise<JobListResponse> {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.location) params.set("location", opts.location);
  if (opts.remote !== undefined) params.set("remote", String(opts.remote));
  if (opts.cursor) params.set("cursor", opts.cursor);
  params.set("limit", String(opts.limit ?? 20));
  return request<JobListResponse>(`/v1/jobs/search?${params}`);
}

export async function getJob(jobId: string): Promise<JobPosting> {
  return request<JobPosting>(`/v1/jobs/${jobId}`);
}

export async function sendJobSignal(
  jobId: string,
  type: JobSignalType
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/v1/jobs/${jobId}/signals`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export { JobEngineError };
