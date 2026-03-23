"use client";

import { use, useState, useEffect, useRef } from "react";
import { api } from "@/lib/api/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send, Edit3 } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { LoadingPage, LoadingSpinner } from "@/components/ui/Loading";
import type { Profile, GenerateMessageResponse, ReferralRequest } from "@/lib/api/types";

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [referrer, setReferrer] = useState<Profile | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);

    const [message, setMessage] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const initialGenerationTriggered = useRef(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const jobDescription = searchParams.get("job") || "";
    const targetCompany = searchParams.get("company") || "";

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [profileData, referrerData] = await Promise.all([
                api.get<Profile>("/api/profiles/me"),
                api.get<Profile>(`/api/referrers/${id}`),
            ]);

            setProfile(profileData);
            setReferrer(referrerData);

            // React Strict Mode can invoke effects twice in development.
            // Ensure initial generation runs only once.
            if (!initialGenerationTriggered.current) {
                initialGenerationTriggered.current = true;
                await generateMessage(profileData, referrerData);
            }
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const generateMessage = async (seekerProfile: Profile, referrerProfile: Profile) => {
        setGenerating(true);
        try {
            // Try UUID-based Python AI endpoint first
            const result = await api.post<GenerateMessageResponse>("/api/matching/generate-message", {
                referrerId: referrerProfile.id,
                seekerName: seekerProfile.fullName,
                referrerName: referrerProfile.fullName,
                referrerCompany: referrerProfile.company || "the company",
                jobContext: jobDescription || `Position at ${referrerProfile.company}`,
                sharedSkills: seekerProfile.skills?.slice(0, 5) || [],
            });
            setMessage(result.message || "");
        } catch {
            // Fallback message
            setMessage(
                `Hi ${referrerProfile.fullName.split(" ")[0]},\n\nI'm interested in opportunities at ${referrerProfile.company} and noticed we share similar skills and experience. I'd love to connect and learn more about your experience there.\n\nBest regards,\n${seekerProfile.fullName}`
            );
        } finally {
            setGenerating(false);
        }
    };

    const handleRegenerateMessage = () => {
        if (profile && referrer) {
            generateMessage(profile, referrer);
        }
    };

    const handleSendRequest = async () => {
        if (!message.trim()) {
            showToast("Please write a message", "warning");
            return;
        }
        if (!referrer || !profile) return;

        setSending(true);
        try {
            const result = await api.post<ReferralRequest>("/api/requests", {
                referrerId: referrer.id,
                jobTitle: jobDescription
                    ? jobDescription.slice(0, 100)
                    : `Position at ${referrer.company}`,
                jobDescription: jobDescription || undefined,
                targetCompany: targetCompany || referrer.company || "",
                initialMessage: message,
            });

            if (result.id) {
                showToast("Request sent successfully!", "success");
                setTimeout(() => router.push("/dashboard/requests"), 1500);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to send request";

            if (errorMessage.includes("already have")) {
                showToast("You already have a pending or active request with this referrer", "warning");
                setTimeout(() => router.push("/dashboard/requests"), 2000);
            } else if (errorMessage.includes("Cannot send request to yourself")) {
                showToast("You cannot send a request to yourself", "error");
            } else {
                showToast(errorMessage, "error");
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) return <LoadingPage />;
    if (!referrer) return null;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <nav className="border-b border-gray-200 px-4 md:px-12 py-4 md:py-6">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest hover:text-gray-600"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Matches
                </Link>
            </nav>

            <div className="max-w-4xl mx-auto px-4 md:px-12 py-8 md:py-12">
                {/* Referrer Info */}
                <div className="mb-8 md:mb-12 p-6 sm:p-8 border border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center font-black text-3xl flex-shrink-0">
                            {referrer.fullName[0]}
                        </div>
                        <div className="flex-1 w-full mt-2 sm:mt-0">
                            <h1 className="text-2xl sm:text-3xl font-black mb-2">{referrer.fullName}</h1>
                            <p className="text-gray-600 mb-3 text-sm sm:text-base">
                                {referrer.jobTitle} at {referrer.company}
                            </p>
                            {referrer.skills && referrer.skills.length > 0 && (
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                    {referrer.skills.slice(0, 6).map((skill) => (
                                        <span key={skill} className="px-3 py-1 bg-gray-100 text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {referrer.bio && (
                                <p className="mt-4 text-sm text-gray-700">{referrer.bio}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Message Section */}
                <div className="space-y-6">
                    <div>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-4">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Your Message</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {generating ? "AI is crafting your message..." : "AI-generated • Edit freely"}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button
                                    onClick={handleRegenerateMessage}
                                    disabled={generating}
                                    className="px-4 py-2 border border-gray-200 text-xs font-bold uppercase tracking-widest hover:border-black transition-colors flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {generating ? "Generating..." : "Regenerate"}
                                </button>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isEditing
                                        ? "bg-black text-white"
                                        : "border border-gray-200 hover:border-black"
                                        }`}
                                >
                                    <Edit3 className="w-4 h-4" />
                                    {isEditing ? "Done Editing" : "Edit"}
                                </button>
                            </div>
                        </div>

                        {generating ? (
                            <div className="border border-gray-200 p-12 flex items-center justify-center">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="relative">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={!isEditing}
                                    rows={12}
                                    className={`w-full px-6 py-4 border-2 outline-none resize-none transition-colors ${isEditing
                                        ? "border-black bg-white"
                                        : "border-gray-200 bg-gray-50"
                                        }`}
                                />
                                {!isEditing && (
                                    <div className="absolute top-4 right-4">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-widest">
                                            AI Generated
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8">
                        <button
                            onClick={handleSendRequest}
                            disabled={sending || generating}
                            className="btn-primary flex-1 py-4 flex items-center justify-center gap-3"
                        >
                            <Send className="w-5 h-5" />
                            {sending ? "SENDING..." : "SEND REFERRAL REQUEST"}
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-8 py-4 border-2 border-gray-200 font-bold uppercase tracking-widest hover:border-black transition-colors flex items-center justify-center w-full sm:w-auto"
                        >
                            Cancel
                        </Link>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200">
                        <p className="text-xs text-blue-800">
                            <strong>Tip:</strong> Personalize your message to increase your chances of
                            getting a response. Mention specific skills or experiences you share!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
