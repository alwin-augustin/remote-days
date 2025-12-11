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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt = __importStar(require("jsonwebtoken"));
async function authPlugin(fastify) {
    fastify.decorate('authenticate', async (request, reply) => {
        const token = request.cookies.token;
        if (!token) {
            return reply.code(401).send({ message: 'Authentication required' });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { rows } = await fastify.pg.query('SELECT user_id, email, first_name, last_name, country_of_residence, work_country, role, is_active, created_at FROM users WHERE user_id = $1 AND is_active = true', [decoded.userId]);
            const user = rows[0];
            if (!user) {
                return reply.code(401).send({ message: 'Invalid token or user not found' });
            }
            request.user = user;
        }
        catch (err) {
            reply.code(401).send({ message: 'Invalid token' });
        }
    });
    fastify.decorate('authorize', (requiredRole) => {
        return async (request, reply) => {
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
exports.default = (0, fastify_plugin_1.default)(authPlugin);
