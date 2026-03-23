package com.referai.backend.config;

import com.referai.backend.entity.Conversation;
import com.referai.backend.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Authorizes STOMP SUBSCRIBE frames so clients cannot listen to arbitrary conversation topics.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ConversationSubscribeChannelInterceptor implements ChannelInterceptor {

    private static final String TOPIC_CONVERSATIONS_PREFIX = "/topic/conversations/";

    private final ConversationRepository conversationRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            return message;
        }

        UUID userId = resolveAuthenticatedUserId(accessor);

        if (destination.startsWith("/user/")) {
            if (userId == null) {
                log.warn("[WS] Rejected unauthenticated SUBSCRIBE to {}", destination);
                return null;
            }
            return message;
        }

        if (destination.startsWith(TOPIC_CONVERSATIONS_PREFIX)) {
            if (userId == null) {
                log.warn("[WS] Rejected unauthenticated SUBSCRIBE to conversation topic");
                return null;
            }
            String idSegment = destination.substring(TOPIC_CONVERSATIONS_PREFIX.length());
            if (idSegment.isBlank() || idSegment.contains("/")) {
                log.warn("[WS] Malformed conversation subscribe destination");
                return null;
            }
            UUID conversationId;
            try {
                conversationId = UUID.fromString(idSegment);
            } catch (IllegalArgumentException ex) {
                log.warn("[WS] Invalid conversation id in subscribe destination");
                return null;
            }

            Conversation conv = conversationRepository.findByIdWithParticipants(conversationId).orElse(null);
            if (conv == null) {
                log.warn("[WS] Rejected SUBSCRIBE: conversation {} not found", conversationId);
                return null;
            }
            boolean allowed = conv.getSeeker().getId().equals(userId)
                    || conv.getReferrer().getId().equals(userId);
            if (!allowed) {
                log.warn("[WS] Rejected SUBSCRIBE: user {} is not a participant in {}", userId, conversationId);
                return null;
            }
            return message;
        }

        if (destination.startsWith("/topic/")) {
            log.warn("[WS] Rejected SUBSCRIBE to unexpected broker topic {}", destination);
            return null;
        }

        return message;
    }

    private UUID resolveAuthenticatedUserId(StompHeaderAccessor accessor) {
        var user = accessor.getUser();
        if (!(user instanceof UsernamePasswordAuthenticationToken token) || !token.isAuthenticated()) {
            return null;
        }
        Object principal = token.getPrincipal();
        try {
            if (principal instanceof UUID uuid) {
                return uuid;
            }
            return UUID.fromString(token.getName());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
