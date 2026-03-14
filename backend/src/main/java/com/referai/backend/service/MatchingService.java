package com.referai.backend.service;

import com.referai.backend.dto.AnalyzeResponse;
import com.referai.backend.dto.JobDataDto;
import com.referai.backend.dto.MatchResultDto;
import com.referai.backend.dto.ProfileDataDto;
import com.referai.backend.entity.Profile;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private static final double SKILL_WEIGHT = 0.65;
    private static final double ROLE_WEIGHT = 0.20;
    private static final double SENIORITY_WEIGHT = 0.15;

    private final ProfileRepository profileRepository;
    private final GeminiService geminiService;
    private final EntityMapper mapper;

    // In-memory cache: hash(resume+job) -> result
    private final Map<String, AnalyzeResponse> cache = new LinkedHashMap<>(100, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, AnalyzeResponse> eldest) {
            return size() > 100;
        }
    };

    public AnalyzeResponse analyzeAndMatch(UUID seekerId, String jobDescription, String resumeText) {
        String cacheKey = Integer.toHexString((resumeText + jobDescription).hashCode());
        if (cache.containsKey(cacheKey)) {
            log.debug("[Matching] Cache hit for key={}", cacheKey);
            return cache.get(cacheKey);
        }

        JobDataDto jobData = geminiService.extractJobData(jobDescription);
        ProfileDataDto profileData = geminiService.extractProfileData(resumeText);

        List<Profile> referrers = jobData.company() != null
                ? profileRepository.findActiveReferrersByCompany(jobData.company(), seekerId)
                : profileRepository.findActiveReferrers(seekerId);

        List<MatchResultDto> matches = matchProfiles(profileData, jobData, referrers);

        AnalyzeResponse result = new AnalyzeResponse(jobData, profileData, matches);
        cache.put(cacheKey, result);
        return result;
    }

    public String generateOutreachMessage(
            String seekerName,
            String referrerName,
            String referrerCompany,
            String jobContext,
            List<String> sharedSkills
    ) {
        return geminiService.generateOutreachMessage(seekerName, referrerName, referrerCompany, jobContext, sharedSkills);
    }

    private List<MatchResultDto> matchProfiles(ProfileDataDto seekerProfile, JobDataDto jobData, List<Profile> referrers) {
        List<String> seekerSkills = seekerProfile != null && seekerProfile.skills() != null
                ? seekerProfile.skills()
                : List.of();

        String seekerSeniority = seekerProfile != null ? seekerProfile.seniority() : null;
        String targetRole = jobData != null ? jobData.title() : null;

        List<String> normalizedSeeker = seekerSkills.stream()
                .map(this::normalize)
                .filter(s -> !s.isBlank())
                .toList();

        List<MatchResultDto> results = new ArrayList<>();

        for (Profile ref : referrers) {
            List<String> refSkills = ref.getSkills() != null ? ref.getSkills() : List.of();
            if (refSkills.isEmpty()) {
                continue;
            }

            List<String> normalizedRef = refSkills.stream()
                    .map(this::normalize)
                    .filter(s -> !s.isBlank())
                    .toList();

            List<String> shared = normalizedSeeker.stream()
                    .filter(normalizedRef::contains)
                    .distinct()
                    .collect(Collectors.toList());

            double skillOverlap = (double) shared.size() / Math.max(normalizedRef.size(), 1);
            double roleSimilarity = computeRoleSimilarity(targetRole, ref.getJobTitle());
            double seniorityMatch = computeSeniorityMatch(seekerSeniority, ref.getSeniority());

            double score = (skillOverlap * SKILL_WEIGHT)
                    + (roleSimilarity * ROLE_WEIGHT)
                    + (seniorityMatch * SENIORITY_WEIGHT);
            score = Math.min(Math.max(score, 0.0), 1.0);

            String explanation = shared.isEmpty()
                    ? "Works at " + ref.getCompany()
                    : "Shared skills: " + String.join(", ", shared);

            // Restore original casing for display.
            List<String> displayShared = refSkills.stream()
                    .filter(s -> normalizedSeeker.contains(normalize(s)))
                    .toList();

            results.add(new MatchResultDto(
                    mapper.toProfileDto(ref),
                    score,
                    displayShared,
                    explanation,
                    new MatchResultDto.BreakdownDto(skillOverlap, roleSimilarity, seniorityMatch)
            ));
        }

        return results.stream()
                .sorted(Comparator.comparingDouble(MatchResultDto::score).reversed())
                .limit(5)
                .toList();
    }

    private double computeRoleSimilarity(String targetRole, String referrerRole) {
        if (targetRole == null || targetRole.isBlank() || referrerRole == null || referrerRole.isBlank()) {
            return 0.5;
        }

        List<String> targetTokens = tokenize(targetRole);
        List<String> refTokens = tokenize(referrerRole);

        if (targetTokens.isEmpty() || refTokens.isEmpty()) {
            return 0.5;
        }

        long overlap = targetTokens.stream().filter(refTokens::contains).distinct().count();
        long union = targetTokens.stream().distinct().count() + refTokens.stream().distinct().count() - overlap;
        if (union <= 0) {
            return 0.5;
        }

        return (double) overlap / union;
    }

    private double computeSeniorityMatch(String seekerSeniority, String referrerSeniority) {
        Integer seekerLevel = toSeniorityLevel(seekerSeniority);
        Integer refLevel = toSeniorityLevel(referrerSeniority);

        if (seekerLevel == null || refLevel == null) {
            return 0.5;
        }

        int delta = Math.abs(refLevel - seekerLevel);
        if (delta == 0) {
            return 1.0;
        }
        if (delta == 1) {
            return 0.8;
        }
        if (delta == 2) {
            return 0.6;
        }
        return 0.4;
    }

    private Integer toSeniorityLevel(String seniority) {
        if (seniority == null || seniority.isBlank()) {
            return null;
        }

        String normalized = normalize(seniority);
        return switch (normalized) {
            case "intern" -> 0;
            case "junior" -> 1;
            case "mid-level", "mid", "associate" -> 2;
            case "senior" -> 3;
            case "staff" -> 4;
            case "principal" -> 5;
            default -> null;
        };
    }

    private List<String> tokenize(String value) {
        return Arrays.stream(normalize(value).split("[^a-z0-9]+"))
                .filter(s -> !s.isBlank())
                .toList();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
