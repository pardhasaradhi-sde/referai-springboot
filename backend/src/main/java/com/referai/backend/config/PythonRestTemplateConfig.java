package com.referai.backend.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Blocking HTTP client to the Python AI service with explicit timeouts.
 */
@Configuration
public class PythonRestTemplateConfig {

    @Bean
    @Qualifier("pythonRestTemplate")
    public RestTemplate pythonRestTemplate(
            @Value("${app.python-service.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${app.python-service.read-timeout-ms}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }
}
