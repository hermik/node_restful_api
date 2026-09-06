import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import Fastify, { type FastifyInstance } from "fastify";
import rateLimitPlugin from "./rate-limit.js";
import errorHandlerPlugin from "./error-handler.js";

async function buildTestApp() {
  const app = Fastify();
  await app.register(errorHandlerPlugin);
  await app.register(rateLimitPlugin);

  app.get("/unlimited", async () => ({ ok: true }));

  app.get(
    "/limited",
    { config: { rateLimit: { max: 2, timeWindow: "1 minute" } } },
    async () => ({ ok: true }),
  );

  await app.ready();
  return app;
}

describe("rate limiting", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows requests up to the configured limit", async () => {
    const first = await app.inject({ method: "GET", url: "/limited" });
    const second = await app.inject({ method: "GET", url: "/limited" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it("blocks the request that exceeds the limit, using the app's error shape", async () => {
    await app.inject({ method: "GET", url: "/limited" });
    await app.inject({ method: "GET", url: "/limited" });
    const third = await app.inject({ method: "GET", url: "/limited" });

    expect(third.statusCode).toBe(429);
    expect(third.json()).toEqual({
      code: "RATE_LIMIT_EXCEEDED",
      message: expect.stringContaining("Too many requests"),
    });
  });

  it("tracks the limit per client IP, not across all clients", async () => {
    await app.inject({ method: "GET", url: "/limited", remoteAddress: "1.1.1.1" });
    await app.inject({ method: "GET", url: "/limited", remoteAddress: "1.1.1.1" });
    const blockedOnFirstIp = await app.inject({ method: "GET", url: "/limited", remoteAddress: "1.1.1.1" });

    const requestFromOtherIp = await app.inject({ method: "GET", url: "/limited", remoteAddress: "2.2.2.2" });

    expect(blockedOnFirstIp.statusCode).toBe(429);
    expect(requestFromOtherIp.statusCode).toBe(200);
  });

  it("does not let a route-specific limit affect a route without one", async () => {
    await app.inject({ method: "GET", url: "/limited" });
    await app.inject({ method: "GET", url: "/limited" });
    await app.inject({ method: "GET", url: "/limited" }); // this one is already blocked on /limited

    const unlimited = await app.inject({ method: "GET", url: "/unlimited" });

    expect(unlimited.statusCode).toBe(200);
  });
});
