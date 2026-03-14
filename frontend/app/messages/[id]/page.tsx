"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { api, getToken, getCurrentUserId } from "@/lib/api/client";
import { createStompClient, subscribeToConversation } from "@/lib/websocket";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import { MoreVertical, UserMinus } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import type { Conversation, Message } from "@/lib/api/types";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const stompClientRef = useRef<Client | null>(null);
    const router = useRouter();
    const currentUserId = getCurrentUserId();

    const loadConversation = useCallback(async () => {
        try {
            const [conv, msgs] = await Promise.all([
                api.get<Conversation>(`/api/conversations/${id}`),
                api.get<Message[]>(`/api/conversations/${id}/messages`),
            ]);
            setConversation(conv);
            setMessages(msgs || []);
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        loadConversation();

        const token = getToken();
        if (token) {
            const client = createStompClient(token);
            stompClientRef.current = client;

            client.onConnect = () => {
                subscribeToConversation(client, id, (msg: unknown) => {
                    const typedMsg = msg as Message;
                    setMessages((prev) =>
                        prev.find((m) => m.id === typedMsg.id) ? prev : [...prev, typedMsg]
                    );
                });
            };

            client.activate();
        }

        return () => {
            stompClientRef.current?.deactivate();
        };
    }, [id, loadConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage("");

        try {
            await api.post<Message>(`/api/conversations/${id}/messages`, { content });
        } catch (err) {
            console.error("Failed to send message:", err);
            setNewMessage(content);
        }
    };

    const handleRemoveConnection = async () => {
        if (!conversation?.requestId) return;

        if (!confirm("Are you sure you want to remove this connection? This will end your conversation.")) {
            return;
        }

        try {
            await api.delete(`/api/requests/${conversation.requestId}/connection`);
            showToast("Connection removed successfully", "success");
            setTimeout(() => router.push("/dashboard/requests"), 1500);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to remove connection", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                Conversation not found
            </div>
        );
    }

    const otherUser =
        conversation.seeker.id === currentUserId ? conversation.referrer : conversation.seeker;

    return (
        <div className="h-screen bg-brand-gray flex flex-col font-sans selection:bg-brand-accent selection:text-black">
            <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <Link
                        href="/dashboard/requests"
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                    >
                        Exit Studio
                    </Link>
                    <div className="h-8 w-px bg-gray-200" />
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter leading-none">
                            {otherUser.fullName}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            {otherUser.company} | {otherUser.role || "Member"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Live Connection
                        </span>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                        {showOptionsMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden z-20">
                                <button
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        handleRemoveConnection();
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                                >
                                    <UserMinus className="w-4 h-4" />
                                    Remove Connection
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-white">
                <div className="max-w-4xl mx-auto py-12 px-8 space-y-12">
                    {messages.length === 0 ? (
                        <div className="text-center py-20 opacity-30">
                            <p className="text-6xl font-black uppercase tracking-tighter mb-4">
                                BEGIN
                                <br />
                                TRANSMISSION
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest">
                                No messages yet. Break the silence.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMe = msg.senderId === currentUserId;
                            const showHeader =
                                i === 0 || messages[i - 1].senderId !== msg.senderId;

                            return (
                                <div key={msg.id} className="group flex gap-8">
                                    <div className="w-24 flex-shrink-0 text-right pt-1 hidden md:block">
                                        {showHeader && (
                                            <span className="text-[10px] font-black uppercase tracking-widest block mb-1">
                                                {isMe ? "YOU" : msg.senderName.split(" ")[0]}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-mono text-gray-300 block group-hover:text-gray-500 transition-colors">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>

                                    <div className="flex-1 max-w-2xl">
                                        <p className="text-lg md:text-xl font-medium leading-relaxed text-gray-900 whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-8">
                <div className="max-w-4xl mx-auto flex gap-6 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="TYPE YOUR MESSAGE..."
                            className="w-full bg-transparent text-xl font-medium placeholder:text-gray-300 outline-none resize-none py-4 border-b-2 border-transparent focus:border-black transition-all h-auto max-h-48"
                            rows={1}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="btn-primary h-14 px-8 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </div>
    );
}
