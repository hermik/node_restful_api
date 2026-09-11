import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { PostsRepository } from "./posts.repository.js";
import { PostsService } from "./posts.service.js";
import { PostsController } from "./posts.controller.js";
import {
  createPostBodySchema,
  postParamsSchema,
  postResponseSchema,
  updatePostBodySchema,
} from "./posts.schema.js";

export default async function postRoutes(fastify: FastifyInstance) {
  const postsRepository = new PostsRepository(fastify.db);
  const postsService = new PostsService(postsRepository);
  const controller = new PostsController(postsService);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      schema: {
        tags: ["Posts"],
        summary: "List published posts (public)",
        response: { 200: z.array(postResponseSchema) },
      },
    },
    controller.list,
  );

  app.get(
    "/:id",
    {
      schema: {
        tags: ["Posts"],
        summary: "Get a published post by id (public)",
        params: postParamsSchema,
        response: { 200: postResponseSchema },
      },
    },
    controller.getById,
  );

  app.get(
    "/filter",
    {
      schema: {
        tags: ["Posts"],
        summary: "Filter posts by title (public)",
        querystring: z.object({ query: z.string() }),
        response: { 200: z.array(postResponseSchema) },
      },
    },
    controller.filterTitle,
  );

  app.post(
    "/",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Create a post (requires authentication)",
        security: [{ bearerAuth: [] }],
        body: createPostBodySchema,
        response: { 201: postResponseSchema },
      },
    },
    controller.create,
  );

  app.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Update own post (requires authentication)",
        security: [{ bearerAuth: [] }],
        params: postParamsSchema,
        body: updatePostBodySchema,
        response: { 200: postResponseSchema },
      },
    },
    controller.update,
  );

  app.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ["Posts"],
        summary: "Delete own post (requires authentication)",
        security: [{ bearerAuth: [] }],
        params: postParamsSchema,
      },
    },
    controller.remove,
  );
}
