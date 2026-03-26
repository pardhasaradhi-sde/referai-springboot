package com.referai.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

/**
 * WebSocket configuration tuned for 10,000+ concurrent connections.
 *
 * Scaling approach:
 * - Uses Spring's internal simple broker (no external Rabbit/Redis broker needed)
 * - Thread pools sized for concurrent message handling
 * - Heartbeat keeps connections alive through proxies/load balancers
 * - Transport limits prevent memory exhaustion from large payloads
 * - SockJS fallback for environments where WebSocket is blocked
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;
    private final ConversationSubscribeChannelInterceptor conversationSubscribeChannelInterceptor;

    @Value("${app.websocket.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10_000, 10_000})  // server→client, client→server (10s)
                .setTaskScheduler(brokerTaskScheduler());
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        // Cache destination lookups for performance
        registry.setCacheLimit(2048);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        // Primary WebSocket endpoint
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins)
                .withSockJS()
                .setWebSocketEnabled(false)             // Skip native WS; use XHR-streaming (cleaner for proxy setups)
                .setStreamBytesLimit(512 * 1024)        // 512KB stream
                .setHttpMessageCacheSize(1000)           // cached messages per session
                .setDisconnectDelay(30_000)              // 30s disconnect delay
                .setHeartbeatTime(25_000);               // 25s SockJS heartbeat
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor, conversationSubscribeChannelInterceptor);
        // Thread pool for processing incoming messages
        // Core: 8 threads, Max: 64 threads — handles 10k+ concurrent senders
        registration.taskExecutor()
                .corePoolSize(8)
                .maxPoolSize(64)
                .queueCapacity(1000)
                .keepAliveSeconds(60);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        // Thread pool for sending messages to clients
        // Higher capacity since broadcasts fan out to many subscribers
        registration.taskExecutor()
                .corePoolSize(8)
                .maxPoolSize(128)
                .queueCapacity(2000)
                .keepAliveSeconds(60);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration
                .setMessageSizeLimit(64 * 1024)         // 64KB max message size
                .setSendBufferSizeLimit(512 * 1024)      // 512KB send buffer per session
                .setSendTimeLimit(20_000)                 // 20s send timeout
                .setTimeToFirstMessage(60_000);           // 60s to receive first message after connect
    }

    /**
     * Shared task scheduler for broker heartbeats and timeouts.
     */
    private org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler brokerTaskScheduler() {
        var scheduler = new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("ws-broker-");
        scheduler.setDaemon(true);
        scheduler.initialize();
        return scheduler;
    }
}
