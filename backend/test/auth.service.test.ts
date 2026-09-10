import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AuthService } from "../src/modules/auth/auth.service";
import { UsersService } from "../src/modules/users/users.service";
import { User, UserRole } from "../src/modules/users/entities/user.entity";

function createMockDependencies() {
  const mockUser: Partial<User> = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test User",
    email: "test@example.com",
    passwordHash:
      "$2a$10$8bHjK7RJQVfzGzN4lQ/6Ae3wQe5s9d2K5e1F9J9M3F9Z9kB7Vq8UaG",
    role: UserRole.USER,
  };

  const usersService = {
    create: async () => mockUser,
    findByEmail: async () => mockUser,
    findById: async () => mockUser,
  } as unknown as UsersService;

  const jwtService = {
    sign: () => "mock-token",
    verify: () => ({ sub: mockUser.id, email: mockUser.email }),
  } as any;

  return { mockUser, usersService, jwtService };
}

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: any;
  let mockUser: Partial<User>;

  beforeEach(() => {
    const deps = createMockDependencies();
    usersService = deps.usersService;
    jwtService = deps.jwtService;
    mockUser = deps.mockUser;
    authService = new AuthService(usersService, jwtService);
  });

  describe("register", () => {
    it("should register a new user and return tokens", async () => {
      (usersService as any).findByEmail = async () => null;

      const result = await authService.register({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      ok(result.accessToken);
      equal(result.user.email, mockUser.email);
    });

    it("should throw when email already registered", async () => {
      (usersService as any).findByEmail = async () => mockUser;

      await authService
        .register({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 401);
        });
    });
  });

  describe("login", () => {
    it("should throw UnauthorizedException when user not found", async () => {
      (usersService as any).findByEmail = async () => null;

      await authService
        .login({ email: "wrong@example.com", password: "wrong" })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 401);
        });
    });
  });

  describe("refreshTokens", () => {
    it("should return new tokens when valid refresh token", async () => {
      (jwtService as any).verify = () => ({
        sub: mockUser.id,
        email: mockUser.email,
      });

      const result = await authService.refreshTokens("valid-refresh-token");
      ok(result.accessToken);
      equal(result.user.email, mockUser.email);
    });
  });
});
