import { Router } from 'express';
import { SkillsController } from './skills.controller';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';

const router = Router();
const skillsController = new SkillsController();

// Public routes (no authentication required)
router.get('/', 
  rateLimiters.api,
  skillsController.getSkills
);

router.get('/categories', 
  rateLimiters.api,
  skillsController.getCategories
);

router.get('/search', 
  rateLimiters.search,
  skillsController.searchSkills
);

router.get('/popular', 
  rateLimiters.api,
  skillsController.getPopularSkills
);

router.get('/trending', 
  rateLimiters.api,
  skillsController.getTrendingSkills
);

router.get('/:skillId', 
  rateLimiters.api,
  skillsController.getSkillById
);

// Admin routes (authentication and admin role required)
router.use(authenticate);
router.use(authorize('ADMIN'));

router.post('/', 
  rateLimiters.api,
  skillsController.createSkill
);

router.put('/:skillId', 
  rateLimiters.api,
  skillsController.updateSkill
);

router.delete('/:skillId', 
  rateLimiters.api,
  skillsController.deleteSkill
);

router.get('/admin/stats', 
  rateLimiters.api,
  skillsController.getSkillStats
);

router.post('/admin/bulk-import', 
  rateLimiters.api,
  skillsController.bulkImportSkills
);

export { router as skillsRoutes };
