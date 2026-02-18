package com.referai.backend.repository;

import com.referai.backend.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByRequestId(UUID requestId);

    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.seeker LEFT JOIN FETCH c.referrer " +
           "WHERE (c.seeker.id = :userId OR c.referrer.id = :userId) " +
           "AND c.isActive = true " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findByParticipant(UUID userId);
}
