package com.referai.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.referai.backend.dto.JobDataDto;
import com.referai.backend.dto.ProfileDataDto;
import com.referai.backend.exception.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.model}")
    private String model;

    @Value("${app.gemini.base-url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String baseUrl;

    @Value("${app.gemini.max-retries:3}")
    private int maxRetries;

    @Value("${app.gemini.base-retry-delay-ms:1000}")
    private long baseRetryDelayMs;

    @Value("${app.gemini.max-retry-delay-ms:10000}")
    private long maxRetryDelayMs;

    @PostConstruct
    public void logConfig() {
        log.info(
                "[Gemini] Config loaded: model={}, baseUrl={}, maxRetries={}, baseRetryDelayMs={}, maxRetryDelayMs={}",
                model,
                baseUrl,
                maxRetries,
                baseRetryDelayMs,
                maxRetryDelayMs
        );
    }

    private static final String JOB_EXTRACTION_PROMPT = """
            You are an expert recruiter analyzing job postings. Extract structured information from the following job description.

            IMPORTANT RULES:
            - Only extract information explicitly mentioned
            - If a field is not found, use null
            - Be precise with skill extraction
            - Estimate seniority based on years of experience and role title

            Job Description:
            {jobDescription}

            Return a JSON object with this exact structure:
            {
              "title": "string",
              "company": "string or null",
              "skills": ["skill1","skill2"],
              "seniority": "Intern|Junior|Mid-Level|Senior|Staff|Principal|Unknown",
              "techStack": ["tech1","tech2"],
              "domain": "string or null",
              "responsibilities": ["resp1","resp2"],
              "yearsOfExperience": number or null
            }""";

    private static final String RESUME_EXTRACTION_PROMPT = """
            You are an expert career coach analyzing resumes. Extract structured information.

            Resume:
            {resumeText}

            Return a JSON object with this exact structure:
            {
              "name": "string or null",
              "skills": ["skill1","skill2"],
              "experience": [{"role":"string","company":"string or null","duration":"string or null","description":"string or null"}],
              "projects": [{"name":"string","description":"string","technologies":["tech1"]}],
              "seniority": "Intern|Junior|Mid-Level|Senior|Staff|Principal|Unknown",
              "yearsOfExperience": number or null
            }""";

    private static final String OUTREACH_PROMPT = """
            You are a career coach. Write a professional, personalized connection message (under 1000 chars) for a referral request.

            Seeker: {seekerName}
            Referrer: {referrerName} at {referrerCompany}
            Job Context: {jobContext}
            Shared Skills: {sharedSkills}

            Rules:
            1. Be polite and professional
            2. Mention the shared skills/interests
            3. Clearly ask for a referral or introductory chat
            4. Be concise

            Return ONLY the message text.""";

    public JobDataDto extractJobData(String jobDescription) {
        String prompt = JOB_EXTRACTION_PROMPT.replace("{jobDescription}", jobDescription);
        String json = callGemini(prompt, true);
        return parseJson(json, JobDataDto.class);
    }

    public ProfileDataDto extractProfileData(String resumeText) {
        String prompt = RESUME_EXTRACTION_PROMPT.replace("{resumeText}", resumeText);
        String json = callGemini(prompt, true);
        return parseJson(json, ProfileDataDto.class);
    }

    public String generateOutreachMessage(
            String seekerName,
            String referrerName,
            String referrerCompany,
            String jobContext,
            List<String> sharedSkills
    ) {
        String prompt = OUTREACH_PROMPT
                .replace("{seekerName}", seekerName)
                .replace("{referrerName}", referrerName)
                .replace("{referrerCompany}", referrerCompany)
                .replace("{jobContext}", jobContext != null ? jobContext : "")
                .replace("{sharedSkills}", sharedSkills != null ? String.join(", ", sharedSkills) : "");

        return callGemini(prompt, false).trim();
    }

    @SuppressWarnings("unchecked")
    private String callGemini(String prompt, boolean jsonMode) {
        String url = String.format("%s/%s:generateContent?key=%s", baseUrl, model, apiKey);

        Map<String, Object> generationConfig = jsonMode
                ? Map.of("responseMimeType", "application/json", "temperature", 0.7)
                : Map.of("temperature", 0.7);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", generationConfig
        );

        int totalAttempts = Math.max(1, maxRetries + 1);
        long startedAt = System.currentTimeMillis();
        Exception lastError = null;

        for (int attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                log.debug("[Gemini] Calling model={} attempt={}/{}", model, attempt, totalAttempts);

                Map<String, Object> response = webClient.post()
                        .uri(url)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                String text = extractText(response);
                log.debug("[Gemini] Completed in {}ms", System.currentTimeMillis() - startedAt);
                return text;

            } catch (WebClientResponseException e) {
                lastError = e;
                HttpStatusCode code = e.getStatusCode();

                if (!isRetryableStatus(code) || attempt == totalAttempts) {
                    throw mapGeminiException(e, attempt, totalAttempts);
                }

                long delayMs = computeRetryDelayMs(e, attempt);
                log.warn(
                        "[Gemini] Retryable status={} attempt={}/{}; retrying in {}ms",
                        code.value(),
                        attempt,
                        totalAttempts,
                        delayMs
                );
                sleep(delayMs);

            } catch (Exception e) {
                lastError = e;
                if (attempt == totalAttempts) {
                    throw new ExternalServiceException(
                            "AI service unavailable. Please try again in a few moments.",
                            HttpStatus.SERVICE_UNAVAILABLE,
                            e
                    );
                }

                long delayMs = exponentialBackoffDelay(attempt);
                log.warn(
                        "[Gemini] Transient failure attempt={}/{}; retrying in {}ms: {}",
                        attempt,
                        totalAttempts,
                        delayMs,
                        e.getMessage()
                );
                sleep(delayMs);
            }
        }

        throw new ExternalServiceException(
                "AI service unavailable. Please try again in a few moments.",
                HttpStatus.SERVICE_UNAVAILABLE,
                lastError
        );
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
            if (response == null || !response.containsKey("candidates")) {
                throw new ExternalServiceException(
                        "AI returned an unexpected response. Please retry.",
                        HttpStatus.SERVICE_UNAVAILABLE
                );
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new ExternalServiceException(
                        "AI could not generate a response for this input. Please retry with a shorter description.",
                        HttpStatus.BAD_GATEWAY
                );
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");
            return stripCodeFences(text);
        } catch (ExternalServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalServiceException(
                    "Failed to parse AI response. Please retry.",
                    HttpStatus.BAD_GATEWAY,
                    e
            );
        }
    }

    private <T> T parseJson(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (Exception firstError) {
            String extracted = extractJsonObject(json);
            if (extracted != null && !extracted.equals(json)) {
                try {
                    return objectMapper.readValue(extracted, clazz);
                } catch (Exception ignored) {
                    // fall through to external service exception below
                }
            }

            log.error("[Gemini] JSON parse error for {}: {}", clazz.getSimpleName(), firstError.getMessage());
            throw new ExternalServiceException(
                    "AI returned malformed JSON. Please retry.",
                    HttpStatus.BAD_GATEWAY,
                    firstError
            );
        }
    }

    private ExternalServiceException mapGeminiException(WebClientResponseException e, int attempt, int totalAttempts) {
        HttpStatusCode code = e.getStatusCode();
        String body = e.getResponseBodyAsString();

        if (code.value() == 429) {
            return new ExternalServiceException(
                    "AI is rate-limited right now (Gemini quota). Please wait a few seconds and retry.",
                    HttpStatus.TOO_MANY_REQUESTS,
                    e
            );
        }

        if (code.is5xxServerError()) {
            return new ExternalServiceException(
                    "AI service is temporarily unavailable. Please retry shortly.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    e
            );
        }

        if (code.value() == 401 || code.value() == 403) {
            return new ExternalServiceException(
                    "AI service authentication failed. Check Gemini API key and permissions.",
                    HttpStatus.BAD_GATEWAY,
                    e
            );
        }

        log.warn(
                "[Gemini] Non-retryable error status={} attempt={}/{} body={}",
                code.value(),
                attempt,
                totalAttempts,
                truncate(body, 400)
        );

        return new ExternalServiceException(
                "AI request failed with upstream status " + code.value() + ".",
                HttpStatus.BAD_GATEWAY,
                e
        );
    }

    private boolean isRetryableStatus(HttpStatusCode status) {
        return status.value() == 429 || status.is5xxServerError();
    }

    private long computeRetryDelayMs(WebClientResponseException e, int attempt) {
        String retryAfterHeader = e.getHeaders().getFirst("Retry-After");
        if (retryAfterHeader != null && !retryAfterHeader.isBlank()) {
            Long parsed = parseRetryAfterHeader(retryAfterHeader.trim());
            if (parsed != null && parsed > 0) {
                return Math.min(parsed, maxRetryDelayMs);
            }
        }
        return exponentialBackoffDelay(attempt);
    }

    private Long parseRetryAfterHeader(String value) {
        try {
            long seconds = Long.parseLong(value);
            return Math.max(0, seconds * 1000L);
        } catch (NumberFormatException ignored) {
            // Try HTTP date format below.
        }

        try {
            Instant when = Instant.parse(value);
            long ms = when.toEpochMilli() - System.currentTimeMillis();
            return Math.max(0, ms);
        } catch (DateTimeParseException ignored) {
            try {
                Instant when = OffsetDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
                long ms = when.toEpochMilli() - System.currentTimeMillis();
                return Math.max(0, ms);
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    private long exponentialBackoffDelay(int attempt) {
        long exp = baseRetryDelayMs * (1L << Math.max(0, attempt - 1));
        return Math.min(exp, maxRetryDelayMs);
    }

    private void sleep(long delayMs) {
        try {
            Thread.sleep(Math.max(0, delayMs));
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private String stripCodeFences(String text) {
        if (text == null) {
            return "";
        }

        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replaceFirst("```json\\s*", "").replaceAll("```\\s*$", "");
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("```\\s*", "").replaceAll("```\\s*$", "");
        }
        return cleaned.trim();
    }

    private String extractJsonObject(String text) {
        if (text == null) {
            return null;
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1).trim();
        }
        return text;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
