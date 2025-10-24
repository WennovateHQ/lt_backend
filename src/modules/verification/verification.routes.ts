import { Router } from 'express';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { prisma } from '@/config/database';

const router = Router();

// Initialize service and controller
const verificationService = new VerificationService(prisma);
const verificationController = new VerificationController(verificationService);

// All routes require authentication
router.use(authenticate);

// Email Verification
router.post('/email/send', 
  rateLimiters.api,
  verificationController.sendEmailVerification
);

router.post('/email/verify', 
  rateLimiters.api,
  verificationController.verifyEmail
);

router.post('/email/resend', 
  rateLimiters.api,
  verificationController.resendEmailVerification
);

// Phone Verification
router.post('/phone/send', 
  rateLimiters.api,
  verificationController.sendPhoneVerification
);

router.post('/phone/verify', 
  rateLimiters.api,
  verificationController.verifyPhone
);

// Business Verification
router.post('/business/submit', 
  rateLimiters.api,
  authorize('BUSINESS'),
  verificationController.submitBusinessVerification
);

router.get('/business/status', 
  rateLimiters.api,
  authorize('BUSINESS'),
  verificationController.getBusinessVerificationStatus
);

router.put('/business/update', 
  rateLimiters.api,
  authorize('BUSINESS'),
  verificationController.updateBusinessVerification
);

// Identity Verification
router.post('/identity/submit', 
  rateLimiters.api,
  verificationController.submitIdentityVerification
);

router.get('/identity/status', 
  rateLimiters.api,
  verificationController.getIdentityVerificationStatus
);

router.put('/identity/update', 
  rateLimiters.api,
  verificationController.updateIdentityVerification
);

// Document Upload
router.post('/documents/upload', 
  rateLimiters.api,
  verificationController.uploadDocument
);

// User Status
router.get('/status', 
  rateLimiters.api,
  verificationController.getUserVerificationStatus
);

// Admin Routes
router.get('/admin/pending', 
  authorize('ADMIN'),
  rateLimiters.api,
  verificationController.getPendingVerifications
);

router.post('/admin/:verificationId/review', 
  authorize('ADMIN'),
  rateLimiters.api,
  verificationController.reviewVerification
);

router.get('/admin/stats', 
  authorize('ADMIN'),
  rateLimiters.api,
  verificationController.getVerificationStats
);

export { router as verificationRoutes };
