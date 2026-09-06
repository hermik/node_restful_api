import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import type { PostsRepository } from "./posts.repository.js";
import type { CreatePostBody, UpdatePostBody } from "./posts.schema.js";

export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  async listPublished() {
    return this.postsRepository.listPublished();
  }

  async getPublishedById(id: string) {
    const post = await this.postsRepository.findPublishedById(id);
    if (!post) {
      throw new NotFoundError("Post not found");
    }
    return post;
  }

  async create(authorId: string, data: CreatePostBody) {
    return this.postsRepository.create({ ...data, authorId });
  }

  async update(id: string, requesterId: string, data: UpdatePostBody) {
    const post = await this.getOwnedPost(id, requesterId);
    const updated = await this.postsRepository.update(post.id, data);
    if (!updated) {
      throw new NotFoundError("Post not found");
    }
    return updated;
  }

  async remove(id: string, requesterId: string) {
    const post = await this.getOwnedPost(id, requesterId);
    await this.postsRepository.remove(post.id);
  }

  private async getOwnedPost(id: string, requesterId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) {
      throw new NotFoundError("Post not found");
    }
    if (post.authorId !== requesterId) {
      throw new ForbiddenError("You do not have access to this post");
    }
    return post;
  }
}
