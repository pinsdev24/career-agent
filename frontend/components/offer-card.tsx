"use client";

import type { JobOffer } from "@/lib/types";
import {
  MapPin,
  ExternalLink,
  TrendingUp,
  Globe,
  Building2,
  Users,
  CheckCircle2,
} from "lucide-react";

interface OfferCardProps {
  offer: JobOffer;
  onClick?: () => void;
  selected?: boolean;
}

export function OfferCard({ offer, onClick, selected }: OfferCardProps) {
  const matchColor =
    offer.pre_score > 80
      ? "text-emerald-600 bg-emerald-50"
      : offer.pre_score > 60
        ? "text-amber-600 bg-amber-50"
        : "text-[#999] bg-[#F5F5F5]";

  const ci = offer.company_info;

  return (
    <div
      className={`group transition-all duration-200 rounded-xl border bg-white ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-[#1a1a1a] ring-1 ring-[#1a1a1a]/5"
          : "border-[#EBEBEB] hover:border-[#ccc]"
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {selected && (
                <div className="w-5 h-5 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[14px] font-medium text-[#1a1a1a] leading-snug">
                  {offer.title}
                </h3>
                <p className="text-[13px] text-[#999] mt-0.5">
                  {ci?.name || offer.company}
                </p>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#999]">
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
                className="text-[#1a1a1a] font-medium inline-flex items-center gap-1 hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Snippet */}
            {offer.snippet && (
              <p className="text-[12px] text-[#999] line-clamp-2 leading-relaxed">
                {offer.snippet}
              </p>
            )}
          </div>

          {/* Score */}
          <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tabular-nums shrink-0 ${matchColor}`}>
            {offer.pre_score}%
          </div>
        </div>
      </div>

      {/* Contact */}
      {offer.contact_email && (
        <div className="px-4 pb-3">
          <a
            href={`mailto:${offer.contact_email}`}
            className="text-[11px] font-mono text-[#999] hover:text-[#1a1a1a] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {offer.contact_email}
          </a>
        </div>
      )}
    </div>
  );
}
