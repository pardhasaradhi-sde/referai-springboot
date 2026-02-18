package com.referai.backend.controller;

import com.referai.backend.dto.*;
import com.referai.backend.entity.User;
import com.referai.backend.service.ReferralRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class ReferralRequestController {

    private final ReferralRequestService requestService;

    /** POST /api/requests – seeker sends a new referral request */
    @PostMapping
    public ResponseEntity<ReferralRequestDto> sendRequest(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SendReferralRequestDto dto) {
        return ResponseEntity.ok(requestService.sendRequest(user.getId(), dto));
    }

    /** GET /api/requests/outgoing – requests sent by me */
    @GetMapping("/outgoing")
    public ResponseEntity<List<ReferralRequestDto>> getOutgoing(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(requestService.getOutgoingRequests(user.getId()));
    }

    /** GET /api/requests/incoming – requests I received as referrer */
    @GetMapping("/incoming")
    public ResponseEntity<List<ReferralRequestDto>> getIncoming(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(requestService.getIncomingRequests(user.getId()));
    }

    /** POST /api/requests/{id}/accept */
    @PostMapping("/{id}/accept")
    public ResponseEntity<ConversationDto> accept(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(requestService.acceptRequest(id, user.getId()));
    }

    /** POST /api/requests/{id}/decline */
    @PostMapping("/{id}/decline")
    public ResponseEntity<Map<String, Boolean>> decline(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        requestService.declineRequest(id, user.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** DELETE /api/requests/{id}/connection – Remove connection (unfriend) */
    @DeleteMapping("/{id}/connection")
    public ResponseEntity<Map<String, Boolean>> removeConnection(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        requestService.removeConnection(id, user.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }
}
