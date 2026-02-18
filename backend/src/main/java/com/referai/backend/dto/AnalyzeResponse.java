package com.referai.backend.dto;

import java.util.List;

public record AnalyzeResponse(
        JobDataDto jobData,
        ProfileDataDto profileData,
        List<MatchResultDto> matches
) {}
