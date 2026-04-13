import { HttpException, BadRequestException, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error-code';

export function throwError(codeKey: keyof typeof ERROR_CODES, message?: string): never {
  const error = ERROR_CODES[codeKey];
  const errorMessage = message || error.code.replace(/_/g, ' ').toLowerCase();
  
  // Sử dụng exception phù hợp với status code
  switch (error.status) {
    case 400:
      throw new BadRequestException({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
        },
      });
    case 401:
      throw new UnauthorizedException({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
        },
      });
    case 403:
      throw new ForbiddenException({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
        },
      });
    case 404:
      throw new NotFoundException({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
        },
      });
    case 409:
      throw new ConflictException({
        success: false,
        error: {
          code: error.code,
          message: errorMessage,
        },
      });
    default:
      throw new HttpException(
        {
          success: false,
          error: {
            code: error.code,
            message: errorMessage,
          },
        },
        error.status,
      );
  }
}
