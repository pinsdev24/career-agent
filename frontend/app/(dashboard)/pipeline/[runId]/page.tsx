"use client";

import { useEffect, useState, use } from "react";
import Image from 'next/image'
import { useRouter } from "next/navigation";
import { getPipelineRun, selectOffer, reviewLetter, cancelPipeline, markApplied, deletePipeline } from "@/lib/api";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Mail,
  FileText,
  Trash2,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";

export default function PipelineRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const router = useRouter();
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSeenCompletion, setHasSeenCompletion] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePipeline(runId);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete run");
      setIsDeleting(false);
    }
  };

  const handleMarkApplied = async () => {
    setIsApplying(true);
    try {
      await markApplied(runId);
      setIsApplied(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as applied");
    } finally {
      setIsApplying(false);
    }
  };

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
        <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-[13px] text-red-600">
        {error || "Pipeline run not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#EBEBEB] hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#999]" />
          </Link>
          <div>
            <h1 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">
              {run.selected_offer?.title || "Active Pipeline"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {run.selected_offer?.company && (
                <span className="text-[12px] text-[#999]">{run.selected_offer.company}</span>
              )}
              <span className="text-[11px] font-mono text-[#ccc] bg-[#F5F5F5] px-1.5 py-0.5 rounded">
                {run.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-medium",
            run.status === 'completed' ? "bg-emerald-50 text-emerald-700" :
              run.status === 'failed' ? "bg-red-50 text-red-600" :
                "bg-[#F5F5F5] text-[#666]"
          )}>
            {PIPELINE_STATUS_LABELS[run.status]}
          </div>

          {/* Actions */}
          <AlertDialog>
            <AlertDialogTrigger
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#EBEBEB] hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-[#999]"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px]">Delete this run?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px]">
                  This will permanently delete all data associated with this pipeline run. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg h-9 text-[13px]">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-lg bg-red-500 hover:bg-red-600 text-white h-9 text-[13px]"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Progress */}
      <PipelineProgress currentStatus={run.status} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* HITL-1: Offer Selection */}
      {run.status === "waiting_offer_selection" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a1a1a]">
                {run.discovered_offers?.length === 0 ? "No Offers Found" : "Select an Offer"}
              </h2>
              <p className="text-[13px] text-[#999] mt-0.5">
                {run.discovered_offers?.length === 0
                  ? "No matching roles were found. Try adjusting your profile preferences."
                  : "Choose the most relevant opportunity to continue."}
              </p>
            </div>
          </div>

          {run.discovered_offers?.length === 0 ? (
            <div className="flex justify-start pt-2">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg h-9 text-[13px] text-red-500 border-red-200 hover:bg-red-50 gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Mission
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {run.discovered_offers?.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    selected={selectedOfferId === offer.id}
                    onClick={() => setSelectedOfferId(offer.id)}
                  />
                ))}
              </div>

              <Button
                onClick={handleSelectOffer}
                disabled={!selectedOfferId || actionLoading}
                className="rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] h-9 px-5 text-[13px] font-medium gap-2 shadow-sm disabled:opacity-30"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {actionLoading ? "Processing..." : "Confirm Selection"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* HITL-2: Letter Review */}
      {run.status === "waiting_letter_review" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Review Draft</h2>
            <p className="text-[13px] text-[#999] mt-0.5">
              The AI critic has reviewed your letter. Finalize or request changes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#EBEBEB] overflow-hidden">
              <LetterEditor
                initialLetter={run.draft_letter || ""}
                onSubmit={handleReviewLetter}
                loading={actionLoading}
              />
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-4">
                <Tabs defaultValue="gap" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#F5F5F5] p-0.5 rounded-lg h-8">
                    <TabsTrigger value="gap" className="rounded-md text-[12px] h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">Gap</TabsTrigger>
                    <TabsTrigger value="critic" className="rounded-md text-[12px] h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">Critic</TabsTrigger>
                  </TabsList>
                  <TabsContent value="gap" className="mt-4">
                    {run.gap_report && <GapReportCard report={run.gap_report} />}
                  </TabsContent>
                  <TabsContent value="critic" className="mt-4">
                    {run.critic_score && <CriticScoresCard score={run.critic_score} />}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed */}
      {run.status === "completed" && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {!hasSeenCompletion && (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-emerald-700 text-[13px] font-medium">Your cover letter is ready to send.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F5F5F5] bg-[#FAFAFA] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#999]" />
                    <span className="text-[13px] font-medium text-[#1a1a1a]">Final Letter</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant={isApplied ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-lg gap-1.5 h-8 px-3 text-[12px] transition-all",
                        isApplied
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                          : "border-[#EBEBEB] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      )}
                      onClick={handleMarkApplied}
                      disabled={isApplied || isApplying}
                    >
                      {isApplying ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isApplied ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Rocket className="h-3 w-3" />
                      )}
                      {isApplied ? "Applied!" : "I Applied"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-lg border-[#EBEBEB] gap-1.5 h-8 px-3 text-[12px] hover:bg-[#F5F5F5]"
                        )}
                      >
                        <Mail className="h-3 w-3" />
                        Send
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-lg p-1">
                        <DropdownMenuItem onClick={() => handleOpenEmail("gmail")} className="rounded-md cursor-pointer text-[13px] py-1.5">
                          <Image src="/google-gmail.svg" alt="Gmail" width={14} height={14} className="mr-2" />
                          Gmail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("outlook")} className="rounded-md cursor-pointer text-[13px] py-1.5">
                          <Image src="/ms-outlook.svg" alt="Outlook" width={14} height={14} className="mr-2" />
                          Outlook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("default")} className="rounded-md cursor-pointer text-[13px] py-1.5">
                          <Mail className="h-3.5 w-3.5 mr-2 text-[#999]" />
                          Default App
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-[#EBEBEB] gap-1.5 h-8 px-3 text-[12px] hover:bg-[#F5F5F5]"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="p-6 whitespace-pre-wrap text-[14px] leading-relaxed text-[#1a1a1a] font-[system-ui] selection:bg-blue-100">
                  {run.final_letter}
                </div>
              </div>

              {run.selected_offer && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider px-1">Target Role</h3>
                  <OfferCard offer={run.selected_offer} />
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-4">
                <Tabs defaultValue="critic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#F5F5F5] p-0.5 rounded-lg h-8">
                    <TabsTrigger value="critic" className="rounded-md text-[12px] h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">Critic</TabsTrigger>
                    <TabsTrigger value="gap" className="rounded-md text-[12px] h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">Gap</TabsTrigger>
                  </TabsList>
                  <TabsContent value="critic" className="mt-4">
                    {run.critic_score && <CriticScoresCard score={run.critic_score} />}
                  </TabsContent>
                  <TabsContent value="gap" className="mt-4">
                    {run.gap_report && <GapReportCard report={run.gap_report} />}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {run.status === "failed" && (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-3xl">
          <div className="bg-red-50 rounded-xl border border-red-100 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-white border border-red-200 flex items-center justify-center shrink-0">
              <span className="text-base">⚠️</span>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-red-700 mb-0.5">Pipeline Failed</h2>
              <p className="text-[13px] text-red-600/70">An error occurred during processing.</p>
            </div>
          </div>

          {run.error_details && (
            <div className="rounded-xl border border-[#EBEBEB] bg-white p-4">
              <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-3">Error Details</h3>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[#1a1a1a] overflow-x-auto p-4 bg-[#FAFAFA] rounded-lg border border-[#EBEBEB]">
                {JSON.stringify(run.error_details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Processing States */}
      {["started", "scouting", "matching", "writing", "critiquing"].includes(run.status) && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg">
            <LiveAgentLog runId={runId} />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 px-4 text-[12px] text-[#999] border-[#EBEBEB] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
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
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Abort
          </Button>
        </div>
      )}
    </div>
  );
}
