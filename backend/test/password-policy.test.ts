import "reflect-metadata";

import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { unmetPasswordRules } from "../src/common/validators/is-strong-password";
import { ChangePasswordDto, RegisterDto, ResetPasswordDto } from "../src/modules/auth/dto/auth.dto";

async function passwordErrors(dto: object): Promise<string[]> {
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe("Chính sách mật khẩu", () => {
  it("liệt kê đúng các quy tắc chưa đạt", () => {
    deepEqual(unmetPasswordRules("Test@123"), []);
    deepEqual(unmetPasswordRules("Mật@Khẩu9"), []);
    deepEqual(unmetPasswordRules("password"), ["1 chữ in hoa", "1 chữ số", "1 ký tự đặc biệt"]);
    deepEqual(unmetPasswordRules("Ab1!"), ["ít nhất 8 ký tự"]);
    equal(unmetPasswordRules(undefined).length, 5);
  });

  it("đăng ký: từ chối mật khẩu yếu với thông báo tiếng Việt, nhận mật khẩu đủ mạnh", async () => {
    const weak = plainToInstance(RegisterDto, { name: "  An  ", email: "an@example.com", password: "password123" });
    const messages = await passwordErrors(weak);
    ok(messages.some((message) => message === "Mật khẩu cần có 1 chữ in hoa, 1 ký tự đặc biệt."));

    const strong = plainToInstance(RegisterDto, { name: "  An Nguyễn  ", email: "an@example.com", password: "Test@1234" });
    deepEqual(await passwordErrors(strong), []);
    equal(strong.name, "An Nguyễn");
  });

  it("đặt lại và đổi mật khẩu dùng cùng chính sách, tối đa 72 ký tự", async () => {
    const token = "a".repeat(43);
    deepEqual(await passwordErrors(plainToInstance(ResetPasswordDto, { token, newPassword: "Test@1234" })), []);
    ok((await passwordErrors(plainToInstance(ResetPasswordDto, { token, newPassword: "12345678" }))).length > 0);

    const tooLong = `Aa1!${"x".repeat(70)}`;
    deepEqual(await passwordErrors(plainToInstance(ChangePasswordDto, { currentPassword: "old", newPassword: tooLong })), [
      "Mật khẩu tối đa 72 ký tự.",
    ]);
  });
});
