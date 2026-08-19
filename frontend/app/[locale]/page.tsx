"use client";

import Link from "next/link";
import React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { AnimatedWord } from "@/components/landing/animated-word";
import { ControlVisual, MatchVisual, ScoutVisual, ToneVisual } from "@/components/landing/feature-visuals";
import { GridBackground } from "@/components/landing/grid-background";
import { LandingNavbar } from "@/components/landing/navbar";
import { ParticleSphere } from "@/components/landing/particle-sphere";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { ProductInsight } from "@/components/landing/product-insight";
import { StatsMarquee } from "@/components/landing/stats-marquee";

const FEATURE_VISUALS = [MatchVisual, ToneVisual, ControlVisual, ScoutVisual];

function SectionEyebrow({ children, inverted = false }: { children: React.ReactNode; inverted?: boolean }) {
  return (
    <span className={`mb-6 inline-flex items-center gap-3 font-mono text-sm ${inverted ? "text-background/50" : "text-muted-foreground"}`}>
      <span className={`h-px w-8 ${inverted ? "bg-background/30" : "bg-foreground/30"}`} />
      {children}
    </span>
  );
}

function LiveClock() {
  const [now, setNow] = React.useState("");

  React.useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="font-mono text-sm text-muted-foreground tabular-nums">{now}</span>;
}

export default function LandingPage() {
  const t = useTranslations("Landing");
  const [activeStep, setActiveStep] = React.useState(0);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [testimonial, setTestimonial] = React.useState(0);

  const words = t.raw("hero.title_words") as string[];
  const features = t.raw("features.items") as { n: string; title: string; desc: string }[];
  const steps = t.raw("how_it_works.steps") as { roman: string; title: string; desc: string }[];
  const sources = t.raw("scout.sources") as { city: string; region: string; ms: string }[];
  const securityItems = t.raw("security.items") as { title: string; desc: string }[];
  const securityBadges = t.raw("security.badges") as string[];
  const controlItems = t.raw("control.items") as { title: string; desc: string }[];
  const testimonials = t.raw("testimonials.items") as { quote: string; author: string; role: string; result: string }[];
  const faqs = t.raw("faq.items") as { q: string; a: string }[];

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [steps.length]);

  const quote = testimonials[testimonial];

  return (
    <div id="top" className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <LandingNavbar />

      <main>
        {/* Hero */}
        <section className="relative flex min-h-screen flex-col justify-center overflow-hidden">
          <GridBackground />
          <div className="pointer-events-none absolute top-1/2 right-0 h-[600px] w-[600px] -translate-y-1/2 opacity-40 lg:h-[800px] lg:w-[800px]">
            <ParticleSphere />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-32 lg:px-12 lg:py-40">
            <div className="mb-8">
              <SectionEyebrow>{t("hero.eyebrow")}</SectionEyebrow>
            </div>

            <h1 className="font-display mb-12 text-[clamp(3rem,12vw,10rem)] leading-[0.9] tracking-tight">
              <span className="block">{t("hero.title_line1")}</span>
              <span className="block">
                {t("hero.title_prefix")} <AnimatedWord words={words} />
              </span>
            </h1>

            <div className="grid items-end gap-12 lg:grid-cols-2 lg:gap-24">
              <p className="max-w-xl text-xl leading-relaxed text-muted-foreground lg:text-2xl">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Link href="/login">
                  <Button className="group h-14 rounded-full bg-foreground px-8 text-base text-background hover:bg-foreground/90">
                    {t("hero.cta_primary")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" className="h-14 rounded-full border-foreground/20 bg-background px-8 text-base">
                    {t("hero.cta_secondary")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <StatsMarquee />
        </section>

        {/* Features */}
        <section id="features" className="relative py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 lg:mb-24">
              <SectionEyebrow>{t("features.badge")}</SectionEyebrow>
              <h2 className="font-display text-4xl tracking-tight lg:text-6xl">
                {t("features.title")}
                <br />
                <span className="text-muted-foreground">{t("features.title_muted")}</span>
              </h2>
            </div>

            <div>
              {features.map((item, i) => {
                const Visual = FEATURE_VISUALS[i] ?? MatchVisual;
                return (
                  <div key={item.n} className="group border-b border-foreground/10 py-12 lg:py-20">
                    <div className="flex flex-col gap-8 lg:flex-row lg:gap-16">
                      <div className="shrink-0">
                        <span className="font-mono text-sm text-muted-foreground">{item.n}</span>
                      </div>
                      <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
                        <div>
                          <h3 className="font-display mb-4 text-3xl transition-transform duration-500 group-hover:translate-x-2 lg:text-4xl">
                            {item.title}
                          </h3>
                          <p className="text-lg leading-relaxed text-muted-foreground">{item.desc}</p>
                        </div>
                        <div className="flex justify-center lg:justify-end">
                          <Visual />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="relative overflow-hidden bg-foreground py-24 text-background lg:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 lg:mb-24">
              <SectionEyebrow inverted>{t("how_it_works.badge")}</SectionEyebrow>
              <h2 className="font-display text-4xl tracking-tight lg:text-6xl">
                {t("how_it_works.title")}
                <br />
                <span className="text-background/50">{t("how_it_works.title_muted")}</span>
              </h2>
            </div>

            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
              <div>
                {steps.map((step, i) => (
                  <button
                    key={step.roman}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    className={`group w-full border-b border-background/10 py-8 text-left transition-opacity duration-500 ${
                      activeStep === i ? "opacity-100" : "opacity-40 hover:opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-6">
                      <span className="font-display text-3xl text-background/30">{step.roman}</span>
                      <div className="flex-1">
                        <h3 className="font-display mb-3 text-2xl transition-transform duration-300 group-hover:translate-x-2 lg:text-3xl">
                          {step.title}
                        </h3>
                        <p className="leading-relaxed text-background/60">{step.desc}</p>
                        {activeStep === i && (
                          <div className="mt-4 h-px overflow-hidden bg-background/20">
                            <div key={i} className="animate-progress-bar h-full bg-background" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="self-start lg:sticky lg:top-32">
                <PipelinePreview active={activeStep} />
              </div>
            </div>
          </div>
        </section>

        <ProductInsight />

        {/* Scout */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="grid items-start gap-16 lg:grid-cols-2">
              <div>
                <SectionEyebrow>{t("scout.badge")}</SectionEyebrow>
                <h2 className="font-display mb-8 text-4xl tracking-tight lg:text-6xl">
                  {t("scout.title")}
                  <br />
                  <span className="text-muted-foreground">{t("scout.title_muted")}</span>
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  {t("scout.subtitle")}
                </p>
                <div className="mt-12 grid grid-cols-3 gap-6">
                  {[
                    ["stat_sources_value", "stat_sources"],
                    ["stat_rank_value", "stat_rank"],
                    ["stat_refresh_value", "stat_refresh"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <div className="font-display text-3xl tracking-tight">{t(`scout.${value}`)}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t(`scout.${label}`)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-foreground/10">
                <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                  <span className="font-mono text-xs text-muted-foreground">{t("scout.status")}</span>
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t("scout.status_ok")}
                  </span>
                </div>
                <div>
                  {sources.map((source) => (
                    <div
                      key={source.city}
                      className="flex items-center justify-between border-b border-foreground/5 px-5 py-4 last:border-0"
                    >
                      <div>
                        <div className="text-sm">{source.city}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{source.region}</div>
                      </div>
                      <div className="font-mono text-sm tabular-nums">{source.ms}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="relative border-y border-foreground/10 py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 flex flex-col justify-between gap-6 lg:mb-24 lg:flex-row lg:items-end">
              <div>
                <SectionEyebrow>{t("metrics.badge")}</SectionEyebrow>
                <h2 className="font-display text-4xl tracking-tight lg:text-6xl">
                  {t("metrics.title")}
                  <br />
                  <span className="text-muted-foreground">{t("metrics.title_muted")}</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t("metrics.live")}
                <span className="text-foreground/20">|</span>
                <LiveClock />
              </div>
            </div>

            <div className="grid gap-px bg-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [t("stats.applications_value"), t("metrics.applications")],
                ["100%", t("metrics.uptime")],
                ["5 min", t("metrics.latency")],
                [t("stats.match_rate_value"), t("metrics.countries")],
              ].map(([value, label]) => (
                <div key={label} className="bg-background p-8 lg:p-10">
                  <div className="font-display text-4xl tracking-tight lg:text-5xl">{value}</div>
                  <div className="mt-3 text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="relative overflow-hidden bg-foreground/[0.02] py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 max-w-3xl lg:mb-24">
              <SectionEyebrow>{t("security.badge")}</SectionEyebrow>
              <h2 className="font-display mb-6 text-4xl tracking-tight lg:text-6xl">
                {t("security.title")}
                <br />
                <span className="text-muted-foreground">{t("security.title_muted")}</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">{t("security.subtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {securityBadges.map((badge) => (
                  <span key={badge} className="border border-foreground/10 px-3 py-1 font-mono text-[11px] tracking-widest uppercase">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-px bg-foreground/10 sm:grid-cols-2">
              {securityItems.map((item) => (
                <div key={item.title} className="bg-background p-8 lg:p-10">
                  <h3 className="font-display mb-3 text-2xl">{item.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Control */}
        <section id="control" className="relative overflow-hidden py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 max-w-3xl lg:mb-24">
              <SectionEyebrow>{t("control.badge")}</SectionEyebrow>
              <h2 className="font-display mb-6 text-4xl tracking-tight lg:text-6xl">
                {t("control.title")}
                <br />
                <span className="text-muted-foreground">{t("control.title_muted")}</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">{t("control.subtitle")}</p>
            </div>

            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {controlItems.map((item) => (
                <div key={item.title} className="border-t border-foreground/10 pt-6">
                  <h3 className="font-display mb-3 text-xl">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="relative border-t border-foreground/10 py-32 lg:py-40">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t("testimonials.badge")}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {String(testimonial + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
              </span>
            </div>

            {quote && (
              <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
                <blockquote className="font-serif max-w-4xl text-3xl leading-snug lg:text-5xl">
                  “{quote.quote}”
                </blockquote>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTestimonial((i) => (i - 1 + testimonials.length) % testimonials.length)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 hover:bg-foreground/5"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestimonial((i) => (i + 1) % testimonials.length)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 hover:bg-foreground/5"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {quote && (
              <div className="mt-12 flex flex-col justify-between gap-8 border-t border-foreground/10 pt-8 sm:flex-row sm:items-end">
                <div>
                  <div className="font-medium">{quote.author}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{quote.role}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {t("testimonials.result_label")}
                  </div>
                  <div className="font-display mt-1 text-xl">{quote.result}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative border-t border-foreground/10 py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="mb-16 lg:mb-24">
              <SectionEyebrow>{t("faq.badge")}</SectionEyebrow>
              <h2 className="font-display text-4xl tracking-tight lg:text-6xl">
                {t("faq.title")}
                <br />
                <span className="text-muted-foreground">{t("faq.title_muted")}</span>
              </h2>
            </div>

            <div className="mx-auto max-w-3xl">
              {faqs.map((item, i) => (
                <div key={item.q} className="border-b border-foreground/10">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display text-lg lg:text-xl">{item.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-48 pb-6" : "max-h-0"}`}>
                    <p className="leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
            <div className="relative border border-foreground">
              <div
                className="pointer-events-none absolute inset-0 opacity-10"
                style={{ background: "radial-gradient(600px at 0% 0%, currentColor, transparent 40%)" }}
              />
              <div className="relative z-10 flex flex-col items-start justify-between gap-12 px-8 py-16 lg:flex-row lg:items-center lg:px-16 lg:py-24">
                <div className="flex-1">
                  <h2 className="font-display mb-8 text-4xl leading-[0.95] tracking-tight lg:text-7xl">
                    {t("cta.title")}
                  </h2>
                  <p className="mb-12 max-w-xl text-xl leading-relaxed text-muted-foreground">
                    {t("cta.subtitle")}
                  </p>
                  <div className="flex flex-col items-start gap-4 sm:flex-row">
                    <Link href="/login">
                      <Button className="h-14 rounded-full bg-foreground px-8 text-base text-background hover:bg-foreground/90">
                        {t("cta.button")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline" className="h-14 rounded-full border-foreground/20 px-8 text-base">
                        {t("cta.secondary")}
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground">{t("cta.footer")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="mb-16 grid gap-10 md:grid-cols-4">
            <div>
              <Link href="#top" className="flex items-center">
                <span className="font-display text-xl tracking-tight">Ariadne</span>
              </Link>
              <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t("footer.product")}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">{t("footer.product_features")}</Link></li>
                <li><Link href="#how-it-works" className="hover:text-foreground">{t("footer.product_how")}</Link></li>
                <li><Link href="#product" className="hover:text-foreground">{t("footer.product_inside")}</Link></li>
                <li><Link href="#control" className="hover:text-foreground">{t("footer.product_explore")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t("footer.resources")}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#faq" className="hover:text-foreground">{t("footer.resources_faq")}</Link></li>
                <li><span className="cursor-default text-foreground/25">{t("footer.resources_docs")}</span></li>
                <li><span className="cursor-default text-foreground/25">{t("footer.resources_changelog")}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t("footer.legal")}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><span className="cursor-default text-foreground/25">{t("footer.legal_privacy")}</span></li>
                <li><span className="cursor-default text-foreground/25">{t("footer.legal_terms")}</span></li>
                <li><Link href="#faq" className="hover:text-foreground">{t("footer.legal_security")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-foreground/10 pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
