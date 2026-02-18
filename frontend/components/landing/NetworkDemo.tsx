"use client";

import { motion } from "framer-motion";
import { User, CheckCircle2, MoreHorizontal, MousePointer2 } from "lucide-react";
import { useState } from "react";

export function NetworkDemo() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="w-full max-w-md mx-auto relative h-[550px]">
        {/* Main Interface: Feed */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 h-full relative flex flex-col group">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                <span className="font-black tracking-tighter text-lg">DISCOVER</span>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Feed View - Static List */}
            <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar">
                
                {/* Card 1: The Perfect Match */}
                <motion.div
                    className="p-5 rounded-2xl border transition-all relative overflow-hidden bg-white hover:border-gray-300 hover:shadow-lg group/card"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg">
                                SJ
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight">Sarah Jenkins</h3>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Senior Engineer @ Linear</p>
                            </div>
                        </div>
                        <div className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-brand-accent text-black flex items-center gap-1">
                            98% Match
                        </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                             <CheckCircle2 className="w-3 h-3 text-green-500" /> 
                             <span>Shipped <strong>Sync Engine</strong> v2</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                             <CheckCircle2 className="w-3 h-3 text-green-500" /> 
                             <span>Expert in <strong>CRDTs</strong> & <strong>Optimistic UI</strong></span>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" title="Mutual Connection" />
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300" title="Mutual Connection" />
                        </div>
                        <button className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">
                            Connect
                        </button>
                    </div>
                </motion.div>

                {/* Card 2: Another Good Match */}
                <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-200" />
                            <div>
                                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                                <div className="h-3 w-20 bg-gray-200 rounded" />
                            </div>
                        </div>
                        <div className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-400">
                            92% Match
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="h-3 w-3/4 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    </div>
                </div>

                 {/* Card 3: Fade out */}
                 <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/30 opacity-40">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100" />
                            <div>
                                <div className="h-4 w-24 bg-gray-100 rounded mb-2" />
                                <div className="h-3 w-16 bg-gray-100 rounded" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

             {/* Bottom Fade */}
             <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
    </div>
  );
}
