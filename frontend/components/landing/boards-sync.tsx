"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";

const ALLOWED_ATS = ["greenhouse", "lever", "ashby", "workable"] as const;
type AtsId = (typeof ALLOWED_ATS)[number];

const MARK: Record<AtsId, string> = {
  greenhouse: "Gh",
  lever: "Lv",
  ashby: "As",
  workable: "Wk",
};

type Source = { id: string; name: string };
type Fact = { value: string; label: string };

function isAtsId(id: string): id is AtsId {
  return (ALLOWED_ATS as readonly string[]).includes(id);
}

function AtsMonogram({ id }: { id: AtsId }) {
  return (
    <div
      aria-hidden
      className="flex h-12 w-12 items-center justify-center rounded-tl-xl rounded-br-xl border border-foreground/15 bg-foreground/[0.03] font-mono text-sm tracking-tight"
    >
      {MARK[id]}
    </div>
  );
}

export function BoardsSync() {
  const t = useTranslations("Landing.scout");
  const sources = (t.raw("sources") as Source[]).filter((source) => isAtsId(source.id));
  const facts = t.raw("facts") as Fact[];

  return (
    <section id="boards" className="relative scroll-mt-28 overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
          <div>
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" />
              {t("badge")}
            </span>
            <h2 className="font-display mb-8 text-4xl tracking-tight lg:text-6xl">
              {t("title")}
              <br />
              <span className="text-muted-foreground">{t("title_muted")}</span>
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("subtitle")}
            </p>

            <ul className="mt-10 max-w-xl divide-y divide-foreground/10 border-y border-foreground/10">
              {facts.map((fact) => (
                <li key={fact.label} className="flex items-baseline justify-between gap-6 py-3">
                  <span className="font-display text-xl tracking-tight">{fact.value}</span>
                  <span className="text-right text-sm text-muted-foreground">{fact.label}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/jobs"
              className="group mt-8 inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              {t("paste_url")}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-foreground/10 bg-foreground/10">
            {sources.map((source) => (
              <div key={source.id} className="flex flex-col justify-between gap-8 bg-background p-6 sm:p-8">
                <AtsMonogram id={source.id as AtsId} />
                <div>
                  <div className="font-display text-2xl tracking-tight">{source.name}</div>
                  <div className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    {t("source_kind")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
