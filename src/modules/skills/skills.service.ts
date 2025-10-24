import { z } from 'zod';
import { prisma } from '@/config/database';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';

// Validation schemas
export const createSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100, 'Skill name too long'),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100, 'Skill name too long').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

// Types
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

export interface SkillWithStats {
  id: string;
  name: string;
  category: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    userSkills: number;
    projectSkills: number;
  };
}

export class SkillsService {
  // Get all skills with optional filtering
  async getSkills(query: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ skills: SkillWithStats[]; total: number }> {
    const { category, search, limit = 50, offset = 0 } = query;

    const where: any = {};

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          _count: {
            select: {
              userSkills: true,
              projectSkills: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.skill.count({ where }),
    ]);

    return { skills, total };
  }

  // Get skill by ID
  async getSkillById(skillId: string): Promise<SkillWithStats> {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
    });

    if (!skill) {
      throw new AppError('Skill not found', 404, ErrorCodes.NOT_FOUND);
    }

    return skill;
  }

  // Get skill categories
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const categories = await prisma.skill.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    return categories.map(cat => ({
      category: cat.category,
      count: cat._count.category,
    }));
  }

  // Create new skill (admin only)
  async createSkill(input: CreateSkillInput): Promise<SkillWithStats> {
    const validatedInput = createSkillSchema.parse(input);

    // Check if skill already exists
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: {
          equals: validatedInput.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSkill) {
      throw new AppError('Skill already exists', 409, ErrorCodes.ALREADY_EXISTS);
    }

    const skill = await prisma.skill.create({
      data: {
        name: validatedInput.name.trim(),
        category: validatedInput.category.trim(),
        description: validatedInput.description?.trim(),
      },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
    });

    logger.info('Skill created', {
      skillId: skill.id,
      name: skill.name,
      category: skill.category,
    });

    return skill;
  }

  // Update skill (admin only)
  async updateSkill(skillId: string, input: UpdateSkillInput): Promise<SkillWithStats> {
    const validatedInput = updateSkillSchema.parse(input);

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      throw new AppError('Skill not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if name is being changed and if it conflicts
    if (validatedInput.name && validatedInput.name !== existingSkill.name) {
      const conflictingSkill = await prisma.skill.findFirst({
        where: {
          name: {
            equals: validatedInput.name,
            mode: 'insensitive',
          },
          id: {
            not: skillId,
          },
        },
      });

      if (conflictingSkill) {
        throw new AppError('Skill name already exists', 409, ErrorCodes.ALREADY_EXISTS);
      }
    }

    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: {
        ...(validatedInput.name && { name: validatedInput.name.trim() }),
        ...(validatedInput.category && { category: validatedInput.category.trim() }),
        ...(validatedInput.description !== undefined && { 
          description: validatedInput.description?.trim() || null 
        }),
      },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
    });

    logger.info('Skill updated', {
      skillId,
      updatedFields: Object.keys(validatedInput),
    });

    return updatedSkill;
  }

  // Delete skill (admin only)
  async deleteSkill(skillId: string): Promise<void> {
    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
    });

    if (!existingSkill) {
      throw new AppError('Skill not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if skill is being used
    if (existingSkill._count.userSkills > 0 || existingSkill._count.projectSkills > 0) {
      throw new AppError(
        'Cannot delete skill that is being used by users or projects',
        400,
        'SKILL_IN_USE'
      );
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    logger.info('Skill deleted', {
      skillId,
      name: existingSkill.name,
    });
  }

  // Get popular skills (most used)
  async getPopularSkills(limit: number = 20): Promise<SkillWithStats[]> {
    const skills = await prisma.skill.findMany({
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
      orderBy: [
        {
          userSkills: {
            _count: 'desc',
          },
        },
        {
          projectSkills: {
            _count: 'desc',
          },
        },
      ],
      take: limit,
    });

    return skills;
  }

  // Get trending skills (recently added to projects)
  async getTrendingSkills(limit: number = 20): Promise<SkillWithStats[]> {
    // Get skills that have been added to projects in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingSkillIds = await prisma.projectSkill.groupBy({
      by: ['skillId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        skillId: true,
      },
      orderBy: {
        _count: {
          skillId: 'desc',
        },
      },
      take: limit,
    });

    if (trendingSkillIds.length === 0) {
      return [];
    }

    const skills = await prisma.skill.findMany({
      where: {
        id: {
          in: trendingSkillIds.map(item => item.skillId),
        },
      },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
    });

    // Sort by trending order
    const skillMap = new Map(skills.map(skill => [skill.id, skill]));
    return trendingSkillIds
      .map(item => skillMap.get(item.skillId))
      .filter(Boolean) as SkillWithStats[];
  }

  // Search skills with autocomplete
  async searchSkills(query: string, limit: number = 10): Promise<SkillWithStats[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const skills = await prisma.skill.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
          {
            name: {
              startsWith: query.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            userSkills: true,
            projectSkills: true,
          },
        },
      },
      orderBy: [
        // Prioritize exact matches
        {
          name: 'asc',
        },
      ],
      take: limit,
    });

    return skills;
  }

  // Get skill statistics
  async getSkillStats(): Promise<{
    totalSkills: number;
    totalCategories: number;
    mostUsedSkill: { name: string; userCount: number } | null;
    recentlyAdded: number;
  }> {
    const [
      totalSkills,
      categories,
      mostUsedSkill,
      recentlyAdded,
    ] = await Promise.all([
      prisma.skill.count(),
      prisma.skill.groupBy({
        by: ['category'],
      }),
      prisma.skill.findFirst({
        include: {
          _count: {
            select: {
              userSkills: true,
            },
          },
        },
        orderBy: {
          userSkills: {
            _count: 'desc',
          },
        },
      }),
      prisma.skill.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      totalSkills,
      totalCategories: categories.length,
      mostUsedSkill: mostUsedSkill ? {
        name: mostUsedSkill.name,
        userCount: mostUsedSkill._count.userSkills,
      } : null,
      recentlyAdded,
    };
  }

  // Bulk import skills (admin only)
  async bulkImportSkills(skills: CreateSkillInput[]): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const skillData of skills) {
      try {
        await this.createSkill(skillData);
        created++;
      } catch (error) {
        if (error instanceof AppError && error.code === ErrorCodes.ALREADY_EXISTS) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    logger.info('Bulk skill import completed', {
      total: skills.length,
      created,
      skipped,
    });

    return { created, skipped };
  }
}
