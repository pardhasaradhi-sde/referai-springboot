package com.referai.backend.service;

import com.referai.backend.dto.*;
import com.referai.backend.entity.*;
import com.referai.backend.exception.ExternalServiceException;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.*;
import com.referai.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EntityMapper mapper;
    private final LoginOtpRedisService loginOtpRedisService;
    private final EmailService emailService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        user = userRepository.saveAndFlush(user);  // Flush to get the generated ID

        Profile profile = Profile.builder()
                .user(user)  // Don't set ID manually, @MapsId will handle it
                .email(user.getEmail())
                .fullName(req.fullName())
                .role(Role.SEEKER)
                .isActive(true)
                .build();
        profile = profileRepository.save(profile);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.of(token, jwtTokenProvider.getExpirationMs(), mapper.toProfileDto(profile));
    }

    /**
     * Step 1 of login: validates password, stores a 6-digit OTP in Redis (5 min TTL), sends email when mail is enabled.
     */
    public LoginOtpSentResponse initiateLogin(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        Profile profile = profileRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalStateException("Profile not found"));

        String otp = loginOtpRedisService.createAndStoreOtp(user.getEmail());
        try {
            emailService.sendLoginOtp(user.getEmail(), otp, profile.getFullName());
        } catch (Exception e) {
            loginOtpRedisService.deleteOtp(user.getEmail());
            throw new ExternalServiceException(
                    "Unable to send verification email. Please try again in a few minutes.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    e);
        }

        return new LoginOtpSentResponse(
                true,
                LoginOtpSentResponse.maskEmail(user.getEmail()),
                300);
    }

    /**
     * Step 2 of login: re-checks password, verifies OTP from Redis, issues JWT.
     */
    public AuthResponse verifyLoginOtp(LoginVerifyOtpRequest req) {
        User user = userRepository.findByEmail(req.email().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (!loginOtpRedisService.verifyAndConsumeOtp(user.getEmail(), req.otp())) {
            throw new IllegalArgumentException("Invalid or expired verification code");
        }

        Profile profile = profileRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalStateException("Profile not found"));

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.of(token, jwtTokenProvider.getExpirationMs(), mapper.toProfileDto(profile));
    }
}
