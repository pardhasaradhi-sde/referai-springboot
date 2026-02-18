package com.referai.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReferralRequestDto(
        UUID id,
        ProfileDto seeker,
        ProfileDto referrer,
        String jobTitle,
        String jobDescription,
        String targetCompany,
        BigDecimal matchScore,
        List<String> sharedSkills,
        String aiExplanation,
        String status,
        String initialMessage,
        Instant createdAt,
        Instant expiresAt,
        UUID conversationId  // ID of the conversation if request is accepted
) {}
