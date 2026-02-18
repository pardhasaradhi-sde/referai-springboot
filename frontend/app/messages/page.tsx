"use client";

import { useEffect, useState } from "react";
import { api, getCurrentUserId } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Conversation } from "@/lib/api/types";

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const currentUserId = getCurrentUserId();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const data = await api.get<Conversation[]>("/api/conversations");
            setConversations(data || []);
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest hover:underline">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-5xl font-black tracking-tighter mt-4">MESSAGES</h1>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading...</div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 mb-4">No conversations yet</p>
                        <Link href="/dashboard" className="btn-primary">
                            Find Matches
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((conv) => {
                            // Show the other user (not the current user)
                            const otherUser =
                                conv.seeker.id === currentUserId ? conv.referrer : conv.seeker;
                            return (
                                <Link
                                    key={conv.id}
                                    href={`/messages/${conv.id}`}
                                    className="block p-6 border border-gray-200 hover:border-black transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-black text-xl">{otherUser.fullName}</div>
                                            <div className="text-sm text-gray-500">
                                                {otherUser.company} • {otherUser.jobTitle}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {conv.lastMessageAt
                                                ? new Date(conv.lastMessageAt).toLocaleDateString()
                                                : "New"}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
