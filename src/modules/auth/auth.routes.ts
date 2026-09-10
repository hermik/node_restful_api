import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { env } from "../../config/env.js";
import { UsersRepository } from "../users/users.repository.js";
import { RefreshTokensRepository } from "./refresh-tokens.repository.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { accessTokenSchema, authResponseSchema, loginBodySchema, registerBodySchema } from "./auth.schema.js";

export default async function authRoutes(fastify: FastifyInstance) {
  const usersRepository = new UsersRepository(fastify.db);
  const refreshTokensRepository = new RefreshTokensRepository(fastify.db);
  const authService = new AuthService(
    usersRepository,
    refreshTokensRepository,
    (payload) => fastify.jwt.sign(payload),
    env.REFRESH_TOKEN_TTL_DAYS,
  );
  const controller = new AuthController(authService, {
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    secureCookie: env.NODE_ENV === "production",
  });

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
          "Creates a new user account with the given email, password and name. Returns the access token " +
          "and user in the response body, and sets the refresh token as an httpOnly cookie.",
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
        summary: "Log in and receive an access token",
        description:
          "Verifies the user's email and password. Returns the access token and user in the response body, " +
          "and sets the refresh token as an httpOnly cookie.",
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
        summary: "Exchange the refresh token cookie for a new access token (rotation)",
        description:
          "Reads the refresh token from the httpOnly cookie, rotates it (revokes the old one and sets a new " +
          "one as a cookie), and returns a new access token in the response body.",
        response: { 200: accessTokenSchema },
      },
    },
    controller.refresh,
  );

  app.post(
    "/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log out",
        description: "Revokes the refresh token from the httpOnly cookie, if present, and clears the cookie.",
      },
    },
    controller.logout,
  );
}
