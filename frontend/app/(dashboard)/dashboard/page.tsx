"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_STATUS_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  ArrowUpRight,
  Target,
  FileText,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; pulse?: boolean }> = {
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    failed: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
    waiting_offer_selection: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", pulse: true },
    waiting_letter_review: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", pulse: true },
  };
  const fallback = { bg: "bg-[#F0F0F0]", text: "text-[#555]", dot: "bg-[#555]", pulse: true };
  const c = config[status] || fallback;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className="relative flex h-1.5 w-1.5">
        {c.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${c.dot}`} />
      </span>
      {PIPELINE_STATUS_LABELS[status as keyof typeof PIPELINE_STATUS_LABELS] || status}
    </span>
  );
}

function groupRunsByDate(runs: PipelineRun[]) {
  const groups: { [key: string]: PipelineRun[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  sortedRuns.forEach((run) => {
    if (!run.created_at) {
      groups["Earlier"].push(run);
      return;
    }
    const runDate = new Date(run.created_at);
    if (runDate >= today) groups["Today"].push(run);
    else if (runDate >= yesterday) groups["Yesterday"].push(run);
    else if (runDate >= lastWeek) groups["This Week"].push(run);
    else groups["Earlier"].push(run);
  });

  return Object.entries(groups).filter(([_, groupRuns]) => groupRuns.length > 0);
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/pipeline/runs`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setRuns(Array.isArray(data) ? data : []);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, []);

  const groupedRuns = groupRunsByDate(runs);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">Missions</h1>
          <p className="text-[13px] text-[#999] mt-0.5">
            Track and manage your application pipelines.
          </p>
        </div>
        <Link href="/pipeline/new">
          <Button className="rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] h-9 px-4 text-[13px] font-medium flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            New Mission
          </Button>
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
          <span className="text-[13px] text-[#999]">Loading missions...</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-[#EBEBEB] bg-white p-16 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
              <Rocket className="h-5 w-5 text-[#999]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a] mb-2">No missions yet</h2>
            <p className="text-[13px] text-[#999] mb-6 leading-relaxed">
              Start a new mission to deploy Ariadne's agents on your next job application.
            </p>
            <Link href="/pipeline/new">
              <Button className="rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] h-9 px-5 text-[13px] font-medium gap-2">
                <Plus className="h-4 w-4" />
                New Mission
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedRuns.map(([groupName, groupRuns]) => (
            <div key={groupName} className="space-y-1.5">
              <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider px-1 mb-2">
                {groupName}
              </h2>

              <div className="rounded-xl border border-[#EBEBEB] bg-white overflow-hidden divide-y divide-[#F5F5F5]">
                {groupRuns.map((run) => (
                  <Link key={run.id} href={`/pipeline/${run.id}`} className="group block">
                    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#FAFAFA] transition-colors duration-150">
                      {/* Icon */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${run.status === "completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : run.status === "failed"
                            ? "bg-red-50 text-red-500"
                            : "bg-[#F5F5F5] text-[#666]"
                        }`}>
                        {run.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-4 w-4" />
                        ) : run.entry_mode === "explore" ? (
                          <Target className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-medium text-[#1a1a1a] truncate group-hover:text-[#000] transition-colors">
                            {run.selected_offer?.title || run.offer_url || "Explore Mission"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {run.selected_offer?.company && (
                            <span className="text-[12px] text-[#999] truncate">
                              {run.selected_offer.company}
                            </span>
                          )}
                          {run.created_at && (
                            <>
                              {run.selected_offer?.company && <span className="text-[#ddd]">·</span>}
                              <span className="text-[12px] text-[#bbb] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(run.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      {run.gap_report && (
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <span className="text-[12px] text-[#999]">Match</span>
                          <span className={`text-[13px] font-semibold tabular-nums ${run.gap_report.match_score >= 80
                              ? "text-emerald-600"
                              : run.gap_report.match_score >= 60
                                ? "text-amber-600"
                                : "text-red-500"
                            }`}>
                            {run.gap_report.match_score}%
                          </span>
                        </div>
                      )}

                      {/* Status */}
                      <div className="shrink-0">
                        <StatusBadge status={run.status} />
                      </div>

                      {/* Arrow */}
                      <ArrowUpRight className="h-4 w-4 text-[#ddd] group-hover:text-[#999] shrink-0 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
