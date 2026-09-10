import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import errorHandlerPlugin from "../../plugins/error-handler.js";
import testRoutes from "./test.routes.js";
import { MAX_DELAY_MS } from "./test.schema.js";

async function buildTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(testRoutes);
  await app.ready();
  return app;
}

describe("GET /delay/:delay", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("waits for the requested number of milliseconds", async () => {
    const start = Date.now();
    const response = await app.inject({ method: "GET", url: "/delay/30" });
    const elapsed = Date.now() - start;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ delayMs: 30 });
    expect(elapsed).toBeGreaterThanOrEqual(25);
  });

  it("returns a random delay within the allowed range", async () => {
    jest.useFakeTimers();
    try {
      const injectPromise = app.inject({ method: "GET", url: "/delay/random" });

      await jest.advanceTimersByTimeAsync(MAX_DELAY_MS);
      const response = await injectPromise;

      expect(response.statusCode).toBe(200);
      const { delayMs } = response.json();
      expect(delayMs).toBeGreaterThanOrEqual(0);
      expect(delayMs).toBeLessThanOrEqual(MAX_DELAY_MS);
    } finally {
      jest.useRealTimers();
    }
  });

  it("rejects a value that is neither a number nor \"random\"", async () => {
    const response = await app.inject({ method: "GET", url: "/delay/soon" });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it("clamps an excessive delay to the configured maximum", async () => {
    jest.useFakeTimers();
    try {
      const injectPromise = app.inject({ method: "GET", url: "/delay/999999999" });

      await jest.advanceTimersByTimeAsync(MAX_DELAY_MS);
      const response = await injectPromise;

      expect(response.json()).toEqual({ delayMs: MAX_DELAY_MS });
    } finally {
      jest.useRealTimers();
    }
  });
});
