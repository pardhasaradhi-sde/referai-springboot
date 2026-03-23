"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    heading: "We Read Your Story",
    body: "Upload your resume. ReferAI reads it like a human would — extracting your real skills, experience level, and what makes you stand out. No keyword tricks. No guessing.",
    aside: "Powered by AI document intelligence",
  },
  {
    number: "02",
    heading: "We Find the Right People",
    body: "We search our network for employees whose actual work experience overlaps with yours — at the exact company you're targeting. Not just anyone who works there. The right ones.",
    aside: "Vector search + LLM re-ranking",
  },
  {
    number: "03",
    heading: "We Write the Perfect Message",
    body: "One click. ReferAI drafts a personalized referral message using both your profile and the referrer's background. It sounds like you — because it's built from your actual data, not a template.",
    aside: "Human-in-the-loop. You approve before sending.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 md:px-12 border-t border-b border-gray-200 bg-gray-50 text-black">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-16 md:mb-20">
          <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-6 text-gray-400">
            How It Works
          </div>
          <h2 className="text-5xl md:text-[6vw] font-black tracking-tighter uppercase leading-[0.85] text-gray-900">
            Three Steps. <br />
            <span className="text-gray-300">No Cold Applying.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 bg-white shadow-sm">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className={`p-10 md:p-14 flex flex-col justify-between border-b md:border-b-0 border-gray-200 ${i < 2 ? "md:border-r border-gray-200" : ""}`}
            >
              <div>
                <span className="block text-[80px] font-black leading-none text-gray-100 mb-6 select-none">
                  {step.number}
                </span>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-5 leading-tight text-gray-900">
                  {step.heading}
                </h3>
                <p className="text-base text-gray-500 leading-relaxed font-medium">
                  {step.body}
                </p>
              </div>
              <div className="mt-10 pt-6 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {step.aside}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
