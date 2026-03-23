"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const stats = [
  { value: "10×", label: "Higher interview rate with a referral vs. a cold application" },
  { value: "~70%", label: "Of jobs are filled through employee networks before they're posted" },
  { value: "<5 min", label: "From signup to your first personalized outreach message" },
];

const comparison = [
  {
    old: "Apply to 50 companies. Hear back from 2.",
    new: "Target the right employee at the right company. Get a reply.",
  },
  {
    old: "ATS scans for keywords and buries your resume.",
    new: "Your resume powers a semantic match — experience over keywords.",
  },
  {
    old: "Generic LinkedIn DM. No response.",
    new: "AI-drafted message built from your shared background and their work.",
  },
  {
    old: "Weeks of silence. No feedback.",
    new: "Referrers respond because the ask is relevant and respectful.",
  },
  {
    old: "You apply cold. They refer someone internally.",
    new: "You have a name attached to your application. They hire you.",
  },
];

export function SocialProof() {
  return (
    <section className="py-24 px-4 md:px-12 bg-white border-t border-gray-100">
      <div className="max-w-[1600px] mx-auto">

        {/* Stat Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 mb-24">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`p-10 md:p-14 flex flex-col justify-center bg-gray-50 hover:bg-white transition-colors ${i < 2 ? "border-b md:border-b-0 md:border-r border-gray-200" : ""}`}
            >
              <span className="block text-5xl md:text-7xl font-black tracking-tighter text-black mb-3">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-gray-500 max-w-xs leading-snug">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          {/* Heading */}
          <div className="md:col-span-4 flex flex-col justify-start">
            <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-6 text-gray-400 w-fit">
              The Difference
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-6">
              Stop Playing<br />
              <span className="text-gray-300">a Losing Game.</span>
            </h2>
            <p className="text-base text-gray-400 font-medium leading-relaxed">
              Cold applications aren&apos;t a strategy — they&apos;re a lottery. Here&apos;s what actually changes when you have a referral behind you.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="md:col-span-8">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded">
                <X className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Cold Applying</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded">
                <Check className="w-3 h-3 text-green-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">With ReferAI</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
              {comparison.map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="grid grid-cols-2 gap-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3 p-5 border-r border-gray-100">
                    <X className="w-3.5 h-3.5 text-red-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-400 font-medium leading-snug">{row.old}</p>
                  </div>
                  <div className="flex items-start gap-3 p-5">
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-800 font-semibold leading-snug">{row.new}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
