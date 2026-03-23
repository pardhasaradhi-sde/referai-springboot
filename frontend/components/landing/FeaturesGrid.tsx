"use client";

import { motion } from "framer-motion";
import { MessageSquare, Inbox, FileCode2, BellRing, Users, Brain } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Conversation Coach",
    description: "Stuck mid-conversation? Hit Coach and get real-time, streamed advice on exactly what to say next — powered by a 4-node LangGraph agent reading your full chat history."
  },
  {
    icon: MessageSquare,
    title: "Real-Time Messaging",
    description: "Chat live with your referrers the moment they accept your request. Powered by WebSocket — every message appears instantly on both sides, no refresh needed."
  },
  {
    icon: Inbox,
    title: "Referral Request Inbox",
    description: "Every request you send or receive lands in a clean inbox. Accept, decline, or message back — tracked in one place without chasing emails."
  },
  {
    icon: FileCode2,
    title: "Resume Intelligence",
    description: "Upload your resume once. ReferAI's document intelligence node extracts your skills, seniority, and experience — automatically used in every match and outreach message."
  },
  {
    icon: BellRing,
    title: "Instant Email Alerts",
    description: "Referrers get a branded email the moment you send a request. You get notified when they respond. Nothing gets missed, nothing lives in a spreadsheet."
  },
  {
    icon: Users,
    title: "Open Referrer Network",
    description: "Not in the mood for AI? Browse the full directory of active referrers, filter by company, skills, or seniority, and reach out directly on your terms."
  }
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-4 md:px-12 bg-white border-t border-gray-200">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-16 md:mb-20">
          <div className="inline-block px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-widest mb-6 text-gray-500">
            Platform Capabilities
          </div>
          <h2 className="text-5xl md:text-[6vw] font-black tracking-tighter uppercase leading-[0.85]">
            More Than <br />
            <span className="text-gray-300">Just Matching.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group border border-gray-200 bg-gray-50 hover:bg-white hover:border-black/20 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col items-start will-change-transform"
              >
                <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center rounded-lg mb-6 group-hover:bg-brand-dark group-hover:border-brand-dark group-hover:text-brand-accent transition-colors duration-300 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-3">
                  {feature.title}
                </h3>
                <p className="text-base font-medium text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
