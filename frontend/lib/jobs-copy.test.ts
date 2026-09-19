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

  it("uses warming/catalog when the Jobs bar has no UI filters", () => {
    expect(
      selectJobsEmptyKind({
        title: "Ingénieur IA",
        location: "Belgique · France",
        structuredFilters: false,
        uiFiltersActive: false,
      })
    ).toBe("warming");
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

describe("Jobs Cut 2 URL-seed copy", () => {
  const JOBS_SEED_KEYS = [
    "url_seed_title",
    "url_seed_desc",
    "url_seed_placeholder",
    "url_seed_submit",
    "url_seed_success",
    "url_seed_success_named",
    "url_seed_already",
    "url_seed_unsupported",
    "url_seed_unsupported_hint",
    "url_seed_invalid",
    "url_seed_error",
    "url_seed_syncing",
  ] as const;

  const EN_JOBS = {
    url_seed_title: "Paste a job URL",
    url_seed_desc:
      "Greenhouse, Lever, Ashby, or Workable — we’ll follow that company board for everyone.",
    url_seed_placeholder: "https://boards.greenhouse.io/…",
    url_seed_submit: "Add board",
    url_seed_success:
      "Following this company — jobs will appear in the feed as we sync.",
    url_seed_success_named:
      "Following {company} — jobs will appear in the feed as we sync.",
    url_seed_already: "Already following this board — syncing latest jobs.",
    url_seed_unsupported:
      "That isn’t a Greenhouse, Lever, Ashby, or Workable URL we can follow.",
    url_seed_unsupported_hint:
      "You can still prepare a packet from many careers pages — board seed only works for those ATS.",
    url_seed_invalid: "Paste a full http(s) job or careers URL.",
    url_seed_error: "Couldn’t add that board. Try again in a moment.",
    url_seed_syncing: "Syncing board…",
  };

  const FR_JOBS = {
    url_seed_title: "Coller une URL d’offre",
    url_seed_desc:
      "Greenhouse, Lever, Ashby ou Workable — on suivra ce board pour tout le monde.",
    url_seed_placeholder: "https://boards.greenhouse.io/…",
    url_seed_submit: "Ajouter le board",
    url_seed_success:
      "Entreprise suivie — les offres apparaîtront dans le flux au fur et à mesure du sync.",
    url_seed_success_named:
      "Suivi de {company} — les offres apparaîtront dans le flux au sync.",
    url_seed_already: "Board déjà suivi — sync des dernières offres.",
    url_seed_unsupported:
      "Ce n’est pas une URL Greenhouse, Lever, Ashby ou Workable que nous pouvons suivre.",
    url_seed_unsupported_hint:
      "Vous pouvez quand même préparer un dossier depuis beaucoup de pages carrières — le seed de board ne marche que pour ces ATS.",
    url_seed_invalid: "Collez une URL http(s) complète d’offre ou de carrières.",
    url_seed_error: "Impossible d’ajouter ce board. Réessayez dans un instant.",
    url_seed_syncing: "Sync du board…",
  };

  const NL_JOBS = {
    url_seed_title: "Plak een job-URL",
    url_seed_desc:
      "Greenhouse, Lever, Ashby of Workable — we volgen dat company-board voor iedereen.",
    url_seed_placeholder: "https://boards.greenhouse.io/…",
    url_seed_submit: "Board toevoegen",
    url_seed_success:
      "Dit bedrijf wordt gevolgd — jobs verschijnen in de feed tijdens de sync.",
    url_seed_success_named:
      "{company} wordt gevolgd — jobs verschijnen in de feed tijdens de sync.",
    url_seed_already: "Board wordt al gevolgd — laatste jobs synchroniseren.",
    url_seed_unsupported:
      "Dat is geen Greenhouse-, Lever-, Ashby- of Workable-URL die we kunnen volgen.",
    url_seed_unsupported_hint:
      "Je kunt nog steeds een packet voorbereiden vanaf veel careers-pagina’s — board-seed werkt alleen voor die ATS.",
    url_seed_invalid: "Plak een volledige http(s) job- of careers-URL.",
    url_seed_error: "Kon dat board niet toevoegen. Probeer zo opnieuw.",
    url_seed_syncing: "Board synchroniseren…",
  };

  it("keeps exact EN/FR/NL Jobs url_seed_* strings", async () => {
    const { default: en } = await import("../messages/en.json");
    const { default: fr } = await import("../messages/fr.json");
    const { default: nl } = await import("../messages/nl.json");
    expect(en.Jobs.empty_warming_cta).toBe("Paste a job URL");
    expect(en.Jobs.paste_url_header).toBe("Paste a job URL");
    expect(en.Jobs.paste_url_header_hint).toBe(
      "Follow a Greenhouse, Lever, Ashby, or Workable board"
    );
    expect(en.Jobs.paste_url_detail_link).toBe("Have a URL not in the feed?");
    expect(fr.Jobs.paste_url_header).toBe("Coller une URL d’offre");
    expect(fr.Jobs.paste_url_header_hint).toBe(
      "Suivre un board Greenhouse, Lever, Ashby ou Workable"
    );
    expect(fr.Jobs.paste_url_detail_link).toBe(
      "Vous avez une URL absente du flux ?"
    );
    expect(nl.Jobs.paste_url_header).toBe("Plak een job-URL");
    expect(nl.Jobs.paste_url_header_hint).toBe(
      "Volg een Greenhouse-, Lever-, Ashby- of Workable-board"
    );
    expect(nl.Jobs.paste_url_detail_link).toBe(
      "Heb je een URL die niet in de feed staat?"
    );
    for (const key of JOBS_SEED_KEYS) {
      expect(en.Jobs[key], `en ${key}`).toBe(EN_JOBS[key]);
      expect(fr.Jobs[key], `fr ${key}`).toBe(FR_JOBS[key]);
      expect(nl.Jobs[key], `nl ${key}`).toBe(NL_JOBS[key]);
    }
    expect(en.Jobs).not.toHaveProperty("seed_success");
    expect(en.Jobs).not.toHaveProperty("seed_fail");
    expect(en.Jobs).not.toHaveProperty("seed_letter");
    expect(en.Jobs).not.toHaveProperty("seed_placeholder");
  });

  it("keeps exact NewMission pipeline side-effect strings", async () => {
    const { default: en } = await import("../messages/en.json");
    const { default: fr } = await import("../messages/fr.json");
    const { default: nl } = await import("../messages/nl.json");
    expect(en.NewMission.url_seed_side_success).toBe(
      "Also following this company board for the Jobs feed."
    );
    expect(en.NewMission.url_seed_side_unsupported).toBe(
      "Letter can continue — this URL isn’t a board we seed into Jobs."
    );
    expect(fr.NewMission.url_seed_side_success).toBe(
      "Board aussi suivi pour le flux Jobs."
    );
    expect(fr.NewMission.url_seed_side_unsupported).toBe(
      "La lettre peut continuer — cette URL n’est pas un board que nous ajoutons à Jobs."
    );
    expect(nl.NewMission.url_seed_side_success).toBe(
      "Ook dit company-board volgen voor de Jobs-feed."
    );
    expect(nl.NewMission.url_seed_side_unsupported).toBe(
      "Brief kan doorgaan — deze URL is geen board dat we in Jobs zetten."
    );
  });

  it("does not ship banned product names in Cut 2 seed copy", async () => {
    const { default: en } = await import("../messages/en.json");
    const { default: fr } = await import("../messages/fr.json");
    const { default: nl } = await import("../messages/nl.json");
    const PASTE_IA = [
      "paste_url_header",
      "paste_url_header_hint",
      "paste_url_detail_link",
      "empty_warming_cta",
    ] as const;
    const blob = [
      ...JOBS_SEED_KEYS.map((key) => String(en.Jobs[key])),
      ...JOBS_SEED_KEYS.map((key) => String(fr.Jobs[key])),
      ...JOBS_SEED_KEYS.map((key) => String(nl.Jobs[key])),
      ...PASTE_IA.map((key) => String(en.Jobs[key])),
      ...PASTE_IA.map((key) => String(fr.Jobs[key])),
      ...PASTE_IA.map((key) => String(nl.Jobs[key])),
      en.NewMission.url_seed_side_success,
      en.NewMission.url_seed_side_unsupported,
      fr.NewMission.url_seed_side_success,
      fr.NewMission.url_seed_side_unsupported,
      nl.NewMission.url_seed_side_success,
      nl.NewMission.url_seed_side_unsupported,
    ].join("\n");
    expect(blob).not.toMatch(/CareerAgent|MACA|ariadne\.app/i);
    expect(blob).not.toMatch(/full-market search/i);
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
