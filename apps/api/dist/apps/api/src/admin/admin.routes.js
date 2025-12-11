"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function adminRoutes(server, options) {
    const { adminController, countryController } = options;
    // User Import
    server.post('/admin/users/import', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, adminController.importUsersHandler);
    // User Management
    server.post('/admin/users', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, adminController.createUserHandler);
    server.get('/admin/users', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, adminController.getUsersHandler);
    server.put('/admin/users/:id', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, adminController.updateUserHandler);
    server.delete('/admin/users/:id', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, adminController.deleteUserHandler);
    // Country Management
    server.get('/admin/countries', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, countryController.getCountriesHandler);
    server.post('/admin/countries', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, countryController.createCountryHandler);
    server.put('/admin/countries/:code', {
        preHandler: [server.authenticate, server.authorize('admin')],
    }, countryController.updateCountryHandler);
}
exports.default = adminRoutes;
