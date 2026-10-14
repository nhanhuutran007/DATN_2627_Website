import { OAuth2Client } from "google-auth-library";

/** Thông tin tối thiểu lấy từ Google ID token đã xác minh. */
export type GoogleProfile = {
  /** Mã tài khoản Google (`sub`), không đổi kể cả khi người dùng đổi email. */
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export interface GoogleIdentityGateway {
  /** Client ID công khai cho nút "Đăng nhập với Google"; null = chưa cấu hình. */
  readonly clientId: string | null;
  /** Xác minh chữ ký, `aud`, `iss`, hạn dùng của ID token; ném lỗi nếu không hợp lệ. */
  verifyIdToken(idToken: string): Promise<GoogleProfile>;
}

export class GoogleIdentityError extends Error {}

/** Xác minh ID token bằng khóa công khai của Google (google-auth-library). */
export class GoogleOAuthIdentityGateway implements GoogleIdentityGateway {
  private readonly client = new OAuth2Client();

  constructor(readonly clientId: string | null) {}

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!this.clientId) {
      throw new GoogleIdentityError("Google sign-in is not configured");
    }
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new GoogleIdentityError("Invalid Google credential");
    }
    if (!payload?.sub || !payload.email) {
      throw new GoogleIdentityError("Invalid Google credential");
    }
    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: (payload.name ?? payload.email.split("@")[0]).trim(),
    };
  }
}

export function createGoogleIdentityGateway(): GoogleIdentityGateway {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
  return new GoogleOAuthIdentityGateway(clientId);
}
