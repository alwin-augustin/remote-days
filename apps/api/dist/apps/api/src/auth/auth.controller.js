"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const env_1 = require("../config/env");
const app_error_1 = require("../errors/app-error");
class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.loginHandler = async (request, reply) => {
            const { email, password } = request.body;
            const { token, user } = await this.authService.login(email, password);
            reply
                .setCookie('token', token, {
                path: '/',
                httpOnly: true,
                secure: env_1.config.NODE_ENV === 'production',
                sameSite: 'strict',
            })
                .code(200)
                .send({ message: 'Login successful', user });
        };
        this.logoutHandler = async (request, reply) => {
            reply.clearCookie('token').code(204).send();
        };
        this.getMeHandler = async (request, reply) => {
            reply.send(request.user);
        };
        this.passwordResetRequestHandler = async (request, reply) => {
            const { email } = request.body;
            if (!email) {
                throw new app_error_1.AppError('Email is required', 400);
            }
            await this.authService.requestPasswordReset(email);
            // Always return a success message to prevent email enumeration
            reply.code(200).send({ message: 'If a user with that email exists, a password reset link has been sent.' });
        };
        this.passwordResetHandler = async (request, reply) => {
            const { token, password } = request.body;
            await this.authService.resetPassword(token, password);
            reply.code(200).send({ message: 'Password has been reset' });
        };
    }
}
exports.AuthController = AuthController;
