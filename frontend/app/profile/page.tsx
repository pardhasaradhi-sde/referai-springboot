"use client";

import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Briefcase, FileText, Save } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { LoadingPage } from "@/components/ui/Loading";
import { FileUpload } from "@/components/profile/FileUpload";
import { parseDelimitedList } from "@/lib/utils";
import type { Profile, UpdateProfileRequest } from "@/lib/api/types";

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [skillsInput, setSkillsInput] = useState("");

    const [formData, setFormData] = useState({
        fullName: "",
        role: "seeker",
        company: "",
        jobTitle: "",
        department: "",
        yearsOfExperience: 0,
        seniority: "",
        skills: [] as string[],
        resumeText: "",
        resumeFileUrl: "",
        resumeFileName: "",
        bio: "",
        linkedinUrl: "",
        targetCompanies: [] as string[],
    });

    const router = useRouter();

    const loadProfile = useCallback(async () => {
        try {
            const profileData = await api.get<Profile>("/api/profiles/me");
            setFormData({
                fullName: profileData.fullName || "",
                role: profileData.role || "seeker",
                company: profileData.company || "",
                jobTitle: profileData.jobTitle || "",
                department: profileData.department || "",
                yearsOfExperience: profileData.yearsOfExperience || 0,
                seniority: profileData.seniority || "",
                skills: profileData.skills || [],
                resumeText: profileData.resumeText || "",
                resumeFileUrl: profileData.resumeFileUrl || "",
                resumeFileName: profileData.resumeFileName || "",
                bio: profileData.bio || "",
                linkedinUrl: profileData.linkedinUrl || "",
                targetCompanies: profileData.targetCompanies || [],
            });
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatePayload: UpdateProfileRequest = {
                fullName: formData.fullName,
                role: formData.role,
                company: formData.company || undefined,
                jobTitle: formData.jobTitle || undefined,
                department: formData.department || undefined,
                seniority: formData.seniority || undefined,
                skills: formData.skills,
                yearsOfExperience: formData.yearsOfExperience || undefined,
                resumeText: formData.resumeText || undefined,
                bio: formData.bio || undefined,
                linkedinUrl: formData.linkedinUrl || undefined,
                targetCompanies: formData.targetCompanies,
            };

            await api.put<Profile>("/api/profiles/me", updatePayload);
            showToast("Profile updated successfully!", "success");
            setEditing(false);
            setSkillsInput("");
            await loadProfile();
        } catch (error: unknown) {
            showToast(error instanceof Error ? error.message : "Failed to update profile", "error");
        } finally {
            setSaving(false);
        }
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

        setFormData((prev) => ({
            ...prev,
            skills: mergeUniqueSkills(prev.skills, parsedSkills),
        }));
        setSkillsInput("");
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            skills: prev.skills.filter((skill) => skill !== skillToRemove),
        }));
    };

    const handleSkillsKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "," || e.key === ";") {
            e.preventDefault();
            addSkillsFromInput();
            return;
        }

        if (e.key === "Backspace" && !skillsInput.trim() && formData.skills.length > 0) {
            e.preventDefault();
            setFormData((prev) => ({
                ...prev,
                skills: prev.skills.slice(0, -1),
            }));
        }
    };

    const handleCompaniesChange = (value: string) => {
        setFormData((prev) => ({ ...prev, targetCompanies: parseDelimitedList(value) }));
    };

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
                    <button
                        onClick={() => setEditing(!editing)}
                        className={`btn-primary ${editing ? "bg-gray-800" : ""}`}
                    >
                        {editing ? "Cancel" : "Edit Profile"}
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-12 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-black tracking-tighter mb-2">MY PROFILE</h1>
                    <p className="text-gray-500 text-sm">Manage your profile and preferences</p>
                </div>

                <div className="space-y-8">
                    {/* Basic Info */}
                    <section className="border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="w-5 h-5" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Basic Information</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                >
                                    <option value="seeker">Seeker (Looking for referrals)</option>
                                    <option value="referrer">Referrer (Can provide referrals)</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.linkedinUrl}
                                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                                    disabled={!editing}
                                    placeholder="https://linkedin.com/in/yourprofile"
                                    className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Professional Info */}
                    {(formData.role === "referrer" || formData.role === "both") && (
                        <section className="border border-gray-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Briefcase className="w-5 h-5" />
                                <h2 className="text-xl font-black uppercase tracking-tight">Professional Details</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                        Company
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.jobTitle}
                                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        disabled={!editing}
                                        className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                        Years of Experience
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.yearsOfExperience}
                                        onChange={(e) =>
                                            setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })
                                        }
                                        disabled={!editing}
                                        className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    Bio
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    disabled={!editing}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50 resize-none"
                                />
                            </div>
                        </section>
                    )}

                    {/* Skills & Resume */}
                    <section className="border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="w-5 h-5" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Skills & Resume</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    Skills (type a skill and press Enter)
                                </label>
                                {editing ? (
                                    <div className="space-y-3">
                                        {formData.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {formData.skills.map((skill) => (
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
                                ) : (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.skills.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-gray-100 text-sm font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {(formData.role === "seeker" || formData.role === "both") && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Target Companies (comma, semicolon, or new line separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.targetCompanies.join(", ")}
                                            onChange={(e) => handleCompaniesChange(e.target.value)}
                                            disabled={!editing}
                                            placeholder="Google, Meta, Amazon, Microsoft"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50"
                                        />
                                    </div>

                                    {editing && (
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Upload Resume (PDF or DOCX)
                                            </label>
                                            <FileUpload
                                                onUploadSuccess={(extractedText, fileUrl, fileName) => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        resumeText: extractedText,
                                                        resumeFileUrl: fileUrl,
                                                        resumeFileName: fileName,
                                                    }));
                                                }}
                                                currentFileName={formData.resumeFileName}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Resume Text {editing && "(Edit if needed)"}
                                        </label>
                                        <textarea
                                            value={formData.resumeText}
                                            onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
                                            disabled={!editing}
                                            rows={12}
                                            placeholder="Upload a file above or paste your resume text here..."
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none disabled:bg-gray-50 resize-none font-mono text-sm"
                                        />
                                        {formData.resumeText && !editing && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                {formData.resumeText.length} characters
                                            </p>
                                        )}
                                        {formData.resumeFileName && !editing && (
                                            <p className="text-xs text-gray-600 mt-2">
                                                Uploaded file: {formData.resumeFileName}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Save Button */}
                    {editing && (
                        <div className="flex gap-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2 flex-1"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "SAVING..." : "SAVE CHANGES"}
                            </button>
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setSkillsInput("");
                                    void loadProfile();
                                }}
                                className="px-8 py-3 border-2 border-gray-200 font-bold uppercase tracking-widest hover:border-black transition-colors"
                            >
                                CANCEL
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
