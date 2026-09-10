import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AuthController } from "./auth.controller.js";
import { UnauthorizedError } from "../../common/errors.js";
import type { AuthService } from "./auth.service.js";
import type { FastifyReply, FastifyRequest } from "fastify";

function createReply() {
  return {
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
    code: jest.fn(),
  };
}

describe("AuthController", () => {
  let authService: { register: jest.Mock; login: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  let controller: AuthController;
  let reply: ReturnType<typeof createReply>;

  beforeEach(() => {
    authService = { register: jest.fn(), login: jest.fn(), refresh: jest.fn(), logout: jest.fn() };
    controller = new AuthController(authService as unknown as AuthService, {
      refreshTokenTtlDays: 30,
      secureCookie: true,
    });
    reply = createReply();
  });

  describe("register", () => {
    it("sets the refresh token as an httpOnly cookie and returns only the access token and user", async () => {
      authService.register.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { id: "user-1", email: "jane@example.com", name: "Jane", role: "user", createdAt: new Date() },
      });
      const request = { body: { email: "jane@example.com", password: "password123", name: "Jane" } };

      const result = await controller.register(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      );

      expect(reply.setCookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/v1/auth",
          maxAge: 30 * 24 * 60 * 60,
        }),
      );
      expect(reply.code).toHaveBeenCalledWith(201);
      expect(result).toEqual({ accessToken: "access-token", user: expect.objectContaining({ id: "user-1" }) });
      expect(result).not.toHaveProperty("refreshToken");
    });
  });

  describe("login", () => {
    it("sets the refresh token as an httpOnly cookie and returns only the access token and user", async () => {
      authService.login.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { id: "user-1", email: "jane@example.com", name: "Jane", role: "user", createdAt: new Date() },
      });
      const request = { body: { email: "jane@example.com", password: "password123" } };

      const result = await controller.login(request as unknown as FastifyRequest, reply as unknown as FastifyReply);

      expect(reply.setCookie).toHaveBeenCalledWith("refreshToken", "refresh-token", expect.any(Object));
      expect(result).not.toHaveProperty("refreshToken");
    });
  });

  describe("refresh", () => {
    it("reads the refresh token from the cookie and rotates it", async () => {
      authService.refresh.mockResolvedValue({ accessToken: "new-access-token", refreshToken: "new-refresh-token" });
      const request = { cookies: { refreshToken: "old-refresh-token" } };

      const result = await controller.refresh(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      );

      expect(authService.refresh).toHaveBeenCalledWith("old-refresh-token");
      expect(reply.setCookie).toHaveBeenCalledWith("refreshToken", "new-refresh-token", expect.any(Object));
      expect(result).toEqual({ accessToken: "new-access-token" });
    });

    it("throws UnauthorizedError when there is no refresh token cookie", async () => {
      const request = { cookies: {} };

      await expect(
        controller.refresh(request as unknown as FastifyRequest, reply as unknown as FastifyReply),
      ).rejects.toThrow(UnauthorizedError);
      expect(authService.refresh).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("revokes the refresh token and clears the cookie", async () => {
      const request = { cookies: { refreshToken: "some-token" } };

      await controller.logout(request as unknown as FastifyRequest, reply as unknown as FastifyReply);

      expect(authService.logout).toHaveBeenCalledWith("some-token");
      expect(reply.clearCookie).toHaveBeenCalledWith("refreshToken", { path: "/v1/auth" });
      expect(reply.code).toHaveBeenCalledWith(204);
    });

    it("still clears the cookie and succeeds when there is no refresh token cookie", async () => {
      const request = { cookies: {} };

      await controller.logout(request as unknown as FastifyRequest, reply as unknown as FastifyReply);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(reply.clearCookie).toHaveBeenCalled();
      expect(reply.code).toHaveBeenCalledWith(204);
    });
  });
});
