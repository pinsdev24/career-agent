"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { companyInitials, companyLogoSrc } from "@/lib/company";

const TONES = [
  "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200",
];

function toneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

export function CompanyLogo({
  name,
  slug,
  url,
  size = 40,
  className,
}: {
  name: string;
  slug?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = companyLogoSrc({ companyName: name, companySlug: slug, applyUrl: url });
  const initials = companyInitials(name || "?");

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#161616] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {!failed && src ? (
        // Favicon endpoint — keep as img so we can fall back instantly.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain p-[18%]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center text-[11px] font-semibold tracking-tight",
            toneFor(name)
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
