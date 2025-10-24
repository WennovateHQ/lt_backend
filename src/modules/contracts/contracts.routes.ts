import { Router } from 'express';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { rateLimiters } from '../../shared/middleware/rate-limiter';
import { prisma } from '../../config/database';

const router = Router();

// Initialize service and controller
const contractsService = new ContractsService(prisma);
const contractsController = new ContractsController(contractsService);

// Apply authentication to all routes
router.use(authenticate);

// Contract routes
router.post(
  '/',
  rateLimiters.projectCreation,
  authorize('BUSINESS'),
  contractsController.createContract
);

router.get(
  '/my/contracts',
  rateLimiters.api,
  contractsController.getMyContracts
);

router.get(
  '/stats',
  rateLimiters.api,
  contractsController.getContractStats
);

router.get(
  '/:contractId',
  rateLimiters.api,
  contractsController.getContract
);

router.put(
  '/:contractId',
  rateLimiters.api,
  authorize('BUSINESS'),
  contractsController.updateContract
);

router.post(
  '/:contractId/sign',
  rateLimiters.api,
  contractsController.signContract
);

// Milestone routes
router.post(
  '/:contractId/milestones',
  rateLimiters.api,
  authorize('BUSINESS'),
  contractsController.createMilestone
);

router.put(
  '/milestones/:milestoneId',
  rateLimiters.api,
  authorize('BUSINESS'),
  contractsController.updateMilestone
);

router.post(
  '/milestones/:milestoneId/submit',
  rateLimiters.api,
  authorize('TALENT'),
  contractsController.submitMilestone
);

router.post(
  '/milestones/:milestoneId/approve',
  rateLimiters.api,
  authorize('BUSINESS'),
  contractsController.approveMilestone
);

export default router;
