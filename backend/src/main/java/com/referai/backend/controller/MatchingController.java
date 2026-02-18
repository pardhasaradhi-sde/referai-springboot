package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.MatchingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

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
}
