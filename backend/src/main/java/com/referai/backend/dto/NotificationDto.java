package com.referai.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
    UUID id,
    String type,
    String title,
    String message,
    Instant createdAt,
    boolean read
) {}
