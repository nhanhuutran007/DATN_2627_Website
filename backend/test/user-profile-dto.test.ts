import "reflect-metadata";

import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { UpdateUserDto } from "../src/modules/users/dto/user.dto";

/** Giống ValidationPipe toàn cục: transform rồi validate, trả tên các trường lỗi. */
async function invalidFields(body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdateUserDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.map((error) => error.property).sort();
}

describe("UpdateUserDto", () => {
  it("chấp nhận hồ sơ hợp lệ và cắt khoảng trắng", async () => {
    const dto = plainToInstance(UpdateUserDto, {
      name: "  Nguyễn Văn A  ",
      bio: "Tình nguyện viên giáo dục",
      phone: "+84 912-345-678",
      organization: "CLB Gieo Chữ",
      avatar: "/api/v1/media/avatars/123e4567-e89b-12d3-a456-426614174000.webp",
    });
    deepEqual(await validate(dto), []);
    equal(dto.name, "Nguyễn Văn A");
  });

  it("cho phép xóa số điện thoại và ảnh đại diện bằng chuỗi rỗng", async () => {
    deepEqual(await invalidFields({ phone: "", avatar: "" }), []);
  });

  it("từ chối ảnh đại diện không phải link http(s) hay ảnh hệ thống", async () => {
    deepEqual(await invalidFields({ avatar: "javascript:alert(1)" }), ["avatar"]);
    deepEqual(await invalidFields({ avatar: "/api/v1/media/other/x.png" }), ["avatar"]);
  });

  it("từ chối dữ liệu vượt độ dài cột hoặc sai định dạng", async () => {
    deepEqual(
      await invalidFields({ name: "A", bio: "x".repeat(501), phone: "abc", organization: "y".repeat(256) }),
      ["bio", "name", "organization", "phone"],
    );
  });

  it("không cho tự sửa email, vai trò hay trạng thái qua hồ sơ", async () => {
    deepEqual(
      await invalidFields({ email: "new@example.com", role: "admin", status: "active" }),
      ["email", "role", "status"],
    );
  });
});
