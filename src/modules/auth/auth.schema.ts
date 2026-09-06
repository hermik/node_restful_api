import { z } from "zod";
import { publicUserSchema } from "../users/users.schema.js";

export const registerBodySchema = z.object({
  email: z.string().email().describe("User's email address, used as the login identifier"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .describe("Plain-text password, at least 8 characters"),
  name: z.string().min(2).max(120).describe("Display name of the user"),
});

export const loginBodySchema = z.object({
  email: z.string().email().describe("User's email address"),
  password: z.string().min(1, "Password is required").describe("User's password"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required").describe("Valid refresh token previously issued to the client"),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required").describe("Refresh token to revoke"),
});

export const tokenPairSchema = z.object({
  accessToken: z.string().describe("Short-lived JWT used to authorize API requests"),
  refreshToken: z.string().describe("Long-lived token used to obtain a new access token"),
});

export const authResponseSchema = tokenPairSchema.extend({
  user: publicUserSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
