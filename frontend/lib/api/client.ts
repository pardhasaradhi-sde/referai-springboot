const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

// ─── Token / Auth helpers ────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("referai_token");
}

export function setAuthInfo(token: string, userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("referai_token", token);
  localStorage.setItem("referai_user_id", userId);
  // Set cookie so Next.js middleware can check auth server-side
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `referai_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function removeAuthInfo(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("referai_token");
  localStorage.removeItem("referai_user_id");
  document.cookie = "referai_token=; path=/; max-age=0; SameSite=Lax";
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("referai_user_id");
}

// ─── HTTP error class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

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
      // Handle Spring Boot ProblemDetail format
      message = errBody.detail || errBody.message || errBody.title || message;
      console.error("API Error:", { status: res.status, path, errBody });
    } catch {
      // ignore parse errors
      console.error("API Error:", { status: res.status, path, statusText: res.statusText });
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Public API surface ──────────────────────────────────────────────────────

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
