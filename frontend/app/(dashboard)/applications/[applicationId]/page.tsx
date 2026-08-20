"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import {
  getApplication,
  retryApplication,
  reviewApplication,
  updateApplicationStatus,
} from "@/lib/api";
import { formatUnknownError } from "@/lib/api-base";
import type { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { StatusPill } from "@/components/status-pill";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = ["generating", "packet_ready", "approved", "submitted"] as const;

export default function ApplicationDetailPage() {
  const t = useTranslations("Applications");
  const params = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [letter, setLetter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyRow = (row: Application) => {
      setApp(row);
      setLetter(
        row.packet?.final_letter ||
          row.packet?.best_draft ||
          row.packet?.draft_letter ||
          ""
      );
    };

    const load = async () => {
      try {
        const row = await getApplication(params.applicationId);
        if (!cancelled) applyRow(row);
      } catch (err) {
        if (!cancelled) setError(formatUnknownError(err, t("error_generic")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(async () => {
      try {
        const row = await getApplication(params.applicationId);
        if (cancelled) return;
        applyRow(row);
        if (row.status !== "generating") window.clearInterval(timer);
      } catch {
        // keep polling
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [params.applicationId, t]);

  const onApprove = async () => {
    if (!app) return;
    setSaving(true);
    try {
      setApp(
        await reviewApplication(app.id, { edited_letter: letter, approved: true })
      );
    } catch (err) {
      setError(formatUnknownError(err, t("error_generic")));
    } finally {
      setSaving(false);
    }
  };

  const onRewrite = async () => {
    if (!app) return;
    setSaving(true);
    try {
      setApp(
        await reviewApplication(app.id, {
          edited_letter: letter,
          approved: false,
          user_feedback: feedback,
        })
      );
    } catch (err) {
      setError(formatUnknownError(err, t("error_generic")));
    } finally {
      setSaving(false);
    }
  };

  const onSubmitted = async () => {
    if (!app) return;
    setSaving(true);
    try {
      setApp(await updateApplicationStatus(app.id, "submitted"));
    } catch (err) {
      setError(formatUnknownError(err, t("error_generic")));
    } finally {
      setSaving(false);
    }
  };

  const onRetry = async () => {
    if (!app) return;
    setSaving(true);
    setError(null);
    try {
      setApp(await retryApplication(app.id));
    } catch (err) {
      setError(formatUnknownError(err, t("error_generic")));
    } finally {
      setSaving(false);
    }
  };

  const copyLetter = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!app) {
    return (
      <p className="text-[13px] text-[#999]">{error || t("error_generic")}</p>
    );
  }

  const applyUrl = app.posting?.apply_url;
  const generating = app.status === "generating";
  const failedDetail =
    app.status === "draft" && app.error_details
      ? String(app.error_details.detail || app.error_details.error || "")
      : "";
  const statusLabel = t.has(`status_${app.status}`)
    ? t(`status_${app.status}`)
    : app.status.replaceAll("_", " ");
  const stepIndex = Math.max(
    0,
    STEPS.indexOf(
      (["generating", "packet_ready", "approved", "submitted"].includes(app.status)
        ? app.status
        : "generating") as (typeof STEPS)[number]
    )
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-[12px] text-[#888] hover:text-[#1a1a1a] dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("title")}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
        <div className="flex items-start gap-4 px-5 py-5">
          <CompanyLogo
            name={app.posting?.company_name || "Company"}
            url={applyUrl}
            size={52}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold leading-snug tracking-tight">
              {app.posting?.title || t("untitled")}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#666] dark:text-[#aaa]">
              {app.posting?.company_name}
            </p>
            <div className="mt-3">
              <StatusPill status={app.status} label={statusLabel} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-[#F0F0F0] dark:border-[#222]">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`px-3 py-2.5 text-center text-[11px] font-medium ${
                i <= stepIndex
                  ? "text-[#1a1a1a] dark:text-white"
                  : "text-[#bbb] dark:text-[#555]"
              }`}
            >
              {t(`status_${step}`)}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </div>
      )}
      {failedDetail && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {failedDetail}
        </div>
      )}

      {generating && (
        <div className="rounded-2xl border border-[#EBEBEB] bg-white px-5 py-4 dark:border-[#333] dark:bg-[#111]">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[#1a1a1a] dark:text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("generating")}
          </p>
          <p className="mt-1 text-[12px] text-[#888]">{t("generating_hint")}</p>
        </div>
      )}

      {(generating || app.status === "draft") && (
        <Button variant="outline" disabled={saving} onClick={() => void onRetry()}>
          {t("retry")}
        </Button>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
        <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-3 dark:border-[#222]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#888]">
            {t("letter")}
          </p>
          <button
            type="button"
            onClick={() => void copyLetter()}
            className="inline-flex items-center gap-1 text-[12px] text-[#888] hover:text-[#1a1a1a] dark:hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copy_letter")}
          </button>
        </div>
        {generating && !letter ? (
          <div className="space-y-2 px-5 py-5">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            rows={16}
            className="w-full resize-y bg-transparent p-5 text-[14px] leading-7 outline-none"
            placeholder={generating ? t("generating") : t("letter_placeholder")}
          />
        )}
      </div>

      {app.status === "packet_ready" && (
        <div className="space-y-3 rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#333] dark:bg-[#111]">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("feedback_placeholder")}
            rows={3}
            className="w-full rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-3 text-[13px] outline-none focus:border-[#1a1a1a] dark:border-[#333] dark:bg-[#0d0d0d]"
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => void onApprove()}>
              {t("approve")}
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => void onRewrite()}>
              {t("rewrite")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 text-[13px] font-medium text-white dark:bg-white dark:text-[#1a1a1a]"
          >
            {t("open_ats")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {app.status === "approved" && (
          <Button disabled={saving} onClick={() => void onSubmitted()}>
            {t("mark_submitted")}
          </Button>
        )}
      </div>
    </div>
  );
}
