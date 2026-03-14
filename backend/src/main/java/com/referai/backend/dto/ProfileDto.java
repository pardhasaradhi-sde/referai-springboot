package com.referai.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProfileDto(
        UUID id,
        String email,
        String fullName,
        String role,
        String company,
        String jobTitle,
        String department,
        String seniority,
        List<String> skills,
        Integer yearsOfExperience,
        String bio,
        String linkedinUrl,
        String resumeUrl,
        String resumeText,
        String resumeFileUrl,
        String resumeFileName,
        Instant resumeUploadedAt,
        List<String> targetCompanies,
        Boolean isActive,
        Instant createdAt
) {}
