package com.referai.backend.dto;

import java.util.List;

public record ProfileDataDto(
        String name,
        List<String> skills,
        List<ExperienceDto> experience,
        List<ProjectDto> projects,
        String seniority,
        Integer yearsOfExperience
) {
    public record ExperienceDto(String role, String company, String duration, String description) {}
    public record ProjectDto(String name, String description, List<String> technologies) {}
}
