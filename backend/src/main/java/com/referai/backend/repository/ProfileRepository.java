package com.referai.backend.repository;

import com.referai.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByEmail(String email);

    @Query("SELECT p FROM Profile p WHERE p.role IN (com.referai.backend.entity.Role.REFERRER, com.referai.backend.entity.Role.BOTH) AND p.isActive = true AND p.id <> :excludeId")
    List<Profile> findActiveReferrers(UUID excludeId);

    @Query("SELECT p FROM Profile p WHERE p.role IN (com.referai.backend.entity.Role.REFERRER, com.referai.backend.entity.Role.BOTH) AND p.isActive = true AND p.company = :company AND p.id <> :excludeId")
    List<Profile> findActiveReferrersByCompany(String company, UUID excludeId);

    @Query("SELECT p FROM Profile p WHERE p.role IN (com.referai.backend.entity.Role.REFERRER, com.referai.backend.entity.Role.BOTH) AND p.isActive = true AND p.id <> :excludeId " +
           "AND (LOWER(p.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(p.jobTitle) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Profile> searchReferrers(String search, UUID excludeId);
}
