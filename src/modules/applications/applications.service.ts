import { z } from 'zod';
import { prisma } from '@/config/database';
import { AppError, ErrorCodes } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';
import { ApplicationStatus } from '../../shared/types/enums';
import { ProjectStatus } from '../../shared/types/enums';
import { toNumber } from '../../shared/utils/decimal-converter';

// Validation schemas
export const createApplicationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  coverLetter: z.string().min(10, 'Cover letter must be at least 10 characters').max(2000, 'Cover letter too long').optional(),
  proposedRate: z.number().positive().optional(),    // For hourly projects
  proposedBudget: z.number().positive().optional(),  // For fixed projects
  estimatedHours: z.number().positive().optional(),
  availability: z.string().max(500).optional(),
});

export const updateApplicationSchema = z.object({
  coverLetter: z.string().min(10).max(2000).optional(),
  proposedRate: z.number().positive().optional(),    // For hourly projects
  proposedBudget: z.number().positive().optional(),  // For fixed projects
  estimatedHours: z.number().positive().optional(),
  availability: z.string().max(500).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
});

// Types
export interface CreateApplicationInput {
  projectId: string;
  coverLetter?: string;
  proposedRate?: number;      // For hourly projects
  proposedBudget?: number;    // For fixed projects
  estimatedHours?: number;
  availability?: string;
}

export interface UpdateApplicationInput {
  coverLetter?: string;
  proposedRate?: number;      // For hourly projects
  proposedBudget?: number;    // For fixed projects
  estimatedHours?: number;
  availability?: string;
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
}

export interface ApplicationWithDetails {
  id: string;
  projectId: string;
  talentId: string;
  coverLetter: string | null;
  proposedRate: number | null;      // For hourly projects
  proposedBudget: number | null;    // For fixed projects
  estimatedHours: number | null;
  availability: string | null;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    title: string;
    description: string;
    type: string;
    businessId: string;
    business: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        companyName: string | null;
      } | null;
    };
  };
  talent: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      title: string | null;
      avatar: string | null;
      hourlyRate: number | null;
      location: {
        city: string;
        province: string;
      } | null;
    } | null;
  };
  contract: {
    id: string;
    status: string;
  } | null;
}

export class ApplicationsService {

  // Create new application
  async createApplication(talentId: string, input: CreateApplicationInput): Promise<ApplicationWithDetails> {
    // Validate input
    const validatedInput = createApplicationSchema.parse(input);

    // Check if project exists and is active
    const project = await prisma.project.findUnique({
      where: { id: validatedInput.projectId },
      select: { 
        id: true, 
        status: true, 
        businessId: true,
        type: true,
        title: true
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new AppError('Cannot apply to inactive project', 400, ErrorCodes.VALIDATION_ERROR);
    }

    if (project.businessId === talentId) {
      throw new AppError('Cannot apply to your own project', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Validate rate/budget based on project type
    if (project.type === 'HOURLY') {
      if (!validatedInput.proposedRate) {
        throw new AppError('Proposed hourly rate is required for hourly projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
      if (validatedInput.proposedBudget) {
        throw new AppError('Proposed budget should not be provided for hourly projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
    } else if (project.type === 'FIXED_PRICE') {
      if (!validatedInput.proposedBudget) {
        throw new AppError('Proposed budget is required for fixed-price projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
      if (validatedInput.proposedRate) {
        throw new AppError('Proposed hourly rate should not be provided for fixed-price projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Check if application already exists
    const existingApplication = await prisma.application.findUnique({
      where: {
        projectId_talentId: {
          projectId: validatedInput.projectId,
          talentId
        }
      }
    });

    if (existingApplication) {
      throw new AppError('Application already exists for this project', 409, ErrorCodes.DUPLICATE_RESOURCE);
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        projectId: validatedInput.projectId,
        talentId,
        coverLetter: validatedInput.coverLetter || null,
        proposedRate: validatedInput.proposedRate || null,
        proposedBudget: validatedInput.proposedBudget || null,
        estimatedHours: validatedInput.estimatedHours || null,
        availability: validatedInput.availability || null,
        status: ApplicationStatus.PENDING,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            businessId: true,
            business: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    companyName: true
                  }
                }
              }
            }
          }
        },
        talent: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true
              }
            }
          }
        },
        contract: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    logger.info('Application created', {
      applicationId: application.id,
      projectId: validatedInput.projectId,
      talentId,
      projectType: project.type,
      proposedRate: validatedInput.proposedRate,
      proposedBudget: validatedInput.proposedBudget
    });

    // Convert Decimal fields to numbers and ensure contract is properly typed
    const convertedApplication = {
      ...application,
      proposedRate: toNumber(application.proposedRate),
      proposedBudget: toNumber(application.proposedBudget),
      contract: application.contract || null,
    };
    
    return convertedApplication as ApplicationWithDetails;
  }

  // Get application by ID
  async getApplicationById(applicationId: string, userId?: string): Promise<ApplicationWithDetails> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          include: {
            business: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        talent: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                title: true,
                avatar: true,
                hourlyRate: true,
                location: {
                  select: {
                    city: true,
                    province: true,
                  },
                },
              },
            },
          },
        },
        contract: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Authorization check
    if (userId && application.talentId !== userId && application.project.businessId !== userId) {
      throw new AppError('Not authorized to view this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    // Convert Decimal fields to numbers
    const convertedApplication = {
      ...application,
      proposedRate: toNumber(application.proposedRate),
      proposedBudget: toNumber(application.proposedBudget),
      contract: application.contract || null,
    };
    
    return convertedApplication as ApplicationWithDetails;
  }

  // Update application
  async updateApplication(applicationId: string, talentId: string, input: UpdateApplicationInput): Promise<ApplicationWithDetails> {
    const validatedInput = updateApplicationSchema.parse(input);

    // Check if application exists and belongs to talent
    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!existingApplication) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (existingApplication.talentId !== talentId) {
      throw new AppError('Not authorized to update this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (existingApplication.status !== ApplicationStatus.PENDING) {
      throw new AppError('Cannot update application that is not pending', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Validate rate/budget based on project type
    if (existingApplication.project.type === 'HOURLY') {
      if (validatedInput.proposedBudget !== undefined) {
        throw new AppError('Proposed budget should not be provided for hourly projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
    } else if (existingApplication.project.type === 'FIXED_PRICE') {
      if (validatedInput.proposedRate !== undefined) {
        throw new AppError('Proposed hourly rate should not be provided for fixed-price projects', 400, ErrorCodes.VALIDATION_ERROR);
      }
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(validatedInput.coverLetter !== undefined && { coverLetter: validatedInput.coverLetter?.trim() }),
        ...(validatedInput.proposedRate !== undefined && { proposedRate: validatedInput.proposedRate }),
        ...(validatedInput.proposedBudget !== undefined && { proposedBudget: validatedInput.proposedBudget }),
        ...(validatedInput.estimatedHours !== undefined && { estimatedHours: validatedInput.estimatedHours }),
        ...(validatedInput.availability !== undefined && { availability: validatedInput.availability?.trim() }),
      },
    });

    logger.info('Application updated', {
      applicationId,
      talentId,
      updatedFields: Object.keys(validatedInput),
    });

    return this.getApplicationById(applicationId);
  }

  // Update application status (for business users)
  async updateApplicationStatus(applicationId: string, businessId: string, input: UpdateApplicationStatusInput & { feedback?: string }): Promise<ApplicationWithDetails> {
    const validatedInput = updateApplicationStatusSchema.parse(input);

    // Check if application exists and belongs to business's project
    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          select: {
            id: true,
            businessId: true,
            status: true,
          },
        },
      },
    });

    if (!existingApplication) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (existingApplication.project.businessId !== businessId) {
      throw new AppError('Not authorized to update this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: validatedInput.status,
        feedback: input.feedback || null,
        reviewedAt: new Date(),
      },
    });

    logger.info('Application status updated', {
      applicationId,
      businessId,
      newStatus: validatedInput.status,
      hasFeedback: !!input.feedback,
    });

    return this.getApplicationById(applicationId);
  }

  // Get applications for a talent
  async getTalentApplications(talentId: string, query: {
    status?: ApplicationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ applications: ApplicationWithDetails[]; total: number }> {
    const { status, limit = 20, offset = 0 } = query;

    const where: any = { talentId };
    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          project: {
            include: {
              business: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          talent: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  title: true,
                  avatar: true,
                  hourlyRate: true,
                  location: {
                    select: {
                      city: true,
                      province: true,
                    },
                  },
                },
              },
            },
          },
          contract: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedApplications = applications.map(app => ({
      ...app,
      proposedRate: toNumber(app.proposedRate),
      proposedBudget: toNumber(app.proposedBudget),
    }));
    
    return {
      applications: convertedApplications as ApplicationWithDetails[],
      total,
    };
  }

  // Get applications for a project (for business users)
  async getProjectApplications(projectId: string, businessId: string, query: {
    status?: ApplicationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ applications: ApplicationWithDetails[]; total: number }> {
    const { status, limit = 20, offset = 0 } = query;

    // Verify project belongs to business
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { businessId: true, status: true }
    });

    if (!project) {
      throw new AppError('Project not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (project.businessId !== businessId) {
      throw new AppError('Not authorized to view applications for this project', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    const where: any = { projectId };
    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          project: {
            include: {
              business: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          talent: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  title: true,
                  avatar: true,
                  hourlyRate: true,
                  location: {
                    select: {
                      city: true,
                      province: true,
                    },
                  },
                },
              },
            },
          },
          contract: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedApplications = applications.map(app => ({
      ...app,
      proposedRate: toNumber(app.proposedRate),
      proposedBudget: toNumber(app.proposedBudget),
    }));
    
    return {
      applications: convertedApplications as ApplicationWithDetails[],
      total,
    };
  }

  // Delete application (for talent users)
  async deleteApplication(applicationId: string, talentId: string): Promise<void> {
    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        talentId: true,
        status: true,
      },
    });

    if (!existingApplication) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (existingApplication.talentId !== talentId) {
      throw new AppError('Not authorized to delete this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (existingApplication.status === ApplicationStatus.ACCEPTED) {
      throw new AppError('Cannot delete accepted application', 400, ErrorCodes.VALIDATION_ERROR);
    }

    await prisma.application.delete({
      where: { id: applicationId },
    });

    logger.info('Application deleted', {
      applicationId,
      talentId,
    });
  }

  // Get all applications (for admin users)
  async getAllApplications(query: {
    status?: ApplicationStatus;
    projectId?: string;
    talentId?: string;
    businessId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ applications: ApplicationWithDetails[]; total: number }> {
    const { status, projectId, talentId, businessId, limit = 20, offset = 0, search } = query;

    const where: any = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (talentId) where.talentId = talentId;
    if (businessId) {
      where.project = {
        businessId,
      };
    }
    if (search) {
      where.OR = [
        {
          project: {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          talent: {
            profile: {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  displayName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          project: {
            include: {
              business: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          talent: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  title: true,
                  avatar: true,
                  hourlyRate: true,
                  location: {
                    select: {
                      city: true,
                      province: true,
                    },
                  },
                },
              },
            },
          },
          contract: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    // Convert Decimal fields to numbers
    const convertedApplications = applications.map(app => ({
      ...app,
      proposedRate: toNumber(app.proposedRate),
      proposedBudget: toNumber(app.proposedBudget),
    }));
    
    return {
      applications: convertedApplications as ApplicationWithDetails[],
      total,
    };
  }

  // Withdraw application
  async withdrawApplication(applicationId: string, talentId: string): Promise<ApplicationWithDetails> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        talent: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (application.talentId !== talentId) {
      throw new AppError('Unauthorized to withdraw this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new AppError('Can only withdraw pending applications', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.WITHDRAWN,
      },
      include: {
        project: { include: { business: { select: { id: true, email: true, profile: true } } } },
        talent: { select: { id: true, email: true, profile: true } },
        contract: { select: { id: true, status: true } },
      },
    });

    const convertedApplication = {
      ...updatedApplication,
      proposedRate: toNumber(updatedApplication.proposedRate),
      proposedBudget: toNumber(updatedApplication.proposedBudget),
    };

    return convertedApplication as ApplicationWithDetails;
  }

  // Get application statistics
  async getApplicationStats(): Promise<any> {
    const [total, pending, reviewed, accepted, rejected] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: ApplicationStatus.PENDING } }),
      prisma.application.count({ where: { status: ApplicationStatus.UNDER_REVIEW } }),
      prisma.application.count({ where: { status: ApplicationStatus.ACCEPTED } }),
      prisma.application.count({ where: { status: ApplicationStatus.REJECTED } }),
    ]);

    return {
      total,
      pending,
      reviewed,
      accepted,
      rejected,
    };
  }

  // Get project for application
  async getProjectForApplication(projectId: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        business: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                companyName: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return project;
  }

  // Check existing application
  async checkExistingApplication(projectId: string, talentId: string): Promise<any> {
    const existingApplication = await prisma.application.findFirst({
      where: {
        projectId,
        talentId,
        status: {
          not: ApplicationStatus.WITHDRAWN,
        },
      },
    });

    return existingApplication;
  }

  // Get business applications
  async getBusinessApplications(
    businessId: string,
    options: {
      page: number;
      limit: number;
      status?: ApplicationStatus;
    }
  ): Promise<{ applications: ApplicationWithDetails[]; total: number }> {
    const { page, limit, status } = options;
    const offset = (page - 1) * limit;

    // Get all projects for this business
    const businessProjects = await prisma.project.findMany({
      where: { businessId },
      select: { id: true },
    });

    const projectIds = businessProjects.map(p => p.id);

    const where: any = {
      projectId: { in: projectIds },
    };

    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          project: {
            include: {
              business: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                    },
                  },
                },
              },
            },
          },
          talent: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  title: true,
                  avatar: true,
                  hourlyRate: true,
                  location: {
                    select: {
                      city: true,
                      province: true,
                    },
                  },
                },
              },
            },
          },
          contract: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ]);

    const convertedApplications = applications.map(app => ({
      ...app,
      proposedRate: toNumber(app.proposedRate),
      proposedBudget: toNumber(app.proposedBudget),
      contract: app.contract || null,
    }));

    return {
      applications: convertedApplications as ApplicationWithDetails[],
      total,
    };
  }

  // Review application
  async reviewApplication(
    applicationId: string,
    businessId: string,
    data: { status: ApplicationStatus; feedback?: string }
  ): Promise<ApplicationWithDetails> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    if (application.project.businessId !== businessId) {
      throw new AppError('Unauthorized to review this application', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: data.status,
        feedback: data.feedback,
        reviewedAt: new Date(),
      },
      include: {
        project: { include: { business: { select: { id: true, email: true, profile: true } } } },
        talent: { select: { id: true, email: true, profile: true } },
        contract: { select: { id: true, status: true } },
      },
    });

    const convertedApplication = {
      ...updatedApplication,
      proposedRate: toNumber(updatedApplication.proposedRate),
      proposedBudget: toNumber(updatedApplication.proposedBudget),
      contract: updatedApplication.contract || null,
    };

    return convertedApplication as ApplicationWithDetails;
  }
}

export const applicationsService = new ApplicationsService();
