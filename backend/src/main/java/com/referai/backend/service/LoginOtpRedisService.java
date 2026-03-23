package com.referai.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Locale;

/**
 * Stores login OTPs in Redis (Upstash-compatible via spring.data.redis.url).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginOtpRedisService {

    private static final String KEY_PREFIX = "referai:auth:login-otp:";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    public String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Generates a 6-digit OTP, stores it with TTL, returns the plaintext OTP for sending by email.
     */
    public String createAndStoreOtp(String rawEmail) {
        String normalized = normalizeEmail(rawEmail);
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        redisTemplate.opsForValue().set(key(normalized), otp, OTP_TTL);
        log.debug("[OTP] Stored login OTP for email hash={}", shortHash(normalized));
        return otp;
    }

    /**
     * Timing-safe compare; deletes key only when OTP matches.
     */
    public boolean verifyAndConsumeOtp(String rawEmail, String submittedOtp) {
        if (submittedOtp == null) {
            return false;
        }
        String normalized = normalizeEmail(rawEmail);
        String key = key(normalized);
        String stored = redisTemplate.opsForValue().get(key);
        if (stored == null) {
            return false;
        }
        String trimmed = submittedOtp.trim();
        boolean match = constantTimeEquals(stored, trimmed);
        if (match) {
            redisTemplate.delete(key);
            log.debug("[OTP] Consumed login OTP for email hash={}", shortHash(normalized));
        }
        return match;
    }

    public void deleteOtp(String rawEmail) {
        redisTemplate.delete(key(normalizeEmail(rawEmail)));
    }

    private static String key(String normalizedEmail) {
        return KEY_PREFIX + normalizedEmail;
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] x = a.getBytes(StandardCharsets.UTF_8);
        byte[] y = b.getBytes(StandardCharsets.UTF_8);
        if (x.length != y.length) {
            return false;
        }
        return MessageDigest.isEqual(x, y);
    }

    private static String shortHash(String normalizedEmail) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalizedEmail.getBytes(StandardCharsets.UTF_8));
            return String.format("%02x%02x", digest[0], digest[1]);
        } catch (NoSuchAlgorithmException e) {
            return "unknown";
        }
    }
}
