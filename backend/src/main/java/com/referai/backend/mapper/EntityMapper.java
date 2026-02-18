package com.referai.backend.mapper;

import com.referai.backend.dto.*;
import com.referai.backend.entity.*;
import com.referai.backend.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EntityMapper {

    private final ConversationRepository conversationRepository;

    public ProfileDto toProfileDto(Profile p) {
        if (p == null) return null;
        return new ProfileDto(
                p.getId(), p.getEmail(), p.getFullName(),
                p.getRole() != null ? p.getRole().name().toLowerCase() : null,
                p.getCompany(), p.getJobTitle(), p.getDepartment(), p.getSeniority(),
                p.getSkills(), p.getYearsOfExperience(), p.getBio(), p.getLinkedinUrl(),
                p.getResumeUrl(), p.getResumeText(), p.getTargetCompanies(),
                p.getIsActive(), p.getCreatedAt()
        );
    }

    public ReferralRequestDto toRequestDto(ReferralRequest r) {
        // Look up conversation if request is accepted
        var conversationId = conversationRepository.findByRequestId(r.getId())
                .map(Conversation::getId)
                .orElse(null);

        return new ReferralRequestDto(
                r.getId(), toProfileDto(r.getSeeker()), toProfileDto(r.getReferrer()),
                r.getJobTitle(), r.getJobDescription(), r.getTargetCompany(),
                r.getMatchScore(), r.getSharedSkills(), r.getAiExplanation(),
                r.getStatus() != null ? r.getStatus().name().toLowerCase() : null,
                r.getInitialMessage(), r.getCreatedAt(), r.getExpiresAt(),
                conversationId
        );
    }

    public ConversationDto toConversationDto(Conversation c) {
        return new ConversationDto(
                c.getId(), c.getRequest().getId(),
                toProfileDto(c.getSeeker()), toProfileDto(c.getReferrer()),
                c.getIsActive(), c.getLastMessageAt(), c.getCreatedAt()
        );
    }

    public MessageDto toMessageDto(Message m) {
        return new MessageDto(
                m.getId(), m.getConversation().getId(),
                m.getSender().getId(), m.getSender().getFullName(),
                m.getContent(), m.getIsAiSuggested(), m.getWasEdited(),
                m.getIsRead(), m.getCreatedAt()
        );
    }
}
