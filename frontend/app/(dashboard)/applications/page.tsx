"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Inbox, Briefcase } from "lucide-react";
import { listApplications, listInbox } from "@/lib/api";
import { formatUnknownError } from "@/lib/api-base";
import type { Application, ApplicationStatus, WorkItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/company";
import { CompanyLogo } from "@/components/company-logo";
import { StatusPill } from "@/components/status-pill";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const FILTERS: Array<{ id: "all" | "needs_you" | ApplicationStatus; key: string }> = [
  { id: "all", key: "filter_all" },
  { id: "needs_you", key: "filter_needs_you" },
  { id: "generating", key: "status_generating" },
  { id: "packet_ready", key: "status_packet_ready" },
  { id: "submitted", key: "status_submitted" },
];

export default function ApplicationsPage() {
  const t = useTranslations("Applications");
  const [apps, setApps] = useState<Application[]>([]);
  const [inbox, setInbox] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [applicationRows, inboxRows] = await Promise.all([
          listApplications(),
          listInbox(),
        ]);
        setApps(applicationRows);
        setInbox(inboxRows);
      } catch (err) {
        setError(formatUnknownError(err, t("error_generic")));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  const inboxIds = useMemo(
    () => new Set(inbox.map((item) => item.application_id).filter(Boolean)),
    [inbox]
  );

  const filtered = apps.filter((app) => {
    if (filter === "all") return true;
    if (filter === "needs_you") {
      return inboxIds.has(app.id) || app.status === "packet_ready";
    }
    return app.status === filter;
  });

  const statusLabel = (status: string) =>
    t.has(`status_${status}`) ? t(`status_${status}`) : status.replaceAll("_", " ");

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link href="/jobs">
            <Button className="h-9 rounded-lg text-[13px]">{t("browse_jobs")}</Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </div>
      )}

      {inbox.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 px-5 py-3">
            <Inbox className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <h2 className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
              {t("needs_you")} · {inbox.length}
            </h2>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {inbox.map((item) => (
              <Link
                key={item.id}
                href={
                  item.application_id
                    ? `/applications/${item.application_id}`
                    : "/applications"
                }
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/60 dark:hover:bg-white/5"
              >
                <CompanyLogo
                  name={String(item.payload?.company || "Company")}
                  url={String(item.payload?.apply_url || "")}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                    {(item.payload?.title as string) || t("review")}
                  </p>
                  <p className="truncate text-[12px] text-[#777]">
                    {(item.payload?.company as string) || statusLabel(item.item_type)}
                  </p>
                </div>
                <StatusPill status="packet_ready" label={t("review")} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`h-8 rounded-full px-3 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[#1a1a1a] text-white dark:bg-white dark:text-[#111]"
                  : "bg-white text-[#666] ring-1 ring-[#EBEBEB] hover:bg-[#F7F7F7] dark:bg-[#111] dark:text-[#aaa] dark:ring-[#333]"
              }`}
            >
              {t(item.key)}
            </button>
          );
        })}
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t("empty")}
          description={t("empty_hint")}
          actionHref="/jobs"
          actionLabel={t("browse_jobs")}
        />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[#888]">{t("filter_empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]">
          {filtered.map((app, index) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-[#161616] ${
                index !== 0 ? "border-t border-[#F3F3F3] dark:border-[#222]" : ""
              }`}
            >
              <CompanyLogo
                name={app.posting?.company_name || "Company"}
                url={app.posting?.apply_url}
                size={42}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#1a1a1a] dark:text-white">
                  {app.posting?.title || t("untitled")}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[#777]">
                  {app.posting?.company_name}
                  {app.updated_at ? ` · ${formatRelativeTime(app.updated_at)}` : ""}
                </p>
              </div>
              <StatusPill status={app.status} label={statusLabel(app.status)} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
