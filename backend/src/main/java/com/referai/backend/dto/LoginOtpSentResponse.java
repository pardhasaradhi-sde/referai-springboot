package com.referai.backend.dto;

/**
 * Returned after credentials are validated and a login OTP is stored (and emailed when mail is enabled).
 */
public record LoginOtpSentResponse(
        boolean otpSent,
        String emailMasked,
        int expiresInSeconds
) {
    public static String maskEmail(String email) {
        if (email == null) {
            return "***";
        }
        String e = email.trim();
        int at = e.indexOf('@');
        if (at < 0) {
            return "***";
        }
        if (at <= 1) {
            return "*" + e.substring(at);
        }
        return e.charAt(0) + "***" + e.substring(at);
    }
}
