import { describe, expect, it } from "vitest";

const ATS_NAMES = ["Greenhouse", "Lever", "Ashby", "Workable"] as const;
const BANNED_SOURCES = /LinkedIn|Indeed|Welcome to the Jungle|\bWTTJ\b/i;
const VANITY = /24x|\b94%|\b91%|\b96%|\b88%|\b87%|2[.,\s]?400\+|4\.9(?:\/5)?|All operational|Tout opérationnel|Alles operationeel|Infinite interviews|Oneindig veel gesprekken|Start free trial|Start applying|Essai gratuit|Start gratis trial/i;
const BANNED_BRAND = /CareerAgent|MACA|ariadne\.app/i;
const REMOVED_SECTIONS = ["marquee", "stats", "metrics", "testimonials"] as const;

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
    expect(blob).not.toMatch(VANITY);
    expect(blob).not.toMatch(BANNED_BRAND);
    expect(blob).not.toMatch(/open web|web ouvert|open web/i);
  });

  it("keeps primary CTAs as create-account, not apply-as-product", async () => {
    const { en, fr, nl } = await loadAll();
    const ctas = [
      en.Landing.nav as Record<string, string>,
      en.Landing.hero as Record<string, string>,
      en.Landing.cta as Record<string, string>,
      fr.Landing.nav as Record<string, string>,
      fr.Landing.hero as Record<string, string>,
      fr.Landing.cta as Record<string, string>,
      nl.Landing.nav as Record<string, string>,
      nl.Landing.hero as Record<string, string>,
      nl.Landing.cta as Record<string, string>,
    ];
    for (const group of ctas) {
      if ("start" in group) {
        expect(group.start).not.toMatch(/trial|start applying|commencer à postuler/i);
      }
      if ("cta_primary" in group) {
        expect(group.cta_primary).not.toMatch(/trial|start applying|appliquer/i);
      }
      if ("button" in group) {
        expect(group.button).not.toMatch(/trial|start applying/i);
      }
    }
    expect((en.Landing.nav as { start: string }).start).toBe("Create an account");
    expect((fr.Landing.nav as { start: string }).start).toBe("Créer un compte");
    expect((nl.Landing.nav as { start: string }).start).toBe("Account aanmaken");
  });

  it("FAQ says we do not apply and do not scrape Indeed/LinkedIn", async () => {
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
      expect(blob.toLowerCase()).toMatch(/premium/);
    }
    expect(en.Landing.faq as { items: { q: string }[] }).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ q: "Do you apply for me?" }),
        expect.objectContaining({ q: "Indeed / LinkedIn?" }),
      ]),
    });
    expect((nl.Landing.faq as { items: { q: string; a: string }[] }).items[4]).toEqual({
      q: "Solliciteren jullie voor mij?",
      a: "Nee. Ariadne solliciteert nooit voor jou. Jij reviewt het packet en solliciteert zelf op de ATS.",
    });
  });

  it("locks the byte-exact NL Landing pack from UX", async () => {
    const { nl } = await loadAll();
    const landing = nl.Landing as {
      nav: Record<string, string>;
      hero: Record<string, unknown>;
      features: { badge: string; title: string; title_muted: string; items: { title: string; desc: string }[] };
      how_it_works: { badge: string; title: string; title_muted: string; steps: { title: string }[] };
      product: Record<string, string>;
      scout: { badge: string; title: string; title_muted: string };
    };
    expect(landing.nav).toMatchObject({
      features: "Functies",
      how_it_works: "Zo werkt het",
      product: "Product",
      control: "Jouw controle",
      faq: "FAQ",
      sign_in: "Inloggen",
      start: "Account aanmaken",
      dashboard: "Naar Home",
    });
    expect(landing.hero).toMatchObject({
      eyebrow: "Career matching met jou in de loop",
      title_line1: "Gerangschikte rollen.",
      title_prefix: "Daarna",
      title_words: ["match", "draft", "review", "apply"],
      subtitle:
        "Ariadne rangschikt ATS-jobs op je cv, schrijft een brief die als jij klinkt, en jij solliciteert op de site van de werkgever — wij solliciteren nooit voor jou.",
      cta_primary: "Account aanmaken",
      cta_secondary: "Bekijk hoe het werkt",
    });
    expect(landing.features).toMatchObject({
      badge: "Mogelijkheden",
      title: "Wat je krijgt.",
      title_muted: "Niets nep.",
    });
    expect(landing.features.items.map((item) => item.title)).toEqual([
      "Semantische matching",
      "Klinkt als jij",
      "Human in the loop",
      "Eerst de Jobs-feed",
    ]);
    expect(landing.features.items[0].desc).toBe(
      "Vergelijk je cv met de rol op conceptniveau — geen keywordspam. Zie fit en gaps voordat je tijd investeert."
    );
    expect(landing.features.items[3].desc).toBe(
      "Gerangschikte rollen van Greenhouse, Lever, Ashby en Workable — boards die we kunnen bereiken. Plak een URL als een board nog ontbreekt."
    );
    expect(landing.how_it_works).toMatchObject({
      badge: "Proces",
      title: "Drie stappen.",
      title_muted: "Jij houdt de controle.",
    });
    expect(landing.how_it_works.steps.map((step) => step.title)).toEqual([
      "Upload je cv",
      "Kies een gerangschikte rol",
      "Review, solliciteer daarna op de ATS",
    ]);
    expect(landing.product).toMatchObject({
      badge: "Binnenin",
      title: "Het werk,",
      title_muted: "niet de pitch.",
      subtitle:
        "Jobs met why-match. Drafts naast de gaps. Jij ziet altijd waarom — en keurt altijd goed voordat je solliciteert.",
      dashboard_label: "Jobs",
      dashboard_caption: "Gerangschikte rollen in één lijst — fit, status, volgende actie.",
      dashboard_alt: "Ariadne Jobs-feed met matchredenen en prepare packet",
      review_label: "Applications",
      review_caption:
        "Brief links. Gaps rechts. Goedkeuren, herschrijven of bewerken — daarna dien jij in op de ATS.",
      review_alt: "Application-packet review met gap-analyse en goedkeuringscontrols",
    });
    expect(landing.product).not.toHaveProperty("dashboard_url");
    expect(landing.product).not.toHaveProperty("review_url");
    expect(landing.scout).toMatchObject({
      badge: "Boards",
      title: "ATS-boards",
      title_muted: "die we bereiken.",
    });
    expect(nl.Auth.sidebar.title).toBe("Ontsnap uit de sollicitatiemaze.");
    expect(nl.Auth.sidebar.subtitle).toBe(
      "Ariadne voor duidelijkere matches, brieven op jouw stem, en review voordat je op de ATS solliciteert."
    );
  });

  it("does not leave English stubs in NL user-visible Landing strings", async () => {
    const { nl } = await loadAll();
    const rows = flatten(nl.Landing);
    const allowedEnglish = /FAQ|Jobs|Applications|Greenhouse|Lever|Ashby|Workable|ATS|Human in the loop|Agent Console|Live|Match|Status|Control|Sync|Encrypted|Supabase Auth|RLS|TLS|HITL|packet|drafts?|review|writer|critic|why-match|prepare packet|Application-packet|row-level|Home|Explore|Sync/i;
    const leftover = rows.filter(({ text }) => {
      if (allowedEnglish.test(text) && text.length < 40) return false;
      return /Start applying|Start free trial|See how it works|Create an account|All operational|faster applications|Infinite interviews|Go to dashboard|Missions with match/i.test(
        text
      );
    });
    expect(leftover).toEqual([]);
  });

  it("how-it-works logs stay honest (no fake match %)", async () => {
    const { en, fr, nl } = await loadAll();
    for (const landing of [en.Landing, fr.Landing, nl.Landing]) {
      const how = landing.how_it_works as { preview_logs: { text: string }[][] };
      const blob = how.preview_logs.flat().map((line) => line.text).join("\n");
      expect(blob).not.toMatch(/\d+%/);
      expect(blob).toMatch(/review|relecture/i);
      expect(blob.toLowerCase()).toMatch(/copy|copier|kopiëren/);
    }
    const nlLogs = (
      (nl.Landing.how_it_works as { preview_logs: { text: string }[][] }).preview_logs
    )
      .flat()
      .map((line) => line.text);
    expect(nlLogs).toContain("Rollen rangschikken van gesyncte boards");
    expect(nlLogs).toContain("Gepauzeerd voor jouw review");
    expect(nlLogs).toContain("Brief klaar om te kopiëren.");
  });

  it("renames the dead open_in_careeragent Jobs key", async () => {
    const { en, fr, nl } = await loadAll();
    expect(en.Jobs).not.toHaveProperty("open_in_careeragent");
    expect(fr.Jobs).not.toHaveProperty("open_in_careeragent");
    expect(nl.Jobs).not.toHaveProperty("open_in_careeragent");
    expect(en.Jobs).toHaveProperty("url_not_in_feed");
  });
});
