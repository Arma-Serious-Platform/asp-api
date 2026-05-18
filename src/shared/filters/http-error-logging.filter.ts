import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

@Catch()
export class HttpErrorLoggingFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpErrorLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      const status = this.resolveStatus(exception);
      if (status >= 400 && status < 600) {
        this.logHttpError(host, status, exception);
      }
    }

    super.catch(exception, host);
  }

  private resolveStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private logHttpError(
    host: ArgumentsHost,
    status: number,
    exception: unknown,
  ): void {
    const request = host.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.originalUrl ?? request.url;
    const message = this.resolveMessage(exception);
    const context = `${method} ${url} ${status}`;

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${context} - ${message}`, stack);
      return;
    }

    this.logger.warn(`${context} - ${message}`);
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = (response as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          return msg.join(', ');
        }
        if (typeof msg === 'string') {
          return msg;
        }
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unknown error';
  }
}
