import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: any,
  ) {
    super(
      {
        success: false,
        error: {
          code: code || 'INTERNAL_SERVER_ERROR',
          message,
          ...(details && { details }),
        },
      },
      statusCode,
    );
  }
}

