"use client";

import type { JobOffer } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, TrendingUp } from "lucide-react";

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

  return (
    <div
      className={`group transition-all duration-300 relative rounded-[1.5rem] border p-8 bg-white ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected 
          ? "border-[#111111] shadow-lg ring-1 ring-[#111111]/5" 
          : "border-[#E8E6E1] hover:border-[#111111]/30"
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="space-y-1">
            <h3 className="text-2xl font-medium tracking-tight text-[#111111] leading-tight">
              {offer.title}
            </h3>
            <p className="text-gray-500 font-light text-lg">
              {offer.company}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            {offer.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {offer.location}
              </span>
            )}
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#111111] inline-flex items-center gap-1.5 underline underline-offset-4 decoration-gray-300 hover:decoration-[#111111] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Original Posting
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {offer.snippet && (
            <p className="text-gray-500 font-light text-sm line-clamp-2 leading-relaxed max-w-2xl">
              {offer.snippet}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${matchColor} flex items-center gap-2`}>
            <TrendingUp className="h-3 w-3" />
            {offer.pre_score}% Match
          </div>
          
          {selected && (
            <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
               <TrendingUp className="h-5 w-5" />
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="absolute top-4 right-4 animate-in fade-in duration-500 pointer-events-none">
           <div className="w-2 h-2 rounded-full bg-[#111111] shadow-[0_0_10px_rgba(17,17,17,0.4)]" />
        </div>
      )}
    </div>
  );
}
