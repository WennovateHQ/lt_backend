import { Router } from 'express';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { authenticate, optionalAuth } from '../../shared/middleware/auth';
import { apiLimiter } from '../../shared/middleware/rate-limiter';
import { prisma } from '../../config/database';

const router = Router();

// Initialize service and controller
const reviewsService = new ReviewsService(prisma);
const reviewsController = new ReviewsController(reviewsService);

// Public routes (no authentication required)
router.get(
  '/user/:userId',
  optionalAuth,
  apiLimiter,
  reviewsController.getUserReviews
);

router.get(
  '/user/:userId/summary',
  apiLimiter,
  reviewsController.getUserRatingsSummary
);

router.get(
  '/:reviewId',
  optionalAuth,
  apiLimiter,
  reviewsController.getReview
);

// Protected routes (authentication required)
router.use(authenticate);

router.post(
  '/',
  apiLimiter,
  reviewsController.createReview
);

router.get(
  '/my/reviews',
  apiLimiter,
  reviewsController.getMyReviews
);

router.get(
  '/my/pending',
  apiLimiter,
  reviewsController.getPendingReviews
);

router.put(
  '/:reviewId',
  apiLimiter,
  reviewsController.updateReview
);

router.post(
  '/:reviewId/respond',
  apiLimiter,
  reviewsController.respondToReview
);

router.post(
  '/:reviewId/flag',
  apiLimiter,
  reviewsController.flagReview
);

export default router;
