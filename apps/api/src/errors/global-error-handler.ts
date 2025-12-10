import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './app-error';

export function globalErrorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            message: error.message,
        });
    }

    // Handle Fastify validation errors
    if (error.validation) {
        return reply.status(400).send({
            status: 'error',
            message: 'Validation Error',
            details: error.validation,
        });
    }

    request.log.error(error);

    return reply.status(500).send({
        status: 'error',
        message: 'Internal Server Error',
    });
}
