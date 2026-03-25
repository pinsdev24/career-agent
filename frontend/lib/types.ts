/** TypeScript types mirroring backend Pydantic schemas. */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type EntryMode = "explore" | "url";

export type PipelineStatus =
  | "started"
  | "scouting"
  | "waiting_offer_selection"
  | "matching"
  | "writing"
  | "critiquing"
  | "waiting_letter_review"
  | "completed"
  | "failed";

export type ToneOfVoice =
  | "professional"
  | "conversational"
  | "enthusiastic"
  | "formal"
  | "concise";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface SearchPreferences {
  location?: string | null;
  contract_type?: string | null;
  remote_preference?: string | null;
  job_title?: string | null;
  industry?: string | null;
}

export interface Profile {
  id: string;
  cv_raw_text?: string | null;
  cv_structured?: Record<string, unknown> | null;
  tone_of_voice: ToneOfVoice;
  search_preferences?: SearchPreferences | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  url: string;
  pre_score: number;
  snippet?: string | null;
}

export interface GapReport {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  summary: string;
}

export interface CriticScore {
  relevance: number;
  tone: number;
  structure: number;
  specificity: number;
  persuasiveness: number;
  overall: number;
  feedback: string;
}

export interface PipelineRun {
  id: string;
  user_id: string;
  entry_mode: EntryMode;
  status: PipelineStatus;
  offer_url?: string | null;
  selected_offer?: JobOffer | null;
  discovered_offers?: JobOffer[] | null;
  gap_report?: GapReport | null;
  draft_letter?: string | null;
  final_letter?: string | null;
  critic_score?: CriticScore | null;
  revision_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PipelineStatusResponse {
  id: string;
  status: PipelineStatus;
  revision_count: number;
}

// ---------------------------------------------------------------------------
// HITL
// ---------------------------------------------------------------------------

export interface HITLOfferSelection {
  selected_offer_id: string;
}

export interface HITLLetterReview {
  edited_letter: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  started: "Started",
  scouting: "Scouting Jobs",
  waiting_offer_selection: "Select an Offer",
  matching: "Analyzing Match",
  writing: "Writing Letter",
  critiquing: "Evaluating Quality",
  waiting_letter_review: "Review Letter",
  completed: "Completed",
  failed: "Failed",
};

export const PIPELINE_STEPS: PipelineStatus[] = [
  "started",
  "scouting",
  "waiting_offer_selection",
  "matching",
  "writing",
  "critiquing",
  "waiting_letter_review",
  "completed",
];
