"use client";

import type { GapReport } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, BarChart3 } from "lucide-react";

export function GapReportCard({ report }: { report: GapReport }) {
  const colorClass =
    report.match_score >= 80
      ? "text-emerald-500"
      : report.match_score >= 60
        ? "text-orange-500"
        : "text-red-500";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
         <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Alignment Score</span>
            <div className={`text-5xl font-medium tracking-tighter tabular-nums ${colorClass}`}>
              {report.match_score}%
            </div>
         </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#111111] mb-2">Executive Summary</h4>
          <p className="text-gray-500 font-light text-sm leading-relaxed">
            {report.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Structural Matches
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.matching_skills?.length > 0 ? (
                report.matching_skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 font-light italic">No direct matches identified.</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" />
              Identified Deficiencies
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.missing_skills?.length > 0 ? (
                report.missing_skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[11px] font-medium">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 font-light italic">No major disqualifiers found.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
