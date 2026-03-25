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
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      : offer.pre_score > 60
        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
        : "bg-muted text-muted-foreground border-border";

  return (
    <Card
      className={`transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-primary/40 hover:bg-accent/20" : ""
      } ${selected ? "border-primary bg-primary/8 shadow-md glow-sm ring-1 ring-primary/50" : "border-border/60"}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg line-clamp-2 leading-snug">{offer.title}</CardTitle>
            <CardDescription className="font-medium text-foreground/70">
              {offer.company}
            </CardDescription>
            {offer.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {offer.location}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`flex-shrink-0 gap-1 ${matchColor}`}
          >
            <TrendingUp className="h-3 w-3" />
            {offer.pre_score}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {offer.snippet && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
            {offer.snippet}
          </p>
        )}
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary font-medium inline-flex items-center gap-1.5 underline-offset-4 decoration-primary/30 hover:decoration-primary hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          View original posting
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
