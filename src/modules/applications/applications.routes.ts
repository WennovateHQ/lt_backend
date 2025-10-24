import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';

const router = Router();
const applicationsController = new ApplicationsController();

// All routes require authentication
router.use(authenticate);

// Talent routes
router.post('/', 
  authorize('TALENT'),
  rateLimiters.application,
  applicationsController.createApplication
);

// Fix route difference: frontend expects /applications/my
router.get('/my', 
  authorize('TALENT'),
  rateLimiters.api,
  applicationsController.getMyApplications
);

router.get('/my/applications', 
  authorize('TALENT'),
  rateLimiters.api,
  applicationsController.getMyApplications
);

router.put('/:applicationId', 
  authorize('TALENT'),
  rateLimiters.api,
  applicationsController.updateApplication
);

router.post('/:applicationId/withdraw', 
  authorize('TALENT'),
  rateLimiters.api,
  applicationsController.withdrawApplication
);

// Business routes
router.get('/project/:projectId', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.getProjectApplications
);

// Add missing business applications endpoint
router.get('/business', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.getBusinessApplications
);

router.patch('/:applicationId/status', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.updateApplicationStatus
);

// Add missing /applications/:id/review endpoint (frontend expects this vs PATCH status)
router.post('/:applicationId/review', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.reviewApplication
);

// Convenience endpoints for status changes
router.post('/:applicationId/accept', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.acceptApplication
);

router.post('/:applicationId/reject', 
  authorize('BUSINESS'),
  rateLimiters.api,
  applicationsController.rejectApplication
);

// Shared routes (talent and business can view their own applications)
router.get('/:applicationId', 
  rateLimiters.api,
  applicationsController.getApplication
);

// Utility routes
router.get('/project/:projectId/can-apply', 
  authorize('TALENT'),
  rateLimiters.api,
  applicationsController.canApplyToProject
);

// Admin routes
router.get('/admin/all', 
  authorize('ADMIN'),
  rateLimiters.api,
  applicationsController.getAllApplications
);

router.get('/admin/stats', 
  authorize('ADMIN'),
  rateLimiters.api,
  applicationsController.getApplicationStats
);

export { router as applicationsRoutes };
