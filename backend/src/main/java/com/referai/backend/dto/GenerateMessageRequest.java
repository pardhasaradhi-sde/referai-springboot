package com.referai.backend.dto;

import java.util.List;

/**
 * Request for outreach message generation.
 * Supports both legacy (name-based) and new (UUID-based) flows.
 */
public record GenerateMessageRequest(
        // New UUID-based fields (for Python AI service)
        String referrerId,

        // Legacy name-based fields (for local fallback)
        String seekerName,
        String referrerName,
        String referrerCompany,

        // Shared fields
        String jobContext,
        List<String> sharedSkills
) {}
