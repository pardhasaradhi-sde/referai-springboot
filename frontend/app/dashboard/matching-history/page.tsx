"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { showToast } from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/Loading";
import type { MatchingHistoryResponse, MatchingHistoryRun } from "@/lib/api/types";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function asStringArray(value: unknown): string[] {
  return asArray<unknown>(value)
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .filter((item) => item.trim().length > 0);
}

function toPct(value?: number): string {
  if (typeof value !== "number") return "-";
  const bounded = Math.max(0, Math.min(1, value));
  return `${Math.round(bounded * 100)}%`;
}

function toScore(value?: number): string {
  if (typeof value !== "number") return "-";
  return value.toFixed(1);
}

export default function MatchingHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<MatchingHistoryRun[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await api.get<MatchingHistoryResponse>("/api/matching/history?limit=20");
        setRuns(result.runs || []);
      } catch (error: unknown) {
        showToast(error instanceof Error ? error.message : "Failed to load matching history", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">Matching Pipeline History</h1>
          <p className="mt-3 text-sm text-gray-500 font-medium">
            Review previous matching runs, model signals, and ranked referrers for learning and iteration.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : runs.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-400">No matching runs recorded yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {runs.map((run) => (
              <section key={run.runId} className="border border-gray-200">
                <div className="p-6 md:p-8 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Run ID {run.runId.slice(0, 8)}</p>
                      <h2 className="text-2xl font-black tracking-tight uppercase mt-1">
                        {run.targetCompany ? `Target ${run.targetCompany}` : "No explicit target company"}
                      </h2>
                      <p className="text-xs text-gray-500 mt-2">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 border border-gray-200 bg-white">
                      <div className="px-4 py-3 border-r border-gray-200">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Evaluated</p>
                        <p className="text-xl font-black tracking-tight">{run.totalCandidatesEvaluated}</p>
                      </div>
                      <div className="px-4 py-3 border-r border-gray-200">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Tier A</p>
                        <p className="text-xl font-black tracking-tight">{run.retrievalTierCounts?.tier_a ?? 0}</p>
                      </div>
                      <div className="px-4 py-3 border-r border-gray-200">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Tier B</p>
                        <p className="text-xl font-black tracking-tight">{run.retrievalTierCounts?.tier_b ?? 0}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Total ms</p>
                        <p className="text-xl font-black tracking-tight">{run.pipelineTiming?.total_ms ?? "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">JD Must-Haves</p>
                      <div className="space-y-1">
                        {asStringArray(run.jdMustHaves).slice(0, 5).map((item) => (
                          <p key={item} className="text-sm text-gray-700">• {item}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Seeker Strengths</p>
                      <div className="space-y-1">
                        {asStringArray(run.seekerStrengths).slice(0, 3).map((item) => (
                          <p key={item} className="text-sm text-gray-700">• {item}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Seeker Gaps</p>
                      <div className="space-y-1">
                        {asStringArray(run.seekerGaps).slice(0, 3).map((item) => (
                          <p key={item} className="text-sm text-gray-700">• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-4">Top Ranked Referrers</p>
                  <div className="space-y-4">
                    {asArray<NonNullable<MatchingHistoryRun["matches"]>[number]>(run.matches).map((match) => (
                      <article key={`${run.runId}-${match.rank}-${match.candidateId}`} className="border border-gray-200 p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">#{match.rank} · Tier {match.tier || "-"}</p>
                            <h3 className="text-lg font-black tracking-tight uppercase mt-1">{match.fullName || "Unknown Candidate"}</h3>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                              {match.jobTitle || "Unknown Role"}
                              {match.company ? ` — ${match.company}` : ""}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="border border-gray-200 px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Combined</p>
                              <p className="text-lg font-black">{toScore(match.combinedScore)}</p>
                            </div>
                            <div className="border border-gray-200 px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Semantic</p>
                              <p className="text-lg font-black">{toPct(match.semanticScore)}</p>
                            </div>
                            <div className="border border-gray-200 px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Reply</p>
                              <p className="text-lg font-black">{toScore(match.replyProbability)}</p>
                            </div>
                            <div className="border border-gray-200 px-3 py-2">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Success</p>
                              <p className="text-lg font-black">{match.successLikelihoodPercent ?? "-"}%</p>
                            </div>
                          </div>
                        </div>

                        {match.openingSentence ? (
                          <p className="mt-4 text-sm bg-black text-white px-3 py-2 font-medium">{match.openingSentence}</p>
                        ) : null}

                        {match.reasoning ? (
                          <p className="mt-4 text-sm text-gray-700 leading-relaxed">{match.reasoning}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
