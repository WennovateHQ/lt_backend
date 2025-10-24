/**
 * Environment variable utilities
 * Provides type-safe access to environment variables
 */

export const getEnv = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};

export const getEnvRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value) {
    return defaultValue || 0;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
};

export const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value) {
    return defaultValue || false;
  }
  return value.toLowerCase() === 'true' || value === '1';
};

// Common environment variables with type safety
export const ENV = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),
  
  // Database
  DATABASE_URL: getEnvRequired('DATABASE_URL'),
  
  // Redis
  AZURE_REDIS_HOST: getEnv('AZURE_REDIS_HOST', 'localhost'),
  AZURE_REDIS_PORT: getEnvNumber('AZURE_REDIS_PORT', 6380),
  AZURE_REDIS_PASSWORD: getEnv('AZURE_REDIS_PASSWORD'),
  
  // JWT
  JWT_SECRET: getEnvRequired('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  
  // Email
  SENDGRID_API_KEY: getEnvRequired('SENDGRID_API_KEY'),
  FROM_EMAIL: getEnvRequired('FROM_EMAIL'),
  
  // Frontend
  FRONTEND_URL: getEnvRequired('FRONTEND_URL'),
  
  // Stripe
  STRIPE_SECRET_KEY: getEnvRequired('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvRequired('STRIPE_WEBHOOK_SECRET'),
  
  // Azure Storage
  AZURE_STORAGE_CONNECTION_STRING: getEnv('AZURE_STORAGE_CONNECTION_STRING'),
  AZURE_STORAGE_CONTAINER: getEnv('AZURE_STORAGE_CONTAINER', 'uploads'),
  
  // Feature flags
  ENABLE_RATE_LIMITING: getEnvBoolean('ENABLE_RATE_LIMITING', true),
  ENABLE_LOGGING: getEnvBoolean('ENABLE_LOGGING', true),
  
  // Development
  isDevelopment: getEnv('NODE_ENV') === 'development',
  isProduction: getEnv('NODE_ENV') === 'production',
  isTest: getEnv('NODE_ENV') === 'test',
} as const;

// Validate required environment variables on startup
export const validateEnvironment = (): void => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'SENDGRID_API_KEY',
    'FROM_EMAIL',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

// Export individual getters for backward compatibility
export {
  getEnv as env,
  getEnvRequired as envRequired,
  getEnvNumber as envNumber,
  getEnvBoolean as envBoolean
};
