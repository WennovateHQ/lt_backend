import { Router } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { prisma } from '@/config/database';

const router = Router();

// Initialize service and controller
const adminService = new AdminService(prisma);
const adminController = new AdminController(adminService);

// All admin routes require authentication and admin authorization
router.use(authenticate);
router.use(authorize('ADMIN'));

// Admin statistics and overview
router.get('/stats/overview', 
  rateLimiters.api,
  adminController.getAdminStats
);

// User management
router.get('/users/management', 
  rateLimiters.api,
  adminController.getUserManagement
);

router.post('/users/:userId/suspend', 
  rateLimiters.api,
  adminController.suspendUser
);

router.post('/users/:userId/verify', 
  rateLimiters.api,
  adminController.verifyUser
);

// Platform health and monitoring
router.get('/platform/health', 
  rateLimiters.api,
  adminController.getPlatformHealth
);

router.get('/system/info', 
  rateLimiters.api,
  adminController.getSystemInfo
);

// Reports and analytics
router.post('/reports/generate', 
  rateLimiters.admin,
  adminController.generateReport
);

// Announcements
router.post('/announcements', 
  rateLimiters.api,
  adminController.createAnnouncement
);

// System maintenance
router.post('/system/clear-cache', 
  rateLimiters.api,
  adminController.clearCache
);

router.post('/system/backup-database', 
  rateLimiters.api,
  adminController.backupDatabase
);

export { router as adminRoutes };
