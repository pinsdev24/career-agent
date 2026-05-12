"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { startPipeline } from "@/lib/api";
import type { EntryMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Link2,
  Search,
  Rocket,
  Loader2,
  Lightbulb,
  Globe,
  ArrowRight,
  Check,
} from "lucide-react";

export default function NewPipelinePage() {
  const t = useTranslations("NewMission");
  const [mode, setMode] = useState<EntryMode>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      setError(
        err instanceof Error ? err.message : "Failed to start pipeline"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white tracking-tight">{t("title")}</h1>
        <p className="text-[13px] text-[#999] dark:text-[#888] mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "url" as EntryMode, label: t("modes.url.label"), desc: t("modes.url.desc"), icon: Link2 },
          { value: "explore" as EntryMode, label: t("modes.explore.label"), desc: t("modes.explore.desc"), icon: Search },
        ].map((item) => {
          const isSelected = mode === item.value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${ isSelected ? "border-[#1a1a1a] dark:border-white bg-white dark:bg-[#222] shadow-sm ring-1 ring-[#1a1a1a]/5 dark:ring-white/10" : "border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] hover:border-[#ccc] dark:hover:border-[#555]" }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors ${ isSelected ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-black" : "bg-[#F5F5F5] dark:bg-[#222] text-[#999] dark:text-[#888]" }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">{item.label}</h3>
                  <p className="text-[12px] text-[#999] dark:text-[#888] mt-0.5">{item.desc}</p>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-5 rounded-full bg-[#1a1a1a] dark:bg-white flex items-center justify-center">
                    <Check className="h-3 w-3 text-white dark:text-black" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* URL input */}
      {mode === "url" && (
        <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-5 space-y-3">
          <Label htmlFor="url" className="text-[12px] font-medium text-[#666] dark:text-[#aaa]">
            {t("url_label")}
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("url_placeholder")}
              className="h-10 rounded-lg font-mono text-[13px] border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] bg-[#FAFAFA] dark:bg-[#111] pl-10 pr-4"
            />
          </div>
        </div>
      )}

      {mode === "explore" && (
        <div className="rounded-xl border border-[#EBEBEB] dark:border-amber-900/30 bg-[#FFFBEB]/50 dark:bg-amber-900/10 p-4 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <div>
            <p className="text-[13px] text-[#666] dark:text-[#aaa] leading-relaxed">
              {t("explore_info")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <Button
        onClick={handleStart}
        disabled={loading}
        className="rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-black hover:bg-[#333] dark:hover:bg-[#e5e5e5] h-10 px-6 text-[13px] font-medium flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        {loading ? t("starting") : t("start_btn")}
        {!loading && <ArrowRight className="h-3.5 w-3.5 ml-0.5" />}
      </Button>
    </div>
  );
}
