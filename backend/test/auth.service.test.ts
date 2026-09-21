import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AuthService } from "../src/modules/auth/auth.service";
import { UsersService } from "../src/modules/users/users.service";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

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
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    const deps = createMockDependencies();
    usersService = deps.usersService;
    jwtService = deps.jwtService;
    mockUser = deps.mockUser;
    audit = makeAuditRecorder();
    authService = new AuthService(usersService, jwtService, audit.service);
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
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "auth.register");
      equal(audit.entries[0].entityId, mockUser.id);
    });

    it("should refuse self-registration as admin", async () => {
      let created = false;
      (usersService as any).findByEmail = async () => null;
      (usersService as any).create = async () => {
        created = true;
        return mockUser;
      };

      await authService
        .register({
          name: "Attacker",
          email: "attacker@example.com",
          password: "password123",
          role: UserRole.ADMIN as any,
        })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
      equal(created, false);
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
      equal(audit.entries[0].action, "auth.login.blocked");
      equal(audit.entries[0].newValues?.reason, "banned");
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
      equal(audit.entries[0].action, "auth.login.blocked");
      equal(audit.entries[0].newValues?.reason, "locked");
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
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "auth.login.failed");
      equal(audit.entries[0].userId, mockUser.id);
      equal(JSON.stringify(audit.entries[0]).includes("wrong-password"), false);
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
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "auth.login.success");
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