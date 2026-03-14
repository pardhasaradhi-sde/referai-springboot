"use client";

import { useState, useEffect } from "react";
import { api, removeAuthInfo } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, MessageSquare, FileText, Search, Sparkles, User as UserIcon } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/Loading";
import { JobDescriptionInput } from "@/components/dashboard/JobDescriptionInput";
import type { Profile, MatchResult, AnalyzeResponse, ExtractJdResponse } from "@/lib/api/types";

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<"home" | "match">("home");
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [referrers, setReferrers] = useState<Profile[]>([]);

    // Matching state
    const [jobDescription, setJobDescription] = useState("");
    const [targetCompany, setTargetCompany] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [extractedJobData, setExtractedJobData] = useState<ExtractJdResponse | null>(null);

    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [profileData, referrersData] = await Promise.all([
                api.get<Profile>("/api/profiles/me"),
                api.get<Profile[]>("/api/referrers"),
            ]);
            setProfile(profileData);
            setReferrers(referrersData.slice(0, 6));
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!jobDescription.trim()) {
            showToast("Please enter a job description", "warning");
            return;
        }

        if (!profile?.resumeText) {
            showToast("Please add your resume in your profile first", "warning");
            router.push("/profile");
            return;
        }

        setAnalyzing(true);

        try {
            const result = await api.post<AnalyzeResponse>("/api/matching/analyze", {
                jobDescription,
                resumeText: profile.resumeText,
                targetCompany: targetCompany || undefined,
            });

            setMatches(result.matches);
            showToast(`Found ${result.matches.length} matches!`, "success");
        } catch (error: unknown) {
            showToast(error instanceof Error ? error.message : "Analysis failed", "error");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleLogout = async () => {
        removeAuthInfo();
        router.push("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-200 flex flex-col justify-between py-8">
                <div className="px-6">
                    <Link href="/" className="block text-2xl font-black tracking-tighter mb-12 uppercase">
                        ReferAI
                    </Link>
                    <nav className="space-y-4">
                        <button
                            onClick={() => setActiveTab("home")}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest ${activeTab === "home" ? "bg-black text-white" : "hover:bg-gray-100"
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            Home
                        </button>
                        <button
                            onClick={() => setActiveTab("match")}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest ${activeTab === "match" ? "bg-black text-white" : "hover:bg-gray-100"
                                }`}
                        >
                            <Sparkles className="w-5 h-5" />
                            AI Matching
                        </button>
                        <Link
                            href="/referrers"
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-100"
                        >
                            <Search className="w-5 h-5" />
                            Browse All
                        </Link>
                        <Link
                            href="/dashboard/requests"
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-100"
                        >
                            <FileText className="w-5 h-5" />
                            My Requests
                        </Link>
                        <Link
                            href="/messages"
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-100"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Messages
                        </Link>
                        <Link
                            href="/profile"
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-100"
                        >
                            <UserIcon className="w-5 h-5" />
                            Profile
                        </Link>
                    </nav>
                </div>
                <div className="px-6">
                    <div className="mb-4 p-4 bg-gray-50 border border-gray-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                            Logged in as
                        </p>
                        <p className="text-sm font-medium truncate">{profile?.fullName}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 border border-gray-200 text-xs font-bold uppercase tracking-wider hover:bg-gray-100"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {activeTab === "home" ? (
                    <>
                        <header className="border-b border-gray-200 px-12 py-6">
                            <h2 className="text-3xl font-black uppercase tracking-tight">Dashboard</h2>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                                Welcome back, {profile?.fullName}
                            </p>
                        </header>

                        <div className="p-12">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-6 mb-12">
                                <div className="border border-gray-200 p-6">
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Active Referrers
                                    </div>
                                    <div className="text-4xl font-black">{referrers.length}+</div>
                                </div>
                                <div className="border border-gray-200 p-6">
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Your Role
                                    </div>
                                    <div className="text-2xl font-black uppercase">{profile?.role || "Seeker"}</div>
                                </div>
                                <div className="border border-gray-200 p-6">
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Profile Status
                                    </div>
                                    <div className="text-2xl font-black uppercase text-green-600">Active</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="mb-12">
                                <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <button
                                        onClick={() => setActiveTab("match")}
                                        className="border-2 border-gray-200 p-8 hover:border-black transition-colors group text-left"
                                    >
                                        <Sparkles className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-xl font-black mb-2">AI Matching</h4>
                                        <p className="text-sm text-gray-600">
                                            Get AI-powered referrer matches for your job search
                                        </p>
                                    </button>

                                    <Link
                                        href="/referrers"
                                        className="border-2 border-gray-200 p-8 hover:border-black transition-colors group"
                                    >
                                        <Users className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-xl font-black mb-2">Browse Referrers</h4>
                                        <p className="text-sm text-gray-600">
                                            Explore {referrers.length}+ active referrers from top companies
                                        </p>
                                    </Link>

                                    <Link
                                        href="/dashboard/requests"
                                        className="border-2 border-gray-200 p-8 hover:border-black transition-colors group"
                                    >
                                        <FileText className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-xl font-black mb-2">My Requests</h4>
                                        <p className="text-sm text-gray-600">
                                            View and manage your referral requests
                                        </p>
                                    </Link>

                                    <Link
                                        href="/messages"
                                        className="border-2 border-gray-200 p-8 hover:border-black transition-colors group"
                                    >
                                        <MessageSquare className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-xl font-black mb-2">Messages</h4>
                                        <p className="text-sm text-gray-600">
                                            Chat with referrers and manage conversations
                                        </p>
                                    </Link>
                                </div>
                            </div>

                            {/* Featured Referrers */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Featured Referrers</h3>
                                    <Link
                                        href="/referrers"
                                        className="text-sm font-bold uppercase tracking-widest hover:underline"
                                    >
                                        View All →
                                    </Link>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {referrers.map((referrer) => (
                                        <div key={referrer.id} className="border border-gray-200 p-6 hover:border-black transition-colors">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-black text-xl mb-4">
                                                {referrer.fullName[0]}
                                            </div>
                                            <div className="font-black text-xl mb-1">{referrer.fullName}</div>
                                            <div className="text-sm text-gray-500 mb-3">
                                                {referrer.company} • {referrer.jobTitle}
                                            </div>

                                            {referrer.skills && referrer.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {referrer.skills.slice(0, 3).map((skill) => (
                                                        <span key={skill} className="px-2 py-1 bg-gray-100 text-xs font-medium">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <Link
                                                href={`/referrers/${referrer.id}`}
                                                className="block w-full py-2 text-center border border-gray-200 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <header className="border-b border-gray-200 px-12 py-6">
                            <h2 className="text-3xl font-black uppercase tracking-tight">AI Matching</h2>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                                Get personalized referrer recommendations
                            </p>
                        </header>

                        <div className="p-12">
                            {matches.length === 0 ? (
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Target Company (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={targetCompany}
                                            onChange={(e) => setTargetCompany(e.target.value)}
                                            placeholder="e.g., Google, Meta, Amazon..."
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                    </div>

                                    <JobDescriptionInput
                                        value={jobDescription}
                                        onChange={setJobDescription}
                                        onExtractSuccess={(data) => {
                                            setExtractedJobData(data);
                                            if (data.company && !targetCompany) {
                                                setTargetCompany(data.company);
                                            }
                                        }}
                                    />

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="btn-primary w-full py-4 flex items-center justify-center gap-3"
                                    >
                                        {analyzing ? (
                                            <>
                                                <LoadingSpinner size="sm" />
                                                ANALYZING...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                FIND BEST MATCHES
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-8 flex items-center justify-between">
                                        <p className="text-sm text-gray-600">Found {matches.length} matches</p>
                                        <button
                                            onClick={() => setMatches([])}
                                            className="text-sm font-bold uppercase tracking-widest hover:underline"
                                        >
                                            New Search
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {matches.map((match) => (
                                            <div key={match.persona.id} className="border border-gray-200 p-6 hover:border-black transition-colors">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-black text-xl mb-4">
                                                    {match.persona.fullName[0]}
                                                </div>
                                                <div className="font-black text-xl mb-1">{match.persona.fullName}</div>
                                                <div className="text-sm text-gray-500 mb-2">
                                                    {match.persona.company} • {match.persona.role}
                                                </div>
                                                <div className="mb-3">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-green-600">
                                                        {Math.round(match.score * 100)}% Match
                                                    </span>
                                                </div>

                                                {match.sharedSkills.length > 0 && (
                                                    <div className="mb-4">
                                                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                            Shared Skills
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {match.sharedSkills.slice(0, 4).map((skill) => (
                                                                <span key={skill} className="px-2 py-1 bg-green-50 text-xs font-medium text-green-700">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-600 mb-4 line-clamp-2">{match.explanation}</p>

                                                <Link
                                                    href={`/request/${match.persona.id}?job=${encodeURIComponent(jobDescription)}&company=${encodeURIComponent(targetCompany)}`}
                                                    className="btn-primary w-full text-center block"
                                                >
                                                    SEND REQUEST
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
