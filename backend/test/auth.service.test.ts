import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AuthService } from "../src/modules/auth/auth.service";
import { UsersService } from "../src/modules/users/users.service";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";

const VALID_PASSWORD = "password123";
const VALID_HASH = "$2b$10$Qq7wrSzkoXP2uWmxSBVvzuJbKTjEfr1dTt.Z7PsuSGVGvxkpbxKJm";

function createMockDependencies() {
  const mockUser: Partial<User> = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test User",
    email: "test@example.com",
    passwordHash: VALID_HASH,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    failedLoginCount: 0,
    lockedUntil: null,
  };

  const recordLoginFailure = async (user: Partial<User>): Promise<Partial<User>> => user;
  const recordLoginSuccess = async (user: Partial<User>): Promise<Partial<User>> => user;

  const usersService = {
    create: async () => mockUser,
    findByEmail: async () => mockUser,
    findById: async () => mockUser,
    recordLoginFailure,
    recordLoginSuccess,
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

    it("should throw ForbiddenException when account is banned", async () => {
      (usersService as any).findByEmail = async () => ({
        ...mockUser,
        status: UserStatus.BANNED,
      });

      await authService
        .login({ email: "test@example.com", password: VALID_PASSWORD })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });

    it("should throw ForbiddenException when account is locked", async () => {
      (usersService as any).findByEmail = async () => ({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await authService
        .login({ email: "test@example.com", password: VALID_PASSWORD })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });

    it("should record a failure and throw on wrong password", async () => {
      let failedCalled = false;
      (usersService as any).recordLoginFailure = async (user: Partial<User>) => {
        failedCalled = true;
        return user;
      };

      await authService
        .login({ email: "test@example.com", password: "wrong-password" })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 401);
          ok(failedCalled, "recordLoginFailure should have been called");
        });
    });

    it("should record success and return tokens on valid credentials", async () => {
      let successCalled = false;
      (usersService as any).recordLoginSuccess = async (user: Partial<User>) => {
        successCalled = true;
        return user;
      };

      const result = await authService.login({
        email: "test@example.com",
        password: VALID_PASSWORD,
      });

      ok(result.accessToken);
      ok(successCalled, "recordLoginSuccess should have been called");
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

    it("should throw ForbiddenException when account is banned", async () => {
      (jwtService as any).verify = () => ({
        sub: mockUser.id,
        email: mockUser.email,
      });
      (usersService as any).findById = async () => ({
        ...mockUser,
        status: UserStatus.BANNED,
      });

      await authService
        .refreshTokens("valid-refresh-token")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });
});