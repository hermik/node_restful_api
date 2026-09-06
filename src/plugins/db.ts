import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { db, queryClient } from "../db/client.js";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
  }
}

export default fp(async function dbPlugin(fastify: FastifyInstance) {
  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await queryClient.end();
  });
});
