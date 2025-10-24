import { Router } from 'express';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { prisma } from '@/config/database';

const router = Router();

// Initialize service and controller
const disputesService = new DisputesService(prisma);
const disputesController = new DisputesController(disputesService);

// All routes require authentication
router.use(authenticate);

// User routes (both business and talent can create and manage disputes)
router.post('/', 
  rateLimiters.api,
  disputesController.createDispute
);

router.get('/my', 
  rateLimiters.api,
  disputesController.getMyDisputes
);

router.get('/:disputeId', 
  rateLimiters.api,
  disputesController.getDispute
);

router.put('/:disputeId', 
  rateLimiters.api,
  disputesController.updateDispute
);

router.post('/:disputeId/evidence', 
  rateLimiters.api,
  disputesController.addEvidence
);

router.post('/:disputeId/messages', 
  rateLimiters.api,
  disputesController.addMessage
);

// Admin routes
router.get('/admin/all', 
  authorize('ADMIN'),
  rateLimiters.api,
  disputesController.getAllDisputes
);

router.get('/admin/stats', 
  authorize('ADMIN'),
  rateLimiters.api,
  disputesController.getDisputeStats
);

router.patch('/:disputeId/status', 
  authorize('ADMIN'),
  rateLimiters.api,
  disputesController.updateStatus
);

router.post('/:disputeId/resolve', 
  authorize('ADMIN'),
  rateLimiters.api,
  disputesController.resolveDispute
);

export { router as disputesRoutes };
