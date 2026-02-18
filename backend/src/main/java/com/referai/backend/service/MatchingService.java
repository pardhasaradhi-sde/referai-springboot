package com.referai.backend.service;

import com.referai.backend.dto.*;
import com.referai.backend.entity.Profile;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

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

        // Run both AI calls in parallel would need CompletableFuture;
        // keeping it simple here for clarity
        JobDataDto jobData = geminiService.extractJobData(jobDescription);
        ProfileDataDto profileData = geminiService.extractProfileData(resumeText);

        // Fetch referrers (filtered by job company if available)
        List<Profile> referrers = jobData.company() != null
                ? profileRepository.findActiveReferrersByCompany(jobData.company(), seekerId)
                : profileRepository.findActiveReferrers(seekerId);

        List<MatchResultDto> matches = matchProfiles(profileData.skills(), referrers);

        AnalyzeResponse result = new AnalyzeResponse(jobData, profileData, matches);
        cache.put(cacheKey, result);
        return result;
    }

    public String generateOutreachMessage(String seekerName, String referrerName,
                                           String referrerCompany, String jobContext,
                                           List<String> sharedSkills) {
        return geminiService.generateOutreachMessage(seekerName, referrerName, referrerCompany, jobContext, sharedSkills);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Skill-overlap matching algorithm (mirrors lib/db/matcher.ts)
    //   Score = (skillOverlap * 0.8) + 0.2 base
    // ────────────────────────────────────────────────────────────────────────────

    private List<MatchResultDto> matchProfiles(List<String> seekerSkills, List<Profile> referrers) {
        if (seekerSkills == null) seekerSkills = List.of();

        List<String> normalizedSeeker = seekerSkills.stream()
                .map(String::toLowerCase).toList();

        List<MatchResultDto> results = new ArrayList<>();

        for (Profile ref : referrers) {
            List<String> refSkills = ref.getSkills() != null ? ref.getSkills() : List.of();
            if (refSkills.isEmpty()) continue;

            List<String> normalizedRef = refSkills.stream().map(String::toLowerCase).toList();

            List<String> shared = normalizedSeeker.stream()
                    .filter(normalizedRef::contains)
                    .collect(Collectors.toList());

            double skillOverlap = (double) shared.size() / Math.max(normalizedRef.size(), 1);
            double score = Math.min(skillOverlap * 0.8 + 0.2, 1.0);

            String explanation = shared.isEmpty()
                    ? "Works at " + ref.getCompany()
                    : "Shared skills: " + String.join(", ", shared);

            // Restore original casing for display
            List<String> displayShared = refSkills.stream()
                    .filter(s -> normalizedSeeker.contains(s.toLowerCase()))
                    .toList();

            results.add(new MatchResultDto(
                    mapper.toProfileDto(ref),
                    score,
                    displayShared,
                    explanation,
                    new MatchResultDto.BreakdownDto(skillOverlap, 0.8, 0.8)
            ));
        }

        return results.stream()
                .sorted(Comparator.comparingDouble(MatchResultDto::score).reversed())
                .limit(5)
                .toList();
    }
}
