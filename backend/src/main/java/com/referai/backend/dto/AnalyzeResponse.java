package com.referai.backend.dto;

import java.util.List;

/**
 * Response from the AI matching pipeline.
 * All intelligence comes from the Python AI service.
 */
public record AnalyzeResponse(
        List<MatchResultDto> matches
) {}
