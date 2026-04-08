"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Menu, Search, Briefcase, FileText, CheckCircle2, ChevronRight, Zap, Target, PenTool, Sparkles, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function LandingPage() {
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
          <Link href="#product" className="hover:text-black transition-colors">Product</Link>
          <Link href="#features" className="hover:text-black transition-colors">Features</Link>
          <Link href="#testimonials" className="hover:text-black transition-colors">Success Stories</Link>
          {/* <Link href="#pricing" className="hover:text-black transition-colors">Pricing</Link> */}
          {/* <Link href="#about" className="hover:text-black transition-colors">About</Link> */}
        </nav>

        <div className="flex items-center gap-4">
          {/* <button className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-transparent border border-gray-200 hover:border-gray-300 transition-colors">
              <Search className="w-4 h-4 text-gray-600" />
            </button> */}
          <Link href="/dashboard">
            <Button className="rounded-full bg-[#111111] text-white hover:bg-gray-800 px-6 h-10 text-sm font-medium flex items-center gap-2 transition-all">
              Dashboard <ArrowUpRight className="w-4 h-4" />
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
              Where Your Career <br className="hidden md:block" /> Path is Built.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
              Escape the job search labyrinth. We bring your professional value to the forefront by combining proven application strategies with intelligent AI analysis.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button className="rounded-full bg-[#111111] text-white hover:bg-gray-800 hover:scale-105 transition-all duration-300 px-8 h-12 text-base font-medium flex items-center gap-2">
                  Find your next role <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                  How it works <ArrowUpRight className="w-4 h-4" />
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
            {/* Main Visual Card */}
            <div className="lg:col-span-8 bg-[#A8A49C]/20 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
              <div className="absolute inset-0 z-0">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80"
                  alt="Candidate preparing for interview"
                  fill
                  className="object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[400px]">
                <div className="flex items-center justify-between">
                  <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> Job Opportunities
                  </span>
                  <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                    Apply now <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>

                <div className="mt-auto pt-24 text-white">
                  <h2 className="text-4xl text-white md:text-5xl font-medium tracking-tight mb-4 max-w-xl">
                    Efficiently transform your application experience.
                  </h2>
                  <p className="text-white/80 max-w-md text-sm md:text-base font-light">
                    Ariadne is the personal Career Assistant that automates your cover letters and skill matching, so you stay focused on acing the interviews.
                  </p>

                  {/* Floating Tags */}
                  <div className="flex flex-wrap gap-3 mt-8">
                    {[
                      { role: 'Product Manager', status: 'Offer Received', img: '1534528741775-53994a69daeb' },
                      { role: 'Frontend Dev', status: 'Final Stage', img: '1506794778202-cad84cf45f1d' },
                      { role: 'UX Designer', status: 'Screening', img: '1494790108377-be9c29b29330' },
                    ].map((item, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + (i * 0.1) }}
                        key={i}
                        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full pr-4 pl-1 auto py-1"
                      >
                        <Image
                          src={`https://images.unsplash.com/photo-${item.img}?auto=format&fit=crop&w=100&q=80`}
                          alt="avatar"
                          width={28}
                          height={28}
                          className="rounded-full object-cover w-7 h-7"
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold leading-tight text-white">{item.role}</span>
                          <span className="text-[9px] text-emerald-300 leading-tight">{item.status}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Information Cards */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Dark Card */}
              <div className="bg-[#1C1C1A] text-white rounded-[2.5rem] p-8 relative overflow-hidden flex-1 group">
                <div className="absolute top-0 right-0 p-6">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-1">
                    Dream Company <ArrowUpRight className="w-3 h-3" />
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
                  <p className="text-white/60 text-sm font-light">Global Tech Leader</p>
                  <div className="mt-6 flex gap-2 items-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Interview successfully passed</span>
                  </div>
                </div>
              </div>

              {/* Light Grid Card */}
              <div className="bg-[#F4F3F0] border border-[#E8E6E1] rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-medium tracking-tight mb-3">Maximize Your Potential.</h3>
                  <p className="text-gray-500 text-sm font-light">
                    Leverage our intelligent matching models to find the perfect role wherever you want - starting in just minutes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col items-center justify-center text-center gap-2 hover:-translate-y-1 transition-transform cursor-pointer group">
                    <Briefcase className="w-5 h-5 text-gray-400 group-hover:text-[#111111] transition-colors" />
                    <span className="text-sm font-medium">Full-time Roles</span>
                  </div>

                  <div className="bg-[#111111] text-white rounded-2xl p-4 flex flex-col text-left gap-2 justify-end relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1">
                    <div className="absolute top-3 right-3">
                      <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <FileText className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-sm font-medium leading-tight text-white">Freelance & <br /> Contracts</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* === Scrolling Feature Section 1 === */}
        <section id="features" className="py-32 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <span className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 block">The Intelligence</span>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">A multi-agent system working just for your success.</h2>
              <p className="text-xl text-gray-500 font-light">
                Ariadne doesn't just use templates. Our specialized AI agents analyze, match, write, and review your applications uniquely for every offer.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Smart Gap Analysis",
                  desc: "We analyze the semantic match between your CV and the job description, giving you a precise percentage score and identifying exact missing skills to highlight."
                },
                {
                  icon: PenTool,
                  title: "Hyper-Personalization",
                  desc: "Our writer agent crafts compelling cover letters using a 3-act structure. It learns your personal Tone of Voice from your feedback to sound exactly like you."
                },
                {
                  icon: Zap,
                  title: "Human-in-the-Loop",
                  desc: "You retain total control. Ariadne writes the drafts, but you approve, edit, and review before any application is finalized."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.2, duration: 0.6, ease: "easeOut" }}
                  className="bg-[#F9F8F6] rounded-[2rem] p-8 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 mb-6">
                    <feature.icon className="w-6 h-6 text-[#111111]" />
                  </div>
                  <h3 className="text-2xl font-medium mb-3">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed font-light">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === Editorial Architecture Section === */}
        <section className="py-24 lg:py-32 bg-[#FDFDFC] border-t border-[#E8E6E1]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">

              {/* Left Title Column - Sticky */}
              <div className="lg:col-span-4 lg:sticky lg:top-32">
                <span className="text-gray-400 font-bold tracking-wider text-xs mb-4 block uppercase flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#111111] rounded-full" />
                  System Architecture
                </span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 leading-[1.1] text-[#111111]">
                  A pipeline built for precision.
                </h2>
                <p className="text-gray-500 text-lg font-light leading-relaxed max-w-sm">
                  Ariadne abandons generic AI wrappers for a specialized multi-agent architecture. Every application is parsed, scored, and rewritten with surgical accuracy.
                </p>
              </div>

              {/* Right Content Column */}
              <div className="lg:col-span-1" /> {/* Spacer */}

              <div className="lg:col-span-7 space-y-24 lg:space-y-32">

                {/* Feature 01 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="group"
                >
                  <div className="flex items-center gap-6 mb-8 lg:mb-10">
                    <span className="text-sm font-medium text-gray-400">01</span>
                    <div className="h-[1px] bg-[#E8E6E1] flex-1 group-hover:bg-[#111111] transition-colors duration-700" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                    <div>
                      <h3 className="text-2xl font-medium text-[#111111] mb-4">Deep Semantic Matching</h3>
                      <p className="text-gray-500 font-light leading-relaxed">
                        Ariadne doesn't search for keywords. The Matcher Agent converts your resume and target job descriptions into high-dimensional vector embeddings to analyze the underlying conceptual fit, identifying exact skill gaps before writing begins.
                      </p>
                    </div>
                    <div className="bg-[#F4F3F0] rounded-[2rem] p-8 aspect-square flex flex-col justify-center border border-black/5 relative overflow-hidden">
                      <div className="space-y-5 relative z-10 w-full">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-500 font-medium tracking-wide uppercase">Vector Alignment</span>
                            <span className="font-bold text-[#111111]">94%</span>
                          </div>
                          <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-[94%] h-full bg-[#111111]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-500 font-medium tracking-wide uppercase">Experience Gap</span>
                            <span className="font-medium text-gray-400">Resolved</span>
                          </div>
                          <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gray-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 02 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="group"
                >
                  <div className="flex items-center gap-6 mb-8 lg:mb-10">
                    <span className="text-sm font-medium text-gray-400">02</span>
                    <div className="h-[1px] bg-[#E8E6E1] flex-1 group-hover:bg-[#111111] transition-colors duration-700" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                    <div>
                      <h3 className="text-2xl font-medium text-[#111111] mb-4">Tone of Voice Memory</h3>
                      <p className="text-gray-500 font-light leading-relaxed">
                        It learns how you sound. Every time you review and tweak a cover letter, the Human-in-the-Loop system commits your stylistic choices to memory. Subsequent applications naturally adopt your unique voice, eliminating the generic AI tone entirely.
                      </p>
                    </div>
                    <div className="bg-[#F4F3F0] rounded-[2rem] p-8 aspect-square flex flex-col items-center justify-center border border-black/5 relative overflow-hidden">
                      <div className="w-full max-w-[200px] border border-dashed border-gray-300 rounded-xl p-5 space-y-4">
                        <div className="w-3/4 h-2 bg-gray-300 rounded-full" />
                        <div className="w-full h-2 bg-gray-200 rounded-full" />
                        <div className="w-5/6 h-2 bg-[#111111] rounded-full" />
                        <div className="flex justify-end pt-2">
                          <div className="text-[10px] font-bold tracking-wider uppercase text-[#111111] bg-white px-3 py-1.5 border border-gray-200 rounded-md shadow-sm">
                            Style Sync
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Feature 03 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="group"
                >
                  <div className="flex items-center gap-6 mb-8 lg:mb-10">
                    <span className="text-sm font-medium text-gray-400">03</span>
                    <div className="h-[1px] bg-[#E8E6E1] flex-1 group-hover:bg-[#111111] transition-colors duration-700" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                    <div>
                      <h3 className="text-2xl font-medium text-[#111111] mb-4">The Critic Agent Audit</h3>
                      <p className="text-gray-500 font-light leading-relaxed">
                        Nothing leaves the pipeline unverified. An autonomous Critic Agent audits every drafted letter across 5 strict dimensions: professionalism, relevance, clarity, tone, and accuracy. If it falls below a 75/100, the rewrite cycle begins instantly.
                      </p>
                    </div>
                    <div className="bg-[#F4F3F0] rounded-[2rem] p-8 aspect-square flex flex-col justify-center items-center border border-black/5 relative">
                      <div className="flex items-center gap-3 mb-6 w-full max-w-[180px]">
                        <div className="w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center relative">
                          <div className="absolute inset-0 border-2 border-red-400 rounded-full animate-ping opacity-20" />
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        </div>
                        <div className="h-[1px] bg-gray-300 flex-1 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded text-[9px] font-bold tracking-wider text-gray-400 border border-gray-100 uppercase">
                            Reject
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#111111] shadow-md flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        </section>

        {/* === Scrolling Feature Section 2 (Explore Mode) === */}
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
                <span className="text-gray-400 font-bold tracking-wider text-xs mb-4 block uppercase">Mode Exploration</span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 leading-tight text-white">
                  Let Ariadne find the opportunities.
                </h2>
                <p className="text-gray-400 text-lg mb-8 font-light leading-relaxed">
                  Don't have a specific offer link? Just drop your CV. Our Scout Agent browses the web, matches relevant roles against your profile, and presents you the top options.
                </p>
                <div className="space-y-4 mb-10">
                  {[
                    'Automated Web Scraping via Tavily',
                    'Contextual Vector Embeddings',
                    'Expires after 7 days automatically'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard">
                  <Button className="rounded-full bg-white text-[#111111] hover:bg-gray-100 px-8 h-12 text-base font-medium flex items-center gap-2 transition-all">
                    Try Explore Mode <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Right Side Visual - Clean Lattice Style */}
              <div className="relative hidden lg:block h-[450px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                  alt="Analyzing opportunities"
                  fill
                  className="object-cover opacity-60"
                />

                {/* Clean UI Overlay */}
                <div className="absolute inset-x-6 bottom-6 bg-[#111111]/90 backdrop-blur-md rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-white text-sm font-medium">Scout Agent Active</span>
                    </div>
                    <span className="bg-white/10 text-white text-xs font-medium px-2.5 py-1 rounded-full">Top Matches</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                      <div>
                        <p className="text-white text-sm font-medium">Product Designer</p>
                        <p className="text-gray-400 text-xs mt-0.5">Stripe • Remote</p>
                      </div>
                      <span className="text-[#FDFDFC] font-medium bg-emerald-500/20 px-3 py-1 rounded-full text-xs border border-emerald-500/20">92% Match</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                      <div>
                        <p className="text-white text-sm font-medium">UX Researcher</p>
                        <p className="text-gray-400 text-xs mt-0.5">Vercel • New York</p>
                      </div>
                      <span className="text-[#FDFDFC] font-medium bg-emerald-500/20 px-3 py-1 rounded-full text-xs border border-emerald-500/20">85% Match</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* === Editorial Testimonials Section === */}
        <section className="py-24 lg:py-32 bg-[#111111] text-[#FDFDFC]" id="testimonials">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
              <div className="max-w-2xl">
                <span className="text-gray-500 font-bold tracking-wider text-xs mb-4 block uppercase flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Candidate Stories
                </span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.1]">
                  Careers launched by Ariadne.
                </h2>
              </div>
              <div className="text-gray-400 font-light max-w-sm text-lg">
                Join thousands of professionals who have already escaped the job search labyrinth.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
              {[
                {
                  quote: "Ariadne transformed my job hunt. I dropped my CV, and it matched me with 5 roles I loved. The cover letters were pristine.",
                  author: "Sarah J.", role: "Product Manager",
                  image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&facepad=2&w=100&h=100&q=80"
                },
                {
                  quote: "The Tone of Voice Memory is wild. After two applications, the agent started writing exactly like I do, but sharper.",
                  author: "Michael T.", role: "Frontend Engineer",
                  image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&facepad=2&w=100&h=100&q=80"
                },
                {
                  quote: "I used to spend 2 hours tailoring my CV and letters per job. Now it takes me 5 minutes to review and approve.",
                  author: "Elena R.", role: "Data Scientist",
                  image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&facepad=2&w=100&h=100&q=80"
                }
              ].map((testi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                  className="group flex flex-col justify-between"
                >
                  <div className="mb-12">
                    <div className="h-[1px] w-full bg-white/10 mb-10 group-hover:bg-white/30 transition-colors duration-700" />
                    <p className="text-gray-300 text-lg md:text-xl font-light leading-relaxed">
                      "{testi.quote}"
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden relative border border-white/20">
                      <Image
                        src={testi.image}
                        alt={testi.author}
                        fill
                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      />
                    </div>
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
              {/* Subtle background decoration */}
              <div
                className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #000 1px, transparent 1px),
                    linear-gradient(to bottom, #000 1px, transparent 1px)
                  `,
                  backgroundSize: "6rem 6rem"
                }}
              />

              <div className="relative z-10 max-w-3xl mx-auto">
                <div className="flex justify-center mb-10">
                  <Logo />
                </div>
                <h2 className="text-5xl md:text-6xl font-medium tracking-tight mb-8 text-[#111111] leading-tight">
                  Stop applying in the dark.
                </h2>
                <p className="text-xl text-gray-500 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
                  Join the elite professionals using Ariadne's multi-agent architecture to navigate the job market with absolute precision.
                </p>
                <Link href="/login">
                  <Button className="rounded-full bg-[#111111] text-white hover:bg-black hover:scale-105 transform transition-all duration-300 h-14 px-10 text-base font-medium flex items-center gap-2 mx-auto shadow-2xl shadow-black/10">
                    Enter the Labyrinth <ArrowUpRight className="w-5 h-5" />
                  </Button>
                </Link>
                <p className="text-sm text-gray-400 font-light mt-6">
                  No credit card required. Free to explore.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-[#FDFDFC] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo />
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Ariadne. Elevating job seekers globally.
          </p>
        </div>
      </footer>
    </div>
  );
}
