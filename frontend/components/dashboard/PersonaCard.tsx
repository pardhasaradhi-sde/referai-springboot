"use client";

import { motion } from "framer-motion";
import { MatchResult } from "@/lib/ai/schemas";
import { ArrowUpRight } from "lucide-react";

interface PersonaCardProps {
    match: MatchResult;
    onSelect?: () => void;
}

export function PersonaCard({ match, onSelect }: PersonaCardProps) {
    const { persona, score, explanation } = match;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onSelect}
            className="card-product group cursor-pointer flex flex-col justify-between min-h-[320px]"
        >
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="text-4xl font-black bg-black text-white w-16 h-16 flex items-center justify-center rounded-none shadow-none border-0">
                        {persona.name[0]}
                    </div>
                    <div className="text-right">
                        <span className="block text-xs font-bold uppercase tracking-widest text-gray-400">Match Grade</span>
                        <span className="text-3xl font-black">{Math.round(score * 100)}<span className="text-sm align-top text-gray-400">%</span></span>
                    </div>
                </div>

                <h3 className="text-2xl font-black uppercase leading-tight mb-1 tracking-tight">{persona.name}</h3>
                <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">{persona.role} @ {persona.company}</p>

                <div className="border-t border-gray-100 pt-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Key Skills</p>
                    <div className="flex flex-wrap gap-2">
                        {persona.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-1 bg-gray-100 text-[10px] font-bold uppercase tracking-wide text-black group-hover:bg-black group-hover:text-white transition-colors">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-end opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium max-w-[200px] leading-tight text-gray-500 line-clamp-2">{explanation}</span>
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
            </div>
        </motion.div>
    );
}
