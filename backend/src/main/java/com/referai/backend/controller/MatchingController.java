package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.MatchingService;
import com.referai.backend.service.PythonAiService;
import com.referai.backend.service.QuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Matching endpoints — pure proxy to Python AI service.
 * No local AI logic. All intelligence lives in referai-ai-service.
 */
@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Slf4j
public class MatchingController {

    private static final long COACH_SSE_TIMEOUT_MS = 300_000L;

    private final MatchingService matchingService;
    private final PythonAiService pythonAiService;
    private final QuotaService quotaService;
    private final ExecutorService sseExecutor = Executors.newCachedThreadPool();

    /**
     * POST /api/matching/analyze
     * Delegates to Python AI pipeline via PythonAiService.
     * Results cached in Redis by MatchingService.
     */
    @PostMapping("/analyze")
    public ResponseEntity<AnalyzeResponse> analyze(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AnalyzeRequest req) {

        log.info("POST /api/matching/analyze for user {}", user.getId());
        AnalyzeResponse result = matchingService.analyzeAndMatch(
                user.getId(), req.jobDescription(), req.resumeText(), req.targetCompany());
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/matching/history
     * Returns historical matching pipeline runs for the current user.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> history(
            @AuthenticationPrincipal User user,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {

        log.info("GET /api/matching/history for user {}", user.getId());
        Map<String, Object> result = matchingService.getMatchingHistory(user.getId(), limit);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/matching/generate-message
     * Generates outreach message via Python AI service.
     */
    @PostMapping("/generate-message")
    public ResponseEntity<Map<String, Object>> generateMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody GenerateMessageRequest req) {

        quotaService.checkAndEnforceQuota(user.getId(), "generate-message", 3);

        log.info("POST /api/matching/generate-message for user {}", user.getId());
        Map<String, Object> result = pythonAiService.generateOutreachMessage(
                user.getId().toString(),
                req.referrerId(),
                req.jobContext());

        if (Boolean.TRUE.equals(result.get("success"))) {
            quotaService.incrementQuota(user.getId(), "generate-message");
        }

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/matching/extract-jd
     * Extracts job description from URL via Python AI service.
     */
    @PostMapping("/extract-jd")
    public ResponseEntity<ExtractJdResponse> extractJobDescription(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ExtractJdRequest req) {

        log.info("POST /api/matching/extract-jd for user {}", user.getId());
        String input = req.getInput();
        boolean isUrl = input != null && (input.startsWith("http://") || input.startsWith("https://"));

        if (isUrl) {
            quotaService.checkAndEnforceQuota(user.getId(), "extract-jd", 20);
            Map<String, Object> result = pythonAiService.scrapeJobDescription(input);
            if ((Boolean) result.get("success")) {
                quotaService.incrementQuota(user.getId(), "extract-jd");
                return ResponseEntity.ok(ExtractJdResponse.builder()
                        .success(true).isUrl(true)
                        .source((String) result.get("source"))
                        .jobTitle((String) result.get("jobTitle"))
                        .company((String) result.get("company"))
                        .location((String) result.get("location"))
                        .description((String) result.get("description"))
                        .build());
            } else {
                return ResponseEntity.ok(ExtractJdResponse.builder()
                        .success(false).isUrl(true)
                        .error((String) result.get("error"))
                        .fallbackMessage((String) result.get("fallbackMessage"))
                        .build());
            }
        }

        return ResponseEntity.ok(ExtractJdResponse.builder()
                .success(true).isUrl(false).description(input).build());
    }

    /**
     * POST /api/matching/coach-suggest
     * Proxies to Python AI coach and streams SSE response.
     */
    @PostMapping(value = "/coach-suggest", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter coachSuggest(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {

        quotaService.checkAndEnforceQuota(user.getId(), "coach-suggest", 10);

        final long startedAt = System.currentTimeMillis();
        final String correlationId = UUID.randomUUID().toString();
        final AtomicInteger streamedChunks = new AtomicInteger(0);
        final AtomicBoolean completed = new AtomicBoolean(false);
        final AtomicBoolean clientDisconnected = new AtomicBoolean(false);
        final AtomicBoolean firstChunkSent = new AtomicBoolean(false);

        SseEmitter emitter = new SseEmitter(COACH_SSE_TIMEOUT_MS);

        emitter.onCompletion(() -> {
            clientDisconnected.set(true);
            log.info(
                "coach.sse.client_completed correlationId={} userId={} durationMs={} chunks={}",
                correlationId,
                user.getId(),
                System.currentTimeMillis() - startedAt,
                streamedChunks.get());
        });

        emitter.onTimeout(() -> {
            clientDisconnected.set(true);
            log.warn(
                "coach.sse.client_timeout correlationId={} userId={} durationMs={} chunks={}",
                correlationId,
                user.getId(),
                System.currentTimeMillis() - startedAt,
                streamedChunks.get());
            emitter.complete();
        });

        emitter.onError(ex -> {
            clientDisconnected.set(true);
            log.warn(
                "coach.sse.client_error correlationId={} userId={} durationMs={} chunks={} error={}",
                correlationId,
                user.getId(),
                System.currentTimeMillis() - startedAt,
                streamedChunks.get(),
                ex != null ? ex.getMessage() : "unknown");
        });

        log.info(
            "coach.sse.start correlationId={} userId={} conversationId={} stage={}",
            correlationId,
            user.getId(),
            request.getOrDefault("conversationId", ""),
            request.getOrDefault("currentStage", "first_contact"));

        sseExecutor.execute(() -> {
            try {
                Map<String, Object> coachRequest = Map.of(
                        "conversationId", request.getOrDefault("conversationId", ""),
                        "seekerId", user.getId().toString(),
                        "referrerId", request.getOrDefault("referrerId", ""),
                        "currentMessage", request.getOrDefault("currentMessage", ""),
                        "currentStage", request.getOrDefault("currentStage", "first_contact")
                );

                pythonAiService.streamCoachSuggestion(
                        coachRequest,
                        correlationId,
                        (eventName, data) -> {
                            if (clientDisconnected.get()) {
                                return;
                            }

                            try {
                                String normalizedEvent = (eventName == null || eventName.isBlank())
                                        ? "suggestion"
                                        : eventName;

                                emitter.send(SseEmitter.event().name(normalizedEvent).data(data));

                                if (data != null && data.contains("\"chunk\"")) {
                                    int count = streamedChunks.incrementAndGet();
                                    if (firstChunkSent.compareAndSet(false, true)) {
                                        quotaService.incrementQuota(user.getId(), "coach-suggest");
                                        log.info(
                                                "coach.sse.first_chunk correlationId={} userId={} ttfbMs={}",
                                                correlationId,
                                                user.getId(),
                                                System.currentTimeMillis() - startedAt);
                                    }
                                    if (count % 20 == 0) {
                                        log.info(
                                                "coach.sse.progress correlationId={} userId={} chunks={} elapsedMs={}",
                                                correlationId,
                                                user.getId(),
                                                count,
                                                System.currentTimeMillis() - startedAt);
                                    }
                                }
                            } catch (Exception sendEx) {
                                clientDisconnected.set(true);
                                log.warn(
                                        "coach.sse.send_failed correlationId={} userId={} error={}",
                                        correlationId,
                                        user.getId(),
                                        sendEx.getMessage());
                            }
                        });

                if (!clientDisconnected.get() && completed.compareAndSet(false, true)) {
                    emitter.complete();
                }

                log.info(
                        "coach.sse.done correlationId={} userId={} durationMs={} chunks={} interrupted={}",
                        correlationId,
                        user.getId(),
                        System.currentTimeMillis() - startedAt,
                        streamedChunks.get(),
                        clientDisconnected.get());

            } catch (Exception e) {
                log.error(
                        "coach.sse.failed correlationId={} userId={} durationMs={} chunks={} error={}",
                        correlationId,
                        user.getId(),
                        System.currentTimeMillis() - startedAt,
                        streamedChunks.get(),
                        e.getMessage(),
                        e);
                try {
                    if (!clientDisconnected.get()) {
                        emitter.send(SseEmitter.event().name("error")
                                .data("{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"));
                    }
                    if (completed.compareAndSet(false, true)) {
                        emitter.complete();
                    }
                } catch (Exception ignored) {
                    emitter.completeWithError(e);
                }
            }
        });

        return emitter;
    }

    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\").replace("\"", "\\\"")
                   .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}
