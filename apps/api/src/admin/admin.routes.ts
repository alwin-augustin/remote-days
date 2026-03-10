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

  // User Batch Import (replaces /admin/users/import)
  server.post(
    '/admin/users/batch',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.importUsersHandler as any
  );

  // User Management
  server.post(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.createUserHandler as any
  );

  server.get(
    '/admin/users',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.getUsersHandler as any
  );

  server.patch(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.updateUserHandler as any
  );

  server.delete(
    '/admin/users/:id',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    adminController.deleteUserHandler as any
  );

  // Country Management
  server.get(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.getCountriesHandler as any
  );

  server.post(
    '/admin/countries',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.createCountryHandler as any
  );

  server.patch(
    '/admin/countries/:code',
    {
      preHandler: [server.authenticate, server.authorize('hr')],
    },
    countryController.updateCountryHandler as any
  );

  server.delete(
    '/admin/countries/:code',
    {
      preHandler: [server.authenticate, server.authorize('admin')],
    },
    countryController.deleteCountryHandler as any
  );

}

export default adminRoutes;
