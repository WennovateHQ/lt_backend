import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate, authorize, optionalAuth } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { UserType } from '@prisma/client';

const router = Router();
const projectsController = new ProjectsController();

// Public routes (no authentication required)
router.get('/search', 
  rateLimiters.search,
  optionalAuth,
  projectsController.searchProjects
);

router.get('/business/:businessId', 
  rateLimiters.api,
  optionalAuth,
  projectsController.getBusinessProjects
);

router.get('/:projectId', 
  rateLimiters.api,
  optionalAuth,
  projectsController.getProject
);

// Protected routes (authentication required)
router.use(authenticate);

// Business user routes
router.post('/', 
  authorize(UserType.BUSINESS),
  rateLimiters.projectCreation,
  projectsController.createProject
);

router.get('/my/projects', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.getMyProjects
);

router.put('/:projectId', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.updateProject
);

router.patch('/:projectId/status', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.updateProjectStatus
);

router.delete('/:projectId', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.deleteProject
);

// Convenience endpoints for status changes
router.post('/:projectId/publish', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.publishProject
);

router.post('/:projectId/cancel', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.cancelProject
);

router.post('/:projectId/complete', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  projectsController.completeProject
);

// Talent user routes
router.get('/recommended/for-me', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  projectsController.getRecommendedProjects
);

// Admin routes
router.get('/admin/stats', 
  authorize(UserType.ADMIN),
  rateLimiters.api,
  projectsController.getProjectStats
);

export { router as projectsRoutes };
