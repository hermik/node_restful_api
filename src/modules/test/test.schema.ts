import { z } from "zod";

export const MAX_DELAY_MS = 10_000;

export const delayParamSchema = z.object({
  delay: z
    .string()
    .refine((value) => value === "random" || /^\d+$/.test(value), {
      message: `delay must be a non-negative integer (milliseconds) or the literal "random"`,
    })
    .describe(`Delay in milliseconds (e.g. "1000"), or the literal "random". Capped at ${MAX_DELAY_MS}ms.`),
});

export const delayResponseSchema = z.object({
  delayMs: z.number().int().nonnegative().describe("Actual delay applied, in milliseconds"),
});

export type DelayParams = z.infer<typeof delayParamSchema>;
