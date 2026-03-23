"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/ui/Toast";
import type { ReferralRequest, Conversation, OutcomeType, PageResponse } from "@/lib/api/types";
import { OUTCOME_LABELS } from "@/lib/api/types";
import {
    ChevronDown,
    CheckCircle,
    Inbox,
    SendHorizonal,
    MessageCircle,
    Clock3,
    ArrowUpRight,
    Sparkles,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "accepted" | "declined" | "expired";
type SortOption = "latest" | "oldest" | "status";
type ViewMode = "all" | "sent" | "received";

export default function RequestsPage() {
    const [outgoing, setOutgoing] = useState<ReferralRequest[]>([]);
    const [incoming, setIncoming] = useState<ReferralRequest[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [companyFilter, setCompanyFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("latest");
    const [viewMode, setViewMode] = useState<ViewMode>("received");

    const [outcomeMenuId, setOutcomeMenuId] = useState<string | null>(null);
    const [reportingOutcome, setReportingOutcome] = useState<string | null>(null);
    const [reportedOutcomes, setReportedOutcomes] = useState<Record<string, OutcomeType>>({});
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadRequests();
    }, []);

    useEffect(() => {
        setIsSearching(true);
        const timeout = setTimeout(() => {
            setSearchTerm(searchInput.trim().toLowerCase());
            setIsSearching(false);
        }, 350);

        return () => clearTimeout(timeout);
    }, [searchInput]);

    const fetchAllRequestPages = async (endpoint: "/api/requests/outgoing" | "/api/requests/incoming") => {
        const all: ReferralRequest[] = [];
        let page = 0;
        let last = false;
        const size = 100;

        while (!last) {
            const response = await api.get<PageResponse<ReferralRequest>>(`${endpoint}?page=${page}&size=${size}`);
            all.push(...(response?.content || []));
            last = response?.last ?? true;
            page += 1;

            if (page > 100) {
                last = true;
            }
        }

        return all;
    };

    const loadRequests = async () => {
        try {
            const [outgoingData, incomingData, convData] = await Promise.all([
                fetchAllRequestPages("/api/requests/outgoing"),
                fetchAllRequestPages("/api/requests/incoming"),
                api.get<Conversation[]>("/api/conversations"),
            ]);

            setOutgoing(outgoingData || []);
            setIncoming(incomingData || []);
            setConversations(convData || []);

            const initialOutcomes: Record<string, OutcomeType> = {};
            outgoingData.forEach((request) => {
                if (request.reportedOutcome) {
                    initialOutcomes[request.id] = request.reportedOutcome;
                }
            });
            setReportedOutcomes(initialOutcomes);
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
            setActionLoadingId(requestId);
            const result = await api.post<Conversation>(
                `/api/requests/${requestId}/accept`
            );
            router.push(`/messages/${result.id}`);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to accept request");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDecline = async (requestId: string) => {
        if (!confirm("Are you sure you want to decline this request?")) return;
        try {
            setActionLoadingId(requestId);
            await api.post(`/api/requests/${requestId}/decline`);
            loadRequests();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to decline request");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRemoveConnection = async (requestId: string) => {
        if (!confirm("Remove this active connection?")) return;
        try {
            setActionLoadingId(requestId);
            await api.delete(`/api/requests/${requestId}/connection`);
            showToast("Connection ended", "success");
            await loadRequests();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Failed to remove connection", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReportOutcome = async (requestId: string, outcomeType: OutcomeType) => {
        setReportingOutcome(requestId);
        try {
            await api.post(`/api/requests/${requestId}/report-outcome`, { outcomeType });
            setReportedOutcomes((prev) => ({ ...prev, [requestId]: outcomeType }));
            setOutcomeMenuId(null);
            showToast(`Outcome reported: ${OUTCOME_LABELS[outcomeType].label}`, "success");
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Failed to report outcome", "error");
        } finally {
            setReportingOutcome(null);
        }
    };

    const clearFilters = () => {
        setSearchInput("");
        setSearchTerm("");
        setStatusFilter("all");
        setCompanyFilter("");
        setRoleFilter("");
        setSortBy("latest");
        setViewMode("all");
    };

    const normalizeStatusOrder = (status: string) => {
        switch (status) {
            case "pending": return 0;
            case "accepted": return 1;
            case "declined": return 2;
            case "expired": return 3;
            default: return 4;
        }
    };

    const applyFiltersAndSort = (list: ReferralRequest[], kind: "outgoing" | "incoming") => {
        const filtered = list.filter((req) => {
            const counterpart = kind === "outgoing" ? req.referrer : req.seeker;
            const matchesSearch = !searchTerm || [
                counterpart?.fullName,
                counterpart?.company,
                counterpart?.jobTitle,
                req.jobTitle,
                req.targetCompany,
                req.aiExplanation,
            ]
                .filter(Boolean)
                .some((field) => field!.toLowerCase().includes(searchTerm));

            const matchesStatus = statusFilter === "all" || req.status === statusFilter;
            const matchesCompany = !companyFilter || counterpart?.company === companyFilter;
            const matchesRole = !roleFilter || (counterpart?.jobTitle || "").toLowerCase().includes(roleFilter.toLowerCase());

            return matchesSearch && matchesStatus && matchesCompany && matchesRole;
        });

        return filtered.sort((a, b) => {
            if (sortBy === "latest") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }

            const statusDiff = normalizeStatusOrder(a.status) - normalizeStatusOrder(b.status);
            if (statusDiff !== 0) return statusDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    };

    const visibleOutgoing = applyFiltersAndSort(outgoing, "outgoing");
    const visibleIncoming = applyFiltersAndSort(incoming, "incoming");

    const combined = [...outgoing, ...incoming];
    const companyOptions = Array.from(new Set(
        combined.map((req) => [req.referrer?.company, req.seeker?.company]).flat().filter(Boolean)
    )).sort() as string[];
    const roleOptions = Array.from(new Set(
        combined.map((req) => [req.referrer?.jobTitle, req.seeker?.jobTitle]).flat().filter(Boolean)
    )).sort() as string[];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
            case "accepted": return "bg-green-50 text-green-700 border border-green-200";
            case "declined": return "bg-red-50 text-red-700 border border-red-200";
            default: return "bg-gray-50 text-gray-700 border border-gray-200";
        }
    };

    const outgoingAcceptedCount = outgoing.filter((req) => req.status === "accepted").length;
    const incomingPendingCount = incoming.filter((req) => req.status === "pending").length;
    const totalPendingCount = combined.filter((req) => req.status === "pending").length;
    const hasNoResults = !loading && visibleOutgoing.length === 0 && visibleIncoming.length === 0;
    const activeFilterCount = [
        searchTerm,
        statusFilter !== "all" ? statusFilter : "",
        companyFilter,
        roleFilter,
        sortBy !== "latest" ? sortBy : "",
        viewMode !== "all" ? viewMode : "",
    ].filter(Boolean).length;

    const requestsLayoutClass = viewMode === "all"
        ? "grid grid-cols-1 xl:grid-cols-2 gap-6"
        : "grid grid-cols-1 gap-6";

    return (
        <div className="min-h-screen bg-[#f7f7f6] px-4 py-8 md:py-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 md:mb-10">
                    <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                        ← Back to Dashboard
                    </Link>
                    <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">Inbox</h1>
                            <p className="text-sm text-gray-500 mt-2">Manage incoming asks and track your referral outcomes.</p>
                        </div>
                        <Link
                            href="/referrers"
                            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white text-[11px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors w-fit"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Find More Referrers
                        </Link>
                    </div>
                    
                    {/* Stark Header Tabs */}
                    <div className="flex gap-8 border-b-2 border-transparent border-gray-200 mt-10">
                        <button
                            onClick={() => setViewMode("received")}
                            className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors border-b-2 -mb-[2px] ${viewMode === "received" ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-400"}`}
                        >
                            Received ({incoming.length})
                            {incomingPendingCount > 0 && <span className="ml-2 bg-black text-white px-2 py-0.5 text-[10px] align-middle">{incomingPendingCount}</span>}
                        </button>
                        <button
                            onClick={() => setViewMode("sent")}
                            className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors border-b-2 -mb-[2px] ${viewMode === "sent" ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-400"}`}
                        >
                            Sent ({outgoing.length})
                        </button>
                    </div>
                </div>

                <div className="mb-8 space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="SEARCH REQUESTS..."
                            className="w-full h-12 border border-gray-200 bg-white pl-12 pr-4 text-sm font-bold tracking-widest outline-none focus:border-black transition-all uppercase rounded-none"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="h-10 border border-gray-200 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest outline-none bg-white hover:border-black text-black appearance-none pr-8 cursor-pointer relative"
                            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        >
                            <option value="all">STATUS: ALL</option>
                            <option value="pending">PENDING</option>
                            <option value="accepted">ACCEPTED</option>
                            <option value="declined">DECLINED</option>
                            <option value="expired">EXPIRED</option>
                        </select>
                        
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="h-10 border border-gray-200 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest outline-none bg-white hover:border-black text-black appearance-none pr-8 cursor-pointer"
                            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        >
                            <option value="">COMPANY: ALL</option>
                            {companyOptions.map((company) => (
                                <option key={company} value={company}>{company.length > 15 ? company.substring(0, 15) + '...' : company}</option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="h-10 border border-gray-200 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest outline-none bg-white hover:border-black text-black appearance-none pr-8 cursor-pointer"
                            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        >
                            <option value="latest">SORT: LATEST</option>
                            <option value="oldest">SORT: OLDEST</option>
                            <option value="status">SORT: STATUS</option>
                        </select>

                        {(searchInput || statusFilter !== "all" || companyFilter || roleFilter || sortBy !== "latest") && (
                            <button
                                onClick={clearFilters}
                                className="h-10 inline-flex items-center gap-1.5 px-4 bg-white border border-gray-200 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3" /> CLEAR
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center border-t-2 border-black">
                        <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin mx-auto mb-3" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading inbox...</p>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.03)]">
                        {viewMode === "received" && (
                            <div className="divide-y-2 divide-gray-100">
                                {visibleIncoming.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400">
                                        <Inbox className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                                        <p className="text-sm font-black tracking-widest uppercase text-gray-600">NO RECEIVED REQUESTS</p>
                                    </div>
                                ) : (
                                    visibleIncoming.map((req) => {
                                        const companyName = req.targetCompany || "Unknown Company";
                                        const hideCompany = companyName !== "Unknown Company" && (req.jobTitle || "").toLowerCase().includes(companyName.toLowerCase());
                                        const date = new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                        return (
                                            <div key={req.id} className="p-5 md:p-8 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-6 group relative">
                                                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 flex-1 min-w-0">
                                                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-lg shrink-0 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                                        {req.seeker.fullName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-base md:text-lg leading-tight mb-3">
                                                            <span className="font-black text-black">{req.seeker.fullName}</span>
                                                            <span className="text-gray-500 mx-1.5 font-bold uppercase text-[11px] tracking-widest align-middle">IS ASKING FOR A REFERRAL TO</span>
                                                            <span className="font-black text-black">{req.jobTitle}</span>
                                                            {!hideCompany && (
                                                                <>
                                                                    <span className="text-gray-400 mx-1.5 font-bold uppercase text-[11px] tracking-widest align-middle">AT</span>
                                                                    <span className="font-black text-black">{companyName}</span>
                                                                </>
                                                            )}
                                                            <span className="inline-block bg-white text-black font-black text-[10px] px-2 py-1 ml-3 align-middle tracking-widest uppercase border border-gray-200">{Math.round((req.matchScore || 0) * 100)}% Match</span>
                                                        </p>
                                                        {req.aiExplanation && (
                                                            <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-relaxed border-l-[3px] border-black pl-3 bg-white py-1 italic font-medium">
                                                                &quot;{req.aiExplanation}&quot;
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-4">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{date}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : req.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                                {req.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-36 mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {req.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAccept(req.id)}
                                                                disabled={actionLoadingId === req.id}
                                                                className="flex-1 md:w-full py-2.5 bg-black border-2 border-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-transparent hover:text-black transition-colors"
                                                            >
                                                                {actionLoadingId === req.id ? "WAIT..." : "ACCEPT"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDecline(req.id)}
                                                                disabled={actionLoadingId === req.id}
                                                                className="flex-1 md:w-full py-2.5 bg-white border-2 border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                                                            >
                                                                DECLINE
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === "accepted" && (
                                                        <button
                                                            onClick={() => {
                                                                const convId = findConversationId(req.id);
                                                                router.push(convId ? `/messages/${convId}` : "/messages");
                                                            }}
                                                            className="flex-1 md:w-full py-2.5 bg-white border-2 border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-0.5"
                                                        >
                                                            OPEN CHAT
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {viewMode === "sent" && (
                            <div className="divide-y-2 divide-gray-100">
                                {visibleOutgoing.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400">
                                        <SendHorizonal className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                                        <p className="text-sm font-black tracking-widest uppercase text-gray-600">NO SENT REQUESTS</p>
                                    </div>
                                ) : (
                                    visibleOutgoing.map((req) => {
                                        const reported = reportedOutcomes[req.id];
                                        const companyName = req.targetCompany || req.referrer.company || "Unknown Company";
                                        const hideCompany = companyName !== "Unknown Company" && (req.jobTitle || "").toLowerCase().includes(companyName.toLowerCase());
                                        const date = new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                        
                                        return (
                                            <div key={req.id} className="p-5 md:p-8 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-6 group">
                                                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 flex-1 min-w-0">
                                                    <div className="w-12 h-12 bg-white border-2 border-black text-black flex items-center justify-center font-black text-lg shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        {req.referrer.fullName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-base md:text-lg leading-tight mb-3">
                                                            <span className="font-black text-black">{req.referrer.fullName}</span>
                                                            <span className="text-gray-500 mx-1.5 font-bold uppercase text-[11px] tracking-widest align-middle">WAS ASKED FOR A REFERRAL TO</span>
                                                            <span className="font-black text-black">{req.jobTitle}</span>
                                                            {!hideCompany && (
                                                                <>
                                                                    <span className="text-gray-400 mx-1.5 font-bold uppercase text-[11px] tracking-widest align-middle">AT</span>
                                                                    <span className="font-black text-black">{companyName}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                        
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{date}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : req.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                                {req.status}
                                                            </span>
                                                        </div>

                                                        {reported && (
                                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 mt-3 border ${OUTCOME_LABELS[reported].color.replace('text-', 'border-').replace('text-', 'bg-').replace('-600', '-100')}`}>
                                                                <span className="text-sm">{OUTCOME_LABELS[reported].emoji}</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                                                                    {OUTCOME_LABELS[reported].label}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-40 mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {req.status === "accepted" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    const convId = findConversationId(req.id);
                                                                    router.push(convId ? `/messages/${convId}` : "/messages");
                                                                }}
                                                                className="flex-1 md:w-full py-2.5 bg-black border-2 border-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-transparent hover:text-black transition-colors"
                                                            >
                                                                OPEN CHAT
                                                            </button>
                                                            {!reported && (
                                                                <div className="relative flex-1 md:w-full">
                                                                    <button
                                                                        onClick={() => setOutcomeMenuId(outcomeMenuId === req.id ? null : req.id)}
                                                                        disabled={reportingOutcome === req.id}
                                                                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-white border-2 border-gray-200 text-black text-[10px] font-black uppercase tracking-widest hover:border-black transition-colors"
                                                                    >
                                                                        OUTCOME <ChevronDown className={`w-3 h-3 transition-transform ${outcomeMenuId === req.id ? "rotate-180" : ""}`} />
                                                                    </button>

                                                                    {outcomeMenuId === req.id && (
                                                                        <div className="absolute right-0 md:left-0 md:right-auto mt-1 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 w-48">
                                                                            <div className="py-2 border-b-2 border-black px-4 bg-gray-50">
                                                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">RECORD OUTCOME</span>
                                                                            </div>
                                                                            {(Object.entries(OUTCOME_LABELS) as [OutcomeType, typeof OUTCOME_LABELS[OutcomeType]][]).map(
                                                                                ([type, { label, emoji }]) => (
                                                                                    <button
                                                                                        key={type}
                                                                                        onClick={() => handleReportOutcome(req.id, type)}
                                                                                        className="w-full px-4 py-3 text-left hover:bg-black hover:text-white flex items-center gap-3 transition-colors border-b last:border-b-0 border-gray-200 group/btn"
                                                                                    >
                                                                                        <span className="text-base group-hover/btn:scale-110 transition-transform">{emoji}</span>
                                                                                        <span className="font-bold text-[10px] uppercase tracking-widest">{label}</span>
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

    );
}
