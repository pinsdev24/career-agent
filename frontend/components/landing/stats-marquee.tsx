"use client";

import { useTranslations } from "next-intl";

export function StatsMarquee() {
  const t = useTranslations("Landing");
  const items = t.raw("marquee") as { value: string; label: string }[];
  const loop = [...items, ...items];

  return (
    <div className="relative border-y border-foreground/10">
      <div className="overflow-hidden">
        <div className="animate-marquee flex w-max">
          {loop.map((item, i) => (
            <div
              key={`${item.value}-${item.label}-${i}`}
              className="min-w-[240px] border-r border-foreground/10 px-8 py-8"
            >
              <div className="font-display text-4xl tracking-tight md:text-5xl">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
