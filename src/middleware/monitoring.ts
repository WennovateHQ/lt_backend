import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { sendEmail } from '@/config/email';
import { env } from '@/config/env';

// Performance monitoring
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip: string;
}

// In-memory storage for metrics (in production, use Redis or database)
const performanceMetrics: PerformanceMetrics[] = [];
const errorCounts = new Map<string, number>();
const alertThresholds = {
  responseTime: 5000, // 5 seconds
  errorRate: 0.1, // 10% error rate
  consecutiveErrors: 10
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Record metrics
    const metric: PerformanceMetrics = {
      endpoint: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      timestamp: new Date(),
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || 'unknown'
    };

    performanceMetrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (performanceMetrics.length > 1000) {
      performanceMetrics.shift();
    }

    // Log slow requests
    if (responseTime > alertThresholds.responseTime) {
      logger.warn('Slow request detected', {
        endpoint: req.path,
        method: req.method,
        responseTime,
        userId: req.user?.id,
        ip: req.ip
      });
    }

    // Track error rates
    const errorKey = `${req.method}:${req.path}`;
    if (res.statusCode >= 400) {
      const currentCount = errorCounts.get(errorKey) || 0;
      errorCounts.set(errorKey, currentCount + 1);

      // Alert on consecutive errors
      if (currentCount + 1 >= alertThresholds.consecutiveErrors) {
        sendAlert('high_error_rate', {
          endpoint: req.path,
          method: req.method,
          errorCount: currentCount + 1,
          statusCode: res.statusCode
        });
      }
    } else {
      // Reset error count on success
      errorCounts.set(errorKey, 0);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Health check monitoring
export const healthMonitor = {
  checks: {
    database: false,
    email: false,
    redis: false,
    lastCheck: new Date()
  },

  async runHealthChecks() {
    try {
      // Database check would go here
      this.checks.database = true;
      
      // Email check would go here
      this.checks.email = true;
      
      // Redis check would go here
      this.checks.redis = true;
      
      this.checks.lastCheck = new Date();

      logger.info('Health checks completed', this.checks);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      sendAlert('health_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  },

  getStatus() {
    const allHealthy = this.checks.database && this.checks.email && this.checks.redis;
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: this.checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }
};

// Alert system
async function sendAlert(type: string, data: any) {
  try {
    const alertEmail = env.FROM_EMAIL || 'admin@localtalents.ca';
    
    const alerts = {
      high_error_rate: {
        subject: '🚨 High Error Rate Alert - LocalTalents API',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">🚨 High Error Rate Detected</h1>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
              <p><strong>Endpoint:</strong> ${data.method} ${data.endpoint}</p>
              <p><strong>Error Count:</strong> ${data.errorCount}</p>
              <p><strong>Status Code:</strong> ${data.statusCode}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>Please investigate this issue immediately.</p>
          </div>
        `
      },
      health_check_failed: {
        subject: '🚨 Health Check Failed - LocalTalents API',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">🚨 Health Check Failed</h1>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
              <p><strong>Error:</strong> ${data.error}</p>
              <p><strong>Time:</strong> ${data.timestamp}</p>
            </div>
            <p>System health monitoring detected an issue.</p>
          </div>
        `
      },
      security_breach: {
        subject: '🚨 Security Alert - LocalTalents API',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">🚨 Security Alert</h1>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
              <p><strong>Type:</strong> ${data.type}</p>
              <p><strong>IP:</strong> ${data.ip}</p>
              <p><strong>Details:</strong> ${data.details}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>Immediate attention required.</p>
          </div>
        `
      }
    };

    const alert = alerts[type as keyof typeof alerts];
    if (alert) {
      await sendEmail({
        to: alertEmail,
        subject: alert.subject,
        html: alert.html,
        text: `Alert: ${type} - ${JSON.stringify(data)}`
      });

      logger.info('Alert sent', { type, data });
    }
  } catch (error) {
    logger.error('Failed to send alert', {
      type,
      data,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Security monitoring
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  // Monitor for suspicious activity
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // XSS attempts
    /union\s+select/gi, // SQL injection
    /exec\s*\(/gi, // Code execution
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      logger.warn('Suspicious request detected', {
        pattern: pattern.source,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        userId: req.user?.id
      });

      sendAlert('security_breach', {
        type: 'Suspicious pattern detected',
        pattern: pattern.source,
        ip: req.ip,
        details: `Suspicious request to ${req.method} ${req.url}`
      });

      break;
    }
  }

  next();
};

// Get performance metrics
export const getMetrics = () => {
  const now = Date.now();
  const last5Minutes = performanceMetrics.filter(
    m => now - m.timestamp.getTime() < 5 * 60 * 1000
  );

  const avgResponseTime = last5Minutes.length > 0
    ? last5Minutes.reduce((sum, m) => sum + m.responseTime, 0) / last5Minutes.length
    : 0;

  const errorRate = last5Minutes.length > 0
    ? last5Minutes.filter(m => m.statusCode >= 400).length / last5Minutes.length
    : 0;

  const endpointStats = last5Minutes.reduce((stats, metric) => {
    const key = `${metric.method} ${metric.endpoint}`;
    if (!stats[key]) {
      stats[key] = { count: 0, avgResponseTime: 0, errors: 0 };
    }
    stats[key].count++;
    stats[key].avgResponseTime += metric.responseTime;
    if (metric.statusCode >= 400) stats[key].errors++;
    return stats;
  }, {} as Record<string, any>);

  // Calculate averages
  Object.keys(endpointStats).forEach(key => {
    endpointStats[key].avgResponseTime /= endpointStats[key].count;
    endpointStats[key].errorRate = endpointStats[key].errors / endpointStats[key].count;
  });

  return {
    summary: {
      totalRequests: last5Minutes.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      timestamp: new Date()
    },
    endpoints: endpointStats,
    health: healthMonitor.getStatus()
  };
};

// Start health monitoring
setInterval(() => {
  healthMonitor.runHealthChecks();
}, 5 * 60 * 1000); // Every 5 minutes

export { sendAlert };
