"use client";

import type { JobOffer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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
      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
      : offer.pre_score > 60
        ? "bg-orange-50 text-orange-600 border-orange-100"
        : "bg-gray-50 text-gray-400 border-gray-100";

  const ci = offer.company_info;

  return (
    <div
      className={`group transition-all duration-300 relative rounded-[1.5rem] border bg-white ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-[#111111] shadow-lg ring-1 ring-[#111111]/5"
          : "border-[#E8E6E1] hover:border-[#111111]/30"
      }`}
      onClick={onClick}
    >
      {/* Main content area */}
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            {/* Title + company name */}
            <div className="space-y-1">
              <h3 className="text-2xl font-medium tracking-tight text-[#111111] leading-tight">
                {offer.title}
              </h3>
              <p className="text-gray-500 font-light text-lg">
                {ci?.name || offer.company}
              </p>
            </div>

            {/* Location + link row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {offer.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {offer.location}
                </span>
              )}
              {ci?.industry && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  {ci.industry}
                </span>
              )}
              {ci?.size && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  {ci.size}
                </span>
              )}
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#111111] inline-flex items-center gap-1.5 underline underline-offset-4 decoration-gray-300 hover:decoration-[#111111] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View Posting
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {ci?.website && (
                <a
                  href={ci.website.startsWith("http") ? ci.website : `https://${ci.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-[#111111] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {ci.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>

            {/* Company description (only shown if present) */}
            {ci?.description && (
              <p className="text-gray-400 font-light text-sm leading-relaxed max-w-2xl italic border-l-2 border-[#E8E6E1] pl-4">
                {ci.description}
              </p>
            )}

            {/* Snippet (trimmed) */}
            {offer.snippet && (
              <p className="text-gray-500 font-light text-sm line-clamp-2 leading-relaxed max-w-2xl">
                {offer.snippet}
              </p>
            )}
          </div>

          {/* Right column: score + selected indicator */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div
              className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${matchColor} flex items-center gap-2`}
            >
              <TrendingUp className="h-3 w-3" />
              {offer.pre_score}% Match
            </div>

            {selected && (
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact email chip — subtle footer only when present */}
      {offer.contact_email && (
        <div className="px-8 pb-6 -mt-2">
          <a
            href={`mailto:${offer.contact_email}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#111111] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono">{offer.contact_email}</span>
          </a>
        </div>
      )}

      {/* Selected pulse dot */}
      {selected && (
        <div className="absolute top-4 right-4 animate-in fade-in duration-500 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-[#111111] shadow-[0_0_10px_rgba(17,17,17,0.4)]" />
        </div>
      )}
    </div>
  );
}
