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
  jobData?: JobData;
  profileData?: ProfileData;
  matches: MatchResult[];
}

export interface GenerateMessageRequest {
  referrerId: string;
  jobTitle?: string;
  skills?: string[];
}

export interface GenerateMessageResponse {
  message: string;
}
