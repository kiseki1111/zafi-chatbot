import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
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

    response.status(status).json({
      statusCode: status,
      error: (errorResponse as any).error || (status === 404 ? 'Not Found' : 'Error'),
      message: Array.isArray(message) ? message : [message],
    });
  }
}
