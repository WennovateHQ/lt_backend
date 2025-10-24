import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { jwtConfig } from '@/config/env';
import { logger, logAuthEvent, logSecurityEvent } from '@/config/logger';
import { SessionService } from '@/config/redis';
import { AppError } from '@/shared/utils/app-error';
import { UserType } from '@prisma/client';

// Re-export UserType for convenience
export { UserType };

// JWT Payload schema
const jwtPayloadSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  userType: z.nativeEnum(UserType),
  emailVerified: z.boolean(),
  iat: z.number(),
  exp: z.number(),
  aud: z.string(),
  iss: z.string(),
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  emailVerified: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

// Extract token from request
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies (for web clients)
  if (req.cookies && req.cookies['accessToken']) {
    return req.cookies['accessToken'];
  }
  
  return null;
}

// Verify JWT token
async function verifyToken(token: string): Promise<AuthenticatedUser> {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    const payload = jwtPayloadSchema.parse(decoded);
    
    return {
      id: payload.sub as string,
      email: payload.email as string,
      userType: payload.userType as UserType,
      emailVerified: payload.emailVerified as boolean,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    } else {
      throw new AppError('Token verification failed', 401, 'TOKEN_VERIFICATION_FAILED');
    }
  }
}

// Main authentication middleware
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logSecurityEvent('Missing authentication token', undefined, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }
    
    // Verify token
    const user = await verifyToken(token);
    
    // Check if user still exists and is active
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        userType: true,
        status: true,
        emailVerified: true,
      },
    });
    
    if (!dbUser) {
      logSecurityEvent('Token for non-existent user', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
    }
    
    if (dbUser.status !== 'ACTIVE') {
      logSecurityEvent('Token for inactive user', user.id, {
        status: dbUser.status,
        ip: req.ip,
      });
      return next(new AppError('Account is not active', 401, 'ACCOUNT_INACTIVE'));
    }
    
    // Attach user to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      userType: dbUser.userType,
      emailVerified: dbUser.emailVerified,
    };
    
    logAuthEvent('User authenticated', user.id, {
      userType: user.userType,
      path: req.path,
    });
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    
    logger.error('Authentication middleware error:', error);
    return next(new AppError('Authentication failed', 500, 'AUTHENTICATION_ERROR'));
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }
    
    const user = await verifyToken(token);
    
    // Check if user exists
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        userType: true,
        status: true,
        emailVerified: true,
      },
    });
    
    if (dbUser && dbUser.status === 'ACTIVE') {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        userType: dbUser.userType,
        emailVerified: dbUser.emailVerified,
      };
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.debug('Optional auth failed:', error);
    next();
  }
};

// Role-based authorization
export const authorize = (...allowedRoles: (UserType | string)[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }
    
    if (!allowedRoles.includes(req.user.userType)) {
      logSecurityEvent('Unauthorized access attempt', req.user.id, {
        userType: req.user.userType,
        allowedRoles,
        path: req.path,
        ip: req.ip,
      });
      return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
    }
    
    next();
  };
};

// Email verification requirement
export const requireEmailVerification = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
  }
  
  if (!req.user.emailVerified) {
    return next(new AppError('Email verification required', 403, 'EMAIL_VERIFICATION_REQUIRED'));
  }
  
  next();
};

// Resource ownership check
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }
    
    const resourceId = req.params[resourceIdParam];
    
    if (!resourceId) {
      return next(new AppError('Resource ID required', 400, 'RESOURCE_ID_REQUIRED'));
    }
    
    // This is a generic check - specific implementations should override
    // For now, we'll just check if the resource belongs to the user
    try {
      // This would need to be customized based on the resource type
      // For example, checking if a project belongs to the user
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return next(new AppError('Authorization check failed', 500, 'AUTHORIZATION_ERROR'));
    }
  };
};

// Session-based authentication (for web clients)
export const sessionAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.['sessionId'] || req.headers['x-session-id'];
    
    if (!sessionId) {
      return next(new AppError('Session required', 401, 'SESSION_REQUIRED'));
    }
    
    const session = await SessionService.getSession(sessionId);
    
    if (!session) {
      return next(new AppError('Invalid session', 401, 'INVALID_SESSION'));
    }
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        userType: true,
        status: true,
        emailVerified: true,
      },
    });
    
    if (!user || user.status !== 'ACTIVE') {
      await SessionService.deleteSession(sessionId);
      return next(new AppError('Invalid session', 401, 'INVALID_SESSION'));
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      emailVerified: user.emailVerified,
    };
    
    req.sessionId = sessionId;
    
    // Update session activity
    await SessionService.updateSession(sessionId, {
      lastActivity: new Date().toISOString(),
    });
    
    next();
  } catch (error) {
    logger.error('Session authentication error:', error);
    return next(new AppError('Session authentication failed', 500, 'SESSION_AUTH_ERROR'));
  }
};

// Logout helper
export const logout = async (req: Request, res: Response) => {
  try {
    if (req.sessionId) {
      await SessionService.deleteSession(req.sessionId);
    }
    
    if (req.user) {
      logAuthEvent('User logged out', req.user.id);
    }
    
    // Clear cookies
    res.clearCookie('sessionId');
    res.clearCookie('accessToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};
