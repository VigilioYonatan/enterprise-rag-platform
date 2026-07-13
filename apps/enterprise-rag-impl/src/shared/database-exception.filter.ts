import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import pino from 'pino';

const filter_logger = pino({
  name: 'rag-exception-filter',
  level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
});

interface PostgresErrorLike {
  code?: unknown;
  message?: unknown;
}

/**
 * Maps PostgreSQL RLS / constraint / FinOps SQLSTATE codes to deterministic HTTP status codes
 * so database policy rejections never leak internal schema details or surface as HTTP 500.
 */
@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    if (res.headersSent) {
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    const pg_code =
      typeof exception === 'object' && exception !== null && 'code' in exception
        ? String((exception as PostgresErrorLike).code)
        : '';
    const pg_msg =
      typeof exception === 'object' && exception !== null && 'message' in exception
        ? String((exception as PostgresErrorLike).message)
        : '';

    if (pg_code === '42501') {
      res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for this tenant resource',
      });
      return;
    }
    if (pg_code === 'P0002') {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: pg_msg || 'Requested resource is unavailable',
      });
      return;
    }
    if (pg_code === 'P0029') {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'BUDGET_EXHAUSTED',
        message: pg_msg || 'Daily tenant budget exhausted',
      });
      return;
    }
    if (pg_code === '23505') {
      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'Resource already exists in this tenant',
      });
      return;
    }
    if (pg_code === '23503' || pg_code === '23514' || pg_code === '22P02') {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: 'Invalid reference or constraint violation',
      });
      return;
    }

    filter_logger.error({ err: exception }, 'Unhandled application exception');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    });
  }
}
