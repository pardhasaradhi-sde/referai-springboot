package com.referai.backend.service;

import com.referai.backend.dto.ConversationDto;
import com.referai.backend.dto.MessageDto;
import com.referai.backend.dto.SendMessageRequest;
import com.referai.backend.entity.Conversation;
import com.referai.backend.entity.Message;
import com.referai.backend.entity.Profile;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ConversationRepository;
import com.referai.backend.repository.MessageRepository;
import com.referai.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ProfileRepository profileRepository;
    private final SimpMessagingTemplate messagingTemplate;  // WebSocket broadcaster
    private final EntityMapper mapper;
    private final EmailService emailService;

    public List<ConversationDto> getUserConversations(UUID userId) {
        return conversationRepository.findByParticipant(userId)
                .stream().map(mapper::toConversationDto).toList();
    }

    public ConversationDto getConversation(UUID conversationId, UUID userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        assertParticipant(conv, userId);
        return mapper.toConversationDto(conv);
    }

    public List<MessageDto> getMessages(UUID conversationId, UUID userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        assertParticipant(conv, userId);

        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream().map(mapper::toMessageDto).toList();
    }

    @Transactional
    public MessageDto sendMessage(UUID conversationId, UUID senderId, SendMessageRequest req) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        assertParticipant(conv, senderId);

        Profile sender = profileRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender profile not found"));

        String cleanContent = req.content();
        if (cleanContent == null || cleanContent.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }

        Message message = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(cleanContent)
                .isAiSuggested(req.isAiSuggested() != null && req.isAiSuggested())
                .build();

        message = messageRepository.save(message);

        // Update conversation timestamp
        conv.setLastMessageAt(Instant.now());
        conversationRepository.save(conv);

        MessageDto dto = mapper.toMessageDto(message);

        // ── Push via WebSocket to all subscribers of this conversation ──
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + conversationId,
                dto
        );

        Profile recipient = senderId.equals(conv.getSeeker().getId()) ? conv.getReferrer() : conv.getSeeker();
        if (recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
            emailService.sendNewMessageNotificationAsync(
                    recipient.getEmail(),
                    recipient.getFullName(),
                    sender.getFullName(),
                    cleanContent,
                    conversationId);
        }

        return dto;
    }

    private void assertParticipant(Conversation conv, UUID userId) {
        boolean isParticipant = conv.getSeeker().getId().equals(userId)
                || conv.getReferrer().getId().equals(userId);
        if (!isParticipant) {
            throw new SecurityException("Not a participant in this conversation");
        }
    }
}
