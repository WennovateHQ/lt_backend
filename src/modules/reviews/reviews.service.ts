import { PrismaClient, ReviewType } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/utils/app-error';
import { CreateReviewDTO, UpdateReviewDTO, ReviewFilters, ReviewResponseDTO } from './reviews.types';

export class ReviewsService {
  constructor(private prisma: PrismaClient) {}

  async createReview(data: CreateReviewDTO, reviewerId: string) {
    // Verify the contract exists and is completed
    const contract = await this.prisma.contract.findUnique({
      where: { id: data.contractId },
      include: {
        business: true,
        talent: true
      }
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    if (contract.status !== 'COMPLETED') {
      throw new ValidationError('Can only review completed contracts');
    }

    // Determine review type and reviewee based on reviewer
    let reviewType: ReviewType;
    let revieweeId: string;

    if (contract.businessId === reviewerId) {
      reviewType = 'BUSINESS_TO_TALENT';
      revieweeId = contract.talentId;
    } else if (contract.talentId === reviewerId) {
      reviewType = 'TALENT_TO_BUSINESS';
      revieweeId = contract.businessId;
    } else {
      throw new ForbiddenError('You can only review contracts you are part of');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: {
        contractId: data.contractId,
        reviewerId,
        reviewType
      }
    });

    if (existingReview) {
      throw new ValidationError('You have already reviewed this contract');
    }

    const review = await this.prisma.review.create({
      data: {
        contractId: data.contractId,
        reviewerId,
        revieweeId,
        reviewType,
        rating: data.overallRating, // Main rating field
        overallRating: data.overallRating,
        qualityRating: data.qualityRating,
        communicationRating: data.communicationRating,
        timelinessRating: data.timelinessRating,
        comment: data.comment,
        isPublic: data.isPublic ?? true
      },
      include: {
        reviewer: {
          include: { profile: true }
        },
        reviewee: {
          include: { profile: true }
        },
        contract: {
          include: { project: true }
        }
      }
    });

    // Update user's average ratings
    await this.updateUserRatings(revieweeId);

    return review;
  }

  async getReview(reviewId: string, userId?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          include: { profile: true }
        },
        reviewee: {
          include: { profile: true }
        },
        contract: {
          include: { project: true }
        },
        response: true
      }
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // If review is private, only allow access to involved parties
    if (!review.isPublic && userId) {
      if (review.reviewerId !== userId && review.revieweeId !== userId) {
        throw new ForbiddenError('This review is private');
      }
    }

    return review;
  }

  async updateReview(reviewId: string, data: UpdateReviewDTO, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Only reviewer can update their review
    if (review.reviewerId !== userId) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    // Can only update within 30 days of creation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (review.createdAt < thirtyDaysAgo) {
      throw new ValidationError('Reviews can only be updated within 30 days of creation');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        overallRating: data.overallRating,
        qualityRating: data.qualityRating,
        communicationRating: data.communicationRating,
        timelinessRating: data.timelinessRating,
        comment: data.comment,
        isPublic: data.isPublic
      },
      include: {
        reviewer: {
          include: { profile: true }
        },
        reviewee: {
          include: { profile: true }
        },
        contract: {
          include: { project: true }
        },
        response: true
      }
    });

    // Update user's average ratings
    await this.updateUserRatings(review.revieweeId);

    return updatedReview;
  }

  async respondToReview(reviewId: string, data: ReviewResponseDTO, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { response: true }
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // Only reviewee can respond
    if (review.revieweeId !== userId) {
      throw new ForbiddenError('You can only respond to reviews about you');
    }

    if (review.response) {
      throw new ValidationError('You have already responded to this review');
    }

    const response = await this.prisma.reviewResponse.create({
      data: {
        reviewId,
        responderId: userId,
        response: data.response
      }
    });

    return response;
  }

  async getUserReviews(userId: string, filters: ReviewFilters = {}) {
    const where: any = {
      revieweeId: userId,
      isPublic: true
    };

    if (filters.contractId) {
      where.contractId = filters.contractId;
    }

    if (filters.reviewType) {
      where.reviewType = filters.reviewType;
    }

    if (filters.minRating) {
      where.overallRating = { gte: filters.minRating };
    }

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        reviewer: {
          include: { profile: true }
        },
        contract: {
          include: { project: true }
        },
        response: true
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0
    });

    return reviews;
  }

  async getMyReviews(userId: string, type: 'given' | 'received' = 'received') {
    const where = type === 'given' 
      ? { reviewerId: userId }
      : { revieweeId: userId };

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        reviewer: {
          include: { profile: true }
        },
        reviewee: {
          include: { profile: true }
        },
        contract: {
          include: { project: true }
        },
        response: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return reviews;
  }

  async getUserRatingsSummary(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        isPublic: true
      }
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        averageQuality: 0,
        averageCommunication: 0,
        averageTimeliness: 0,
        ratingDistribution: {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        }
      };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;
    const averageQuality = reviews.reduce((sum, r) => sum + (r.qualityRating || 0), 0) / totalReviews;
    const averageCommunication = reviews.reduce((sum, r) => sum + (r.communicationRating || 0), 0) / totalReviews;
    const averageTimeliness = reviews.reduce((sum, r) => sum + (r.timelinessRating || 0), 0) / totalReviews;

    const ratingDistribution = reviews.reduce((dist, review) => {
      const rating = Math.floor(review.overallRating);
      dist[rating] = (dist[rating] || 0) + 1;
      return dist;
    }, {} as Record<number, number>);

    // Ensure all ratings 1-5 are represented
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) ratingDistribution[i] = 0;
    }

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      averageQuality: Math.round(averageQuality * 10) / 10,
      averageCommunication: Math.round(averageCommunication * 10) / 10,
      averageTimeliness: Math.round(averageTimeliness * 10) / 10,
      ratingDistribution
    };
  }

  async getPendingReviews(userId: string) {
    // Get completed contracts where user hasn't left a review yet
    const completedContracts = await this.prisma.contract.findMany({
      where: {
        OR: [
          { businessId: userId },
          { talentId: userId }
        ],
        status: 'COMPLETED'
      },
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        reviews: {
          where: { reviewerId: userId }
        }
      }
    });

    // Filter out contracts where user has already left a review
    const pendingReviews = completedContracts.filter(contract => 
      contract.reviews.length === 0
    );

    return pendingReviews;
  }

  private async updateUserRatings(userId: string) {
    const summary = await this.getUserRatingsSummary(userId);
    
    // Note: averageRating and totalReviews fields don't exist on Profile model
    // This would need to be added to the schema or calculated on-demand
    // For now, just calculate the summary without persisting
    return summary;
  }

  async flagReview(reviewId: string, reason: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (!review.isPublic) {
      throw new ValidationError('Cannot flag a non-public review');
    }

    // Check if already flagged by this user
    const existingFlag = await this.prisma.reviewFlag.findFirst({
      where: {
        reviewId,
        flaggedById: userId
      }
    });

    if (existingFlag) {
      throw new ValidationError('You have already flagged this review');
    }

    const flag = await this.prisma.reviewFlag.create({
      data: {
        reviewId,
        flaggedById: userId,
        reason
      }
    });

    return flag;
  }
}
