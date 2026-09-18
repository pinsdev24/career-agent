import { describe, expect, it } from "vitest";
import type { Profile, SearchPreferences } from "@/lib/types";
import {
  extractedFullName,
  firstRunSkipStorageKey,
  getFirstIncompleteSetupStep,
  hasLocationOrRemote,
  hasTargetJobTitle,
  hasUploadedCv,
  isProfileReady,
  isRemotePreferenceOption,
  mergeSearchPreferences,
  readFirstRunSkipped,
  remotePreferenceToFilter,
  writeFirstRunSkipped,
} from "./profile-ready";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    tone_of_voice: "professional",
    language_preference: "en",
    ...overrides,
  };
}

describe("hasUploadedCv", () => {
  it("is false without a profile", () => {
    expect(hasUploadedCv(null)).toBe(false);
    expect(hasUploadedCv(undefined)).toBe(false);
  });

  it("is true when cv_raw_text has content", () => {
    expect(hasUploadedCv(profile({ cv_raw_text: "Jane Doe\nEngineer" }))).toBe(
      true
    );
  });

  it("ignores whitespace-only raw text", () => {
    expect(hasUploadedCv(profile({ cv_raw_text: "  \n  " }))).toBe(false);
  });

  it("is true when a structured CV object has keys", () => {
    expect(
      hasUploadedCv(profile({ cv_structured: { full_name: "Ada Lovelace" } }))
    ).toBe(true);
  });

  it("is false for an empty structured object", () => {
    expect(hasUploadedCv(profile({ cv_structured: {} }))).toBe(false);
  });
});

describe("isProfileReady", () => {
  it("requires CV, target title, and location or remote", () => {
    const ready = profile({
      cv_raw_text: "CV text",
      search_preferences: { job_title: "Engineer", location: "Paris" },
    });
    expect(isProfileReady(ready)).toBe(true);
  });

  it("is ready with remote preference instead of location", () => {
    expect(
      isProfileReady(
        profile({
          cv_structured: { full_name: "Ada" },
          search_preferences: { job_title: "PM", remote_preference: "remote" },
        })
      )
    ).toBe(true);
  });

  it("is not ready with only a CV", () => {
    expect(isProfileReady(profile({ cv_raw_text: "CV" }))).toBe(false);
  });

  it("is not ready with CV and title but no location or remote", () => {
    expect(
      isProfileReady(
        profile({
          cv_raw_text: "CV",
          search_preferences: { job_title: "Engineer" },
        })
      )
    ).toBe(false);
  });

  it("is not ready with CV and remote but no title", () => {
    expect(
      isProfileReady(
        profile({
          cv_raw_text: "CV",
          search_preferences: { remote_preference: "hybrid" },
        })
      )
    ).toBe(false);
  });

  it("treats whitespace title/location as unset", () => {
    expect(
      isProfileReady(
        profile({
          cv_raw_text: "CV",
          search_preferences: { job_title: "  ", location: "   " },
        })
      )
    ).toBe(false);
  });
});

describe("getFirstIncompleteSetupStep", () => {
  it("starts at CV, then title, then location", () => {
    expect(getFirstIncompleteSetupStep(null)).toBe(1);
    expect(getFirstIncompleteSetupStep(profile({ cv_raw_text: "CV" }))).toBe(2);
    expect(
      getFirstIncompleteSetupStep(
        profile({
          cv_raw_text: "CV",
          search_preferences: { job_title: "Engineer" },
        })
      )
    ).toBe(3);
    expect(
      getFirstIncompleteSetupStep(
        profile({
          cv_raw_text: "CV",
          search_preferences: { job_title: "Engineer", location: "Ghent" },
        })
      )
    ).toBe(null);
  });
});

describe("extractedFullName", () => {
  it("returns a trimmed name when present", () => {
    expect(
      extractedFullName(profile({ cv_structured: { full_name: "  Ada  " } }))
    ).toBe("Ada");
  });

  it("returns null when missing", () => {
    expect(extractedFullName(profile())).toBe(null);
    expect(extractedFullName(profile({ cv_structured: { email: "a@b.c" } }))).toBe(
      null
    );
  });
});

describe("preference helpers", () => {
  it("hasTargetJobTitle / hasLocationOrRemote follow the same fields Settings writes", () => {
    const prefs: SearchPreferences = {
      job_title: "Designer",
      location: "",
      remote_preference: "hybrid",
    };
    const p = profile({ search_preferences: prefs });
    expect(hasTargetJobTitle(p)).toBe(true);
    expect(hasLocationOrRemote(p)).toBe(true);
  });

  it("mergeSearchPreferences keeps existing Settings fields", () => {
    expect(
      mergeSearchPreferences(
        { job_title: "PM", location: "Lyon", contract_type: "CDI" },
        { remote_preference: "remote" }
      )
    ).toEqual({
      job_title: "PM",
      location: "Lyon",
      contract_type: "CDI",
      remote_preference: "remote",
    });
  });
});

describe("isRemotePreferenceOption", () => {
  it("accepts the Settings-compatible remote values", () => {
    expect(isRemotePreferenceOption("remote")).toBe(true);
    expect(isRemotePreferenceOption("hybrid")).toBe(true);
    expect(isRemotePreferenceOption("onsite")).toBe(true);
    expect(isRemotePreferenceOption("fully remote")).toBe(false);
  });
});

describe("remotePreferenceToFilter", () => {
  it("maps onsite to false so search does not dump remote-only catalogs", () => {
    expect(remotePreferenceToFilter("onsite")).toBe(false);
    expect(remotePreferenceToFilter("on-site")).toBe(false);
  });

  it("maps remote to true and hybrid to unset", () => {
    expect(remotePreferenceToFilter("remote")).toBe(true);
    expect(remotePreferenceToFilter("fully remote")).toBe(true);
    expect(remotePreferenceToFilter("hybrid")).toBeUndefined();
    expect(remotePreferenceToFilter("")).toBeUndefined();
  });
});

describe("first-run skip storage", () => {
  it("scopes the key per user", () => {
    expect(firstRunSkipStorageKey("abc")).toBe("ariadne:first-run-skipped:abc");
  });

  it("reads and writes a memory store", () => {
    const store = new Map<string, string>();
    const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
    };

    expect(readFirstRunSkipped("u1", storage)).toBe(false);
    writeFirstRunSkipped("u1", true, storage);
    expect(readFirstRunSkipped("u1", storage)).toBe(true);
    expect(readFirstRunSkipped("u2", storage)).toBe(false);
    writeFirstRunSkipped("u1", false, storage);
    expect(readFirstRunSkipped("u1", storage)).toBe(false);
  });
});
