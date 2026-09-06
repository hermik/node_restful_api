import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { env } from "../../config/env.js";
import { UsersRepository } from "../users/users.repository.js";
import { RefreshTokensRepository } from "./refresh-tokens.repository.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import {
  authResponseSchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  tokenPairSchema,
} from "./auth.schema.js";

export default async function authRoutes(fastify: FastifyInstance) {
  const usersRepository = new UsersRepository(fastify.db);
  const refreshTokensRepository = new RefreshTokensRepository(fastify.db);
  const authService = new AuthService(
    usersRepository,
    refreshTokensRepository,
    (payload) => fastify.jwt.sign(payload),
    env.REFRESH_TOKEN_TTL_DAYS,
  );
  const controller = new AuthController(authService);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/register",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["Auth"],
        summary: "Register a new user",
        description:
          "Creates a new user account with the given email, password and name, then returns an access + refresh token pair along with the created user.",
        body: registerBodySchema,
        response: { 201: authResponseSchema },
      },
    },
    controller.register,
  );

  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["Auth"],
        summary: "Log in and receive an access + refresh token pair",
        description:
          "Verifies the user's email and password, then issues a new access + refresh token pair on success.",
        body: loginBodySchema,
        response: { 200: authResponseSchema },
      },
    },
    controller.login,
  );

  app.post(
    "/refresh",
    {
      schema: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a new access + refresh token pair (rotation)",
        description:
          "Validates the given refresh token, revokes it, and issues a new access + refresh token pair. Used to keep a session alive without re-authenticating.",
        body: refreshBodySchema,
        response: { 200: tokenPairSchema },
      },
    },
    controller.refresh,
  );

  app.post(
    "/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Revoke a refresh token",
        description: "Invalidates the given refresh token so it can no longer be used to obtain new tokens.",
        body: logoutBodySchema,
      },
    },
    controller.logout,
  );
}
