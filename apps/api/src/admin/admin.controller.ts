import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@tracker/types';
import { UserService } from '../services/user.service';
import { AppError } from '../errors/app-error';

export class AdminController {
  constructor(private readonly userService: UserService) { }

  createUserHandler = async (
    request: FastifyRequest<{ Body: Partial<Pick<User, 'email' | 'first_name' | 'last_name' | 'country_of_residence' | 'work_country' | 'role'>> & { temp_password?: string } }>,
    reply: FastifyReply
  ) => {
    const { email, first_name, last_name, country_of_residence, work_country, temp_password, role } = request.body;

    if (!email || !first_name || !last_name || !country_of_residence || !work_country || !temp_password) {
      throw new AppError('Missing required fields', 400);
    }

    try {
      const newUser = await this.userService.createUser({
        email,
        first_name,
        last_name,
        country_of_residence,
        work_country,
        temp_password,
        role: role || 'employee',
      });
      reply.code(201).send({ user_id: newUser.user_id });
    } catch (err: any) {
      if (err.code === '23505') { // unique_violation
        throw new AppError('Email already exists', 409);
      }
      throw err;
    }
  }

  getUsersHandler = async (
    request: FastifyRequest<{ Querystring: { limit?: number; offset?: number; search?: string } }>,
    reply: FastifyReply
  ) => {
    const { limit = 10, offset = 0, search } = request.query;
    const result = await this.userService.getUsers(Number(limit), Number(offset), search);
    reply.code(200).send(result);
  }

  updateUserHandler = async (
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<User> }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const updates = request.body;

    const updatedUser = await this.userService.updateUser(id, updates);
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }
    reply.code(200).send(updatedUser);
  }

  deleteUserHandler = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    await this.userService.deleteUser(id);
    reply.code(204).send();
  }
}
