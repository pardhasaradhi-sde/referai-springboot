import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * Creates a STOMP client that connects via SockJS to the Spring Boot backend.
 * This utility is only used from client components.
 */
export function createStompClient(token: string): Client {
  const client = new Client({
    webSocketFactory: () => {
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

/**
 * Subscribe to real-time notifications for the current user.
 * Connected to /user/queue/notifications.
 */
export function subscribeToNotifications(
  client: Client,
  onNotification: (notification: unknown) => void
): () => void {
  const sub = client.subscribe(
    `/user/queue/notifications`,
    (frame: IMessage) => {
      try {
        onNotification(JSON.parse(frame.body));
      } catch (err) {
        console.error("Failed to parse Notification WS message:", err);
      }
    }
  );
  return () => sub.unsubscribe();
}
