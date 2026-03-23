const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

const TOKEN_STORAGE_KEY = "referai_token";
const USER_ID_STORAGE_KEY = "referai_user_id";

// Token is persisted client-side for prototype velocity.
// For production deployments, migrate to backend-set httpOnly secure cookies.

function writeAuthCookie(token: string): void {
  const maxAge = 7 * 24 * 60 * 60;
  const secureAttr = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `referai_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict${secureAttr}`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function parseJwtSubject(token: string | null): string | null {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function setAuthInfo(token: string, userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  writeAuthCookie(token);
}

export function removeAuthInfo(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  document.cookie = "referai_token=; path=/; max-age=0; SameSite=Strict";
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (storedUserId) return storedUserId;

  // Fallback: recover user ID from token subject when localStorage is stale/missing.
  const fromToken = parseJwtSubject(getToken());
  if (fromToken) {
    localStorage.setItem(USER_ID_STORAGE_KEY, fromToken);
    return fromToken;
  }

  return null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (res.status === 401) {
    removeAuthInfo();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const errBody = await res.json();
      message = errBody.detail || errBody.message || errBody.title || message;
      console.error("API Error:", { status: res.status, path, errBody });
    } catch {
      console.error("API Error:", { status: res.status, path, statusText: res.statusText });
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/**
 * SSE streaming helper for AI coach endpoint.
 * Calls the backend endpoint and streams chunks via callback.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function apiStream(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  const token = getToken();

  fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`SSE failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              } else if (parsed.status === "complete") {
                onDone();
                return;
              } else if (parsed.error) {
                onError(parsed.error);
                return;
              }
            } catch {
              // Not JSON, treat as plain text chunk
              onChunk(data);
            }
          }
        }
      }

      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message || "Stream failed");
      }
    });

  return controller;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
