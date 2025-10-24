import { Response } from 'express';
import { ReviewsService } from './reviews.service';
import { 
  CreateReviewSchema, 
  UpdateReviewSchema,
  ReviewResponseSchema,
  ReviewFiltersSchema,
  FlagReviewSchema
} from './reviews.types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { ValidationError } from '../../shared/utils/app-error';
import { AuthRequest } from '../../shared/middleware/auth';

export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = CreateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid review data', validation.error.errors);
    }

    const review = await this.reviewsService.createReview(
      validation.data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: { review },
      message: 'Review created successfully'
    });
  });

  getReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }
    
    const review = await this.reviewsService.getReview(reviewId);

    return res.json({
      success: true,
      data: { review }
    });
  });

  updateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }
    const validation = UpdateReviewSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid review data', validation.error.errors);
    }

    const review = await this.reviewsService.updateReview(
      reviewId,
      validation.data,
      req.user!.id
    );

    return res.json({
      success: true,
      data: { review },
      message: 'Review updated successfully'
    });
  });

  respondToReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }
    const validation = ReviewResponseSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid response data', validation.error.errors);
    }

    const response = await this.reviewsService.respondToReview(
      reviewId,
      validation.data,
      req.user!.id
    );

    return res.status(201).json({
      success: true,
      data: { response },
      message: 'Response added successfully'
    });
  });

  getUserReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const validation = ReviewFiltersSchema.safeParse(req.query);
    
    if (!validation.success) {
      throw new ValidationError('Invalid filter parameters', validation.error.errors);
    }

    const reviews = await this.reviewsService.getUserReviews(userId, validation.data);

    return res.json({
      success: true,
      data: { reviews }
    });
  });

  getMyReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type } = req.query;
    
    const reviews = await this.reviewsService.getMyReviews(
      req.user!.id,
      type as 'given' | 'received'
    );

    return res.json({
      success: true,
      data: { reviews }
    });
  });

  getUserRatingsSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const summary = await this.reviewsService.getUserRatingsSummary(userId);

    return res.json({
      success: true,
      data: { summary }
    });
  });

  getPendingReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const pendingReviews = await this.reviewsService.getPendingReviews(req.user!.id);

    return res.json({
      success: true,
      data: { pendingReviews }
    });
  });

  flagReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }
    const validation = FlagReviewSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid flag data', validation.error.errors);
    }

    const flag = await this.reviewsService.flagReview(
      reviewId,
      validation.data.reason,
      req.user!.id
    );

    return res.status(201).json({
      success: true,
      data: { flag },
      message: 'Review flagged successfully'
    });
  });
}
