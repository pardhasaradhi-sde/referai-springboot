package com.referai.backend.dto;

import java.util.List;

public record MatchResultDto(
        ProfileDto persona,
        double score,
        List<String> sharedSkills,
        String explanation,
        BreakdownDto breakdown
) {
    public record BreakdownDto(double skillOverlap, double roleSimilarity, double seniorityMatch) {}
}
