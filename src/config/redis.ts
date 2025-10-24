import Redis from 'ioredis';
import { logger } from './logger';

// Azure Cache for Redis connection
// Build Redis configuration
const redisConfig: any = {
  host: process.env['AZURE_REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['AZURE_REDIS_PORT'] || '6380'),
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Add password if provided
if (process.env['AZURE_REDIS_PASSWORD']) {
  redisConfig.password = process.env['AZURE_REDIS_PASSWORD'];
}

// Add TLS for production
if (process.env['NODE_ENV'] === 'production') {
  redisConfig.tls = {};
}

const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready for commands');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
  }
}

// Cache helper functions
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  static async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttlSeconds && result === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  static async setHash(key: string, field: string, value: any): Promise<boolean> {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache hash set error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  static async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache hash get error for key ${key}, field ${field}:`, error);
      return null;
    }
  }
}

// Session management
export class SessionService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

  static async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = `${userId}:${Date.now()}:${Math.random().toString(36)}`;
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    
    await CacheService.set(key, {
      userId,
      ...sessionData,
      createdAt: new Date().toISOString()
    }, this.SESSION_TTL);
    
    return sessionId;
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    return await CacheService.get(key);
  }

  static async updateSession(sessionId: string, sessionData: any): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const existing = await CacheService.get(key);
    
    if (!existing) return false;
    
    return await CacheService.set(key, {
      ...existing,
      ...sessionData,
      updatedAt: new Date().toISOString()
    }, this.SESSION_TTL);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    return await CacheService.del(key);
  }

  static async deleteUserSessions(userId: string): Promise<void> {
    try {
      const pattern = `${this.SESSION_PREFIX}${userId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Error deleting user sessions for ${userId}:`, error);
    }
  }
}

export { redis };

// Cleanup on process exit - DISABLED to prevent infinite loop
// Redis signal handlers are disabled because server.ts handles shutdown
// Uncomment these if Redis is properly configured and running
/*
process.on('beforeExit', async () => {
  await disconnectRedis();
});

process.on('SIGINT', async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
  process.exit(0);
});
*/
