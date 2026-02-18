package com.referai.backend.service;

import com.referai.backend.dto.ProfileDto;
import com.referai.backend.dto.UpdateProfileRequest;
import com.referai.backend.entity.Profile;
import com.referai.backend.entity.Role;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final EntityMapper mapper;

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
        return mapper.toProfileDto(saved);
    }

    public List<ProfileDto> getActiveReferrers(UUID currentUserId, String company, String search) {
        List<Profile> referrers;

        if (search != null && !search.isBlank()) {
            referrers = profileRepository.searchReferrers(search, currentUserId);
        } else if (company != null && !company.isBlank()) {
            referrers = profileRepository.findActiveReferrersByCompany(company, currentUserId);
        } else {
            referrers = profileRepository.findActiveReferrers(currentUserId);
        }

        return referrers.stream().map(mapper::toProfileDto).toList();
    }

    public ProfileDto getReferrerById(UUID referrerId) {
        return profileRepository.findById(referrerId)
                .filter(p -> p.getRole() == Role.REFERRER || p.getRole() == Role.BOTH)
                .map(mapper::toProfileDto)
                .orElseThrow(() -> new IllegalArgumentException("Referrer not found"));
    }
}
