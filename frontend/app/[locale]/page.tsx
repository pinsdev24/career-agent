"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Menu, Briefcase, FileText, CheckCircle2, Zap, Target, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#111111] font-sans selection:bg-orange-500/30 overflow-hidden">
      {/* Subtle Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
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

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="#product" className="hover:text-black transition-colors">{t("nav.product")}</Link>
          <Link href="#features" className="hover:text-black transition-colors">{t("nav.features")}</Link>
          <Link href="#testimonials" className="hover:text-black transition-colors">{t("nav.testimonials")}</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button className="rounded-full bg-[#111111] text-white hover:bg-gray-800 px-6 h-10 text-sm font-medium flex items-center gap-2 transition-all">
              {t("nav.dashboard")} <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
          <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-gray-200">
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      <main className="relative z-10">
        {/* === Hero Section === */}
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-24" id="product">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl font-medium tracking-tight leading-[1.05]">
              {t("hero.title_start")} <br className="hidden md:block" /> {t("hero.title_end")}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
              {t("hero.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button className="rounded-full bg-[#111111] text-white hover:bg-gray-800 hover:scale-105 transition-all duration-300 px-8 h-12 text-base font-medium flex items-center gap-2">
                  {t("hero.cta_primary")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                  {t("hero.cta_secondary")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Visuals Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-8 bg-[#A8A49C]/20 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
              <div className="absolute inset-0 z-0">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80"
                  alt="Candidate"
                  fill
                  className="object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[400px]">
                <div className="flex items-center justify-between">
                  <span className="bg-white dark:bg-[#111]/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> {t("visuals.opportunities")}
                  </span>
                  <span className="bg-white backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-white/20 hover:bg-white dark:bg-[#111]/30 transition-colors cursor-pointer">
                    {t("visuals.apply_now")} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>

                <div className="mt-auto pt-24 text-white">
                  <h2 className="text-4xl text-white md:text-5xl font-medium tracking-tight mb-4 max-w-xl">
                    {t("visuals.efficiency_title")}
                  </h2>
                  <p className="text-white/80 max-w-md text-sm md:text-base font-light">
                    {t("visuals.efficiency_desc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-[#1C1C1A] text-white rounded-[2.5rem] p-8 relative overflow-hidden flex-1 group">
                <div className="absolute top-0 right-0 p-6">
                  <span className="bg-white dark:bg-[#111]/10 px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-1">
                    {t("visuals.dream_company")} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="absolute inset-0 z-0">
                  <Image
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
                    alt="Company Building"
                    fill
                    className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1A] to-transparent opacity-80" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <h3 className="text-2xl font-medium tracking-tight mb-2">Acme Corp.</h3>
                  <div className="mt-6 flex gap-2 items-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Success</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F4F3F0] border border-[#E8E6E1] rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-medium tracking-tight mb-3">{t("visuals.maximize_title")}</h3>
                  <p className="text-gray-500 text-sm font-light">
                    {t("visuals.maximize_desc")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white dark:bg-[#111] rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 transition-transform cursor-pointer group">
                    <Briefcase className="w-5 h-5 text-gray-400 group-hover:text-[#111111] transition-colors" />
                    <span className="text-sm font-medium">{t("visuals.full_time")}</span>
                  </div>

                  <div className="bg-[#111111] text-white rounded-2xl p-4 flex flex-col text-left gap-2 justify-end relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1">
                    <div className="absolute top-3 right-3">
                      <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <FileText className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-sm font-medium leading-tight text-white">{t("visuals.freelance")}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* === Feature Section === */}
        <section id="features" className="py-32 bg-white dark:bg-[#111] relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">{t("features.badge")}</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">{t("features.title")}</h2>
              <p className="text-xl text-gray-500 font-light">
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
                    className="bg-[#F9F8F6] rounded-[2rem] p-8 border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-gray-100 mb-6">
                      <Icon className="w-6 h-6 text-[#111111]" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed font-light">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* === Architecture Section === */}
        <section className="py-24 lg:py-32 bg-[#FDFDFC] border-t border-[#E8E6E1]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
              <div className="lg:col-span-4 lg:sticky lg:top-32">
                <span className="text-gray-400 font-bold tracking-wider text-xs mb-4 block uppercase flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#111111] rounded-full" />
                  {t("architecture.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 leading-[1.1] text-[#111111]">
                  {t("architecture.title")}
                </h2>
                <p className="text-gray-500 text-lg font-light leading-relaxed max-w-sm">
                  {t("architecture.subtitle")}
                </p>
              </div>

              <div className="lg:col-span-1" />

              <div className="lg:col-span-7 space-y-24 lg:space-y-32">
                {Object.entries(t.raw("architecture.steps")).map(([key, step]: [string, any], i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="group"
                  >
                    <div className="flex items-center gap-6 mb-8 lg:mb-10">
                      <span className="text-sm font-medium text-gray-400">0{i + 1}</span>
                      <div className="h-[1px] bg-[#E8E6E1] flex-1 group-hover:bg-[#111111] transition-colors duration-700" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                      <div>
                        <h3 className="text-2xl font-medium text-[#111111] mb-4">{step.title}</h3>
                        <p className="text-gray-500 font-light leading-relaxed">{step.desc}</p>
                      </div>
                      <div className="bg-[#F4F3F0] rounded-[2rem] p-8 aspect-square border border-black/5" />
                    </div>
                  </motion.div>
                ))}
              </div>
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
                      <CheckCircle2 className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard">
                  <Button className="rounded-full bg-white dark:bg-[#111] text-[#111111] hover:bg-gray-100 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                    {t("scout.cta")} <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="relative hidden lg:block h-[450px] rounded-3xl overflow-hidden border border-white/10" />
            </motion.div>
          </div>
        </section>

        {/* === Testimonials Section === */}
        <section className="py-24 lg:py-32 bg-[#111111] text-[#FDFDFC]" id="testimonials">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
              <div className="max-w-2xl">
                <span className="text-gray-500 font-bold tracking-wider text-xs mb-4 block uppercase flex items-center gap-2">
                  <div className="w-2 h-2 bg-white dark:bg-[#111] rounded-full animate-pulse" />
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
              {t.raw("testimonials.items").map((testi: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                  className="group flex flex-col justify-between"
                >
                  <div className="mb-12">
                    <div className="h-[1px] w-full bg-white mb-10 group-hover:bg-white dark:bg-[#111]/30 transition-colors duration-700" />
                    <p className="text-gray-300 text-lg md:text-xl font-light leading-relaxed">
                      "{testi.quote}"
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden relative border border-white/20" />
                    <div>
                      <h4 className="text-white font-medium text-sm">{testi.author}</h4>
                      <p className="text-gray-500 text-xs mt-0.5 tracking-wide">{testi.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === Final CTA Section === */}
        <section className="pb-12 pt-6 bg-[#FDFDFC]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#F4F3F0] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden border border-[#E8E6E1]">
              <div className="relative z-10 max-w-3xl mx-auto">
                <Logo />
                <h2 className="text-5xl md:text-6xl font-medium tracking-tight mb-8 text-[#111111] leading-tight mt-10">
                  {t("cta.title")}
                </h2>
                <p className="text-xl text-gray-500 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                  {t("cta.subtitle")}
                </p>
                <Link href="/login">
                  <Button className="rounded-full bg-[#111111] text-white hover:bg-black hover:scale-105 transform transition-all duration-300 h-14 px-10 text-base font-medium flex items-center gap-2 mx-auto shadow-2xl shadow-black/10">
                    {t("cta.button")} <ArrowUpRight className="w-5 h-5" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-400 font-light mt-6">
                  {t("cta.footer")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-[#FDFDFC] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo />
          <p className="text-gray-400 text-sm">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
