import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi không xác định',
      },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Nếu response đã có format chuẩn (từ throwError)
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
      ) {
        errorResponse = exceptionResponse;
      } else if (typeof exceptionResponse === 'string') {
        // Nếu là string đơn giản
        errorResponse = {
          success: false,
          error: {
            code: this.getErrorCodeFromStatus(status),
            message: exceptionResponse,
          },
        };
      } else if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        // Xử lý validation errors từ class-validator
        const messages = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : [exceptionResponse.message];

        // Nếu có nhiều lỗi validation, hiển thị tất cả
        if (messages.length > 1) {
          errorResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid data',
              details: messages,
            },
          };
        } else {
          errorResponse = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: messages[0] || 'Invalid data',
            },
          };
        }
      }
    } else if (exception instanceof Error) {
      // Xử lý lỗi không phải HttpException
      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred. Please try again later.',
        },
      };
    }

    // Log lỗi (chỉ log trong development)
    if (process.env.NODE_ENV !== 'production') {
      if (status >= 500) {
        console.error('Error [5xx]:', {
          status,
          path: request.url,
          method: request.method,
          error: exception,
        });
      } else {
        console.warn(`[${status}] ${request.method} ${request.url} - ${errorResponse.error?.message || 'Error'}`);
      }
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'INTERNAL_SERVER_ERROR';
  }
}

