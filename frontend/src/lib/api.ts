export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "campaign_owner" | "admin";
  /** Thiếu ở phiên đăng nhập cũ (trước khi có xác minh email). */
  emailVerified?: boolean;
  /** Đồng ý ghi nhận hành vi để cá nhân hóa gợi ý AI (mặc định tắt). */
  aiTrackingConsent?: boolean;
  /** false/thiếu = chưa từng chọn → hiển thị lời mời đồng ý. */
  aiConsentDecided?: boolean;
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

/**
 * Ảnh tải lên được lưu dạng đường dẫn tương đối `/api/v1/media/...` (không phụ
 * thuộc tên miền). Sau Nginx/ALB thì API cùng origin với web nên dùng nguyên;
 * khi dev (API ở cổng khác) thì gắn origin của API vào.
 */
export function resolveMediaUrl(url: string): string {
  if (!url.startsWith("/api/v1/")) return url;
  try {
    return new URL(url, new URL(PUBLIC_API_URL).origin).toString();
  } catch {
    return url;
  }
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
  stepUpTokens.clear();
  clearStorage(ACCESS_TOKEN_KEY);
  clearStorage(REFRESH_TOKEN_KEY);
  clearStorage(USER_KEY);
  emitAuthChange();
}

type ErrorPayload = {
  message?: string | string[];
  code?: string;
  /** Với `step_up_required`: thao tác cần mã OTP (vd. `change_password`). */
  purpose?: string;
};

/* ---------- Xác minh bổ sung (mã OTP qua email) cho thao tác nhạy cảm ---------- */

const STEP_UP_REQUIRED = "step_up_required";
const STEP_UP_HEADER = "X-Step-Up-Token";

export type StepUpResult = { stepUpToken: string; expiresInSeconds: number };
/** Mở hộp nhập mã cho `purpose`; trả `null` khi người dùng hủy. */
export type StepUpHandler = (purpose: string) => Promise<StepUpResult | null>;

let stepUpHandler: StepUpHandler | null = null;
/** Step-up token theo mục đích, chỉ giữ trong bộ nhớ tab (không lưu localStorage). */
const stepUpTokens = new Map<string, { token: string; expiresAt: number }>();
const stepUpInFlight = new Map<string, Promise<string | null>>();

/** `StepUpDialog` đăng ký hộp nhập mã; trả hàm hủy đăng ký. */
export function setStepUpHandler(handler: StepUpHandler): () => void {
  stepUpHandler = handler;
  return () => {
    if (stepUpHandler === handler) stepUpHandler = null;
  };
}

export function requestStepUpCode(purpose: string): Promise<{ expiresInMinutes: number }> {
  return api.post<{ expiresInMinutes: number }>("/auth/step-up/request", { purpose });
}

export function verifyStepUpCode(purpose: string, code: string): Promise<StepUpResult> {
  return api.post<StepUpResult>("/auth/step-up/verify", { purpose, code });
}

/**
 * Lấy step-up token cho `purpose`: dùng lại token còn hạn (trừ token vừa bị từ chối),
 * nếu không thì hỏi mã OTP. Các request cùng cần một mục đích chờ chung một hộp thoại.
 */
function obtainStepUpToken(purpose: string, rejectedToken: string | null): Promise<string | null> {
  const cached = stepUpTokens.get(purpose);
  if (cached && cached.token !== rejectedToken && cached.expiresAt > Date.now() + 5_000) {
    return Promise.resolve(cached.token);
  }
  stepUpTokens.delete(purpose);
  const handler = stepUpHandler;
  if (!handler) return Promise.resolve(null);

  let pending = stepUpInFlight.get(purpose);
  if (!pending) {
    pending = handler(purpose)
      .then((result) => {
        if (!result) return null;
        stepUpTokens.set(purpose, {
          token: result.stepUpToken,
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        });
        return result.stepUpToken;
      })
      .finally(() => stepUpInFlight.delete(purpose));
    stepUpInFlight.set(purpose, pending);
  }
  return pending;
}

/** Token để gửi lại request nếu server đòi xác minh bổ sung; `null` = không áp dụng/người dùng hủy. */
function stepUpRetryToken(response: Response, payload: ErrorPayload | null, sent: Headers): Promise<string | null> {
  if (response.status !== 403 || payload?.code !== STEP_UP_REQUIRED || !payload.purpose) {
    return Promise.resolve(null);
  }
  return obtainStepUpToken(payload.purpose, sent.get(STEP_UP_HEADER));
}

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

/**
 * Refresh token chỉ dùng được một lần (server xoay vòng), nên các request cùng gặp 401
 * phải chờ chung một lượt đổi token thay vì mỗi request tự gửi token cũ lên.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= requestNewTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function requestNewTokens(): Promise<boolean> {
  const refreshToken = readStorage(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const ok = await postRefresh(refreshToken);
  // Tab khác vừa đổi token xong (cùng localStorage) → dùng luôn cặp mới của tab đó.
  return ok || readStorage(REFRESH_TOKEN_KEY) !== refreshToken;
}

async function postRefresh(refreshToken: string): Promise<boolean> {
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
  // FormData (upload file): để trình duyệt tự đặt multipart/form-data kèm boundary.
  if (options.body !== undefined && !(options.body instanceof FormData)) {
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
    const stepUpToken = withAuth ? await stepUpRetryToken(response, errorPayload, headers) : null;
    if (stepUpToken) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set(STEP_UP_HEADER, stepUpToken);
      return apiFetch<T>(path, { ...options, headers: retryHeaders }, withAuth, retry);
    }
    throw new ApiError(
      response.status,
      getErrorMessage(errorPayload, `Yêu cầu thất bại (HTTP ${response.status})`),
      errorPayload?.code ?? "request_failed",
    );
  }

  return (payload ?? undefined) as T;
}

/** Tải file (vd. CSV) có xác thực; trả nội dung + tên file từ Content-Disposition. */
export async function apiDownload(
  path: string,
  retry = true,
  stepUpToken?: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const headers = new Headers();
  const accessToken = readStorage(ACCESS_TOKEN_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (stepUpToken) headers.set(STEP_UP_HEADER, stepUpToken);
  const response = await fetch(`${apiBaseUrl()}${path}`, { headers });
  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return apiDownload(path, false, stepUpToken);
  }
  if (!response.ok) {
    const payload = (await parseBody(response)) as ErrorPayload | null;
    const retryToken = await stepUpRetryToken(response, payload, headers);
    if (retryToken) return apiDownload(path, retry, retryToken);
    throw new ApiError(response.status, getErrorMessage(payload, `Tải file thất bại (HTTP ${response.status})`));
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  return { blob: await response.blob(), filename: match ? match[1] : null };
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

/** Đăng nhập bằng Google ID token (Google Identity Services). */
export async function googleLoginRequest(credential: string): Promise<AuthSession> {
  const session = await api.post<LoginResponse>("/auth/google", { credential });
  saveSession(session);
  return session;
}

export type AuthProviders = { googleClientId: string | null };

/** Phương thức đăng nhập máy chủ đang bật (null = chưa cấu hình Google). */
export function fetchAuthProviders(): Promise<AuthProviders> {
  return api.get<AuthProviders>("/auth/providers");
}

/** Bước 1 đăng nhập: email đã có tài khoản chưa (→ mật khẩu hay → đăng ký). */
export function checkEmailRequest(email: string): Promise<{ exists: boolean }> {
  return api.post<{ exists: boolean }>("/auth/check-email", { email });
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

type MessageResponse = { message: string };

/** Gửi link đặt lại mật khẩu; phản hồi giống nhau dù email có tồn tại hay không. */
export async function forgotPasswordRequest(email: string): Promise<string> {
  const response = await apiFetch<MessageResponse>(
    "/auth/forgot-password",
    { method: "POST", body: JSON.stringify({ email }) },
    false,
  );
  return response.message;
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<string> {
  const response = await apiFetch<MessageResponse>(
    "/auth/reset-password",
    { method: "POST", body: JSON.stringify({ token, newPassword }) },
    false,
  );
  // Mật khẩu đã đổi, mọi phiên cũ trên server không còn hợp lệ.
  clearSession();
  return response.message;
}

/**
 * Đổi mật khẩu khi đã đăng nhập. Server vô hiệu mọi token cũ và trả cặp token
 * mới, nên lưu lại ngay để phiên hiện tại tiếp tục.
 */
export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<AuthSession> {
  const session = await api.post<AuthSession>("/auth/change-password", { currentPassword, newPassword });
  saveSession(session);
  return session;
}

/** Xác minh email bằng token trong link; cập nhật phiên hiện tại nếu đúng tài khoản. */
export async function verifyEmailRequest(token: string): Promise<{ message: string; email: string }> {
  const result = await apiFetch<{ message: string; email: string }>(
    "/auth/verify-email",
    { method: "POST", body: JSON.stringify({ token }) },
    false,
  );
  const user = getStoredUser();
  if (user && user.email.toLowerCase() === result.email.toLowerCase()) {
    updateStoredUser({ ...user, emailVerified: true });
  }
  return result;
}

export async function resendVerificationRequest(): Promise<string> {
  const response = await api.post<MessageResponse>("/auth/resend-verification");
  return response.message;
}

/**
 * Đăng xuất: báo server thu hồi access + refresh token của phiên này rồi xóa
 * phiên ở trình duyệt. Server lỗi/mất mạng vẫn xóa phiên cục bộ (token cũ tự
 * hết hạn), không giữ người dùng ở trạng thái đăng nhập.
 */
export async function logoutRequest(): Promise<void> {
  const refreshToken = readStorage(REFRESH_TOKEN_KEY);
  try {
    if (hasSession()) {
      await apiFetch<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      }, true, false);
    }
  } catch {
    // Bỏ qua: phiên cục bộ vẫn bị xóa ở dưới.
  } finally {
    clearSession();
  }
}

/** Đăng xuất khỏi mọi thiết bị (kể cả thiết bị này). */
export async function logoutAllRequest(): Promise<void> {
  await api.post<void>("/auth/logout-all");
  clearSession();
}