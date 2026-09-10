import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { env } from "./config/env.js";
import dbPlugin from "./plugins/db.js";
import jwtPlugin from "./plugins/jwt.js";
import swaggerPlugin from "./plugins/swagger.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import cookiePlugin from "./plugins/cookie.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import postRoutes from "./modules/posts/posts.routes.js";
import testRoutes from "./modules/test/test.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(sensible);
  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(rateLimitPlugin);
  await app.register(cookiePlugin);
  await app.register(dbPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);

  app.get("/health", { schema: { hide: true } }, async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(userRoutes, { prefix: "/v1/users" });
  await app.register(postRoutes, { prefix: "/v1/posts" });

  if (env.NODE_ENV !== "production") {
    await app.register(testRoutes, { prefix: "/v1/test" });
  }

  return app;
}
