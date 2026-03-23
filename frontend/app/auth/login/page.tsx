"use client";

import { useState } from "react";
import { api, setAuthInfo } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse, LoginOtpSentResponse } from "@/lib/api/types";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpStep, setOtpStep] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post<LoginOtpSentResponse>("/api/auth/login", {
                email,
                password,
            });
            setOtpStep(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await api.post<AuthResponse>("/api/auth/login/verify-otp", {
                email,
                password,
                otp: otp.replace(/\D/g, "").slice(0, 6),
            });

            setAuthInfo(data.accessToken, data.profile.id);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Verification failed");
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
                    <p className="text-gray-500 text-sm">
                        {otpStep
                            ? "Enter the 6-digit code we emailed you."
                            : "Log in to your account"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm mb-6">
                        {error}
                    </div>
                )}

                {!otpStep ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
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
                            {loading ? "SENDING CODE..." : "CONTINUE"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit} className="space-y-6">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                Verification code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="\d{6}"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                required
                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none transition-colors text-2xl tracking-[0.4em] text-center font-mono"
                                placeholder="000000"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="btn-primary w-full py-4"
                        >
                            {loading ? "VERIFYING..." : "VERIFY & LOG IN"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setOtpStep(false);
                                setOtp("");
                                setError("");
                            }}
                            className="w-full text-sm text-gray-600 underline"
                        >
                            Use a different account
                        </button>
                    </form>
                )}

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
