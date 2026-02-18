package com.referai.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record ConversationDto(
        UUID id,
        UUID requestId,
        ProfileDto seeker,
        ProfileDto referrer,
        Boolean isActive,
        Instant lastMessageAt,
        Instant createdAt
) {}
