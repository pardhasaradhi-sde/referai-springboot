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
  return localStorage.getItem(USER_ID_STORAGE_KEY);
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
