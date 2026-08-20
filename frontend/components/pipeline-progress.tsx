"use client";

import { useTranslations } from "next-intl";
import { PIPELINE_STEPS } from "@/lib/types";
import type { PipelineStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  const t = useTranslations("MissionDetail.steps");
  const tHint = useTranslations("MissionDetail.hint");

  if (currentStatus === "failed") return null;

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus as PipelineStatus);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const current = PIPELINE_STEPS[safeIndex];
  const next = PIPELINE_STEPS[safeIndex + 1];
  const label = t.has(current) ? t(current) : current;
  const hint = tHint.has(currentStatus) ? tHint(currentStatus) : "";

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={PIPELINE_STEPS.length}
      aria-valuenow={safeIndex + 1}
      aria-label={hint || label}
    >
      <div className="flex max-w-[200px] flex-1 gap-[3px]" aria-hidden>
        {PIPELINE_STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-500",
              index < safeIndex && "bg-[#1a1a1a] dark:bg-white",
              index === safeIndex && "bg-[#1a1a1a]/55 dark:bg-white/60",
              index > safeIndex && "bg-[#E6E6E6] dark:bg-[#2e2e2e]"
            )}
          />
        ))}
      </div>
      <p className="min-w-0 text-[12px] leading-snug text-[#888]">
        <span className="font-medium text-[#1a1a1a] dark:text-white">{label}</span>
        {next ? (
          <>
            <span className="mx-1.5 text-[#ccc] dark:text-[#444]">→</span>
            <span>{t.has(next) ? t(next) : next}</span>
          </>
        ) : hint ? (
          <>
            <span className="mx-1.5 text-[#ccc]">·</span>
            <span>{hint}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
