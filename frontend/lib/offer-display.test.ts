import { describe, expect, it } from "vitest";
import {
  cleanJobTitle,
  companyFromApplyUrl,
  displayCompany,
  evaluateLinkGate,
  evaluatePrepareGate,
  looksLikeUrlHost,
  postingToDisplay,
  sourceChip,
  whyReasons,
} from "./offer-display";
import type { JobPosting } from "./job-engine-types";

const DIRTY_TITLES: Array<[string, string, string?]> = [
  ["Senior Software Engineer | Acme", "Senior Software Engineer", "Acme"],
  ["Senior Software Engineer | Acme | LinkedIn", "Senior Software Engineer", "Acme"],
  ["Product Designer - Jobs", "Product Designer"],
  ["Product Designer – Jobs", "Product Designer"],
  ["Backend Engineer - Application - Workable", "Backend Engineer"],
  ["Application - Workable", ""],
  ["Staff Product Manager at Stripe | LinkedIn", "Staff Product Manager", "Stripe"],
  ["Software Engineer | Greenhouse", "Software Engineer"],
  ["Data Analyst | Indeed", "Data Analyst"],
  ["UX Designer – Jobs at Figma", "UX Designer"],
  ["Apply for Frontend Engineer", "Frontend Engineer"],
  ["Job Application for Account Executive at Notion", "Account Executive", "Notion"],
  ["Platform Engineer | jobs.lever.co", "Platform Engineer"],
  ["  Full-Stack Engineer  |  Company  ", "Full-Stack Engineer"],
  ["Développeur | Emplois", "Développeur"],
  ["Product Owner - Vacatures", "Product Owner"],
  ["Clean Title", "Clean Title"],
  ["Engineer (Remote) | Lever", "Engineer (Remote)"],
  ["Site Reliability Engineer | LinkedIn", "Site Reliability Engineer"],
  ["Growth Lead - Careers", "Growth Lead"],
  ["Hiring: Customer Success Manager", "Customer Success Manager"],
  ["We're hiring Product Analyst", "Product Analyst"],
  ["Application for Software Engineer - Workable", "Software Engineer"],
];

describe("cleanJobTitle", () => {
  it("strips aggregator chrome from dirty fixtures", () => {
    for (const [raw, expected, company] of DIRTY_TITLES) {
      expect(cleanJobTitle(raw, company), raw).toBe(expected);
    }
  });

  it("does not leave pipe, Jobs, or Workable chrome in the result", () => {
    const cleaned = DIRTY_TITLES.map(([raw, , company]) => cleanJobTitle(raw, company));
    for (const title of cleaned) {
      expect(title).not.toMatch(/\s\|\s/);
      expect(title).not.toMatch(/\s[-–—]\s+Jobs\b/i);
      expect(title).not.toMatch(/Application\s+[-–—]\s+Workable/i);
      expect(title).not.toMatch(/\bWorkable\b/i);
      expect(title).not.toMatch(/\bLinkedIn\b/i);
    }
  });
});

describe("displayCompany", () => {
  it("keeps a canonical company name", () => {
    expect(
      displayCompany({
        companyName: "Stripe",
        applyUrl: "https://boards.greenhouse.io/stripe/jobs/123",
      })
    ).toBe("Stripe");
  });

  it("never returns a URL host", () => {
    expect(
      displayCompany({
        companyName: "jobs.lever.co",
        companySlug: "netlify",
        applyUrl: "https://jobs.lever.co/netlify/abc-def",
      })
    ).toBe("Netlify");

    expect(
      displayCompany({
        companyName: "stripe.com",
        applyUrl: "https://boards.greenhouse.io/stripe/jobs/99",
      })
    ).toBe("Stripe");

    expect(
      displayCompany({
        companyName: "Greenhouse",
        applyUrl: "https://boards.greenhouse.io/figma/jobs/1",
      })
    ).toBe("Figma");
  });

  it("extracts ATS board slugs from apply URLs", () => {
    expect(companyFromApplyUrl("https://jobs.ashbyhq.com/ramp/uuid-here")).toBe("Ramp");
    expect(companyFromApplyUrl("https://apply.workable.com/notion/j/ABC")).toBe("Notion");
    expect(looksLikeUrlHost("jobs.lever.co")).toBe(true);
    expect(looksLikeUrlHost("Stripe")).toBe(false);
  });
});

describe("whyReasons", () => {
  it("caps reasons at 3", () => {
    expect(
      whyReasons({
        reasons: ["a", "b", "c", "d"],
      })
    ).toEqual(["a", "b", "c"]);
  });

  it("falls back to matching skills then skills", () => {
    expect(whyReasons({ matchingSkills: ["Python", "FastAPI"] })).toEqual([
      "Python",
      "FastAPI",
    ]);
    expect(whyReasons({ skills: ["SQL"] })).toEqual(["SQL"]);
    expect(whyReasons({})).toEqual([]);
  });
});

describe("link / prepare gate", () => {
  it("requires an http(s) URL", () => {
    expect(evaluateLinkGate({ applyUrl: "ftp://example.com/job" }).ok).toBe(false);
    expect(evaluateLinkGate({ applyUrl: "not-a-url" }).reason).toBe("invalid_url");
    expect(
      evaluateLinkGate({ applyUrl: "https://jobs.lever.co/acme/1" }).ok
    ).toBe(true);
  });

  it("fails closed on 404 and closed-job signals", () => {
    expect(
      evaluateLinkGate({
        applyUrl: "https://jobs.lever.co/acme/1",
        httpStatus: 404,
      }).reason
    ).toBe("not_found");
    expect(
      evaluateLinkGate({
        applyUrl: "https://jobs.lever.co/acme/1",
        descriptionText: "This position has been filled.",
      }).reason
    ).toBe("closed_job");
    expect(
      evaluateLinkGate({
        applyUrl: "https://jobs.lever.co/acme/1",
        descriptionText: "404 - Page not found",
      }).reason
    ).toBe("not_found");
  });

  it("disables Prepare unless status is active and the link gate passes", () => {
    const url = "https://boards.greenhouse.io/acme/jobs/1";
    expect(evaluatePrepareGate({ status: "expired", applyUrl: url }).allowed).toBe(false);
    expect(evaluatePrepareGate({ status: "active", applyUrl: "nope" }).allowed).toBe(false);
    expect(
      evaluatePrepareGate({
        status: "active",
        applyUrl: url,
        descriptionText: "We are hiring a senior engineer to join our team.",
      }).allowed
    ).toBe(true);
  });
});

describe("postingToDisplay", () => {
  it("maps a dirty posting onto the clean contract", () => {
    const job: JobPosting = {
      id: "1",
      source: "greenhouse",
      external_id: "99",
      company_name: "jobs.lever.co",
      company_slug: "acme",
      title: "Platform Engineer | Acme | LinkedIn",
      location: "Paris",
      remote: true,
      apply_url: "https://boards.greenhouse.io/acme/jobs/99",
      skills: ["Go", "Kubernetes", "SQL", "GraphQL"],
      status: "active",
      posted_at: null,
      score: 81,
      score_breakdown: {
        semantic: 0.8,
        skills: 0.7,
        recency: 0.4,
        source_trust: 1,
        novelty: 1,
        total: 81,
        matching_skills: ["Go", "Kubernetes"],
        reasons: ["Skills match: Go", "Direct ATS listing", "Recently posted", "extra"],
      },
    };
    const display = postingToDisplay(job);
    expect(display.title).toBe("Platform Engineer");
    expect(display.companyName).toBe("Acme");
    expect(display.companyName).not.toMatch(/\./);
    expect(display.why).toHaveLength(3);
    expect(display.source).toBe("greenhouse");
    expect(display.score).toBe(81);
  });
});

describe("sourceChip", () => {
  it("maps known ATS sources and defaults to Web", () => {
    expect(sourceChip("greenhouse")).toBe("greenhouse");
    expect(sourceChip("lever")).toBe("lever");
    expect(sourceChip("ashby")).toBe("ashby");
    expect(sourceChip("workable")).toBe("workable");
    expect(sourceChip("tavily")).toBe("web");
  });
});
