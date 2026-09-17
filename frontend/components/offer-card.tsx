"use client";

import { useTranslations } from "next-intl";
import type { JobOffer } from "@/lib/types";
import { CompanyLogo } from "@/components/company-logo";
import { MatchScore } from "@/components/match-score";
import {
  MapPin,
  ExternalLink,
  Building2,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  offer: JobOffer;
  onClick?: () => void;
  selected?: boolean;
}

export function OfferCard({ offer, onClick, selected }: OfferCardProps) {
  const t = useTranslations("Common");
  const ci = offer.company_info;
  const companyName = ci?.name || offer.company;

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-white transition-all duration-200 dark:bg-[#111]",
        onClick && "cursor-pointer",
        selected
          ? "border-[#1a1a1a] ring-1 ring-[#1a1a1a]/10 dark:border-white"
          : "border-[#EBEBEB] hover:border-[#ccc] dark:border-[#333]"
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <CompanyLogo name={companyName} url={offer.url} size={40} />
              {selected && (
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white dark:bg-white dark:text-black">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[14px] font-medium leading-snug text-[#1a1a1a] dark:text-white">
                  {offer.title}
                </h3>
                <p className="mt-0.5 text-[13px] text-[#888]">
                  {companyName}
                </p>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#999] dark:text-[#888]">
              {offer.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {offer.location}
                </span>
              )}
              {ci?.industry && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {ci.industry}
                </span>
              )}
              {ci?.size && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 shrink-0" />
                  {ci.size}
                </span>
              )}
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a1a1a] dark:text-white font-medium inline-flex items-center gap-1 hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {t("view")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Snippet */}
            {offer.snippet && (
              <p className="text-[12px] text-[#999] dark:text-[#888] line-clamp-2 leading-relaxed">
                {offer.snippet}
              </p>
            )}
          </div>

          <MatchScore score={offer.pre_score} />
        </div>
      </div>

      {/* Contact */}
      {offer.contact_email && (
        <div className="px-4 pb-3">
          <a
            href={`mailto:${offer.contact_email}`}
            className="text-[11px] font-mono text-[#999] hover:text-[#1a1a1a] dark:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {offer.contact_email}
          </a>
        </div>
      )}
    </div>
  );
}
