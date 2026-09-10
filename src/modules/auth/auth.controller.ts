import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./auth.service.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import { UnauthorizedError } from "../../common/errors.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const REFRESH_TOKEN_COOKIE_PATH = "/v1/auth";

export interface AuthCookieOptions {
  refreshTokenTtlDays: number;
  secureCookie: boolean;
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieOptions: AuthCookieOptions,
  ) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const { accessToken, refreshToken, user } = await this.authService.register(request.body as RegisterBody);
    this.setRefreshTokenCookie(reply, refreshToken);
    reply.code(201);
    return { accessToken, user };
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const { accessToken, refreshToken, user } = await this.authService.login(request.body as LoginBody);
    this.setRefreshTokenCookie(reply, refreshToken);
    return { accessToken, user };
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const currentRefreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
    if (!currentRefreshToken) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const { accessToken, refreshToken } = await this.authService.refresh(currentRefreshToken);
    this.setRefreshTokenCookie(reply, refreshToken);
    return { accessToken };
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const currentRefreshToken = request.cookies[REFRESH_TOKEN_COOKIE];
    if (currentRefreshToken) {
      await this.authService.logout(currentRefreshToken);
    }
    reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
    reply.code(204);
  };

  private setRefreshTokenCookie(reply: FastifyReply, refreshToken: string) {
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.cookieOptions.secureCookie,
      sameSite: "lax",
      path: REFRESH_TOKEN_COOKIE_PATH,
      maxAge: this.cookieOptions.refreshTokenTtlDays * 24 * 60 * 60,
    });
  }
}
