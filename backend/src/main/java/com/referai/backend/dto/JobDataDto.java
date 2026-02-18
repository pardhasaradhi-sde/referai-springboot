package com.referai.backend.dto;

import java.util.List;

public record JobDataDto(
        String title,
        String company,
        List<String> skills,
        String seniority,
        List<String> techStack,
        String domain,
        List<String> responsibilities,
        Integer yearsOfExperience
) {}
