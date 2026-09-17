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

export type LanguagePreference = "en" | "fr" | "nl";

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
  language_preference: LanguagePreference;
  search_preferences?: SearchPreferences | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface CompanyInfo {
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  company_info?: CompanyInfo | null;
  location?: string | null;
  url: string;
  contact_email?: string | null;
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
  error_details?: Record<string, unknown> | null;
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
  user_feedback?: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export interface Memory {
  memory_key: string;
  memory_data: Record<string, any>;
  updated_at?: string;
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
}

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

export const PIPELINE_ACTIVE_STEPS: PipelineStatus[] = [
  "started",
  "scouting",
  "matching",
  "writing",
  "critiquing",
];

export interface AgentLogEvent {
  type: "info" | "agent_action" | "node_finish" | "error" | string;
  node?: string;
  message: string;
  code?: string;
}

export type ApplicationStatus =
  | "draft"
  | "generating"
  | "packet_ready"
  | "approved"
  | "submitted"
  | "interviewing"
  | "rejected"
  | "withdrawn";

export interface ApplicationPacket {
  id?: string;
  gap_report?: GapReport | null;
  draft_letter?: string | null;
  final_letter?: string | null;
  best_draft?: string | null;
  best_score?: number | null;
  critic_score?: CriticScore | null;
  revision_count?: number;
  user_feedback?: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  posting_id: string;
  status: ApplicationStatus;
  error_details?: Record<string, unknown> | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  packet?: ApplicationPacket | null;
  posting?: {
    id: string;
    title?: string;
    company_name?: string;
    apply_url?: string;
    location?: string | null;
    status?: string;
  } | null;
}

export interface WorkItem {
  id: string;
  user_id: string;
  application_id?: string | null;
  item_type: "review_packet" | "confirm_submitted";
  status: string;
  payload?: Record<string, unknown>;
  created_at?: string | null;
}
