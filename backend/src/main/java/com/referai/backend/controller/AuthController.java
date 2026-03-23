package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    /**
     * Step 1: validate password, send OTP to email (or store only if mail disabled).
     */
    @PostMapping("/login")
    public ResponseEntity<LoginOtpSentResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.initiateLogin(req));
    }

    /**
     * Step 2: validate password + OTP from Redis, return JWT.
     */
    @PostMapping("/login/verify-otp")
    public ResponseEntity<AuthResponse> verifyLoginOtp(@Valid @RequestBody LoginVerifyOtpRequest req) {
        return ResponseEntity.ok(authService.verifyLoginOtp(req));
    }
}
