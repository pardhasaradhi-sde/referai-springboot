package com.referai.backend.service;

import com.referai.backend.exception.QuotaExceededException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuotaService {

    private final StringRedisTemplate redisTemplate;

    /**
     * Checks if the user has remaining quota. If they don't, gracefully throws 
     * a QuotaExceededException which resolves to 429 Too Many Requests.
     */
    public void checkAndEnforceQuota(UUID userId, String feature, int limit) {
        String key = buildKey(userId, feature);
        try {
            String currentStr = redisTemplate.opsForValue().get(key);
            if (currentStr != null) {
                int current = Integer.parseInt(currentStr);
                if (current >= limit) {
                    log.warn("[Quota] User {} exceeded {} limit ({} >= {})", userId, feature, current, limit);
                    throw new QuotaExceededException("Daily " + feature + " quota exceeded. Limit is " + limit + " per day.");
                }
            }
        } catch (NumberFormatException e) {
            log.warn("[Quota] Unparseable quota value for key {}", key);
        } catch (QuotaExceededException q) {
            throw q; // Re-throw
        } catch (Exception e) {
            log.warn("[Quota] Redis check failed, allowing request (fail-open)", e);
        }
    }

    /**
     * Increments the quota usage by 1 for the current day.
     * Sets a TTL of 48 hours to automatically clean up old keys.
     */
    public void incrementQuota(UUID userId, String feature) {
        String key = buildKey(userId, feature);
        try {
            Long current = redisTemplate.opsForValue().increment(key);
            if (current != null && current == 1L) {
                redisTemplate.expire(key, Duration.ofHours(48)); // Clean up keys safely after tomorrow
            }
        } catch (Exception e) {
            log.warn("[Quota] Redis increment failed for key {}", key, e);
        }
    }

    private String buildKey(UUID userId, String feature) {
        String dateSuffix = LocalDate.now(ZoneOffset.UTC).toString();
        return "referai:quota:" + feature + ":" + userId.toString() + ":" + dateSuffix;
    }
}
