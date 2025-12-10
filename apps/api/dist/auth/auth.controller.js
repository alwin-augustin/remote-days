"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginHandler = loginHandler;
exports.logoutHandler = logoutHandler;
exports.getMeHandler = getMeHandler;
exports.passwordResetRequestHandler = passwordResetRequestHandler;
exports.passwordResetHandler = passwordResetHandler;
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
async function loginHandler(request, reply) {
    const { email, password } = request.body;
    if (!email || !password) {
        return reply.code(400).send({ message: 'Email and password are required' });
    }
    const { rows } = await request.server.pg.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
        return reply.code(401).send({ message: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
        return reply.code(401).send({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({
        userId: user.user_id,
        email: user.email,
    }, process.env.JWT_SECRET, { expiresIn: '1d' });
    reply
        .setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })
        .code(200)
        .send({ message: 'Login successful' });
}
async function logoutHandler(request, reply) {
    reply.clearCookie('token').code(204).send();
}
async function getMeHandler(request, reply) {
    reply.send(request.user);
}
async function passwordResetRequestHandler(request, reply) {
    const { email } = request.body;
    const { rows } = await request.server.pg.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user) {
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration
        await request.server.pg.query("INSERT INTO email_cta_tokens (token, user_id, action, expires_at) VALUES ($1, $2, 'password-reset', $3)", [token, user.user_id, expiresAt]);
        // Mock email sending
        request.log.info(`Password reset link for ${email}: http://localhost:5173/reset-password?token=${token}`);
    }
    // Always return a success message to prevent email enumeration
    reply.code(200).send({ message: 'If a user with that email exists, a password reset link has been sent.' });
}
async function passwordResetHandler(request, reply) {
    const { token, password } = request.body;
    if (!token || !password) {
        return reply.code(400).send({ message: 'Token and password are required' });
    }
    const { rows } = await request.server.pg.query("SELECT * FROM email_cta_tokens WHERE token = $1 AND action = 'password-reset'", [token]);
    const tokenData = rows[0];
    if (!tokenData) {
        return reply.code(400).send({ message: 'Invalid token' });
    }
    if (tokenData.used) {
        return reply.code(400).send({ message: 'Token has already been used' });
    }
    if (new Date() > new Date(tokenData.expires_at)) {
        return reply.code(400).send({ message: 'Token has expired' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await request.server.pg.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [hashedPassword, tokenData.user_id]);
    await request.server.pg.query("UPDATE email_cta_tokens SET used = true WHERE token = $1", [token]);
    reply.code(200).send({ message: 'Password has been reset' });
}
