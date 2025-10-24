import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '@/config/redis';
import { rateLimitConfig, isDevelopment } from '@/config/env';
import { logger, logSecurityEvent } from '@/config/logger';
import { Request, Response, NextFunction } from 'express';

// Create Redis store for rate limiting (only in production)
const createRedisStore = (prefix: string): RedisStore | undefined => {
  if (isDevelopment) {
    return undefined; // Use memory store in development
  }
  try {
    return new RedisStore({
      client: redis,
      prefix: `rl:${prefix}:`,
    } as any);
  } catch (error) {
    logger.warn('Redis store creation failed, using memory store', { error });
    return undefined;
  }
};

// Custom key generator that includes user ID if available
const createKeyGenerator = (includeUser: boolean = false) => {
  return (req: Request): string => {
    const baseKey = req.ip || 'unknown';
    if (includeUser && req.user) {
      return `${baseKey}:${req.user.id}`;
    }
    return baseKey;
  };
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userAgent = req.get('User-Agent');
  
  logSecurityEvent('Rate limit exceeded', userId, {
    ip: req.ip,
    userAgent,
    path: req.path,
    method: req.method,
  });
  
  res.status(429).json({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.round(rateLimitConfig.windowMs / 1000),
  });
};

// General API rate limiter
export const apiLimiter = rateLimit({
  ...(createRedisStore('api') && { store: createRedisStore('api') }),
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(false),
  handler: (req: Request, res: Response) => {
    logger.warn('API rate limit reached', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });
    rateLimitHandler(req, res);
  },
} as any);

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  store: createRedisStore('auth') as RedisStore,
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.authMaxRequests,
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator(false),
  handler: (req: Request, res: Response) => {
    logSecurityEvent('Auth rate limit reached', undefined, {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });
    rateLimitHandler(req, res);
  },
} as any);

// Registration rate limiter (very strict)
export const registrationLimiter = rateLimit({
  store: createRedisStore('registration'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 registration attempts per hour per IP
  skipSuccessfulRequests: false,
  keyGenerator: createKeyGenerator(false),
  handler: (req: Request, res: Response) => {
    logSecurityEvent('Registration rate limit reached', undefined, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body?.email ? { email: req.body.email } : undefined,
    });
  },
} as any);

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  ...(createRedisStore('password-reset') && { store: createRedisStore('password-reset') }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset attempts per hour
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator(false),
  handler: rateLimitHandler,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  ...(createRedisStore('upload') && { store: createRedisStore('upload') }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  keyGenerator: createKeyGenerator(true), // Include user ID
  handler: rateLimitHandler,
});

// Project creation rate limiter
export const projectCreationLimiter = rateLimit({
  ...(createRedisStore('project-creation') && { store: createRedisStore('project-creation') }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 projects per hour per user
  keyGenerator: createKeyGenerator(true),
  handler: rateLimitHandler,
});

// Application submission rate limiter
export const applicationLimiter = rateLimit({
  ...(createRedisStore('application') && { store: createRedisStore('application') }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 applications per hour per user
  keyGenerator: createKeyGenerator(true),
  handler: rateLimitHandler,
});

// Message sending rate limiter
export const messageLimiter = rateLimit({
  ...(createRedisStore('message') && { store: createRedisStore('message') }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 messages per 15 minutes per user
  keyGenerator: createKeyGenerator(true),
  handler: rateLimitHandler,
});

// Search rate limiter
export const searchLimiter = rateLimit({
  ...(createRedisStore('search') && { store: createRedisStore('search') }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  keyGenerator: createKeyGenerator(false),
  handler: rateLimitHandler,
});

// Admin operations rate limiter
export const adminLimiter = rateLimit({
  ...(createRedisStore('admin') && { store: createRedisStore('admin') }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 admin operations per minute
  keyGenerator: createKeyGenerator(true),
  handler: rateLimitHandler,
});

// Webhook rate limiter (for external services)
export const webhookLimiter = rateLimit({
  ...(createRedisStore('webhook') && { store: createRedisStore('webhook') }),
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 webhook calls per minute
  keyGenerator: (req: Request): string => {
    // Use a combination of IP and webhook source
    const source = req.headers['x-webhook-source'] || 'unknown';
    return `${req.ip || 'unknown'}:${source}`;
  },
  handler: rateLimitHandler,
});

// Dynamic rate limiter factory
export const createCustomLimiter = (options: {
  prefix: string;
  windowMs: number;
  max: number;
  includeUser?: boolean;
  skipSuccessful?: boolean;
}) => {
  return rateLimit({
    ...(createRedisStore(options.prefix) && { store: createRedisStore(options.prefix) }),
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessful || false,
    keyGenerator: createKeyGenerator(options.includeUser || false),
    handler: rateLimitHandler,
  });
};

// Rate limit bypass for trusted IPs (admin panel, monitoring, etc.)
export const createTrustedIPLimiter = (trustedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.ip && trustedIPs.includes(req.ip)) {
      return next();
    }
    return apiLimiter(req, res, next);
  };
};

// Sliding window rate limiter for premium users
export const premiumUserLimiter = rateLimit({
  ...(createRedisStore('premium') && { store: createRedisStore('premium') }),
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests * 5, // 5x higher limit for premium users
  keyGenerator: createKeyGenerator(true),
  skip: (_req: Request) => {
    // Skip rate limiting for premium users
    // This would need to be implemented based on user subscription status
    return false; // For now, apply to all users
  },
  handler: rateLimitHandler,
});

// Export all limiters
export const rateLimiters = {
  api: apiLimiter,
  auth: authLimiter,
  registration: registrationLimiter,
  passwordReset: passwordResetLimiter,
  upload: uploadLimiter,
  projectCreation: projectCreationLimiter,
  application: applicationLimiter,
  message: messageLimiter,
  search: searchLimiter,
  admin: adminLimiter,
  webhook: webhookLimiter,
  premium: premiumUserLimiter,
};
