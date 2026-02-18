package com.referai.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.referai.backend.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

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

    // ────────────────────────────────────────────────────────────────────────────
    // Prompts (mirrors lib/ai/prompts.ts)
    // ────────────────────────────────────────────────────────────────────────────

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

    // ────────────────────────────────────────────────────────────────────────────
    // Public methods
    // ────────────────────────────────────────────────────────────────────────────

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

    public String generateOutreachMessage(String seekerName, String referrerName,
                                           String referrerCompany, String jobContext,
                                           List<String> sharedSkills) {
        String prompt = OUTREACH_PROMPT
                .replace("{seekerName}", seekerName)
                .replace("{referrerName}", referrerName)
                .replace("{referrerCompany}", referrerCompany)
                .replace("{jobContext}", jobContext != null ? jobContext : "")
                .replace("{sharedSkills}", sharedSkills != null ? String.join(", ", sharedSkills) : "");

        return callGemini(prompt, false).trim();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ────────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGemini(String prompt, boolean jsonMode) {
        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                model, apiKey);

        Map<String, Object> generationConfig = jsonMode
                ? Map.of("responseMimeType", "application/json", "temperature", 0.7)
                : Map.of("temperature", 0.7);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", generationConfig
        );

        log.debug("[Gemini] Calling model={}", model);
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> response = webClient.post()
                    .uri(url)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            String text = extractText(response);
            log.debug("[Gemini] Completed in {}ms", System.currentTimeMillis() - start);
            return text;
        } catch (Exception e) {
            log.error("[Gemini] Call failed after {}ms: {}", System.currentTimeMillis() - start, e.getMessage());
            throw new RuntimeException("AI service unavailable: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");
            // Strip markdown code fences if present
            text = text.trim();
            if (text.startsWith("```json")) text = text.replaceFirst("```json\\s*", "").replaceAll("```\\s*$", "");
            else if (text.startsWith("```")) text = text.replaceFirst("```\\s*", "").replaceAll("```\\s*$", "");
            return text.trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response", e);
        }
    }

    private <T> T parseJson(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (Exception e) {
            log.error("[Gemini] JSON parse error for {}: {}", clazz.getSimpleName(), e.getMessage());
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }
}
