"use client";

import { use, useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin, Calendar, Send, MessageCircle, CheckCircle, Clock } from "lucide-react";
import { LoadingPage } from "@/components/ui/Loading";
import type { Profile, ReferralRequest, PageResponse } from "@/lib/api/types";

export default function ReferrerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [referrer, setReferrer] = useState<Profile | null>(null);
    const [existingRequest, setExistingRequest] = useState<ReferralRequest | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [referrerData, requestsPage] = await Promise.all([
                api.get<Profile>(`/api/referrers/${id}`),
                api.get<PageResponse<ReferralRequest>>("/api/requests/outgoing"),
            ]);
            setReferrer(referrerData);

            // Check if there's an existing active request with this referrer
            const requests = requestsPage?.content || [];
            const activeRequest = requests.find(
                (req) => req.referrer.id === id && (req.status === 'pending' || req.status === 'accepted')
            );
            setExistingRequest(activeRequest || null);
        } catch {
            router.push("/referrers");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingPage />;
    if (!referrer) return null;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <nav className="border-b border-gray-200 px-4 md:px-12 py-4 md:py-6">
                <Link
                    href="/referrers"
                    className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest hover:text-gray-600"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Referrers
                </Link>
            </nav>

            <div className="max-w-4xl mx-auto px-4 md:px-12 py-8 md:py-12">
                {/* Profile Header */}
                <div className="mb-12">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-8 text-center sm:text-left">
                        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center font-black text-5xl flex-shrink-0">
                            {referrer.fullName[0]}
                        </div>
                        <div className="flex-1 w-full">
                            <h1 className="text-4xl font-black mb-3">{referrer.fullName}</h1>
                            <p className="text-xl text-gray-600 mb-4">
                                {referrer.jobTitle || "Engineer"}
                            </p>

                            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-500 mb-6">
                                {referrer.company && (
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        <span>{referrer.company}</span>
                                    </div>
                                )}
                                {referrer.department && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{referrer.department}</span>
                                    </div>
                                )}
                                {referrer.yearsOfExperience && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{referrer.yearsOfExperience} years experience</span>
                                    </div>
                                )}
                            </div>

                            {referrer.seniority && (
                                <div className="inline-block px-4 py-2 bg-gray-100 font-bold text-sm uppercase tracking-widest mb-6">
                                    {referrer.seniority}
                                </div>
                            )}
                        </div>
                    </div>

                    {referrer.bio && (
                        <div className="p-6 bg-gray-50 border border-gray-200">
                            <p className="text-gray-700">{referrer.bio}</p>
                        </div>
                    )}
                </div>

                {/* Skills */}
                {referrer.skills && referrer.skills.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Skills & Expertise</h2>
                        <div className="flex flex-wrap gap-3">
                            {referrer.skills.map((skill) => (
                                <span
                                    key={skill}
                                    className="px-4 py-2 bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="border-t border-gray-200 pt-8">
                    {existingRequest ? (
                        existingRequest.status === 'pending' ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3 py-4 bg-yellow-50 border-2 border-yellow-200 text-yellow-800">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-widest text-sm">Request Pending</span>
                                </div>
                                <p className="text-center text-sm text-gray-500">
                                    Your referral request is awaiting response
                                </p>
                            </div>
                        ) : existingRequest.conversationId ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3 py-4 bg-green-50 border-2 border-green-200 text-green-800">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-widest text-sm">Connected</span>
                                </div>
                                <Link
                                    href={`/messages/${existingRequest.conversationId}`}
                                    className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    MESSAGE
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3 py-4 bg-green-50 border-2 border-green-200 text-green-800">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-widest text-sm">Request Accepted</span>
                                </div>
                                <p className="text-center text-sm text-gray-500">
                                    Conversation is being set up...
                                </p>
                            </div>
                        )
                    ) : (
                        <Link
                            href={`/request/${id}`}
                            className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg"
                        >
                            <Send className="w-5 h-5" />
                            SEND REFERRAL REQUEST
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
