"use client";

import { useTranslations } from "next-intl";
import { PIPELINE_STEPS } from "@/lib/types";
import type { PipelineStatus } from "@/lib/types";
import { Check } from "lucide-react";

export function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  const t = useTranslations("Dashboard.status");

  if (currentStatus === "failed") return null;

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus as PipelineStatus);

  return (
    <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] p-4">
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
                      ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-black"
                      : isActive
                      ? "bg-white dark:bg-[#111] border-2 border-[#1a1a1a] dark:border-white text-[#1a1a1a] dark:text-white"
                      : "bg-[#F5F5F5] dark:bg-[#222] text-[#ccc] dark:text-[#555] border border-[#EBEBEB] dark:border-[#333]"
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
                      ? "text-[#1a1a1a] dark:text-white"
                      : isCompleted
                      ? "text-[#666] dark:text-[#999]"
                      : "text-[#ccc] dark:text-[#555]"
                  }`}
                >
                  {t.has(step) ? t(step) : step}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#1a1a1a] dark:bg-white animate-pulse" />
                )}
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mx-1.5 h-[2px] rounded-full transition-colors duration-500">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCompleted ? "bg-[#1a1a1a] dark:bg-white" : "bg-[#EBEBEB] dark:bg-[#333]"
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
