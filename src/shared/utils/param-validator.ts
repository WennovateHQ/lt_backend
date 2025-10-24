/**
 * Utility functions for validating route parameters
 * Helps prevent TypeScript "string | undefined" errors
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from './app-error';

/**
 * Validate and extract a required parameter from req.params
 * Throws AppError if parameter is missing
 */
export function requireParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  if (!value) {
    throw new AppError(
      `Missing required parameter: ${paramName}`,
      400,
      ErrorCodes.VALIDATION_ERROR
    );
  }
  return value;
}

/**
 * Validate and extract multiple required parameters from req.params
 */
export function requireParams(req: Request, ...paramNames: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const paramName of paramNames) {
    const value = req.params[paramName];
    if (!value) {
      throw new AppError(
        `Missing required parameter: ${paramName}`,
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }
    result[paramName] = value;
  }
  return result;
}

/**
 * Middleware to validate specific params exist
 * Usage: validateParams('userId', 'projectId')
 */
export function validateParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const paramName of paramNames) {
        if (!req.params[paramName]) {
          res.status(400).json({
            error: `Missing required parameter: ${paramName}`,
            code: ErrorCodes.VALIDATION_ERROR
          });
          return;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract query parameter with type safety
 */
export function getQueryParam(req: Request, paramName: string): string | undefined {
  return req.query[paramName] as string | undefined;
}

/**
 * Extract required query parameter
 */
export function requireQueryParam(req: Request, paramName: string): string {
  const value = req.query[paramName] as string | undefined;
  if (!value) {
    throw new AppError(
      `Missing required query parameter: ${paramName}`,
      400,
      ErrorCodes.VALIDATION_ERROR
    );
  }
  return value;
}
