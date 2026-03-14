package com.referai.backend.service;

import com.referai.backend.dto.AnalyzeResponse;
import com.referai.backend.dto.JobDataDto;
import com.referai.backend.dto.ProfileDataDto;
import com.referai.backend.dto.ProfileDto;
import com.referai.backend.entity.Profile;
import com.referai.backend.entity.Role;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private GeminiService geminiService;
    @Mock
    private EntityMapper mapper;

    @InjectMocks
    private MatchingService service;

    @Test
    void analyzeAndMatchComputesDynamicRoleAndSeniorityBreakdown() {
        UUID seekerId = UUID.randomUUID();

        JobDataDto jobData = new JobDataDto(
                "Senior Backend Engineer",
                "Acme",
                List.of("Java", "Spring"),
                "Senior",
                List.of("Java", "Spring"),
                null,
                List.of(),
                5
        );

        ProfileDataDto profileData = new ProfileDataDto(
                "Candidate",
                List.of("Java", "Spring"),
                List.of(),
                List.of(),
                "Senior",
                6
        );

        Profile aligned = buildProfile("Aligned Referrer", "Senior Backend Engineer", "Senior");
        Profile lessAligned = buildProfile("Less Aligned", "Frontend Designer", "Junior");

        when(geminiService.extractJobData(any())).thenReturn(jobData);
        when(geminiService.extractProfileData(any())).thenReturn(profileData);
        when(profileRepository.findActiveReferrersByCompany("Acme", seekerId)).thenReturn(List.of(aligned, lessAligned));
        when(mapper.toProfileDto(any(Profile.class))).thenAnswer(invocation -> {
            Profile p = invocation.getArgument(0);
            return new ProfileDto(
                    p.getId(),
                    p.getEmail(),
                    p.getFullName(),
                    p.getRole().name().toLowerCase(),
                    p.getCompany(),
                    p.getJobTitle(),
                    p.getDepartment(),
                    p.getSeniority(),
                    p.getSkills(),
                    p.getYearsOfExperience(),
                    p.getBio(),
                    p.getLinkedinUrl(),
                    p.getResumeUrl(),
                    p.getResumeText(),
                    null, // resumeFileUrl
                    null, // resumeFileName
                    null, // resumeUploadedAt
                    p.getTargetCompanies(),
                    p.getIsActive(),
                    Instant.now()
            );
        });

        AnalyzeResponse response = service.analyzeAndMatch(seekerId, "job", "resume");

        var top = response.matches().get(0);
        var second = response.matches().get(1);

        assertTrue(top.breakdown().roleSimilarity() > second.breakdown().roleSimilarity());
        assertTrue(top.breakdown().seniorityMatch() > second.breakdown().seniorityMatch());
    }

    private Profile buildProfile(String name, String jobTitle, String seniority) {
        return Profile.builder()
                .id(UUID.randomUUID())
                .email(name.toLowerCase().replace(" ", ".") + "@acme.com")
                .fullName(name)
                .role(Role.REFERRER)
                .company("Acme")
                .jobTitle(jobTitle)
                .seniority(seniority)
                .skills(List.of("Java", "Spring"))
                .isActive(true)
                .build();
    }
}
