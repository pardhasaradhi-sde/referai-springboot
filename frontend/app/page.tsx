"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Menu, X } from "lucide-react";
import { MatchmakingWorkflow } from "@/components/landing/MatchmakingWorkflow";
import { NetworkDemo } from "@/components/landing/NetworkDemo";
import { ReferralAsk } from "@/components/landing/ReferralAsk";
import { Footer } from "@/components/landing/Footer";
import { Magnetic } from "@/components/landing/Magnetic";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SocialProof } from "@/components/landing/SocialProof";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#engine", label: "Under the Hood" },
    { href: "#network", label: "The Network" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-brand-accent selection:text-black">

      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <Magnetic strength={0.2}>
          <Link href="/" className="text-xl font-black tracking-tighter uppercase">ReferAI</Link>
        </Magnetic>

        {/* Desktop links */}
        <div className="hidden md:flex gap-12 text-xs font-bold uppercase tracking-widest text-gray-500">
          {navLinks.map(l => (
            <Magnetic key={l.href} strength={0.2}>
              <Link href={l.href} className="hover:text-black transition-colors block">{l.label}</Link>
            </Magnetic>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Magnetic strength={0.2}>
            <Link href="/auth/signup" className="btn-primary hidden sm:block">
              Get Started Free
            </Link>
          </Magnetic>
          {/* Hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white pt-28 px-8 md:hidden flex flex-col"
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-4xl font-black uppercase tracking-tighter py-3 border-b border-gray-100 hover:text-gray-400 transition-colors"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto pb-12">
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full flex items-center justify-center gap-3 text-lg h-16"
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO ─── */}
      <section className="pt-40 pb-24 px-4 md:px-12 max-w-[1600px] mx-auto min-h-[90vh] flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl"
        >
          <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
            For job seekers who are done being ignored
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-[11vw] leading-[0.85] font-black tracking-tighter mb-12">
            BREAK THE <br />
            <span className="text-gray-200">HIRING WALL.</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <div className="md:col-span-6">
              <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed mb-3">
                95% of jobs are filled through referrals. <br />
                You&apos;re applying blind into an ATS that never reads your resume.
              </p>
              <p className="text-lg text-gray-400 font-medium leading-relaxed">
                ReferAI finds the right employee at your target company — and helps you reach them with a message that actually gets a reply.
              </p>
            </div>
            <div className="md:col-span-6 flex flex-col md:flex-row gap-4 justify-end">
              <Link href="/auth/signup" className="btn-primary flex items-center justify-between gap-12 group h-20 text-lg">
                Get Your First Referral <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Pain point cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 mt-20">
            {[
              { pain: "You applied to 50 companies.", fix: "A referred candidate applied to 2. They got the call." },
              { pain: "Your resume was perfect.", fix: "It was filtered by ATS before a human ever saw it." },
              { pain: "You have the skills.", fix: "But without a name attached, you're invisible." },
            ].map((item, i) => (
              <div key={i} className={`px-8 py-8 border-b md:border-b-0 border-gray-200 ${i < 2 ? "md:border-r" : ""}`}>
                <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2 line-through">{item.pain}</p>
                <p className="text-sm font-bold text-gray-800 leading-snug">{item.fix}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* ─── UNDER THE HOOD: Match Engine ─── */}
      <section id="engine" className="bg-white text-black min-h-[80vh] py-24 px-4 md:px-12 border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-8">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Under the Hood — AI Match Engine
            </div>
            <h2 className="text-[8vw] leading-[0.85] font-black tracking-tighter mb-12">
              NOT LUCK. <br />
              A PIPELINE.
            </h2>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end">
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              Your resume becomes a 768-dimension fingerprint. We find referrers whose real experience is closest to yours. Then our LLM evaluates the top 10 by actual skill overlap and probability of them helping. No keyword games. No random results.
            </p>
            <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-8">
              <div>
                <span className="block text-4xl font-black text-black mb-1">768</span>
                <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Dimensions per Resume</span>
              </div>
              <div>
                <span className="block text-4xl font-black text-brand-accent mb-1">2-pass</span>
                <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">LLM Re-ranking</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-24 w-full">
          <MatchmakingWorkflow />
        </div>
      </section>

      {/* ─── THE NETWORK ─── */}
      <section id="network" className="border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
          <div className="p-12 md:p-24 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Step 02 — Referrer Discovery
            </div>
            <div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">THE<br />NETWORK</h2>
              <p className="text-lg text-gray-500 max-w-md leading-relaxed">
                Every person on ReferAI opted in to help. Browse real employees at your target companies, see your AI match score before you send a single word, and connect with confidence — not cold despair.
              </p>
            </div>
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-16 h-16 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center font-bold text-lg">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Active Referrers on Platform</span>
            </div>
          </div>
          <div className="bg-brand-gray p-12 md:p-24 flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-md relative z-10">
              <NetworkDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE MESSAGE ─── */}
      <section id="draft" className="border-t border-b border-gray-200 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
          <div className="bg-gray-50 p-12 md:p-24 flex items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 order-2 md:order-1">
            <div className="w-full relative z-10">
              <ReferralAsk />
            </div>
          </div>
          <div className="p-12 md:p-24 flex flex-col justify-center order-1 md:order-2">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Step 03 — Outreach Generation
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-8 leading-tight">THE MESSAGE<br />THEY REPLY TO.</h2>
            <p className="text-lg text-gray-500 max-w-md leading-relaxed mb-12">
              Our AI reads your resume, the referrer&apos;s full background, your shared skills, and the job description — then writes a message that sounds like you wrote it yourself. Referrers can tell the difference between a template and a real person. This is the real person.
            </p>
            <ul className="space-y-4">
              {["Seniority-Aware Tone", "Shared Skill Anchoring", "First-Person Authenticity"].map(item => (
                <li key={item} className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider">
                  <Zap className="w-4 h-4" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF (before features — trust first) ─── */}
      <SocialProof />

      {/* ─── FEATURES GRID ─── */}
      <FeaturesGrid />

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-4 text-center bg-white border-t border-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-8xl font-black tracking-tighter mb-6 uppercase text-gray-900 leading-[0.9]">
            Your resume isn&apos;t<br /> the problem.<br /><span className="text-gray-300">The system is.</span>
          </h2>
          <p className="text-lg text-gray-500 font-medium mb-12 max-w-xl mx-auto leading-relaxed">
            Every day you apply cold, someone with a referral is getting your interview. ReferAI puts you in that seat — in under 5 minutes.
          </p>
          <div className="relative z-10">
            <Link
              href="/auth/signup"
              className="inline-block bg-brand-accent text-black font-black text-xl px-16 py-8 tracking-tight rounded-xl shadow-[0_10px_40px_rgba(196,248,42,0.3)] hover:-translate-y-1 transition-all hover:shadow-[0_15px_50px_rgba(196,248,42,0.5)] uppercase"
            >
              Get Your First Referral →
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6 font-bold uppercase tracking-widest">Free to start. No credit card.</p>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <Footer />
    </div>
  );
}
