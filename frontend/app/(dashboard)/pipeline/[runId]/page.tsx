"use client";

import { useEffect, useState, use } from "react";
import Image from 'next/image'
import { getPipelineRun, selectOffer, reviewLetter, cancelPipeline } from "@/lib/api";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_STATUS_LABELS } from "@/lib/types";
import { PipelineProgress } from "@/components/pipeline-progress";
import { OfferCard } from "@/components/offer-card";
import { GapReportCard } from "@/components/gap-report";
import { CriticScoresCard } from "@/components/critic-scores";
import { LetterEditor } from "@/components/letter-editor";
import { LiveAgentLog } from "@/components/live-agent-log";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Copy,
  CheckCircle2,
  ArrowRight,
  Search,
  Puzzle,
  PenTool,
  Scale,
  Rocket,
  PartyPopper,
  Mail,
  FileText,
} from "lucide-react";

const STATUS_ICONS: Record<string, React.ElementType> = {
  started: Rocket,
  scouting: Search,
  matching: Puzzle,
  writing: PenTool,
  critiquing: Scale,
};

export default function PipelineRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSeenCompletion, setHasSeenCompletion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && runId) {
      const seen = localStorage.getItem(`ariadne_seen_completed_${runId}`);
      if (seen) setHasSeenCompletion(true);
    }
  }, [runId]);

  useEffect(() => {
    if (run?.status === "completed" && !hasSeenCompletion && runId) {
      localStorage.setItem(`ariadne_seen_completed_${runId}`, "true");
    }
  }, [run?.status, hasSeenCompletion, runId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchRun = async () => {
      try {
        const data = await getPipelineRun(runId);
        setRun(data);
        setError(null);

        const stableStates = [
          "waiting_offer_selection",
          "waiting_letter_review",
          "completed",
          "failed",
        ];

        if (!stableStates.includes(data.status)) {
          interval = setTimeout(fetchRun, 3000);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load run");
      } finally {
        setLoading(false);
      }
    };

    fetchRun();

    return () => clearTimeout(interval);
  }, [runId, run?.status]);

  const handleSelectOffer = async () => {
    if (!selectedOfferId) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await selectOffer(runId, {
        selected_offer_id: selectedOfferId,
      });
      setRun(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewLetter = async (
    editedLetter: string,
    approved: boolean,
    userFeedback?: string
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await reviewLetter(runId, {
        edited_letter: editedLetter,
        approved,
        user_feedback: userFeedback,
      });
      setRun(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = async () => {
    if (run?.final_letter) {
      await navigator.clipboard.writeText(run.final_letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenEmail = (platform: "gmail" | "outlook" | "default") => {
    if (!run?.final_letter) return;

    const subject = run.selected_offer
      ? `Application for ${run.selected_offer.title} at ${run.selected_offer.company}`
      : "Job Application";

    const body = run.final_letter;
    const recipient = run.selected_offer?.contact_email || "";

    if (platform === "gmail") {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
    } else if (platform === "outlook") {
      const url = `https://outlook.office.com/mail/deeplink/compose?to=${recipient}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
    } else {
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }
  };

  if (loading && !run) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        {error || "Pipeline run not found."}
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header & Status Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E8E6E1]">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Tactical Control</span>
              <span className="text-[10px] font-mono text-[#111111] bg-[#F4F3F0] px-2 py-0.5 rounded border border-[#E8E6E1]">
                {run.id.substring(0, 8)}...
              </span>
           </div>
           <h1 className="text-4xl font-medium tracking-tight text-[#111111] mb-2">
             {run.selected_offer?.title || "Active Processing"}
           </h1>
           <p className="text-gray-500 font-light text-lg">
             {run.selected_offer?.company || "Source validation in progress..."}
           </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Phase</span>
           <div className={cn(
             "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border",
             run.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
             run.status === 'failed' ? "bg-red-50 text-red-600 border-red-100" :
             "bg-[#111111] text-white border-[#111111]"
           )}>
             {run.status === 'completed' ? 'Success' : 
              run.status === 'failed' ? 'Terminated' : 
              'Active Operation'}
           </div>
        </div>
      </div>

      {/* Progress Bar - Custom Lattice Style */}
      <div className="relative">
         <PipelineProgress currentStatus={run.status} />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-[1rem] border border-red-200 bg-red-50 p-5 text-sm text-red-600 max-w-4xl mx-auto">
          <span className="shrink-0 text-lg">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* HITL-1: Offer Selection */}
      {run.status === "waiting_offer_selection" && (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-medium text-[#111111] mb-4 tracking-tight">Select Targeted Opportunity</h2>
            <p className="text-gray-500 font-light text-lg">
              Our agents have identified these matching offers. Select the most relevant one to continue the engineering process.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {run.discovered_offers?.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                selected={selectedOfferId === offer.id}
                onClick={() => setSelectedOfferId(offer.id)}
              />
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <Button
              size="lg"
              onClick={handleSelectOffer}
              disabled={!selectedOfferId || actionLoading}
              className="rounded-full bg-[#111111] text-white hover:bg-black h-14 px-12 text-sm tracking-widest uppercase font-bold flex items-center gap-3 shadow-xl transition-all hover:scale-105 disabled:opacity-30 disabled:scale-100"
            >
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              {actionLoading ? "PROCESSING..." : "CONFIRM SELECTION"}
            </Button>
          </div>
        </div>
      )}

      {/* HITL-2: Letter Review */}
      {run.status === "waiting_letter_review" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
             <div>
                <h2 className="text-3xl font-medium text-[#111111] mb-2 tracking-tight">Review Generated Draft</h2>
                <p className="text-gray-500 font-light text-lg">The Critic Agent has validated the tone. You can now finalize or request refinements.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-white rounded-[2rem] border border-[#E8E6E1] p-1 shadow-sm">
              <LetterEditor
                initialLetter={run.draft_letter || ""}
                onSubmit={handleReviewLetter}
                loading={actionLoading}
              />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#F4F3F0]/50 rounded-[1.5rem] border border-[#E8E6E1] p-6">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 pl-1">Agent Feedback Loop</h3>
                 <Tabs defaultValue="gap" className="w-full">
                   <TabsList className="grid w-full grid-cols-2 bg-white/50 p-1 rounded-xl border border-[#E8E6E1]">
                     <TabsTrigger value="gap" className="rounded-lg data-[state=active]:bg-[#111111] data-[state=active]:text-white">Gap Analysis</TabsTrigger>
                     <TabsTrigger value="critic" className="rounded-lg data-[state=active]:bg-[#111111] data-[state=active]:text-white">AI Critic</TabsTrigger>
                   </TabsList>
                   <TabsContent value="gap" className="mt-6">
                     {run.gap_report && <GapReportCard report={run.gap_report} />}
                   </TabsContent>
                   <TabsContent value="critic" className="mt-6">
                     {run.critic_score && <CriticScoresCard score={run.critic_score} />}
                   </TabsContent>
                 </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {run.status === "completed" && (
        <div className="space-y-12 animate-in zoom-in-95 fade-in duration-1000">
          {!hasSeenCompletion ? (
            <div className="bg-[#F4F3F0] rounded-[3rem] border border-[#E8E6E1] p-12 text-center relative overflow-hidden">
               <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                     <PartyPopper className="h-8 w-8" />
                  </div>
                  <h2 className="text-4xl font-medium text-[#111111] mb-2 tracking-tight line-clamp-1">Generation Complete.</h2>
                  <p className="text-gray-500 font-light text-lg">Your engineered cover letter is ready for deployment.</p>
               </div>
               <div className="absolute top-0 right-0 p-8 opacity-20">
                  <CheckCircle2 className="w-32 h-32 text-emerald-500" />
               </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 px-8 py-4 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] animate-in fade-in duration-500">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-emerald-700 font-medium text-sm">Asset generation finalized and validated.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white rounded-[2rem] border border-[#E8E6E1] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-[#E8E6E1] bg-[#FDFDFC] flex justify-between items-center sm:flex-row flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#111111]" />
                    <span className="font-medium text-[#111111]">Final Asset</span>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-full border-[#E8E6E1] gap-2 h-9 px-4 hover:bg-[#F4F3F0]"
                        )}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Send
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                        <DropdownMenuItem onClick={() => handleOpenEmail("gmail")} className="rounded-lg cursor-pointer py-2">
                          <Image src="/google-gmail.svg" alt="Gmail" width={16} height={16} className="mr-2" />
                          Gmail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("outlook")} className="rounded-lg cursor-pointer py-2">
                          <Image src="/ms-outlook.svg" alt="Outlook" width={16} height={16} className="mr-2" />
                          Outlook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("default")} className="rounded-lg cursor-pointer py-2">
                          <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          Default App
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#E8E6E1] gap-2 h-9 px-4 hover:bg-[#F4F3F0]"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="p-10 whitespace-pre-wrap font-serif text-lg leading-relaxed text-[#111111] selection:bg-orange-100">
                  {run.final_letter}
                </div>
              </div>

              {run.selected_offer && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 pl-4">Target Role Specifications</h3>
                  <OfferCard offer={run.selected_offer} />
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[1.5rem] border border-[#E8E6E1] shadow-sm p-6 overflow-hidden">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Validation Reports</h3>
                 <Tabs defaultValue="critic" className="w-full">
                   <TabsList className="grid w-full grid-cols-2 bg-[#F4F3F0] p-1 rounded-xl">
                     <TabsTrigger value="critic" className="rounded-lg data-[state=active]:bg-[#111111] data-[state=active]:text-white">AI Critic</TabsTrigger>
                     <TabsTrigger value="gap" className="rounded-lg data-[state=active]:bg-[#111111] data-[state=active]:text-white">Gap Analysis</TabsTrigger>
                   </TabsList>
                   <TabsContent value="critic" className="mt-6">
                     {run.critic_score && <CriticScoresCard score={run.critic_score} />}
                   </TabsContent>
                   <TabsContent value="gap" className="mt-6">
                     {run.gap_report && <GapReportCard report={run.gap_report} />}
                   </TabsContent>
                 </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failed State */}
      {run.status === "failed" && (
        <div className="space-y-8 animate-in zoom-in-95 fade-in duration-500 max-w-4xl mx-auto">
          <div className="bg-red-50 rounded-[2rem] border border-red-100 p-10 flex items-center gap-6">
             <div className="w-16 h-16 rounded-2xl bg-white border border-red-200 flex items-center justify-center shrink-0">
                <span className="text-3xl">⚠️</span>
             </div>
             <div>
                <h2 className="text-2xl font-medium text-red-700 mb-1">Mission Halt Detected</h2>
                <p className="text-red-600/70 font-light">The autonomous engineering process encountered a critical error.</p>
             </div>
          </div>

          {run.error_details && (
            <div className="rounded-[1.5rem] border border-[#E8E6E1] bg-white p-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Diagnostics Log</h3>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#111111] overflow-x-auto p-6 bg-[#F4F3F0] rounded-xl border border-[#E8E6E1]">
                {JSON.stringify(run.error_details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Progressing (Loading/Processing) States */}
      {["started", "scouting", "matching", "writing", "critiquing"].includes(
        run.status
      ) && (
          <div className="flex flex-col items-center justify-center space-y-12 w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-full bg-[#111111] rounded-[2.5rem] p-4 shadow-2xl ring-1 ring-white/10 overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Loader2 className="w-64 h-64 animate-spin text-white" />
               </div>
               <div className="relative z-10">
                  <LiveAgentLog runId={runId} />
               </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-11 px-8 text-gray-400 border-[#E8E6E1] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-medium"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await cancelPipeline(runId);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "Failed to cancel pipeline");
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Abort Operation"}
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
