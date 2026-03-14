package com.referai.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AppwriteConfig {

    @Value("${app.appwrite.endpoint}")
    private String endpoint;

    @Value("${app.appwrite.project-id}")
    private String projectId;

    @Value("${app.appwrite.api-key}")
    private String apiKey;

    @Bean
    public WebClient appwriteWebClient() {
        return WebClient.builder()
                .baseUrl(endpoint)
                .defaultHeader("X-Appwrite-Project", projectId)
                .defaultHeader("X-Appwrite-Key", apiKey)
                .build();
    }

    @Bean
    public String appwriteProjectId() {
        return projectId;
    }

    @Bean
    public String appwriteEndpoint() {
        return endpoint;
    }
}
