import { z } from 'zod';
import { ReviewType } from '@prisma/client';

// Review DTOs
export const CreateReviewSchema = z.object({
  contractId: z.string().cuid(),
  overallRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  timelinessRating: z.number().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000),
  isPublic: z.boolean().optional().default(true)
});

export const UpdateReviewSchema = z.object({
  overallRating: z.number().min(1).max(5).optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  timelinessRating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000).optional(),
  isPublic: z.boolean().optional()
});

export const ReviewResponseSchema = z.object({
  response: z.string().min(1, 'Response is required').max(500)
});

export const ReviewFiltersSchema = z.object({
  contractId: z.string().cuid().optional(),
  reviewType: z.enum(['BUSINESS_TO_TALENT', 'TALENT_TO_BUSINESS']).optional(),
  minRating: z.number().min(1).max(5).optional(),
  limit: z.number().int().positive().max(50).optional(),
  offset: z.number().int().min(0).optional()
});

export const FlagReviewSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(200)
});

// Type exports
export type CreateReviewDTO = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewDTO = z.infer<typeof UpdateReviewSchema>;
export type ReviewResponseDTO = z.infer<typeof ReviewResponseSchema>;
export type ReviewFilters = z.infer<typeof ReviewFiltersSchema>;
export type FlagReviewDTO = z.infer<typeof FlagReviewSchema>;

// Response types
export interface ReviewWithDetails {
  id: string;
  overallRating: number;
  qualityRating: number;
  communicationRating: number;
  timelinessRating: number;
  comment: string;
  isPublic: boolean;
  reviewType: ReviewType;
  createdAt: Date;
  updatedAt: Date;
  reviewer: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
      companyName?: string;
      title?: string;
    };
  };
  reviewee: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
      companyName?: string;
      title?: string;
    };
  };
  contract: {
    id: string;
    title: string;
    totalAmount: number;
    project: {
      id: string;
      title: string;
    };
  };
  response?: {
    id: string;
    response: string;
    createdAt: Date;
  };
}

export interface UserRatingsSummary {
  totalReviews: number;
  averageRating: number;
  averageQuality: number;
  averageCommunication: number;
  averageTimeliness: number;
  ratingDistribution: Record<number, number>;
}

export interface PendingReviewContract {
  id: string;
  title: string;
  totalAmount: number;
  completedAt: Date;
  business: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      companyName?: string;
    };
  };
  talent: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      title?: string;
    };
  };
  project: {
    id: string;
    title: string;
  };
}
