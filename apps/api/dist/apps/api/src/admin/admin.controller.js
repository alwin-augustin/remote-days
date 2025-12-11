"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const app_error_1 = require("../errors/app-error");
class AdminController {
    constructor(userService) {
        this.userService = userService;
        this.createUserHandler = async (request, reply) => {
            const { email, first_name, last_name, country_of_residence, work_country, temp_password, role } = request.body;
            if (!email || !first_name || !last_name || !country_of_residence || !work_country || !temp_password) {
                throw new app_error_1.AppError('Missing required fields', 400);
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
            }
            catch (err) {
                if (err.code === '23505') { // unique_violation
                    throw new app_error_1.AppError('Email already exists', 409);
                }
                throw err;
            }
        };
        this.getUsersHandler = async (request, reply) => {
            const { limit = 10, offset = 0, search, role, country } = request.query;
            const result = await this.userService.getUsers(Number(limit), Number(offset), search, { role, country });
            reply.code(200).send(result);
        };
        this.updateUserHandler = async (request, reply) => {
            const { id } = request.params;
            const updates = request.body;
            const updatedUser = await this.userService.updateUser(id, updates);
            if (!updatedUser) {
                throw new app_error_1.AppError('User not found', 404);
            }
            reply.code(200).send(updatedUser);
        };
        this.deleteUserHandler = async (request, reply) => {
            const { id } = request.params;
            await this.userService.deleteUser(id);
            reply.code(204).send();
        };
        this.importUsersHandler = async (request, reply) => {
            const data = await request.file();
            if (!data) {
                throw new app_error_1.AppError('No file uploaded', 400);
            }
            // Basic type check
            // if (data.mimetype !== 'text/csv' && ...)
            const buffer = await data.toBuffer();
            try {
                const result = await this.userService.importUsers(buffer);
                reply.code(200).send(result);
            }
            catch (err) {
                request.log.error(err);
                throw new app_error_1.AppError('Failed to process CSV', 500);
            }
        };
    }
}
exports.AdminController = AdminController;
