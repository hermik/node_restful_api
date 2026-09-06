import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import bcrypt from "bcryptjs";
import { AuthService } from "./auth.service.js";
import { ConflictError, UnauthorizedError } from "../../common/errors.js";
import type { UsersRepository } from "../users/users.repository.js";
import type { RefreshTokensRepository } from "./refresh-tokens.repository.js";
import type { RefreshToken, User } from "../../db/schema.js";

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "jane@example.com",
    passwordHash: "",
    name: "Jane",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createRefreshTokenRecord(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: "rt-1",
    userId: "user-1",
    tokenHash: "hash",
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("AuthService", () => {
  let usersRepository: {
    findByEmail: jest.MockedFunction<(email: string) => Promise<User | undefined>>;
    findById: jest.MockedFunction<(id: string) => Promise<User | undefined>>;
    create: jest.MockedFunction<
      (user: Omit<User, "id" | "createdAt" | "updatedAt">) => Promise<User>
    >;
  };
  let refreshTokensRepository: {
    create: jest.MockedFunction<
      (token: Omit<RefreshToken, "id" | "createdAt">) => Promise<RefreshToken>
    >;
    findByHash: jest.MockedFunction<(hash: string) => Promise<RefreshToken | undefined>>;
    revoke: jest.MockedFunction<(id: string) => Promise<void>>;
  };
  type SignAccessToken = ConstructorParameters<typeof AuthService>[2];
  let signAccessToken: jest.MockedFunction<SignAccessToken>;
  let service: AuthService;

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    refreshTokensRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revoke: jest.fn(),
    };
    signAccessToken = jest
      .fn<SignAccessToken>()
      .mockReturnValue("signed.jwt.token");

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      refreshTokensRepository as unknown as RefreshTokensRepository,
      signAccessToken,
      30,
    );
  });

  describe("register", () => {
    it("creates a new user and returns a token pair", async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);
      const created = createUser();
      usersRepository.create.mockResolvedValue(created);
      refreshTokensRepository.create.mockResolvedValue(createRefreshTokenRecord());

      const result = await service.register({
        email: created.email,
        password: "password123",
        name: created.name,
      });

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: created.email, name: created.name }),
      );
      expect(result.user).toEqual({
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        createdAt: created.createdAt,
      });
      expect(result.accessToken).toBe("signed.jwt.token");
      expect(typeof result.refreshToken).toBe("string");
      expect(signAccessToken).toHaveBeenCalledWith({ id: created.id, email: created.email, role: created.role });
    });

    it("throws ConflictError when the email is already registered", async () => {
      usersRepository.findByEmail.mockResolvedValue(createUser());

      await expect(
        service.register({ email: "jane@example.com", password: "password123", name: "Jane" }),
      ).rejects.toThrow(ConflictError);
      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns a token pair for valid credentials", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 10);
      const user = createUser({ passwordHash });
      usersRepository.findByEmail.mockResolvedValue(user);
      refreshTokensRepository.create.mockResolvedValue(createRefreshTokenRecord());

      const result = await service.login({ email: user.email, password: "correct-password" });

      expect(result.user.id).toBe(user.id);
      expect(signAccessToken).toHaveBeenCalledWith({ id: user.id, email: user.email, role: user.role });
    });

    it("throws UnauthorizedError when the user does not exist", async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);

      await expect(service.login({ email: "missing@example.com", password: "x" })).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError when the password is wrong", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 10);
      usersRepository.findByEmail.mockResolvedValue(createUser({ passwordHash }));

      await expect(service.login({ email: "jane@example.com", password: "wrong-password" })).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("refresh", () => {
    it("rotates the refresh token and issues a new pair", async () => {
      const user = createUser();
      refreshTokensRepository.findByHash.mockResolvedValue(createRefreshTokenRecord({ userId: user.id }));
      usersRepository.findById.mockResolvedValue(user);
      refreshTokensRepository.create.mockResolvedValue(createRefreshTokenRecord());

      const result = await service.refresh("some-refresh-token");

      expect(refreshTokensRepository.revoke).toHaveBeenCalledWith("rt-1");
      expect(result.accessToken).toBe("signed.jwt.token");
    });

    it("throws UnauthorizedError for an unknown token", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(undefined);

      await expect(service.refresh("unknown")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError for a revoked token", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(createRefreshTokenRecord({ revokedAt: new Date() }));

      await expect(service.refresh("used-token")).rejects.toThrow(UnauthorizedError);
      expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it("throws UnauthorizedError for an expired token", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(
        createRefreshTokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refresh("expired-token")).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("logout", () => {
    it("revokes an active refresh token", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(createRefreshTokenRecord());

      await service.logout("some-token");

      expect(refreshTokensRepository.revoke).toHaveBeenCalledWith("rt-1");
    });

    it("does nothing when the token is unknown", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(undefined);

      await service.logout("unknown-token");

      expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it("does nothing when the token was already revoked", async () => {
      refreshTokensRepository.findByHash.mockResolvedValue(createRefreshTokenRecord({ revokedAt: new Date() }));

      await service.logout("already-revoked-token");

      expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
