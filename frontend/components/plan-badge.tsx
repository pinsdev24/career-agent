"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getUserPlan } from "@/lib/api";
import type { PlanUsage } from "@/lib/types";
import { Crown, Zap, ArrowUpRight } from "lucide-react";

interface PlanBadgeProps {
  isCollapsed: boolean;
  onUpgradeClick: () => void;
}

export function PlanBadge({ isCollapsed, onUpgradeClick }: PlanBadgeProps) {
  const t = useTranslations("PlanBadge");
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getUserPlan()
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Error: hide entirely ──────────────────────────────────────────────
  if (error) return null;

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-2.5 py-3">
        <div className="space-y-2 animate-pulse">
          <div
            className={`h-4 rounded bg-[#F5F5F5] dark:bg-[#222] ${
              isCollapsed ? "w-8 mx-auto" : "w-20"
            }`}
          />
          {!isCollapsed && (
            <div className="h-6 w-full rounded-lg bg-[#F5F5F5] dark:bg-[#222] mt-2" />
          )}
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const isPro = plan.tier === "pro";

  // ── Collapsed state ───────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex justify-center px-2.5 py-3">
        {isPro ? (
          <div
            title="Pro plan"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] dark:bg-[#222] text-[#1a1a1a] dark:text-white"
          >
            <Crown className="h-4 w-4" />
          </div>
        ) : (
          <button
            title={t("upgrade")}
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1a1a1a] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#222] transition-colors"
          >
            <Zap className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────
  return (
    <div className="px-2.5 py-3 space-y-2.5 flex flex-col">
      {/* Tier badge */}
      <div className="flex items-center gap-2">
        {isPro ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#1a1a1a] dark:bg-white px-2 py-1 text-[11px] font-semibold text-white dark:text-[#111]">
            <Crown className="h-3 w-3" />
            Pro
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#EBEBEB] dark:border-[#333] px-2 py-1 text-[11px] font-semibold text-[#666] dark:text-[#aaa]">
            <Zap className="h-3 w-3" />
            Free
          </span>
        )}
      </div>

      {/* Upgrade CTA (free only) */}
      {!isPro && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpgradeClick();
          }}
          className="group flex items-center justify-center gap-1.5 rounded-lg bg-[#1a1a1a] dark:bg-white px-3 py-1.5 text-[12px] font-medium text-white dark:text-[#111] hover:bg-[#333] dark:hover:bg-[#e5e5e5] transition-colors w-full"
        >
          {t("upgrade")}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
