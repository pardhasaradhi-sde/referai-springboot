package com.referai.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.referai.backend.dto.AuthResponse;
import com.referai.backend.dto.RegisterRequest;
import com.referai.backend.dto.SendReferralRequestDto;
import com.referai.backend.service.PythonAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ReferralOutcomeAuthorizationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PythonAiService pythonAiService;

    @Test
    void reportOutcomeForbiddenForNonParticipant() throws Exception {
        String password = "password123";
        AuthResponse seeker = register("outcome-seeker-" + UUID.randomUUID() + "@example.com", "Seeker", password);
        AuthResponse referrer = register("outcome-ref-" + UUID.randomUUID() + "@example.com", "Referrer", password);
        AuthResponse stranger = register("outcome-stranger-" + UUID.randomUUID() + "@example.com", "Stranger", password);

        UUID requestId = createRequest(seeker, referrer.profile().id());

        mockMvc.perform(post("/api/requests/" + requestId + "/report-outcome")
                        .header("Authorization", "Bearer " + stranger.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"outcomeType\":\"hired\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/requests/" + requestId + "/report-outcome")
                        .header("Authorization", "Bearer " + seeker.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"outcomeType\":\"hired\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void reportOutcomeNotFoundForUnknownRequest() throws Exception {
        AuthResponse user = register("outcome-nf-" + UUID.randomUUID() + "@example.com", "U", "password123");
        UUID fakeId = UUID.randomUUID();

        mockMvc.perform(post("/api/requests/" + fakeId + "/report-outcome")
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"outcomeType\":\"rejected\"}"))
                .andExpect(status().isNotFound());
    }

    private AuthResponse register(String email, String fullName, String password) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, fullName, password))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return objectMapper.treeToValue(root, AuthResponse.class);
    }

    private UUID createRequest(AuthResponse seeker, UUID referrerProfileId) throws Exception {
        SendReferralRequestDto dto = new SendReferralRequestDto(
                referrerProfileId,
                "Engineer",
                "Build APIs",
                "Acme",
                new BigDecimal("0.8"),
                List.of("Java"),
                "fit",
                "Hello"
        );
        MvcResult res = mockMvc.perform(post("/api/requests")
                        .header("Authorization", "Bearer " + seeker.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return UUID.fromString(root.get("id").asText());
    }
}
