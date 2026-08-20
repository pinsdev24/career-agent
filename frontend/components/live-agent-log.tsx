"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Compass,
  FilePenLine,
  Loader2,
  ScanSearch,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api-base";
import { getPipelineLogs } from "@/lib/api";
import { narrativeKey, softenLogMessage } from "@/lib/agent-narrative";
import type { AgentLogEvent } from "@/lib/types";

const STAGE_ICON = {
  started: Sparkles,
  scouting: Compass,
  matching: ScanSearch,
  writing: FilePenLine,
  critiquing: Wand2,
} as const;

function parseSseChunk(chunk: string): AgentLogEvent[] {
  const events: AgentLogEvent[] = [];
  for (const block of chunk.split("\n\n")) {
    const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    const dataStr = dataLine.replace(/^data:\s?/, "").trim();
    if (!dataStr) continue;
    try {
      const parsed = JSON.parse(dataStr) as AgentLogEvent;
      if (parsed && typeof parsed.message === "string") events.push(parsed);
    } catch {
      // ignore keepalives / malformed frames
    }
  }
  return events;
}

export function LiveAgentLog({
  runId,
  status,
  company,
}: {
  runId: string;
  status: string;
  company?: string | null;
}) {
  const t = useTranslations("MissionDetail.activity");
  const tStage = useTranslations("MissionDetail.stage");
  const [logs, setLogs] = useState<AgentLogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const labelFor = (log: AgentLogEvent) => {
    const key = narrativeKey(log);
    if (t.has(key)) return t(key);
    return softenLogMessage(log.message) || t("working");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    let cancelled = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    const pullHistory = async () => {
      try {
        const events = await getPipelineLogs(runId);
        if (!cancelled) {
          setLogs(events);
          setIsConnected(true);
          setFeedError(false);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          setFeedError(true);
        }
      }
    };

    const connectStream = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(`${API_URL}/pipeline/${runId}/stream`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        });
        if (!response.ok || !response.body) return;

        if (!cancelled) setIsConnected(true);
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          const incoming = parseSseChunk(
            parts.length ? `${parts.join("\n\n")}\n\n` : ""
          );
          if (incoming.length && !cancelled) {
            await pullHistory();
          }
        }
      } catch {
        // polling remains the source of truth
      }
    };

    void pullHistory();
    void connectStream();
    const timer = window.setInterval(pullHistory, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      reader?.cancel().catch(() => undefined);
    };
  }, [runId]);

  const visible = useMemo(() => {
    const seen = new Set<string>();
    const out: AgentLogEvent[] = [];
    for (const log of logs) {
      const label = labelFor(log);
      const fp = `${log.type}:${label}`;
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push(log);
    }
    return out.slice(-8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, t]);

  const Icon =
    STAGE_ICON[status as keyof typeof STAGE_ICON] || Sparkles;
  const stageTitle = tStage.has(`${status}.title`)
    ? tStage(`${status}.title`)
    : t("working");
  const stageDesc = tStage.has(`${status}.desc`)
    ? tStage(`${status}.desc`)
    : t("empty");

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-[#2a2a2a] dark:bg-[#111]">
      <div
        className={cn(
          "relative overflow-hidden px-6 py-8 sm:px-8",
          status === "writing" &&
            "bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-950/30 dark:via-[#111] dark:to-[#111]",
          status === "critiquing" &&
            "bg-gradient-to-br from-violet-50 via-white to-white dark:from-violet-950/30 dark:via-[#111] dark:to-[#111]",
          status === "scouting" &&
            "bg-gradient-to-br from-sky-50 via-white to-white dark:from-sky-950/30 dark:via-[#111] dark:to-[#111]",
          status === "matching" &&
            "bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-[#111] dark:to-[#111]",
          status === "started" &&
            "bg-gradient-to-br from-[#F7F7F7] via-white to-white dark:from-[#161616] dark:via-[#111] dark:to-[#111]"
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/10">
              <span className="absolute inset-1 animate-ping rounded-xl bg-[#1a1a1a] opacity-10 dark:bg-white" />
              <Icon className="relative h-6 w-6 text-[#1a1a1a] dark:text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#888]">
                {company ? t("working_on", { company }) : t("title")}
              </p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
                {stageTitle}
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#666] dark:text-[#999]">
                {stageDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#666] ring-1 ring-[#EBEBEB] dark:bg-[#1a1a1a]/80 dark:text-[#aaa] dark:ring-[#333]">
            <span className="relative flex h-1.5 w-1.5">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  isConnected ? "bg-emerald-500" : "bg-[#ccc]"
                )}
              />
            </span>
            {isConnected ? t("live") : t("waiting")}
          </div>
        </div>
      </div>

      <div className="border-t border-[#F0F0F0] px-6 py-5 dark:border-[#222] sm:px-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#999]">
          {t("feed")}
        </p>
        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFA] px-4 py-3 text-[13px] text-[#888] dark:bg-[#161616]">
              {!feedError && <Loader2 className="h-4 w-4 animate-spin" />}
              {feedError ? t("unavailable") : t("empty")}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((log, index) => {
                const isLast = index === visible.length - 1;
                const isError = log.type === "error";
                return (
                  <motion.div
                    key={`${log.type}-${log.message}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl px-3 py-2.5",
                      isLast ? "bg-[#FAFAFA] dark:bg-[#161616]" : "opacity-70"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isError ? (
                        <span className="block h-2 w-2 rounded-full bg-red-500" />
                      ) : isLast ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#1a1a1a] dark:text-white" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[13px] leading-relaxed",
                        isError
                          ? "text-red-600 dark:text-red-400"
                          : "text-[#1a1a1a] dark:text-white"
                      )}
                    >
                      {labelFor(log)}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
