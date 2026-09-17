/** Types for the Job Engine microservice. */

export interface ScoreBreakdown {
  semantic: number;
  skills: number;
  recency: number;
  source_trust: number;
  novelty: number;
  total: number;
  matching_skills: string[];
  reasons: string[];
}

export interface JobPosting {
  id: string;
  source: string;
  external_id: string;
  company_name: string;
  company_slug?: string | null;
  title: string;
  location?: string | null;
  remote?: boolean | null;
  contract_type?: string | null;
  salary?: string | null;
  description_text?: string | null;
  apply_url: string;
  skills: string[];
  status: string;
  posted_at?: string | null;
  last_seen_at?: string | null;
  score?: number | null;
  score_breakdown?: ScoreBreakdown | null;
}

export interface JobListResponse {
  items: JobPosting[];
  next_cursor?: string | null;
}

export type JobSignalType = "save" | "dismiss" | "apply" | "impression";
