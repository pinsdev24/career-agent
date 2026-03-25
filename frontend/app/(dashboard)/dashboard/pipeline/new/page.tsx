"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      router.push(`/dashboard/pipeline/${result.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to start pipeline"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Start a new job application pipeline
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`group rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
            mode === "url"
              ? "border-primary bg-primary/8 glow-sm shadow-sm"
              : "border-border/50 hover:border-primary/40 hover:bg-accent/20"
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 transition-colors ${
            mode === "url" ? "bg-primary/20" : "bg-secondary"
          }`}>
            <Link2 className={`h-5 w-5 ${mode === "url" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <h3 className="text-lg font-semibold">URL Mode</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Paste a specific job posting URL. We&apos;ll extract the offer and
            generate a targeted cover letter.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("explore")}
          className={`group rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
            mode === "explore"
              ? "border-primary bg-primary/8 glow-sm shadow-sm"
              : "border-border/50 hover:border-primary/40 hover:bg-accent/20"
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 transition-colors ${
            mode === "explore" ? "bg-primary/20" : "bg-secondary"
          }`}>
            <Search className={`h-5 w-5 ${mode === "explore" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <h3 className="text-lg font-semibold">Explore Mode</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            We&apos;ll search for jobs matching your profile and preferences.
            You&apos;ll choose from the results.
          </p>
        </button>
      </div>

      {/* URL input */}
      {mode === "url" && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Job Posting URL</CardTitle>
                <CardDescription>
                  Paste the full URL of the job posting you want to apply to
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://company.com/careers/job-posting"
                className="font-mono text-sm rounded-xl h-11 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "explore" && (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="py-6">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-400 shrink-0" />
              <p>
                We&apos;ll use your profile preferences (job title, location,
                contract type) to find matching offers. Make sure your{" "}
                <a
                  href="/dashboard/profile"
                  className="text-primary font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
                >
                  profile
                </a>{" "}
                is up to date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="shrink-0">⚠</span>
          {error}
        </div>
      )}

      <Button
        size="lg"
        onClick={handleStart}
        disabled={loading}
        className="w-full sm:w-auto rounded-xl gap-2 font-semibold px-8"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        {loading ? "Starting..." : "Start Pipeline"}
        {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
      </Button>
    </div>
  );
}
