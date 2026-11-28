import { createHmac } from "node:crypto";

export type IdentityKind = "email" | "google" | "phone" | "bank";

/**
 * Chuẩn hóa định danh trước khi băm để cùng một giá trị luôn ra cùng mã:
 * email chữ thường, số điện thoại/số tài khoản chỉ giữ chữ số (SĐT bỏ tiền tố 84/0).
 */
export function normalizeIdentity(kind: IdentityKind, value: string): string {
  const trimmed = value.trim();
  switch (kind) {
    case "email":
      return trimmed.toLowerCase();
    case "phone": {
      const digits = trimmed.replace(/\D/g, "");
      return digits.replace(/^(84|0)/, "");
    }
    case "bank":
      return trimmed.replace(/\D/g, "");
    default:
      return trimmed;
  }
}

function identitySecret(): string {
  return `${process.env.JWT_ACCESS_SECRET ?? "default-secret"}:identity`;
}

/**
 * Mã băm một chiều (HMAC-SHA256, khóa bí mật của máy chủ) của một định danh: đủ để đối chiếu
 * "có phải cùng email/SĐT/tài khoản ngân hàng không" mà không lưu lại giá trị gốc.
 * Trả null với giá trị rỗng (không băm chuỗi rỗng để tránh khớp nhầm).
 */
export function hashIdentity(kind: IdentityKind, value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeIdentity(kind, value);
  if (!normalized) return null;
  return createHmac("sha256", identitySecret()).update(`${kind}:${normalized}`).digest("hex");
}
