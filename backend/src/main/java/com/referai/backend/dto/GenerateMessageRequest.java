package com.referai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record GenerateMessageRequest(
        @NotBlank String seekerName,
        @NotBlank String referrerName,
        @NotBlank String referrerCompany,
        String jobContext,
        List<String> sharedSkills
) {}
