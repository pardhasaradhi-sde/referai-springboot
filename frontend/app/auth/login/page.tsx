"use client";

import { useState } from "react";
import { api, setAuthInfo } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse } from "@/lib/api/types";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await api.post<AuthResponse>("/api/auth/login", {
                email,
                password,
            });

            setAuthInfo(data.accessToken, data.profile.id);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="mb-12">
                    <Link href="/" className="text-2xl font-black tracking-tighter uppercase">
                        ReferAI
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter mt-8 mb-2">
                        WELCOME BACK
                    </h1>
                    <p className="text-gray-500 text-sm">Log in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-4"
                    >
                        {loading ? "LOGGING IN..." : "LOG IN"}
                    </button>
                </form>

                <p className="text-center mt-8 text-sm text-gray-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/signup" className="text-black font-bold underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
