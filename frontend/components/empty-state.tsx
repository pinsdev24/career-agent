import type { ComponentType } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[#E4E4E4] dark:border-[#2a2a2a] bg-white/70 dark:bg-[#111] px-8 py-16 text-center",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5] dark:bg-[#1c1c1c]">
        <Icon className="h-5 w-5 text-[#888]" />
      </div>
      <h2 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#888]">
        {description}
      </p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-5 inline-flex">
          <Button className="h-9 rounded-lg px-4 text-[13px]">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
