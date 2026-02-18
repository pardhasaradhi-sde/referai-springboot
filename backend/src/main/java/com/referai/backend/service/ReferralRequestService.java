package com.referai.backend.service;

import com.referai.backend.dto.*;
import com.referai.backend.entity.*;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReferralRequestService {

    private final ReferralRequestRepository requestRepository;
    private final ProfileRepository profileRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final EntityMapper mapper;

    @Transactional
    public ReferralRequestDto sendRequest(UUID seekerId, SendReferralRequestDto dto) {
        Profile seeker = profileRepository.findById(seekerId)
                .orElseThrow(() -> new IllegalArgumentException("Seeker profile not found"));
        Profile referrer = profileRepository.findById(dto.referrerId())
                .orElseThrow(() -> new IllegalArgumentException("Referrer profile not found"));

        // Validate: Cannot send request to yourself
        if (seekerId.equals(dto.referrerId())) {
            throw new IllegalArgumentException("Cannot send request to yourself");
        }

        // Check for existing active request (IDEMPOTENCY)
        Optional<ReferralRequest> existingRequest = requestRepository.findActiveRequestBetween(seekerId, dto.referrerId());
        if (existingRequest.isPresent()) {
            ReferralRequest existing = existingRequest.get();

            // If request is PENDING, return it (idempotent behavior)
            if (existing.getStatus() == RequestStatus.PENDING) {
                return mapper.toRequestDto(existing);
            }

            // If request is ACCEPTED, throw error - cannot send another while one is accepted
            if (existing.getStatus() == RequestStatus.ACCEPTED) {
                throw new IllegalStateException("You already have an accepted request with this referrer. " +
                        "Please wait for the conversation to complete before sending a new request.");
            }
        }

        // Create new request
        ReferralRequest request = ReferralRequest.builder()
                .seeker(seeker)
                .referrer(referrer)
                .jobTitle(dto.jobTitle())
                .jobDescription(dto.jobDescription())
                .targetCompany(dto.targetCompany())
                .matchScore(dto.matchScore())
                .sharedSkills(dto.sharedSkills())
                .aiExplanation(dto.aiExplanation())
                .initialMessage(dto.initialMessage())
                .status(RequestStatus.PENDING)
                .build();

        return mapper.toRequestDto(requestRepository.save(request));
    }

    public List<ReferralRequestDto> getOutgoingRequests(UUID seekerId) {
        return requestRepository.findBySeekerIdOrderByCreatedAtDesc(seekerId)
                .stream().map(mapper::toRequestDto).toList();
    }

    public List<ReferralRequestDto> getIncomingRequests(UUID referrerId) {
        return requestRepository.findByReferrerIdOrderByCreatedAtDesc(referrerId)
                .stream().map(mapper::toRequestDto).toList();
    }

    @Transactional
    public ConversationDto acceptRequest(UUID requestId, UUID referrerId) {
        ReferralRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        // Validate: Only the referrer can accept the request
        if (!request.getReferrer().getId().equals(referrerId)) {
            throw new SecurityException("Not authorized to accept this request");
        }

        // Validate: Request must be in PENDING state
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("Request is no longer pending. Current status: " +
                    request.getStatus().name().toLowerCase());
        }

        // Check if a conversation already exists (idempotency)
        Optional<Conversation> existingConv = conversationRepository.findByRequestId(request.getId());
        if (existingConv.isPresent()) {
            return mapper.toConversationDto(existingConv.get());
        }

        // Update request status
        request.setStatus(RequestStatus.ACCEPTED);
        requestRepository.save(request);

        // Create conversation
        Conversation conversation = Conversation.builder()
                .request(request)
                .seeker(request.getSeeker())
                .referrer(request.getReferrer())
                .isActive(true)
                .build();
        conversationRepository.save(conversation);

        // Seed the initial AI-generated message if present
        if (request.getInitialMessage() != null && !request.getInitialMessage().isBlank()) {
            Message initMsg = Message.builder()
                    .conversation(conversation)
                    .sender(request.getSeeker())
                    .content(request.getInitialMessage())
                    .isAiSuggested(true)
                    .build();
            messageRepository.save(initMsg);
        }

        return mapper.toConversationDto(conversation);
    }

    @Transactional
    public void declineRequest(UUID requestId, UUID referrerId) {
        ReferralRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        // Validate: Only the referrer can decline the request
        if (!request.getReferrer().getId().equals(referrerId)) {
            throw new SecurityException("Not authorized to decline this request");
        }

        // Validate: Request must be in PENDING state
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("Request is no longer pending. Current status: " +
                    request.getStatus().name().toLowerCase());
        }

        request.setStatus(RequestStatus.DECLINED);
        requestRepository.save(request);
    }

    /**
     * Remove connection - allows either party to end an accepted connection.
     * Deactivates the conversation and marks the request as declined.
     */
    @Transactional
    public void removeConnection(UUID requestId, UUID userId) {
        ReferralRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        // Validate: Only participants can remove connection
        if (!request.getSeeker().getId().equals(userId) && !request.getReferrer().getId().equals(userId)) {
            throw new SecurityException("Not authorized to remove this connection");
        }

        // Validate: Request must be ACCEPTED to remove connection
        if (request.getStatus() != RequestStatus.ACCEPTED) {
            throw new IllegalStateException("No active connection to remove");
        }

        // Mark request as declined (ended)
        request.setStatus(RequestStatus.DECLINED);
        requestRepository.save(request);

        // Deactivate conversation if exists
        conversationRepository.findByRequestId(requestId).ifPresent(conversation -> {
            conversation.setIsActive(false);
            conversationRepository.save(conversation);
        });
    }
}
