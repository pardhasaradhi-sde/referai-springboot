"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { MatchmakingWorkflow } from "@/components/landing/MatchmakingWorkflow";
import { NetworkDemo } from "@/components/landing/NetworkDemo";
import { ReferralAsk } from "@/components/landing/ReferralAsk";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-brand-accent selection:text-black">
      {/* Navigation - Minimal & Sticky */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <span className="text-xl font-black tracking-tighter uppercase">ReferAI</span>
        <div className="hidden md:flex gap-12 text-xs font-bold uppercase tracking-widest text-gray-500">
          <Link href="#network" className="hover:text-black transition-colors">The Network</Link>
          <Link href="#engine" className="hover:text-black transition-colors">The Logic</Link>
          <Link href="#draft" className="hover:text-black transition-colors">The Ask</Link>
        </div>
        <Link
          href="/auth/signup"
          className="btn-primary"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero Section - The Problem & Solution */}
      <section className="pt-40 pb-24 px-4 md:px-12 max-w-[1600px] mx-auto min-h-[90vh] flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl"
        >

          <h1 className="text-[11vw] leading-[0.85] font-black tracking-tighter mb-12">
            BREAK THE <br />
            <span className="text-gray-200">HIRING WALL.</span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <p className="md:col-span-5 text-xl md:text-2xl font-medium text-gray-800 leading-relaxed">
              The ATS is a black hole. The only way in is a referral. <br />
              <span className="text-gray-400">ReferAI connects you with advocate employees who actually want to refer you.</span>
            </p>
            <div className="md:col-span-7 flex flex-col md:flex-row gap-4 justify-end">
              <Link href="/auth/signup" className="btn-primary flex items-center justify-between gap-12 group h-20 text-lg">
                Connect Resume <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

     
      {/* Step 1: The Logic (Match Engine) */}
      <section id="engine" className="bg-white text-black min-h-[80vh] py-24 px-4 md:px-12 border-t border-gray-200">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-8">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Step 01 Heuristic Matching
            </div>
            <h2 className="text-[8vw] leading-[0.85] font-black tracking-tighter mb-12">
              WE DON&apos;T DO <br />
              KEYWORD MATCHING.
            </h2>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end">
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              ReferAI parses your resume&apos;s DNA—seniority, skill velocity, and project impact—matches it against advocate profiles using our 78-point heuristic engine.
            </p>
            <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-8">
              <div>
                <span className="block text-4xl font-black text-black mb-1">78</span>
                <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Data Points</span>
              </div>
              <div>
                <span className="block text-4xl font-black text-brand-accent mb-1 drop-shadow-sm text-shadow">&lt;0.2s</span>
                <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Match Latency</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 w-full">
            <MatchmakingWorkflow />
        </div>
      </section>
       {/* Step 2: The Network (Social Feed Visualization) */}
      <section id="network" className="border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
          <div className="p-12 md:p-24 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Step 02 Networking
            </div>
            <div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">THE<br />NETWORK</h2>
              <p className="text-lg text-gray-500 max-w-md leading-relaxed">
                It&apos;s not a database. It&apos;s a feed. See real employees at your target companies—Meta, Vercel, Linear—who share your specific skills.
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
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">+500 Advocates Active</span>
            </div>
          </div>
          <div className="bg-brand-gray p-12 md:p-24 flex items-center justify-center relative overflow-hidden">
            {/* Abstract Feed Mockup */}
            {/* Abstract Feed Mockup replaced with Interactive Demo */}
            <div className="w-full max-w-md relative z-10">
              <NetworkDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: The Ask (Agentic Drafts) */}
      <section id="draft" className="border-t border-b border-gray-200 bg-white mt-12 md:mt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
          {/* Left Column: Visual */}
          <div className="bg-gray-50 p-12 md:p-24 flex items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 order-2 md:order-1">
             <div className="w-full relative z-10">
                <ReferralAsk />
             </div>
          </div>

          {/* Right Column: Text */}
          <div className="p-12 md:p-24 flex flex-col justify-center order-1 md:order-2">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-8 text-gray-500">
              Step 03 Referral Ask
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-8 leading-tight">PERFECT<br />THE ASK.</h2>
            <p className="text-lg text-gray-500 max-w-md leading-relaxed mb-12">
              Asking for a referral is awkward. Our Agentic AI writes a hyper-contextualized draft based on your shared synergy with the advocate.
            </p>
            <ul className="space-y-4">
              {["Tone Analysis", "Value Proposition", "Mutual Interests"].map(item => (
                <li key={item} className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider">
                  <Zap className="w-4 h-4" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-4 text-center bg-white border-t border-gray-100">
        <h2 className="text-4xl md:text-8xl font-black tracking-tighter mb-12 uppercase text-gray-900">
          Ready to Connect?
        </h2>
        <div className="relative z-10">
          <Link href="/auth/signup" className="btn-primary text-xl px-16 py-8 shadow-2xl hover:shadow-xl hover:-translate-y-1 transition-all">
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
