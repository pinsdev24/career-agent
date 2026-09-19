"use client";

import type { JobOffer } from "@/lib/types";
import { JobCard } from "@/components/job-card";
import { hitlOfferToDisplay } from "@/lib/offer-display";

interface OfferCardProps {
  offer: JobOffer;
  onClick?: () => void;
  selected?: boolean;
}

export function OfferCard({ offer, onClick, selected }: OfferCardProps) {
  return (
    <JobCard
      variant="hitl"
      display={hitlOfferToDisplay(offer)}
      selected={selected}
      onClick={onClick}
    />
  );
}
