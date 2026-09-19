"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, Link2, Loader2, Search } from "lucide-react";
import type { JobPosting } from "@/lib/job-engine-types";
import {
  getJob,
  getRecommendedJobs,
  searchJobs,
  sendJobSignal,
  JobEngineError,
} from "@/lib/job-engine";
import {
  includeFetchedJob,
  mergeJobQuery,
  readJobQueryId,
  resolveJobSelection,
} from "@/lib/jobs-selection";
import { Button } from "@/components/ui/button";
import { createApplication } from "@/lib/api";
import { formatUnknownError } from "@/lib/api-base";
import { evaluatePrepareGate, postingToDisplay } from "@/lib/offer-display";
import { EmptyState } from "@/components/empty-state";
import { JobsUrlSeed } from "@/components/jobs-url-seed";
import { useFirstRun } from "@/components/first-run-provider";
import { JobCard } from "@/components/job-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { remotePreferenceToFilter } from "@/lib/profile-ready";
import {
  jobsChipMessageKey,
  jobsEmptyMessageKeys,
  selectJobsChipKind,
  selectJobsEmptyKind,
} from "@/lib/jobs-copy";
import { JobsFilterBar, type JobsBarFilters } from "@/components/jobs-filter-bar";
import { countryLabel } from "@/lib/geo-catalog";
import { useLocale } from "next-intl";

export default function JobsPage() {
  const t = useTranslations("Jobs");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedJobId = readJobQueryId(searchParams.get("job"));
  const search = searchParams.toString();
  const failedFetchId = useRef<string | null>(null);
  const { ready, loading: setupLoading, openWizard, profile } = useFirstRun();
  const [items, setItems] = useState<JobPosting[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [deepLinkMissing, setDeepLinkMissing] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"recommend" | "search">("recommend");
  const [packetBusy, setPacketBusy] = useState(false);
  const [signalBusy, setSignalBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [bar, setBar] = useState<JobsBarFilters>({
    countries: [],
    workModes: [],
    contractTypes: [],
    roles: [],
  });
  const [applied, setApplied] = useState<JobsBarFilters>({
    countries: [],
    workModes: [],
    contractTypes: [],
    roles: [],
  });
  const [prefsSeeded, setPrefsSeeded] = useState(false);

  const targetTitle = profile?.search_preferences?.job_title?.trim() || "";
  const prefCountries = (profile?.search_preferences?.countries || []).map((c) =>
    c.toUpperCase()
  );
  const prefLocation =
    profile?.search_preferences?.location?.trim() ||
    prefCountries.map((code) => countryLabel(code, locale)).join(" · ");
  const prefRemote = remotePreferenceToFilter(
    profile?.search_preferences?.remote_preference,
    profile?.search_preferences?.work_modes
  );
  const uiFiltersOn =
    applied.countries.length > 0 ||
    applied.workModes.length > 0 ||
    applied.contractTypes.length > 0 ||
    applied.roles.length > 0;
  const copyCtx = {
    title: targetTitle,
    location: prefLocation,
    remote: prefRemote === true,
    structuredFilters: uiFiltersOn,
    uiFiltersActive: uiFiltersOn,
  };
  const chipKind = selectJobsChipKind(copyCtx);
  const emptyKind = selectJobsEmptyKind(copyCtx);
  const emptyKeys = jobsEmptyMessageKeys(emptyKind);

  const writeJobQuery = useCallback(
    (jobId: string | null, history: "push" | "replace") => {
      const next = mergeJobQuery(search, jobId);
      const current = search ? `/jobs?${search}` : "/jobs";
      if (next === current) return;
      if (history === "push") {
        router.push(next, { scroll: false });
      } else {
        router.replace(next, { scroll: false });
      }
    },
    [router, search]
  );

  const selectJob = useCallback(
    (job: JobPosting, history: "push" | "replace" = "push") => {
      setSelected(job);
      setDeepLinkMissing(false);
      setActionMessage(null);
      writeJobQuery(job.id, history);
    },
    [writeJobQuery]
  );

  const loadFeed = useCallback(
    async (reset = true, filters = applied) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const filterPayload = {
          countries: filters.countries,
          workModes: filters.workModes,
          contractTypes: filters.contractTypes,
          roles: filters.roles,
        };
        const res =
          mode === "search" && query.trim()
            ? await searchJobs({
                q: query.trim(),
                location: filters.countries.length
                  ? prefLocation || undefined
                  : undefined,
                remote: filters.workModes.length ? prefRemote : undefined,
                cursor: reset ? null : cursor,
                ...filterPayload,
              })
            : await getRecommendedJobs(reset ? null : cursor, 20, filterPayload);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.next_cursor ?? null);
        if (reset) {
          const result = resolveJobSelection(res.items, requestedJobId);
          if (result.status === "matched" || result.status === "default") {
            setDeepLinkMissing(false);
            setSelected(result.selected);
          } else {
            setDeepLinkMissing(false);
            setSelected(null);
          }
        }
      } catch (err) {
        const message =
          err instanceof JobEngineError ? err.message : t("error_generic");
        setError(typeof message === "string" ? message : t("error_generic"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [applied, cursor, mode, prefLocation, prefRemote, query, requestedJobId, t]
  );

  useEffect(() => {
    if (setupLoading || prefsSeeded) return;
    if (profile?.search_preferences) {
      const prefs = profile.search_preferences;
      const next: JobsBarFilters = {
        countries: (prefs.countries || []).map((c) => c.toUpperCase()),
        workModes: prefs.work_modes || [],
        contractTypes: prefs.contract_types || [],
        roles: prefs.preferred_roles || [],
      };
      setBar(next);
      setApplied(next);
      setPrefsSeeded(true);
      void loadFeed(true, next);
      return;
    }
    setPrefsSeeded(true);
    void loadFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupLoading, prefsSeeded, profile]);

  useEffect(() => {
    if (!ready || loading) return;
    if (items.length === 0 && mode === "recommend") {
      void loadFeed(true);
    }
    // Refresh recommend after first-run completes on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (failedFetchId.current && failedFetchId.current !== requestedJobId) {
      failedFetchId.current = null;
    }
  }, [requestedJobId]);

  useEffect(() => {
    if (loading) return;

    const result = resolveJobSelection(items, requestedJobId, selected?.id);

    if (result.status === "default") {
      setDeepLinkMissing(false);
      setSelected((current) =>
        current?.id === result.selected?.id ? current : result.selected
      );
      return;
    }

    if (result.status === "matched") {
      setDeepLinkMissing(false);
      setSelected((current) =>
        current?.id === result.selected.id ? current : result.selected
      );
      return;
    }

    if (failedFetchId.current === result.id) {
      setDeepLinkMissing(true);
      setSelected(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const fetched = await getJob(result.id);
        if (cancelled) return;
        setDeepLinkMissing(false);
        setItems((prev) => includeFetchedJob(prev, fetched));
        setSelected(fetched);
      } catch {
        if (cancelled) return;
        failedFetchId.current = result.id;
        setDeepLinkMissing(true);
        setSelected(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, loading, requestedJobId, selected?.id]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMode(query.trim() ? "search" : "recommend");
    setLoading(true);
    setError(null);
    try {
      const res = query.trim()
        ? await searchJobs({
            q: query.trim(),
            location: applied.countries.length
              ? prefLocation || undefined
              : undefined,
            remote: applied.workModes.length ? prefRemote : undefined,
            countries: applied.countries,
            workModes: applied.workModes,
            contractTypes: applied.contractTypes,
            roles: applied.roles,
          })
        : await getRecommendedJobs(null, 20, {
            countries: applied.countries,
            workModes: applied.workModes,
            contractTypes: applied.contractTypes,
            roles: applied.roles,
          });
      setItems(res.items);
      setCursor(res.next_cursor ?? null);
      const result = resolveJobSelection(res.items, requestedJobId);
      if (result.status === "matched" || result.status === "default") {
        setDeepLinkMissing(false);
        setSelected(result.selected);
      } else {
        setDeepLinkMissing(false);
        setSelected(null);
      }
      setMode(query.trim() ? "search" : "recommend");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const onPreparePacket = async (job: JobPosting) => {
    const gate = evaluatePrepareGate({
      status: job.status,
      applyUrl: job.apply_url,
      descriptionText: job.description_text,
    });
    if (!gate.allowed) return;
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
        const next =
          selected?.id === job.id ? remaining[0] ?? null : selected;
        setSelected(next);
        writeJobQuery(next?.id ?? null, "replace");
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

  const selectedGate = selected
    ? evaluatePrepareGate({
        status: selected.status,
        applyUrl: selected.apply_url,
        descriptionText: selected.description_text,
      })
    : null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col gap-5">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg px-4 text-[13px]"
            onClick={() => {
              const el = document.getElementById("jobs-url-seed-chrome");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              el?.focus();
            }}
          >
            <Link2 className="h-4 w-4" />
            {t("url_seed_title")}
          </Button>
        }
      />

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

      <div className="rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 dark:border-[#333] dark:bg-[#111]">
        <JobsUrlSeed compact inputId="jobs-url-seed-chrome" />
      </div>

      <JobsFilterBar
        value={bar}
        onChange={setBar}
        onApply={() => {
          setApplied(bar);
          setPrefsSeeded(true);
          void loadFeed(true, bar);
        }}
        onClear={() => {
          const next: JobsBarFilters = {
            countries: [],
            workModes: [],
            contractTypes: [],
            roles: [],
          };
          setBar(next);
          setApplied(next);
          setPrefsSeeded(true);
          void loadFeed(true, next);
        }}
      />

      {ready && chipKind && items.length > 0 && !loading && (
        <p className="text-[12px] text-[#888]">
          {t(jobsChipMessageKey(chipKind), {
            title: targetTitle,
            location: prefLocation,
          })}
        </p>
      )}

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
        setupLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
            ))}
          </div>
        ) : !ready ? (
          <EmptyState
            icon={Briefcase}
            title={t("empty")}
            description={t("empty_hint")}
            actionLabel={t("empty_cta")}
            onAction={openWizard}
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title={t(emptyKeys.title, {
              title: targetTitle,
              location: prefLocation,
            })}
            description={t(emptyKeys.hint, {
              title: targetTitle,
              location: prefLocation,
            })}
            actionLabel={emptyKind === "filters" ? t("empty_filters_cta") : undefined}
            onAction={
              emptyKind === "filters"
                ? () => {
                    const next: JobsBarFilters = {
                      countries: [],
                      workModes: [],
                      contractTypes: [],
                      roles: [],
                    };
                    setBar(next);
                    setApplied(next);
                    setPrefsSeeded(true);
                    void loadFeed(true, next);
                  }
                : undefined
            }
          >
            <JobsUrlSeed inputId="jobs-url-seed-empty" />
          </EmptyState>
        )
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:min-h-0">
          <div className="space-y-2 lg:overflow-y-auto lg:pr-1">
            {items.map((job) => (
              <JobCard
                key={job.id}
                variant="list"
                display={postingToDisplay(job)}
                selected={selected?.id === job.id}
                onClick={() => selectJob(job)}
              />
            ))}

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
            {deepLinkMissing ? (
              <div className="space-y-2 px-5 py-16 text-center">
                <p className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                  {t("deep_link_missing")}
                </p>
                <p className="text-[13px] text-[#888]">
                  {t("deep_link_missing_hint")}
                </p>
              </div>
            ) : selected && selectedGate ? (
              <JobCard
                variant="detail"
                display={postingToDisplay(selected)}
                description={selected.description_text}
                prepareGate={selectedGate}
                prepareBusy={packetBusy}
                onPrepare={() => void onPreparePacket(selected)}
                onSave={() => void onSignal(selected, "save")}
                onDismiss={() => void onSignal(selected, "dismiss")}
                signalBusy={signalBusy}
                actionMessage={actionMessage}
                footerNote={
                  <div className="space-y-2 pt-1">
                    <JobsUrlSeed compact inputId="jobs-url-seed-detail" />
                    <Link
                      href="/pipeline/new"
                      className="block text-center text-[12px] text-[#888] underline-offset-2 hover:text-[#1a1a1a] hover:underline dark:hover:text-white"
                    >
                      {t("url_not_in_feed")}
                    </Link>
                  </div>
                }
              />
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
