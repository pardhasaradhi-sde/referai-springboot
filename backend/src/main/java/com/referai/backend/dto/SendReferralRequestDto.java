package com.referai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SendReferralRequestDto(
        @NotNull UUID referrerId,
        @NotBlank String jobTitle,
        String jobDescription,
        @NotBlank String targetCompany,
        BigDecimal matchScore,
        List<String> sharedSkills,
        String aiExplanation,
        String initialMessage
) {}
