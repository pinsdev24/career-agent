"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Menu, X, CheckCircle2, Zap, Target, PenTool, Upload, Search, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";

// Reusable animation variants
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

// Logos for social proof
const COMPANY_LOGOS = ["Google", "Microsoft", "Stripe", "Vercel", "Datadog"];

export default function LandingPage() {
  const t = useTranslations("Landing");
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#FDFDFC] dark:bg-[#0a0a0a] text-[#111111] dark:text-white font-sans selection:bg-orange-500/30 overflow-hidden transition-colors">
      {/* Subtle Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: "6rem 6rem"
        }}
      />

      {/* Top Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between"
      >
        <Logo />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Link href="#product" className="hover:text-black dark:hover:text-white transition-colors">{t("nav.product")}</Link>
          <Link href="#how-it-works" className="hover:text-black dark:hover:text-white transition-colors">{t("nav.how_it_works")}</Link>
          <Link href="#features" className="hover:text-black dark:hover:text-white transition-colors">{t("nav.features")}</Link>
          <Link href="#pricing" className="hover:text-black dark:hover:text-white transition-colors">{t("nav.pricing")}</Link>
          <Link href="#testimonials" className="hover:text-black dark:hover:text-white transition-colors">{t("nav.testimonials")}</Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/dashboard" className="hidden sm:block">
            <Button className="rounded-full bg-[#111111] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-6 h-10 text-sm font-medium flex items-center gap-2 transition-all">
              {t("nav.dashboard")} <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-[#333] text-[#111] dark:text-white hover:bg-gray-50 dark:hover:bg-[#111] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </motion.header>

      {/* === Mobile Menu Panel === */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/20 dark:bg-black/50 backdrop-blur-sm md:hidden"
            onClick={closeMobileMenu}
          />
          <motion.nav
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-[#111] border-b border-gray-100 dark:border-[#333] shadow-xl pt-20 pb-8 px-6"
          >
            {/* Close area at top */}
            <button
              onClick={closeMobileMenu}
              className="absolute top-5 right-5 flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-[#333] text-[#111] dark:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1">
              {[
                { href: "#product", label: t("nav.product") },
                { href: "#how-it-works", label: t("nav.how_it_works") },
                { href: "#features", label: t("nav.features") },
                { href: "#pricing", label: t("nav.pricing") },
                { href: "#testimonials", label: t("nav.testimonials") },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="flex items-center py-3.5 px-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white border-b border-gray-100 dark:border-[#222] last:border-0 transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-6 flex flex-col gap-3">
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button className="w-full rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111] hover:bg-gray-800 dark:hover:bg-gray-200 h-12 text-base font-medium flex items-center justify-center gap-2">
                    {t("hero.cta_primary")} <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full rounded-full border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 h-12 text-base font-medium">
                    {t("nav.dashboard")}
                  </Button>
                </Link>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </motion.nav>
        </>
      )}

      <main className="relative z-10">
        {/* === Hero Section === */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-12" id="product">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#F4F3F0] dark:bg-[#1C1C1A] border border-[#E8E6E1] dark:border-[#333] rounded-full px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {t("hero.trusted")}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-medium tracking-tight leading-[1.05]">
              {t("hero.title_start")} <br className="hidden md:block" /> {t("hero.title_end")}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
              {t("hero.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button className="rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111] hover:bg-gray-800 dark:hover:bg-gray-200 hover:scale-105 transition-all duration-300 px-8 h-12 text-base font-medium flex items-center gap-2">
                  {t("hero.cta_primary")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" className="rounded-full border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#111] hover:border-gray-300 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                  {t("hero.cta_secondary")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* === Social Proof Stats Bar === */}
        <section className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl mx-auto px-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-[#F9F8F6] dark:bg-[#1C1C1A] rounded-[2rem] p-8 md:p-10 border border-gray-100 dark:border-[#333]">
              {(["applications", "time_saved", "match_rate", "satisfaction"] as const).map((key, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-semibold tracking-tight text-[#111] dark:text-white mb-1">
                    {t(`stats.${key}_value`)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-light">
                    {t(`stats.${key}`)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Logo Cloud */}
            <div className="flex items-center justify-center gap-8 md:gap-12 mt-10 opacity-40 dark:opacity-30">
              {COMPANY_LOGOS.map((name) => (
                <span key={name} className="text-sm md:text-base font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500">
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* === How It Works Section === */}
        <section id="how-it-works" className="py-24 lg:py-32 bg-white dark:bg-[#111] border-t border-gray-100 dark:border-[#333]">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">{t("how_it_works.badge")}</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 dark:text-white">{t("how_it_works.title")}</h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-light">
                {t("how_it_works.subtitle")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {t.raw("how_it_works.steps").map((step: any, i: number) => {
                const icons = [Upload, Search, Send];
                const Icon = icons[i];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.2, duration: 0.6, ease: "easeOut" }}
                    className="relative bg-[#FDFDFC] dark:bg-[#0a0a0a] rounded-[2rem] p-8 border border-gray-100 dark:border-[#333] hover:border-gray-200 dark:hover:border-[#555] transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-[#111111] dark:bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5 text-white dark:text-[#111]" />
                      </div>
                      <span className="text-5xl font-bold text-gray-100 dark:text-[#222] select-none">{step.step}</span>
                    </div>
                    <h3 className="text-xl font-medium mb-3 dark:text-white">{step.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-light text-sm">{step.desc}</p>
                    {i < 2 && (
                      <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-10">
                        <ArrowUpRight className="w-5 h-5 text-gray-300 dark:text-[#444] rotate-0" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* === Feature Section === */}
        <section id="features" className="py-24 lg:py-32 bg-[#FDFDFC] dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#333]">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">{t("features.badge")}</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 dark:text-white">{t("features.title")}</h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-light">
                {t("features.subtitle")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(t.raw("features.items")).map(([key, item]: [string, any], i) => {
                const icons = { gap: Target, tone: PenTool, zap: Zap };
                const Icon = icons[key as keyof typeof icons];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.2, duration: 0.6, ease: "easeOut" }}
                    className="bg-[#F9F8F6] dark:bg-[#1C1C1A] rounded-[2rem] p-8 border border-gray-100 dark:border-[#333] hover:border-gray-200 dark:hover:border-[#555] transition-colors"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-[#333] mb-6">
                      <Icon className="w-6 h-6 text-[#111111] dark:text-white" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3 dark:text-white">{item.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-light">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* === Scout Mode Section === */}
        <section className="py-10 pb-32">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-[#1C1C1A] rounded-[3rem] p-10 md:p-16 text-white grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
            >
              <div className="relative z-10">
                <span className="text-gray-400 font-bold tracking-wider text-xs mb-4 block uppercase">{t("scout.badge")}</span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 leading-tight text-white">
                  {t("scout.title")}
                </h2>
                <p className="text-gray-400 text-lg mb-8 font-light leading-relaxed">
                  {t("scout.subtitle")}
                </p>
                <div className="space-y-4 mb-10">
                  {t.raw("scout.items").map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard">
                  <Button className="rounded-full bg-white text-[#111111] hover:bg-gray-100 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                    {t("scout.cta")} <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="relative hidden lg:block h-[450px] rounded-3xl overflow-hidden border border-white/10">
                <Image src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80" alt="Scout mode" fill className="object-cover opacity-80 hover:scale-105 transition-transform duration-700" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* === Testimonials Section === */}
        <section className="py-24 lg:py-32 bg-[#111111] text-[#FDFDFC]" id="testimonials">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
              <div className="max-w-2xl">
                <span className="text-gray-500 font-bold tracking-wider text-xs mb-4 block uppercase flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {t("testimonials.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.1]">
                  {t("testimonials.title")}
                </h2>
              </div>
              <div className="text-gray-400 font-light max-w-sm text-lg">
                {t("testimonials.subtitle")}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
              {t.raw("testimonials.items").map((testi: any, i: number) => {
                const avatars = [
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80"
                ];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                    className="group flex flex-col justify-between"
                  >
                    <div className="mb-12">
                      <div className="h-[1px] w-full bg-white/20 mb-10 group-hover:bg-white/40 transition-colors duration-700" />
                      <p className="text-gray-300 text-lg md:text-xl font-light leading-relaxed">
                        &ldquo;{testi.quote}&rdquo;
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full overflow-hidden relative border border-white/20">
                        <Image src={avatars[i % avatars.length]} alt={testi.author} fill className="object-cover" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{testi.author}</h4>
                        <p className="text-gray-500 text-xs mt-0.5 tracking-wide">{testi.role}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
        {/* === Pricing Section === */}
        <section id="pricing" className="py-24 lg:py-32 bg-[#FDFDFC] dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#333]">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">{t("pricing.badge")}</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 dark:text-white">{t("pricing.title")}</h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-light">
                {t("pricing.subtitle")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-[#F9F8F6] dark:bg-[#1C1C1A] rounded-[2rem] p-10 border border-gray-100 dark:border-[#333] flex flex-col"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-medium mb-2 dark:text-white">{t("pricing.free.title")}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-bold tracking-tight text-[#111] dark:text-white">{t("pricing.free.price")}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-light">{t("pricing.free.description")}</p>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {t.raw("pricing.free.features").map((feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gray-300 dark:text-[#444] shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full rounded-full border-gray-200 dark:border-[#333] text-[#111] dark:text-white hover:bg-gray-50 dark:hover:bg-[#111] h-12 text-base font-medium">
                    {t("pricing.free.button")}
                  </Button>
                </Link>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="bg-[#111111] dark:bg-white text-white dark:text-[#111] rounded-[2rem] p-10 border border-[#222] dark:border-gray-200 shadow-2xl relative flex flex-col"
              >
                <div className="absolute top-0 right-10 transform -translate-y-1/2">
                  <div className="bg-emerald-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-2xl font-medium mb-2">{t("pricing.pro.title")}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-5xl font-bold tracking-tight">{t("pricing.pro.price")}</span>
                    <span className="text-gray-400 dark:text-gray-500">{t("pricing.pro.period")}</span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 font-light">{t("pricing.pro.description")}</p>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {t.raw("pricing.pro.features").map((feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-gray-200 dark:text-[#333] text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login">
                  <Button className="w-full rounded-full bg-white dark:bg-[#111] text-[#111] dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] h-12 text-base font-medium">
                    {t("pricing.pro.button")}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* === FAQ Section === */}
        <section className="py-24 lg:py-32 bg-[#FDFDFC] dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#333]">
          <div className="max-w-3xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center mb-16"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">{t("faq.badge")}</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight dark:text-white">{t("faq.title")}</h2>
            </motion.div>

            <div className="space-y-4">
              {t.raw("faq.items").map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="border border-gray-100 dark:border-[#333] rounded-2xl overflow-hidden bg-white dark:bg-[#111] hover:border-gray-200 dark:hover:border-[#444] transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="text-base font-medium text-[#111] dark:text-white pr-4">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${openFaq === i ? "max-h-48 pb-5" : "max-h-0"}`}>
                    <p className="px-6 text-gray-500 dark:text-gray-400 font-light leading-relaxed text-sm">
                      {item.a}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === Final CTA Section === */}
        <section className="pb-12 pt-6 bg-[#FDFDFC] dark:bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#111111] dark:bg-[#1C1C1A] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden border border-[#333]">
              <div className="absolute inset-0 opacity-10">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)`,
                  }}
                />
              </div>
              <div className="relative z-10 max-w-3xl mx-auto">
                <Logo variant="white" className="mx-auto" />
                <h2 className="text-5xl md:text-6xl font-medium tracking-tight mb-8 text-white leading-tight mt-10">
                  {t("cta.title")}
                </h2>
                <p className="text-xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                  {t("cta.subtitle")}
                </p>
                <Link href="/login">
                  <Button className="rounded-full bg-white text-[#111] hover:bg-gray-200 hover:scale-105 transform transition-all duration-300 h-14 px-10 text-base font-medium flex items-center gap-2 mx-auto shadow-2xl shadow-white/10">
                    {t("cta.button")} <ArrowUpRight className="w-5 h-5" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 font-light mt-6">
                  {t("cta.footer")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* === Rich Footer === */}
      <footer className="border-t border-gray-100 dark:border-[#333] bg-[#FDFDFC] dark:bg-[#0a0a0a] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div>
              <Logo />
              <p className="text-gray-400 text-sm mt-4 font-light leading-relaxed max-w-[200px]">
                AI-powered career navigation for the modern professional.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111] dark:text-white mb-4 uppercase tracking-wider">{t("footer.product")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="#features" className="hover:text-[#111] dark:hover:text-white transition-colors">{t("footer.product_features")}</Link></li>
                <li><Link href="#how-it-works" className="hover:text-[#111] dark:hover:text-white transition-colors">{t("footer.product_explore")}</Link></li>
                <li><Link href="#pricing" className="hover:text-[#111] dark:hover:text-white transition-colors">{t("footer.product_pricing")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111] dark:text-white mb-4 uppercase tracking-wider">{t("footer.resources")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <li><span className="text-gray-300 dark:text-gray-600 cursor-default">{t("footer.resources_docs")}</span></li>
                <li><span className="text-gray-300 dark:text-gray-600 cursor-default">{t("footer.resources_blog")}</span></li>
                <li><span className="text-gray-300 dark:text-gray-600 cursor-default">{t("footer.resources_changelog")}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111] dark:text-white mb-4 uppercase tracking-wider">{t("footer.legal")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <li><span className="text-gray-300 dark:text-gray-600 cursor-default">{t("footer.legal_privacy")}</span></li>
                <li><span className="text-gray-300 dark:text-gray-600 cursor-default">{t("footer.legal_terms")}</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-[#333] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
