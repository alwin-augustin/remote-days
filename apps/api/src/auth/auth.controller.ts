import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '@tracker/types';
import { AuthService } from '../services/auth.service';
import { config } from '../config/env';
import { AppError } from '../errors/app-error';

export class AuthController {
  constructor(private readonly authService: AuthService) { }

  loginHandler = async (
    request: FastifyRequest<{ Body: Pick<User, 'email'> & { password: string } }>,
    reply: FastifyReply
  ) => {
    const { email, password } = request.body;

    const { token, user } = await this.authService.login(email, password);

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
      })
      .code(200)
      .send({ message: 'Login successful', user });
  }

  logoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token').code(204).send();
  }

  getMeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send(request.user);
  }

  passwordResetRequestHandler = async (
    request: FastifyRequest<{ Body: Pick<User, 'email'> }>,
    reply: FastifyReply
  ) => {
    const { email } = request.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    await this.authService.requestPasswordReset(email);

    // Always return a success message to prevent email enumeration
    reply.code(200).send({ message: 'If a user with that email exists, a password reset link has been sent.' });
  }

  passwordResetHandler = async (
    request: FastifyRequest<{ Body: { token: string; password?: string } }>,
    reply: FastifyReply
  ) => {
    const { token, password } = request.body;

    await this.authService.resetPassword(token, password);

    reply.code(200).send({ message: 'Password has been reset' });
  }
}

