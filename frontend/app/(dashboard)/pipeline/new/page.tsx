"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startPipeline } from "@/lib/api";
import type { EntryMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-12">
      <div className="pb-6 border-b border-[#E8E6E1]">
          <h1 className="text-6xl font-medium tracking-tighter text-[#111111]">
            New <span className="text-gray-300 font-light italic">Mission</span>
          </h1>
        <p className="text-gray-500 font-light text-lg">
          Start a new specialized job application mission.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`group rounded-[1.5rem] border p-8 text-left transition-all duration-300 ${
            mode === "url"
              ? "border-[#111111] bg-white shadow-sm ring-1 ring-[#111111]/5"
              : "border-[#E8E6E1] bg-white hover:border-[#111111]/30 hover:bg-[#F4F3F0]/50"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F3F0] border border-[#E8E6E1] mb-6 flex-shrink-0 group-hover:bg-[#111111] transition-colors">
            <Link2 className={`h-6 w-6 ${mode === "url" ? "text-[#111111] group-hover:text-white" : "text-gray-400 group-hover:text-white"}`} />
          </div>
          <h3 className="text-xl font-medium text-[#111111]">Direct URL</h3>
          <p className="text-gray-500 font-light mt-2 leading-relaxed">
            Provide a specific job posting link. Ariadne will extract requirements and engineer a bespoke cover letter.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("explore")}
          className={`group rounded-[1.5rem] border p-8 text-left transition-all duration-300 ${
            mode === "explore"
              ? "border-[#111111] bg-white shadow-sm ring-1 ring-[#111111]/5"
              : "border-[#E8E6E1] bg-white hover:border-[#111111]/30 hover:bg-[#F4F3F0]/50"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F3F0] border border-[#E8E6E1] mb-6 flex-shrink-0 group-hover:bg-[#111111] transition-colors">
            <Search className={`h-6 w-6 ${mode === "explore" ? "text-[#111111] group-hover:text-white" : "text-gray-400 group-hover:text-white"}`} />
          </div>
          <h3 className="text-xl font-medium text-[#111111]">Explore Mode</h3>
          <p className="text-gray-500 font-light mt-2 leading-relaxed">
            Let our agents scout for opportunities matching your profile structure. You choose the best fit to pursue.
          </p>
        </button>
      </div>

      {/* URL input */}
      {mode === "url" && (
        <div className="rounded-[1.5rem] border border-[#E8E6E1] bg-white p-8 max-w-4xl">
           <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4F3F0] border border-[#E8E6E1]">
                 <Globe className="h-5 w-5 text-[#111111]" />
              </div>
              <div className="mt-1">
                 <h2 className="text-xl font-medium text-[#111111]">Job Posting URL</h2>
                 <p className="text-gray-500 font-light mt-1 text-sm">Paste the exact absolute URL of the job application page.</p>
              </div>
           </div>
           
           <div className="space-y-3 pl-1">
              <Label htmlFor="url" className="text-[10px] font-bold uppercase tracking-widest text-gray-400">URL Target</Label>
              <Input
                 id="url"
                 type="url"
                 value={url}
                 onChange={(e) => setUrl(e.target.value)}
                 placeholder="https://company.com/careers/job-posting"
                 className="h-14 rounded-xl font-mono text-sm border-[#E8E6E1] focus-visible:ring-[#111111] bg-[#FDFDFC] shadow-sm px-5"
              />
           </div>
        </div>
      )}

      {mode === "explore" && (
        <div className="rounded-[1.5rem] border border-[#E8E6E1] bg-[#F4F3F0]/50 p-8 max-w-4xl">
           <div className="flex items-start gap-4">
              <Lightbulb className="h-6 w-6 mt-1 text-orange-500 shrink-0" />
              <div>
                 <h3 className="text-lg font-medium text-[#111111]">Intelligent Scouting</h3>
                 <p className="text-gray-500 font-light mt-2 leading-relaxed">
                   The system will leverage your profile DNA (title, stack, contract logic) to actively source matching offers. Ensure your <Link href="/profile" className="text-[#111111] font-medium underline underline-offset-4 decoration-gray-300 hover:decoration-[#111111] transition-colors">profile data</Link> is perfectly calibrated before deploying the pipeline.
                 </p>
              </div>
           </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-[1rem] border border-red-200 bg-red-50 p-4 text-sm text-red-600 max-w-4xl">
          <span className="shrink-0 text-lg">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="pt-4">
         <Button
           size="lg"
           onClick={handleStart}
           disabled={loading}
           className="rounded-full bg-[#111111] text-white hover:bg-black h-14 px-10 text-sm tracking-wider uppercase font-bold flex items-center gap-3 shadow-md transition-all hover:scale-[1.02]"
         >
           {loading ? (
             <Loader2 className="h-5 w-5 animate-spin" />
           ) : (
             <Rocket className="h-5 w-5" />
           )}
           {loading ? "INITIALIZING..." : "START PIPELINE"}
           {!loading && <ArrowRight className="h-5 w-5 ml-1" />}
         </Button>
      </div>
    </div>
  );
}
