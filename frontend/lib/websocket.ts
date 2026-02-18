import { Client, IMessage } from "@stomp/stompjs";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * Creates a STOMP client that connects via SockJS to the Spring Boot backend.
 * SockJS is browser-only, so the factory is wrapped in a lazy require.
 */
export function createStompClient(token: string): Client {
  const client = new Client({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webSocketFactory: () => {
      // Dynamic require avoids SSR issues (SockJS is browser-only)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SockJS = require("sockjs-client") as new (url: string) => WebSocket;
      return new SockJS(`${BACKEND_URL}/ws`);
    },
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });
  return client;
}

/**
 * Subscribe to real-time messages for a conversation.
 * @returns unsubscribe function
 */
export function subscribeToConversation(
  client: Client,
  conversationId: string,
  onMessage: (message: unknown) => void
): () => void {
  const sub = client.subscribe(
    `/topic/conversations/${conversationId}`,
    (frame: IMessage) => {
      try {
        onMessage(JSON.parse(frame.body));
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    }
  );
  return () => sub.unsubscribe();
}

/**
 * Send a message via STOMP (alternative to HTTP POST).
 */
export function sendStompMessage(
  client: Client,
  conversationId: string,
  content: string
): void {
  client.publish({
    destination: `/app/chat/${conversationId}`,
    body: JSON.stringify({ content }),
  });
}
