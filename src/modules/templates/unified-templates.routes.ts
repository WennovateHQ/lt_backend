import { Router } from 'express';
import { UnifiedTemplatesController } from './unified-templates.controller';
import { UnifiedTemplatesService } from './unified-templates.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads (import/export)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize service and controller
const unifiedTemplatesService = new UnifiedTemplatesService();
const unifiedTemplatesController = new UnifiedTemplatesController(unifiedTemplatesService);

// All routes require authentication
router.use(authenticate);

// Core CRUD operations (unified API matching frontend expectations)
router.get('/', 
  rateLimiters.api,
  unifiedTemplatesController.getTemplates
);

router.get('/:templateId', 
  rateLimiters.api,
  unifiedTemplatesController.getTemplate
);

router.post('/', 
  rateLimiters.api,
  unifiedTemplatesController.createTemplate
);

router.put('/:templateId', 
  rateLimiters.api,
  unifiedTemplatesController.updateTemplate
);

router.delete('/:templateId', 
  rateLimiters.api,
  unifiedTemplatesController.deleteTemplate
);

router.post('/:templateId/duplicate', 
  rateLimiters.api,
  unifiedTemplatesController.duplicateTemplate
);

// Template usage and interaction
router.post('/:templateId/generate', 
  rateLimiters.api,
  unifiedTemplatesController.generateFromTemplate
);

router.post('/:templateId/use', 
  rateLimiters.api,
  unifiedTemplatesController.useTemplate
);

router.get('/:templateId/usage', 
  rateLimiters.api,
  unifiedTemplatesController.getTemplateUsage
);

router.post('/:templateId/rate', 
  rateLimiters.api,
  unifiedTemplatesController.rateTemplate
);

// User templates and favorites
router.get('/my', 
  rateLimiters.api,
  unifiedTemplatesController.getMyTemplates
);

router.get('/favorites', 
  rateLimiters.api,
  unifiedTemplatesController.getFavoriteTemplates
);

router.post('/:templateId/favorite', 
  rateLimiters.api,
  unifiedTemplatesController.addToFavorites
);

router.delete('/:templateId/favorite', 
  rateLimiters.api,
  unifiedTemplatesController.removeFromFavorites
);

// Discovery and suggestions
router.get('/categories', 
  rateLimiters.api,
  unifiedTemplatesController.getTemplateCategories
);

router.post('/suggestions', 
  rateLimiters.api,
  unifiedTemplatesController.getSuggestedTemplates
);

router.get('/popular', 
  rateLimiters.api,
  unifiedTemplatesController.getPopularTemplates
);

// Template validation and processing
router.post('/validate', 
  rateLimiters.api,
  unifiedTemplatesController.validateTemplate
);

router.post('/extract-variables', 
  rateLimiters.api,
  unifiedTemplatesController.extractVariables
);

// Bulk operations
router.post('/bulk-update', 
  rateLimiters.api,
  unifiedTemplatesController.bulkUpdateTemplates
);

router.post('/bulk-delete', 
  rateLimiters.api,
  unifiedTemplatesController.bulkDeleteTemplates
);

// Import/Export
router.post('/export', 
  rateLimiters.api,
  unifiedTemplatesController.exportTemplates
);

router.post('/import', 
  rateLimiters.upload,
  upload.single('file'),
  unifiedTemplatesController.importTemplates
);

// Analytics
router.get('/analytics', 
  rateLimiters.api,
  unifiedTemplatesController.getTemplateAnalytics
);

// Admin moderation
router.post('/:templateId/moderate', 
  authorize('ADMIN'),
  rateLimiters.api,
  unifiedTemplatesController.moderateTemplate
);

router.get('/admin/flagged', 
  authorize('ADMIN'),
  rateLimiters.api,
  unifiedTemplatesController.getFlaggedTemplates
);

router.get('/admin/reports', 
  authorize('ADMIN'),
  rateLimiters.api,
  unifiedTemplatesController.getTemplateReports
);

export { router as unifiedTemplatesRoutes };
