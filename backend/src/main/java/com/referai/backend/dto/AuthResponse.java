package com.referai.backend.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        ProfileDto profile
) {
    public static AuthResponse of(String token, long expiresIn, ProfileDto profile) {
        return new AuthResponse(token, "Bearer", expiresIn, profile);
    }
}
