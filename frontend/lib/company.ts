const ATS_HOST_HINTS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workable.com",
  "myworkdayjobs.com",
  "smartrecruiters.com",
  "icims.com",
  "jobvite.com",
  "boards.eu.greenhouse.io",
];

function isAtsHost(host: string): boolean {
  return ATS_HOST_HINTS.some((hint) => host === hint || host.endsWith(`.${hint}`));
}

export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function inferCompanyDomain(opts: {
  companyName?: string | null;
  companySlug?: string | null;
  applyUrl?: string | null;
}): string | null {
  const slug = (opts.companySlug || "").trim().toLowerCase();
  if (slug.includes(".")) return slug.replace(/^www\./, "");

  let host = "";
  try {
    if (opts.applyUrl) host = new URL(opts.applyUrl).hostname.toLowerCase();
  } catch {
    host = "";
  }
  host = host.replace(/^www\./, "");

  if (host && !isAtsHost(host)) return host;
  if (slug) return `${slug}.com`;

  const name = (opts.companyName || "").trim().toLowerCase();
  if (!name) return null;
  const token = name.replace(/[^a-z0-9]+/g, "");
  return token ? `${token}.com` : null;
}

export function companyLogoSrc(opts: {
  companyName?: string | null;
  companySlug?: string | null;
  applyUrl?: string | null;
}): string | null {
  const domain = inferCompanyDomain(opts);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function formatRelativeTime(iso?: string | null, locale = "en"): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

export function matchTone(score?: number | null): "high" | "mid" | "low" | "none" {
  if (typeof score !== "number" || Number.isNaN(score)) return "none";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}
