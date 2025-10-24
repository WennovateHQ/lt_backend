import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate, authorize } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';
import { UserType } from '@prisma/client';

const router = Router();
const paymentsController = new PaymentsController();

// Webhook endpoint (no authentication required)
router.post('/webhook/stripe', 
  paymentsController.handleStripeWebhook
);

// Utility endpoints (no authentication required)
router.get('/calculate-fees', 
  rateLimiters.api,
  paymentsController.calculateFees
);

// All other routes require authentication
router.use(authenticate);

// Talent routes - Connect account management
router.post('/connect/account', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  paymentsController.createConnectAccount
);

router.get('/connect/status', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  paymentsController.getConnectAccountStatus
);

router.post('/connect/account/:accountId/link', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  paymentsController.createConnectAccountLink
);

// Business routes - Payment processing
router.post('/intent', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  paymentsController.createPaymentIntent
);

// Shared routes - Payment history and details
router.get('/', 
  rateLimiters.api,
  paymentsController.getMyPayments
);

router.get('/history', 
  rateLimiters.api,
  paymentsController.getMyPayments
);

router.get('/my/payments', 
  rateLimiters.api,
  paymentsController.getMyPayments
);

router.get('/contract/:contractId', 
  rateLimiters.api,
  paymentsController.getContractPayments
);

// IMPORTANT: Specific routes MUST come before wildcard /:paymentId route
router.get('/tax-documents', 
  rateLimiters.api,
  paymentsController.getTaxDocuments
);

router.get('/receipts/:receiptId', 
  rateLimiters.api,
  paymentsController.getPaymentReceipt
);

router.get('/my/payment-methods', 
  rateLimiters.api,
  paymentsController.getPaymentMethods
);

// Wildcard route must be LAST to avoid catching specific routes
router.get('/:paymentId', 
  rateLimiters.api,
  paymentsController.getPayment
);

router.post('/setup-bank-account', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  paymentsController.setupBankAccount
);

// Escrow and milestone payments (missing from frontend mapping)
router.post('/escrow/fund', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  paymentsController.fundEscrow
);

router.post('/milestone/release', 
  authorize(UserType.BUSINESS),
  rateLimiters.api,
  paymentsController.releaseMilestonePayment
);

router.post('/withdraw', 
  authorize(UserType.TALENT),
  rateLimiters.api,
  paymentsController.withdrawFunds
);

// TEST HELPER: Fund platform account (development only)
router.post('/test/fund-platform', 
  rateLimiters.api,
  paymentsController.testFundPlatformAccount
);

// Admin routes
router.get('/admin/stats', 
  authorize(UserType.ADMIN),
  rateLimiters.api,
  paymentsController.getPaymentStats
);

export { router as paymentsRoutes };
