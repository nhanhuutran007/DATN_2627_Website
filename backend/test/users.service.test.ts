import { equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import {
  LOGIN_LOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  USER_HISTORY_REFERENCES,
  UsersService,
} from "../src/modules/users/users.service";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174099";
function makeAdmin() {
  return { id: ADMIN_ID, role: UserRole.ADMIN } as any;
}

function createMockRepo() {
  const mockUser = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hashed-password",
    role: UserRole.USER,
  };

  const repo: any = {
    create: (dto: any) => dto,
    save: async (user: any) => ({ ...mockUser, ...user }),
    find: async () => [mockUser],
    findOneBy: async () => mockUser,
    findOne: async () => mockUser,
    remove: async () => undefined,
  };

  return { repo, mockUser };
}

describe("UsersService", () => {
  let usersService: UsersService;
  let userRepo: any;
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    const { repo, mockUser } = createMockRepo();
    userRepo = repo;
    audit = makeAuditRecorder();
    usersService = new UsersService(repo, audit.service);
  });

  describe("create", () => {
    it("should create a user", async () => {
      const dto = {
        name: "Test User",
        email: "test@example.com",
        passwordHash: "hashed",
        role: UserRole.USER,
      };
      const result = await usersService.create(dto);
      equal(result.email, "test@example.com");
    });
  });

  describe("findById", () => {
    it("should return a user by id", async () => {
      const user = await usersService.findById("123e4567-e89b-12d3-a456-426614174000");
      ok(user);
      equal(user!.id, "123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("getById", () => {
    it("should return the user when it exists", async () => {
      const user = await usersService.getById("123e4567-e89b-12d3-a456-426614174000");
      equal(user.id, "123e4567-e89b-12d3-a456-426614174000");
    });

    it("should throw NotFoundException when the user does not exist", async () => {
      userRepo.findOneBy = async () => null;
      await rejects(usersService.getById("123e4567-e89b-12d3-a456-426614174001"), NotFoundException);
    });
  });

  describe("findByEmail", () => {
    it("should return a user by email", async () => {
      const user = await usersService.findByEmail("test@example.com");
      ok(user);
      equal(user!.email, "test@example.com");
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      userRepo.findOneBy = async () => ({
        id: "123",
        name: "Old",
        email: "test@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
      });
      userRepo.save = async (u: any) => u;

      const result = await usersService.update("123", { name: "New Name" } as any, makeAdmin());
      equal(result.name, "New Name");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.update");
      equal(audit.entries[0].oldValues?.name, "Old");
      equal(audit.entries[0].newValues?.name, "New Name");
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOneBy = async () => null;

      await usersService
        .update("missing", { name: "New" } as any, makeAdmin())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("updateRole", () => {
    const target = () => ({
      id: "123",
      name: "Old",
      email: "test@example.com",
      passwordHash: "hash",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    it("should update user role", async () => {
      userRepo.findOneBy = async () => target();
      userRepo.save = async (u: any) => u;

      const result = await usersService.updateRole("123", { role: UserRole.ADMIN }, makeAdmin());
      equal(result.role, UserRole.ADMIN);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.role.update");
      equal(audit.entries[0].oldValues?.role, UserRole.USER);
      equal(audit.entries[0].newValues?.role, UserRole.ADMIN);
    });

    it("should forbid admins from changing their own role", async () => {
      await rejects(
        usersService.updateRole(ADMIN_ID, { role: UserRole.USER }, makeAdmin()),
        ForbiddenException,
      );
      equal(audit.entries.length, 0);
    });

    it("should not grant admin to a banned account", async () => {
      userRepo.findOneBy = async () => ({ ...target(), status: UserStatus.BANNED });
      await rejects(usersService.updateRole("123", { role: UserRole.ADMIN }, makeAdmin()), ConflictException);
    });

    it("should skip saving and auditing when the role is unchanged", async () => {
      userRepo.findOneBy = async () => target();
      userRepo.save = async () => {
        throw new Error("should not save");
      };
      const result = await usersService.updateRole("123", { role: UserRole.USER }, makeAdmin());
      equal(result.role, UserRole.USER);
      equal(audit.entries.length, 0);
    });
  });

  describe("remove", () => {
    /** Giả lập transaction: `counts` là số bản ghi lịch sử theo "bảng.cột". */
    function withTransaction(counts: Record<string, number> = {}) {
      const calls = { queries: [] as string[], deleted: [] as any[] };
      const manager = {
        query: async (sql: string) => {
          calls.queries.push(sql);
          const match = /FROM `(\w+)` WHERE `(\w+)`/.exec(sql);
          return [{ n: match ? counts[`${match[1]}.${match[2]}`] ?? 0 : 0 }];
        },
        delete: async (_entity: unknown, where: any) => {
          calls.deleted.push(where);
        },
      };
      userRepo.manager = { transaction: async (fn: any) => fn(manager) };
      return calls;
    }

    it("should remove a user without history and clean up side tables", async () => {
      userRepo.findOneBy = async () => ({ id: "123", email: "test@example.com", role: UserRole.USER });
      const calls = withTransaction();

      await usersService.remove("123", makeAdmin());
      equal(calls.queries.filter((sql) => sql.startsWith("SELECT")).length, USER_HISTORY_REFERENCES.length);
      ok(calls.queries.some((sql) => sql.startsWith("DELETE FROM `notifications`")));
      ok(calls.queries.some((sql) => sql.startsWith("DELETE FROM `behavior_events`")));
      equal(calls.deleted[0].id, "123");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.delete");
      equal(audit.entries[0].entityId, "123");
    });

    it("should refuse to delete an account with donations or content", async () => {
      userRepo.findOneBy = async () => ({ id: "123", email: "test@example.com", role: UserRole.USER });
      const calls = withTransaction({ "donations.user_id": 3, "campaign_comments.user_id": 1 });

      await rejects(usersService.remove("123", makeAdmin()), (err: any) => {
        ok(err instanceof ConflictException);
        ok(String(err.message).includes("giao dịch ủng hộ"));
        ok(String(err.message).includes("bình luận"));
        return true;
      });
      equal(calls.deleted.length, 0);
      equal(audit.entries.length, 0);
    });

    it("should refuse to delete self or another admin", async () => {
      await rejects(usersService.remove(ADMIN_ID, makeAdmin()), ForbiddenException);
      userRepo.findOneBy = async () => ({ id: "456", email: "a2@example.com", role: UserRole.ADMIN });
      await rejects(usersService.remove("456", makeAdmin()), ConflictException);
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOneBy = async () => null;

      await usersService
        .remove("missing", makeAdmin())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("recordLoginFailure", () => {
    it("should lock the account after max attempts", async () => {
      userRepo.save = async (u: any) => u;

      let user: any = { id: "123", failedLoginCount: 0, lockedUntil: null as Date | null };

      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i += 1) {
        user = await usersService.recordLoginFailure(user);
      }

      ok(user.lockedUntil instanceof Date);
      const lockMs = new Date(user.lockedUntil).getTime() - Date.now();
      ok(lockMs > (LOGIN_LOCK_MINUTES - 1) * 60_000 * 0.9);
      equal(user.failedLoginCount, 0);
    });

    it("should not lock before max attempts", async () => {
      userRepo.save = async (u: any) => u;

      const user = await usersService.recordLoginFailure({
        id: "123",
        failedLoginCount: 1,
        lockedUntil: null,
      } as any);

      ok(!user.lockedUntil);
      equal(user.failedLoginCount, 2);
    });
  });

  describe("recordLoginSuccess", () => {
    it("should reset failed attempts and lock", async () => {
      userRepo.save = async (u: any) => u;

      const user = await usersService.recordLoginSuccess({
        id: "123",
        failedLoginCount: 3,
        lockedUntil: new Date(Date.now() + 60_000),
      } as any);

      equal(user.failedLoginCount, 0);
      equal(user.lockedUntil, null);
    });

    it("should return the user unchanged when nothing to reset", async () => {
      userRepo.save = async (u: any) => u;

      const base = { id: "123", failedLoginCount: 0, lockedUntil: null };
      const user = await usersService.recordLoginSuccess(base as any);
      equal(user, base);
    });
  });

  describe("updateAiConsent", () => {
    function withManager() {
      const calls: { updates: any[]; deletes: any[] } = { updates: [], deletes: [] };
      const manager = {
        update: async (_entity: unknown, where: any, values: any) => {
          calls.updates.push({ where, values });
        },
        delete: async (_entity: unknown, where: any) => {
          calls.deletes.push(where);
          return { affected: 4 };
        },
      };
      userRepo.manager = { transaction: async (fn: any) => fn(manager) };
      return calls;
    }

    it("should opt in without deleting history and audit the change", async () => {
      const calls = withManager();
      const user = { id: "u1", aiTrackingConsent: false, aiConsentUpdatedAt: null } as any;

      const result = await usersService.updateAiConsent(user, true);

      equal(result.aiTrackingConsent, true);
      equal(result.deletedEventCount, 0);
      ok(result.aiConsentUpdatedAt instanceof Date);
      equal(calls.updates[0].values.aiTrackingConsent, true);
      equal(calls.deletes.length, 0);
      equal(user.aiTrackingConsent, true);
      equal(audit.entries[0].action, "user.ai_consent");
      equal(audit.entries[0].entityId, "u1");
    });

    it("should delete behavior history when consent is withdrawn", async () => {
      const calls = withManager();
      const user = { id: "u1", aiTrackingConsent: true } as any;

      const result = await usersService.updateAiConsent(user, false);

      equal(result.aiTrackingConsent, false);
      equal(result.deletedEventCount, 4);
      equal(calls.deletes[0].userId, "u1");
      equal((audit.entries[0].newValues as any).deletedEventCount, 4);
    });
  });
});
