"use client";

import { PIPELINE_STEPS, PIPELINE_STATUS_LABELS } from "@/lib/types";
import type { PipelineStatus } from "@/lib/types";
import { Check } from "lucide-react";

export function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === "failed") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
        <p className="font-semibold">Pipeline Failed</p>
        <p className="text-sm mt-1 opacity-80">An error occurred during execution.</p>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus as PipelineStatus);

  return (
    <div className="relative">
      {/* Track background */}
      <div className="absolute top-4 left-0 h-0.5 w-full rounded-full bg-border/50" />
      {/* Track fill */}
      <div
        className="absolute top-4 left-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-700 ease-out"
        style={{
          width: `${(Math.max(0, currentIndex) / (PIPELINE_STEPS.length - 1)) * 100}%`,
        }}
      />

      <div className="relative flex justify-between">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center gap-2.5 w-24">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isActive
                      ? "bg-background border-2 border-primary text-primary shadow-md glow-sm animate-pulse"
                      : "bg-secondary text-muted-foreground/60"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs text-center font-medium leading-tight ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-foreground/70"
                      : "text-muted-foreground/50"
                }`}
              >
                {PIPELINE_STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
