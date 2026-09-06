import { NotFoundError } from "../../common/errors.js";
import type { UsersRepository } from "./users.repository.js";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return this.toPublicUser(user);
  }

  async list() {
    const users = await this.usersRepository.list();
    return users.map((user) => this.toPublicUser(user));
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
