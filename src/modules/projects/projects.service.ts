import { z } from 'zod';
import { prisma } from '@/config/database';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { toNumber } from '@/shared/utils/decimal-converter';

export enum UserType {
  BUSINESS = 'BUSINESS',
  TALENT = 'TALENT'
}

// Validation schemas
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  type: z.nativeEnum(ProjectType),
  budgetMin: z.number().min(0, 'Budget must be positive').optional(),
  budgetMax: z.number().min(0, 'Budget must be positive').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  duration: z.string().max(100, 'Duration too long').optional(),
  isRemote: z.boolean().default(false),
  city: z.string().max(100, 'City name too long').optional(),
  province: z.string().max(100, 'Province name too long').optional(),
  experienceLevel: z.enum(['Junior', 'Mid', 'Senior']).optional(),
  skills: z.array(z.object({
    skillId: z.string().min(1, 'Skill ID is required'),
    required: z.boolean().default(true),
    level: z.number().min(1).max(5).optional(),
  })).min(1, 'At least one skill is required'),
}).refine((data) => {
  // Validate budget range
  if (data.budgetMin && data.budgetMax && data.budgetMin > data.budgetMax) {
    return false;
  }
  // Validate dates
  if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
    return false;
  }
  // Validate project type requirements
  if (data.type === ProjectType.FIXED_PRICE && (!data.budgetMin || !data.budgetMax)) {
    return false;
  }
  if (data.type === ProjectType.HOURLY && !data.hourlyRate) {
    return false;
  }
  return true;
}, {
  message: 'Invalid project data',
});

export const updateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long').optional(),
  type: z.nativeEnum(ProjectType).optional(),
  budgetMin: z.number().min(0, 'Budget must be positive').optional(),
  budgetMax: z.number().min(0, 'Budget must be positive').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  duration: z.string().optional(),
  isRemote: z.boolean().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  experienceLevel: z.string().optional(),
}).partial();

export const updateProjectStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
});

// Types
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;

export interface ProjectWithDetails {
  id: string;
  businessId: string;
  title: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  startDate: Date | null;
  endDate: Date | null;
  duration: string | null;
  isRemote: boolean;
  city: string | null;
  province: string | null;
  experienceLevel: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  business: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      companyName: string | null;
      avatar: string | null;
    } | null;
  };
  skills: Array<{
    id: string;
    required: boolean;
    level: number | null;
    skill: {
      id: string;
      name: string;
      category: string;
    };
  }>;
  _count: {
    applications: number;
    contracts: number;
  };
}

export class ProjectsService {
  // Create new project (business users only)
  async createProject(businessId: string, input: CreateProjectInput): Promise<ProjectWithDetails> {
    const validatedInput = createProjectSchema.parse(input);

    // Verify user is a business
    const user = await prisma.user.findUnique({
      where: { id: businessId },
      select: { userType: true, status: true },
    });

    if (!user || user.userType !== UserType.BUSINESS) {
      throw new AppError('Only business users can create projects', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account must be active to create projects', 403, 'ACCOUNT_INACTIVE');
    }

    // Verify all skills exist
    const skillIds = validatedInput.skills.map(s => s.skillId);
    const existingSkills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true },
    });

    if (existingSkills.length !== skillIds.length) {
      throw new AppError('One or more skills not found', 400, ErrorCodes.NOT_FOUND);
    }

    // Create project with skills in transaction
    const project = await prisma.$transaction(async (tx) => {
      // Create project
      const newProject = await tx.project.create({
        data: {
          businessId,
          title: validatedInput.title.trim(),
          description: validatedInput.description.trim(),
          type: validatedInput.type,
          budgetMin: validatedInput.budgetMin,
          budgetMax: validatedInput.budgetMax,
          hourlyRate: validatedInput.hourlyRate,
          startDate: validatedInput.startDate ? new Date(validatedInput.startDate) : null,
          endDate: validatedInput.endDate ? new Date(validatedInput.endDate) : null,
          duration: validatedInput.duration?.trim(),
          isRemote: validatedInput.isRemote,
          city: validatedInput.city?.trim(),
          province: validatedInput.province?.trim(),
          experienceLevel: validatedInput.experienceLevel,
          status: ProjectStatus.DRAFT,
        },
      });

      // Add skills
      await tx.projectSkill.createMany({
        data: validatedInput.skills.map(skill => ({
          projectId: newProject.id,
          skillId: skill.skillId,
          required: skill.required,
          level: skill.level,
        })),
      });

      return newProject;
    });

    logger.info('Project created', {
      projectId: project.id,
      businessId,
      title: project.title,
      type: project.type,
    });

    return this.getProjectById(project.id);
  }

  // Get project by ID
  async getProjectById(projectId: string, userId?: string): Promise<ProjectWithDetails> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        business: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                companyName: true,
                avatar: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            contracts: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Check if user can view this project
    if (project.status === ProjectStatus.DRAFT && project.businessId !== userId) {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Convert Decimal fields to numbers
    return {
      ...project,
      budgetMin: toNumber(project.budgetMin),
      budgetMax: toNumber(project.budgetMax),
      hourlyRate: toNumber(project.hourlyRate),
    };
  }

  // Update project
  async updateProject(projectId: string, businessId: string, input: UpdateProjectInput): Promise<ProjectWithDetails> {
    const validatedInput = updateProjectSchema.parse(input);

    // Check if project exists and belongs to business
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { businessId: true, status: true },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existingProject.businessId !== businessId) {
      throw new AppError('Not authorized to update this project', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    // Can't update published projects with active applications
    if (existingProject.status === ProjectStatus.PUBLISHED) {
      const applicationCount = await prisma.application.count({
        where: { projectId, status: 'PENDING' },
      });

      if (applicationCount > 0) {
        throw new AppError('Cannot update project with pending applications', 400, 'PROJECT_HAS_APPLICATIONS');
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(validatedInput.title && { title: validatedInput.title.trim() }),
        ...(validatedInput.description && { description: validatedInput.description.trim() }),
        ...(validatedInput.type && { type: validatedInput.type }),
        ...(validatedInput.budgetMin !== undefined && { budgetMin: validatedInput.budgetMin }),
        ...(validatedInput.budgetMax !== undefined && { budgetMax: validatedInput.budgetMax }),
        ...(validatedInput.hourlyRate !== undefined && { hourlyRate: validatedInput.hourlyRate }),
        ...(validatedInput.startDate !== undefined && { 
          startDate: validatedInput.startDate ? new Date(validatedInput.startDate) : null 
        }),
        ...(validatedInput.endDate !== undefined && { 
          endDate: validatedInput.endDate ? new Date(validatedInput.endDate) : null 
        }),
        ...(validatedInput.duration !== undefined && { duration: validatedInput.duration?.trim() }),
        ...(validatedInput.isRemote !== undefined && { isRemote: validatedInput.isRemote }),
        ...(validatedInput.city !== undefined && { city: validatedInput.city?.trim() }),
        ...(validatedInput.province !== undefined && { province: validatedInput.province?.trim() }),
        ...(validatedInput.experienceLevel !== undefined && { experienceLevel: validatedInput.experienceLevel }),
      },
    });

    logger.info('Project updated', {
      projectId,
      businessId,
      updatedFields: Object.keys(validatedInput),
    });

    return this.getProjectById(projectId);
  }

  // Update project status
  async updateProjectStatus(projectId: string, businessId: string, input: UpdateProjectStatusInput): Promise<ProjectWithDetails> {
    const validatedInput = updateProjectStatusSchema.parse(input);

    // Check if project exists and belongs to business
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { businessId: true, status: true },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existingProject.businessId !== businessId) {
      throw new AppError('Not authorized to update this project', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    // Validate status transitions
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.DRAFT]: [ProjectStatus.PUBLISHED],
      [ProjectStatus.PUBLISHED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_PROGRESS]: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: [ProjectStatus.PUBLISHED], // Can republish cancelled projects
    };

    if (!validTransitions[existingProject.status].includes(validatedInput.status)) {
      throw new AppError(
        `Cannot change status from ${existingProject.status} to ${validatedInput.status}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updateData: any = { status: validatedInput.status };

    // Set publishedAt when publishing
    if (validatedInput.status === ProjectStatus.PUBLISHED && existingProject.status === ProjectStatus.DRAFT) {
      updateData.publishedAt = new Date();
    }

    await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    logger.info('Project status updated', {
      projectId,
      businessId,
      oldStatus: existingProject.status,
      newStatus: validatedInput.status,
    });

    return this.getProjectById(projectId);
  }

  // Delete project
  async deleteProject(projectId: string, businessId: string): Promise<void> {
    // Check if project exists and belongs to business
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        businessId: true, 
        status: true,
        _count: {
          select: {
            applications: true,
            contracts: true,
          },
        },
      },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existingProject.businessId !== businessId) {
      throw new AppError('Not authorized to delete this project', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    // Can't delete projects with applications or contracts
    if (existingProject._count.applications > 0 || existingProject._count.contracts > 0) {
      throw new AppError('Cannot delete project with applications or contracts', 400, 'PROJECT_HAS_DEPENDENCIES');
    }

    // Delete project and related data
    await prisma.$transaction(async (tx) => {
      // Delete project skills
      await tx.projectSkill.deleteMany({
        where: { projectId },
      });

      // Delete project
      await tx.project.delete({
        where: { id: projectId },
      });
    });

    logger.info('Project deleted', {
      projectId,
      businessId,
    });
  }

  // Search projects
  async searchProjects(query: {
    search?: string;
    skills?: string[];
    type?: ProjectType;
    city?: string;
    province?: string;
    isRemote?: boolean;
    budgetMin?: number;
    budgetMax?: number;
    experienceLevel?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'publishedAt' | 'budgetMax';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ projects: ProjectWithDetails[]; total: number }> {
    const {
      search,
      skills,
      type,
      city,
      province,
      isRemote,
      budgetMin,
      budgetMax,
      experienceLevel,
      limit = 20,
      offset = 0,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {
      status: ProjectStatus.PUBLISHED,
    };

    // Text search
    if (search) {
      where.OR = [
        {
          title: {
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

    // Filter by project type
    if (type) {
      where.type = type;
    }

    // Location filters
    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (province) {
      where.province = {
        contains: province,
        mode: 'insensitive',
      };
    }

    if (isRemote !== undefined) {
      where.isRemote = isRemote;
    }

    // Budget filters
    if (budgetMin !== undefined) {
      where.budgetMax = {
        gte: budgetMin,
      };
    }

    if (budgetMax !== undefined) {
      where.budgetMin = {
        lte: budgetMax,
      };
    }

    // Experience level filter
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    // Skills filter
    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          skillId: {
            in: skills,
          },
        },
      };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  companyName: true,
                  avatar: true,
                },
              },
            },
          },
          skills: {
            include: {
              skill: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
              contracts: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedProjects = projects.map(project => ({
      ...project,
      budgetMin: toNumber(project.budgetMin),
      budgetMax: toNumber(project.budgetMax),
      hourlyRate: toNumber(project.hourlyRate),
    }));

    return { projects: convertedProjects, total };
  }

  // Get projects by business
  async getBusinessProjects(businessId: string, query: {
    status?: ProjectStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ projects: ProjectWithDetails[]; total: number }> {
    const { status, limit = 20, offset = 0 } = query;

    const where: any = {
      businessId,
    };

    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  companyName: true,
                  avatar: true,
                },
              },
            },
          },
          skills: {
            include: {
              skill: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
              contracts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedProjects = projects.map(project => ({
      ...project,
      budgetMin: toNumber(project.budgetMin),
      budgetMax: toNumber(project.budgetMax),
      hourlyRate: toNumber(project.hourlyRate),
    }));

    return { projects: convertedProjects, total };
  }

  // Get user skills and location for recommendations
  async getUserSkillsAndLocation(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            skills: {
              select: {
                skillId: true,
              },
            },
            location: {
              select: {
                city: true,
                province: true,
              },
            },
          },
        },
      },
    });
  }

  // Get project statistics
  async getProjectStats(): Promise<{
    total: number;
    byStatus: Record<ProjectStatus, number>;
    byType: Record<ProjectType, number>;
    recentlyPublished: number;
    averageBudget: number | null;
  }> {
    const [
      total,
      byStatus,
      byType,
      recentlyPublished,
      averageBudget,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.project.count({
        where: {
          publishedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.project.aggregate({
        _avg: {
          budgetMax: true,
        },
        where: {
          budgetMax: {
            not: null,
          },
        },
      }),
    ]);

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<ProjectStatus, number>);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<ProjectType, number>);

    return {
      total,
      byStatus: statusStats,
      byType: typeStats,
      recentlyPublished,
      averageBudget: toNumber(averageBudget._avg.budgetMax),
    };
  }
}
