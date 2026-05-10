"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [mode, setMode] = useState<EntryMode>("url");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    setError(null);

    if (mode === "url" && !url.trim()) {
      setError("Please enter a job URL.");
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
        <h1 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">New Mission</h1>
        <p className="text-[13px] text-[#999] mt-0.5">
          Start a new job application pipeline.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "url" as EntryMode, label: "Direct URL", desc: "Paste a job posting link", icon: Link2 },
          { value: "explore" as EntryMode, label: "Explore", desc: "Let agents find offers", icon: Search },
        ].map((item) => {
          const isSelected = mode === item.value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[#1a1a1a] bg-white shadow-sm ring-1 ring-[#1a1a1a]/5"
                  : "border-[#EBEBEB] bg-white hover:border-[#ccc]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors ${
                  isSelected ? "bg-[#1a1a1a] text-white" : "bg-[#F5F5F5] text-[#999]"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-[#1a1a1a]">{item.label}</h3>
                  <p className="text-[12px] text-[#999] mt-0.5">{item.desc}</p>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-5 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* URL input */}
      {mode === "url" && (
        <div className="rounded-xl border border-[#EBEBEB] bg-white p-5 space-y-3">
          <Label htmlFor="url" className="text-[12px] font-medium text-[#666]">
            Job Posting URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ccc]" />
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/job-posting"
              className="h-10 rounded-lg font-mono text-[13px] border-[#EBEBEB] focus-visible:ring-[#1a1a1a] bg-[#FAFAFA] pl-10 pr-4"
            />
          </div>
        </div>
      )}

      {mode === "explore" && (
        <div className="rounded-xl border border-[#EBEBEB] bg-[#FFFBEB]/50 p-4 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <div>
            <p className="text-[13px] text-[#666] leading-relaxed">
              The system will use your profile data to actively find matching offers.
              Make sure your{" "}
              <Link
                href="/profile"
                className="text-[#1a1a1a] font-medium underline underline-offset-2 decoration-[#ddd] hover:decoration-[#1a1a1a] transition-colors"
              >
                profile
              </Link>{" "}
              is up to date before starting.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <Button
        onClick={handleStart}
        disabled={loading}
        className="rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] h-10 px-6 text-[13px] font-medium flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        {loading ? "Starting..." : "Start Pipeline"}
        {!loading && <ArrowRight className="h-3.5 w-3.5 ml-0.5" />}
      </Button>
    </div>
  );
}
