"use client";

import type { GapReport } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, BarChart3 } from "lucide-react";

export function GapReportCard({ report }: { report: GapReport }) {
  const colorClass =
    report.match_score >= 80
      ? "text-emerald-400"
      : report.match_score >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-4.5 w-4.5 text-primary" />
            <CardTitle className="text-base">Gap Analysis</CardTitle>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${colorClass}`}>
            {report.match_score}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {report.summary}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Matching Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.matching_skills?.length > 0 ? (
                report.matching_skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs whitespace-normal text-left h-auto py-1">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">None identified</span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              Missing Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.missing_skills?.length > 0 ? (
                report.missing_skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs whitespace-normal text-left h-auto py-1">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">None identified</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
