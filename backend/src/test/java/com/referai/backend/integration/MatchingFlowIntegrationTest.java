package com.referai.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.referai.backend.dto.AnalyzeRequest;
import com.referai.backend.dto.AuthResponse;
import com.referai.backend.dto.RegisterRequest;
import com.referai.backend.service.PythonAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MatchingFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PythonAiService pythonAiService;

    @Test
    void analyzeReturnsMatchesFromPythonService() throws Exception {
        String seekerEmail = "match-seeker-" + UUID.randomUUID() + "@example.com";
        String referrerEmail = "match-referrer-" + UUID.randomUUID() + "@example.com";
        String password = "password123";

        AuthResponse seekerAuth = register(seekerEmail, "Seeker", password);
        AuthResponse referrerAuth = register(referrerEmail, "Referrer", password);

        UUID referrerProfileId = referrerAuth.profile().id();

        when(pythonAiService.matchCandidates(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of(
                        "matches",
                        List.of(Map.of(
                                "candidateId", referrerProfileId.toString(),
                                "score", 0.85,
                                "reasoning", "Strong overlap"
                        ))
                ));

        mockMvc.perform(post("/api/matching/analyze")
                        .header("Authorization", "Bearer " + seekerAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AnalyzeRequest(
                                "Acme Corp",
                                "We need a backend engineer with Java experience.",
                                "Java, Spring Boot, distributed systems."
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches").isArray())
                .andExpect(jsonPath("$.matches[0].persona.id").value(referrerProfileId.toString()))
                .andExpect(jsonPath("$.matches[0].score").value(0.85));
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
}
