import { logger } from './logger';
import { isDevelopment } from './env';

// Simple Redis mock for development
class MockRedis {
  async ping() {
    return 'PONG';
  }
  
  async set(key: string, value: string) {
    return 'OK';
  }
  
  async get(key: string) {
    return null;
  }
  
  async del(key: string) {
    return 1;
  }
  
  async disconnect() {
    return 'OK';
  }
}

// Redis client - use mock in development
export const redis = isDevelopment ? new MockRedis() : null;

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (isDevelopment) {
      // Always return true in development
      return true;
    }
    
    if (!redis) {
      return false;
    }
    
    await redis.ping();
    return true;
  } catch (error) {
    logger.warn('Redis health check failed:', error);
    return false;
  }
}

export default redis;
