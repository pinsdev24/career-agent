import { describe, expect, it } from "vitest";

const ATS_NAMES = ["Greenhouse", "Lever", "Ashby", "Workable"] as const;
const BANNED_SOURCES = /LinkedIn|Indeed|Welcome to the Jungle|\bWTTJ\b/i;
const VANITY_METRICS =
  /24x|\b94%|\b91%|\b96%|\b88%|\b87%|2[.,\s]?400\+|4\.9(?:\/5)?|All operational|Tout opérationnel|Alles operationeel|Infinite interviews|Oneindig veel gesprekken/i;
const BANNED_BRAND = /CareerAgent|MACA|ariadne\.app/i;
const REMOVED_SECTIONS = ["marquee", "stats", "metrics", "testimonials"] as const;
const CTA_BAN = /start free trial|start applying|essai gratuit|start gratis trial/i;

type Messages = {
  Landing: Record<string, unknown>;
  Jobs: Record<string, unknown>;
  Auth: { sidebar: { title: string; subtitle: string } };
};

function flatten(value: unknown, path = ""): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => flatten(item, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, path ? `${path}.${key}` : key)
    );
  }
  return [];
}

function landingBlob(landing: Record<string, unknown>): string {
  return flatten(landing)
    .map((row) => row.text)
    .join("\n");
}

function scoutSourceBlob(landing: Record<string, unknown>): string {
  const scout = landing.scout as { sources: { id: string; name: string }[] };
  return scout.sources.map((source) => `${source.id} ${source.name}`).join("\n");
}

async function loadAll(): Promise<{ en: Messages; fr: Messages; nl: Messages }> {
  const { default: en } = await import("../messages/en.json");
  const { default: fr } = await import("../messages/fr.json");
  const { default: nl } = await import("../messages/nl.json");
  return { en, fr, nl };
}

describe("Landing honesty Cut 1", () => {
  it("removes vanity sections and keeps EN/FR/NL key parity", async () => {
    const { en, fr, nl } = await loadAll();
    for (const landing of [en.Landing, fr.Landing, nl.Landing]) {
      for (const key of REMOVED_SECTIONS) {
        expect(landing, key).not.toHaveProperty(key);
      }
      expect(landing.product as object).not.toHaveProperty("dashboard_url");
      expect(landing.product as object).not.toHaveProperty("review_url");
      expect(landing.scout as object).not.toHaveProperty("facts");
    }
    const enKeys = Object.keys(en.Landing).sort();
    expect(Object.keys(fr.Landing).sort()).toEqual(enKeys);
    expect(Object.keys(nl.Landing).sort()).toEqual(enKeys);
  });

  it("never claims LinkedIn, Indeed, or WTTJ as live sources", async () => {
    const { en, fr, nl } = await loadAll();
    for (const landing of [en.Landing, fr.Landing, nl.Landing]) {
      expect(scoutSourceBlob(landing)).not.toMatch(BANNED_SOURCES);
      const scout = landing.scout as { sources: { id: string; name: string }[] };
      expect(scout.sources.map((source) => source.name)).toEqual([...ATS_NAMES]);
      expect(scout.sources.map((source) => source.id)).toEqual([
        "greenhouse",
        "lever",
        "ashby",
        "workable",
      ]);
    }
  });

  it("does not ship unattributed vanity metrics or banned product names", async () => {
    const { en, fr, nl } = await loadAll();
    const blob = [en, fr, nl].map((messages) => landingBlob(messages.Landing)).join("\n");
    expect(blob).not.toMatch(VANITY_METRICS);
    expect(blob).not.toMatch(BANNED_BRAND);
    expect(blob).not.toMatch(/ariadne\.app/i);
  });

  it("keeps primary CTAs as create-account, not apply-as-product or trial", async () => {
    const { en, fr, nl } = await loadAll();
    const groups = [
      en.Landing.nav,
      en.Landing.hero,
      en.Landing.cta,
      fr.Landing.nav,
      fr.Landing.hero,
      fr.Landing.cta,
      nl.Landing.nav,
      nl.Landing.hero,
      nl.Landing.cta,
    ] as Record<string, string>[];
    for (const group of groups) {
      for (const key of ["start", "cta_primary", "button"] as const) {
        if (key in group) {
          expect(group[key], key).not.toMatch(CTA_BAN);
          expect(group[key], key).not.toMatch(/start applying/i);
        }
      }
    }
    expect((en.Landing.nav as { start: string }).start).toBe("Create an account");
    expect((en.Landing.hero as { cta_primary: string }).cta_primary).toBe(
      "Create an account"
    );
    expect((en.Landing.cta as { button: string }).button).toBe("Create an account");
    expect((fr.Landing.nav as { start: string }).start).toBe("Créer un compte");
    expect((nl.Landing.nav as { start: string }).start).toBe("Account aanmaken");
  });

  it("locks the exact EN UX pack strings", async () => {
    const { en } = await loadAll();
    const landing = en.Landing as {
      hero: Record<string, unknown>;
      features: { items: { title: string; desc: string }[] };
      how_it_works: { title_muted: string; steps: { title: string; desc: string }[] };
      product: Record<string, string> & { insights: { k: string; v: string }[] };
      scout: Record<string, string>;
      security: { subtitle: string; items: { title: string; desc: string }[] };
      control: { subtitle: string };
      faq: { items: { q: string; a: string }[] };
      cta: Record<string, string>;
      footer: Record<string, string>;
    };
    expect(landing.hero).toMatchObject({
      eyebrow: "Career matching with you in the loop",
      title_line1: "Ranked roles.",
      title_prefix: "Then",
      title_words: ["match", "draft", "review", "apply"],
      subtitle:
        "Ariadne ranks ATS jobs against your CV, drafts a letter that sounds like you, and you submit on the employer’s site — we never apply for you.",
      cta_primary: "Create an account",
      cta_secondary: "See how it works",
    });
    expect(landing.features.items[1]).toEqual({
      n: "02",
      title: "Sounds like you",
      desc: "The writer learns from your reviews. After a couple of letters, drafts get closer to your voice.",
    });
    expect(landing.features.items[3].desc).toBe(
      "Ranked roles from Greenhouse, Lever, Ashby, and Workable boards we can reach. Paste a URL when a board isn’t in the feed yet."
    );
    expect(landing.how_it_works.title_muted).toBe("You stay in control.");
    expect(landing.how_it_works.steps.map((step) => step.title)).toEqual([
      "Upload your CV",
      "Pick a ranked role",
      "Review, then apply on the ATS",
    ]);
    expect(landing.how_it_works.steps[2].desc).toBe(
      "Approve the letter, copy it, open the posting, and submit yourself."
    );
    expect(landing.product.dashboard_label).toBe("Jobs");
    expect(landing.product.review_label).toBe("Applications");
    expect(landing.product.insights[2]).toEqual({
      k: "Control",
      v: "Nothing is sent for you. You apply on the employer’s site.",
    });
    expect(landing.scout.subtitle).toBe(
      "The Jobs feed ranks roles from Greenhouse, Lever, Ashby, and Workable — not LinkedIn, Indeed, or a full-market scrape. Paste a supported URL to follow a new board."
    );
    expect(landing.scout.stat_sources_value).toBe("4");
    expect(landing.security.items[2]).toEqual({
      title: "You apply yourself",
      desc: "Ariadne never submits on your behalf. Human-in-the-loop is the default.",
    });
    expect(landing.cta).toMatchObject({
      title: "Ready to browse roles that fit?",
      button: "Create an account",
      secondary: "Go to Home",
      footer: "You always submit yourself",
    });
    expect(landing.footer.tagline).toBe("Ranked ATS jobs, honest drafts, you apply.");
    expect(landing.footer.product_explore).toBe("Paste a job URL");
    expect(en.Auth.sidebar.subtitle).toBe(
      "Join Ariadne for clearer matches, tailored letters, and review before you apply on the ATS."
    );
  });

  it("FAQ says we do not apply and do not scrape LinkedIn/Indeed", async () => {
    const { en, fr, nl } = await loadAll();
    const faqs = [
      en.Landing.faq as { items: { q: string; a: string }[] },
      fr.Landing.faq as { items: { q: string; a: string }[] },
      nl.Landing.faq as { items: { q: string; a: string }[] },
    ];
    for (const faq of faqs) {
      expect(faq.items).toHaveLength(6);
      const blob = faq.items.map((item) => `${item.q} ${item.a}`).join("\n");
      expect(blob).toMatch(/Indeed|LinkedIn/);
      expect(blob).toMatch(/scrap/i);
      expect(blob.toLowerCase()).not.toMatch(/start free trial/);
    }
    expect(en.Landing.faq as { items: { q: string }[] }).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ q: "Do you apply for me?" }),
        expect.objectContaining({ q: "LinkedIn / Indeed?" }),
      ]),
    });
    expect((nl.Landing.faq as { items: { q: string }[] }).items[4].q).toBe(
      "Solliciteren jullie voor mij?"
    );
    expect((fr.Landing.faq as { items: { q: string }[] }).items[4].q).toBe(
      "Vous postulez à ma place ?"
    );
  });

  it("locks provided FR UX-pack deltas", async () => {
    const { fr } = await loadAll();
    const landing = fr.Landing as {
      nav: Record<string, string>;
      hero: Record<string, unknown>;
      features: { title: string; title_muted: string; items: { title: string; desc: string }[] };
      how_it_works: { title_muted: string; steps: { title: string; desc: string }[] };
      product: Record<string, string>;
      scout: Record<string, string>;
      cta: Record<string, string>;
      footer: Record<string, string>;
    };
    expect(landing.nav).toMatchObject({
      start: "Créer un compte",
      dashboard: "Aller à l’accueil",
    });
    expect(landing.hero).toMatchObject({
      eyebrow: "Matching carrière, avec vous dans la boucle",
      subtitle:
        "Ariadne classe des offres ATS selon votre CV, rédige une lettre qui vous ressemble, et c’est vous qui postulez sur le site de l’employeur — nous ne postulons jamais à votre place.",
      cta_primary: "Créer un compte",
    });
    expect(landing.features.title).toBe("Ce que vous obtenez.");
    expect(landing.features.title_muted).toBe("Rien de faux.");
    expect(landing.features.items[3]).toMatchObject({
      title: "Flux Jobs d’abord",
      desc: "Offres classées depuis Greenhouse, Lever, Ashby et Workable — les boards que nous pouvons atteindre. Collez une URL si un board manque encore.",
    });
    expect(landing.how_it_works.title_muted).toBe("Vous gardez le contrôle.");
    expect(landing.how_it_works.steps[2]).toMatchObject({
      title: "Relisez, puis postulez sur l’ATS",
      desc: "Approuvez la lettre, copiez-la, ouvrez l’offre, et envoyez vous-même.",
    });
    expect(landing.product.dashboard_label).toBe("Jobs");
    expect(landing.product.review_label).toBe("Candidatures");
    expect(landing.product.subtitle).toBe(
      "Jobs avec le pourquoi du match. Brouillons à côté des écarts. Vous voyez toujours pourquoi — et vous approuvez avant de postuler."
    );
    expect(landing.scout).toMatchObject({
      title: "Boards ATS",
      title_muted: "que nous atteignons.",
      subtitle:
        "Le flux Jobs classe des offres Greenhouse, Lever, Ashby et Workable — pas LinkedIn, Indeed, ni un balayage du web entier. Collez une URL supportée pour suivre un nouveau board.",
    });
    expect(landing.cta.button).toBe("Créer un compte");
    expect(landing.cta.footer).toBe("C’est toujours vous qui envoyez");
    expect(landing.footer.tagline).toBe(
      "Offres ATS classées, brouillons honnêtes, vous postulez."
    );
  });

  it("locks provided NL deltas and honest EN-mirrored remainder", async () => {
    const { nl } = await loadAll();
    const landing = nl.Landing as {
      nav: Record<string, string>;
      hero: Record<string, unknown>;
      scout: Record<string, string>;
      cta: Record<string, string>;
      footer: Record<string, string>;
    };
    expect(landing.nav).toMatchObject({
      start: "Account aanmaken",
      dashboard: "Naar Home",
    });
    expect(landing.hero).toMatchObject({
      eyebrow: "Career matching met jou in de loop",
      title_line1: "Gerangschikte rollen.",
      cta_primary: "Account aanmaken",
    });
    expect(landing.hero.subtitle).toBe(
      "Ariadne rangschikt ATS-jobs op je cv, schrijft een brief die als jij klinkt, en jij dient in op de site van de werkgever — wij solliciteren nooit voor jou."
    );
    expect(landing.scout.title).toBe("ATS-boards");
    expect(landing.scout.title_muted).toBe("die we bereiken.");
    expect(landing.scout.subtitle).toMatch(/niet LinkedIn, Indeed/);
    expect(landing.cta.button).toBe("Account aanmaken");
    expect(landing.footer.product_explore).toBe("Plak een job-URL");
  });

  it("does not leave English stubs in NL user-visible Landing strings", async () => {
    const { nl } = await loadAll();
    const leftover = flatten(nl.Landing).filter(({ text }) =>
      /Start applying|Start free trial|See how it works|Create an account|All operational|Go to dashboard|Missions with match/i.test(
        text
      )
    );
    expect(leftover).toEqual([]);
  });

  it("how-it-works logs stay honest (no fake match %)", async () => {
    const { en, fr, nl } = await loadAll();
    for (const landing of [en.Landing, fr.Landing, nl.Landing]) {
      const how = landing.how_it_works as { preview_logs: { text: string }[][] };
      const blob = how.preview_logs.flat().map((line) => line.text).join("\n");
      expect(blob).not.toMatch(/\d+%/);
    }
    const enLogs = (
      (en.Landing.how_it_works as { preview_logs: { text: string }[][] }).preview_logs
    )
      .flat()
      .map((line) => line.text);
    expect(enLogs).toContain("Ranking roles from synced boards");
    expect(enLogs).toContain("Paused for your review");
  });

  it("renames the dead open_in_careeragent Jobs key", async () => {
    const { en, fr, nl } = await loadAll();
    expect(en.Jobs).not.toHaveProperty("open_in_careeragent");
    expect(fr.Jobs).not.toHaveProperty("open_in_careeragent");
    expect(nl.Jobs).not.toHaveProperty("open_in_careeragent");
  });
});
