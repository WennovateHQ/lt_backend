import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { prisma } from '@/config/database';

const router = Router();

// Initialize service and controller
const analyticsService = new AnalyticsService(prisma);
const analyticsController = new AnalyticsController(analyticsService);

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorize('ADMIN'));

// Quality Metrics
router.get('/quality/metrics', 
  rateLimiters.api,
  analyticsController.getQualityMetrics
);

// Performance Dashboard
router.get('/performance/dashboard', 
  rateLimiters.api,
  analyticsController.getPerformanceDashboard
);

// User Behavior Analytics
router.get('/user/behavior', 
  rateLimiters.api,
  analyticsController.getUserBehaviorAnalytics
);

// Financial Reports
router.get('/financial/reports', 
  rateLimiters.api,
  analyticsController.getFinancialReports
);

// Platform Insights
router.get('/platform/insights', 
  rateLimiters.api,
  analyticsController.getPlatformInsights
);

// Custom Reports
router.post('/reports/custom', 
  rateLimiters.api,
  analyticsController.createCustomReport
);

router.post('/reports/:reportId/generate', 
  rateLimiters.api,
  analyticsController.generateReport
);

// Export Analytics
router.post('/export', 
  rateLimiters.api,
  analyticsController.exportAnalytics
);

// Utility Endpoints
router.get('/overview', 
  rateLimiters.api,
  analyticsController.getOverviewStats
);

router.get('/realtime', 
  rateLimiters.api,
  analyticsController.getRealtimeMetrics
);

router.get('/health', 
  rateLimiters.api,
  analyticsController.getHealthCheck
);

export { router as analyticsRoutes };
