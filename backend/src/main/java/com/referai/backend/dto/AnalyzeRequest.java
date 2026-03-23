package com.referai.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AnalyzeRequest(
        @NotBlank(message = "Target company is required") String targetCompany,
        @NotBlank String jobDescription,
        @NotBlank String resumeText
) {}
