import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { User } from '@remotedays/types';
import * as jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (role: User['role']) => (request: FastifyRequest, reply: FastifyReply) => void;
  }
  interface FastifyRequest {
    user: User;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    let token = request.cookies.token;

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return reply.code(401).send({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const { rows } = await fastify.pg.query<User>(
        'SELECT user_id, email, first_name, last_name, country_of_residence, work_country, role, is_active, created_at FROM users WHERE user_id = $1 AND is_active = true',
        [decoded.userId]
      );
      const user = rows[0];

      if (!user) {
        return reply.code(401).send({ message: 'Invalid token or user not found' });
      }
      request.user = user;
    } catch (err) {
      reply.code(401).send({ message: 'Invalid token' });
    }
  });

  fastify.decorate('authorize', (requiredRole: User['role']) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userRole = request.user?.role;

      if (!userRole) {
        return reply.code(403).send({ message: 'Forbidden' });
      }

      if (requiredRole === 'admin' && userRole !== 'admin') {
        return reply.code(403).send({ message: 'Forbidden' });
      }

      if (requiredRole === 'hr' && !['admin', 'hr'].includes(userRole)) {
        return reply.code(403).send({ message: 'Forbidden' });
      }

      // 'employee' role implies access for everyone if authenticated, which is handled by 'authenticate'
    };
  });
}

export default fp(authPlugin);
