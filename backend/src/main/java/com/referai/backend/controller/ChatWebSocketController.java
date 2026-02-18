package com.referai.backend.controller;

import com.referai.backend.dto.MessageDto;
import com.referai.backend.dto.SendMessageRequest;
import com.referai.backend.entity.User;
import com.referai.backend.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * WebSocket STOMP controller.
 *
 * Client connects to:    ws://localhost:8080/ws  (SockJS)
 * Client subscribes to:  /topic/conversations/{id}
 * Client sends message:  /app/chat/{conversationId}
 *
 * Every message sent here is persisted to PostgreSQL AND
 * broadcast to /topic/conversations/{id} via SimpMessagingTemplate
 * (done inside ConversationService.sendMessage).
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ConversationService conversationService;

    /**
     * Handles messages sent to /app/chat/{conversationId}
     * The Principal is populated by JwtChannelInterceptor.
     */
    @MessageMapping("/chat/{conversationId}")
    public void handleChatMessage(
            @DestinationVariable String conversationId,
            @Payload SendMessageRequest req,
            Principal principal) {

        if (principal == null) {
            log.warn("[WS] Unauthenticated message to conversation {}", conversationId);
            return;
        }

        UUID userId = UUID.fromString(principal.getName());
        UUID convId  = UUID.fromString(conversationId);

        log.debug("[WS] Message from {} to conversation {}", userId, convId);
        // Persist + broadcast (broadcasting happens inside ConversationService)
        conversationService.sendMessage(convId, userId, req);
    }
}
