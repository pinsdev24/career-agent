"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Application, PipelineRun, WorkItem } from "@/lib/types";
import type { JobPosting } from "@/lib/job-engine-types";
import { API_URL } from "@/lib/api-base";
import { listApplications, listInbox } from "@/lib/api";
import { getRecommendedJobs } from "@/lib/job-engine";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { JobCard } from "@/components/job-card";
import { MatchScore } from "@/components/match-score";
import { StatusPill } from "@/components/status-pill";
import { EmptyState } from "@/components/empty-state";
import { useFirstRun } from "@/components/first-run-provider";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/company";
import { postingToDisplay } from "@/lib/offer-display";
import { jobsHref } from "@/lib/jobs-selection";
import {
  ArrowUpRight,
  Inbox,
  Briefcase,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const tApp = useTranslations("Applications");
  const tFirst = useTranslations("FirstRun");
  const { ready, loading: setupLoading, openWizard } = useFirstRun();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [inbox, setInbox] = useState<WorkItem[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const meta = session.user.user_metadata || {};
        const full = String(meta.full_name || meta.name || "");
        setFirstName(full.split(" ")[0] || "");

        const [runsRes, applicationRows, inboxRows, jobRes] = await Promise.all([
          fetch(`${API_URL}/pipeline/runs`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          listApplications().catch(() => [] as Application[]),
          listInbox().catch(() => [] as WorkItem[]),
          getRecommendedJobs(null, 4).catch(() => ({ items: [] as JobPosting[] })),
        ]);

        if (runsRes.ok) {
          const data = await runsRes.json();
          setRuns(Array.isArray(data) ? data : []);
        }
        setApps(applicationRows);
        setInbox(inboxRows);
        setJobs(jobRes.items.slice(0, 4));
      } catch {
        // keep empty states
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const hasAnything =
    inbox.length > 0 || jobs.length > 0 || apps.length > 0 || runs.length > 0;

  const statusLabel = (status: string) =>
    tApp.has(`status_${status}`)
      ? tApp(`status_${status}`)
      : status.replaceAll("_", " ");

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? t("greeting", { name: firstName }) : t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link href="/jobs">
            <Button className="h-9 rounded-lg px-4 text-[13px]">
              <Briefcase className="h-4 w-4" />
              {t("browse_jobs")}
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/applications",
              label: t("stat_inbox"),
              value: inbox.length,
              icon: Inbox,
            },
            {
              href: "/jobs",
              label: t("stat_jobs"),
              value: jobs.length ? `${jobs.length}+` : "—",
              icon: Briefcase,
            },
            {
              href: "/applications",
              label: t("stat_applications"),
              value: apps.length,
              icon: FileText,
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-2xl border border-[#EBEBEB] bg-white p-4 transition-colors hover:border-[#ccc] dark:border-[#333] dark:bg-[#111]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-[#888]">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-[#bbb]" />
              </div>
              <p className="mt-2 text-[26px] font-semibold tracking-tight">{stat.value}</p>
            </Link>
          ))}
        </div>
      )}

      {!loading && inbox.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#888]">
            {t("needs_attention")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
            {inbox.slice(0, 4).map((item, index) => (
              <Link
                key={item.id}
                href={
                  item.application_id
                    ? `/applications/${item.application_id}`
                    : "/applications"
                }
                className={`flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#161616] ${
                  index !== 0 ? "border-t border-[#F3F3F3] dark:border-[#222]" : ""
                }`}
              >
                <CompanyLogo
                  name={String(item.payload?.company || "Company")}
                  url={String(item.payload?.apply_url || "")}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {(item.payload?.title as string) || t("review_packet")}
                  </p>
                  <p className="truncate text-[12px] text-[#777]">
                    {(item.payload?.company as string) || ""}
                  </p>
                </div>
                <StatusPill status="packet_ready" label={t("review_packet")} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && jobs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#888]">
              {t("top_matches")}
            </h2>
            <Link
              href="/jobs"
              className="text-[12px] font-medium text-[#666] hover:text-[#1a1a1a] dark:hover:text-white"
            >
              {t("see_all_jobs")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                variant="tile"
                href={jobsHref(job.id)}
                display={postingToDisplay(job)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && apps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#888]">
              {t("recent_applications")}
            </h2>
            <Link
              href="/applications"
              className="text-[12px] font-medium text-[#666] hover:text-[#1a1a1a] dark:hover:text-white"
            >
              {t("see_all_applications")}
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
            {apps.slice(0, 6).map((app, index) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-[#161616] ${
                  index !== 0 ? "border-t border-[#F3F3F3] dark:border-[#222]" : ""
                }`}
              >
                <CompanyLogo
                  name={app.posting?.company_name || "Company"}
                  url={app.posting?.apply_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13px] font-medium">
                    {app.posting?.title || t("untitled_application")}
                  </h3>
                  <p className="mt-0.5 truncate text-[12px] text-[#777]">
                    {app.posting?.company_name}
                    {app.updated_at ? ` · ${formatRelativeTime(app.updated_at)}` : ""}
                  </p>
                </div>
                <StatusPill status={app.status} label={statusLabel(app.status)} />
                <ArrowUpRight className="h-4 w-4 text-[#ddd]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && runs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#888]">
            {t("recent_missions")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
            {runs.slice(0, 8).map((run, index) => {
              const label = t.has(`status.${run.status}`)
                ? t(`status.${run.status}`)
                : run.status.replaceAll("_", " ");
              return (
                <Link
                  key={run.id}
                  href={`/pipeline/${run.id}`}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-[#161616] ${
                    index !== 0 ? "border-t border-[#F3F3F3] dark:border-[#222]" : ""
                  }`}
                >
                  <CompanyLogo
                    name={run.selected_offer?.company || t("explore_mission")}
                    url={run.selected_offer?.url || run.offer_url}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-medium">
                      {run.selected_offer?.title ||
                        run.offer_url ||
                        t("explore_mission")}
                    </h3>
                    <p className="mt-0.5 truncate text-[12px] text-[#777]">
                      {run.selected_offer?.company}
                      {run.created_at
                        ? ` · ${formatRelativeTime(run.created_at)}`
                        : ""}
                    </p>
                  </div>
                  {run.gap_report && (
                    <MatchScore score={run.gap_report.match_score} compact />
                  )}
                  <StatusPill status={run.status} label={label} />
                  <ArrowUpRight className="h-4 w-4 text-[#ddd] transition-colors group-hover:text-[#888]" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !setupLoading && !hasAnything && (
        <EmptyState
          icon={Briefcase}
          title={ready ? t("empty.title") : tFirst("title")}
          description={
            ready ? t("empty.description") : tFirst("banner_desc")
          }
          actionHref={ready ? "/jobs" : undefined}
          actionLabel={ready ? t("browse_jobs") : tFirst("banner_cta")}
          onAction={ready ? undefined : openWizard}
        />
      )}
    </div>
  );
}
