"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  getApplication,
  reviewApplication,
  updateApplicationStatus,
} from "@/lib/api";
import type { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function ApplicationDetailPage() {
  const t = useTranslations("Applications");
  const params = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [letter, setLetter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const row = await getApplication(params.applicationId);
        setApp(row);
        setLetter(
          row.packet?.final_letter ||
            row.packet?.best_draft ||
            row.packet?.draft_letter ||
            ""
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error_generic"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.applicationId, t]);

  const onApprove = async () => {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await reviewApplication(app.id, {
        edited_letter: letter,
        approved: true,
      });
      setApp(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setSaving(false);
    }
  };

  const onRewrite = async () => {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await reviewApplication(app.id, {
        edited_letter: letter,
        approved: false,
        user_feedback: feedback,
      });
      setApp(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setSaving(false);
    }
  };

  const onSubmitted = async () => {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await updateApplicationStatus(app.id, "submitted");
      setApp(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#999]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!app) {
    return <p className="text-[13px] text-[#999]">{error || t("error_generic")}</p>;
  }

  const applyUrl = app.posting?.apply_url;
  const generating = app.status === "generating";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/applications" className="text-[12px] text-[#888] hover:underline">
          ← {t("title")}
        </Link>
        <h1 className="text-[22px] font-semibold mt-2">
          {app.posting?.title || "Application"}
        </h1>
        <p className="text-[13px] text-[#888]">{app.posting?.company_name}</p>
        <p className="text-[12px] mt-1">{t("status")}: {app.status}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </div>
      )}

      {generating && (
        <p className="text-[13px] text-[#888] flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("generating")}
        </p>
      )}

      <textarea
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
        rows={16}
        className="w-full rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-4 text-[14px] leading-relaxed"
      />

      {app.status === "packet_ready" && (
        <div className="space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("feedback_placeholder")}
            rows={3}
            className="w-full rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-3 text-[13px]"
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
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[13px] font-medium"
          >
            {t("open_ats")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <Button
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(letter)}
        >
          {t("copy_letter")}
        </Button>
        {app.status === "approved" && (
          <Button disabled={saving} onClick={() => void onSubmitted()}>
            {t("mark_submitted")}
          </Button>
        )}
      </div>
    </div>
  );
}
