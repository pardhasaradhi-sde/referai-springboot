package com.referai.backend.mapper;

import com.referai.backend.dto.ConversationDto;
import com.referai.backend.dto.MessageDto;
import com.referai.backend.dto.ProfileDto;
import com.referai.backend.dto.ReferralRequestDto;
import com.referai.backend.entity.Conversation;
import com.referai.backend.entity.Message;
import com.referai.backend.entity.Profile;
import com.referai.backend.entity.ReferralRequest;
import org.springframework.stereotype.Component;

@Component
public class EntityMapper {

    public ProfileDto toProfileDto(Profile p) {
        if (p == null) return null;
        return new ProfileDto(
                p.getId(), p.getEmail(), p.getFullName(),
                p.getRole() != null ? p.getRole().name().toLowerCase() : null,
                p.getCompany(), p.getJobTitle(), p.getDepartment(), p.getSeniority(),
                p.getSkills(), p.getYearsOfExperience(), p.getBio(), p.getLinkedinUrl(),
                p.getResumeUrl(), p.getResumeText(),
                p.getResumeFileUrl(), p.getResumeFileName(), p.getResumeUploadedAt(),
                p.getTargetCompanies(), p.getIsActive(), p.getCreatedAt()
        );
    }

    public ReferralRequestDto toRequestDto(ReferralRequest r) {
        var conversationId = r.getConversation() != null ? r.getConversation().getId() : null;

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
