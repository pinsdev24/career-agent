"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

function Shot({
  src,
  alt,
  url,
  className,
}: {
  src: string;
  alt: string;
  url: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)] dark:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] ${className ?? ""}`}
    >
      <div className="flex h-8 items-center gap-2 border-b border-foreground/10 bg-foreground/[0.03] px-3">
        <span className="flex gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/15" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
          {url}
        </span>
      </div>
      <div className="relative aspect-[16/9] overflow-hidden bg-[#f4f4f2]">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover object-top"
          sizes="(min-width: 1024px) 560px, 90vw"
        />
      </div>
    </div>
  );
}

export function ProductInsight() {
  const t = useTranslations("Landing.product");
  const insights = t.raw("insights") as { k: string; v: string }[];

  return (
    <section id="product" className="relative overflow-hidden border-b border-foreground/10 py-20 lg:py-28">
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:px-12">
        <div className="max-w-md">
          <span className="mb-5 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            {t("badge")}
          </span>
          <h2 className="font-display text-4xl tracking-tight lg:text-5xl">
            {t("title")}
            <br />
            <span className="text-muted-foreground">{t("title_muted")}</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>

          <ol className="mt-8 space-y-5">
            <li className="border-t border-foreground/10 pt-4">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                01 — {t("dashboard_label")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("dashboard_caption")}
              </p>
            </li>
            <li className="border-t border-foreground/10 pt-4">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                02 — {t("review_label")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("review_caption")}
              </p>
            </li>
          </ol>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] pb-16 lg:mx-0 lg:max-w-none lg:pb-20">
          <Shot
            src="/images/Screenshot-dashboard.png"
            alt={t("dashboard_alt")}
            url={t("dashboard_url")}
            className="relative z-10 w-[92%] lg:w-[88%]"
          />
          <Shot
            src="/images/Screenshot-hitl-cover-approval.png"
            alt={t("review_alt")}
            url={t("review_url")}
            className="absolute right-0 -bottom-2 z-20 w-[68%] translate-y-4 rotate-[-2deg] lg:w-[62%] lg:translate-y-6"
          />
        </div>

        <div className="grid gap-px overflow-hidden border border-foreground/10 bg-foreground/10 sm:grid-cols-3 lg:col-span-2">
          {insights.map((item) => (
            <div key={item.k} className="bg-background px-5 py-4">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {item.k}
              </div>
              <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
