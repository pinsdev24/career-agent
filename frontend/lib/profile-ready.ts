/** Client helpers for first-run profile readiness (same fields Profile/Settings use). */

import type { Profile, SearchPreferences } from "@/lib/types";

export const FIRST_RUN_SKIP_PREFIX = "ariadne:first-run-skipped:";

export type FirstRunStep = 1 | 2 | 3;

function isNonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyList(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => isNonEmpty(item));
}

export function hasUploadedCv(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (isNonEmpty(profile.cv_raw_text)) return true;
  const structured = profile.cv_structured;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    return Object.keys(structured).length > 0;
  }
  return false;
}

export function hasTargetJobTitle(profile: Profile | null | undefined): boolean {
  return isNonEmpty(profile?.search_preferences?.job_title);
}

export function hasLocationOrRemote(profile: Profile | null | undefined): boolean {
  const prefs = profile?.search_preferences;
  return (
    nonEmptyList(prefs?.countries) ||
    isNonEmpty(prefs?.location) ||
    nonEmptyList(prefs?.work_modes) ||
    isNonEmpty(prefs?.remote_preference)
  );
}

/** Ready when CV is uploaded, target title is set, and location OR remote is set. */
export function isProfileReady(profile: Profile | null | undefined): boolean {
  return (
    hasUploadedCv(profile) &&
    hasTargetJobTitle(profile) &&
    hasLocationOrRemote(profile)
  );
}

export function getFirstIncompleteSetupStep(
  profile: Profile | null | undefined
): FirstRunStep | null {
  if (!hasUploadedCv(profile)) return 1;
  if (!hasTargetJobTitle(profile)) return 2;
  if (!hasLocationOrRemote(profile)) return 3;
  return null;
}

export function extractedFullName(profile: Profile | null | undefined): string | null {
  const name = profile?.cv_structured?.full_name;
  return isNonEmpty(name) ? String(name).trim() : null;
}

export function mergeSearchPreferences(
  existing: SearchPreferences | null | undefined,
  patch: SearchPreferences
): SearchPreferences {
  return { ...existing, ...patch };
}

export function firstRunSkipStorageKey(userId: string): string {
  return `${FIRST_RUN_SKIP_PREFIX}${userId}`;
}

export function readFirstRunSkipped(
  userId: string,
  storage?: Pick<Storage, "getItem"> | null
): boolean {
  if (!userId) return false;
  try {
    const store =
      storage ?? (typeof localStorage === "undefined" ? null : localStorage);
    if (!store) return false;
    return store.getItem(firstRunSkipStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeFirstRunSkipped(
  userId: string,
  skipped: boolean,
  storage?: Pick<Storage, "setItem" | "removeItem"> | null
): void {
  if (!userId) return;
  try {
    const store =
      storage ?? (typeof localStorage === "undefined" ? null : localStorage);
    if (!store) return;
    const key = firstRunSkipStorageKey(userId);
    if (skipped) store.setItem(key, "1");
    else store.removeItem(key);
  } catch {
    // Ignore quota / private-mode failures — skip is a soft UX hint.
  }
}

export const REMOTE_PREFERENCE_OPTIONS = [
  "remote",
  "hybrid",
  "onsite",
] as const;

export type RemotePreferenceOption = (typeof REMOTE_PREFERENCE_OPTIONS)[number];

export function isRemotePreferenceOption(
  value: string
): value is RemotePreferenceOption {
  return (REMOTE_PREFERENCE_OPTIONS as readonly string[]).includes(value);
}

export function remotePreferenceToFilter(
  value: string | null | undefined,
  workModes?: string[] | null
): boolean | undefined {
  const modes = (workModes || []).map((item) => item.trim().toLowerCase());
  if (modes.length) {
    const unique = new Set(modes);
    if (unique.size === 1 && unique.has("remote")) return true;
    if (unique.size === 1 && unique.has("onsite")) return false;
    if (unique.has("onsite") && unique.has("hybrid") && !unique.has("remote")) {
      return false;
    }
    return undefined;
  }
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "remote" || normalized === "fully remote") return true;
  if (
    normalized === "onsite" ||
    normalized === "on-site" ||
    normalized === "on site" ||
    normalized === "office" ||
    normalized === "in-office"
  ) {
    return false;
  }
  return undefined;
}
