"use client";

import type { CriticScore } from "@/lib/types";
import { Lightbulb } from "lucide-react";

export function CriticScoresCard({ score }: { score: CriticScore }) {
  const dimensions = [
    { label: "Relevance", value: score.relevance },
    { label: "Tone", value: score.tone },
    { label: "Structure", value: score.structure },
    { label: "Specificity", value: score.specificity },
    { label: "Persuasiveness", value: score.persuasiveness },
  ];

  const colorClass =
    score.overall >= 80
      ? "text-emerald-600"
      : score.overall >= 60
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="flex items-baseline gap-2 pb-3 border-b border-[#F5F5F5] dark:border-[#222]">
        <span className={`text-3xl font-semibold tabular-nums tracking-tight ${colorClass}`}>
          {score.overall}
        </span>
        <span className="text-[11px] text-[#999] dark:text-[#888] font-medium">/100</span>
      </div>

      {/* Dimensions */}
      <div className="space-y-2.5">
        {dimensions.map((dim) => (
          <div key={dim.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#1a1a1a] dark:text-white">{dim.label}</span>
              <span className="text-[11px] tabular-nums text-[#999] dark:text-[#888]">{dim.value}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#F5F5F5] dark:bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1a1a1a] dark:bg-[#fafafa] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${dim.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] p-3 border border-[#F5F5F5] dark:border-[#222]">
        <h4 className="text-[11px] font-semibold text-[#1a1a1a] dark:text-white mb-1.5 flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3 text-amber-500" />
          Feedback
        </h4>
        <p className="text-[12px] text-[#666] dark:text-[#aaa] leading-relaxed">
          {score.feedback}
        </p>
      </div>
    </div>
  );
}
