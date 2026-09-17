"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Bookmark,
  X,
  Sparkles,
  Banknote,
  Clock,
} from "lucide-react";
import type { JobPosting } from "@/lib/job-engine-types";
import {
  getRecommendedJobs,
  searchJobs,
  sendJobSignal,
  JobEngineError,
} from "@/lib/job-engine";
import { Button } from "@/components/ui/button";
import { createApplication } from "@/lib/api";
import { formatUnknownError } from "@/lib/api-base";
import { stripHtml } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/company";
import { CompanyLogo } from "@/components/company-logo";
import { MatchScore } from "@/components/match-score";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsPage() {
  const t = useTranslations("Jobs");
  const router = useRouter();
  const [items, setItems] = useState<JobPosting[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"recommend" | "search">("recommend");
  const [packetBusy, setPacketBusy] = useState(false);
  const [signalBusy, setSignalBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const loadFeed = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res =
          mode === "search" && query.trim()
            ? await searchJobs({ q: query.trim(), cursor: reset ? null : cursor })
            : await getRecommendedJobs(reset ? null : cursor);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.next_cursor ?? null);
        if (reset && res.items[0]) setSelected(res.items[0]);
      } catch (err) {
        const message =
          err instanceof JobEngineError ? err.message : t("error_generic");
        setError(typeof message === "string" ? message : t("error_generic"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor, mode, query, t]
  );

  useEffect(() => {
    void loadFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMode(query.trim() ? "search" : "recommend");
    setLoading(true);
    setError(null);
    try {
      const res = query.trim()
        ? await searchJobs({ q: query.trim() })
        : await getRecommendedJobs();
      setItems(res.items);
      setCursor(res.next_cursor ?? null);
      setSelected(res.items[0] ?? null);
      setMode(query.trim() ? "search" : "recommend");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const onPreparePacket = async (job: JobPosting) => {
    setPacketBusy(true);
    setActionMessage(null);
    try {
      const application = await createApplication(job.id);
      try {
        await sendJobSignal(job.id, "save");
      } catch {
        // Packet is the source of truth; save is best-effort.
      }
      setActionMessage({ kind: "ok", text: t("packet_started") });
      router.push(`/applications/${application.id}`);
    } catch (err) {
      setActionMessage({
        kind: "error",
        text: formatUnknownError(err, t("api_unreachable")),
      });
    } finally {
      setPacketBusy(false);
    }
  };

  const onSignal = async (job: JobPosting, type: "save" | "dismiss") => {
    setSignalBusy(true);
    setActionMessage(null);
    try {
      await sendJobSignal(job.id, type);
      if (type === "dismiss") {
        const remaining = items.filter((j) => j.id !== job.id);
        setItems(remaining);
        setSelected((current) =>
          current?.id === job.id ? remaining[0] ?? null : current
        );
        setActionMessage({ kind: "ok", text: t("dismissed") });
      } else {
        setActionMessage({ kind: "ok", text: t("saved") });
      }
    } catch (err) {
      setActionMessage({
        kind: "error",
        text: formatUnknownError(err, t("api_unreachable")),
      });
    } finally {
      setSignalBusy(false);
    }
  };

  const selectedDescription = stripHtml(selected?.description_text || "");
  const selectedScore = selected
    ? selected.score ?? selected.score_breakdown?.total
    : null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="h-11 w-full rounded-xl border border-[#EBEBEB] bg-white pl-10 pr-3 text-[13px] outline-none transition-colors focus:border-[#1a1a1a] dark:border-[#333] dark:bg-[#111] dark:focus:border-white"
          />
        </div>
        <Button type="submit" className="h-11 rounded-xl px-5 text-[13px]">
          {t("search")}
        </Button>
      </form>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="hidden h-[520px] rounded-2xl lg:block" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t("empty")}
          description={t("empty_hint")}
          actionHref="/profile"
          actionLabel={t("empty_cta")}
        />
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:min-h-0">
          <div className="space-y-2 lg:overflow-y-auto lg:pr-1">
            {items.map((job) => {
              const active = selected?.id === job.id;
              const score = job.score ?? job.score_breakdown?.total;
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    setSelected(job);
                    setActionMessage(null);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    active
                      ? "border-[#1a1a1a] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:border-white dark:bg-[#161616]"
                      : "border-transparent bg-white hover:border-[#E4E4E4] dark:bg-[#111] dark:hover:border-[#333]"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <CompanyLogo
                      name={job.company_name}
                      slug={job.company_slug}
                      url={job.apply_url}
                      size={42}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-[14px] font-semibold text-[#1a1a1a] dark:text-white">
                            {job.title}
                          </h2>
                          <p className="mt-0.5 truncate text-[13px] text-[#666] dark:text-[#aaa]">
                            {job.company_name}
                          </p>
                        </div>
                        <MatchScore score={score} compact />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#888]">
                        {job.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.remote && <span>{t("remote")}</span>}
                        {job.posted_at && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(job.posted_at)}
                          </span>
                        )}
                      </div>
                      {job.skills?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-[#F5F5F5] px-1.5 py-0.5 text-[11px] text-[#666] dark:bg-[#222] dark:text-[#aaa]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {cursor && (
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadFeed(false)}
                className="mt-1 h-10 w-full rounded-xl text-[13px]"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("load_more")
                )}
              </Button>
            )}
          </div>

          <aside className="h-fit overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111] lg:sticky lg:top-6">
            {selected ? (
              <div className="flex flex-col">
                <div className="border-b border-[#F0F0F0] px-5 py-5 dark:border-[#222]">
                  <div className="flex items-start gap-3.5">
                    <CompanyLogo
                      name={selected.company_name}
                      slug={selected.company_slug}
                      url={selected.apply_url}
                      size={48}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-semibold leading-snug text-[#1a1a1a] dark:text-white">
                        {selected.title}
                      </h3>
                      <p className="mt-0.5 text-[13px] text-[#666] dark:text-[#aaa]">
                        {selected.company_name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <MatchScore score={selectedScore} />
                        <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[#666] dark:bg-[#222] dark:text-[#aaa]">
                          {selected.source}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#777]">
                    {selected.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selected.location}
                      </span>
                    )}
                    {selected.remote && <span>{t("remote")}</span>}
                    {selected.salary && (
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5" />
                        {selected.salary}
                      </span>
                    )}
                    {selected.contract_type && <span>{selected.contract_type}</span>}
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  {selected.score_breakdown?.reasons?.length ? (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#1a1a1a] dark:text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("why_match")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.score_breakdown.reasons.slice(0, 6).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-lg bg-[#F7F7F7] px-2 py-1 text-[12px] leading-snug text-[#555] dark:bg-[#1c1c1c] dark:text-[#bbb]"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[#555] dark:text-[#aaa]">
                    {selectedDescription.slice(0, 1600)}
                    {selectedDescription.length > 1600 ? "…" : ""}
                  </p>

                  {actionMessage && (
                    <p
                      className={`text-[12px] ${
                        actionMessage.kind === "error"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-[#666] dark:text-[#888]"
                      }`}
                    >
                      {actionMessage.text}
                    </p>
                  )}
                </div>

                <div className="sticky bottom-0 space-y-2 border-t border-[#F0F0F0] bg-white px-5 py-4 dark:border-[#222] dark:bg-[#111]">
                  <Button
                    type="button"
                    className="h-10 w-full rounded-xl text-[13px]"
                    disabled={packetBusy}
                    onClick={() => void onPreparePacket(selected)}
                  >
                    {packetBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("prepare_packet")
                    )}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={selected.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#EBEBEB] text-[12px] font-medium text-[#1a1a1a] hover:bg-[#FAFAFA] dark:border-[#333] dark:text-white dark:hover:bg-[#1a1a1a]"
                    >
                      {t("apply")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl text-[12px]"
                      disabled={signalBusy}
                      onClick={() => void onSignal(selected, "save")}
                    >
                      <Bookmark className="mr-1 h-3.5 w-3.5" />
                      {t("save")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 rounded-xl text-[12px]"
                      disabled={signalBusy}
                      onClick={() => void onSignal(selected, "dismiss")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      {t("dismiss")}
                    </Button>
                  </div>
                  <Link
                    href={`/pipeline/new?url=${encodeURIComponent(selected.apply_url)}`}
                    className="block pt-1 text-center text-[12px] text-[#888] underline-offset-2 hover:text-[#1a1a1a] hover:underline dark:hover:text-white"
                  >
                    {t("open_in_careeragent")}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="px-5 py-16 text-center text-[13px] text-[#999]">
                {t("select_hint")}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
