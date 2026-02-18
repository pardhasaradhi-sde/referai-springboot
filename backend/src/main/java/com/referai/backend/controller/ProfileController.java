package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ProfileController {

    private final ProfileService profileService;

    /** GET /api/profiles/me */
    @GetMapping("/profiles/me")
    public ResponseEntity<ProfileDto> getMyProfile(@AuthenticationPrincipal User user) {
        log.debug("GET /api/profiles/me for user {}", user.getId());
        return ResponseEntity.ok(profileService.getProfile(user.getId()));
    }

    /** PUT /api/profiles/me */
    @PutMapping("/profiles/me")
    public ResponseEntity<ProfileDto> updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest req) {
        log.info("PUT /api/profiles/me for user {}: {}", user.getId(), req);
        return ResponseEntity.ok(profileService.updateProfile(user.getId(), req));
    }

    /** GET /api/referrers?company=Google&search=react */
    @GetMapping("/referrers")
    public ResponseEntity<List<ProfileDto>> getReferrers(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(profileService.getActiveReferrers(user.getId(), company, search));
    }

    /** GET /api/referrers/{id} */
    @GetMapping("/referrers/{id}")
    public ResponseEntity<ProfileDto> getReferrer(@PathVariable UUID id) {
        return ResponseEntity.ok(profileService.getReferrerById(id));
    }
}
