package com.referai.backend.service;

import com.referai.backend.dto.ProfileDto;
import com.referai.backend.dto.UpdateProfileRequest;
import com.referai.backend.dto.UploadResumeResponse;
import com.referai.backend.entity.Profile;
import com.referai.backend.entity.Role;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final EntityMapper mapper;
    private final FileStorageService fileStorageService;
    private final PythonAiService pythonAiService;

    @Value("${app.python-service.index-referrers-enabled:true}")
    private boolean indexReferrersEnabled;

    public ProfileDto getProfile(UUID userId) {
        return profileRepository.findById(userId)
                .map(mapper::toProfileDto)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
    }

    @Transactional
    public ProfileDto updateProfile(UUID userId, UpdateProfileRequest req) {
        log.debug("Updating profile for user {}: {}", userId, req);
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        if (req.fullName() != null)         profile.setFullName(req.fullName());
        if (req.role() != null) {
            try {
                profile.setRole(Role.valueOf(req.role().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role: " + req.role() + ". Must be one of: seeker, referrer, both");
            }
        }
        if (req.company() != null)          profile.setCompany(req.company());
        if (req.jobTitle() != null)         profile.setJobTitle(req.jobTitle());
        if (req.department() != null)       profile.setDepartment(req.department());
        if (req.seniority() != null)        profile.setSeniority(req.seniority());
        if (req.skills() != null)           profile.setSkills(req.skills());
        if (req.yearsOfExperience() != null) profile.setYearsOfExperience(req.yearsOfExperience());
        if (req.bio() != null)              profile.setBio(req.bio());
        if (req.linkedinUrl() != null)      profile.setLinkedinUrl(req.linkedinUrl());
        if (req.resumeText() != null)       profile.setResumeText(req.resumeText());
        if (req.targetCompanies() != null)  profile.setTargetCompanies(req.targetCompanies());

        Profile saved = profileRepository.save(profile);
        log.debug("Profile updated successfully: role={}, company={}", saved.getRole(), saved.getCompany());

        // Trigger referrer profile indexing for semantic search (async, non-blocking)
        if (!indexReferrersEnabled) {
            log.info("Referrer indexing is disabled. Skipping indexReferrer call for user {}", saved.getId());
        } else if (saved.getRole() == Role.REFERRER || saved.getRole() == Role.BOTH) {
            try {
                pythonAiService.indexReferrerProfile(
                    saved.getId().toString(),
                    saved.getBio(),
                    saved.getSkills(),
                    saved.getJobTitle(),
                    saved.getCompany(),
                    saved.getDepartment(),
                    saved.getSeniority(),
                    saved.getYearsOfExperience()
                );
            } catch (Exception e) {
                log.warn("Failed to index referrer profile after update: {}", e.getMessage());
            }
        }

        return mapper.toProfileDto(saved);
    }


    public Page<ProfileDto> getActiveReferrers(UUID currentUserId, String company, String search, Pageable pageable) {
        Page<Profile> referrers;

        if (search != null && !search.isBlank()) {
            referrers = profileRepository.searchReferrers(search, currentUserId, pageable);
        } else if (company != null && !company.isBlank()) {
            referrers = profileRepository.findActiveReferrersByCompany(company, currentUserId, pageable);
        } else {
            referrers = profileRepository.findActiveReferrers(currentUserId, pageable);
        }

        return referrers.map(mapper::toProfileDto);
    }

    public ProfileDto getReferrerById(UUID referrerId) {
        return profileRepository.findById(referrerId)
                .filter(p -> p.getRole() == Role.REFERRER || p.getRole() == Role.BOTH)
                .map(mapper::toProfileDto)
                .orElseThrow(() -> new IllegalArgumentException("Referrer not found"));
    }

    @Transactional
    public UploadResumeResponse uploadResume(UUID userId, MultipartFile file) {
        try {
            // Validate file
            if (file.isEmpty()) {
                return UploadResumeResponse.builder()
                        .success(false)
                        .error("File is empty")
                        .build();
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) {
                return UploadResumeResponse.builder()
                        .success(false)
                        .error("Invalid filename")
                        .build();
            }

            // Validate file type
            String extension = originalFilename.toLowerCase();
            if (!extension.endsWith(".pdf") && !extension.endsWith(".docx")) {
                return UploadResumeResponse.builder()
                        .success(false)
                        .error("Only PDF and DOCX files are supported")
                        .build();
            }

            // Validate file size (5MB max)
            if (file.getSize() > 5 * 1024 * 1024) {
                return UploadResumeResponse.builder()
                        .success(false)
                        .error("File size must be less than 5MB")
                        .build();
            }

            log.info("Processing resume upload for user {}: {}", userId, originalFilename);

            // Extract text using Python service
            Map<String, Object> extractionResult = pythonAiService.extractResumeText(
                    file.getBytes(), 
                    originalFilename
            );

            if (!(Boolean) extractionResult.get("success")) {
                return UploadResumeResponse.builder()
                        .success(false)
                        .error("Failed to extract text: " + extractionResult.get("error"))
                        .build();
            }

            // Upload file to Appwrite
            String fileUrl = fileStorageService.uploadFile(file, userId);

            // Update profile
            Profile profile = profileRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

            String extractedText = (String) extractionResult.get("text");
            profile.setResumeText(extractedText);
            profile.setResumeFileUrl(fileUrl);
            profile.setResumeFileName(originalFilename);
            profile.setResumeUploadedAt(Instant.now());

            profileRepository.save(profile);

            log.info("Successfully uploaded resume for user {}", userId);

            return UploadResumeResponse.builder()
                    .success(true)
                    .fileUrl(fileUrl)
                    .fileName(originalFilename)
                    .extractedText(extractedText)
                    .wordCount((Integer) extractionResult.get("wordCount"))
                    .uploadedAt(profile.getResumeUploadedAt())
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload resume for user {}: {}", userId, e.getMessage(), e);
            return UploadResumeResponse.builder()
                    .success(false)
                    .error("Upload failed: " + e.getMessage())
                    .build();
        }
    }
}
