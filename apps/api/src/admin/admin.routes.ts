import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { CountryController } from './country.controller';

async function adminRoutes(
  server: FastifyInstance,
  options: {
    adminController: AdminController;
    countryController: CountryController;
  }
) {
  const { adminController, countryController } = options;

  // User Import
  server.post(
    '/admin/users/import',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.importUsersHandler as any
  );

  // User Management
  server.post(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    adminController.createUserHandler as any
  );

  server.get(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    adminController.getUsersHandler as any
  );

  server.put(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    adminController.updateUserHandler as any
  );

  server.delete(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    adminController.deleteUserHandler as any
  );

  // Country Management
  server.get(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    countryController.getCountriesHandler as any
  );

  server.post(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    countryController.createCountryHandler as any
  );

  server.put(
    '/admin/countries/:code',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    countryController.updateCountryHandler as any
  );
}

export default adminRoutes;
