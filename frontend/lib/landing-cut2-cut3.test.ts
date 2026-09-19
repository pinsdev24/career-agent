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

  it("locks NL Auth.sidebar.subtitle and launch CookieBanner EN/FR/NL", async () => {
    const { en, fr, nl } = await loadAll();
    expect(nl.Auth.sidebar.subtitle).toBe(
      "Ariadne voor duidelijkere matches, brieven op jouw toon, en review voordat je op de ATS solliciteert."
    );
    expect(en.CookieBanner).toEqual({
      aria: "Cookie consent",
      title: "Cookie preferences",
      close: "Close cookie banner",
      body: "We use cookies to remember your preferences and understand how you use Ariadne. You can decline non-essential cookies.",
      learn_more: "Learn more",
      hide_details: "Hide details",
      essential: "Essential",
      essential_desc: "Required for sign-in, theme, and language.",
      performance: "Performance",
      performance_desc:
        "Helps us see which flows break so we can fix them. Not used for ads.",
      decline: "Decline",
      accept: "Accept all",
    });
    expect(fr.CookieBanner).toEqual({
      aria: "Consentement aux cookies",
      title: "Préférences cookies",
      close: "Fermer le bandeau cookies",
      body: "Nous utilisons des cookies pour mémoriser vos préférences et comprendre comment vous utilisez Ariadne. Vous pouvez refuser les cookies non essentiels.",
      learn_more: "En savoir plus",
      hide_details: "Masquer les détails",
      essential: "Essentiels",
      essential_desc: "Indispensables pour la connexion, le thème et la langue.",
      performance: "Performance",
      performance_desc:
        "Nous aide à voir quels parcours cassent pour les corriger. Pas de publicité.",
      decline: "Refuser",
      accept: "Tout accepter",
    });
    expect(nl.CookieBanner).toEqual({
      aria: "Cookie-toestemming",
      title: "Cookievoorkeuren",
      close: "Cookiebanner sluiten",
      body: "We gebruiken cookies om je voorkeuren te onthouden en te begrijpen hoe je Ariadne gebruikt. Je kunt niet-essentiële cookies weigeren.",
      learn_more: "Meer informatie",
      hide_details: "Details verbergen",
      essential: "Essentieel",
      essential_desc: "Nodig voor inloggen, thema en taal.",
      performance: "Prestaties",
      performance_desc:
        "Helpt ons te zien welke flows stukgaan zodat we ze kunnen fiksen. Niet voor ads.",
      decline: "Weigeren",
      accept: "Alles accepteren",
    });
  });

  it("landing nav and footer import the shared Logo component", () => {
    const navbar = readFileSync(
      join(frontendRoot, "components/landing/navbar.tsx"),
      "utf8"
    );
    const landing = readFileSync(join(frontendRoot, "app/[locale]/page.tsx"), "utf8");
    const sidebar = readFileSync(
      join(frontendRoot, "components/sidebar.tsx"),
      "utf8"
    );
    const layout = readFileSync(join(frontendRoot, "app/layout.tsx"), "utf8");
    expect(navbar).toMatch(/from ["']@\/components\/logo["']/);
    expect(landing).toMatch(/from ["']@\/components\/logo["']/);
    expect(sidebar).toMatch(/from ["']@\/components\/logo["']/);
    expect(navbar).toMatch(/<Logo/);
    expect(landing).toMatch(/<Logo/);
    expect(sidebar).toMatch(/<Logo/);
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
      "Votre lettre est prête à être copiée."
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
      "Copiez-la dans le formulaire de l’employeur"
    );
    expect(nlHint.completed).toBe("Kopieer hem zelf in het formulier van de werkgever");

    expect(enSteps.completed).toBe("Apply");
    expect(frSteps.completed).toBe("Postuler");
    expect(nlSteps.completed).toBe("Solliciteren");

    expect(en.LetterEditor.helper).toBe(
      "Approve when it sounds like you. Notes go to the writer — never to the employer."
    );
    expect(fr.LetterEditor.helper).toBe(
      "Approuvez quand ça vous ressemble. Les notes vont à l’écrivain — jamais à l’employeur."
    );
    expect(nl.LetterEditor.helper).toBe(
      "Keur goed als het als jij klinkt. Notities gaan naar de writer — nooit naar de werkgever."
    );
    expect(en.LetterEditor.approve).toBe("Approve letter");
    expect(fr.LetterEditor.approve).toBe("Approuver la lettre");
    expect(nl.LetterEditor.approve).toBe("Brief goedkeuren");
  });

  it("keeps Applications copy_letter / open_ats / mark_submitted as the HITL verbs", async () => {
    const { en, fr, nl } = await loadAll();
    expect(en.Applications.copy_letter).toBe("Copy letter");
    expect(en.Applications.open_ats).toBe("Open application page");
    expect(en.Applications.mark_submitted).toBe("I submitted this");
    expect(fr.Applications.copy_letter).toBe("Copier la lettre");
    expect(fr.Applications.open_ats).toBe("Ouvrir la page de candidature");
    expect(fr.Applications.mark_submitted).toBe("J’ai postulé ceci");
    expect(nl.Applications.copy_letter).toBe("Brief kopiëren");
    expect(nl.Applications.open_ats).toBe("Sollicitatiepagina openen");
    expect(nl.Applications.mark_submitted).toBe("Ik heb dit ingediend");
  });

  it("locks packet-ready email subjects", () => {
    const emailCopy = readFileSync(
      join(frontendRoot, "../backend/app/tools/email_copy.py"),
      "utf8"
    );
    expect(emailCopy).toContain('"Ariadne — your packet is ready to review"');
    expect(emailCopy).toContain('"Ariadne — votre dossier est prêt à relire"');
    expect(emailCopy).toContain('"Ariadne — je packet is klaar voor review"');
    expect(emailCopy).not.toMatch(/Career Labyrinth|CareerAgent/);
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
