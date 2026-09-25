export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "campaign_owner" | "admin";
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code: string = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const AUTH_EVENT = "gopmam:auth";

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Trình duyệt gọi `NEXT_PUBLIC_API_URL` (có thể là đường dẫn tương đối
 * `/api/v1` sau Nginx). Server component (SSR) không phân giải được URL tương
 * đối nên dùng `API_INTERNAL_URL` (vd. `http://backend:4000/api/v1` trong
 * Docker) nếu có.
 */
function apiBaseUrl(): string {
  if (!isBrowser() && process.env.API_INTERNAL_URL) {
    return process.env.API_INTERNAL_URL;
  }
  return PUBLIC_API_URL;
}

const ACCESS_TOKEN_KEY = "gopmam.accessToken";
const REFRESH_TOKEN_KEY = "gopmam.refreshToken";
const USER_KEY = "gopmam.user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStorage(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

function clearStorage(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

function emitAuthChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function getStoredUser(): AuthUser | null {
  const raw = readStorage(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return Boolean(readStorage(ACCESS_TOKEN_KEY));
}

export function saveSession(session: AuthSession): void {
  writeStorage(ACCESS_TOKEN_KEY, session.accessToken);
  writeStorage(REFRESH_TOKEN_KEY, session.refreshToken);
  writeStorage(USER_KEY, JSON.stringify(session.user));
  emitAuthChange();
}

export function updateStoredUser(user: AuthUser): void {
  writeStorage(USER_KEY, JSON.stringify(user));
  emitAuthChange();
}

export function clearSession(): void {
  clearStorage(ACCESS_TOKEN_KEY);
  clearStorage(REFRESH_TOKEN_KEY);
  clearStorage(USER_KEY);
  emitAuthChange();
}

type ErrorPayload = {
  message?: string | string[];
  code?: string;
};

function getErrorMessage(payload: ErrorPayload | null, fallback: string): string {
  if (!payload) return fallback;
  const message = payload.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.length > 0) return message.join(" ");
  return fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = readStorage(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const payload = (await parseBody(response)) as { accessToken: string; refreshToken: string };
    writeStorage(ACCESS_TOKEN_KEY, payload.accessToken);
    writeStorage(REFRESH_TOKEN_KEY, payload.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  withAuth = true,
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = readStorage(ACCESS_TOKEN_KEY);
  if (withAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, { ...options, headers });

  if (response.status === 401 && withAuth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, options, true, false);
    }
    clearSession();
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    const errorPayload = (payload ?? null) as ErrorPayload | null;
    throw new ApiError(
      response.status,
      getErrorMessage(errorPayload, `Yêu cầu thất bại (HTTP ${response.status})`),
      errorPayload?.code ?? "request_failed",
    );
  }

  return (payload ?? undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

type LoginResponse = AuthSession;

export async function loginRequest(email: string, password: string): Promise<AuthSession> {
  const session = await api.post<LoginResponse>("/auth/login", { email, password });
  saveSession(session);
  return session;
}

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role?: AuthUser["role"];
};

export async function registerRequest(payload: RegisterPayload): Promise<AuthSession> {
  const session = await api.post<LoginResponse>("/auth/register", payload);
  saveSession(session);
  return session;
}

export function logoutRequest(): void {
  clearSession();
}