package com.referai.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "referral_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReferralRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seeker_id", nullable = false)
    private Profile seeker;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referrer_id", nullable = false)
    private Profile referrer;

    @OneToOne(mappedBy = "request", fetch = FetchType.LAZY)
    private Conversation conversation;

    @Column(name = "job_title", nullable = false)
    private String jobTitle;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "target_company", nullable = false)
    private String targetCompany;

    @Column(name = "match_score", precision = 4, scale = 3)
    private BigDecimal matchScore;

    @Column(name = "shared_skills", columnDefinition = "TEXT[]")
    @org.hibernate.annotations.Array(length = 50)
    private List<String> sharedSkills;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "initial_message", columnDefinition = "TEXT")
    private String initialMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @PrePersist
    public void setDefaultExpiry() {
        if (expiresAt == null) {
            expiresAt = Instant.now().plusSeconds(60L * 60 * 24 * 7); // 7 days
        }
    }
}
