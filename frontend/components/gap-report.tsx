"use client";

import type { GapReport } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";

export function GapReportCard({ report }: { report: GapReport }) {
  const colorClass =
    report.match_score >= 80
      ? "text-emerald-600"
      : report.match_score >= 60
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-baseline gap-2 pb-3 border-b border-[#F5F5F5]">
        <span className={`text-3xl font-semibold tabular-nums tracking-tight ${colorClass}`}>
          {report.match_score}%
        </span>
        <span className="text-[11px] text-[#999] font-medium">match score</span>
      </div>

      {/* Summary */}
      <p className="text-[12px] text-[#666] leading-relaxed">
        {report.summary}
      </p>

      {/* Skills */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="h-3 w-3" />
            Matching
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {report.matching_skills?.length > 0 ? (
              report.matching_skills.map((skill) => (
                <span key={skill} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-[#999] italic">None identified</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-red-500 flex items-center gap-1.5 uppercase tracking-wider">
            <XCircle className="h-3 w-3" />
            Gaps
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {report.missing_skills?.length > 0 ? (
              report.missing_skills.map((skill) => (
                <span key={skill} className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[11px] font-medium">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-[#999] italic">No major gaps</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
