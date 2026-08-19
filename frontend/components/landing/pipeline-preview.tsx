"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Cpu, Terminal } from "lucide-react";

type LogKind = "info" | "agent_action" | "node_finish";

type LogLine = {
  type: LogKind;
  time: string;
  text: string;
};

const LINE_DELAY_MS = 420;

function LogIcon({ type, live }: { type: LogKind; live: boolean }) {
  if (type === "agent_action") {
    return <Cpu className={`mt-0.5 h-3 w-3 shrink-0 text-amber-400 ${live ? "animate-pulse" : ""}`} />;
  }
  if (type === "node_finish") {
    return <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />;
  }
  return <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-background/35" />;
}

export function PipelinePreview({ active }: { active: number }) {
  const t = useTranslations("Landing.how_it_works");
  const sequences = t.raw("preview_logs") as LogLine[][];
  const lines = sequences[active] ?? sequences[0] ?? [];
  const [visible, setVisible] = React.useState(1);

  React.useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setVisible(lines.length);
      return;
    }

    setVisible(1);
    const timers: number[] = [];
    for (let i = 1; i < lines.length; i++) {
      timers.push(window.setTimeout(() => setVisible(i + 1), i * LINE_DELAY_MS));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active, lines.length]);

  const done = visible >= lines.length;

  return (
    <div className="relative overflow-hidden border border-background/10 bg-background/[0.04]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 3px)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/40 to-transparent" />

      <div className="relative flex items-center justify-between border-b border-background/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-3.5 w-3.5 text-background/40" />
          <span className="text-[11px] font-medium tracking-wide text-background/55">
            {t("preview_title")}
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-background/50 uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {t("preview_status")}
        </span>
      </div>

      <div className="relative min-h-[220px] space-y-1.5 px-5 py-5 font-mono text-[12px] leading-relaxed">
        {lines.slice(0, visible).map((line, index) => {
          const isLast = index === visible - 1;
          return (
            <div
              key={`${active}-${index}-${line.text}`}
              className={`flex items-start gap-2.5 animate-log-in ${
                isLast ? "opacity-100" : "opacity-40"
              }`}
            >
              <LogIcon type={line.type} live={isLast && line.type === "agent_action"} />
              <p
                className={
                  line.type === "agent_action"
                    ? "text-amber-300/85"
                    : line.type === "node_finish"
                      ? "text-emerald-300/80"
                      : "text-background/65"
                }
              >
                <span className="mr-3 text-[10px] tabular-nums text-background/25">
                  {line.time}
                </span>
                {line.text}
              </p>
            </div>
          );
        })}
        {!done && (
          <div className="flex items-center gap-2.5 pl-5 pt-1">
            <span className="h-3.5 w-px animate-pulse bg-background/70" />
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between border-t border-background/10 px-5 py-2.5">
        <span className="font-mono text-[10px] text-background/30">
          {t("preview_events", { count: visible })}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-background/25">
          {t("preview_run")}
        </span>
      </div>
    </div>
  );
}
