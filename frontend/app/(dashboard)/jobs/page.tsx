"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

export default function JobsPage() {
  const t = useTranslations("Jobs");
  const [items, setItems] = useState<JobPosting[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"recommend" | "search">("recommend");
  const [packetBusy, setPacketBusy] = useState(false);
  const [packetMessage, setPacketMessage] = useState<string | null>(null);

  const loadFeed = useCallback(async (reset = true) => {
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
    } catch (err) {
      const message =
        err instanceof JobEngineError
          ? err.message
          : t("error_generic");
      setError(typeof message === "string" ? message : t("error_generic"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, mode, query, t]);

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
      setMode(query.trim() ? "search" : "recommend");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const onPreparePacket = async (job: JobPosting) => {
    setPacketBusy(true);
    setPacketMessage(null);
    try {
      await createApplication(job.id);
      await sendJobSignal(job.id, "save");
      setPacketMessage(t("packet_started"));
    } catch (err) {
      setPacketMessage(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setPacketBusy(false);
    }
  };

  const onSignal = async (job: JobPosting, type: "save" | "dismiss") => {
    try {
      await sendJobSignal(job.id, type);
      if (type === "dismiss") {
        setItems((prev) => prev.filter((j) => j.id !== job.id));
        if (selected?.id === job.id) setSelected(null);
      }
    } catch {
      // ignore transient signal errors in UI
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
            {t("title")}
          </h1>
          <p className="text-[13px] text-[#666] dark:text-[#888] mt-1 max-w-xl">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] text-[13px] outline-none focus:border-[#1a1a1a] dark:focus:border-white"
          />
        </div>
        <Button type="submit" className="h-10 rounded-lg text-[13px]">
          {t("search")}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#999]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-[13px]">{t("loading")}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-[#ccc]" />
          <p className="text-[14px] text-[#666] dark:text-[#888]">{t("empty")}</p>
          <p className="text-[12px] text-[#999]">{t("empty_hint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-2">
            {items.map((job) => {
              const active = selected?.id === job.id;
              const score = job.score ?? job.score_breakdown?.total;
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelected(job)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    active
                      ? "border-[#1a1a1a] dark:border-white bg-[#FAFAFA] dark:bg-[#161616]"
                      : "border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] hover:border-[#ccc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[14px] font-medium text-[#1a1a1a] dark:text-white truncate">
                        {job.title}
                      </h2>
                      <p className="text-[13px] text-[#888] mt-0.5">{job.company_name}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-[#999]">
                        {job.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.remote && <span>{t("remote")}</span>}
                        <span className="uppercase tracking-wide">{job.source}</span>
                      </div>
                    </div>
                    {typeof score === "number" && (
                      <span className="shrink-0 text-[12px] font-medium px-2 py-1 rounded-md bg-[#F5F5F5] dark:bg-[#222] text-[#1a1a1a] dark:text-white">
                        {Math.round(score)}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {cursor && (
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadFeed(false)}
                className="w-full h-10 rounded-lg text-[13px] mt-2"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("load_more")
                )}
              </Button>
            )}
          </div>

          <aside className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-4 h-fit sticky top-6">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
                    {selected.title}
                  </h3>
                  <p className="text-[13px] text-[#888] mt-0.5">{selected.company_name}</p>
                </div>

                {selected.score_breakdown?.reasons?.length ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#1a1a1a] dark:text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("why_match")}
                    </div>
                    <ul className="space-y-1">
                      {selected.score_breakdown.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="text-[12px] text-[#666] dark:text-[#aaa]"
                        >
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-[13px] text-[#555] dark:text-[#aaa] leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {(selected.description_text || "").slice(0, 1200)}
                  {(selected.description_text || "").length > 1200 ? "…" : ""}
                </p>

                {packetMessage && (
                  <p className="text-[12px] text-[#666] dark:text-[#888]">{packetMessage}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-9 rounded-lg text-[13px]"
                    disabled={packetBusy}
                    onClick={() => void onPreparePacket(selected)}
                  >
                    {packetBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("prepare_packet")
                    )}
                  </Button>
                  <a
                    href={selected.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[13px] font-medium"
                  >
                    {t("apply")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg text-[13px]"
                    onClick={() => void onSignal(selected, "save")}
                  >
                    <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                    {t("save")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-lg text-[13px]"
                    onClick={() => void onSignal(selected, "dismiss")}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    {t("dismiss")}
                  </Button>
                </div>

                <Link
                  href={`/pipeline/new?url=${encodeURIComponent(selected.apply_url)}`}
                  className="block text-[12px] text-[#666] dark:text-[#888] hover:text-[#1a1a1a] dark:hover:text-white underline-offset-2 hover:underline"
                >
                  {t("open_in_careeragent")}
                </Link>
              </div>
            ) : (
              <p className="text-[13px] text-[#999] py-8 text-center">
                {t("select_hint")}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
