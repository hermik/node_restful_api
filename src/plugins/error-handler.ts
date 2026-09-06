import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { AppError } from "../common/errors.js";

export default fp(async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.validation,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
    }

    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      code: "INTERNAL_SERVER_ERROR",
      message: statusCode === 500 ? "Internal server error" : error.message,
    });
  });
});
