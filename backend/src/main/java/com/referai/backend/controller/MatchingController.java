package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.MatchingService;
import com.referai.backend.service.PythonAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Slf4j
public class MatchingController {

    private final MatchingService matchingService;
    private final PythonAiService pythonAiService;

    /**
     * POST /api/matching/analyze
     * Parses resume + job description with Gemini and returns top matching referrers.
     */
    @PostMapping("/analyze")
    public ResponseEntity<AnalyzeResponse> analyze(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AnalyzeRequest req) {
        AnalyzeResponse result = matchingService.analyzeAndMatch(
                user.getId(), req.jobDescription(), req.resumeText());
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/matching/generate-message
     * Generates an AI outreach message for a referral request.
     */
    @PostMapping("/generate-message")
    public ResponseEntity<Map<String, String>> generateMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody GenerateMessageRequest req) {
        String message = matchingService.generateOutreachMessage(
                req.seekerName(), req.referrerName(), req.referrerCompany(),
                req.jobContext(), req.sharedSkills());
        return ResponseEntity.ok(Map.of("message", message));
    }

    /**
     * POST /api/matching/extract-jd
     * Extracts job description from URL or returns plain text as-is.
     */
    @PostMapping("/extract-jd")
    public ResponseEntity<ExtractJdResponse> extractJobDescription(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ExtractJdRequest req) {
        log.info("POST /api/matching/extract-jd for user {}", user.getId());
        
        String input = req.getInput();
        
        // Check if input is a URL
        boolean isUrl = input != null && (input.startsWith("http://") || input.startsWith("https://"));
        
        if (isUrl) {
            // Scrape job description from URL
            Map<String, Object> result = pythonAiService.scrapeJobDescription(input);
            
            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(ExtractJdResponse.builder()
                        .success(true)
                        .isUrl(true)
                        .source((String) result.get("source"))
                        .jobTitle((String) result.get("jobTitle"))
                        .company((String) result.get("company"))
                        .location((String) result.get("location"))
                        .description((String) result.get("description"))
                        .build());
            } else {
                return ResponseEntity.ok(ExtractJdResponse.builder()
                        .success(false)
                        .isUrl(true)
                        .error((String) result.get("error"))
                        .fallbackMessage((String) result.get("fallbackMessage"))
                        .build());
            }
        } else {
            // Return plain text as-is
            return ResponseEntity.ok(ExtractJdResponse.builder()
                    .success(true)
                    .isUrl(false)
                    .description(input)
                    .build());
        }
    }
}
