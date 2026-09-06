import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../../common/errors.js";
import type { UsersRepository } from "../users/users.repository.js";
import type { RefreshTokensRepository } from "./refresh-tokens.repository.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import type { JwtUserPayload } from "../../plugins/jwt.js";

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 40;

type SignAccessToken = (payload: JwtUserPayload) => string;

export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly signAccessToken: SignAccessToken,
    private readonly refreshTokenTtlDays: number,
  ) {}

  async register(input: RegisterBody) {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.usersRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async login(input: LoginBody) {
    const user = await this.usersRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.refreshTokensRepository.findByHash(tokenHash);

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Rotation: a refresh token is single-use. Revoking it here means a stolen,
    // already-used token can't be replayed by an attacker.
    await this.refreshTokensRepository.revoke(record.id);

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.refreshTokensRepository.findByHash(tokenHash);
    if (record && !record.revokedAt) {
      await this.refreshTokensRepository.revoke(record.id);
    }
  }

  private async issueTokenPair(user: { id: string; email: string; role: string }) {
    const accessToken = this.signAccessToken({ id: user.id, email: user.email, role: user.role });

    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private toPublicUser(user: { id: string; email: string; name: string; role: string; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
