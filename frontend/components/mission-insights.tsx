"use client";

import { useTranslations } from "next-intl";
import type { CriticScore, GapReport } from "@/lib/types";
import { matchTone } from "@/lib/company";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lightbulb, MinusCircle } from "lucide-react";

function scoreColor(tone: ReturnType<typeof matchTone>) {
  if (tone === "high") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "mid") return "text-amber-600 dark:text-amber-400";
  if (tone === "low") return "text-red-500";
  return "text-[#1a1a1a] dark:text-white";
}

export function MissionInsights({
  gap,
  critic,
  mode = "review",
}: {
  gap?: GapReport | null;
  critic?: CriticScore | null;
  mode?: "review" | "done";
}) {
  const t = useTranslations("MissionDetail.insights");
  const tDim = useTranslations("MissionDetail.dimensions");
  const fitTone = matchTone(gap?.match_score);
  const qualityTone = matchTone(critic?.overall);

  if (!gap && !critic) return null;

  const dimensions = critic
    ? [
        { key: "relevance", value: critic.relevance },
        { key: "tone", value: critic.tone },
        { key: "structure", value: critic.structure },
        { key: "specificity", value: critic.specificity },
        { key: "persuasiveness", value: critic.persuasiveness },
      ]
    : [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#2a2a2a] dark:bg-[#111]">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#999]">
          {t(mode === "done" ? "brief_done" : "brief")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {gap && (
            <div>
              <p className={cn("text-[28px] font-semibold tabular-nums tracking-tight", scoreColor(fitTone))}>
                {Math.round(gap.match_score)}%
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#1a1a1a] dark:text-white">
                {t("fit")}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#888]">
                {t(`fit_${fitTone}`)}
              </p>
            </div>
          )}
          {critic && (
            <div>
              <p className={cn("text-[28px] font-semibold tabular-nums tracking-tight", scoreColor(qualityTone))}>
                {Math.round(critic.overall)}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-[#1a1a1a] dark:text-white">
                {t("quality")}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#888]">
                {t(`quality_${qualityTone}`)}
              </p>
            </div>
          )}
        </div>
        {gap?.summary && (
          <p className="mt-4 text-[13px] leading-relaxed text-[#555] dark:text-[#aaa]">
            {gap.summary}
          </p>
        )}
        {critic?.feedback && (
          <div className="mt-4 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-3.5 dark:border-[#222] dark:bg-[#161616]">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#1a1a1a] dark:text-white">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              {t("on_the_draft")}
            </p>
            <p className="text-[13px] leading-relaxed text-[#555] dark:text-[#aaa]">
              {critic.feedback}
            </p>
          </div>
        )}
      </section>

      {gap && (
        <section className="rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#2a2a2a] dark:bg-[#111]">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("matching")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {gap.matching_skills?.length ? (
                  gap.matching_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium leading-snug text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] italic text-[#999]">{t("none_matching")}</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#888]">
                <MinusCircle className="h-3.5 w-3.5" />
                {t("gaps")}
              </h3>
              <p className="mb-2 text-[12px] leading-relaxed text-[#888]">{t("gaps_hint")}</p>
              <div className="flex flex-wrap gap-1.5">
                {gap.missing_skills?.length ? (
                  gap.missing_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-[#F5F5F5] px-2 py-1 text-[11px] font-medium leading-snug text-[#555] dark:bg-[#1c1c1c] dark:text-[#bbb]"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] italic text-[#999]">{t("no_gaps")}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {critic && (
        <section className="rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#2a2a2a] dark:bg-[#111]">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#999]">
            {t("letter_breakdown")}
          </h3>
          <div className="space-y-2.5">
            {dimensions.map((dim) => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#1a1a1a] dark:text-white">
                    {tDim.has(dim.key) ? tDim(dim.key) : dim.key}
                  </span>
                  <span className="text-[11px] tabular-nums text-[#999]">{dim.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3F3F3] dark:bg-[#222]">
                  <div
                    className="h-full rounded-full bg-[#1a1a1a] transition-all duration-700 ease-out dark:bg-[#fafafa]"
                    style={{ width: `${Math.min(100, dim.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
