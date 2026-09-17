import { cn } from "@/lib/utils";
import { matchTone } from "@/lib/company";

export function MatchScore({
  score,
  compact = false,
}: {
  score?: number | null;
  compact?: boolean;
}) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  const rounded = Math.round(score);
  const tone = matchTone(rounded);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tabular-nums",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        tone === "high" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        tone === "mid" &&
          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        tone === "low" && "bg-[#F5F5F5] text-[#666] dark:bg-[#222] dark:text-[#aaa]"
      )}
    >
      {rounded}%
    </span>
  );
}
