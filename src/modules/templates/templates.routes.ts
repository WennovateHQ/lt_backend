import { Router } from 'express';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';

const router = Router();

// Initialize service and controller
const templatesService = new TemplatesService();
const templatesController = new TemplatesController(templatesService);

// All routes require authentication
router.use(authenticate);

// Message Templates
router.get('/messages', 
  rateLimiters.api,
  templatesController.getMessageTemplates
);

router.get('/messages/:templateId', 
  rateLimiters.api,
  templatesController.getMessageTemplate
);

router.post('/messages', 
  rateLimiters.api,
  templatesController.createMessageTemplate
);

router.put('/messages/:templateId', 
  rateLimiters.api,
  templatesController.updateMessageTemplate
);

router.delete('/messages/:templateId', 
  rateLimiters.api,
  templatesController.deleteMessageTemplate
);

// Contract Templates
router.get('/contracts', 
  rateLimiters.api,
  templatesController.getContractTemplates
);

router.get('/contracts/:templateId', 
  rateLimiters.api,
  templatesController.getContractTemplate
);

router.post('/contracts', 
  rateLimiters.api,
  templatesController.createContractTemplate
);

router.put('/contracts/:templateId', 
  rateLimiters.api,
  templatesController.updateContractTemplate
);

// Proposal Templates
router.get('/proposals', 
  rateLimiters.api,
  templatesController.getProposalTemplates
);

router.get('/proposals/:templateId', 
  rateLimiters.api,
  templatesController.getProposalTemplate
);

router.post('/proposals', 
  authorize('TALENT'),
  rateLimiters.api,
  templatesController.createProposalTemplate
);

// Template Generation and Processing
router.post('/generate', 
  rateLimiters.api,
  templatesController.generateFromTemplate
);

router.post('/:templateId/preview', 
  rateLimiters.api,
  templatesController.previewTemplate
);

router.post('/validate/:templateType', 
  rateLimiters.api,
  templatesController.validateTemplate
);

// User Templates
router.get('/my/templates', 
  rateLimiters.api,
  templatesController.getUserTemplates
);

router.post('/:templateId/duplicate', 
  rateLimiters.api,
  templatesController.duplicateTemplate
);

router.post('/:templateId/share', 
  rateLimiters.api,
  templatesController.shareTemplate
);

router.get('/shared', 
  rateLimiters.api,
  templatesController.getSharedTemplates
);

// Admin Routes
router.get('/admin/stats', 
  authorize('ADMIN'),
  rateLimiters.api,
  templatesController.getTemplateStats
);

export { router as templatesRoutes };
