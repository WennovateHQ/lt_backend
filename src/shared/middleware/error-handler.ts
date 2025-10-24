import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger, logError } from '@/config/logger';
import { isDevelopment } from '@/config/env';

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    details?: any;
    stack?: string;
  };
}

// Handle Prisma errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.['target'] as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return new AppError(
        `${fieldName} already exists`,
        409,
        ErrorCodes.ALREADY_EXISTS
      );
    
    case 'P2025':
      // Record not found
      return new AppError(
        'Record not found',
        404,
        ErrorCodes.NOT_FOUND
      );
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        'Related record not found',
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    
    case 'P2014':
      // Required relation violation
      return new AppError(
        'Invalid relation data',
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    
    default:
      logError('Unhandled Prisma error', error);
      return new AppError(
        'Database operation failed',
        500,
        ErrorCodes.DATABASE_ERROR
      );
  }
}

// Handle Zod validation errors
function handleZodError(error: ZodError): AppError {
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  const firstError = errors[0];
  const message = errors.length === 1 && firstError
    ? `${firstError.field}: ${firstError.message}`
    : 'Validation failed';

  const appError = new AppError(message, 400, ErrorCodes.VALIDATION_ERROR);
  
  // Add validation details
  (appError as any).details = { validationErrors: errors };
  
  return appError;
}

// Handle JWT errors
function handleJWTError(error: Error): AppError {
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, ErrorCodes.TOKEN_EXPIRED);
  }
  
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, ErrorCodes.TOKEN_INVALID);
  }
  
  return new AppError('Authentication failed', 401, ErrorCodes.AUTHENTICATION_REQUIRED);
}

// Handle Multer errors (file upload)
function handleMulterError(error: any): AppError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large', 400, 'FILE_TOO_LARGE');
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files', 400, 'TOO_MANY_FILES');
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }
  
  return new AppError('File upload error', 400, 'UPLOAD_ERROR');
}

// Convert various error types to AppError
function convertToAppError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid data provided', 400, ErrorCodes.VALIDATION_ERROR);
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    logError('Database connection error', error);
    return new AppError('Database connection failed', 503, ErrorCodes.DATABASE_ERROR);
  }
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }
  
  // JWT errors
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    return handleJWTError(error);
  }
  
  // Multer errors
  if (error.code && error.code.startsWith('LIMIT_')) {
    return handleMulterError(error);
  }
  
  // Stripe errors
  if (error.type && error.type.startsWith('Stripe')) {
    return new AppError(
      'Payment processing error',
      400,
      'PAYMENT_ERROR'
    );
  }
  
  // Default to internal server error
  logError('Unhandled error', error);
  return new AppError(
    'Internal server error',
    500,
    ErrorCodes.INTERNAL_ERROR
  );
}

// Main error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const appError = convertToAppError(error);
  
  // Log error details
  const errorContext = {
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
  };
  
  if (appError.statusCode >= 500) {
    logError(`Server Error: ${appError.message}`, error, errorContext);
  } else if (appError.statusCode >= 400) {
    logger.warn(`Client Error: ${appError.message}`, {
      code: appError.code,
      statusCode: appError.statusCode,
      ...errorContext,
    });
  }
  
  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      timestamp: appError.timestamp,
    },
  };
  
  // Add details in development or for validation errors
  if (isDevelopment || appError.code === ErrorCodes.VALIDATION_ERROR) {
    if ((appError as any).details) {
      errorResponse.error.details = (appError as any).details;
    }
  }
  
  // Add stack trace in development
  if (isDevelopment && appError.statusCode >= 500) {
    errorResponse.error.stack = appError.stack;
  }
  
  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    ErrorCodes.NOT_FOUND
  );
  
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handlers for uncaught exceptions
export const setupGlobalErrorHandlers = (): void => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception', error);
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logError('Unhandled Rejection', new Error(reason), { promise });
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
  
  // Handle SIGINT
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};
