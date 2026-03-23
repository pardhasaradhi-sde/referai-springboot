package com.referai.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Redis-backed sliding-window rate limiter.
 *
 * Limits per remote IP address:
 *   - Auth endpoints (/api/auth/**): 10 requests / 60 seconds
 *   - Matching endpoints (/api/matching/**): 30 requests / 60 seconds
 *   - All others: unlimited (enforced at app or infra layer)
 *
 * Uses Redis INCR + EXPIRE for atomic counters.
 * If Redis is unavailable, the filter allows requests through (fail-open).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;

    @Value("${app.rate-limit.auth.requests:10}")
    private int authLimit;

    @Value("${app.rate-limit.auth.window-seconds:60}")
    private int authWindow;

    @Value("${app.rate-limit.matching.requests:30}")
    private int matchingLimit;

    @Value("${app.rate-limit.matching.window-seconds:60}")
    private int matchingWindow;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Determine applicable limit
        int limit;
        int windowSeconds;

        if (path.startsWith("/api/auth/")) {
            limit = authLimit;
            windowSeconds = authWindow;
        } else if (path.startsWith("/api/matching/")) {
            limit = matchingLimit;
            windowSeconds = matchingWindow;
        } else {
            chain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request);
        String bucket = path.startsWith("/api/auth/") ? "auth" : "matching";
        String key = "referai:rate:" + bucket + ":" + ip;

        try {
            Long current = redisTemplate.opsForValue().increment(key);
            if (current == 1) {
                // First request — set expiry
                redisTemplate.expire(key, Duration.ofSeconds(windowSeconds));
            }

            long remaining = Math.max(0, limit - current);
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            response.setHeader("X-RateLimit-Window", windowSeconds + "s");

            if (current > limit) {
                log.warn("[RateLimit] IP {} exceeded {} limit on {}", ip, bucket, path);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"type\":\"about:blank\",\"title\":\"Too Many Requests\"," +
                        "\"status\":429,\"detail\":\"Rate limit exceeded. Retry after " + windowSeconds + "s.\"}"
                );
                return;
            }
        } catch (Exception e) {
            // Redis unavailable — fail-open (allow request, log warning)
            log.warn("[RateLimit] Redis error, allowing request: {}", e.getMessage());
        }

        chain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Support common reverse-proxy headers
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
