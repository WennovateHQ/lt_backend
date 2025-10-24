import { Router } from 'express';
import { MatchingController } from './matching.controller';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { UserType } from '@prisma/client';

const router = Router();
const matchingController = new MatchingController();

// All routes require authentication
router.use(authenticate);

// Business routes - find talent for projects
router.get('/project/:projectId/talent', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  matchingController.findTalentForProject
);

// Talent routes - find projects for talent
router.get('/talent/projects', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  matchingController.findProjectsForTalent
);

// Match explanation (both business and talent can use this)
router.get('/project/:projectId/talent/:talentId/explain', 
  rateLimiters.api,
  matchingController.explainMatch
);

// Add missing save talent functionality
router.post('/save-talent', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  matchingController.saveTalent
);

router.get('/saved-talents', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  matchingController.getSavedTalents
);

router.delete('/saved-talents/:talentId', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  matchingController.removeSavedTalent
);

// Admin routes
router.get('/admin/stats', 
  authorize(UserType.ADMIN),
  rateLimiters.api,
  matchingController.getMatchingStats
);

export { router as matchingRoutes };
