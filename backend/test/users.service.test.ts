import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  LOGIN_LOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
  UsersService,
} from "../src/modules/users/users.service";
import { UserRole } from "../src/modules/users/entities/user.entity";
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
    it("should update user role", async () => {
      userRepo.findOneBy = async () => ({
        id: "123",
        name: "Old",
        email: "test@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
      });
      userRepo.save = async (u: any) => u;

      const result = await usersService.updateRole("123", { role: UserRole.ADMIN }, makeAdmin());
      equal(result.role, UserRole.ADMIN);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.role.update");
      equal(audit.entries[0].oldValues?.role, UserRole.USER);
      equal(audit.entries[0].newValues?.role, UserRole.ADMIN);
    });
  });

  describe("remove", () => {
    it("should remove a user", async () => {
      userRepo.findOneBy = async () => ({
        id: "123",
        email: "test@example.com",
        role: UserRole.USER,
      });
      userRepo.remove = async () => undefined;

      await usersService.remove("123", makeAdmin());
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.delete");
      equal(audit.entries[0].entityId, "123");
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
});
