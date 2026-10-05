import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { Repository } from "typeorm";

import { AuthService, issuedBeforeSessionCutoff } from "../src/modules/auth/auth.service";
import { RevokedToken } from "../src/modules/auth/entities/revoked-token.entity";
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
    aiTrackingConsent: false,
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

/** Bảng `revoked_tokens` giả: lưu theo `jti`, `delete` bỏ các dòng đã quá hạn. */
function makeRevokedTokenRepo() {
  const rows = new Map<string, RevokedToken>();
  const repo = {
    existsBy: async ({ jti }: { jti: string }) => rows.has(jti),
    save: async (entries: RevokedToken[]) => {
      for (const entry of entries) rows.set(entry.jti, entry);
      return entries;
    },
    delete: async () => {
      for (const [jti, row] of rows) {
        if (row.expiresAt.getTime() < Date.now()) rows.delete(jti);
      }
      return { affected: 0 };
    },
  } as unknown as Repository<RevokedToken>;
  return { rows, repo };
}

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: any;
  let mockUser: Partial<User>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let revoked: ReturnType<typeof makeRevokedTokenRepo>;

  beforeEach(() => {
    const deps = createMockDependencies();
    usersService = deps.usersService;
    jwtService = deps.jwtService;
    mockUser = deps.mockUser;
    audit = makeAuditRecorder();
    revoked = makeRevokedTokenRepo();
    authService = new AuthService(usersService, jwtService, audit.service, revoked.repo);
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

  describe("logout", () => {
    const NOW_SECONDS = Math.floor(Date.now() / 1000);

    function claims(overrides: Record<string, unknown> = {}) {
      return { sub: mockUser.id, jti: "access-jti", iat: NOW_SECONDS, exp: NOW_SECONDS + 900, ...overrides };
    }

    it("thu hồi access token đang dùng và refresh token đi kèm, ghi audit", async () => {
      jwtService.decode = () => claims();
      jwtService.verify = () => claims({ jti: "refresh-jti", exp: NOW_SECONDS + 7 * 86_400 });

      await authService.logout(mockUser as User, "access-token", "refresh-token");

      deepEqual([...revoked.rows.keys()].sort(), ["access-jti", "refresh-jti"]);
      equal(revoked.rows.get("access-jti")?.expiresAt.getTime(), (NOW_SECONDS + 900) * 1000);
      equal(audit.entries.at(-1)?.action, "auth.logout");
      deepEqual(audit.entries.at(-1)?.newValues, { revokedTokens: 2 });
    });

    it("không thu hồi refresh token của người khác", async () => {
      jwtService.decode = () => claims();
      jwtService.verify = () => claims({ sub: "someone-else", jti: "foreign-jti" });

      await authService.logout(mockUser as User, "access-token", "foreign-refresh-token");

      deepEqual([...revoked.rows.keys()], ["access-jti"]);
    });

    it("bỏ qua refresh token sai chữ ký/hết hạn thay vì báo lỗi", async () => {
      jwtService.decode = () => claims();
      jwtService.verify = () => {
        throw new Error("jwt expired");
      };

      await authService.logout(mockUser as User, "access-token", "expired-refresh-token");

      deepEqual([...revoked.rows.keys()], ["access-jti"]);
    });

    it("token cũ không có jti thì không ghi gì nhưng vẫn đăng xuất được", async () => {
      jwtService.decode = () => claims({ jti: undefined });

      await authService.logout(mockUser as User, "legacy-token");

      equal(revoked.rows.size, 0);
      equal(audit.entries.at(-1)?.action, "auth.logout");
    });

    it("token đã thu hồi bị từ chối ở guard và khi refresh", async () => {
      jwtService.decode = () => claims();
      jwtService.verify = () => claims({ jti: "refresh-jti" });
      await authService.logout(mockUser as User, "access-token", "refresh-token");

      await rejects(authService.validateUser(mockUser.id!, NOW_SECONDS, "access-jti"), { status: 401 });
      await rejects(authService.refreshTokens("refresh-token"), { status: 401 });

      const stillValid = await authService.validateUser(mockUser.id!, NOW_SECONDS, "other-session-jti");
      equal(stillValid.id, mockUser.id);
    });

    it("mỗi token phát hành có jti riêng", async () => {
      const signed: Array<{ jti?: string }> = [];
      jwtService.sign = (payload: { jti?: string }) => {
        signed.push(payload);
        return "token";
      };

      await authService.refreshTokens("valid-refresh-token");

      equal(signed.length, 2);
      ok(signed[0].jti && signed[1].jti);
      ok(signed[0].jti !== signed[1].jti);
    });
  });

  describe("logoutAll", () => {
    it("đặt mốc thu hồi phiên và ghi audit", async () => {
      const revokedAt = new Date("2026-10-05T03:00:00Z");
      let calledWith: Partial<User> | undefined;
      (usersService as any).revokeAllSessions = async (user: Partial<User>) => {
        calledWith = user;
        return revokedAt;
      };

      await authService.logoutAll(mockUser as User);

      equal(calledWith?.id, mockUser.id);
      equal(audit.entries.at(-1)?.action, "auth.logout_all");
      deepEqual(audit.entries.at(-1)?.newValues, { sessionsRevokedAt: revokedAt.toISOString() });
    });

    it("token phát hành trước mốc bị từ chối, token mới hơn vẫn dùng được", async () => {
      const revokedAt = new Date("2026-10-05T03:00:00Z");
      const cutoff = Math.floor(revokedAt.getTime() / 1000);
      (usersService as any).findById = async () => ({ ...mockUser, sessionsRevokedAt: revokedAt });

      await rejects(authService.validateUser(mockUser.id!, cutoff - 1), { status: 401 });
      const user = await authService.validateUser(mockUser.id!, cutoff + 1);
      equal(user.id, mockUser.id);
    });
  });
});

describe("issuedBeforeSessionCutoff", () => {
  const at = new Date("2026-10-05T03:00:00Z");
  const seconds = Math.floor(at.getTime() / 1000);

  it("không có mốc nào thì token còn hiệu lực", () => {
    equal(issuedBeforeSessionCutoff({} as User, seconds), false);
  });

  it("áp dụng cả mốc đổi mật khẩu lẫn mốc đăng xuất mọi thiết bị", () => {
    equal(issuedBeforeSessionCutoff({ passwordChangedAt: at } as User, seconds - 1), true);
    equal(issuedBeforeSessionCutoff({ sessionsRevokedAt: at } as User, seconds - 1), true);
    equal(issuedBeforeSessionCutoff({ sessionsRevokedAt: at } as User, seconds), false);
    equal(issuedBeforeSessionCutoff({ sessionsRevokedAt: at } as User, undefined), true);
  });
});
