"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PipelineRun } from "@/lib/types";
import { PIPELINE_STATUS_LABELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  UserCircle,
  Inbox,
  Search,
  Link2,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";

function statusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "failed":
      return "bg-red-500/15 text-red-400 border-red-500/25";
    case "waiting_offer_selection":
    case "waiting_letter_review":
      return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    default:
      return "bg-primary/15 text-primary border-primary/25";
  }
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/pipeline/runs`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setRuns(Array.isArray(data) ? data : []);
        }
      } catch {
        // API might not have a /runs endpoint yet — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your pipeline runs and activity
          </p>
        </div>
        <Link href="/dashboard/pipeline/new">
          <Button className="gap-2 rounded-xl font-semibold">
            <Plus className="h-4 w-4" />
            New Pipeline
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : runs.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Inbox className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl mb-2">No pipeline runs yet</CardTitle>
            <CardDescription className="text-center max-w-sm mb-8">
              Upload your CV in the Profile section, then start a new pipeline
              to find jobs and generate cover letters.
            </CardDescription>
            <div className="flex gap-3">
              <Link href="/dashboard/profile">
                <Button variant="secondary" className="gap-2 rounded-xl">
                  <UserCircle className="h-4 w-4" />
                  Set Up Profile
                </Button>
              </Link>
              <Link href="/dashboard/pipeline/new">
                <Button className="gap-2 rounded-xl">
                  <Rocket className="h-4 w-4" />
                  Start First Pipeline
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {runs.map((run) => (
            <Link key={run.id} href={`/dashboard/pipeline/${run.id}`}>
              <Card className="group cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-accent/30 hover:glow-sm">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      {run.entry_mode === "explore" ? (
                        <Search className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <Link2 className="h-4.5 w-4.5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {run.selected_offer?.title ||
                          run.offer_url ||
                          "Explore mode"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {run.created_at
                          ? new Date(run.created_at).toLocaleDateString()
                          : ""}
                        {run.selected_offer?.company &&
                          ` · ${run.selected_offer.company}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {run.gap_report && (
                      <span className="text-sm text-muted-foreground">
                        Match: {run.gap_report.match_score}%
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={statusColor(run.status)}
                    >
                      {PIPELINE_STATUS_LABELS[run.status]}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
