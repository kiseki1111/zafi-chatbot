import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any).message || errorResponse;

    const logText = `[${status}] ${request?.method || 'REQ'} ${request?.url || ''} - ${Array.isArray(message) ? message.join('; ') : JSON.stringify(message)}`;
    if (status >= 500) {
      this.logger.error(logText, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(logText);
    }

    response.status(status).json({
      statusCode: status,
      error:
        (errorResponse as any).error ||
        (status === 404 ? 'Not Found' : 'Error'),
      message: Array.isArray(message) ? message : [message],
    });
  }
}
