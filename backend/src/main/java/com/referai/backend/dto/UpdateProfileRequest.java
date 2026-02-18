package com.referai.backend.dto;

import java.util.List;

public record UpdateProfileRequest(
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
        String resumeText,
        List<String> targetCompanies
) {}
