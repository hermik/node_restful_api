import type { FastifyReply, FastifyRequest } from "fastify";
import type { PostsService } from "./posts.service.js";
import type { CreatePostBody, UpdatePostBody } from "./posts.schema.js";

export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  list = async (_request: FastifyRequest, _reply: FastifyReply) => {
    return this.postsService.listPublished();
  };

  getById = async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    return this.postsService.getPublishedById(id);
  };

  filterTitle = async (request: FastifyRequest, _reply: FastifyReply) => {
    const { query } = request.query as { query: string };
    return this.postsService.filterByTitle(query);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const post = await this.postsService.create(request.user.id, request.body as CreatePostBody); 
    reply.code(201);
    return post;
  };

  update = async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    return this.postsService.update(id, request.user.id, request.body as UpdatePostBody);
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await this.postsService.remove(id, request.user.id);
    reply.code(204);
  };
}
