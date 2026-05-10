"use client";

import { PIPELINE_STEPS, PIPELINE_STATUS_LABELS } from "@/lib/types";
import type { PipelineStatus } from "@/lib/types";
import { Check } from "lucide-react";

export function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === "failed") return null;

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus as PipelineStatus);

  return (
    <div className="rounded-xl border border-[#EBEBEB] bg-white p-4">
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === PIPELINE_STEPS.length - 1;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#1a1a1a] text-white"
                      : isActive
                        ? "bg-white border-2 border-[#1a1a1a] text-[#1a1a1a]"
                        : "bg-[#F5F5F5] text-[#ccc] border border-[#EBEBEB]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight max-w-[70px] transition-colors ${
                    isActive
                      ? "text-[#1a1a1a]"
                      : isCompleted
                        ? "text-[#666]"
                        : "text-[#ccc]"
                  }`}
                >
                  {PIPELINE_STATUS_LABELS[step]}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#1a1a1a] animate-pulse" />
                )}
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mx-1.5 h-[2px] rounded-full transition-colors duration-500">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCompleted ? "bg-[#1a1a1a]" : "bg-[#EBEBEB]"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
