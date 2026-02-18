package com.referai.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AnalyzeRequest(
        @NotBlank String jobDescription,
        @NotBlank String resumeText
) {}
