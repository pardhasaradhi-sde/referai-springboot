package com.referai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.referai.backend.dto.*;
import com.referai.backend.entity.Profile;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;

import java.time.Duration;
import java.util.*;

/**
 * MatchingService — pure proxy to Python AI service with Redis caching.
 * No local AI logic. All intelligence lives in referai-ai-service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private static final String CACHE_PREFIX = "referai:match:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final PythonAiService pythonAiService;
    private final ProfileRepository profileRepository;
    private final EntityMapper mapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final QuotaService quotaService;

    /**
     * Calls the Python AI pipeline to match candidates.
     * Results are cached in Redis for 1 hour.
     */
    public AnalyzeResponse analyzeAndMatch(UUID seekerId, String jobDescription, String resumeText, String targetCompany) {
        String hashInput = resumeText + jobDescription + targetCompany;
        String cacheKey = CACHE_PREFIX + DigestUtils.md5DigestAsHex(hashInput.getBytes(StandardCharsets.UTF_8));

        // Check Redis cache
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("[Matching] Redis cache hit for key={}", cacheKey);
                return objectMapper.readValue(cached, AnalyzeResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis read failed: {}", e.getMessage());
        }

        // Check Daily Quota (after cache miss)
        quotaService.checkAndEnforceQuota(seekerId, "match", 2);

        // Call Python AI service
        Map<String, Object> aiResult = pythonAiService.matchCandidates(
                jobDescription, resumeText, seekerId.toString(), targetCompany);

        AnalyzeResponse result = parseAiResult(aiResult);

        // Cache in Redis and increment quota
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_TTL);
            quotaService.incrementQuota(seekerId, "match");
        } catch (Exception e) {
            log.warn("Redis write failed: {}", e.getMessage());
        }

        return result;
    }

    public Map<String, Object> getMatchingHistory(UUID seekerId, int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 50));
        return pythonAiService.fetchMatchingHistory(seekerId.toString(), boundedLimit);
    }

    /**
     * Parses the raw JSON from the Python AI pipeline into a typed AnalyzeResponse.
     */
    private AnalyzeResponse parseAiResult(Map<String, Object> aiResult) {
        try {
            String rawJson = objectMapper.writeValueAsString(aiResult);
            JsonNode root = objectMapper.readTree(rawJson);

            JsonNode matchesNode = root.has("matches") ? root.get("matches") : root.get("candidates");

            List<MatchResultDto> matches = new ArrayList<>();

            if (matchesNode != null && matchesNode.isArray()) {
                for (JsonNode matchNode : matchesNode) {
                    String candidateId = textField(matchNode, "candidateId", "candidate_id", "id");
                    if (candidateId == null) continue;

                    try {
                        Profile profile = profileRepository.findById(UUID.fromString(candidateId)).orElse(null);
                        if (profile == null) continue;

                        // Normalize score to 0-1 (Python may return 0-10 or 0-100)
                        double rawScore = matchNode.has("score") ? matchNode.get("score").asDouble() : 0;
                        double score;
                        if (rawScore > 1 && rawScore <= 10) score = rawScore / 10.0;
                        else if (rawScore > 10) score = rawScore / 100.0;
                        else score = rawScore;
                        score = Math.min(Math.max(score, 0.0), 1.0);

                        List<String> sharedSkills = jsonArray(matchNode, "sharedSkills", "shared_skills", "strongPoints", "strong_points");
                        String explanation = textField(matchNode, "reasoning", "explanation", "suggestedOpening", "suggested_opening");

                        matches.add(new MatchResultDto(
                                mapper.toProfileDto(profile), score, sharedSkills,
                                explanation != null ? explanation : "AI-matched referrer",
                                null
                        ));
                    } catch (Exception e) {
                        log.warn("Failed to parse match candidate {}: {}", candidateId, e.getMessage());
                    }
                }
            }

            matches.sort(Comparator.comparingDouble(MatchResultDto::score).reversed());
            return new AnalyzeResponse(matches);

        } catch (Exception e) {
            log.error("Failed to parse AI result: {}", e.getMessage());
            return new AnalyzeResponse(List.of());
        }
    }

    private String textField(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) return node.get(key).asText();
        }
        return null;
    }

    private List<String> jsonArray(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && node.get(key).isArray()) {
                List<String> list = new ArrayList<>();
                node.get(key).forEach(e -> list.add(e.asText()));
                return list;
            }
        }
        return List.of();
    }
}
