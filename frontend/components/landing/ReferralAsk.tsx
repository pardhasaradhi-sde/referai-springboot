"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2, Quote, Check, Send } from "lucide-react";
import { useState } from "react";

export function ReferralAsk() {
  const [activeTab, setActiveTab] = useState<"step1" | "step2" | "step3">("step1");

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">AI Drafter</div>
        </div>

        <div className="p-8">
            {/* Input Context */}
            <div className="flex gap-4 mb-8 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-8 h-8" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-500 w-full">
                    <p className="font-medium text-gray-900 mb-1">Raw Context</p>
                    "I want to ask Sarah for a referral at Linear. I know she works on the Sync engine and I have experience with CRDTs."
                </div>
            </div>

            {/* AI Transformation */}
            <div className="relative">
                <div className="absolute left-5 -top-6 bottom-0 w-0.5 bg-gray-100 -z-10" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex gap-4"
                >
                    <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/20">
                        <Sparkles className="w-5 h-5 text-black" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="bg-white border border-brand-accent/30 shadow-sm rounded-2xl rounded-tl-sm p-6 relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent" />
                           
                           <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 flex items-center gap-1">
                                    <Wand2 className="w-3 h-3" /> AI Generated Draft
                                </span>
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    High Conversion
                                </span>
                           </div>

                           <p className="text-gray-800 text-lg leading-relaxed font-serif">
                                "Hi Sarah, I've been following your work on Linear's sync engine—specifically how you handled the optimistic UI updates. <br/><br/>
                                I recently implemented CRDTs for a similar offline-first project and would love to compare notes. I noticed Linear is hiring for the Core team..."
                           </p>

                           <div className="mt-6 flex gap-2">
                                <div className="px-3 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Professional Tone
                                </div>
                                <div className="px-3 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Technical Context
                                </div>
                           </div>
                        </div>

                        <div className="flex justify-end">
                            <button className="bg-black text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
                                Send Request <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>

      </div>
    </div>
  );
}
