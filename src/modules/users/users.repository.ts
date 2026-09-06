import { eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { users, type NewUser, type User } from "../../db/schema.js";

export class UsersRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async list(): Promise<User[]> {
    return this.db.select().from(users);
  }
}
