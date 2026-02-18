"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Building2, Briefcase } from "lucide-react";
import { LoadingPage } from "@/components/ui/Loading";
import type { Profile } from "@/lib/api/types";

export default function ReferrersPage() {
    const [referrers, setReferrers] = useState<Profile[]>([]);
    const [filteredReferrers, setFilteredReferrers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");

    const router = useRouter();

    useEffect(() => {
        loadReferrers();
    }, []);

    useEffect(() => {
        filterReferrers();
    }, [searchTerm, companyFilter, referrers]);

    const loadReferrers = async () => {
        try {
            const data = await api.get<Profile[]>("/api/referrers");
            setReferrers(data || []);
            setFilteredReferrers(data || []);
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const filterReferrers = () => {
        let filtered = referrers;

        if (searchTerm) {
            filtered = filtered.filter(
                (r) =>
                    r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.skills?.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (companyFilter) {
            filtered = filtered.filter((r) => r.company === companyFilter);
        }

        setFilteredReferrers(filtered);
    };

    const companies = Array.from(new Set(referrers.map((r) => r.company).filter(Boolean))).sort() as string[];

    if (loading) return <LoadingPage />;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <nav className="border-b border-gray-200 px-12 py-6 flex items-center justify-between">
                <Link href="/dashboard" className="text-2xl font-black tracking-tighter uppercase">
                    ReferAI
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest hover:text-gray-600">
                        Dashboard
                    </Link>
                    <Link href="/profile" className="text-sm font-bold uppercase tracking-widest hover:text-gray-600">
                        Profile
                    </Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-12 py-12">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-8 h-8" />
                        <h1 className="text-4xl font-black tracking-tighter">BROWSE REFERRERS</h1>
                    </div>
                    <p className="text-gray-500 text-sm">
                        {filteredReferrers.length} active referrers ready to help
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, role, or skills..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 focus:border-black outline-none"
                        />
                    </div>

                    <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 focus:border-black outline-none appearance-none"
                        >
                            <option value="">All Companies</option>
                            {companies.map((company) => (
                                <option key={company} value={company}>
                                    {company}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Referrers Grid */}
                {filteredReferrers.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200">
                        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 text-lg">No referrers found</p>
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setCompanyFilter("");
                            }}
                            className="mt-4 text-sm font-bold uppercase tracking-widest hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReferrers.map((referrer) => (
                            <div
                                key={referrer.id}
                                className="border border-gray-200 p-6 hover:border-black transition-colors group"
                            >
                                {/* Avatar & Name */}
                                <div className="mb-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center font-black text-2xl mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                                        {referrer.fullName[0]}
                                    </div>
                                    <h3 className="font-black text-xl mb-1">{referrer.fullName}</h3>
                                    <p className="text-sm text-gray-600 mb-1">
                                        {referrer.jobTitle || "Engineer"}
                                    </p>
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {referrer.company}
                                    </p>
                                </div>

                                {/* Skills */}
                                {referrer.skills && referrer.skills.length > 0 && (
                                    <div className="mb-4">
                                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                            Skills
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {referrer.skills.slice(0, 5).map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="px-2 py-1 bg-gray-100 text-xs font-medium group-hover:bg-gray-200 transition-colors"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {referrer.skills.length > 5 && (
                                                <span className="px-2 py-1 text-xs font-medium text-gray-400">
                                                    +{referrer.skills.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bio */}
                                {referrer.bio && (
                                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">{referrer.bio}</p>
                                )}

                                {/* Experience */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                    <Briefcase className="w-4 h-4" />
                                    <span>{referrer.yearsOfExperience || 0} years experience</span>
                                    <span>•</span>
                                    <span>{referrer.seniority || "Mid-Level"}</span>
                                </div>

                                {/* View Profile Button */}
                                <Link
                                    href={`/referrers/${referrer.id}`}
                                    className="block w-full py-3 text-center border-2 border-gray-200 font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white hover:border-black transition-colors"
                                >
                                    View Profile
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
