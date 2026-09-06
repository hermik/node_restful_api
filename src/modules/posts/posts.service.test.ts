import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { PostsService } from "./posts.service.js";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";
import type { PostsRepository } from "./posts.repository.js";
import type { Post } from "../../db/schema.js";

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    title: "Hello world",
    content: "Some content",
    published: false,
    authorId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PostsService", () => {
  let postsRepository: {
    listPublished: jest.Mock;
    findPublishedById: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let service: PostsService;

  beforeEach(() => {
    postsRepository = {
      listPublished: jest.fn(),
      findPublishedById: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    service = new PostsService(postsRepository as unknown as PostsRepository);
  });

  describe("getPublishedById", () => {
    it("returns the post when it exists and is published", async () => {
      const post = createPost({ published: true });
      postsRepository.findPublishedById.mockResolvedValue(post);

      await expect(service.getPublishedById(post.id)).resolves.toEqual(post);
    });

    it("throws NotFoundError when there is no such published post", async () => {
      postsRepository.findPublishedById.mockResolvedValue(undefined);

      await expect(service.getPublishedById("missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    it("attaches the authorId to the new post", async () => {
      const post = createPost();
      postsRepository.create.mockResolvedValue(post);

      const result = await service.create("user-1", { title: post.title, content: post.content, published: false });

      expect(postsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: post.title, content: post.content, authorId: "user-1" }),
      );
      expect(result).toEqual(post);
    });
  });

  describe("update", () => {
    it("updates a post owned by the requester", async () => {
      const post = createPost({ authorId: "user-1" });
      postsRepository.findById.mockResolvedValue(post);
      postsRepository.update.mockResolvedValue({ ...post, title: "Updated" });

      const result = await service.update(post.id, "user-1", { title: "Updated" });

      expect(postsRepository.update).toHaveBeenCalledWith(post.id, { title: "Updated" });
      expect(result.title).toBe("Updated");
    });

    it("throws ForbiddenError when the requester does not own the post", async () => {
      postsRepository.findById.mockResolvedValue(createPost({ authorId: "someone-else" }));

      await expect(service.update("post-1", "user-1", { title: "Updated" })).rejects.toThrow(ForbiddenError);
      expect(postsRepository.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the post does not exist", async () => {
      postsRepository.findById.mockResolvedValue(undefined);

      await expect(service.update("missing", "user-1", { title: "Updated" })).rejects.toThrow(NotFoundError);
    });
  });

  describe("remove", () => {
    it("removes a post owned by the requester", async () => {
      const post = createPost({ authorId: "user-1" });
      postsRepository.findById.mockResolvedValue(post);

      await service.remove(post.id, "user-1");

      expect(postsRepository.remove).toHaveBeenCalledWith(post.id);
    });

    it("throws ForbiddenError when the requester does not own the post", async () => {
      postsRepository.findById.mockResolvedValue(createPost({ authorId: "someone-else" }));

      await expect(service.remove("post-1", "user-1")).rejects.toThrow(ForbiddenError);
      expect(postsRepository.remove).not.toHaveBeenCalled();
    });
  });
});
