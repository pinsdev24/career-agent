import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(here, "..");

const BANNED_BRAND = /CareerAgent|MACA|ariadne\.app|Labyrinth Navigator|Career Labyrinth/i;
const SEND_AS_SUBMIT = /\bStart applying\b|\bready to send\b|\bReady to send\b/i;

type Messages = {
  Metadata: Record<string, string>;
  Auth: { sidebar: { title: string; subtitle: string } };
  CookieBanner: Record<string, string>;
  MissionDetail: Record<string, unknown>;
  LetterEditor: Record<string, string>;
  Applications: Record<string, string>;
  Landing: Record<string, unknown>;
};

function flatten(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(flatten);
  }
  return [];
}

async function loadAll(): Promise<{ en: Messages; fr: Messages; nl: Messages }> {
  const { default: en } = await import("../messages/en.json");
  const { default: fr } = await import("../messages/fr.json");
  const { default: nl } = await import("../messages/nl.json");
  return { en, fr, nl };
}

describe("Landing Cut 2 — brand chrome", () => {
  it("locks exact EN/FR/NL metadata", async () => {
    const { en, fr, nl } = await loadAll();
    expect(en.Metadata).toEqual({
      meta_title: "Ariadne — ranked ATS jobs, you apply",
      meta_description:
        "Match roles from Greenhouse, Lever, Ashby, and Workable boards we can reach. Draft with review. You submit on the ATS.",
      meta_og_title: "Ariadne",
      meta_og_description: "Ranked ATS jobs, honest drafts — you apply.",
    });
    expect(fr.Metadata).toEqual({
      meta_title: "Ariadne — offres ATS classées, vous postulez",
      meta_description:
        "Des rôles depuis Greenhouse, Lever, Ashby et Workable — les boards que nous atteignons. Brouillon avec relecture. Vous envoyez sur l’ATS.",
      meta_og_title: "Ariadne",
      meta_og_description: "Offres ATS classées, brouillons honnêtes — vous postulez.",
    });
    expect(nl.Metadata).toEqual({
      meta_title: "Ariadne — gerangschikte ATS-jobs, jij solliciteert",
      meta_description:
        "Match rollen van Greenhouse, Lever, Ashby en Workable — boards die we bereiken. Draft met review. Jij dient in op de ATS.",
      meta_og_title: "Ariadne",
      meta_og_description: "Gerangschikte ATS-jobs, eerlijke drafts — jij solliciteert.",
    });
  });

  it("locks NL Auth.sidebar.subtitle and keeps cookie i18n keys in all locales", async () => {
    const { en, fr, nl } = await loadAll();
    expect(nl.Auth.sidebar.subtitle).toBe(
      "Ariadne voor duidelijkere matches, brieven op jouw toon, en review voordat je op de ATS solliciteert."
    );
    const cookieKeys = Object.keys(en.CookieBanner).sort();
    expect(Object.keys(fr.CookieBanner).sort()).toEqual(cookieKeys);
    expect(Object.keys(nl.CookieBanner).sort()).toEqual(cookieKeys);
    expect(en.CookieBanner.title).toBe("Cookie preferences");
    expect(fr.CookieBanner.title).toBe("Préférences cookies");
    expect(nl.CookieBanner.title).toBe("Cookievoorkeuren");
  });

  it("landing nav and footer import the shared Logo component", () => {
    const navbar = readFileSync(
      join(frontendRoot, "components/landing/navbar.tsx"),
      "utf8"
    );
    const landing = readFileSync(join(frontendRoot, "app/[locale]/page.tsx"), "utf8");
    const layout = readFileSync(join(frontendRoot, "app/layout.tsx"), "utf8");
    expect(navbar).toMatch(/from ["']@\/components\/logo["']/);
    expect(landing).toMatch(/from ["']@\/components\/logo["']/);
    expect(navbar).toMatch(/<Logo/);
    expect(landing).toMatch(/<Logo/);
    expect(layout).toMatch(/generateMetadata/);
    expect(layout).toMatch(/namespace: ["']Metadata["']/);
    expect(layout).not.toMatch(/Labyrinth Navigator/);
  });
});

describe("Landing Cut 3 — HITL in-app voice", () => {
  it("renames ready_to_send → ready_to_copy with HITL copy", async () => {
    const { en, fr, nl } = await loadAll();
    for (const messages of [en, fr, nl]) {
      expect(messages.MissionDetail).not.toHaveProperty("ready_to_send");
      expect(messages.MissionDetail).not.toHaveProperty("send");
      expect(messages.MissionDetail).toHaveProperty("ready_to_copy");
    }
    expect(en.MissionDetail.ready_to_copy).toBe("Your cover letter is ready to copy.");
    expect(fr.MissionDetail.ready_to_copy).toBe(
      "Votre lettre de motivation est prête à copier."
    );
    expect(nl.MissionDetail.ready_to_copy).toBe(
      "Je sollicitatiebrief is klaar om te kopiëren."
    );
  });

  it("locks hint.completed, steps.completed, LetterEditor helper/approve", async () => {
    const { en, fr, nl } = await loadAll();
    const enHint = en.MissionDetail.hint as Record<string, string>;
    const frHint = fr.MissionDetail.hint as Record<string, string>;
    const nlHint = nl.MissionDetail.hint as Record<string, string>;
    const enSteps = en.MissionDetail.steps as Record<string, string>;
    const frSteps = fr.MissionDetail.steps as Record<string, string>;
    const nlSteps = nl.MissionDetail.steps as Record<string, string>;

    expect(enHint.completed).toBe("Copy it into the employer’s form yourself");
    expect(frHint.completed).toBe(
      "Copiez-la vous-même dans le formulaire de l'employeur"
    );
    expect(nlHint.completed).toBe("Kopieer hem zelf in het formulier van de werkgever");

    expect(enSteps.completed).toBe("Copy");
    expect(frSteps.completed).toBe("Copier");
    expect(nlSteps.completed).toBe("Kopiëren");

    expect(en.LetterEditor.helper).toBe(
      "Approve when it sounds like you. Then copy it into the ATS — Ariadne never sends it."
    );
    expect(fr.LetterEditor.helper).toBe(
      "Approuvez quand ça sonne comme vous. Ensuite, copiez-la dans l’ATS — Ariadne ne l’envoie jamais."
    );
    expect(nl.LetterEditor.helper).toBe(
      "Keur goed als het als jij klinkt. Kopieer daarna naar de ATS — Ariadne verstuurt nooit."
    );
    expect(en.LetterEditor.approve).toBe("Approve letter");
    expect(fr.LetterEditor.approve).toBe("Approuver la lettre");
    expect(nl.LetterEditor.approve).toBe("Brief goedkeuren");
  });

  it("keeps Applications copy_letter / open_ats / mark_submitted as the HITL verbs", async () => {
    const { en, fr, nl } = await loadAll();
    expect(en.Applications.copy_letter).toBe("Copy letter");
    expect(en.Applications.open_ats).toBe("Open ATS");
    expect(en.Applications.mark_submitted).toBe("Mark submitted");
    expect(fr.Applications.copy_letter).toBe("Copier la lettre");
    expect(fr.Applications.open_ats).toBe("Ouvrir l'ATS");
    expect(fr.Applications.mark_submitted).toBe("Marquer comme postulé");
    expect(nl.Applications.copy_letter).toBe("Brief kopiëren");
    expect(nl.Applications.open_ats).toBe("ATS openen");
    expect(nl.Applications.mark_submitted).toBe("Markeren als ingediend");
  });

  it("MissionDetail completed chrome uses Copy letter, not Send", () => {
    const pipeline = readFileSync(
      join(frontendRoot, "app/(dashboard)/pipeline/[runId]/page.tsx"),
      "utf8"
    );
    const hitl = readFileSync(
      join(frontendRoot, "components/hitl-apply-steps.tsx"),
      "utf8"
    );
    expect(pipeline).toMatch(/ready_to_copy/);
    expect(pipeline).not.toMatch(/ready_to_send/);
    expect(pipeline).not.toMatch(/t\("send"\)/);
    expect(pipeline).toMatch(/HitlApplySteps/);
    expect(pipeline).toMatch(/copy_letter/);
    expect(hitl).toMatch(/copy_letter/);
    expect(hitl).toMatch(/open_ats/);
    expect(hitl).toMatch(/mark_submitted/);
    expect(hitl).not.toMatch(/["']send["']/);
  });
});

describe("Cuts 2–3 banned user-facing chrome", () => {
  it("does not ship Send-as-submit, CareerAgent, MACA, ariadne.app, or Labyrinth Navigator", async () => {
    const { en, fr, nl } = await loadAll();
    const namespaces = [
      en.Metadata,
      fr.Metadata,
      nl.Metadata,
      en.Auth,
      fr.Auth,
      nl.Auth,
      en.CookieBanner,
      fr.CookieBanner,
      nl.CookieBanner,
      en.MissionDetail,
      fr.MissionDetail,
      nl.MissionDetail,
      en.LetterEditor,
      fr.LetterEditor,
      nl.LetterEditor,
      en.Applications,
      fr.Applications,
      nl.Applications,
      en.Landing,
      fr.Landing,
      nl.Landing,
    ];
    const blob = namespaces.flatMap(flatten).join("\n");
    expect(blob).not.toMatch(BANNED_BRAND);
    expect(blob).not.toMatch(SEND_AS_SUBMIT);
    expect(blob).not.toMatch(/Labyrinth Navigator/i);
  });
});
