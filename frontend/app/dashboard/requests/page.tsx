"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReferralRequest, Conversation } from "@/lib/api/types";

export default function RequestsPage() {
    const [outgoing, setOutgoing] = useState<ReferralRequest[]>([]);
    const [incoming, setIncoming] = useState<ReferralRequest[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const [outgoingData, incomingData, convData] = await Promise.all([
                api.get<ReferralRequest[]>("/api/requests/outgoing"),
                api.get<ReferralRequest[]>("/api/requests/incoming"),
                api.get<Conversation[]>("/api/conversations"),
            ]);
            setOutgoing(outgoingData || []);
            setIncoming(incomingData || []);
            setConversations(convData || []);
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const findConversationId = (requestId: string): string | undefined => {
        return conversations.find((c) => c.requestId === requestId)?.id;
    };

    const handleAccept = async (requestId: string) => {
        try {
            const result = await api.post<Conversation>(
                `/api/requests/${requestId}/accept`
            );
            router.push(`/messages/${result.id}`);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to accept request");
        }
    };

    const handleDecline = async (requestId: string) => {
        if (!confirm("Are you sure you want to decline this request?")) return;
        try {
            await api.post(`/api/requests/${requestId}/decline`);
            loadRequests();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to decline request");
        }
    };

    return (
        <div className="min-h-screen bg-white px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest hover:underline">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-5xl font-black tracking-tighter mt-4">REQUESTS</h1>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Outgoing */}
                        <div>
                            <h2 className="text-2xl font-black mb-4">SENT ({outgoing.length})</h2>
                            {outgoing.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                                    No requests sent yet
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {outgoing.map((req) => (
                                        <div key={req.id} className="border border-gray-200 p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="font-black text-lg">{req.referrer.fullName}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {req.referrer.company} • {req.referrer.jobTitle}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`px-3 py-1 text-xs font-bold uppercase ${req.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : req.status === "accepted"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="text-sm mb-2">
                                                <span className="font-bold">Job:</span> {req.jobTitle}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                            {req.status === "accepted" && (
                                                <button
                                                    onClick={() => {
                                                        const convId = findConversationId(req.id);
                                                        if (convId) router.push(`/messages/${convId}`);
                                                        else router.push("/messages");
                                                    }}
                                                    className="btn-primary w-full mt-4"
                                                >
                                                    VIEW CONVERSATION
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Incoming */}
                        <div>
                            <h2 className="text-2xl font-black mb-4">RECEIVED ({incoming.length})</h2>
                            {incoming.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                                    No requests received yet
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {incoming.map((req) => (
                                        <div key={req.id} className="border border-gray-200 p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="font-black text-lg">{req.seeker.fullName}</div>
                                                    <div className="text-sm text-gray-500">Match: {Math.round((req.matchScore || 0) * 100)}%</div>
                                                </div>
                                                <span
                                                    className={`px-3 py-1 text-xs font-bold uppercase ${req.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : req.status === "accepted"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="text-sm mb-2">
                                                <span className="font-bold">Job:</span> {req.jobTitle}
                                            </div>
                                            <div className="text-sm mb-4 text-gray-600">{req.aiExplanation}</div>
                                            <div className="text-xs text-gray-500 mb-4">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                            {req.status === "pending" && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAccept(req.id)}
                                                        className="btn-primary flex-1"
                                                    >
                                                        ACCEPT
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecline(req.id)}
                                                        className="btn-outline flex-1"
                                                    >
                                                        DECLINE
                                                    </button>
                                                </div>
                                            )}
                                            {req.status === "accepted" && (
                                                <button
                                                    onClick={() => {
                                                        const convId = findConversationId(req.id);
                                                        if (convId) router.push(`/messages/${convId}`);
                                                        else router.push("/messages");
                                                    }}
                                                    className="btn-primary w-full"
                                                >
                                                    VIEW CONVERSATION
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

