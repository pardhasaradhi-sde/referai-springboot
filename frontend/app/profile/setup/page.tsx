"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/profile/FileUpload";
import { SearchableDropdown } from "@/components/onboarding/SearchableDropdown";
import { SkillsAutocomplete } from "@/components/onboarding/SkillsAutocomplete";
import { ProgressTracker } from "@/components/onboarding/ProgressTracker";
import { parseDelimitedList } from "@/lib/utils";
import {
  DEPARTMENTS,
  SENIORITY_LEVELS,
  SKILLS_DATABASE,
  JOB_SEARCH_STATUS,
  AVAILABILITY_STATUS,
  CONTACT_METHODS,
  MAJOR_TECH_HUBS
} from "@/lib/constants/onboarding";
import type { Profile, UpdateProfileRequest } from "@/lib/api/types";

type UserRole = "seeker" | "referrer" | "both";

const STEPS = [
  { number: 1, name: "Role", completed: false },
  { number: 2, name: "Basic Info", completed: false },
  { number: 3, name: "Details", completed: false },
  { number: 4, name: "Review", completed: false }
];

export default function ProfileSetupPage() {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState<UserRole>("seeker");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Basic Info
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [location, setLocation] = useState("");
    const [preferredContact, setPreferredContact] = useState("");

    // Seeker fields
    const [targetCompanies, setTargetCompanies] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [resumeFileName, setResumeFileName] = useState("");
    const [jobSearchStatus, setJobSearchStatus] = useState("");

    // Referrer fields
    const [company, setCompany] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [seniority, setSeniority] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [yearsExp, setYearsExp] = useState("");
    const [bio, setBio] = useState("");
    const [availability, setAvailability] = useState("");

    // Draft persistence - load on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('onboarding-draft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                const draftAge = Date.now() - draft.timestamp;
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                
                if (draftAge < sevenDays) {
                    setStep(draft.step || 1);
                    setRole(draft.role || "seeker");
                    setLinkedinUrl(draft.linkedinUrl || "");
                    setLocation(draft.location || "");
                    setPreferredContact(draft.preferredContact || "");
                    setTargetCompanies(draft.targetCompanies || "");
                    setResumeText(draft.resumeText || "");
                    setResumeFileName(draft.resumeFileName || "");
                    setJobSearchStatus(draft.jobSearchStatus || "");
                    setCompany(draft.company || "");
                    setJobTitle(draft.jobTitle || "");
                    setDepartment(draft.department || "");
                    setSeniority(draft.seniority || "");
                    setSkills(draft.skills || []);
                    setYearsExp(draft.yearsExp || "");
                    setBio(draft.bio || "");
                    setAvailability(draft.availability || "");
                } else {
                    localStorage.removeItem('onboarding-draft');
                }
            } catch (e) {
                console.error('Failed to load draft:', e);
                localStorage.removeItem('onboarding-draft');
            }
        }
    }, []);

    // Auto-save draft
    useEffect(() => {
        const timer = setTimeout(() => {
            const draft = {
                timestamp: Date.now(),
                step,
                role,
                linkedinUrl,
                location,
                preferredContact,
                targetCompanies,
                resumeText,
                resumeFileName,
                jobSearchStatus,
                company,
                jobTitle,
                department,
                seniority,
                skills,
                yearsExp,
                bio,
                availability
            };
            localStorage.setItem('onboarding-draft', JSON.stringify(draft));
        }, 2000);

        return () => clearTimeout(timer);
    }, [step, role, linkedinUrl, location, preferredContact, targetCompanies, resumeText, resumeFileName, jobSearchStatus, company, jobTitle, department, seniority, skills, yearsExp, bio, availability]);

    const handleRoleSubmit = () => {
        setStep(2);
    };

    const handleBasicInfoSubmit = () => {
        setStep(3);
    };

    const handleDetailsSubmit = () => {
        setStep(4);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleProfileSubmit = async () => {
        setLoading(true);

        try {
            const updateData: UpdateProfileRequest = { role };

            // Basic info
            if (linkedinUrl) updateData.linkedinUrl = linkedinUrl;

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
            
            // Clear draft on success
            localStorage.removeItem('onboarding-draft');
            
            router.push("/dashboard");
        } catch (err: unknown) {
            console.error("Profile update failed:", err);
            alert(err instanceof Error ? err.message : "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    const currentSteps = STEPS.map(s => ({
        ...s,
        completed: s.number < step
    }));

    return (
        <div className="min-h-screen bg-white px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <ProgressTracker currentStep={step} steps={currentSteps} />

                <div className="mb-8">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">
                        {step === 1 && "CHOOSE YOUR ROLE"}
                        {step === 2 && "BASIC INFORMATION"}
                        {step === 3 && "COMPLETE YOUR PROFILE"}
                        {step === 4 && "REVIEW & SUBMIT"}
                    </h1>
                    <p className="text-gray-500">
                        {step === 1 && "How will you use ReferAI?"}
                        {step === 2 && "Tell us a bit about yourself"}
                        {step === 3 && "Add your professional details"}
                        {step === 4 && "Review your information before submitting"}
                    </p>
                    {step === 1 && (
                        <p className="text-xs text-gray-400 mt-2">
                            💾 Your progress is automatically saved
                        </p>
                    )}
                </div>

                {/* Step 1: Role Selection */}
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

                {/* Step 2: Basic Info */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="border-2 border-gray-200 p-8">
                            <h2 className="text-2xl font-black mb-6">BASIC INFORMATION</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                This information helps us connect you with the right people
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                        LinkedIn URL <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Helps others verify your professional background
                                    </p>
                                </div>

                                <SearchableDropdown
                                    options={MAJOR_TECH_HUBS.map(city => ({ value: city, label: city }))}
                                    value={location}
                                    onChange={setLocation}
                                    placeholder="Select your location"
                                    label="Location"
                                />

                                <SearchableDropdown
                                    options={CONTACT_METHODS}
                                    value={preferredContact}
                                    onChange={setPreferredContact}
                                    placeholder="Select preferred method"
                                    label="Preferred Contact Method"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleBack} className="btn-outline flex-1 py-4">
                                BACK
                            </button>
                            <button onClick={handleBasicInfoSubmit} className="btn-primary flex-1 py-4">
                                CONTINUE
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Role-Specific Details */}
                {step === 3 && (
                    <div className="space-y-8">
                        {(role === "seeker" || role === "both") && (
                            <div className="border-2 border-gray-200 p-8">
                                <h2 className="text-2xl font-black mb-6">JOB SEEKER INFO</h2>
                                <p className="text-sm text-gray-600 mb-6">
                                    💡 A complete profile helps us match you with the best referrers
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Target Companies <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={targetCompanies}
                                            onChange={(e) => setTargetCompanies(e.target.value)}
                                            placeholder="Google, Meta, Stripe (comma separated)"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            List all companies you&apos;re interested in to see more opportunities
                                        </p>
                                    </div>

                                    <SearchableDropdown
                                        options={JOB_SEARCH_STATUS}
                                        value={jobSearchStatus}
                                        onChange={setJobSearchStatus}
                                        placeholder="Select your status"
                                        label="Job Search Status"
                                    />

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Upload Resume (PDF or DOCX) <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Supported formats: PDF, DOCX • Max size: 5MB
                                        </p>
                                        <FileUpload
                                            onUploadSuccess={(extractedText, _fileUrl, fileName) => {
                                                setResumeText(extractedText);
                                                setResumeFileName(fileName);
                                            }}
                                            currentFileName={resumeFileName}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Resume Text <span className="text-gray-400 text-xs normal-case">(Edit if needed)</span>
                                        </label>
                                        <textarea
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                            placeholder="Upload a file above or paste your resume text here..."
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none resize-none font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(role === "referrer" || role === "both") && (
                            <div className="border-2 border-gray-200 p-8">
                                <h2 className="text-2xl font-black mb-6">REFERRER INFO</h2>
                                <p className="text-sm text-gray-600 mb-6">
                                    💡 Adding more details increases your visibility to relevant job seekers
                                </p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                                Company <span className="text-red-500">*</span>
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
                                                Job Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                placeholder="Senior Software Engineer"
                                                className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <SearchableDropdown
                                            options={DEPARTMENTS}
                                            value={department}
                                            onChange={setDepartment}
                                            placeholder="Select department"
                                            label="Department"
                                            required
                                        />

                                        <SearchableDropdown
                                            options={SENIORITY_LEVELS}
                                            value={seniority}
                                            onChange={setSeniority}
                                            placeholder="Select seniority"
                                            label="Seniority"
                                            required
                                        />
                                    </div>

                                    <SkillsAutocomplete
                                        selectedSkills={skills}
                                        onSkillsChange={setSkills}
                                        suggestions={SKILLS_DATABASE}
                                        label="Skills"
                                    />

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Years of Experience
                                        </label>
                                        <input
                                            type="number"
                                            value={yearsExp}
                                            onChange={(e) => setYearsExp(e.target.value)}
                                            placeholder="5"
                                            min="0"
                                            max="70"
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none"
                                        />
                                    </div>

                                    <SearchableDropdown
                                        options={AVAILABILITY_STATUS}
                                        value={availability}
                                        onChange={setAvailability}
                                        placeholder="Select your availability"
                                        label="Availability"
                                    />

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                            Bio <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself, your experience, and what kind of candidates you're looking to refer..."
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-200 focus:border-black outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleBack} className="btn-outline flex-1 py-4">
                                BACK
                            </button>
                            <button onClick={handleDetailsSubmit} className="btn-primary flex-1 py-4">
                                REVIEW
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div className="border-2 border-gray-200 p-8">
                            <h2 className="text-2xl font-black mb-6">REVIEW YOUR INFORMATION</h2>
                            
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-black uppercase">Basic Information</h3>
                                        <button onClick={() => setStep(2)} className="text-sm font-bold uppercase tracking-widest hover:underline">
                                            Edit
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-bold">Role:</span> {role === "seeker" ? "Job Seeker" : role === "referrer" ? "Referrer" : "Both"}</p>
                                        <p><span className="font-bold">LinkedIn:</span> {linkedinUrl || "Not provided"}</p>
                                        <p><span className="font-bold">Location:</span> {location || "Not provided"}</p>
                                        <p><span className="font-bold">Preferred Contact:</span> {preferredContact || "Not provided"}</p>
                                    </div>
                                </div>

                                {/* Seeker Info */}
                                {(role === "seeker" || role === "both") && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-black uppercase">Job Seeker Details</h3>
                                            <button onClick={() => setStep(3)} className="text-sm font-bold uppercase tracking-widest hover:underline">
                                                Edit
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-bold">Target Companies:</span> {targetCompanies || "Not provided"}</p>
                                            <p><span className="font-bold">Job Search Status:</span> {jobSearchStatus || "Not provided"}</p>
                                            <p><span className="font-bold">Resume:</span> {resumeFileName || (resumeText ? "Text provided" : "Not provided")}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Referrer Info */}
                                {(role === "referrer" || role === "both") && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-black uppercase">Referrer Details</h3>
                                            <button onClick={() => setStep(3)} className="text-sm font-bold uppercase tracking-widest hover:underline">
                                                Edit
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-bold">Company:</span> {company || "Not provided"}</p>
                                            <p><span className="font-bold">Job Title:</span> {jobTitle || "Not provided"}</p>
                                            <p><span className="font-bold">Department:</span> {department || "Not provided"}</p>
                                            <p><span className="font-bold">Seniority:</span> {seniority || "Not provided"}</p>
                                            <p><span className="font-bold">Skills:</span> {skills.length > 0 ? skills.join(", ") : "Not provided"}</p>
                                            <p><span className="font-bold">Years of Experience:</span> {yearsExp || "Not provided"}</p>
                                            <p><span className="font-bold">Availability:</span> {availability || "Not provided"}</p>
                                            <p><span className="font-bold">Bio:</span> {bio || "Not provided"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleBack} className="btn-outline flex-1 py-4">
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
