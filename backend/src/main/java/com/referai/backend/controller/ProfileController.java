package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.ProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    /** GET /api/referrers?company=Google&search=react&page=0&size=10 */
    @GetMapping("/referrers")
    public ResponseEntity<Page<ProfileDto>> getReferrers(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(profileService.getActiveReferrers(user.getId(), company, search, pageable));
    }

    /** GET /api/referrers/{id} */
    @GetMapping("/referrers/{id}")
    public ResponseEntity<ProfileDto> getReferrer(@PathVariable UUID id) {
        return ResponseEntity.ok(profileService.getReferrerById(id));
    }

    /** POST /api/profiles/upload-resume */
    @PostMapping("/profiles/upload-resume")
    public ResponseEntity<UploadResumeResponse> uploadResume(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        log.info("POST /api/profiles/upload-resume for user {}: {}", user.getId(), file.getOriginalFilename());
        return ResponseEntity.ok(profileService.uploadResume(user.getId(), file));
    }
}
