package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    /** GET /api/conversations – list all conversations for the current user */
    @GetMapping
    public ResponseEntity<List<ConversationDto>> getConversations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(conversationService.getUserConversations(user.getId()));
    }

    /** GET /api/conversations/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ConversationDto> getConversation(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(conversationService.getConversation(id, user.getId()));
    }

    /** GET /api/conversations/{id}/messages */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(conversationService.getMessages(id, user.getId()));
    }

    /**
     * POST /api/conversations/{id}/messages
     * HTTP fallback – also handled by WebSocket for real-time.
     */
    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageDto> sendMessage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest req) {
        return ResponseEntity.ok(conversationService.sendMessage(id, user.getId(), req));
    }
}
