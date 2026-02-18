package com.referai.backend.service;

import com.referai.backend.dto.*;
import com.referai.backend.entity.*;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.*;
import com.referai.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
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

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        Profile profile = profileRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalStateException("Profile not found"));

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.of(token, jwtTokenProvider.getExpirationMs(), mapper.toProfileDto(profile));
    }
}
