package com.referai.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record MessageDto(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderName,
        String content,
        Boolean isAiSuggested,
        Boolean wasEdited,
        Boolean isRead,
        Instant createdAt
) {}
