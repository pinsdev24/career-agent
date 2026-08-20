"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { startPipeline } from "@/lib/api";
import { formatUnknownError } from "@/lib/api-base";
import type { EntryMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import {
  Link2,
  Search,
  Rocket,
  Loader2,
  Globe,
  ArrowRight,
  Check,
  Briefcase,
} from "lucide-react";

export default function NewPipelinePage() {
  const t = useTranslations("NewMission");
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<EntryMode>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const prefill = searchParams.get("url");
    if (prefill) {
      setUrl(prefill);
      setMode("url");
    }
  }, [searchParams]);

  const handleStart = async () => {
    setError(null);
    if (mode === "url" && !url.trim()) {
      setError(t("error_url"));
      return;
    }
    setLoading(true);
    try {
      const result = await startPipeline(
        mode,
        mode === "url" ? url.trim() : undefined
      );
      router.push(`/pipeline/${result.id}`);
    } catch (err: unknown) {
      setError(formatUnknownError(err, t("start_failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Link
        href="/jobs"
        className="flex items-start gap-4 rounded-2xl border border-[#1a1a1a] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-0.5 dark:border-white dark:bg-[#111]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1a] text-white dark:bg-white dark:text-[#111]">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">{t("browse.label")}</h2>
            <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#666] dark:bg-[#222] dark:text-[#aaa]">
              {t("recommended")}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#666] dark:text-[#aaa]">
            {t("browse.desc")}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#bbb]" />
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {
            value: "url" as EntryMode,
            label: t("modes.url.label"),
            desc: t("modes.url.desc"),
            icon: Link2,
          },
          {
            value: "explore" as EntryMode,
            label: t("modes.explore.label"),
            desc: t("modes.explore.desc"),
            icon: Search,
          },
        ].map((item) => {
          const isSelected = mode === item.value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`relative rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-[#1a1a1a] bg-white ring-1 ring-[#1a1a1a]/10 dark:border-white dark:bg-[#161616]"
                  : "border-[#EBEBEB] bg-white hover:border-[#ccc] dark:border-[#333] dark:bg-[#111]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-[#1a1a1a] text-white dark:bg-white dark:text-black"
                      : "bg-[#F5F5F5] text-[#888] dark:bg-[#222]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-medium">{item.label}</h3>
                  <p className="mt-0.5 text-[12px] text-[#888]">{item.desc}</p>
                </div>
              </div>
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a1a1a] dark:bg-white">
                  <Check className="h-3 w-3 text-white dark:text-black" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {mode === "url" && (
        <div className="space-y-3 rounded-2xl border border-[#EBEBEB] bg-white p-5 dark:border-[#333] dark:bg-[#111]">
          <label htmlFor="url" className="text-[12px] font-medium text-[#666]">
            {t("url_label")}
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ccc]" />
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("url_placeholder")}
              className="h-11 rounded-xl bg-[#FAFAFA] pl-10 font-mono text-[13px] dark:bg-[#0d0d0d]"
            />
          </div>
        </div>
      )}

      {mode === "explore" && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-4 text-[13px] leading-relaxed text-[#666] dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-[#bbb]">
          {t("explore_info")}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <Button
        onClick={handleStart}
        disabled={loading}
        className="h-11 rounded-xl px-6 text-[13px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        {loading ? t("starting") : t("start_btn")}
        {!loading && <ArrowRight className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
