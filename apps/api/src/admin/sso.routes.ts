import { FastifyInstance } from 'fastify';
import { SsoAdminController } from './sso.controller';
import { SsoSettingsBody, SsoTestBody, SsoIdentityParams } from '../schemas';

/**
 * Admin-only SSO configuration routes.
 *
 * Gated on `admin` (not `hr`): repointing the deployment at a different identity
 * provider can grant access to anyone in that directory, so it is a
 * deployment-level security action rather than an HR operation.
 *
 * Note on the `as any` casts: attaching a TypeBox `schema` makes Fastify infer a
 * route signature that is not assignable to the default-provider
 * RouteHandlerMethod in this Fastify v4 + type-provider setup. admin.routes.ts
 * casts for the same reason. The handlers themselves keep precise payload types
 * in sso.controller.ts, so request bodies remain fully type-checked.
 */
async function ssoAdminRoutes(server: FastifyInstance, options: { controller: SsoAdminController }) {
  const { controller } = options;
  const adminOnly = { preHandler: [server.authenticate, server.authorize('admin')] };

  server.get('/admin/sso', adminOnly, controller.getSettingsHandler as any);

  server.put(
    '/admin/sso',
    {
      ...adminOnly,
      schema: { body: SsoSettingsBody },
    },
    controller.updateSettingsHandler as any
  );

  server.post(
    '/admin/sso/test',
    {
      ...adminOnly,
      schema: { body: SsoTestBody },
    },
    controller.testConnectionHandler as any
  );

  server.get('/admin/sso/identities', adminOnly, controller.listIdentitiesHandler as any);

  server.delete(
    '/admin/sso/identities/:userId',
    {
      ...adminOnly,
      schema: { params: SsoIdentityParams },
    },
    controller.unlinkIdentityHandler as any
  );
}

export default ssoAdminRoutes;
