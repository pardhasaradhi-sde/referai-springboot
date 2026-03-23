package com.referai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

@Service
@Slf4j
public class PythonAiService {

    @Value("${app.python-service.url}")
    private String pythonServiceUrl;

    @Value("${app.python-service.internal-key}")
    private String internalKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PythonAiService(
            @Qualifier("pythonRestTemplate") RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> extractResumeText(byte[] fileContent, String fileName) {
        try {
            String url = pythonServiceUrl + "/api/extract-resume";
            
            // Encode file content to base64
            String base64Content = Base64.getEncoder().encodeToString(fileContent);
            
            // Build request
            Map<String, String> request = new HashMap<>();
            request.put("fileContent", base64Content);
            request.put("fileName", fileName);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
            
            // Call Python service
            ResponseEntity<String> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                entity, 
                String.class
            );
            
            // Parse response
            JsonNode jsonResponse = objectMapper.readTree(response.getBody());

            boolean success = getBoolean(jsonResponse, "success");
            Map<String, Object> result = new HashMap<>();
            result.put("success", success);
            result.put("text", getText(jsonResponse, "text"));
            result.put("wordCount", getInt(jsonResponse, "wordCount", "word_count"));
            result.put("pageCount", getInt(jsonResponse, "pageCount", "page_count"));
            result.put("extractionMethod", getText(jsonResponse, "extractionMethod", "extraction_method"));

            if (!success) {
                result.put("error", getText(jsonResponse, "error"));
                log.warn("Python extraction returned failure for file {}", fileName);
            } else {
                log.info("Successfully extracted text from file: {}", fileName);
            }
            return result;
            
        } catch (Exception e) {
            log.error("Failed to extract resume text: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", e.getMessage());
            return errorResult;
        }
    }

    public Map<String, Object> scrapeJobDescription(String url) {
        try {
            String apiUrl = pythonServiceUrl + "/api/scrape-jd";
            
            // Build request
            Map<String, String> request = new HashMap<>();
            request.put("url", url);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
            
            // Call Python service
            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, 
                HttpMethod.POST, 
                entity, 
                String.class
            );
            
            // Parse response
            JsonNode jsonResponse = objectMapper.readTree(response.getBody());

            boolean success = getBoolean(jsonResponse, "success");
            Map<String, Object> result = new HashMap<>();
            result.put("success", success);

            if (success) {
                result.put("source", getText(jsonResponse, "source"));
                result.put("jobTitle", getText(jsonResponse, "jobTitle", "job_title"));
                result.put("company", getText(jsonResponse, "company"));
                result.put("location", getText(jsonResponse, "location"));
                result.put("description", getText(jsonResponse, "description"));
            } else {
                result.put("error", getText(jsonResponse, "error"));
                String fallbackMessage = getText(jsonResponse, "fallbackMessage", "fallback_message");
                result.put("fallbackMessage", fallbackMessage != null
                    ? fallbackMessage
                    :
                    "Please copy and paste the job description manually");
            }
            
            log.info("Scraped job description from URL: {}", url);
            return result;
            
        } catch (Exception e) {
            log.error("Failed to scrape job description: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", e.getMessage());
            errorResult.put("fallbackMessage", "Please copy and paste the job description manually");
            return errorResult;
        }
    }

    /**
     * Run the intelligent matching pipeline.
     * Calls POST /api/match on the Python AI service.
     */
    public Map<String, Object> matchCandidates(String jobDescription, String resumeText, String seekerId, String targetCompany) {
        try {
            String url = pythonServiceUrl + "/api/match";

            Map<String, String> request = new HashMap<>();
            request.put("jobDescription", jobDescription);
            request.put("resumeText", resumeText);
            request.put("seekerId", seekerId);
            request.put("targetCompany", targetCompany);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class
            );

            // Parse the full response into a Map so MatchingService can access the
            // 'matches' array directly. Previously this returned {success, raw} which
            // meant the matches array was never accessible to parseAiResult().
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(response.getBody(), Map.class);

            log.info("Python matching pipeline completed for seeker {}, matches={}",
                seekerId, result.containsKey("matches") ? "present" : "missing");
            return result;

        } catch (Exception e) {
            log.error("Python matching failed: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return error;
        }
    }

    /**
     * Fetch matching history for a seeker.
     * Calls GET /api/match-history/{seeker_id} on the Python AI service.
     */
    public Map<String, Object> fetchMatchingHistory(String seekerId, int limit) {
        try {
            String url = pythonServiceUrl + "/api/match-history/" + seekerId + "?limit=" + limit;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, String.class
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(response.getBody(), Map.class);
            return result;
        } catch (Exception e) {
            log.error("Python matching history failed: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("runs", java.util.List.of());
            error.put("count", 0);
            error.put("error", e.getMessage());
            return error;
        }
    }

    /**
     * Generate a personalized outreach message.
     * Calls POST /api/generate-message on the Python AI service.
     */
    public Map<String, Object> generateOutreachMessage(String seekerId, String referrerId, String jobContext) {
        try {
            String url = pythonServiceUrl + "/api/generate-message";

            Map<String, String> request = new HashMap<>();
            request.put("seekerId", seekerId);
            request.put("referrerId", referrerId);
            if (jobContext != null) request.put("jobContext", jobContext);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class
            );

            JsonNode jsonResponse = objectMapper.readTree(response.getBody());
            Map<String, Object> result = new HashMap<>();
            result.put("success", getBoolean(jsonResponse, "success"));
            result.put("message", getText(jsonResponse, "message"));
            result.put("wordCount", getInt(jsonResponse, "wordCount", "word_count"));

            log.info("Generated outreach message for seeker {} → referrer {}", seekerId, referrerId);
            return result;

        } catch (Exception e) {
            log.error("Outreach generation failed: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return error;
        }
    }

    /**
     * Index a referrer profile for semantic search.
     * Calls POST /api/index-referrer on the Python AI service.
     * Should be called after profile save for REFERRER/BOTH roles.
     */
    public void indexReferrerProfile(String referrerId, String bio, java.util.List<String> skills,
                                      String jobTitle, String company, String department,
                                      String seniority, Integer yearsOfExperience) {
        try {
            String url = pythonServiceUrl + "/api/index-referrer";

            Map<String, Object> request = new HashMap<>();
            request.put("referrerId", referrerId);
            request.put("bio", bio);
            request.put("skills", skills);
            request.put("jobTitle", jobTitle);
            request.put("company", company);
            request.put("department", department);
            request.put("seniority", seniority);
            request.put("yearsOfExperience", yearsOfExperience);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.info("Indexed referrer profile: {}", referrerId);

        } catch (Exception e) {
            log.warn("Failed to index referrer profile {}: {}", referrerId, e.getMessage());
            // Non-blocking — don't fail the profile update
        }
    }

    /**
     * Record a referral outcome for the feedback loop.
     * Calls POST /api/outcomes/record on the Python AI service.
     */
    public void recordOutcome(String requestId, String outcomeType, String reporterId) {
        try {
            String url = pythonServiceUrl + "/api/outcomes/record";

            Map<String, String> request = new HashMap<>();
            request.put("requestId", requestId);
            request.put("outcomeType", outcomeType);
            request.put("reporterId", reporterId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
            restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.info("Recorded outcome {} for request {}", outcomeType, requestId);

        } catch (Exception e) {
            log.warn("Failed to record outcome for request {}: {}", requestId, e.getMessage());
            // Non-blocking
        }
    }

    /**
     * Get coaching suggestion from Python AI service (non-streaming).
     * Calls POST /api/coach/suggest on the Python AI service.
     */
    public String getCoachSuggestion(Map<String, Object> coachRequest) {
        try {
            String url = pythonServiceUrl + "/api/coach/suggest";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Key", internalKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(coachRequest, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class
            );

            JsonNode jsonResponse = objectMapper.readTree(response.getBody());

            if (getBoolean(jsonResponse, "success")) {
                return getText(jsonResponse, "suggestion");
            } else {
                return "I'm having trouble generating advice right now. Try again in a moment.";
            }

        } catch (Exception e) {
            log.error("Coach suggestion failed: {}", e.getMessage(), e);
            return "Unable to get coaching advice at this time. Please try again later.";
        }
    }

    /**
     * Stream coaching suggestion events from Python AI service as SSE frames.
     * Calls POST /api/coach/suggest with Accept: text/event-stream and forwards
     * each complete SSE event to eventConsumer(eventName, dataJson).
     */
    public void streamCoachSuggestion(
            Map<String, Object> coachRequest,
            String correlationId,
            BiConsumer<String, String> eventConsumer) {
        String url = pythonServiceUrl + "/api/coach/suggest";

        restTemplate.execute(
                url,
                HttpMethod.POST,
                request -> {
                    HttpHeaders headers = request.getHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.setAccept(List.of(MediaType.TEXT_EVENT_STREAM));
                    headers.set("X-Internal-Key", internalKey);
                    objectMapper.writeValue(request.getBody(), coachRequest);
                },
                response -> {
                    HttpStatusCode status = response.getStatusCode();
                    if (!status.is2xxSuccessful()) {
                        throw new IllegalStateException(
                                "Python coach stream failed with status " + status.value());
                    }

                    InputStream body = response.getBody();
                    if (body == null) {
                        throw new IllegalStateException("Python coach stream body was empty");
                    }

                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(body, StandardCharsets.UTF_8))) {
                        String eventName = "suggestion";
                        StringBuilder dataBuffer = new StringBuilder();
                        String line;

                        while ((line = reader.readLine()) != null) {
                            if (line.startsWith("event:")) {
                                eventName = line.substring("event:".length()).trim();
                                continue;
                            }

                            if (line.startsWith("data:")) {
                                if (!dataBuffer.isEmpty()) {
                                    dataBuffer.append("\n");
                                }
                                dataBuffer.append(line.substring("data:".length()).trim());
                                continue;
                            }

                            if (line.isBlank()) {
                                if (!dataBuffer.isEmpty()) {
                                    eventConsumer.accept(eventName, dataBuffer.toString());
                                    dataBuffer.setLength(0);
                                    eventName = "suggestion";
                                }
                            }
                        }

                        if (!dataBuffer.isEmpty()) {
                            eventConsumer.accept(eventName, dataBuffer.toString());
                        }
                    }

                    log.info("coach.sse.python_stream_completed correlationId={}", correlationId);
                    return null;
                });
    }

    private boolean getBoolean(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value != null && value.asBoolean();
    }

    private String getText(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull()) {
                return value.asText();
            }
        }
        return null;
    }

    private Integer getInt(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull()) {
                return value.asInt();
            }
        }
        return null;
    }
}
