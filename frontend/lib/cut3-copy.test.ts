import { describe, expect, it } from "vitest";

describe("Cut 3 UX strings", () => {
  it("keeps exact FirstRun step 3 EN keys", async () => {
    const { default: en } = await import("../messages/en.json");
    expect(en.FirstRun.step3_title).toBe("Where do you want to work?");
    expect(en.FirstRun.step3_desc).toBe("Pick one or more countries. Remote is separate.");
    expect(en.FirstRun.step3_countries_label).toBe("Countries");
    expect(en.FirstRun.step3_countries_placeholder).toBe("Search countries…");
    expect(en.FirstRun.step3_countries_hint).toBe("Type to search — typos are ok.");
    expect(en.FirstRun.step3_cities_label).toBe("Cities (optional)");
    expect(en.FirstRun.step3_cities_placeholder).toBe("Cities in your selected countries…");
    expect(en.FirstRun.step3_cities_empty_countries).toBe("Select a country first.");
    expect(en.FirstRun.step3_remote_label).toBe("Work mode");
    expect(en.FirstRun.step3_error).toBe("Select at least one country or a work mode.");
    expect(en.FirstRun.step3_error_country).toBe("Select at least one country.");
  });

  it("keeps exact Settings EN keys", async () => {
    const { default: en } = await import("../messages/en.json");
    const s = en.Settings;
    expect(s.search_filters).toBe("Search preferences");
    expect(s.search_filters_desc).toBe(
      "Used to rank and filter Jobs. Stored as structured codes — not free-text guesses."
    );
    expect(s.countries_hint).toBe(
      "Multi-select. We match on country codes, not fuzzy city substrings."
    );
    expect(s.roles_hint).toBe(
      "Multi-select. Keeps Sales/ER from drowning an AI Engineer feed."
    );
    expect(s.location_legacy_label).toBe("Location (legacy text)");
    expect(s.work_mode_onsite).toBe("On-site");
    expect(s.contract_fixed_term).toBe("Fixed-term");
  });

  it("keeps FR/NL FirstRun and Settings keys in sync", async () => {
    const { default: fr } = await import("../messages/fr.json");
    const { default: nl } = await import("../messages/nl.json");
    expect(fr.FirstRun.step3_countries_label).toBe("Pays");
    expect(fr.Settings.search_filters).toBe("Préférences de recherche");
    expect(fr.Jobs.empty_filters_cta).toBe("Effacer les filtres");
    expect(nl.FirstRun.step3_countries_label).toBe("Landen");
    expect(nl.Settings.roles_label).toBe("Voorkeursrollen");
    expect(nl.Jobs.why_location_match).toBe("Locatiefit");
  });
});
