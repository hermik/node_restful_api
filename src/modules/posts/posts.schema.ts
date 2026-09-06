import { z } from "zod";

export const postResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  published: z.boolean(),
  authorId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const postParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createPostBodySchema = z.object({
  title: z.string().min(3).max(255),
  content: z.string().min(1),
  published: z.boolean().default(false),
});

export const updatePostBodySchema = createPostBodySchema.partial();

export type CreatePostBody = z.infer<typeof createPostBodySchema>;
export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;
