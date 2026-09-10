import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { delayParamSchema, delayResponseSchema, MAX_DELAY_MS, type DelayParams } from "./test.schema.js";

export default async function testRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/delay/:delay",
    {
      schema: {
        tags: ["Test"],
        summary: "Wait for a fixed or random delay before responding",
        description:
          `Simulates a slow response, useful for testing loading states and timeouts locally. ` +
          `Pass a number of milliseconds (e.g. "/delay/1000") or the literal "random" for a random delay. ` +
          `Delays are capped at ${MAX_DELAY_MS}ms regardless of what is requested.`,
        params: delayParamSchema,
        response: { 200: delayResponseSchema },
      },
    },
    async (request) => {
      const { delay } = request.params as DelayParams;
      const requestedMs = delay === "random" ? Math.floor(Math.random() * MAX_DELAY_MS) : Number(delay);
      const delayMs = Math.min(requestedMs, MAX_DELAY_MS);

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return { delayMs };
    },
  );
}
