"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_STATUS_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Plus,
  Loader2,
  ArrowUpRight,
  Target,
  FileText
} from "lucide-react";

function statusColorLattice(status: string) {
  switch (status) {
    case "completed":
      return "text-[9px] uppercase font-black tracking-[0.1em] px-2.5 py-0.5 rounded-sm bg-emerald-500 text-white";
    case "failed":
      return "text-[9px] uppercase font-black tracking-[0.1em] px-2.5 py-0.5 rounded-sm bg-red-500 text-white";
    case "waiting_offer_selection":
    case "waiting_letter_review":
      return "text-[9px] uppercase font-black tracking-[0.1em] px-2.5 py-0.5 rounded-sm bg-orange-500 text-white animate-pulse";
    default:
      return "text-[9px] uppercase font-black tracking-[0.1em] px-2.5 py-0.5 rounded-sm bg-[#111111] text-white";
  }
}

function groupRunsByDate(runs: PipelineRun[]) {
  const groups: { [key: string]: PipelineRun[] } = {
    "Today": [],
    "Yesterday": [],
    "Last Week": [],
    "Archive": [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const sortedRuns = [...runs].sort((a, b) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  sortedRuns.forEach((run) => {
    if (!run.created_at) {
      groups["Archive"].push(run);
      return;
    }
    const runDate = new Date(run.created_at);
    if (runDate >= today) {
      groups["Today"].push(run);
    } else if (runDate >= yesterday) {
      groups["Yesterday"].push(run);
    } else if (runDate >= lastWeek) {
      groups["Last Week"].push(run);
    } else {
      groups["Archive"].push(run);
    }
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
    <div className="max-w-6xl mx-auto space-y-16 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-[#E8E6E1]">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-10 h-1 border-t-2 border-[#111111]" />
             <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Tactical Control</span>
          </div>
          <h1 className="text-6xl font-medium tracking-tighter text-[#111111]">
            Mission <span className="text-gray-300 font-light italic">Manifest</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl font-light">
            Real-time telemetry and management of your autonomous career procurement cycles.
          </p>
        </div>
        <Link href="/pipeline/new">
          <Button className="rounded-full bg-[#111111] text-white hover:bg-black h-16 px-10 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-black/20 transition-all hover:-translate-y-1 active:scale-95 group">
            Initialise Sequence
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-48 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#111111]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Synchronizing Data...</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-[#FDFDFC] rounded-[3rem] border border-[#E8E6E1] p-12 md:p-32 text-center relative overflow-hidden group">
            <div 
              className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-1000"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #000 1px, transparent 1px),
                  linear-gradient(to bottom, #000 1px, transparent 1px)
                `,
                backgroundSize: "2rem 2rem"
              }}
            />
            <div className="relative z-10 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-full bg-[#F4F3F0] border border-[#E8E6E1] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-1000">
                 <Rocket className="h-8 w-8 text-[#111111]" />
              </div>
              <h2 className="text-4xl font-medium text-[#111111] mb-6 tracking-tight">Zero active cycles.</h2>
              <p className="text-gray-400 font-light text-lg mb-12 leading-relaxed italic">
                Ariadne is currently idle. Deploy a specialized agent to begin your next career transition.
              </p>
              <Link href="/pipeline/new">
                 <Button className="rounded-full bg-[#111111] text-white hover:bg-black h-14 px-12 text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 mx-auto shadow-xl">
                   New Deployment <ArrowUpRight className="w-4 h-4" />
                 </Button>
              </Link>
            </div>
        </div>
      ) : (
        <div className="space-y-24">
          {groupedRuns.map(([groupName, groupRuns]) => (
            <div key={groupName} className="space-y-8">
               <div className="flex items-center gap-6">
                 <div className="h-px bg-[#E8E6E1] flex-1" />
                 <h2 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] whitespace-nowrap">
                   {groupName}
                 </h2>
                 <div className="h-px bg-[#E8E6E1] flex-1" />
               </div>

               <div className="grid grid-cols-1 gap-6">
                 {groupRuns.map((run) => (
                    <Link key={run.id} href={`/pipeline/${run.id}`} className="group block">
                       <div className="bg-white rounded-[2rem] p-8 border border-[#E8E6E1] group-hover:border-[#111111] transition-all duration-700 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                          {/* Accent bar on hover */}
                          <div className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-2 bg-[#111111] transition-all duration-500" />
                          
                          <div className="flex items-center gap-8 relative z-10">
                             <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-[#F4F3F0] border border-[#E8E6E1] group-hover:bg-[#111111] group-hover:border-[#111111] transition-all duration-500">
                                {run.entry_mode === "explore" ? (
                                  <Target className="h-6 w-6 text-[#111111] group-hover:text-white transition-colors" />
                                ) : (
                                  <FileText className="h-6 w-6 text-[#111111] group-hover:text-white transition-colors" />
                                )}
                             </div>
                             <div className="space-y-1">
                                <h3 className="text-2xl font-medium text-[#111111] tracking-tight group-hover:translate-x-1 transition-transform duration-500">
                                  {run.selected_offer?.title || run.offer_url || "Strategic Exploration"}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-gray-400 font-light">
                                   <span className="uppercase tracking-widest">{run.created_at ? new Date(run.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}</span>
                                   {run.selected_offer?.company && (
                                     <>
                                       <span className="w-1 h-1 rounded-full bg-gray-200" />
                                       <span className="text-[#111111] font-medium">{run.selected_offer.company}</span>
                                     </>
                                   )}
                                </div>
                             </div>
                          </div>

                          <div className="flex items-center gap-12 relative z-10">
                             {run.gap_report && (
                               <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-2">Alignment</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-medium tracking-tighter text-[#111111] tabular-nums">{run.gap_report.match_score}</span>
                                    <span className="text-[10px] text-gray-300 font-bold">%</span>
                                  </div>
                               </div>
                             )}
                             
                             <div className="flex flex-col items-end min-w-[120px]">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-2">Phase</span>
                                <span className={statusColorLattice(run.status)}>
                                  {PIPELINE_STATUS_LABELS[run.status]}
                                </span>
                             </div>

                             <div className="w-12 h-12 rounded-full border border-[#E8E6E1] flex items-center justify-center group-hover:bg-[#111111] group-hover:border-[#111111] transition-all duration-500 text-gray-300 group-hover:text-white group-hover:rotate-45">
                                <ArrowUpRight className="h-5 w-5" />
                             </div>
                          </div>
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
