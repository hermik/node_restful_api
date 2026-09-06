import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { UsersService } from "./users.service.js";
import { NotFoundError } from "../../common/errors.js";
import type { UsersRepository } from "./users.repository.js";
import type { User } from "../../db/schema.js";

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "jane@example.com",
    passwordHash: "secret-hash",
    name: "Jane",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("UsersService", () => {
  let usersRepository: { findById: jest.Mock; list: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    usersRepository = { findById: jest.fn(), list: jest.fn() };
    service = new UsersService(usersRepository as unknown as UsersRepository);
  });

  describe("getById", () => {
    it("returns the public shape of the user, without the password hash", async () => {
      const user = createUser();
      usersRepository.findById.mockResolvedValue(user);

      const result = await service.getById(user.id);

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      });
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws NotFoundError when the user does not exist", async () => {
      usersRepository.findById.mockResolvedValue(undefined);

      await expect(service.getById("missing-id")).rejects.toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("maps every user to its public shape", async () => {
      const users = [createUser({ id: "user-1" }), createUser({ id: "user-2", email: "bob@example.com" })];
      usersRepository.list.mockResolvedValue(users);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result.every((user) => !("passwordHash" in user))).toBe(true);
      expect(result.map((user) => user.id)).toEqual(["user-1", "user-2"]);
    });
  });
});
