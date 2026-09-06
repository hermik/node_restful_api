import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
import type { LoginBody, LogoutBody, RefreshBody, RegisterBody } from "./auth.schema.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.authService.register(request.body as RegisterBody);
    reply.code(201);
    return result;
  };

  login = async (request: FastifyRequest, _reply: FastifyReply) => {
    return this.authService.login(request.body as LoginBody);
  };

  refresh = async (request: FastifyRequest, _reply: FastifyReply) => {
    const { refreshToken } = request.body as RefreshBody;
    return this.authService.refresh(refreshToken);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as LogoutBody;
    await this.authService.logout(refreshToken);
    reply.code(204);
  };
}
