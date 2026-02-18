"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import type { Profile, UpdateProfileRequest } from "@/lib/api/types";

type UserRole = "seeker" | "referrer" | "both";

export default function ProfileSetupPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<UserRole>("seeker");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Seeker fields
    const [targetCompanies, setTargetCompanies] = useState("");
    const [resumeText, setResumeText] = useState("");

    // Referrer fields
    const [company, setCompany] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [seniority, setSeniority] = useState("");
    const [skills, setSkills] = useState("");
    const [yearsExp, setYearsExp] = useState("");
    const [bio, setBio] = useState("");

    const handleRoleSubmit = () => {
        setStep(2);
    };

    const handleProfileSubmit = async () => {
        setLoading(true);

        try {
            const updateData: UpdateProfileRequest = { role };

            if (role === "seeker" || role === "both") {
                updateData.targetCompanies = targetCompanies
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean);
                updateData.resumeText = resumeText;
            }

            if (role === "referrer" || role === "both") {
                updateData.company = company;
                updateData.jobTitle = jobTitle;
                updateData.department = department;
                updateData.seniority = seniority;
                updateData.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
                updateData.yearsOfExperience = parseInt(yearsExp) || 0;
                updateData.bio = bio;
            }

            console.log("Submitting profile update:", updateData);
            const result = await api.put<Profile>("/api/profiles/me", updateData);
            console.log("Profile updated successfully:", result);
            router.push("/dashboard");
        } catch (err: unknown) {
            console.error("Profile update failed:", err);
            alert(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-black text-white" : "bg-gray-200"
                                }`}
                        >
                            1
                        </div>
                        <div className={`flex-1 h-1 ${step >= 2 ? "bg-black" : "bg-gray-200"}`} />
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-black text-white" : "bg-gray-200"
                                }`}
                        >
                            2
                        </div>
                    </div>

                    <h1 className="text-5xl font-black tracking-tighter mb-2">
                        {step === 1 ? "CHOOSE YOUR ROLE" : "COMPLETE YOUR PROFILE"}
                    </h1>
                    <p className="text-gray-500">
                        {step === 1 ? "How will you use ReferAI?" : "Tell us about yourself"}
                    </p>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <button
                            onClick={() => setRole("seeker")}
                            className={`w-full p-8 border-2 text-left transition-all ${role === "seeker"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            <div className="text-2xl font-black mb-2">I&apos;M LOOKING FOR REFERRALS</div>
                            <p className="text-gray-600">
                                Find employees at your target companies and request referrals
                            </p>
                        </button>

                        <button
                            onClick={() => setRole("referrer")}
                            className={`w-full p-8 border-2 text-left transition-all ${role === "referrer"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            <div className="text-2xl font-black mb-2">I CAN REFER PEOPLE</div>
                            <p className="text-gray-600">
                                Help job seekers by referring qualified candidates at your company
                            </p>
                        </button>

                        <button
                            onClick={() => setRole("both")}
                            className={`w-full p-8 border-2 text-left transition-all ${role === "both"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            <div className="text-2xl font-black mb-2">BOTH</div>
                            <p className="text-gray-600">I want to find referrals AND help others</p>
                        </button>

                        <button onClick={handleRoleSubmit} className="btn-primary w-full py-4 mt-8">
                            CONTINUE
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8">
                        {(role === "seeker" || role === "both") && (
                            <div className="border-2 border-gray-200 p-8">
                                <h2 className="text-2xl font-black mb-6">JOB SEEKER INFO</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Target Companies (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={targetCompanies}
                                            onChange={(e) => setTargetCompanies(e.target.value)}
                                            placeholder="Google, Meta, Stripe"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Resume / Background
                                        </label>
                                        <textarea
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            placeholder="Paste your resume or describe your background..."
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(role === "referrer" || role === "both") && (
                            <div className="border-2 border-gray-200 p-8">
                                <h2 className="text-2xl font-black mb-6">REFERRER INFO</h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Company
                                            </label>
                                            <input
                                                type="text"
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                                placeholder="Google"
                                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Job Title
                                            </label>
                                            <input
                                                type="text"
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                placeholder="Senior Engineer"
                                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Department
                                            </label>
                                            <input
                                                type="text"
                                                value={department}
                                                onChange={(e) => setDepartment(e.target.value)}
                                                placeholder="Engineering"
                                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Seniority
                                            </label>
                                            <select
                                                value={seniority}
                                                onChange={(e) => setSeniority(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                            >
                                                <option value="">Select...</option>
                                                <option value="Junior">Junior</option>
                                                <option value="Mid-Level">Mid-Level</option>
                                                <option value="Senior">Senior</option>
                                                <option value="Staff">Staff</option>
                                                <option value="Principal">Principal</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Skills (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={skills}
                                            onChange={(e) => setSkills(e.target.value)}
                                            placeholder="React, TypeScript, Node.js"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Years of Experience
                                        </label>
                                        <input
                                            type="number"
                                            value={yearsExp}
                                            onChange={(e) => setYearsExp(e.target.value)}
                                            placeholder="5"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself..."
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="btn-outline flex-1 py-4">
                                BACK
                            </button>
                            <button
                                onClick={handleProfileSubmit}
                                disabled={loading}
                                className="btn-primary flex-1 py-4"
                            >
                                {loading ? "SAVING..." : "COMPLETE SETUP"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
