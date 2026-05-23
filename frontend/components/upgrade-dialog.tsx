"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  X,
  Crown,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  planUsage: {
    tier: string;
    pipelines_used_today: number;
    pipelines_limit_today: number;
    cv_uploads_used_today: number;
    cv_uploads_limit_today: number;
  } | null;
  triggerType: "pipeline" | "cv_upload";
}

export default function UpgradeDialog({
  open,
  onClose,
  planUsage,
  triggerType,
}: UpgradeDialogProps) {
  const t = useTranslations("UpgradeDialog");
  const tLanding = useTranslations("Landing");

  const isQuotaPipeline = triggerType === "pipeline";
  const used = isQuotaPipeline
    ? planUsage?.pipelines_used_today ?? 0
    : planUsage?.cv_uploads_used_today ?? 0;
  const limit = isQuotaPipeline
    ? planUsage?.pipelines_limit_today ?? 3
    : planUsage?.cv_uploads_limit_today ?? 2;
  const label = isQuotaPipeline ? t("pipelines") : t("cv_uploads");

  const isLimitReached = used >= limit;
  const proFeatures = tLanding.raw("pricing.pro.features") as string[];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[420px] p-0 overflow-hidden bg-[#FDFDFC] dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222] rounded-[2rem] shadow-2xl transition-colors duration-300"
      >
        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-[#F5F5F0] dark:hover:bg-[#1C1C1A] hover:text-[#111] dark:hover:text-white transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          {/* Quota Exceeded Alert notice */}
          {isLimitReached && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex gap-3 rounded-2xl bg-[#F9F8F6] dark:bg-[#1C1C1A] border border-orange-500/20 dark:border-orange-500/10 p-4 text-left"
            >
              <Zap className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider leading-none">
                  {t("title")}
                </h4>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                  {t("todays_usage", { label })}: <span className="font-semibold text-[#111] dark:text-white">{used}/{limit}</span>.
                </p>
              </div>
            </motion.div>
          )}

          {/* Dialog Header */}
          <div className="text-left space-y-2 mb-6">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAFAFA] dark:bg-[#111] border border-gray-100 dark:border-[#222]">
              <Crown className="h-4.5 w-4.5 text-[#111] dark:text-white" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-[#111] dark:text-white">
              Ariadne Pro
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-light leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Price Tag */}
          <div className="flex items-baseline gap-1 mb-6 border-b border-gray-100 dark:border-[#222] pb-6">
            <span className="text-4xl font-bold tracking-tight text-[#111] dark:text-white">
              {tLanding("pricing.pro.price")}
            </span>
            <span className="text-sm font-light text-gray-500 dark:text-gray-400">
              {tLanding("pricing.pro.period")}
            </span>
          </div>

          {/* Pro features list */}
          <div className="space-y-3.5 mb-8 text-left">
            {proFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-[13px] text-gray-600 dark:text-gray-300 font-light">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Upgrade CTA & Cancel Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full rounded-full bg-[#111] dark:bg-white text-white dark:text-[#111] hover:bg-gray-800 dark:hover:bg-gray-200 h-12 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              {tLanding("pricing.pro.button")}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            
            <button
              onClick={onClose}
              className="w-full text-center text-xs font-light text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-2 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
