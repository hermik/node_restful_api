import type { FastifyRequest, FastifyReply } from "fastify";
import type { UsersService } from "./users.service.js";
import type { userParamsSchema } from "./users.schema.js";
import type { z } from "zod";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  me = async (request: FastifyRequest, _reply: FastifyReply) => {
    return this.usersService.getById(request.user.id);
  };

  list = async (_request: FastifyRequest, _reply: FastifyReply) => {
    return this.usersService.list();
  };

  getById = async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as z.infer<typeof userParamsSchema>;
    return this.usersService.getById(id);
  };
}
