import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
});

export const userParamsSchema = z.object({
  id: z.string().uuid(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
