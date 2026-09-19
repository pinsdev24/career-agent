"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface HitlApplyStepsProps {
  applyUrl?: string | null;
  copied: boolean;
  onCopy: () => void;
  onMarkSubmitted: () => void;
  submitted?: boolean;
  submitting?: boolean;
}

export function HitlApplySteps({
  applyUrl,
  copied,
  onCopy,
  onMarkSubmitted,
  submitted = false,
  submitting = false,
}: HitlApplyStepsProps) {
  const t = useTranslations("Applications");

  return (
    <div className="space-y-4 rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#333] dark:bg-[#111]">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[#888]">
          {t("next_steps_title")}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#666] dark:text-[#aaa]">
          {t("next_steps_hint")}
        </p>
      </div>
      <ol className="space-y-2">
        <li className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] font-semibold text-white dark:bg-white dark:text-[#1a1a1a]">
            1
          </span>
          <Button
            type="button"
            className="h-10 flex-1 justify-start rounded-xl text-[13px]"
            onClick={onCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copy_letter")}
          </Button>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-semibold text-[#666] dark:bg-[#222] dark:text-[#aaa]">
            2
          </span>
          {applyUrl ? (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-start gap-2 rounded-xl border border-[#EBEBEB] px-4 text-[13px] font-medium hover:bg-[#FAFAFA] dark:border-[#333] dark:hover:bg-[#1a1a1a]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("open_ats")}
            </a>
          ) : (
            <p className="text-[13px] text-[#888]">{t("no_ats_url")}</p>
          )}
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-semibold text-[#666] dark:bg-[#222] dark:text-[#aaa]">
            3
          </span>
          <Button
            type="button"
            variant={submitted ? "default" : "outline"}
            className={
              submitted
                ? "h-10 flex-1 justify-start rounded-xl bg-emerald-500 text-[13px] text-white hover:bg-emerald-600"
                : "h-10 flex-1 justify-start rounded-xl text-[13px]"
            }
            disabled={submitting || submitted}
            onClick={onMarkSubmitted}
          >
            {submitted ? <Check className="h-3.5 w-3.5" /> : null}
            {submitted ? t("status_submitted") : t("mark_submitted")}
          </Button>
        </li>
      </ol>
    </div>
  );
}
