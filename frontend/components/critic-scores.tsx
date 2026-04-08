"use client";

import type { CriticScore } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Lightbulb } from "lucide-react";

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
      ? "text-emerald-500"
      : score.overall >= 60
        ? "text-orange-500"
        : "text-red-500";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
         <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Critic Yield</span>
            <div className={`text-5xl font-medium tracking-tighter tabular-nums ${colorClass}`}>
              {score.overall}<span className="text-xl font-light text-gray-300 ml-1">/100</span>
            </div>
         </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]">{dim.label}</span>
                <span className="font-medium tabular-nums text-xs text-gray-400">{dim.value}%</span>
              </div>
              <div className="h-1 w-full bg-[#F4F3F0] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#111111] transition-all duration-1000 ease-out" 
                  style={{ width: `${dim.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[1.2rem] bg-[#F4F3F0]/50 p-6 border border-[#E8E6E1]">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#111111] mb-3 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-orange-500" />
            Strategic Feedback
          </h4>
          <p className="text-gray-500 font-light text-sm leading-relaxed">
            {score.feedback}
          </p>
        </div>
      </div>
    </div>
  );
}
