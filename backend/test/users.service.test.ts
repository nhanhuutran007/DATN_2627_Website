import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { UsersService } from "../src/modules/users/users.service";
import { UserRole } from "../src/modules/users/entities/user.entity";

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

  beforeEach(() => {
    const { repo, mockUser } = createMockRepo();
    userRepo = repo;
    usersService = new UsersService(repo);
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

      const result = await usersService.update("123", { name: "New Name" } as any);
      equal(result.name, "New Name");
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOneBy = async () => null;

      await usersService
        .update("missing", { name: "New" } as any)
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

      const result = await usersService.updateRole("123", { role: UserRole.ADMIN });
      equal(result.role, UserRole.ADMIN);
    });
  });

  describe("remove", () => {
    it("should remove a user", async () => {
      userRepo.findOneBy = async () => ({
        id: "123",
      });
      userRepo.remove = async () => undefined;

      await usersService.remove("123");
      ok(true);
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOneBy = async () => null;

      await usersService
        .remove("missing")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });
});
