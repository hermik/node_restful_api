import { and, eq, ilike } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { posts, type NewPost, type Post } from "../../db/schema.js";

export class PostsRepository {
  constructor(private readonly db: Database) {}

  async listPublished(): Promise<Post[]> {
    return this.db.select().from(posts).where(eq(posts.published, true));
  }
  

  async findById(id: string): Promise<Post | undefined> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async filterByTitle(query: string): Promise<Post[]> {
    return this.db.select().from(posts).where(ilike(posts.title, `%${query}%`));
  }
  async findPublishedById(id: string): Promise<Post | undefined> {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.published, true)));
    return post;
  }

  async create(data: NewPost): Promise<Post> {
    const [post] = await this.db.insert(posts).values(data).returning();
    return post;
  }

  async update(id: string, data: Partial<NewPost>): Promise<Post | undefined> {
    const [post] = await this.db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }
}
