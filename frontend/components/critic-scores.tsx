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
      ? "text-emerald-400"
      : score.overall >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="h-4.5 w-4.5 text-primary" />
            <CardTitle className="text-base">AI Critic</CardTitle>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>
              {score.overall}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        <div className="space-y-3.5">
          {dimensions.map((dim) => (
            <div key={dim.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">{dim.label}</span>
                <span className="font-semibold tabular-nums text-xs">{dim.value}/100</span>
              </div>
              <Progress value={dim.value} className="h-1.5" />
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-secondary/40 p-4 border border-border/30">
          <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Feedback
          </h4>
          <div className="max-h-100 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {score.feedback}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
