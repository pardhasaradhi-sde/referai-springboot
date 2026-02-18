package com.referai.backend.repository;

import com.referai.backend.entity.ReferralRequest;
import com.referai.backend.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReferralRequestRepository extends JpaRepository<ReferralRequest, UUID> {

    @Query("SELECT r FROM ReferralRequest r LEFT JOIN FETCH r.referrer WHERE r.seeker.id = :seekerId ORDER BY r.createdAt DESC")
    List<ReferralRequest> findBySeekerIdOrderByCreatedAtDesc(UUID seekerId);

    @Query("SELECT r FROM ReferralRequest r LEFT JOIN FETCH r.seeker WHERE r.referrer.id = :referrerId ORDER BY r.createdAt DESC")
    List<ReferralRequest> findByReferrerIdOrderByCreatedAtDesc(UUID referrerId);

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
