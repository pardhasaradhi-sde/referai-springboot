"use client";

import { useState, KeyboardEvent } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/profile/FileUpload";
import { parseDelimitedList } from "@/lib/utils";
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
    const [resumeFileName, setResumeFileName] = useState("");

    // Referrer fields
    const [company, setCompany] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [seniority, setSeniority] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [skillsInput, setSkillsInput] = useState("");
    const [yearsExp, setYearsExp] = useState("");
    const [bio, setBio] = useState("");

    const handleRoleSubmit = () => {
        setStep(2);
    };

    const mergeUniqueSkills = (existing: string[], incoming: string[]) => {
        const seen = new Set(existing.map((skill) => skill.toLowerCase()));
        const merged = [...existing];

        for (const rawSkill of incoming) {
            const skill = rawSkill.trim();
            if (!skill) continue;

            const key = skill.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(skill);
            }
        }

        return merged;
    };

    const addSkillsFromInput = () => {
        const parsedSkills = parseDelimitedList(skillsInput);
        if (!parsedSkills.length) return;

        setSkills((prev) => mergeUniqueSkills(prev, parsedSkills));
        setSkillsInput("");
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills((prev) => prev.filter((skill) => skill !== skillToRemove));
    };

    const handleSkillsKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "," || e.key === ";") {
            e.preventDefault();
            addSkillsFromInput();
            return;
        }

        if (e.key === "Backspace" && !skillsInput.trim() && skills.length > 0) {
            e.preventDefault();
            setSkills((prev) => prev.slice(0, -1));
        }
    };

    const handleProfileSubmit = async () => {
        setLoading(true);

        try {
            const updateData: UpdateProfileRequest = { role };

            if (role === "seeker" || role === "both") {
                updateData.targetCompanies = parseDelimitedList(targetCompanies);
                updateData.resumeText = resumeText;
            }

            if (role === "referrer" || role === "both") {
                updateData.company = company;
                updateData.jobTitle = jobTitle;
                updateData.department = department;
                updateData.seniority = seniority;
                updateData.skills = skills;
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
                                            Target Companies (comma, semicolon, or new line separated)
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
                                            Upload Resume (PDF or DOCX)
                                        </label>
                                        <FileUpload
                                            onUploadSuccess={(extractedText, fileUrl, fileName) => {
                                                setResumeText(extractedText);
                                                setResumeFileName(fileName);
                                            }}
                                            currentFileName={resumeFileName}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Resume Text (Edit if needed)
                                        </label>
                                        <textarea
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            placeholder="Upload a file above or paste your resume text here..."
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
                                            Skills (type a skill and press Enter)
                                        </label>
                                        <div className="space-y-3">
                                            {skills.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {skills.map((skill) => (
                                                        <span
                                                            key={skill}
                                                            className="px-3 py-1 bg-gray-100 text-sm font-medium inline-flex items-center gap-2"
                                                        >
                                                            {skill}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSkill(skill)}
                                                                className="text-gray-500 hover:text-black leading-none"
                                                                aria-label={`Remove ${skill}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={skillsInput}
                                                    onChange={(e) => setSkillsInput(e.target.value)}
                                                    onKeyDown={handleSkillsKeyDown}
                                                    onBlur={addSkillsFromInput}
                                                    placeholder="Type skill and press Enter"
                                                    className="flex-1 px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addSkillsFromInput}
                                                    disabled={!skillsInput.trim()}
                                                    className="px-4 py-3 border border-gray-200 font-bold uppercase tracking-widest hover:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-500">
                                                Press Enter to add a skill, then type the next one.
                                            </p>
                                        </div>
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
