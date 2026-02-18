package com.referai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record SendMessageRequest(
        @NotBlank String content,
        Boolean isAiSuggested
) {}
