package com.referai.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AppwriteConfig {

    @Value("${app.appwrite.endpoint:https://sgp.cloud.appwrite.io/v1}")
    private String endpoint;

    @Value("${app.appwrite.project-id:69b3a4410037d827ccf9}")
    private String projectId;

    @Value("${app.appwrite.api-key:${APPWRITE_API_KEY:}}")
    private String apiKey;

    @Value("${app.appwrite.bucket-id:referai-resumes}")
    private String bucketId;

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

    @Bean
    public String appwriteBucketId() {
        return bucketId;
    }
}
