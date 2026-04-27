"use client";

import { PIPELINE_STEPS, PIPELINE_STATUS_LABELS } from "@/lib/types";
import type { PipelineStatus } from "@/lib/types";
import { Check } from "lucide-react";

export function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === "failed") return null;

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus as PipelineStatus);

  return (
    <div className="relative py-6">
      <div className="relative flex justify-between">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === PIPELINE_STEPS.length - 1;
          
          // Determine how much of the connecting line should be dark
          let lineFill = "0%";
          if (index < currentIndex) {
            lineFill = "100%";
          } else if (index === currentIndex && currentStatus !== "completed" && currentStatus !== "failed") {
            lineFill = "50%"; // Show active state progress
          }

          return (
            <div key={step} className="relative flex flex-col items-center flex-1">
              {/* Connecting Line (starts at center of current, goes full width to next) */}
              {!isLast && (
                <>
                  {/* Background Track */}
                  <div className="absolute top-5 left-1/2 w-full h-[2px] bg-[#E8E6E1] -z-10" />
                  {/* Active Track */}
                  <div
                    className="absolute top-5 left-1/2 h-[2px] bg-[#111111] transition-all duration-1000 ease-in-out -z-10"
                    style={{ width: lineFill }}
                  />
                </>
              )}

              <div
                className={`z-10 flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500 border ${
                  isCompleted
                    ? "bg-[#111111] border-[#111111] text-white shadow-lg shadow-[#111111]/10"
                    : isActive
                      ? "bg-white border-[#111111] text-[#111111] shadow-xl ring-4 ring-[#F4F3F0]"
                      : "bg-[#F4F3F0] border-[#E8E6E1] text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </div>
              
              <div className="flex flex-col items-center gap-1.5 mt-4 px-2">
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.2em] text-center transition-colors duration-500 ${
                    isActive
                      ? "text-[#111111]"
                      : isCompleted
                        ? "text-gray-500"
                        : "text-gray-300"
                  }`}
                >
                  {PIPELINE_STATUS_LABELS[step]}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#111111] animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
