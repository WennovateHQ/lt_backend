import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

// Note: User type declaration is in @/shared/middleware/auth.ts

// JWT Authentication middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err: any, decoded: any): void => {
    if (err) {
      logger.warn('JWT verification failed', {
        error: err.message,
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        });
        return;
      }

      if (err.name === 'JsonWebTokenError') {
        res.status(403).json({ 
          error: 'Invalid token',
          message: 'The provided token is invalid.'
        });
        return;
      }

      res.status(403).json({ 
        error: 'Token verification failed',
        message: 'Unable to verify authentication token.'
      });
      return;
    }

    // Normalize token format: new tokens use 'sub', old tokens use 'id'
    const userId = decoded.sub || decoded.id;
    req.user = {
      ...decoded,
      id: userId,  // Ensure 'id' field is always present
      sub: userId  // Also keep 'sub' for compatibility
    };
    
    logger.info('User authenticated', {
      userId: userId,
      userType: decoded.userType,
      ip: req.ip
    });

    next();
  });
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userType: req.user.userType,
        requiredRoles: allowedRoles,
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(['ADMIN']);

// Business user middleware
export const requireBusiness = requireRole(['BUSINESS', 'ADMIN']);

// Talent user middleware
export const requireTalent = requireRole(['TALENT', 'ADMIN']);

// Business or Talent middleware
export const requireUser = requireRole(['BUSINESS', 'TALENT', 'ADMIN']);

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  jwt.verify(token, env.JWT_SECRET, (err: any, decoded: any) => {
    if (!err && decoded) {
      req.user = decoded;
    }
    next(); // Continue regardless of token validity
  });
};

// Generate JWT token
export const generateToken = (payload: { id: string; email: string; userType: string }) => {
  return jwt.sign({ 
    sub: payload.id,  // Use 'sub' field as expected by shared/middleware/auth.ts
    email: payload.email, 
    userType: payload.userType,
    emailVerified: true
  }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
    issuer: 'localtalents-api',
    audience: 'localtalents-app'
  });
};

// Generate refresh token
export const generateRefreshToken = (payload: { id: string; email: string; userType: string }) => {
  return jwt.sign({ 
    sub: payload.id,  // Use 'sub' field as expected by shared/middleware/auth.ts
    email: payload.email, 
    userType: payload.userType,
    type: 'refresh'
  }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'localtalents-api',
    audience: 'localtalents-app'
  });
};

// Verify and decode token without middleware
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
};
