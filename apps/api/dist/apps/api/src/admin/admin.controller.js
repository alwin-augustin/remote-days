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
exports.createUserHandler = createUserHandler;
const bcrypt = __importStar(require("bcrypt"));
async function createUserHandler(request, reply) {
    const { email, first_name, last_name, country_of_residence, work_country, temp_password, role } = request.body;
    if (!email || !first_name || !last_name || !country_of_residence || !work_country || !temp_password) {
        return reply.code(400).send({ message: 'Missing required fields' });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(temp_password, saltRounds);
    try {
        const { rows } = await request.server.pg.query("INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id", [email, first_name, last_name, country_of_residence, work_country, hashedPassword, role || 'employee']);
        reply.code(201).send({ user_id: rows[0].user_id });
    }
    catch (err) {
        if (err.code === '23505') { // unique_violation
            return reply.code(409).send({ message: 'Email already exists' });
        }
        request.log.error(err, 'Error creating user');
        reply.code(500).send({ message: 'Error creating user' });
    }
}
