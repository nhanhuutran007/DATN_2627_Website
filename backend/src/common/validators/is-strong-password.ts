import { ValidateBy, type ValidationOptions } from "class-validator";

/** bcrypt chỉ dùng 72 byte đầu nên giới hạn độ dài để tránh hiểu nhầm. */
export const PASSWORD_MAX_LENGTH = 72;

/** Chính sách mật khẩu dùng chung cho đăng ký, đặt lại và đổi mật khẩu (khớp danh sách ở frontend). */
export const PASSWORD_RULES: ReadonlyArray<{ id: string; message: string; test: (value: string) => boolean }> = [
  { id: "length", message: "ít nhất 8 ký tự", test: (value) => value.length >= 8 },
  { id: "upper", message: "1 chữ in hoa", test: (value) => /\p{Lu}/u.test(value) },
  { id: "lower", message: "1 chữ thường", test: (value) => /\p{Ll}/u.test(value) },
  { id: "digit", message: "1 chữ số", test: (value) => /\d/.test(value) },
  { id: "symbol", message: "1 ký tự đặc biệt", test: (value) => /[^\p{L}\p{N}\s]/u.test(value) },
];

/** Các quy tắc mật khẩu chưa đạt (rỗng = hợp lệ). */
export function unmetPasswordRules(value: unknown): string[] {
  if (typeof value !== "string") return PASSWORD_RULES.map((rule) => rule.message);
  return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.message);
}

/** Mật khẩu đủ mạnh theo `PASSWORD_RULES` và không quá 72 ký tự. */
export function IsStrongPassword(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: "isStrongPassword",
      validator: {
        validate: (value) =>
          typeof value === "string" && value.length <= PASSWORD_MAX_LENGTH && unmetPasswordRules(value).length === 0,
        defaultMessage: (args) => {
          const value = args?.value;
          if (typeof value === "string" && value.length > PASSWORD_MAX_LENGTH) {
            return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
          }
          return `Mật khẩu cần có ${unmetPasswordRules(value).join(", ")}.`;
        },
      },
    },
    options,
  );
}
