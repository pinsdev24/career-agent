"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  Bookmark,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { MatchScore } from "@/components/match-score";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  freshnessLabel,
  prepareReasonKey,
  type OfferDisplay,
  type PrepareGate,
} from "@/lib/offer-display";
import { stripHtml, cn } from "@/lib/utils";

export type JobCardVariant = "list" | "tile" | "detail" | "hitl";

type JobCardProps = {
  display: OfferDisplay;
  variant: JobCardVariant;
  selected?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  description?: string | null;
  footerNote?: ReactNode;
  prepareGate?: PrepareGate;
  prepareBusy?: boolean;
  onPrepare?: () => void;
  onSave?: () => void;
  onDismiss?: () => void;
  signalBusy?: boolean;
  actionMessage?: { kind: "ok" | "error"; text: string } | null;
};

function MetaBits({
  display,
  locale,
  showRemote,
}: {
  display: OfferDisplay;
  locale: string;
  showRemote: boolean;
}) {
  const tJobs = useTranslations("Jobs");
  const freshness = freshnessLabel(display.postedAt, locale, tJobs("date_unknown"));
  return (
    <>
      {display.location ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {display.location}
        </span>
      ) : null}
      {showRemote && display.remote ? <span>{tJobs("remote")}</span> : null}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {freshness}
      </span>
    </>
  );
}

function whyLabel(
  reason: string,
  tJobs: (key: "why_location_match" | "why_location_match_detail") => string,
  detail = false
): string {
  if (reason === "why_location_match" || reason.startsWith("Location matches")) {
    return detail ? tJobs("why_location_match_detail") : tJobs("why_location_match");
  }
  return reason;
}

function WhyChips({ reasons }: { reasons: string[] }) {
  const tJobs = useTranslations("Jobs");
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((reason) => (
        <span
          key={reason}
          className="rounded-md bg-[#F5F5F5] px-1.5 py-0.5 text-[11px] text-[#666] dark:bg-[#222] dark:text-[#aaa]"
        >
          {whyLabel(reason, tJobs)}
        </span>
      ))}
    </div>
  );
}

export function JobCard({
  display,
  variant,
  selected,
  onClick,
  href,
  className,
  description,
  footerNote,
  prepareGate,
  prepareBusy,
  onPrepare,
  onSave,
  onDismiss,
  signalBusy,
  actionMessage,
}: JobCardProps) {
  const t = useTranslations("Offer");
  const tJobs = useTranslations("Jobs");
  const locale = useLocale();
  const title = display.title || t("untitled");
  const company = display.companyName || t("unknown_company");
  const statusKey = `status_${(display.status || "unknown").toLowerCase()}`;
  const statusLabel = t.has(statusKey) ? t(statusKey) : display.status || t("status_unknown");
  const sourceLabel = tJobs(`source_${display.source}`);

  const logo = (
    <CompanyLogo
      name={company}
      slug={display.companySlug}
      url={display.applyUrl}
      size={variant === "detail" ? 48 : variant === "tile" ? 40 : 42}
    />
  );

  if (variant === "tile") {
    const body = (
      <>
        <div className="flex items-start justify-between gap-3">
          {logo}
          <MatchScore score={display.score} compact />
        </div>
        <h3 className="mt-3 line-clamp-2 text-[14px] font-semibold leading-snug">{title}</h3>
        <p className="mt-1 truncate text-[12px] text-[#777]">{company}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#888]">
          <MetaBits display={display} locale={locale} showRemote />
        </div>
      </>
    );
    const tileClass = cn(
      "rounded-2xl border border-[#EBEBEB] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:border-[#333] dark:bg-[#111]",
      className
    );
    if (href) {
      return (
        <Link href={href} className={tileClass}>
          {body}
        </Link>
      );
    }
    return (
      <div className={tileClass} onClick={onClick} role={onClick ? "button" : undefined}>
        {body}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-2xl border px-4 py-3.5 text-left transition-all",
          selected
            ? "border-[#1a1a1a] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white dark:bg-[#161616]"
            : "border-transparent bg-white hover:border-[#E4E4E4] dark:bg-[#111] dark:hover:border-[#333]",
          className
        )}
      >
        <div className="flex items-start gap-3.5">
          {logo}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold text-[#1a1a1a] dark:text-white">
                  {title}
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-[#666] dark:text-[#aaa]">{company}</p>
              </div>
              <MatchScore score={display.score} compact />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#888]">
              <MetaBits display={display} locale={locale} showRemote />
            </div>
            {display.why.length > 0 ? (
              <div className="mt-2">
                <WhyChips reasons={display.why} />
              </div>
            ) : null}
          </div>
        </div>
      </button>
    );
  }

  if (variant === "hitl") {
    return (
      <div
        className={cn(
          "group rounded-2xl border bg-white transition-all duration-200 dark:bg-[#111]",
          onClick && "cursor-pointer",
          selected
            ? "border-[#1a1a1a] ring-1 ring-[#1a1a1a]/10 dark:border-white"
            : "border-[#EBEBEB] hover:border-[#ccc] dark:border-[#333]",
          className
        )}
        onClick={onClick}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start gap-3">
                {logo}
                {selected ? (
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white dark:bg-white dark:text-black">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <h3 className="text-[14px] font-medium leading-snug text-[#1a1a1a] dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-[#888]">{company}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#999] dark:text-[#888]">
                <MetaBits display={display} locale={locale} showRemote={false} />
                {display.industry ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {display.industry}
                  </span>
                ) : null}
                {display.size ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    {display.size}
                  </span>
                ) : null}
                {display.applyUrl ? (
                  <a
                    href={display.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={tJobs("open_posting")}
                    className="inline-flex items-center gap-1 font-medium text-[#1a1a1a] underline-offset-2 hover:underline dark:text-white"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {tJobs("open_posting")} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              {display.snippet ? (
                <p className="line-clamp-2 text-[12px] leading-relaxed text-[#999] dark:text-[#888]">
                  {display.snippet}
                </p>
              ) : null}
              {display.why.length ? <WhyChips reasons={display.why} /> : null}
            </div>
            <MatchScore score={display.score} />
          </div>
        </div>
        {display.contactEmail ? (
          <div className="px-4 pb-3">
            <a
              href={`mailto:${display.contactEmail}`}
              className="font-mono text-[11px] text-[#999] transition-colors hover:text-[#1a1a1a] dark:text-white"
              onClick={(event) => event.stopPropagation()}
            >
              {display.contactEmail}
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  const descriptionText = stripHtml(description || display.descriptionText || "");
  const reasonKey = prepareGate ? prepareReasonKey(prepareGate.reason) : null;
  const prepareAllowed = prepareGate?.allowed ?? false;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-b border-[#F0F0F0] px-5 py-5 dark:border-[#222]">
        <div className="flex items-start gap-3.5">
          {logo}
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold leading-snug text-[#1a1a1a] dark:text-white">
              {title}
            </h3>
            <p className="mt-0.5 text-[13px] text-[#666] dark:text-[#aaa]">{company}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MatchScore score={display.score} />
              <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[#666] dark:bg-[#222] dark:text-[#aaa]">
                {sourceLabel}
              </span>
              {display.status ? (
                <StatusPill status={display.status} label={statusLabel} />
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#777]">
          <MetaBits display={display} locale={locale} showRemote />
          {display.salary ? (
            <span className="inline-flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" />
              {display.salary}
            </span>
          ) : null}
          {display.contractType ? <span>{display.contractType}</span> : null}
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#1a1a1a] dark:text-white">
            <Sparkles className="h-3.5 w-3.5" />
            {tJobs("why_match")}
          </div>
          {display.why.length ? (
            <ul className="list-disc space-y-1 pl-4 text-[12px] leading-snug text-[#555] dark:text-[#bbb]">
              {display.why.map((reason) => (
                <li key={reason}>{whyLabel(reason, tJobs, true)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] leading-snug text-[#888]">{tJobs("why_insufficient")}</p>
          )}
        </div>

        {descriptionText ? (
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[#555] dark:text-[#aaa]">
            {descriptionText.slice(0, 1600)}
            {descriptionText.length > 1600 ? "…" : ""}
          </p>
        ) : null}

        {actionMessage ? (
          <p
            className={`text-[12px] ${
              actionMessage.kind === "error"
                ? "text-amber-700 dark:text-amber-300"
                : "text-[#666] dark:text-[#888]"
            }`}
          >
            {actionMessage.text}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-[#F0F0F0] bg-white px-5 py-4 dark:border-[#222] dark:bg-[#111]">
        <Button
          type="button"
          className="h-10 w-full rounded-xl text-[13px]"
          disabled={prepareBusy || !prepareAllowed}
          onClick={onPrepare}
        >
          {prepareBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tJobs("prepare_packet")}
        </Button>
        {reasonKey ? (
          <p className="text-center text-[12px] text-amber-700 dark:text-amber-300">
            {tJobs(reasonKey)}
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          {display.applyUrl ? (
            <a
              href={display.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tJobs("open_posting")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#EBEBEB] text-[12px] font-medium text-[#1a1a1a] hover:bg-[#FAFAFA] dark:border-[#333] dark:text-white dark:hover:bg-[#1a1a1a]"
            >
              {tJobs("apply")}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-xl border border-[#EBEBEB] text-[12px] text-[#999]">
              {tJobs("apply")}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl text-[12px]"
            disabled={signalBusy}
            onClick={onSave}
          >
            <Bookmark className="mr-1 h-3.5 w-3.5" />
            {tJobs("save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-xl text-[12px]"
            disabled={signalBusy}
            onClick={onDismiss}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {tJobs("dismiss")}
          </Button>
        </div>
        {footerNote}
      </div>
    </div>
  );
}
