"use client";

import { useEffect, useState, use } from "react";
import { getPipelineRun, selectOffer, reviewLetter, cancelPipeline } from "@/lib/api";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_STATUS_LABELS } from "@/lib/types";
import { PipelineProgress } from "@/components/pipeline-progress";
import { OfferCard } from "@/components/offer-card";
import { GapReportCard } from "@/components/gap-report";
import { CriticScoresCard } from "@/components/critic-scores";
import { LetterEditor } from "@/components/letter-editor";
import { Button } from "@/components/ui/button";
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
    approved: boolean
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await reviewLetter(runId, {
        edited_letter: editedLetter,
        approved,
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
    <div className="space-y-8 pb-10">
      {/* Header & Progress */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline Run</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1.5 bg-secondary/50 inline-block px-2 py-0.5 rounded-md">
            {run.id}
          </p>
        </div>

        <div className="py-4">
          <PipelineProgress currentStatus={run.status} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="shrink-0">⚠</span>
          {error}
        </div>
      )}

      {/* HITL-1: Offer Selection */}
      {run.status === "waiting_offer_selection" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Select a Job Offer</h2>
            <p className="text-muted-foreground">
              We scouted the web matching your CV profile. Choose the best
              matching offer to generate a cover letter.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {run.discovered_offers?.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                selected={selectedOfferId === offer.id}
                onClick={() => setSelectedOfferId(offer.id)}
              />
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              onClick={handleSelectOffer}
              disabled={!selectedOfferId || actionLoading}
              className="gap-2 rounded-xl font-semibold"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {actionLoading ? "Processing..." : "Continue with selected"}
            </Button>
          </div>
        </div>
      )}

      {/* HITL-2: Letter Review */}
      {run.status === "waiting_letter_review" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Review Your Letter
            </h2>
            <p className="text-muted-foreground">
              The AI has generated a draft. You can edit it manually or request
              a rewrite.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <LetterEditor
                initialLetter={run.draft_letter || ""}
                onSubmit={handleReviewLetter}
                loading={actionLoading}
              />
            </div>

            <div className="space-y-6">
              <Tabs defaultValue="gap" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gap">Gap Analysis</TabsTrigger>
                  <TabsTrigger value="critic">AI Critic</TabsTrigger>
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
      )}

      {/* Completed */}
      {run.status === "completed" && (
        <div className="space-y-8 animate-in zoom-in-95 fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
              <PartyPopper className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-400">
                Pipeline Completed
              </h2>
              <p className="text-muted-foreground">
                Your cover letter is ready!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
                <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                  <span>Final Cover Letter</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </h3>
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/85 p-5 bg-secondary/30 rounded-xl border border-border/30">
                  {run.final_letter}
                </div>
              </div>

              {run.selected_offer && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Target Role
                  </h3>
                  <OfferCard offer={run.selected_offer} />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Tabs defaultValue="critic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="critic">AI Critic</TabsTrigger>
                  <TabsTrigger value="gap">Gap Analysis</TabsTrigger>
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
      )}

      {/* Loading States */}
      {["started", "scouting", "matching", "writing", "critiquing"].includes(
        run.status
      ) && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          {(() => {
            const Icon = STATUS_ICONS[run.status] || Rocket;
            return (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 glow animate-pulse">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            );
          })()}
          <h3 className="text-xl font-semibold">
            {PIPELINE_STATUS_LABELS[run.status]}...
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            The AI agents are hard at work. This usually takes just a moment.
          </p>
          <div className="pt-6">
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await cancelPipeline(runId);
                  // The UI will update automatically on the next poll when the status changes to failed
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Failed to cancel pipeline");
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Cancel Pipeline"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
