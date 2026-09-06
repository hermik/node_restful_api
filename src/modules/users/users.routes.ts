import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { publicUserSchema, userParamsSchema } from "./users.schema.js";

export default async function userRoutes(fastify: FastifyInstance) {
  const usersRepository = new UsersRepository(fastify.db);
  const usersService = new UsersService(usersRepository);
  const controller = new UsersController(usersService);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/me",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Users"],
        summary: "Get the currently authenticated user's profile",
        security: [{ bearerAuth: [] }],
        response: { 200: publicUserSchema },
      },
    },
    controller.me,
  );

  app.get(
    "/",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Users"],
        summary: "List all users (requires authentication)",
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(publicUserSchema) },
      },
    },
    controller.list,
  );

  app.get(
    "/:id",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Users"],
        summary: "Get a user by id (requires authentication)",
        security: [{ bearerAuth: [] }],
        params: userParamsSchema,
        response: { 200: publicUserSchema },
      },
    },
    controller.getById,
  );
}
