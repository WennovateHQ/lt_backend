import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Basic config
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Redis (Azure Cache for Redis)
  AZURE_REDIS_HOST: z.string().default('localhost'),
  AZURE_REDIS_PORT: z.string().default('6379'),
  AZURE_REDIS_PASSWORD: z.string().default(''),
  
  // Azure Key Vault
  AZURE_KEY_VAULT_NAME: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Auth0 (optional in development)
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  
  // Stripe (optional in development)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
  
  // Email Configuration (SMTP + SendGrid)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email('Invalid from email').optional(),
  FROM_NAME: z.string().default('LocalTalents'),
  
  // File Upload (Azure Blob Storage)
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().default('uploads'),
  
  // Mapbox
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().default('5'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5000'),
});

// Validate environment variables with development-friendly error handling
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  
  // In development, show warnings but don't exit
  if (process.env['NODE_ENV'] === 'development') {
    console.warn('⚠️ Running in development mode with missing environment variables');
    console.warn('⚠️ Some features may not work correctly');
  } else {
    process.exit(1);
  }
}

export const env = parseResult.success ? parseResult.data : process.env as any;

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isStaging = env.NODE_ENV === 'staging';

// Derived configurations
export const config = {
  // Server
  server: {
    port: parseInt(env.PORT),
    env: env.NODE_ENV,
  },
  
  // Database
  database: {
    url: env.DATABASE_URL,
  },
  
  // Redis
  redis: {
    host: env.AZURE_REDIS_HOST,
    port: parseInt(env.AZURE_REDIS_PORT),
    password: env.AZURE_REDIS_PASSWORD,
    tls: isProduction,
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // Auth0
  auth0: {
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    audience: env.AUTH0_AUDIENCE,
  },
  
  // Stripe
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    connectClientId: env.STRIPE_CONNECT_CLIENT_ID,
  },
  
  // Email
  email: {
    apiKey: env.SENDGRID_API_KEY,
    fromEmail: env.FROM_EMAIL,
    fromName: env.FROM_NAME,
  },
  
  // File Storage
  storage: {
    accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: env.AZURE_STORAGE_ACCOUNT_KEY,
    containerName: env.AZURE_STORAGE_CONTAINER_NAME,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
    authMaxRequests: parseInt(env.AUTH_RATE_LIMIT_MAX_REQUESTS),
  },
  
  // CORS
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
  },
  
  // Mapbox
  mapbox: {
    accessToken: env.MAPBOX_ACCESS_TOKEN,
  },
};

// Export individual configs for convenience
export const {
  server: serverConfig,
  database: databaseConfig,
  redis: redisConfig,
  jwt: jwtConfig,
  auth0: auth0Config,
  stripe: stripeConfig,
  email: emailConfig,
  storage: storageConfig,
  rateLimit: rateLimitConfig,
  cors: corsConfig,
  mapbox: mapboxConfig,
} = config;
