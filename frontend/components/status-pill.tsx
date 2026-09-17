import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  info: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  muted: "bg-[#F3F3F3] text-[#555] dark:bg-[#222] dark:text-[#aaa]",
};

const APPLICATION_TONE: Record<string, keyof typeof TONES> = {
  draft: "muted",
  generating: "info",
  packet_ready: "warn",
  approved: "success",
  submitted: "success",
  interviewing: "info",
  rejected: "danger",
  withdrawn: "muted",
};

const PIPELINE_TONE: Record<string, keyof typeof TONES> = {
  completed: "success",
  failed: "danger",
  waiting_offer_selection: "warn",
  waiting_letter_review: "warn",
  writing: "info",
  analyzing: "info",
  scouting: "info",
  matching: "info",
  critiquing: "info",
  started: "muted",
};

export function StatusPill({
  status,
  label,
  pulse = false,
}: {
  status: string;
  label: string;
  pulse?: boolean;
}) {
  const tone =
    APPLICATION_TONE[status] || PIPELINE_TONE[status] || "muted";
  const showPulse =
    pulse ||
    status === "generating" ||
    status === "writing" ||
    status === "scouting" ||
    status === "matching" ||
    status === "critiquing" ||
    status === "started";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
        TONES[tone]
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {showPulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}
