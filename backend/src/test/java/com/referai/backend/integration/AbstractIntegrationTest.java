package com.referai.backend.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Spins up PostgreSQL + Redis via Testcontainers. Requires Docker.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractIntegrationTest {

    @Container
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    protected static final GenericContainer<?> REDIS =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
                    .withExposedPorts(6379);

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);

        registry.add("spring.data.redis.url", () ->
                "redis://" + REDIS.getHost() + ":" + REDIS.getMappedPort(6379));

        registry.add("app.jwt.secret", () ->
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        registry.add("app.jwt.expiration-ms", () -> "3600000");

        registry.add("app.appwrite.project-id", () -> "test-appwrite-project");
        registry.add("app.appwrite.api-key", () -> "test-appwrite-key");

        registry.add("app.python-service.url", () -> "http://127.0.0.1:59999");
        registry.add("app.python-service.internal-key", () -> "integration-test-internal-key");

        registry.add("app.rate-limit.auth.requests", () -> "10000");
        registry.add("app.rate-limit.matching.requests", () -> "10000");

        registry.add("app.mail.enabled", () -> "false");
    }
}
