import { z } from 'zod';
import { prisma } from '@/config/database';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';
import { UserType, UserStatus } from '@prisma/client';
import { toNumber } from '@/shared/utils/decimal-converter';

// Validation schemas
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  displayName: z.string().optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  avatar: z.string().nullable().optional(),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional(),
  // Business specific
  companyName: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  // Talent specific
  title: z.string().optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  // Note: availability is now a relation, not a simple field - use separate endpoint
});

export const updateLocationSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  country: z.string().default('Canada'),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const addSkillSchema = z.object({
  skillId: z.string().min(1, 'Skill ID is required'),
  level: z.number().min(1).max(5, 'Skill level must be between 1 and 5'),
  experience: z.number().min(0, 'Experience must be positive').optional(),
});

// Types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;

export interface UserProfile {
  id: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    bio: string | null;
    avatar: string | null;
    phone: string | null;
    website: string | null;
    companyName: string | null;
    companySize: string | null;
    industry: string | null;
    title: string | null;
    hourlyRate: number | null;
    availability: string | null;
    location: {
      id: string;
      street: string | null;
      city: string;
      province: string;
      country: string;
      postalCode: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
    skills: Array<{
      id: string;
      level: number;
      experience: number | null;
      skill: {
        id: string;
        name: string;
        category: string;
        description: string | null;
      };
    }>;
  } | null;
}

export class UsersService {
  // Get user profile by ID
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            location: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    return user as UserProfile;
  }

  // Get public user profile (limited information)
  async getPublicProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userType: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            bio: true,
            avatar: true,
            phone: true,
            website: true,
            companyName: true,
            companySize: true,
            industry: true,
            title: true,
            hourlyRate: true,
            location: {
              select: {
                city: true,
                province: true,
                country: true,
              },
            },
            skills: {
              select: {
                level: true,
                experience: true,
                skill: {
                  select: {
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Convert Decimal fields
    return {
      ...user,
      profile: user.profile ? {
        ...user.profile,
        hourlyRate: toNumber(user.profile.hourlyRate),
        availability: null, // Not fetched (is a relation)
      } : null
    };
  }

  // Update user profile
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const validatedInput = updateProfileSchema.parse(input);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Update profile
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: validatedInput.firstName || '',
        lastName: validatedInput.lastName || '',
        ...validatedInput,
      },
      update: validatedInput,
    });

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(validatedInput),
    });

    // Return updated user profile
    return this.getUserProfile(userId);
  }

  // Update user location
  async updateLocation(userId: string, input: UpdateLocationInput): Promise<UserProfile> {
    const validatedInput = updateLocationSchema.parse(input);

    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('User profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Update or create location
    await prisma.location.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        ...validatedInput,
      },
      update: validatedInput,
    });

    logger.info('User location updated', {
      userId,
      city: validatedInput.city,
      province: validatedInput.province,
    });

    return this.getUserProfile(userId);
  }

  // Add skill to user profile
  async addSkill(userId: string, input: AddSkillInput): Promise<UserProfile> {
    const validatedInput = addSkillSchema.parse(input);

    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('User profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: validatedInput.skillId },
    });

    if (!skill) {
      throw new AppError('Skill not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if user already has this skill
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId: validatedInput.skillId,
        },
      },
    });

    if (existingUserSkill) {
      throw new AppError('Skill already added to profile', 409, ErrorCodes.ALREADY_EXISTS);
    }

    // Add skill to user profile
    await prisma.userSkill.create({
      data: {
        profileId: profile.id,
        skillId: validatedInput.skillId,
        level: validatedInput.level,
        experience: validatedInput.experience,
      },
    });

    logger.info('Skill added to user profile', {
      userId,
      skillId: validatedInput.skillId,
      level: validatedInput.level,
    });

    return this.getUserProfile(userId);
  }

  // Remove skill from user profile
  async removeSkill(userId: string, skillId: string): Promise<UserProfile> {
    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('User profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if user has this skill
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId,
        },
      },
    });

    if (!userSkill) {
      throw new AppError('Skill not found in user profile', 404, ErrorCodes.NOT_FOUND);
    }

    // Remove skill from user profile
    await prisma.userSkill.delete({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId,
        },
      },
    });

    logger.info('Skill removed from user profile', {
      userId,
      skillId,
    });

    return this.getUserProfile(userId);
  }

  // Update skill level
  async updateSkill(userId: string, skillId: string, input: Partial<AddSkillInput>): Promise<UserProfile> {
    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('User profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if user has this skill
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId,
        },
      },
    });

    if (!userSkill) {
      throw new AppError('Skill not found in user profile', 404, ErrorCodes.NOT_FOUND);
    }

    // Update skill
    await prisma.userSkill.update({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId,
        },
      },
      data: {
        level: input.level,
        experience: input.experience,
      },
    });

    logger.info('User skill updated', {
      userId,
      skillId,
      level: input.level,
      experience: input.experience,
    });

    return this.getUserProfile(userId);
  }

  // Search users (for admin or matching purposes)
  async searchUsers(query: {
    userType?: UserType;
    city?: string;
    province?: string;
    skills?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ users: Partial<UserProfile>[]; total: number }> {
    const { userType, city, province, skills, limit = 20, offset = 0 } = query;

    const where: any = {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    };

    if (userType) {
      where.userType = userType;
    }

    if (city || province) {
      where.profile = {
        location: {
          ...(city && { city: { contains: city, mode: 'insensitive' } }),
          ...(province && { province: { contains: province, mode: 'insensitive' } }),
        },
      };
    }

    if (skills && skills.length > 0) {
      where.profile = {
        ...where.profile,
        skills: {
          some: {
            skill: {
              id: { in: skills },
            },
          },
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          userType: true,
          createdAt: true,
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              bio: true,
              avatar: true,
              phone: true,
              website: true,
              companyName: true,
              companySize: true,
              industry: true,
              title: true,
              hourlyRate: true,
              location: {
                select: {
                  city: true,
                  province: true,
                  country: true,
                },
              },
              skills: {
                select: {
                  level: true,
                  experience: true,
                  skill: {
                    select: {
                      name: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedUsers = users.map(user => ({
      ...user,
      profile: user.profile ? {
        ...user.profile,
        hourlyRate: toNumber(user.profile.hourlyRate),
      } : null
    }));

    return { users: convertedUsers as any[], total };
  }

  // Get user statistics (for admin dashboard)
  async getUserStats(): Promise<{
    total: number;
    byType: Record<UserType, number>;
    byStatus: Record<UserStatus, number>;
    recentRegistrations: number;
  }> {
    const [total, byType, byStatus, recentRegistrations] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['userType'],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.userType] = item._count;
      return acc;
    }, {} as Record<UserType, number>);

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<UserStatus, number>);

    return {
      total,
      byType: typeStats,
      byStatus: statusStats,
      recentRegistrations,
    };
  }

  // Portfolio management methods for talent users
  async addPortfolioItem(userId: string, portfolioData: {
    title: string;
    description: string;
    projectUrl?: string;
    imageUrl?: string;
    technologies?: string[];
    completedAt?: Date;
  }) {
    // Verify user is a talent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });

    if (!user || user.userType !== UserType.TALENT) {
      throw new AppError('Only talent users can add portfolio items', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        userId,
        title: portfolioData.title,
        description: portfolioData.description,
        projectUrl: portfolioData.projectUrl,
        imageUrl: portfolioData.imageUrl,
        technologies: portfolioData.technologies || [],
        completedAt: portfolioData.completedAt || new Date(),
      },
    });

    logger.info('Portfolio item added', {
      userId,
      portfolioItemId: portfolioItem.id,
      title: portfolioData.title,
    });

    return portfolioItem;
  }

  async updatePortfolioItem(userId: string, portfolioId: string, portfolioData: {
    title?: string;
    description?: string;
    projectUrl?: string;
    imageUrl?: string;
    technologies?: string[];
    completedAt?: Date;
  }) {
    // Verify ownership
    const existingItem = await prisma.portfolioItem.findUnique({
      where: { id: portfolioId },
      select: { userId: true },
    });

    if (!existingItem) {
      throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existingItem.userId !== userId) {
      throw new AppError('Not authorized to update this portfolio item', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    const updatedItem = await prisma.portfolioItem.update({
      where: { id: portfolioId },
      data: {
        ...(portfolioData.title && { title: portfolioData.title }),
        ...(portfolioData.description && { description: portfolioData.description }),
        ...(portfolioData.projectUrl !== undefined && { projectUrl: portfolioData.projectUrl }),
        ...(portfolioData.imageUrl !== undefined && { imageUrl: portfolioData.imageUrl }),
        ...(portfolioData.technologies && { technologies: portfolioData.technologies }),
        ...(portfolioData.completedAt && { completedAt: portfolioData.completedAt }),
      },
    });

    logger.info('Portfolio item updated', {
      userId,
      portfolioItemId: portfolioId,
    });

    return updatedItem;
  }

  async deletePortfolioItem(userId: string, portfolioId: string) {
    // Verify ownership
    const existingItem = await prisma.portfolioItem.findUnique({
      where: { id: portfolioId },
      select: { userId: true },
    });

    if (!existingItem) {
      throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existingItem.userId !== userId) {
      throw new AppError('Not authorized to delete this portfolio item', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    await prisma.portfolioItem.delete({
      where: { id: portfolioId },
    });

    logger.info('Portfolio item deleted', {
      userId,
      portfolioItemId: portfolioId,
    });

    return { message: 'Portfolio item deleted successfully' };
  }

  async getPortfolioItems(userId: string) {
    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    return portfolioItems;
  }
}
