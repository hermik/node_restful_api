import { eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { refreshTokens, type NewRefreshToken, type RefreshToken } from "../../db/schema.js";

export class RefreshTokensRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewRefreshToken): Promise<RefreshToken> {
    const [record] = await this.db.insert(refreshTokens).values(data).returning();
    return record;
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const [record] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return record;
  }

  async revoke(id: string): Promise<void> {
    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }
}
