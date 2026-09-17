"use client";

import { useEffect, useState, use } from "react";
import Image from 'next/image'
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPipelineRun, selectOffer, reviewLetter, cancelPipeline, markApplied, deletePipeline } from "@/lib/api";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_ACTIVE_STEPS } from "@/lib/types";
import { PipelineProgress } from "@/components/pipeline-progress";
import { OfferCard } from "@/components/offer-card";
import { LetterEditor } from "@/components/letter-editor";
import { LiveAgentLog } from "@/components/live-agent-log";
import { CompanyLogo } from "@/components/company-logo";
import { MissionInsights } from "@/components/mission-insights";
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
import {
  Loader2,
  Copy,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Mail,
  FileText,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function PipelineRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const router = useRouter();
  const t = useTranslations("MissionDetail");
  
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
        <Loader2 className="h-5 w-5 animate-spin text-[#999] dark:text-[#888]" />
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
    <div className="space-y-8 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EBEBEB] transition-colors hover:bg-[#F5F5F5] dark:border-[#333] dark:hover:bg-[#222]"
          >
            <ArrowLeft className="h-4 w-4 text-[#999]" />
          </Link>
          {run.selected_offer && (
            <CompanyLogo
              name={run.selected_offer.company_info?.name || run.selected_offer.company}
              url={run.selected_offer.url}
              size={44}
            />
          )}
          <div className="min-w-0 space-y-2">
            <div>
              <h1 className="truncate text-[20px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
                {run.selected_offer?.title || t("active_pipeline")}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[#666] dark:text-[#aaa]">
                {run.selected_offer?.company && (
                  <span>{run.selected_offer.company_info?.name || run.selected_offer.company}</span>
                )}
                {run.selected_offer?.location && (
                  <>
                    <span className="text-[#ccc]">·</span>
                    <span className="text-[#888]">{run.selected_offer.location}</span>
                  </>
                )}
              </div>
            </div>
            <PipelineProgress currentStatus={run.status} />
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EBEBEB] text-[#999] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-[#333] dark:text-[#888] dark:hover:border-red-900/30 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl max-w-md bg-white dark:bg-[#111] border-[#EBEBEB] dark:border-[#333]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px] text-[#1a1a1a] dark:text-white">{t("delete_title")}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-[#666] dark:text-[#888]">
                  {t("delete_desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg h-9 text-[13px] border-[#EBEBEB] dark:border-[#333] hover:bg-[#F5F5F5] dark:hover:bg-[#222]">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-lg bg-red-500 hover:bg-red-600 text-white h-9 text-[13px]"
                  onClick={handleDelete}
                >
                  {t("delete_btn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* HITL-1: Offer Selection */}
      {run.status === "waiting_offer_selection" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
                {run.discovered_offers?.length === 0 ? t("no_offers") : t("select_offer")}
              </h2>
              <p className="text-[13px] text-[#999] dark:text-[#888] mt-0.5">
                {run.discovered_offers?.length === 0
                  ? t("no_offers_desc")
                  : t("select_offer_desc")}
              </p>
            </div>
          </div>

          {run.discovered_offers?.length === 0 ? (
            <div className="flex justify-start pt-2">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg h-9 text-[13px] text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/30 gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t("delete_btn")}
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
                className="rounded-lg bg-[#1a1a1a] dark:bg-[#111] text-white hover:bg-[#333] h-9 px-5 text-[13px] font-medium gap-2 shadow-sm disabled:opacity-30"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {actionLoading ? t("processing") : t("confirm_selection")}
              </Button>
            </>
          )}
        </div>
      )}

      {/* HITL-2: Letter Review */}
      {run.status === "waiting_letter_review" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 items-start gap-6 duration-500 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-[#2a2a2a] dark:bg-[#111]">
            <LetterEditor
              initialLetter={run.draft_letter || ""}
              onSubmit={handleReviewLetter}
              loading={actionLoading}
              revisionCount={run.revision_count}
            />
          </div>
          <aside className="xl:sticky xl:top-6">
            <MissionInsights gap={run.gap_report} critic={run.critic_score} />
          </aside>
        </div>
      )}

      {/* Completed */}
      {run.status === "completed" && (
        <div className="animate-in fade-in space-y-6 duration-500">
          {!hasSeenCompletion && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
              <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
                {t("ready_to_send")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-[#2a2a2a] dark:bg-[#111]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F5F5F5] px-5 py-3 dark:border-[#222]">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#999]" />
                    <span className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                      {t("final_letter")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant={isApplied ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 rounded-lg px-3 text-[12px] transition-all",
                        isApplied
                          ? "border-transparent bg-emerald-500 text-white hover:bg-emerald-600"
                          : "border-[#EBEBEB] bg-transparent text-[#1a1a1a] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#333] dark:text-white dark:hover:border-emerald-900/50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
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
                      {isApplied ? t("applied") : t("i_applied")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-8 gap-1.5 rounded-lg border-[#EBEBEB] bg-transparent px-3 text-[12px] text-[#1a1a1a] hover:bg-[#F5F5F5] dark:border-[#333] dark:text-white dark:hover:bg-[#222]"
                        )}
                      >
                        <Mail className="h-3 w-3" />
                        {t("send")}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-lg p-1">
                        <DropdownMenuItem onClick={() => handleOpenEmail("gmail")} className="cursor-pointer rounded-md py-1.5 text-[13px]">
                          <Image src="/google-gmail.svg" alt="Gmail" width={14} height={14} className="mr-2" />
                          Gmail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("outlook")} className="cursor-pointer rounded-md py-1.5 text-[13px]">
                          <Image src="/ms-outlook.svg" alt="Outlook" width={14} height={14} className="mr-2" />
                          Outlook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmail("default")} className="cursor-pointer rounded-md py-1.5 text-[13px]">
                          <Mail className="mr-2 h-3.5 w-3.5 text-[#999]" />
                          Default App
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg border-[#EBEBEB] bg-transparent px-3 text-[12px] text-[#1a1a1a] hover:bg-[#F5F5F5] dark:border-[#333] dark:text-white dark:hover:bg-[#222]"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? t("copied") : t("copy")}
                    </Button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap px-6 py-6 text-[15px] leading-[1.75] text-[#1a1a1a] selection:bg-blue-100 dark:text-white sm:px-8">
                  {run.final_letter}
                </div>
              </div>

              {run.selected_offer && (
                <div className="space-y-2">
                  <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#999]">
                    {t("target_role")}
                  </h3>
                  <OfferCard offer={run.selected_offer} />
                </div>
              )}
            </div>

            <aside className="xl:sticky xl:top-6">
              <MissionInsights gap={run.gap_report} critic={run.critic_score} mode="done" />
            </aside>
          </div>
        </div>
      )}

      {/* Failed */}
      {run.status === "failed" && (
        <div className="space-y-4 animate-in fade-in duration-500 max-w-3xl">
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#111] border border-red-200 dark:border-red-900/30 flex items-center justify-center shrink-0">
              <span className="text-base">⚠️</span>
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-red-700 dark:text-red-400 mb-0.5">{t("failed_title")}</h2>
              <p className="text-[13px] text-red-600/70 dark:text-red-400/70">{t("failed_desc")}</p>
            </div>
          </div>

          {run.error_details && (
            <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-4">
              <h3 className="text-[11px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider mb-3">{t("error_details")}</h3>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[#1a1a1a] dark:text-white overflow-x-auto p-4 bg-[#FAFAFA] dark:bg-[#111] rounded-lg border border-[#EBEBEB] dark:border-[#333]">
                {JSON.stringify(run.error_details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Processing States */}
      {PIPELINE_ACTIVE_STEPS.includes(run.status) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
          <LiveAgentLog
            runId={runId}
            status={run.status}
            company={run.selected_offer?.company_info?.name || run.selected_offer?.company}
          />

          {run.selected_offer && (
            <OfferCard offer={run.selected_offer} />
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#EBEBEB] bg-transparent px-4 text-[12px] text-[#999] transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-[#333] dark:hover:border-red-900/50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
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
            {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {t("abort")}
          </Button>
        </div>
      )}
    </div>
  );
}
