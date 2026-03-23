// --- Generic Pagination ---
export interface PageResponse<T> {
  content: T[];
  pageable: Record<string, unknown>;
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: Record<string, unknown>;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// --- Auth ---
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  profile: Profile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Response from POST /api/auth/login (OTP step). */
export interface LoginOtpSentResponse {
  otpSent: boolean;
  emailMasked: string;
  expiresInSeconds: number;
}

export interface LoginVerifyOtpRequest {
  email: string;
  password: string;
  otp: string;
}

// --- Profile ---
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: "seeker" | "referrer" | "both";
  company?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  skills: string[];
  yearsOfExperience?: number;
  bio?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  resumeText?: string;
  resumeFileUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  targetCompanies: string[];
  isActive: boolean;
}

export interface UpdateProfileRequest {
  fullName?: string;
  role?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  seniority?: string;
  skills?: string[];
  yearsOfExperience?: number;
  bio?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  resumeText?: string;
  targetCompanies?: string[];
}

// --- File Upload ---
export interface UploadResumeResponse {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  extractedText?: string;
  wordCount?: number;
  uploadedAt?: string;
  error?: string;
}

// --- JD Extraction ---
export interface ExtractJdRequest {
  input: string;
}

export interface ExtractJdResponse {
  success: boolean;
  isUrl: boolean;
  source?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  description?: string;
  error?: string;
  fallbackMessage?: string;
}

// --- Referral Requests ---
export interface ReferralRequest {
  id: string;
  seeker: Profile;
  referrer: Profile;
  jobTitle: string;
  jobDescription: string;
  targetCompany: string;
  matchScore: number;
  sharedSkills: string[];
  aiExplanation: string;
  status: "pending" | "accepted" | "declined" | "expired";
  initialMessage: string;
  createdAt: string;
  expiresAt: string;
  conversationId?: string;
  reportedOutcome?: OutcomeType;
}

export interface SendReferralRequestDto {
  referrerId: string;
  jobTitle: string;
  jobDescription?: string;
  targetCompany: string;
  initialMessage: string;
}

// --- Conversations & Messages ---
export interface Conversation {
  id: string;
  requestId: string;
  seeker: Profile;
  referrer: Profile;
  isActive: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isAiSuggested: boolean;
  wasEdited: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

// --- AI Matching ---
export interface MatchResult {
  persona: Profile;
  score: number;
  sharedSkills: string[];
  explanation: string;
  breakdown?: {
    skillOverlap: number;
    roleSimilarity: number;
    seniorityMatch: number;
  };
}

export interface JobData {
  company?: string;
  role?: string;
  title?: string;
  seniority?: string;
  skills?: string[];
}

export interface ProfileData {
  skills?: string[];
  yearsOfExperience?: number;
  seniority?: string;
}

export interface AnalyzeRequest {
  jobDescription: string;
  resumeText: string;
  targetCompany?: string;
}

export interface AnalyzeResponse {
  matches: MatchResult[];
}

export interface MatchingHistoryCandidate {
  rank: number;
  tier?: string;
  candidateId?: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  semanticScore?: number;
  llmScore?: number;
  referralViability?: number;
  replyProbability?: number;
  combinedScore?: number;
  successLikelihoodPercent?: number;
  reasoning?: string;
  strongPoints?: string[];
  redFlags?: string[];
  openingSentence?: string;
  independentAssessment?: Record<string, unknown>;
}

export interface MatchingHistoryRun {
  runId: string;
  seekerId: string;
  targetCompany?: string;
  jdMustHaves: string[];
  seekerStrengths: string[];
  seekerGaps: string[];
  implicitReferrerRequirements: Record<string, string>;
  retrievalTierCounts: Record<string, number>;
  feedbackPatterns: Record<string, unknown>;
  weightRecommendations: Record<string, number>;
  totalCandidatesEvaluated: number;
  pipelineTiming: Record<string, number>;
  createdAt: string;
  matches: MatchingHistoryCandidate[];
}

export interface MatchingHistoryResponse {
  success: boolean;
  runs: MatchingHistoryRun[];
  count: number;
  error?: string;
}

export interface GenerateMessageRequest {
  // UUID-based (new Python AI service)
  referrerId?: string;
  // Legacy name-based (local fallback)
  seekerName?: string;
  referrerName?: string;
  referrerCompany?: string;
  // Shared
  jobContext?: string;
  sharedSkills?: string[];
}

export interface GenerateMessageResponse {
  success?: boolean;
  message: string;
  wordCount?: number;
  tone?: string;
}

// --- AI Coach ---
export interface CoachSuggestRequest {
  conversationId: string;
  referrerId: string;
  currentMessage?: string;
  currentStage?: CoachStage;
}

export type CoachStage =
  | "first_contact"
  | "building_rapport"
  | "made_the_ask"
  | "following_up";

export interface CoachChunk {
  chunk: string;
}

export interface CoachDone {
  status: "complete";
}

// --- Outcome Feedback ---
export type OutcomeType =
  | "GOT_REFERRAL"
  | "GOT_INTERVIEW"
  | "GOT_OFFER"
  | "NO_RESPONSE"
  | "DECLINED";

export interface RecordOutcomeRequest {
  outcomeType: OutcomeType;
}

export const OUTCOME_LABELS: Record<OutcomeType, { label: string; color: string; emoji: string }> = {
  GOT_REFERRAL: { label: "Got Referral", color: "text-blue-700 bg-blue-50", emoji: "🎯" },
  GOT_INTERVIEW: { label: "Got Interview", color: "text-purple-700 bg-purple-50", emoji: "💼" },
  GOT_OFFER: { label: "Got Offer!", color: "text-green-700 bg-green-50", emoji: "🎉" },
  NO_RESPONSE: { label: "No Response", color: "text-gray-700 bg-gray-50", emoji: "😶" },
  DECLINED: { label: "Declined", color: "text-red-700 bg-red-50", emoji: "❌" },
};
