package com.referai.backend.service;

import com.referai.backend.dto.ConversationDto;
import com.referai.backend.dto.ReferralRequestDto;
import com.referai.backend.dto.SendReferralRequestDto;
import com.referai.backend.entity.Conversation;
import com.referai.backend.entity.Profile;
import com.referai.backend.entity.ReferralRequest;
import com.referai.backend.entity.RequestStatus;
import com.referai.backend.mapper.EntityMapper;
import com.referai.backend.repository.ConversationRepository;
import com.referai.backend.repository.MessageRepository;
import com.referai.backend.repository.ProfileRepository;
import com.referai.backend.repository.ReferralRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReferralRequestServiceTest {

    @Mock
    private ReferralRequestRepository requestRepository;
    @Mock
    private ProfileRepository profileRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private EntityMapper mapper;

    @InjectMocks
    private ReferralRequestService service;

    @Test
    void sendRequestReturnsExistingPendingRequestForIdempotency() {
        UUID seekerId = UUID.randomUUID();
        UUID referrerId = UUID.randomUUID();
        ReferralRequest existing = ReferralRequest.builder()
                .id(UUID.randomUUID())
                .status(RequestStatus.PENDING)
                .build();
        ReferralRequestDto dto = new ReferralRequestDto(
                existing.getId(), null, null,
                "Backend Engineer", "JD", "Acme",
                new BigDecimal("0.700"), List.of("Java"), "match",
                "pending", "hi", Instant.now(), Instant.now(), null
        );

        when(profileRepository.findById(seekerId)).thenReturn(Optional.of(Profile.builder().id(seekerId).build()));
        when(profileRepository.findById(referrerId)).thenReturn(Optional.of(Profile.builder().id(referrerId).build()));
        when(requestRepository.findActiveRequestBetween(seekerId, referrerId)).thenReturn(Optional.of(existing));
        when(mapper.toRequestDto(existing)).thenReturn(dto);

        SendReferralRequestDto input = new SendReferralRequestDto(
                referrerId,
                "Backend Engineer",
                "JD",
                "Acme",
                new BigDecimal("0.700"),
                List.of("Java"),
                "match",
                "hi"
        );

        ReferralRequestDto actual = service.sendRequest(seekerId, input);

        assertEquals(existing.getId(), actual.id());
        verify(requestRepository, never()).save(any(ReferralRequest.class));
    }

    @Test
    void acceptRequestThrowsWhenNonReferrerTriesToAccept() {
        UUID requestId = UUID.randomUUID();
        UUID actualReferrerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();

        ReferralRequest request = ReferralRequest.builder()
                .id(requestId)
                .status(RequestStatus.PENDING)
                .referrer(Profile.builder().id(actualReferrerId).build())
                .build();

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));

        assertThrows(SecurityException.class, () -> service.acceptRequest(requestId, attackerId));
    }

    @Test
    void acceptRequestReturnsExistingConversationWithoutCreatingAnother() {
        UUID requestId = UUID.randomUUID();
        UUID referrerId = UUID.randomUUID();

        ReferralRequest request = ReferralRequest.builder()
                .id(requestId)
                .status(RequestStatus.PENDING)
                .referrer(Profile.builder().id(referrerId).build())
                .build();

        Conversation existing = Conversation.builder()
                .id(UUID.randomUUID())
                .request(request)
                .build();

        ConversationDto dto = new ConversationDto(
                existing.getId(),
                requestId,
                null,
                null,
                true,
                Instant.now(),
                Instant.now()
        );

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(conversationRepository.findByRequestId(requestId)).thenReturn(Optional.of(existing));
        when(mapper.toConversationDto(existing)).thenReturn(dto);

        ConversationDto actual = service.acceptRequest(requestId, referrerId);

        assertEquals(existing.getId(), actual.id());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }
}
