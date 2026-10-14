/** Khớp `backend/src/common/validators/is-strong-password.ts` (máy chủ kiểm tra lại). */
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_RULES: ReadonlyArray<{ id: string; label: string; test: (value: string) => boolean }> = [
  { id: "length", label: "Ít nhất 8 ký tự", test: (value) => value.length >= 8 },
  { id: "upper", label: "1 chữ in hoa", test: (value) => /\p{Lu}/u.test(value) },
  { id: "lower", label: "1 chữ thường", test: (value) => /\p{Ll}/u.test(value) },
  { id: "digit", label: "1 chữ số", test: (value) => /\d/.test(value) },
  { id: "symbol", label: "1 ký tự đặc biệt (vd. @ # !)", test: (value) => /[^\p{L}\p{N}\s]/u.test(value) },
];

export function isStrongPassword(value: string): boolean {
  return value.length <= PASSWORD_MAX_LENGTH && PASSWORD_RULES.every((rule) => rule.test(value));
}

/** Thông báo lỗi khi gửi form với mật khẩu chưa đạt. */
export function passwordPolicyError(value: string): string | null {
  if (value.length > PASSWORD_MAX_LENGTH) return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label.toLowerCase());
  return unmet.length ? `Mật khẩu cần có ${unmet.join(", ")}.` : null;
}
