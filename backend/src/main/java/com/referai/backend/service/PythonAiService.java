package com.referai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class PythonAiService {

    @Value("${app.python-service.url}")
    private String pythonServiceUrl;

    @Value("${app.python-service.internal-key}")
    private String internalKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PythonAiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
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
