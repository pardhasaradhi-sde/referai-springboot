"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  FileText, 
  Database, 
  Cpu, 
  ListFilter,
  BrainCircuit,
  Binary,
  X,
  Zap,
  CheckCircle2
} from "lucide-react";
import { useRef, useEffect, useState } from "react";

export function MatchmakingWorkflow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number;
    const handleScroll = () => {
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                checkScroll();
                rafId = 0;
            });
        }
    };

    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    
    // Initial check
    checkScroll();

    return () => {
        el.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (rafId) cancelAnimationFrame(rafId);
    }
  }, []);

  const nodeDetails: Record<string, { title: string; description: string; technical: string; icon: any }> = {
    "input": {
        title: "Your Input",
        description: "Everything starts here. We take your LinkedIn PDF or resume text and the job description you're targeting. No manual data entry required.",
        technical: "Input: PDF/Text Blob → Secure Storage",
        icon: User
    },
    "job-parser": {
        title: "Job Intelligence",
        description: "Our AI scans the job post to understand what truly matters—filtering out buzzwords to find core technical requirements and seniority signals.",
        technical: "Gemini 1.5 Flash: Extract { skills, role_level }",
        icon: FileText
    },
    "resume-parser": {
        title: "Profile DNA",
        description: "We don't just look for keywords. We analyze your experience, quantifying your skill depth and project impact to build a comprehensive professional profile.",
        technical: "Gemini 1.5 Flash: Vectorize Experience",
        icon: FileText
    },
    "active-referrers": {
        title: "Advocate Network",
        description: "We instantly query our database of verified employees at your target companies who have explicitly opted-in to refer qualified candidates.",
        technical: "PostgreSQL: SELECT * FROM referrers WHERE company = $1",
        icon: Database
    },
    "algorithm": {
        title: "Matching Engine",
        description: "Our algorithm calculates a precise compatibility score (0-100%) based on skill overlap, seniority match, and recency of experience.",
        technical: "Score = (SkillMatch * 0.8) + (BaseScore * 0.2)",
        icon: Cpu
    },
    "output": {
        title: "Ranked Matches",
        description: "You get a prioritized list of the top 5 advocates most likely to respond to you, complete with valid reasoning for why they are a good match.",
        technical: "Output: JSON Array [Top 5 Matches]",
        icon: ListFilter
    }
  };

  return (
    <div className="w-full relative group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[550px] flex flex-col will-change-transform">
        {/* Header/Title within the box */}
        <div className="absolute top-4 left-6 z-20 flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-200 px-2 py-1 rounded-md bg-white">
                Interactive Workflow v2.1
            </span>
            <span className="text-[10px] text-gray-400 animate-pulse">
                Click any node to explore
            </span>
        </div>

      {/* Scroll Indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
      )}

      <div 
        ref={scrollRef}
        className="w-full flex-1 overflow-x-auto pb-12 pt-20 px-12 hide-scrollbar cursor-grab active:cursor-grabbing relative"
        style={{ scrollBehavior: 'smooth' }}
      >
          {/* Main Container - Increased Width to 1400px to ensure output node fit */}
        <div className="min-w-[1400px] h-[300px] relative flex items-center justify-between z-10">

            {/* Grid Background */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
                style={{
                backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                backgroundSize: "20px 20px"
                }}
            />
            
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {/* Defs for gradients */}
                <defs>
                    <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E5E7EB" />
                        <stop offset="50%" stopColor="#9CA3AF" />
                        <stop offset="100%" stopColor="#E5E7EB" />
                    </linearGradient>
                </defs>

                {/* Path 1: Input to Job Parser */}
                <ConnectionPath d="M 180 150 C 230 150, 230 90, 280 90" />
                {/* Path 2: Input to Resume Parser */}
                <ConnectionPath d="M 180 150 C 230 150, 230 210, 280 210" />

                {/* Path 3: Job Parser to Supabase */}
                <ConnectionPath d="M 480 90 C 530 90, 530 150, 580 150" />
                {/* Path 4: Resume Parser to Supabase */}
                <ConnectionPath d="M 480 210 C 530 210, 530 150, 580 150" />

                 {/* Path 5: Supabase to Algo */}
                 <ConnectionPath d="M 780 150 L 830 150" />
                 
                 {/* Path 6: Algo to Output */}
                 <ConnectionPath d="M 1030 150 L 1080 150" />

            </svg>


            {/* Node 1: User Input */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[180px]">
                <WorkflowNode 
                    id="input"
                    icon={<User className="text-gray-600" />} 
                    label="User Input" 
                    subLabel="Raw Data"
                    color="gray"
                    type="source"
                    selected={selectedNode === "input"}
                    onClick={() => setSelectedNode("input")}
                />
            </div>

            {/* Node 2: Parallel Parsing */}
            <div className="absolute left-[280px] top-1/2 -translate-y-1/2 w-[200px] flex flex-col gap-12">
                <WorkflowNode 
                    id="job-parser"
                    icon={<FileText className="text-blue-600" />} 
                    label="Job Parser" 
                    subLabel="Extract Keywords"
                    color="blue"
                    delay={0.1}
                    selected={selectedNode === "job-parser"}
                    onClick={() => setSelectedNode("job-parser")}
                />
                <WorkflowNode 
                    id="resume-parser"
                    icon={<FileText className="text-indigo-600" />} 
                    label="Resume Parser" 
                    subLabel="Extract Skills"
                    color="indigo"
                    delay={0.2}
                    selected={selectedNode === "resume-parser"}
                    onClick={() => setSelectedNode("resume-parser")}
                />
            </div>

            {/* Node 3: Supabase */}
            <div className="absolute left-[580px] top-1/2 -translate-y-1/2 w-[200px]">
                 <WorkflowNode 
                    id="active-referrers"
                    icon={<Database className="text-emerald-600" />} 
                    label="Active Referrers" 
                    subLabel="Filter by Company"
                    color="emerald"
                    delay={0.3}
                    selected={selectedNode === "active-referrers"}
                    onClick={() => setSelectedNode("active-referrers")}
                />
            </div>


            {/* Node 4: Algorithm (Simplified) */}
            <div className="absolute left-[830px] top-1/2 -translate-y-1/2 w-[200px]">
                <WorkflowNode 
                    id="algorithm"
                    icon={<Cpu className="text-orange-600" />} 
                    label="Matching Logic" 
                    subLabel="0.8*Overlap + 0.2"
                    color="orange"
                    delay={0.4}
                    selected={selectedNode === "algorithm"}
                    onClick={() => setSelectedNode("algorithm")}
                />
            </div>

            {/* Node 5: Output */}
            <div className="absolute left-[1080px] top-1/2 -translate-y-1/2 w-[180px]">
                <WorkflowNode 
                    id="output"
                    icon={<ListFilter className="text-purple-600" />} 
                    label="Ranked Matches" 
                    subLabel="Top 5 Candidates"
                    color="purple"
                    type="sink"
                    delay={0.5}
                    selected={selectedNode === "output"}
                    onClick={() => setSelectedNode("output")}
                />
            </div>

        </div>
      </div>

      {/* Detail Panel Overlay */}
      <AnimatePresence>
        {selectedNode && nodeDetails[selectedNode] && (
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-8 z-30"
            >
                <button 
                    onClick={() => setSelectedNode(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-brand-accent rounded-lg">
                                {/* Dynamic Icon rendered here? No, just reuse Icon logic or generic */}
                                <Zap className="w-5 h-5 text-black" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight uppercase">{nodeDetails[selectedNode].title}</h3>
                        </div>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            {nodeDetails[selectedNode].description}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                             <Binary className="w-3 h-3" /> Technical logic
                        </div>
                        <code className="block text-sm font-mono text-gray-800 bg-white p-3 rounded border border-gray-200 shadow-sm">
                            {nodeDetails[selectedNode].technical}
                        </code>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function ConnectionPath({ d }: { d: string }) {
    return (
        <>
            {/* Background static line */}
            <path d={d} fill="none" stroke="#F3F4F6" strokeWidth="4" />
             {/* Animated flow line */}
            <path 
                d={d} 
                fill="none" 
                stroke="#D1D5DB" 
                strokeWidth="2" 
                strokeDasharray="5 5"
                className="animate-dash-flow"
            />
        </>
    )
}

function WorkflowNode({ id, icon, label, subLabel, color = "gray", type = "process", delay = 0, onClick, selected }: any) {
    
    const getColorClasses = () => {
        if (selected) return "border-brand-accent bg-brand-accent shadow-md scale-105 ring-2 ring-brand-accent/20";

        switch(color) {
            case "blue": return "border-blue-200 bg-blue-50/30 hover:border-blue-300 hover:bg-white";
            case "indigo": return "border-indigo-200 bg-indigo-50/30 hover:border-indigo-300 hover:bg-white";
            case "emerald": return "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:bg-white";
            case "orange": return "border-orange-200 bg-orange-50/30 hover:border-orange-300 hover:bg-white";
            case "purple": return "border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:bg-white";
            case "gray": return "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white";
            default: return "border-gray-200 bg-white";
        }
    }

    return (
        <motion.div 
            layoutId={id}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ delay, duration: 0.4 }}
            className={`
                relative group p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer
                bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
                ${getColorClasses()}
            `}
        >
            <div className={`p-2 rounded-lg bg-white border border-gray-100 shadow-sm ${selected ? 'text-black' : ''}`}>
                {icon}
            </div>
            <div>
                <div className={`font-bold text-sm leading-tight ${selected ? 'text-black' : 'text-gray-900'}`}>{label}</div>
                <div className={`text-[10px] font-medium uppercase tracking-wide mt-0.5 ${selected ? 'text-black/60' : 'text-gray-500'}`}>{subLabel}</div>
            </div>

            {/* Connector Dots */}
            {type !== "sink" && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-400 group-hover:bg-brand-accent transition-colors shadow-sm z-10" />
            )}
            {type !== "source" && (
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-400 shadow-sm z-10" />
            )}
        </motion.div>
    )
}
