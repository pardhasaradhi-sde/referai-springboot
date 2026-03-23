"use client";

import { useState, useEffect } from "react";
import { api, removeAuthInfo } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Users, MessageSquare, FileText, Search, Sparkles, User as UserIcon,
    ArrowUpRight, Zap, TrendingUp, LogOut, ChevronRight, Menu, X, ArrowRight
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/Loading";
import { JobDescriptionInput } from "@/components/dashboard/JobDescriptionInput";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import type {
    Profile, MatchResult, AnalyzeResponse, ExtractJdResponse,
    ReferralRequest, Conversation, PageResponse
} from "@/lib/api/types";

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<"home" | "match">("home");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [referrers, setReferrers] = useState<Profile[]>([]);
    const [referrerTotalCount, setReferrerTotalCount] = useState(0);

    const [outgoingCount, setOutgoingCount] = useState(0);
    const [incomingCount, setIncomingCount] = useState(0);
    const [conversationCount, setConversationCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    const [jobDescription, setJobDescription] = useState("");
    const [targetCompany, setTargetCompany] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [extractedJobData, setExtractedJobData] = useState<ExtractJdResponse | null>(null);

    const router = useRouter();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [profileData, referrersPage, outgoingPage, incomingPage, conversations] = await Promise.all([
                api.get<Profile>("/api/profiles/me"),
                api.get<PageResponse<Profile>>("/api/referrers"),
                api.get<PageResponse<ReferralRequest>>("/api/requests/outgoing").catch(() => ({ content: [] as ReferralRequest[] })),
                api.get<PageResponse<ReferralRequest>>("/api/requests/incoming").catch(() => ({ content: [] as ReferralRequest[] })),
                api.get<Conversation[]>("/api/conversations").catch(() => [] as Conversation[]),
            ]);
            setProfile(profileData);
            setReferrers(referrersPage.content || []);
            setReferrerTotalCount(referrersPage.totalElements || 0);
            setOutgoingCount(outgoingPage.content?.length || 0);
            setIncomingCount(incomingPage.content?.length || 0);
            setConversationCount(conversations.length);
            setPendingCount((incomingPage.content || []).filter((r) => r.status === "pending").length);
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!targetCompany.trim()) { showToast("Please enter a target company to find referrers.", "warning"); return; }
        if (!jobDescription.trim()) { showToast("Please enter a job description", "warning"); return; }
        if (!profile?.resumeText) { showToast("Please add your resume in your profile first", "warning"); router.push("/profile"); return; }
        setAnalyzing(true);
        try {
            const result = await api.post<AnalyzeResponse>("/api/matching/analyze", {
                targetCompany: targetCompany.trim(),
                jobDescription,
                resumeText: profile.resumeText,
            });
            setMatches(result.matches);
            showToast(`Found ${result.matches.length} matches!`, "success");
        } catch (error: unknown) {
            showToast(error instanceof Error ? error.message : "Analysis failed", "error");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleLogout = () => { removeAuthInfo(); router.push("/"); };

    const getMatchScore = (score: number) => Math.round(score * 100);
    const getMatchLabel = (score: number) => {
        if (score >= 0.8) return "EXCELLENT";
        if (score >= 0.6) return "STRONG";
        if (score >= 0.4) return "GOOD";
        return "FAIR";
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-white">
                <aside className="hidden md:flex w-[240px] border-r border-gray-200 flex-col">
                    <div className="px-6 pt-7 pb-6 border-b border-gray-100">
                        <div className="h-7 w-24 bg-gray-100 animate-pulse" />
                    </div>
                    <div className="flex-1 px-4 pt-6 space-y-1">
                        {[1,2,3,4,5].map(i => <div key={i} className="h-9 w-full bg-gray-100 animate-pulse" />)}
                    </div>
                </aside>
                <main className="flex-1 p-4 md:p-12">
                    <div className="h-12 w-48 bg-gray-100 animate-pulse mb-2" />
                    <div className="h-4 w-64 bg-gray-100 animate-pulse mb-12" />
                    <div className="grid grid-cols-4 gap-0 border border-gray-200 mb-12">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="p-6 border-r last:border-r-0 border-gray-200">
                                <div className="h-10 w-16 bg-gray-100 animate-pulse mb-2" />
                                <div className="h-3 w-24 bg-gray-100 animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-0 border border-gray-200">
                        {[1,2,3].map(i => <div key={i} className="h-56 border-r last:border-r-0 border-gray-200 animate-pulse bg-gray-50" />)}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-white">
            {/* ─── Mobile Top Bar ─── */}
            <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <span className="text-xl font-black tracking-tighter uppercase">ReferAI</span>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* ─── Sidebar ─── */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {/* Logo */}
                <div className="hidden md:flex px-6 pt-7 pb-5 border-b border-gray-100 items-center justify-between">
                    <Link href="/" className="text-xl font-black tracking-tighter uppercase">ReferAI</Link>
                    <NotificationBell />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 pt-5 md:pt-4 space-y-0.5">
                    <button
                        onClick={() => { setActiveTab("home"); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "home" ? "bg-black text-white" : "text-gray-500 hover:text-black hover:bg-gray-100"}`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" /> Overview
                    </button>
                    <button
                        onClick={() => { setActiveTab("match"); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === "match" ? "bg-black text-white" : "text-gray-500 hover:text-black hover:bg-gray-100"}`}
                    >
                        <Sparkles className="w-3.5 h-3.5" /> AI Match
                    </button>

                    <div className="pt-4 pb-1 px-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-300">Navigate</span>
                    </div>

                    <Link href="/referrers" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                        <Search className="w-3.5 h-3.5" /> Browse Referrers
                    </Link>
                    <Link href="/dashboard/requests" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                        <FileText className="w-3.5 h-3.5" /> Requests
                        {pendingCount > 0 && (
                            <span className="ml-auto w-5 h-5 bg-black text-white text-[9px] font-black flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </Link>
                    <Link href="/dashboard/matching-history" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                        <TrendingUp className="w-3.5 h-3.5" /> Match History
                    </Link>
                    <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                        <MessageSquare className="w-3.5 h-3.5" /> Messages
                    </Link>
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                        <UserIcon className="w-3.5 h-3.5" /> Profile
                    </Link>
                </nav>

                {/* User card */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                            {profile?.fullName?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-tight truncate">{profile?.fullName}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{profile?.role}</p>
                        </div>
                        <button onClick={handleLogout} className="p-1 hover:bg-gray-100 transition-colors" title="Logout">
                            <LogOut className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── Main ─── */}
            <main className="flex-1 overflow-y-auto">
                {activeTab === "home" ? (
                    <div className="max-w-[1200px] mx-auto px-4 sm:px-10 py-6 sm:py-10">
                        {/* Page Header */}
                        <div className="mb-10 border-b border-gray-200 pb-8">
                            <div className="inline-block px-3 py-1 border border-black/10 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                                Workspace
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-[0.9] uppercase mb-3">
                                {profile?.fullName?.split(" ")[0]}&apos;s Dashboard.
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">Your referral network at a glance.</p>
                        </div>

                        {/* ─── Stats Grid — sharp editorial tiles ─── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 border border-gray-200 mb-10">
                            {[
                                { label: "Active Referrers", value: referrerTotalCount, href: "/referrers", icon: <Users className="w-4 h-4" /> },
                                { label: "Requests Sent", value: outgoingCount, href: "/dashboard/requests", icon: <ArrowUpRight className="w-4 h-4" /> },
                                { label: "Requests Received", value: incomingCount, href: "/dashboard/requests", icon: <FileText className="w-4 h-4" /> },
                                { label: "Conversations", value: conversationCount, href: "/messages", icon: <MessageSquare className="w-4 h-4" /> },
                            ].map((stat, i) => (
                                <Link
                                    key={i}
                                    href={stat.href}
                                    className="p-4 sm:p-6 border-r last:border-r-0 border-gray-200 hover:bg-gray-50 transition-colors group relative"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-gray-300">{stat.icon}</span>
                                        <ArrowUpRight className="w-3 h-3 text-gray-200 group-hover:text-black transition-colors" />
                                    </div>
                                    <div className="text-4xl font-black tracking-tighter mb-1">{stat.value}</div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</div>
                                </Link>
                            ))}
                        </div>

                        {/* ─── AI Match CTA ─── */}
                        <div className="border border-gray-200 p-8 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-black text-white">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-4 h-4 text-brand-accent" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-accent">AI-Powered</span>
                                </div>
                                <h2 className="text-2xl font-black tracking-tighter uppercase mb-2">Find Your Perfect Match.</h2>
                                <p className="text-sm text-gray-400 max-w-md">
                                    Paste a job description and our 4-stage AI pipeline finds your best referrers.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTab("match")}
                                className="flex-shrink-0 px-8 py-4 bg-brand-accent text-black font-black text-sm uppercase tracking-widest hover:bg-yellow-300 transition-colors inline-flex items-center gap-3 group"
                            >
                                Start Matching <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* ─── Referrers ─── */}
                        <div>
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">The Network</div>
                                    <h2 className="text-3xl font-black tracking-tighter uppercase">Available Referrers</h2>
                                </div>
                                <Link href="/referrers" className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors inline-flex items-center gap-1">
                                    View All <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </div>

                            {referrers.length === 0 ? (
                                <div className="border border-dashed border-gray-200 p-16 text-center">
                                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-gray-300">Network is growing</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-gray-200">
                                    {referrers.slice(0, 6).map((referrer, i) => (
                                        <Link
                                            key={referrer.id}
                                            href={`/referrers/${referrer.id}`}
                                            className="p-6 border-r border-b border-gray-200 hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                                                    {referrer.fullName[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-black uppercase tracking-tight truncate group-hover:underline">{referrer.fullName}</h4>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">
                                                        {referrer.jobTitle || referrer.company || referrer.role}
                                                    </p>
                                                </div>
                                                <ArrowUpRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-black transition-colors flex-shrink-0" />
                                            </div>

                                            {referrer.skills && referrer.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {referrer.skills.slice(0, 3).map((skill) => (
                                                        <span key={skill} className="px-2 py-0.5 border border-gray-200 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {referrer.skills.length > 3 && (
                                                        <span className="text-[9px] font-bold text-gray-300">+{referrer.skills.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ─── AI Matching Tab ─── */
                    <div className="max-w-[800px] mx-auto px-4 sm:px-10 py-6 sm:py-10">
                        <div className="border-b border-gray-200 pb-8 mb-10">
                            <div className="inline-block px-3 py-1 border border-black/10 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                                4-Stage AI Pipeline
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-3 flex items-center gap-4">
                                <Sparkles className="w-8 h-8" /> AI Matching
                            </h1>
                            <p className="text-sm text-gray-500">Paste a job description to find your best referrer matches.</p>
                        </div>

                        {matches.length === 0 ? (
                            <div className="space-y-6">
                                {/* Target Company */}
                                <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                                        Target Company
                                    </label>
                                    <input
                                        type="text"
                                        value={targetCompany}
                                        onChange={(e) => setTargetCompany(e.target.value)}
                                        placeholder="e.g. Microsoft, Stripe, Vercel..."
                                        className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-black outline-none text-sm transition-all font-medium"
                                    />
                                </div>

                                <JobDescriptionInput
                                    value={jobDescription}
                                    onChange={setJobDescription}
                                    onExtractSuccess={(data) => {
                                        setExtractedJobData(data);
                                        if (data.company && !targetCompany) setTargetCompany(data.company);
                                    }}
                                />

                                {extractedJobData?.success && extractedJobData.jobTitle && (
                                    <div className="border-l-4 border-black p-4 bg-gray-50">
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Extracted from URL</div>
                                        <div className="text-sm font-bold uppercase tracking-tight">
                                            {extractedJobData.jobTitle}
                                            {extractedJobData.company && ` — ${extractedJobData.company}`}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                    className="w-full py-4 bg-black text-white font-black text-sm uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                                >
                                    {analyzing ? (
                                        <><LoadingSpinner size="sm" /> Analyzing with AI...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Find Best Matches</>
                                    )}
                                </button>
                            </div>
                        ) : (
                            /* ─── Match Results ─── */
                            <div>
                                <div className="flex items-end justify-between mb-8">
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Results</div>
                                        <h2 className="text-3xl font-black tracking-tighter uppercase">{matches.length} Match{matches.length !== 1 ? "es" : ""} Found</h2>
                                    </div>
                                    <button
                                        onClick={() => setMatches([])}
                                        className="text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                                    >
                                        ← New Search
                                    </button>
                                </div>

                                {/* Start of matches mapping */}
                                {matches.length === 0 && !analyzing ? (
                                    <div className="border border-gray-200 p-12 text-center bg-gray-50">
                                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-black uppercase tracking-tight mb-2">No Referrers Found</h3>
                                        <p className="text-sm text-gray-500">
                                            No referrers found at {targetCompany || "this company"} yet. 
                                            Try inviting colleagues or check back later.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200">
                                        {matches.map((match, index) => (
                                            <div key={match.persona.id} className="border-b last:border-b-0 border-gray-200 p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                                                {/* Rank */}
                                                <div className="flex flex-col items-center flex-shrink-0 w-12">
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-2">#{index + 1}</span>
                                                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-sm">
                                                        {match.persona.fullName[0]}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h4 className="text-base font-black uppercase tracking-tight">{match.persona.fullName}</h4>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                                {match.persona.jobTitle || match.persona.role}
                                                                {match.persona.company && ` — ${match.persona.company}`}
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-4">
                                                            <div className="text-3xl font-black tracking-tighter">{getMatchScore(match.score)}%</div>
                                                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{getMatchLabel(match.score)}</div>
                                                        </div>
                                                    </div>

                                                    {/* Score bar */}
                                                    <div className="w-full h-1 bg-gray-100 mb-3 overflow-hidden">
                                                        <div
                                                            className="h-full bg-black transition-all duration-700"
                                                            style={{ width: `${getMatchScore(match.score)}%` }}
                                                        />
                                                    </div>

                                                    {match.explanation && (
                                                        <p className="text-xs text-gray-600 mb-3 leading-relaxed">{match.explanation}</p>
                                                    )}

                                                    {match.sharedSkills && match.sharedSkills.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-4">
                                                            {match.sharedSkills.slice(0, 5).map((skill) => (
                                                                <span key={skill} className="px-2 py-0.5 border border-gray-200 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <Link
                                                        href={`/request/${match.persona.id}?job=${encodeURIComponent(jobDescription)}&company=${encodeURIComponent(targetCompany)}`}
                                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors group"
                                                    >
                                                        Send Request <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
