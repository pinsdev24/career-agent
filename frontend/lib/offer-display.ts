/** Display-layer contract for offer cards: clean titles, real companies, link gate. */

import type { JobOffer } from "@/lib/types";
import type { JobPosting, ScoreBreakdown } from "@/lib/job-engine-types";
import { formatRelativeTime } from "@/lib/company";

export const MAX_WHY_REASONS = 3;

export type SourceChip = "greenhouse" | "lever" | "ashby" | "workable" | "teamtailor" | "web";

export type LinkGateReason = "ok" | "invalid_url" | "closed_job" | "not_found";

export type PrepareGateReason = LinkGateReason | "inactive";

export type PrepareGate = {
  allowed: boolean;
  reason: PrepareGateReason;
};

export type OfferDisplay = {
  id: string;
  title: string;
  companyName: string;
  companySlug?: string | null;
  location?: string | null;
  remote?: boolean | null;
  postedAt?: string | null;
  status?: string | null;
  score?: number | null;
  why: string[];
  source: SourceChip;
  applyUrl: string;
  skills: string[];
  salary?: string | null;
  contractType?: string | null;
  descriptionText?: string | null;
  snippet?: string | null;
  industry?: string | null;
  size?: string | null;
  contactEmail?: string | null;
};

const ATS_BRANDS = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "ashbyhq",
  "workable",
  "teamtailor",
  "linkedin",
  "indeed",
  "glassdoor",
  "smartrecruiters",
  "workday",
  "jobvite",
  "icims",
  "monster",
  "ziprecruiter",
  "jooble",
  "wellfound",
  "angellist",
]);

const HOST_TLDS = new Set([
  "com",
  "io",
  "co",
  "org",
  "net",
  "dev",
  "app",
  "ai",
  "fr",
  "be",
  "nl",
  "de",
  "uk",
  "eu",
  "info",
  "jobs",
  "careers",
]);

const CHROME_SEGMENT =
  /^(jobs?|careers?|hiring|opportunities|vacancies|vacatures|emplois?|offres?(?:\s+d['’]emploi)?|application|apply|job application|linkedin(?:\s+jobs?)?|indeed|glassdoor|greenhouse|lever|ashby|workable|teamtailor|smartrecruiters|workday|monster|welcome to .+|jobs?\s+at\s+.+|careers?\s+at\s+.+|application\s+[-–—]\s*.+)$/i;

const CHROME_PREFIXES: RegExp[] = [
  /^apply(?:\s+now)?(?:\s+for)?\s+/i,
  /^job application for\s+/i,
  /^application for\s+/i,
  /^we(?:['’]re| are) hiring[:\s]+/i,
  /^now hiring[:\s]+/i,
  /^hiring[:\s]+/i,
];

const TRAILING_CHROME = /\s+(?:application|apply|jobs?|careers?|linkedin|greenhouse|lever|ashby|workable|teamtailor)\s*$/i;

const CLOSED_JOB_PATTERNS =
  /(?:no\s+longer\s+(?:available|open|accepting)|position\s+(?:has\s+been\s+)?(?:filled|closed|removed)|(?:listing|posting)\s+(?:has\s+)?(?:expired|been\s+removed)|opportunity\s+(?:is\s+)?(?:closed|no\s+longer)|application\s+(?:period|window)\s+(?:has\s+)?(?:closed|ended|expired)|404\s*[-–—]?\s*(?:page|not\s+found)|job\s+not\s+found|couldn't\s+find\s+anything\s+here|(?:posting|job)\s+you'?r?e?\s+looking\s+for\s+(?:might\s+have\s+)?(?:closed|been\s+removed)|sorry,?\s+we\s+couldn't\s+find|(?:the\s+)?job\s+(?:you\s+(?:requested|are\s+looking\s+for)\s+)?(?:was\s+)?not\s+found|it\s+has\s+been\s+(?:removed|closed|taken\s+down))/i;

const NOT_FOUND_PATTERNS =
  /(?:404|not\s+found|couldn't\s+find\s+anything\s+here|page\s+not\s+found)/i;

function collapseWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAtsBrandName(value: string): boolean {
  const token = collapseWs(value).toLowerCase();
  if (!token) return true;
  if (ATS_BRANDS.has(token)) return true;
  const first = token.split(/[\s./]+/)[0];
  return ATS_BRANDS.has(first);
}

export function looksLikeUrlHost(value: string): boolean {
  const v = collapseWs(value).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!v || /\s/.test(v)) return false;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) return false;
  const tld = v.split(".").pop() || "";
  return HOST_TLDS.has(tld) || ATS_BRANDS.has(v.split(".")[0]);
}

function isChromeSegment(segment: string, companyName?: string | null): boolean {
  const value = collapseWs(segment);
  if (!value) return true;
  if (CHROME_SEGMENT.test(value)) return true;
  if (isAtsBrandName(value)) return true;
  if (looksLikeUrlHost(value)) return true;
  if (companyName && value.toLowerCase() === collapseWs(companyName).toLowerCase()) {
    return true;
  }
  return false;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b([a-zA-Z])/g, (char) => char.toUpperCase())
    .trim();
}

function isMostlyId(value: string): boolean {
  return /^[0-9a-f-]{8,}$/i.test(value) && /\d/.test(value);
}

export function companyFromApplyUrl(applyUrl?: string | null): string | null {
  if (!applyUrl) return null;
  try {
    const url = new URL(applyUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    const atsHost =
      host.includes("greenhouse.io") ||
      host.includes("lever.co") ||
      host.includes("ashbyhq.com") ||
      host.includes("workable.com");
    if (atsHost && parts[0] && !isMostlyId(parts[0])) {
      return humanizeSlug(decodeURIComponent(parts[0]));
    }

    const skip = new Set([
      "www",
      "careers",
      "jobs",
      "apply",
      "hire",
      "recruiting",
      "talent",
      "work",
      "boards",
      "job-boards",
      "app",
      "go",
    ]);
    for (const label of host.split(".")) {
      if (skip.has(label) || HOST_TLDS.has(label) || ATS_BRANDS.has(label)) continue;
      if (label.length < 2) continue;
      return humanizeSlug(label);
    }
    return null;
  } catch {
    return null;
  }
}

export function cleanJobTitle(raw: string, companyName?: string | null): string {
  let title = collapseWs(raw || "");
  if (!title) return "";

  const pipeParts = title.split(/\s*[|｜]\s*/).map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length > 1) {
    const firstReal = pipeParts.find((part) => !isChromeSegment(part, companyName));
    title = firstReal || pipeParts[0];
  }

  let changed = true;
  while (changed) {
    changed = false;
    const dashParts = title.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
    if (dashParts.length < 2) break;
    const last = dashParts[dashParts.length - 1];
    if (isChromeSegment(last, companyName)) {
      title = dashParts.slice(0, -1).join(" - ");
      changed = true;
    }
  }

  for (const prefix of CHROME_PREFIXES) {
    title = title.replace(prefix, "").trim();
  }

  title = title.replace(TRAILING_CHROME, "").trim();

  if (companyName) {
    const company = escapeRegExp(collapseWs(companyName));
    title = title
      .replace(new RegExp(`\\s+(?:at|chez|bij|@)\\s+${company}\\s*$`, "i"), "")
      .trim();
  }

  title = title.replace(/[\s|–—:-]+$/g, "").trim();
  if (isChromeSegment(title, companyName)) return "";
  return title;
}

export function displayCompany(opts: {
  companyName?: string | null;
  companySlug?: string | null;
  applyUrl?: string | null;
}): string {
  const raw = collapseWs(opts.companyName || "");
  if (raw && !looksLikeUrlHost(raw) && !isAtsBrandName(raw)) {
    return raw;
  }

  const slug = collapseWs(opts.companySlug || "");
  if (slug && !looksLikeUrlHost(slug) && !slug.includes(".") && !isAtsBrandName(slug) && !isMostlyId(slug)) {
    return humanizeSlug(slug);
  }

  const fromUrl = companyFromApplyUrl(opts.applyUrl);
  if (fromUrl && !isAtsBrandName(fromUrl) && !looksLikeUrlHost(fromUrl)) {
    return fromUrl;
  }

  if (slug && !isAtsBrandName(slug)) {
    return humanizeSlug(slug.replace(/\./g, " "));
  }

  return "";
}

export function whyReasons(input: {
  reasons?: string[] | null;
  matchingSkills?: string[] | null;
  skills?: string[] | null;
}): string[] {
  const reasons = unique((input.reasons || []).map((item) => collapseWs(item)).filter(Boolean));
  return reasons.slice(0, MAX_WHY_REASONS);
}

export function sourceChip(source?: string | null): SourceChip {
  const value = (source || "").toLowerCase();
  if (value.includes("greenhouse")) return "greenhouse";
  if (value.includes("lever")) return "lever";
  if (value.includes("ashby")) return "ashby";
  if (value.includes("workable")) return "workable";
  if (value.includes("teamtailor")) return "teamtailor";
  return "web";
}

export function isHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function hasClosedJobSignal(text?: string | null): boolean {
  if (!text) return false;
  return CLOSED_JOB_PATTERNS.test(text);
}

export function evaluateLinkGate(opts: {
  applyUrl?: string | null;
  descriptionText?: string | null;
  httpStatus?: number | null;
}): { ok: boolean; reason: LinkGateReason } {
  if (!isHttpUrl(opts.applyUrl)) {
    return { ok: false, reason: "invalid_url" };
  }
  if (opts.httpStatus === 404 || opts.httpStatus === 410) {
    return { ok: false, reason: "not_found" };
  }
  if (hasClosedJobSignal(opts.descriptionText)) {
    if (NOT_FOUND_PATTERNS.test(opts.descriptionText || "")) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "closed_job" };
  }
  return { ok: true, reason: "ok" };
}

export function evaluatePrepareGate(opts: {
  status?: string | null;
  applyUrl?: string | null;
  descriptionText?: string | null;
  httpStatus?: number | null;
}): PrepareGate {
  if ((opts.status || "").trim().toLowerCase() !== "active") {
    return { allowed: false, reason: "inactive" };
  }
  const gate = evaluateLinkGate(opts);
  return { allowed: gate.ok, reason: gate.reason };
}

export function freshnessLabel(
  postedAt: string | null | undefined,
  locale: string,
  unknown: string
): string {
  return formatRelativeTime(postedAt, locale) || unknown;
}

export function postingToDisplay(job: JobPosting): OfferDisplay {
  const companyName = displayCompany({
    companyName: job.company_name,
    companySlug: job.company_slug,
    applyUrl: job.apply_url,
  });
  const breakdown: ScoreBreakdown | null | undefined = job.score_breakdown;
  return {
    id: job.id,
    title: cleanJobTitle(job.title, companyName || job.company_name),
    companyName,
    companySlug: job.company_slug,
    location: job.location,
    remote: job.remote,
    postedAt: job.posted_at,
    status: job.status,
    score: job.score ?? breakdown?.total ?? null,
    why: whyReasons({
      reasons: breakdown?.reasons,
      matchingSkills: breakdown?.matching_skills,
      skills: job.skills,
    }),
    source: sourceChip(job.source),
    applyUrl: job.apply_url,
    skills: job.skills || [],
    salary: job.salary,
    contractType: job.contract_type,
    descriptionText: job.description_text,
  };
}

export function hitlOfferToDisplay(offer: JobOffer): OfferDisplay {
  const companyName = displayCompany({
    companyName: offer.company_info?.name || offer.company,
    applyUrl: offer.url,
  });
  return {
    id: offer.id,
    title: cleanJobTitle(offer.title, companyName || offer.company),
    companyName,
    location: offer.location,
    score: typeof offer.pre_score === "number" ? offer.pre_score : null,
    why: whyReasons({}),
    source: sourceChip(offer.url),
    applyUrl: offer.url,
    skills: [],
    snippet: offer.snippet,
    industry: offer.company_info?.industry,
    size: offer.company_info?.size,
    contactEmail: offer.contact_email,
  };
}

export function prepareReasonKey(reason: PrepareGateReason): string | null {
  switch (reason) {
    case "ok":
      return null;
    case "inactive":
      return "prepare_disabled_expired";
    case "invalid_url":
    case "closed_job":
    case "not_found":
      return "prepare_disabled_dead_link";
    default:
      return "prepare_disabled_unavailable";
  }
}
