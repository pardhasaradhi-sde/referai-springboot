"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { api, apiStream, getToken, getCurrentUserId } from "@/lib/api/client";
import { createStompClient, subscribeToConversation } from "@/lib/websocket";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import { MoreVertical, UserMinus, Sparkles, X, Send, Bot, ChevronRight, WandSparkles, Loader2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import type { Conversation, Message, CoachStage } from "@/lib/api/types";

const STAGE_LABELS: Record<CoachStage, string> = {
    first_contact: "First Contact",
    building_rapport: "Building Rapport",
    made_the_ask: "Made The Ask",
    following_up: "Following Up",
};

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    // AI Coach state
    const [coachOpen, setCoachOpen] = useState(false);
    const [coachText, setCoachText] = useState("");
    const [coachLoading, setCoachLoading] = useState(false);
    const [coachStage, setCoachStage] = useState<CoachStage>("first_contact");
    const coachAbortRef = useRef<AbortController | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const stompClientRef = useRef<Client | null>(null);
    const router = useRouter();
    const currentUserId = getCurrentUserId();

    const resizeTextarea = useCallback(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }, []);

    const loadConversation = useCallback(async () => {
        try {
            const [conv, msgs] = await Promise.all([
                api.get<Conversation>(`/api/conversations/${id}`),
                api.get<Message[]>(`/api/conversations/${id}/messages`),
            ]);
            setConversation(conv);
            setMessages(msgs || []);

            // Detect conversation stage from message count
            const count = msgs?.length || 0;
            if (count === 0) setCoachStage("first_contact");
            else if (count < 5) setCoachStage("building_rapport");
            else if (count < 15) setCoachStage("made_the_ask");
            else setCoachStage("following_up");
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
            coachAbortRef.current?.abort();
        };
    }, [id, loadConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        resizeTextarea();
    }, [newMessage, resizeTextarea]);

    const sendMessageContent = async (content: string) => {
        try {
            await api.post<Message>(`/api/conversations/${id}/messages`, { content });
        } catch (err) {
            console.error("Failed to send message:", err);
            throw err;
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        const content = newMessage.trim();
        setNewMessage("");

        try {
            await sendMessageContent(content);
        } catch (err) {
            setNewMessage(content);
        }
    };

    const handleRemoveConnection = async () => {
        if (!conversation?.requestId) return;
        if (!confirm("Are you sure you want to remove this connection? This will end your conversation.")) return;

        try {
            await api.delete(`/api/requests/${conversation.requestId}/connection`);
            showToast("Connection removed successfully", "success");
            setTimeout(() => router.push("/dashboard/requests"), 1500);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to remove connection", "error");
        }
    };

    const handleCoachRequest = () => {
        if (!conversation || coachLoading) return;

        setCoachLoading(true);
        setCoachText("");
        setCoachOpen(true);

        const otherUserId = conversation.seeker.id === currentUserId
            ? conversation.referrer.id
            : conversation.seeker.id;

        const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : "";

        coachAbortRef.current?.abort();

        const abortCtrl = apiStream(
            "/api/matching/coach-suggest",
            {
                conversationId: id,
                referrerId: otherUserId,
                currentMessage: lastMessage,
                currentStage: coachStage,
            },
            (chunk) => {
                setCoachText((prev) => prev + chunk);
            },
            () => {
                setCoachLoading(false);
            },
            (error) => {
                console.error("Coach SSE error:", error);
                setCoachText("Sorry, I couldn't generate advice right now. Please try again.");
                setCoachLoading(false);
            }
        );

        coachAbortRef.current = abortCtrl;
    };

    const handleUseCoachSuggestion = () => {
        if (coachText) {
            setNewMessage(coachText);
            showToast("Coach suggestion added to your message", "success");
        }
    };

    const handleUseAndSendCoachSuggestion = async () => {
        if (!coachText.trim()) return;
        try {
            await sendMessageContent(coachText.trim());
            showToast("Coach suggestion sent", "success");
        } catch {
            showToast("Failed to send coach suggestion", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading conversation...</span>
                </div>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl font-black mb-4">Conversation not found</p>
                    <Link href="/dashboard/requests" className="text-sm font-bold uppercase tracking-widest hover:underline">
                        Back to Requests
                    </Link>
                </div>
            </div>
        );
    }

    const otherUser =
        conversation.seeker.id === currentUserId ? conversation.referrer : conversation.seeker;
    const isSeeker = conversation.seeker.id === currentUserId;

    return (
        <div className="h-[100dvh] bg-[#f7f7f6] flex font-sans selection:bg-black selection:text-white">
            <div className="flex flex-col flex-1 min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <Link
                            href="/dashboard/requests"
                            className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                        >
                            ← Back
                        </Link>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                                {otherUser.fullName[0]}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm font-black uppercase tracking-tight leading-none truncate">
                                    {otherUser.fullName}
                                </h1>
                                <p className="text-[10px] font-medium text-gray-400 mt-0.5 truncate">
                                    {otherUser.company} • {otherUser.jobTitle || otherUser.role}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        {isSeeker && (
                            <button
                                onClick={() => setCoachOpen((prev) => !prev)}
                                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors ${coachOpen ? "bg-black text-white border-black" : "bg-white text-black border-gray-200 hover:border-black"}`}
                            >
                                {coachOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
                                Coach
                            </button>
                        )}

                        <div className="hidden md:flex items-center px-2 py-1 border border-gray-200 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                            {STAGE_LABELS[coachStage]}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            {showOptionsMenu && (
                                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden z-30">
                                    <button
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            handleRemoveConnection();
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                        Remove Connection
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-gray-300 bg-white">
                                <div className="w-14 h-14 bg-black text-white mx-auto mb-5 flex items-center justify-center">
                                    <Send className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2">
                                    Start the conversation
                                </p>
                                <p className="text-xs text-gray-400">
                                    Introduce yourself clearly to {otherUser.fullName.split(" ")[0]}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === currentUserId;
                                    const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;
                                    const showMeta = i === messages.length - 1 || messages[i + 1]?.senderId !== msg.senderId;

                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                                            {!isMe && (
                                                <div className="w-8 shrink-0">
                                                    {showAvatar ? (
                                                        <div className="w-8 h-8 bg-black text-white text-[10px] font-black flex items-center justify-center">
                                                            {msg.senderName?.[0] || "R"}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}

                                            <div className={`max-w-[82%] md:max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                                <div
                                                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border ${isMe
                                                        ? "bg-black text-white border-black"
                                                        : "bg-white text-gray-900 border-gray-200"
                                                        }`}
                                                >
                                                    {msg.content}
                                                </div>
                                                {showMeta && (
                                                    <div className={`mt-1 text-[10px] uppercase tracking-widest ${isMe ? "text-gray-400" : "text-gray-500"}`}>
                                                        {isMe ? "You" : msg.senderName?.split(" ")[0]} • {new Date(msg.createdAt).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {isMe && <div className="w-8 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="border-t border-gray-200 bg-white px-4 md:px-6 py-4">
                    <div className="max-w-3xl mx-auto space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                {STAGE_LABELS[coachStage]}
                            </div>
                            {isSeeker && (
                                <button
                                    onClick={() => {
                                        setCoachOpen(true);
                                        handleCoachRequest();
                                    }}
                                    disabled={coachLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-gray-200 hover:border-black disabled:opacity-50"
                                >
                                    {coachLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <WandSparkles className="w-3 h-3" />}
                                    {coachLoading ? "Coaching..." : "Get Coach Draft"}
                                </button>
                            )}
                        </div>

                        <div className="flex items-end gap-2">
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onInput={resizeTextarea}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Write your message... (Enter to send, Shift+Enter for new line)"
                                className="w-full min-h-[44px] max-h-40 bg-[#f7f7f6] border border-gray-200 px-4 py-3 text-sm outline-none resize-none focus:border-black transition-colors"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                className="h-11 w-11 bg-black text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Coach Panel */}
            {(coachOpen || coachLoading) && isSeeker && (
                <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md bg-white border-l border-gray-200 flex flex-col shadow-2xl md:static md:shadow-none">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-black text-white flex items-center justify-center">
                                    <Bot className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">AI Coach</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">RAG + Live Streaming</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setCoachOpen(false);
                                    coachAbortRef.current?.abort();
                                }}
                                className="p-1.5 hover:bg-gray-100"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                            {(Object.entries(STAGE_LABELS) as [CoachStage, string][]).map(([stage, label]) => (
                                <button
                                    key={stage}
                                    onClick={() => setCoachStage(stage)}
                                    className={`px-2 py-2 text-[9px] font-bold uppercase tracking-widest border transition-colors ${coachStage === stage
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {!coachText && !coachLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <Bot className="w-10 h-10 text-gray-300 mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Coach is ready</p>
                                <p className="text-xs text-gray-400 max-w-xs mb-4">Get context-aware advice based on conversation history and profile retrieval.</p>
                                <button
                                    onClick={handleCoachRequest}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Generate Advice
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border border-gray-200 p-4 bg-[#f7f7f6]">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Draft Suggestion</span>
                                        {coachLoading && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Streaming
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                                        {coachText}
                                        {coachLoading && <span className="inline-block w-1.5 h-4 bg-black ml-1 animate-pulse" />}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        onClick={handleUseCoachSuggestion}
                                        disabled={!coachText.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest hover:border-black disabled:opacity-40"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                        Insert In Composer
                                    </button>
                                    <button
                                        onClick={handleUseAndSendCoachSuggestion}
                                        disabled={!coachText.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-40"
                                    >
                                        <Send className="w-3 h-3" />
                                        Send Directly
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white">
                        <button
                            onClick={handleCoachRequest}
                            disabled={coachLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-xs font-bold uppercase tracking-widest hover:border-black disabled:opacity-50"
                        >
                            <Sparkles className="w-3 h-3" />
                            {coachLoading ? "Generating..." : "Regenerate Advice"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
