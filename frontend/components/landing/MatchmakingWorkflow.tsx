"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  User, FileText, Database, Cpu, ListFilter, Binary, X,
  Zap, Layers, Brain, RefreshCw, Sparkles, MessageSquare, Radar,
  Activity, GitBranch, ShieldCheck, Wifi, Rocket, Server, MousePointerClick
} from "lucide-react";
import { type ComponentType, type ReactNode, useRef, useEffect, useState } from "react";

type NodeColor = "gray" | "blue" | "indigo" | "emerald" | "orange" | "purple" | "red";

interface WorkflowNodeDef {
    id: string;
    label: string;
    subLabel: string;
    color: NodeColor;
    type?: "source" | "process" | "sink";
    x: number;
    y: number;
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    technical: string;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 84;

const WORKFLOWS = {
  matching: {
    id: "matching",
    name: "Matchmaking Engine",
    description: "From your job description to a ranked list of real humans who can refer you — in under 10 seconds.",
    nodes: [
      {
        id: "user-input", label: "Match Triggered", subLabel: "Seeker & target company", color: "gray", type: "source", x: 40, y: 160, icon: User,
        title: "You Hit 'Find Referrers'",
        description: "The moment you paste your job description and click search, your resume text and target company are packaged and sent to the backend. Think of it like sending your CV to a very fast, very smart recruiter who never sleeps. No manual searching through LinkedIn profiles — this kicks off an entire AI pipeline automatically.",
        technical: "POST /api/matching/analyze → AnalyzeRequest { seekerProfileId, jobDescription, targetCompany } → Spring Boot PythonAiService"
      },
      {
        id: "quota-check", label: "Quota Enforcement", subLabel: "Redis counter check", color: "red", x: 320, y: 80, icon: ShieldCheck,
        title: "Fair Usage Gate",
        description: "Before any AI compute is used, the system checks if you've already run your 2 daily matches. This isn't just a restriction — it's what keeps the service free and fast for everyone. The counter resets at midnight using Redis TTL, so it's instant and never hits the database. If you're within quota, you pass through in under 1ms.",
        technical: "quotaService.checkAndEnforceQuota(userId) → Redis INCR referai:quota:match:{userId}:{date} | if count > 2 → 429 Too Many Requests"
      },
      {
        id: "cache-check", label: "Cache Layer", subLabel: "MD5 hash lookup", color: "emerald", x: 320, y: 240, icon: Database,
        title: "Already Seen This? Instant Answer.",
        description: "Your job description + resume is fingerprinted using an MD5 hash. If someone ran the exact same search within the last hour, the result is already stored in Redis memory — so you get it back in milliseconds with zero AI cost. It's like Google's search cache, but for referral matching. Cache hit = skips the entire AI pipeline.",
        technical: "cacheKey = MD5(seekerProfileId + jobDescription) → redisTemplate.get(key) | TTL: 3600s | Cache hit: return CachedMatchResult directly"
      },
      {
        id: "ai-service-call", label: "AI Service", subLabel: "Python FastAPI bridge", color: "indigo", x: 600, y: 160, icon: Server,
        title: "Handoff to the AI Brain",
        description: "On a cache miss, Spring Boot calls the dedicated Python AI microservice over HTTP. This is a deliberate architectural split — Java handles auth, rate limiting, and data access; Python handles all the AI-heavy lifting (embeddings, vector search, LLM calls). The two services speak via a shared internal API key, completely isolated from the public internet.",
        technical: "pythonAiService.matchCandidates(payload) → REST POST http://ai-service:8001/api/v1/match | Header: X-Internal-Key | Timeout: 30s"
      },
      {
        id: "hybrid-retrieval", label: "Vector Search", subLabel: "PGVector + Gemini embed", color: "blue", x: 880, y: 160, icon: Binary,
        title: "Finding People Who Actually Match",
        description: "Your resume and job description are converted into a 768-dimension numerical fingerprint (an 'embedding') by Google's Gemini model. This vector captures the semantic meaning of your experience — not just keywords. PostgreSQL's pgvector extension then scans all referrer profiles using cosine distance to find the top 20–30 people whose experience semantically aligns with yours. A Python backend at Airbnb does something very similar.",
        technical: "Gemini embed-001 → 768-dim vector | SELECT ... FROM profiles ORDER BY embedding <=> $query_vec LIMIT 30 | IVFFlat index, 100 lists | fallback: ILIKE lexical search"
      },
      {
        id: "llm-scoring", label: "LLM Re-ranking", subLabel: "Groq evaluates top 10", color: "purple", x: 1160, y: 160, icon: Brain,
        title: "The AI Judges the Shortlist",
        description: "The top 10 vector matches are sent to a Groq-hosted Llama LLM in a single batch call. The LLM reads both your profile and each referrer's background and scores them from 0–1 based on: shared skills depth, company seniority fit, and predicted referral success probability. This is what separates ReferAI from a basic keyword filter — the AI understands context, not just words.",
        technical: "llm_reranking node → Groq llama3-70b-8192 | Batch: top-10 candidates | Output: { referrerId, matchScore, sharedSkills[], reasoning } | 100–300 tok/s"
      },
      {
        id: "result-synthesis", label: "Results Assembled", subLabel: "Ranked & cached", color: "orange", type: "sink", x: 1440, y: 160, icon: Layers,
        title: "Your Ranked Referrer List",
        description: "AI scores are merged with full profile data from PostgreSQL — photo, job title, company, bio — sorted by match score, and the final list is cached in Redis for 1 hour. The response hits your screen with each referrer card showing exactly why they're a good match: shared skills, their seniority, and an AI-confidence score. From your click to this result: typically 4–8 seconds.",
        technical: "AnalyzeResponse DTO: List<ReferrerMatch> { profile, matchScore, sharedSkills, reasoning } | Stored: Redis key with 1h TTL | Response time p95: <8s"
      },
    ] as WorkflowNodeDef[],
    edges: [
      { from: "user-input", to: "quota-check" },
      { from: "user-input", to: "cache-check" },
      { from: "quota-check", to: "ai-service-call" },
      { from: "cache-check", to: "ai-service-call" },
      { from: "ai-service-call", to: "hybrid-retrieval" },
      { from: "hybrid-retrieval", to: "llm-scoring" },
      { from: "llm-scoring", to: "result-synthesis" }
    ]
  },
  outreach: {
    id: "outreach",
    name: "Outreach Generation",
    description: "One click turns a referrer match into a hyper-personalized, human-sounding message — grounded in real facts, never hallucinated.",
    nodes: [
      {
        id: "user-selects", label: "Select a Referrer", subLabel: "Target referrer chosen", color: "gray", type: "source", x: 40, y: 160, icon: MousePointerClick,
        title: "You Choose Who to Reach Out To",
        description: "You tap 'Draft Message' on any referrer card. At this moment, both your profile ID and your chosen referrer's ID are captured. This is the starting gun for the entire outreach pipeline — a chain of AI steps that will spend the next few seconds reading both profiles deeply before writing a single word.",
        technical: "Target referrerProfileId captured from PersonaCard → POST /api/matching/generate-message { seekerId, referrerId, jobContext }"
      },
      {
        id: "gen-message-call", label: "Generation API", subLabel: "Backend orchestrates", color: "emerald", x: 320, y: 160, icon: Cpu,
        title: "Backend Fetches Both Full Profiles",
        description: "Spring Boot retrieves the complete profiles of both you and the referrer from PostgreSQL — full resume text, bio, skills list, seniority, company. Nothing is summarized yet. This raw data is passed to the Python AI service, which will decide what's relevant. It's like giving the AI the complete folder before it starts writing, not a summary.",
        technical: "profileRepository.findByIdWithUser() for seeker + referrer | Full resume_text, skills[], bio, seniority | Passed to pythonAiService.generateMessage()"
      },
      {
        id: "prompt-assembly", label: "RAG + Prompt Build", subLabel: "Context retrieval", color: "indigo", x: 600, y: 160, icon: GitBranch,
        title: "The AI Reads Both Profiles Deeply",
        description: "This is where the magic happens. The Python service builds 10–15 context 'chunks' from both profiles — skills, resume highlights, bios, shared competencies. These chunks are embedded using Gemini and ranked by semantic relevance (RAG). Only the most relevant chunks make it into the final prompt. The referrer's seniority also triggers a tone adjustment: senior leaders get respectful guidance-seeking language; peers get direct, casual tone.",
        technical: "_build_retrieval_chunks() → embed_query(text[:8000]) → cosine_similarity ranking → top-4 chunks | tone_instruction set per seniority gap | skills[:25], bio[:2000], resume[:4000]"
      },
      {
        id: "llm-drafting", label: "LLM Writes Draft", subLabel: "Groq Llama generation", color: "purple", x: 880, y: 160, icon: Sparkles,
        title: "An AI That Writes Like a Human",
        description: "The assembled prompt — containing real facts about both people, retrieved context, and tone rules — is sent to Groq's Llama model. Strict rules are enforced: always first-person ('I am...', not 'John is...'), under 200 words, no buzzwords, only facts from the retrieved context (no hallucinations). If the AI accidentally slips into third-person, a corrective retry is triggered automatically.",
        technical: "OUTREACH_PROMPT → Groq llama3-70b | Rules: first-person only, <200 words, no invented facts | _has_third_person_self_reference() → corrective retry if triggered"
      },
      {
        id: "frontend-review", label: "You Review the Draft", subLabel: "Human-in-the-loop", color: "orange", x: 1160, y: 160, icon: FileText,
        title: "Your Words, AI-Assisted",
        description: "The draft lands in an editable text area. You're not locked into what the AI wrote — you can change every word. This 'human-in-the-loop' step is intentional: AI drafts are starting points, not final submissions. The message sounds like you because it was written about you, using your actual resume and skills, not a generic template.",
        technical: "Draft returned as { message: string } | React controlled textarea | No character limit enforced client-side | User edits applied before dispatch"
      },
      {
        id: "dispatch-request", label: "Request Sent", subLabel: "Stored & notified", color: "blue", type: "sink", x: 1440, y: 160, icon: Rocket,
        title: "Your Referral Request is Live",
        description: "Once you hit Send, a ReferralRequest record is created in PostgreSQL and linked to both profiles. Simultaneously, the referrer receives an email notification (async, so it never slows down your UI) and a real-time in-app notification via WebSocket. The referrer sees your request in their inbox with your full message, your profile, and the context from your AI-matched score.",
        technical: "referralRequestRepository.save(ReferralRequest) | emailService.sendReferralRequestEmail() async via @Async mailTaskExecutor | WebSocket push → /topic/notifications/{referrerId}"
      },
    ] as WorkflowNodeDef[],
    edges: [
      { from: "user-selects", to: "gen-message-call" },
      { from: "gen-message-call", to: "prompt-assembly" },
      { from: "prompt-assembly", to: "llm-drafting" },
      { from: "llm-drafting", to: "frontend-review" },
      { from: "frontend-review", to: "dispatch-request" }
    ]
  },
  coach: {
    id: "coach",
    name: "AI Conversation Coach",
    description: "Real-time streaming advice that reads your entire conversation history and tells you exactly what to say next — powered by a 4-node LangGraph agent.",
    nodes: [
      {
        id: "websocket-chat", label: "You're in a Chat", subLabel: "Live WebSocket session", color: "emerald", type: "source", x: 40, y: 160, icon: Wifi,
        title: "A Real Conversation is Happening",
        description: "You and your referrer are exchanging messages via WebSocket — a persistent, two-way connection that delivers messages in real-time without any page refresh. Unlike regular email or HTTP, this connection stays open. Every message you send or receive is instantly synced to the database and pushed to both screens simultaneously. This is the foundation the Coach reads from.",
        technical: "STOMP over SockJS | Spring MessageBroker | stomp.subscribe('/topic/conversations/{id}') | Messages persisted to conversation_messages table in real-time"
      },
      {
        id: "request-coach", label: "Coach Activated", subLabel: "SSE stream opened", color: "indigo", x: 320, y: 160, icon: Activity,
        title: "You Ask: 'What Should I Say?'",
        description: "Clicking the Coach button opens a Server-Sent Events (SSE) stream — a one-way channel where the server pushes text tokens to your browser as the AI generates them, word by word. This is the same streaming technique used by ChatGPT. You see the advice appear live instead of waiting for a spinner. The connection carries your conversation ID, stage (e.g., 'first contact' or 'ready to ask'), and current message context.",
        technical: "EventSource → GET /api/matching/coach-suggest?conversationId=X | Content-Type: text/event-stream | Spring SseEmitter | apiStream() client-side with streaming fetch"
      },
      {
        id: "ai-graph-state", label: "LangGraph Init", subLabel: "Agent graph compiled", color: "blue", x: 600, y: 160, icon: Layers,
        title: "A 4-Node AI Agent Spins Up",
        description: "Unlike a simple LLM call, the Coach is a LangGraph StateGraph — a directed graph where each node is a distinct reasoning step with typed inputs and outputs. LangGraph is the same framework used by Anthropic and Google to build complex multi-step AI agents. The graph is compiled once at startup and invoked fresh per coaching request, with state (a Python TypedDict) passed between nodes like baton in a relay race.",
        technical: "CoachGraph = StateGraph(CoachState) | .add_node('load_context', ...) x4 | .compile() → cached CompiledGraph | graph.ainvoke(initial_state) → async execution"
      },
      {
        id: "load_context", label: "Context Loaded", subLabel: "Node 1 of 4", color: "purple", x: 880, y: 80, icon: Database,
        title: "Node 1: Reading Your Whole Story",
        description: "The first LangGraph node loads everything relevant: the last 20 messages in your conversation, your full seeker profile, the referrer's full profile, the current conversation stage, and the last 10 pieces of coaching advice already given (to avoid repetition). This is your 'context window' — all the information the AI will reason over. It's stored in a typed Python dictionary that flows through the entire graph.",
        technical: "load_context(state: CoachState) → asyncpg fetch conversation_messages LIMIT 20, profiles JOIN users, coach_advice_log LIMIT 10 | state['messages'], state['seeker'], state['referrer'] populated"
      },
      {
        id: "rag_retrieval", label: "Strategy Retrieved", subLabel: "Node 2 of 4", color: "purple", x: 880, y: 240, icon: Radar,
        title: "Node 2: Learning from What Worked Before",
        description: "In parallel with context loading, a second node queries the vector database for historical coaching patterns that match your current scenario. Using Gemini embeddings, it finds similar past conversations where advice led to successful referrals and extracts the strategies that worked. This is RAG applied to coaching wisdom — the AI doesn't invent advice, it retrieves and adapts proven patterns.",
        technical: "rag_retrieval(state: CoachState) → embed_query(conversation_summary) → pgvector <=> search on coach_advice_log | top-8 relevant past strategies → state['rag_context']"
      },
      {
        id: "analyze_situation", label: "Strategy Decided", subLabel: "Node 3 of 4", color: "purple", x: 1160, y: 160, icon: Brain,
        title: "Node 3: Diagnosing Exactly Where You Are",
        description: "With full context and retrieved strategies in hand, this node makes the critical decision: what type of advice does this person need right now? It classifies the situation into one of 7 advice types — encourage rapport, time to ask, too early, re-engage, draft the ask, follow up, or celebrate a win. This classification shapes the entire tone and content of the final coaching message.",
        technical: "analyze_situation(state) → Groq LLM classifies → advice_type ∈ {encourage_rapport, time_to_ask, too_early, re_engage, draft_ask, follow_up, celebrate} | state['advice_type'] set"
      },
      {
        id: "generate_suggestion", label: "Advice Streams Live", subLabel: "Node 4 — SSE push", color: "orange", type: "sink", x: 1440, y: 160, icon: Zap,
        title: "Node 4: Words Appear on Your Screen",
        description: "The final node takes the classified situation, the retrieved strategies, and the full context, and generates a coaching message via Groq streaming. Each token is yielded from the LangGraph node → through an async generator → through the FastAPI SSE endpoint → to your browser in real time. The advice is saved to the database so the next coaching call won't repeat it. The full round-trip from click to first word: under 1 second.",
        technical: "generate_suggestion(state) → generate_stream(prompt) async for chunk | yield chunk → FastAPI StreamingResponse | Saved: coach_advice_log INSERT | Persisted to Redis: coach:state:{conversationId} TTL 24h"
      },
    ] as WorkflowNodeDef[],
    edges: [
      { from: "websocket-chat", to: "request-coach" },
      { from: "request-coach", to: "ai-graph-state" },
      { from: "ai-graph-state", to: "load_context" },
      { from: "ai-graph-state", to: "rag_retrieval" },
      { from: "load_context", to: "analyze_situation" },
      { from: "rag_retrieval", to: "analyze_situation" },
      { from: "analyze_situation", to: "generate_suggestion" }
    ]
  }
};

function buildPath(from: WorkflowNodeDef, to: WorkflowNodeDef): string {
    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x;
    const endY = to.y + NODE_HEIGHT / 2;
    const dx = Math.max(40, Math.abs(endX - startX) * 0.5);

    return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
}

export function MatchmakingWorkflow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof typeof WORKFLOWS>("matching");

  const workflow = WORKFLOWS[activeTab];

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Reset node selection and scroll position when tab changes
  useEffect(() => {
     // eslint-disable-next-line react-hooks/exhaustive-deps
     setSelectedNode(null);
     if (scrollRef.current) scrollRef.current.scrollLeft = 0;
     checkScroll();
  // eslint-disable-next-line
  }, [activeTab]);

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
    
    checkScroll();

    return () => {
        el.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (rafId) cancelAnimationFrame(rafId);
    }
  }, []);

  const selectedNodeData = workflow.nodes.find((node) => node.id === selectedNode);

  return (
    <div className="w-full relative group bg-white rounded-xl border border-gray-200 shadow-sm min-h-[550px] flex flex-col will-change-transform">
        
        {/* Navigation Tabs Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-dark bg-brand-accent/20 px-2 py-1 rounded">
                    Engine Map
                </span>
                <span className="text-sm font-bold tracking-tight text-gray-900 border-l border-gray-300 pl-3">
                    {workflow.name}
                </span>
            </div>

            <div className="flex flex-col sm:flex-row bg-gray-100 p-1 rounded-lg gap-1">
                {(Object.keys(WORKFLOWS) as Array<keyof typeof WORKFLOWS>).map(key => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`text-xs font-bold uppercase tracking-widest px-4 py-2 flex-1 md:flex-none rounded-md transition-all ${activeTab === key ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"}`}
                    >
                        {WORKFLOWS[key].name}
                    </button>
                ))}
            </div>
        </div>

      {/* Canvas wrapper — owns its own overflow-hidden for the fade gradients */}
      <div className="relative flex-1 overflow-hidden">

        {/* Scroll Indicators */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
        )}

        <div 
          ref={scrollRef}
          className="w-full h-full overflow-x-auto pb-12 pt-12 px-12 hide-scrollbar cursor-grab active:cursor-grabbing relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="min-w-[1800px] h-[350px] relative z-10 transition-all">

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
                  {workflow.edges.map((edge) => {
                      const fromNode = workflow.nodes.find(n => n.id === edge.from);
                      const toNode = workflow.nodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;
                      const path = buildPath(fromNode, toNode);
                      return <ConnectionPath key={`${workflow.id}-${edge.from}-${edge.to}`} d={path} />;
                  })}
              </svg>

              <AnimatePresence mode="popLayout">
                  {workflow.nodes.map((node, index) => {
                      const Icon = node.icon;
                      return (
                          <div key={`${workflow.id}-${node.id}`} className="absolute" style={{ left: node.x, top: node.y, width: NODE_WIDTH }}>
                              <WorkflowNode 
                                  id={node.id}
                                  icon={<Icon className={node.color === "gray" ? "text-gray-600" : "text-black"} />} 
                                  label={node.label}
                                  subLabel={node.subLabel}
                                  color={node.color}
                                  type={node.type || "process"}
                                  delay={index * 0.05}
                                  selected={selectedNode === node.id}
                                  onClick={() => setSelectedNode(node.id)}
                              />
                          </div>
                      )
                  })}
              </AnimatePresence>

          </div>
        </div>

      </div>{/* end canvas wrapper */}

      {/* Detail Panel — natural flex child BELOW the canvas, never overlaps nodes */}
      <AnimatePresence>
        {selectedNodeData && (
            <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="relative bg-white border-t border-gray-200 shadow-[0_-6px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 flex-shrink-0 rounded-b-xl"
            >
                <button 
                    onClick={() => setSelectedNode(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Left: title + description */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-brand-accent rounded-lg">
                                <Zap className="w-5 h-5 text-black" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase">{selectedNodeData.title}</h3>
                        </div>
                        <p className="text-base md:text-lg text-gray-600 leading-relaxed">
                            {selectedNodeData.description}
                        </p>
                    </div>

                    {/* Right: Under the Hood — clean split rows */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <Cpu className="w-3 h-3" /> Under the Hood
                        </div>
                        {selectedNodeData.technical
                            .split("|")
                            .map(s => s.trim())
                            .filter(Boolean)
                            .map((fact, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                                >
                                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-brand-accent/80 text-black text-[9px] font-black flex items-center justify-center leading-none">
                                        {i + 1}
                                    </span>
                                    <p className="text-xs text-gray-700 leading-snug font-medium">{fact}</p>
                                </div>
                            ))
                        }
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
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        </motion.g>
    )
}

interface WorkflowNodeProps {
    id: string;
    icon: ReactNode;
    label: string;
    subLabel: string;
    color?: NodeColor;
    type?: "source" | "process" | "sink";
    delay?: number;
    onClick: () => void;
    selected: boolean;
}

function WorkflowNode({ id, icon, label, subLabel, color = "gray", type = "process", delay = 0, onClick, selected }: WorkflowNodeProps) {
    
    const getColorClasses = () => {
        if (selected) return "border-brand-accent bg-brand-accent shadow-md scale-105 ring-2 ring-brand-accent/20";

        switch(color) {
            case "blue": return "border-blue-200 bg-blue-50/30 hover:border-blue-300 hover:bg-white";
            case "indigo": return "border-indigo-200 bg-indigo-50/30 hover:border-indigo-300 hover:bg-white";
            case "emerald": return "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:bg-white";
            case "orange": return "border-orange-200 bg-orange-50/30 hover:border-orange-300 hover:bg-white";
            case "purple": return "border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:bg-white";
            case "red": return "border-red-200 bg-red-50/30 hover:border-red-300 hover:bg-white";
            case "gray": return "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white";
            default: return "border-gray-200 bg-white";
        }
    }

    return (
        <motion.div 
            layoutId={`node-${id}`}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
