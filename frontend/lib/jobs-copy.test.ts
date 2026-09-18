import { describe, expect, it } from "vitest";
import {
  jobsChipMessageKey,
  jobsEmptyMessageKeys,
  selectJobsChipKind,
  selectJobsEmptyKind,
} from "./jobs-copy";

describe("selectJobsEmptyKind", () => {
  it("prefers geo+role over geo or role", () => {
    expect(
      selectJobsEmptyKind({ title: "Firmware Engineer", location: "Belgium" })
    ).toBe("geo_role");
  });

  it("uses filters empty when structured filters are on", () => {
    expect(
      selectJobsEmptyKind({
        title: "Ingénieur IA",
        location: "Belgium",
        structuredFilters: true,
      })
    ).toBe("filters");
  });

  it("uses geo when only location is set", () => {
    expect(selectJobsEmptyKind({ location: "Belgium" })).toBe("geo");
  });

  it("uses role when title is set without location (including remote-only)", () => {
    expect(
      selectJobsEmptyKind({ title: "Firmware Engineer", remote: true })
    ).toBe("role");
  });

  it("falls back to warming when neither title nor location is set", () => {
    expect(selectJobsEmptyKind({})).toBe("warming");
    expect(selectJobsEmptyKind({ remote: true })).toBe("warming");
  });
});

describe("selectJobsChipKind", () => {
  it("is null unless title or location/remote is set", () => {
    expect(selectJobsChipKind({})).toBeNull();
    expect(selectJobsChipKind({ title: "  " })).toBeNull();
  });

  it("prefers title · location over remote", () => {
    expect(
      selectJobsChipKind({
        title: "Firmware Engineer",
        location: "Belgium",
        remote: true,
      })
    ).toBe("for");
  });

  it("uses remote chip when title is set and location is not", () => {
    expect(
      selectJobsChipKind({ title: "Firmware Engineer", remote: true })
    ).toBe("remote");
  });

  it("uses title-only when hybrid/onsite without a location", () => {
    expect(selectJobsChipKind({ title: "Firmware Engineer" })).toBe("title_only");
  });

  it("uses location-only when there is no title", () => {
    expect(selectJobsChipKind({ location: "Belgium" })).toBe("location_only");
  });

  it("does not invent a remote-only chip without a title", () => {
    expect(selectJobsChipKind({ remote: true })).toBeNull();
  });
});

describe("message keys", () => {
  it("maps empty kinds to Jobs.* keys (no invented copy)", () => {
    expect(jobsEmptyMessageKeys("geo_role")).toEqual({
      title: "empty_geo_role",
      hint: "empty_geo_role_hint",
    });
    expect(jobsEmptyMessageKeys("warming")).toEqual({
      title: "empty_warming",
      hint: "empty_warming_hint",
    });
    expect(jobsEmptyMessageKeys("filters")).toEqual({
      title: "empty_filters",
      hint: "empty_filters_hint",
    });
  });

  it("maps chip kinds to matches_for* keys", () => {
    expect(jobsChipMessageKey("for")).toBe("matches_for");
    expect(jobsChipMessageKey("remote")).toBe("matches_for_remote");
  });
});

describe("Jobs EN paste-ready copy", () => {
  it("keeps exact Cut 0/1 strings under Jobs.*", async () => {
    const { default: en } = await import("../messages/en.json");
    const jobs = en.Jobs;
    expect(jobs.subtitle).toBe(
      "Ranked for your CV and preferences — from boards we can reach, not every job on the web."
    );
    expect(jobs.empty_warming).toBe("Still finding roles that fit your profile.");
    expect(jobs.empty_warming_hint).toBe(
      "We only show roles we can rank for you — not a full-market sweep. Paste a URL if you already have a posting."
    );
    expect(jobs.empty_warming_cta).toBe("Paste a job URL");
    expect(jobs.empty_geo).toBe("No strong matches in your region yet.");
    expect(jobs.empty_geo_hint).toBe(
      "We’re warming boards for {location}. Check back soon, or paste a job URL to add that board."
    );
    expect(jobs.empty_role).toBe("No strong matches for {title} yet.");
    expect(jobs.empty_role_hint).toBe(
      "Discovery is catching up to your target role. Paste a URL if you already have one."
    );
    expect(jobs.empty_geo_role).toBe(
      "No strong matches for {title} near {location} yet."
    );
    expect(jobs.empty_geo_role_hint).toBe(
      "Better an honest empty than a dump of unrelated roles. Paste a URL or check back soon."
    );
    expect(jobs.matches_for).toBe("Matches for {title} · {location}");
    expect(jobs.matches_for_title_only).toBe("Matches for {title}");
    expect(jobs.matches_for_location_only).toBe("Matches near {location}");
    expect(jobs.matches_for_remote).toBe("Matches for {title} · Remote");
    expect(jobs).not.toHaveProperty("empty_warming_for");
    expect(jobs).not.toHaveProperty("match_chip");
    expect(jobs.empty).toBe("No jobs in your feed yet");
    expect(jobs.empty_filters).toBe("No roles match these filters.");
    expect(jobs.empty_filters_hint).toBe(
      "Try widening country, work mode, or roles — we won’t show mismatched geo just to fill the list."
    );
    expect(jobs.empty_filters_cta).toBe("Clear filters");
    expect(jobs.why_location_match).toBe("Location fit");
    expect(jobs.why_location_match_detail).toBe("Matches your countries");
    expect(jobs.filter_countries).toBe("Country");
    expect(jobs.filter_more).toBe("More filters");
  });
});

describe("Jobs FR/NL paste-ready copy", () => {
  it("keeps exact FR strings", async () => {
    const { default: fr } = await import("../messages/fr.json");
    expect(fr.Jobs.subtitle).toBe(
      "Classées selon votre CV et vos préférences — depuis les boards que nous pouvons atteindre, pas toutes les offres du web."
    );
    expect(fr.Jobs.empty_geo_role).toBe(
      "Pas encore de bonnes correspondances pour {title} près de {location}."
    );
    expect(fr.Jobs.matches_for_remote).toBe(
      "Correspondances pour {title} · Remote"
    );
    expect(fr.Jobs.empty_warming_cta).toBe("Coller une URL d’offre");
  });

  it("keeps exact NL strings", async () => {
    const { default: nl } = await import("../messages/nl.json");
    expect(nl.Jobs.subtitle).toBe(
      "Gerangschikt op je cv en voorkeuren — van boards die we kunnen bereiken, niet elke job op het web."
    );
    expect(nl.Jobs.empty_geo_role).toBe(
      "Nog geen sterke matches voor {title} bij {location}."
    );
    expect(nl.Jobs.matches_for_location_only).toBe("Matches bij {location}");
    expect(nl.Jobs.empty_warming_cta).toBe("Job-URL plakken");
  });
});
