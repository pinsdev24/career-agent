import { describe, expect, it } from "vitest";

const FIRST_RUN_KEYS = [
  "step3_title",
  "step3_desc",
  "step3_countries_label",
  "step3_countries_placeholder",
  "step3_countries_hint",
  "step3_cities_label",
  "step3_cities_placeholder",
  "step3_cities_empty_countries",
  "step3_remote_label",
  "step3_error",
  "step3_error_country",
] as const;

const SETTINGS_KEYS = [
  "search_filters",
  "search_filters_desc",
  "countries_label",
  "countries_placeholder",
  "countries_hint",
  "cities_label",
  "cities_placeholder",
  "work_mode_label",
  "work_mode_remote",
  "work_mode_hybrid",
  "work_mode_onsite",
  "contract_label",
  "contract_permanent",
  "contract_freelance",
  "contract_internship",
  "contract_fixed_term",
  "roles_label",
  "roles_placeholder",
  "roles_hint",
  "location_legacy_label",
  "location_legacy_hint",
] as const;

const JOBS_KEYS = [
  "filters_label",
  "filter_countries",
  "filter_countries_placeholder",
  "filter_work_mode",
  "filter_work_mode_any",
  "filter_contract",
  "filter_contract_any",
  "filter_roles",
  "filter_roles_placeholder",
  "filter_clear",
  "filter_apply",
  "filter_active_count",
  "filter_more",
  "empty_filters",
  "empty_filters_hint",
  "empty_filters_cta",
  "why_location_match",
  "why_location_match_detail",
] as const;

const EN = {
  FirstRun: {
    step3_title: "Where do you want to work?",
    step3_desc: "Pick one or more countries. Remote is separate.",
    step3_countries_label: "Countries",
    step3_countries_placeholder: "Search countries…",
    step3_countries_hint: "Type to search — typos are ok.",
    step3_cities_label: "Cities (optional)",
    step3_cities_placeholder: "Cities in your selected countries…",
    step3_cities_empty_countries: "Select a country first.",
    step3_remote_label: "Work mode",
    step3_error: "Select at least one country or a work mode.",
    step3_error_country: "Select at least one country.",
  },
  Settings: {
    search_filters: "Search preferences",
    search_filters_desc:
      "Used to rank and filter Jobs. Stored as structured codes — not free-text guesses.",
    countries_label: "Countries",
    countries_placeholder: "Search countries…",
    countries_hint:
      "Multi-select. We match on country codes, not fuzzy city substrings.",
    cities_label: "Cities (optional)",
    cities_placeholder: "Cities in selected countries…",
    work_mode_label: "Work mode",
    work_mode_remote: "Remote",
    work_mode_hybrid: "Hybrid",
    work_mode_onsite: "On-site",
    contract_label: "Contract type",
    contract_permanent: "Permanent",
    contract_freelance: "Freelance",
    contract_internship: "Internship",
    contract_fixed_term: "Fixed-term",
    roles_label: "Preferred roles",
    roles_placeholder: "Add role titles or families…",
    roles_hint: "Multi-select. Keeps Sales/ER from drowning an AI Engineer feed.",
    location_legacy_label: "Location (legacy text)",
    location_legacy_hint: "Still saved if present; prefer Countries above.",
  },
  Jobs: {
    filters_label: "Filters",
    filter_countries: "Country",
    filter_countries_placeholder: "Any country",
    filter_work_mode: "Work mode",
    filter_work_mode_any: "Any mode",
    filter_contract: "Contract",
    filter_contract_any: "Any contract",
    filter_roles: "Roles",
    filter_roles_placeholder: "Any role",
    filter_clear: "Clear filters",
    filter_apply: "Apply",
    filter_active_count: "{count} filters",
    filter_more: "More filters",
    empty_filters: "No roles match these filters.",
    empty_filters_hint:
      "Try widening country, work mode, or roles — we won’t show mismatched geo just to fill the list.",
    empty_filters_cta: "Clear filters",
    why_location_match: "Location fit",
    why_location_match_detail: "Matches your countries",
  },
};

const FR = {
  FirstRun: {
    step3_title: "Où voulez-vous travailler ?",
    step3_desc: "Choisissez un ou plusieurs pays. Le remote est séparé.",
    step3_countries_label: "Pays",
    step3_countries_placeholder: "Rechercher un pays…",
    step3_countries_hint: "Tapez pour chercher — les fautes sont tolérées.",
    step3_cities_label: "Villes (optionnel)",
    step3_cities_placeholder: "Villes dans les pays sélectionnés…",
    step3_cities_empty_countries: "Sélectionnez d’abord un pays.",
    step3_remote_label: "Mode de travail",
    step3_error: "Sélectionnez au moins un pays ou un mode de travail.",
    step3_error_country: "Sélectionnez au moins un pays.",
  },
  Settings: {
    search_filters: "Préférences de recherche",
    search_filters_desc:
      "Servent à classer et filtrer les offres. Codes structurés — pas du texte libre approximatif.",
    countries_label: "Pays",
    countries_placeholder: "Rechercher un pays…",
    countries_hint:
      "Multi-sélection. On matche des codes pays, pas des sous-chaînes de villes.",
    cities_label: "Villes (optionnel)",
    cities_placeholder: "Villes dans les pays sélectionnés…",
    work_mode_label: "Mode de travail",
    work_mode_remote: "Remote",
    work_mode_hybrid: "Hybride",
    work_mode_onsite: "Sur site",
    contract_label: "Type de contrat",
    contract_permanent: "CDI / permanent",
    contract_freelance: "Freelance",
    contract_internship: "Stage",
    contract_fixed_term: "CDD / durée déterminée",
    roles_label: "Rôles préférés",
    roles_placeholder: "Ajouter des titres ou familles…",
    roles_hint:
      "Multi-sélection. Évite qu’un flux Sales/ER écrase un profil Ingénieur IA.",
    location_legacy_label: "Lieu (texte legacy)",
    location_legacy_hint: "Conservé s’il existe ; préférez Pays ci-dessus.",
  },
  Jobs: {
    filters_label: "Filtres",
    filter_countries: "Pays",
    filter_countries_placeholder: "Tous les pays",
    filter_work_mode: "Mode",
    filter_work_mode_any: "Tous les modes",
    filter_contract: "Contrat",
    filter_contract_any: "Tous les contrats",
    filter_roles: "Rôles",
    filter_roles_placeholder: "Tous les rôles",
    filter_clear: "Effacer les filtres",
    filter_apply: "Appliquer",
    filter_active_count: "{count} filtres",
    filter_more: "Plus de filtres",
    empty_filters: "Aucune offre ne correspond à ces filtres.",
    empty_filters_hint:
      "Élargissez pays, mode ou rôles — on n’affichera pas une mauvaise géo juste pour remplir la liste.",
    empty_filters_cta: "Effacer les filtres",
    why_location_match: "Adéquation lieu",
    why_location_match_detail: "Correspond à vos pays",
  },
};

const NL = {
  FirstRun: {
    step3_title: "Waar wil je werken?",
    step3_desc: "Kies één of meer landen. Remote is apart.",
    step3_countries_label: "Landen",
    step3_countries_placeholder: "Zoek landen…",
    step3_countries_hint: "Typ om te zoeken — typefouten mogen.",
    step3_cities_label: "Steden (optioneel)",
    step3_cities_placeholder: "Steden in je geselecteerde landen…",
    step3_cities_empty_countries: "Selecteer eerst een land.",
    step3_remote_label: "Werkmodus",
    step3_error: "Selecteer minstens één land of een werkmodus.",
    step3_error_country: "Selecteer minstens één land.",
  },
  Settings: {
    search_filters: "Zoekvoorkeuren",
    search_filters_desc:
      "Voor rangschikken en filteren van Jobs. Gestructureerde codes — geen vrije-tekst-giswerk.",
    countries_label: "Landen",
    countries_placeholder: "Zoek landen…",
    countries_hint:
      "Multi-select. We matchen op landcodes, niet op stads-substrings.",
    cities_label: "Steden (optioneel)",
    cities_placeholder: "Steden in geselecteerde landen…",
    work_mode_label: "Werkmodus",
    work_mode_remote: "Remote",
    work_mode_hybrid: "Hybrid",
    work_mode_onsite: "On-site",
    contract_label: "Contracttype",
    contract_permanent: "Vast",
    contract_freelance: "Freelance",
    contract_internship: "Stage",
    contract_fixed_term: "Bepaalde tijd",
    roles_label: "Voorkeursrollen",
    roles_placeholder: "Voeg functietitels of families toe…",
    roles_hint:
      "Multi-select. Voorkomt dat Sales/ER een AI Engineer-feed overspoelen.",
    location_legacy_label: "Locatie (legacy tekst)",
    location_legacy_hint:
      "Blijft bewaard indien aanwezig; gebruik liever Landen hierboven.",
  },
  Jobs: {
    filters_label: "Filters",
    filter_countries: "Land",
    filter_countries_placeholder: "Elk land",
    filter_work_mode: "Werkmodus",
    filter_work_mode_any: "Elke modus",
    filter_contract: "Contract",
    filter_contract_any: "Elk contract",
    filter_roles: "Rollen",
    filter_roles_placeholder: "Elke rol",
    filter_clear: "Filters wissen",
    filter_apply: "Toepassen",
    filter_active_count: "{count} filters",
    filter_more: "Meer filters",
    empty_filters: "Geen rollen passen bij deze filters.",
    empty_filters_hint:
      "Verruim land, modus of rollen — we tonen geen verkeerde geo om de lijst te vullen.",
    empty_filters_cta: "Filters wissen",
    why_location_match: "Locatiefit",
    why_location_match_detail: "Past bij jouw landen",
  },
};

function expectExact(
  actual: Record<string, unknown>,
  expected: Record<string, string>,
  keys: readonly string[]
) {
  for (const key of keys) {
    expect(actual[key], key).toBe(expected[key]);
  }
}

describe("Cut 3 UX strings", () => {
  it("keeps exact FirstRun / Settings / Jobs EN keys", async () => {
    const { default: en } = await import("../messages/en.json");
    expectExact(en.FirstRun, EN.FirstRun, FIRST_RUN_KEYS);
    expectExact(en.Settings, EN.Settings, SETTINGS_KEYS);
    expectExact(en.Jobs, EN.Jobs, JOBS_KEYS);
  });

  it("keeps exact FirstRun / Settings / Jobs FR keys", async () => {
    const { default: fr } = await import("../messages/fr.json");
    expectExact(fr.FirstRun, FR.FirstRun, FIRST_RUN_KEYS);
    expectExact(fr.Settings, FR.Settings, SETTINGS_KEYS);
    expectExact(fr.Jobs, FR.Jobs, JOBS_KEYS);
  });

  it("keeps exact FirstRun / Settings / Jobs NL keys", async () => {
    const { default: nl } = await import("../messages/nl.json");
    expectExact(nl.FirstRun, NL.FirstRun, FIRST_RUN_KEYS);
    expectExact(nl.Settings, NL.Settings, SETTINGS_KEYS);
    expectExact(nl.Jobs, NL.Jobs, JOBS_KEYS);
  });

  it("does not ship banned product names in Cut 3 copy", async () => {
    const { default: en } = await import("../messages/en.json");
    const { default: fr } = await import("../messages/fr.json");
    const { default: nl } = await import("../messages/nl.json");
    const namespaces: Record<string, unknown>[][] = [
      [en.FirstRun, en.Settings, en.Jobs],
      [fr.FirstRun, fr.Settings, fr.Jobs],
      [nl.FirstRun, nl.Settings, nl.Jobs],
    ];
    const keyGroups = [FIRST_RUN_KEYS, SETTINGS_KEYS, JOBS_KEYS] as const;
    const blob = namespaces
      .flatMap((ns) =>
        keyGroups.flatMap((keys, i) => keys.map((key) => String(ns[i][key] ?? "")))
      )
      .join("\n");
    expect(blob).not.toMatch(/CareerAgent|MACA|ariadne\.app/i);
  });
});
