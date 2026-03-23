package com.referai.backend.repository;

import com.referai.backend.entity.ReferralRequest;
import com.referai.backend.entity.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ReferralRequestRepository extends JpaRepository<ReferralRequest, UUID> {

    @Query("SELECT r FROM ReferralRequest r LEFT JOIN FETCH r.referrer LEFT JOIN FETCH r.conversation WHERE r.seeker.id = :seekerId ORDER BY r.createdAt DESC")
    Page<ReferralRequest> findBySeekerIdOrderByCreatedAtDesc(UUID seekerId, Pageable pageable);

    @Query("SELECT r FROM ReferralRequest r LEFT JOIN FETCH r.seeker LEFT JOIN FETCH r.conversation WHERE r.referrer.id = :referrerId ORDER BY r.createdAt DESC")
    Page<ReferralRequest> findByReferrerIdOrderByCreatedAtDesc(UUID referrerId, Pageable pageable);

    /**
     * Find existing active (PENDING or ACCEPTED) request between seeker and referrer.
     * This ensures idempotency - only one active request can exist at a time.
     */
    @Query("SELECT r FROM ReferralRequest r WHERE r.seeker.id = :seekerId AND r.referrer.id = :referrerId " +
           "AND r.status IN (com.referai.backend.entity.RequestStatus.PENDING, com.referai.backend.entity.RequestStatus.ACCEPTED)")
    Optional<ReferralRequest> findActiveRequestBetween(UUID seekerId, UUID referrerId);

    /**
     * Check if an active request exists between seeker and referrer.
     */
    default boolean existsActiveRequestBetween(UUID seekerId, UUID referrerId) {
        return findActiveRequestBetween(seekerId, referrerId).isPresent();
    }
}

