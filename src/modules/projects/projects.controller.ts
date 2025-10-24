import { Request, Response } from 'express';
import { ProjectsService, CreateProjectInput, UpdateProjectInput, UpdateProjectStatusInput } from './projects.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { logger } from '@/config/logger';
import { ProjectStatus, ProjectType } from '@prisma/client';

export class ProjectsController {
  private projectsService: ProjectsService;

  constructor() {
    this.projectsService = new ProjectsService();
  }

  // Create new project (business users only)
  createProject = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const input: CreateProjectInput = req.body;

    const project = await this.projectsService.createProject(businessId, input);

    logger.info('Project created', {
      projectId: project.id,
      businessId,
      title: project.title,
      type: project.type,
    });

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  });

  // Get project by ID
  getProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const userId = req.user?.id;

    const project = await this.projectsService.getProjectById(projectId, userId);

    return res.json({
      project,
    });
  });

  // Update project
  updateProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;
    const input: UpdateProjectInput = req.body;

    const project = await this.projectsService.updateProject(projectId, businessId, input);

    logger.info('Project updated', {
      projectId,
      businessId,
      updatedFields: Object.keys(input),
    });

    return res.json({
      message: 'Project updated successfully',
      project,
    });
  });

  // Update project status
  updateProjectStatus = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;
    const input: UpdateProjectStatusInput = req.body;

    const project = await this.projectsService.updateProjectStatus(projectId, businessId, input);

    logger.info('Project status updated', {
      projectId,
      businessId,
      newStatus: input.status,
    });

    return res.json({
      message: 'Project status updated successfully',
      project,
    });
  });

  // Delete project
  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;

    await this.projectsService.deleteProject(projectId, businessId);

    logger.info('Project deleted', {
      projectId,
      businessId,
    });

    return res.json({
      message: 'Project deleted successfully',
    });
  });

  // Search projects (public endpoint)
  searchProjects = asyncHandler(async (req: Request, res: Response) => {
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
      limit = '20',
      offset = '0',
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {
      search: search as string | undefined,
      skills: skills ? (skills as string).split(',') : undefined,
      type: type as ProjectType | undefined,
      city: city as string | undefined,
      province: province as string | undefined,
      isRemote: isRemote === 'true' ? true : isRemote === 'false' ? false : undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin as string) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax as string) : undefined,
      experienceLevel: experienceLevel as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: sortBy as 'createdAt' | 'publishedAt' | 'budgetMax',
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await this.projectsService.searchProjects(query);

    return res.json({
      projects: result.projects,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get current user's projects (business users)
  getMyProjects = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const {
      status,
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      status: status as ProjectStatus | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.projectsService.getBusinessProjects(businessId, query);

    return res.json({
      projects: result.projects,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get projects by business ID (public endpoint)
  getBusinessProjects = asyncHandler(async (req: Request, res: Response) => {
    const { businessId } = req.params;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }
    const {
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      status: ProjectStatus.PUBLISHED, // Only show published projects publicly
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.projectsService.getBusinessProjects(businessId, query);

    return res.json({
      projects: result.projects,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get project statistics (admin only)
  getProjectStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.projectsService.getProjectStats();

    return res.json({
      stats,
    });
  });

  // Publish project (change from draft to published)
  publishProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;

    const project = await this.projectsService.updateProjectStatus(projectId, businessId, {
      status: ProjectStatus.PUBLISHED,
    });

    logger.info('Project published', {
      projectId,
      businessId,
    });

    return res.json({
      message: 'Project published successfully',
      project,
    });
  });

  // Cancel project
  cancelProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;

    const project = await this.projectsService.updateProjectStatus(projectId, businessId, {
      status: ProjectStatus.CANCELLED,
    });

    logger.info('Project cancelled', {
      projectId,
      businessId,
    });

    return res.json({
      message: 'Project cancelled successfully',
      project,
    });
  });

  // Complete project
  completeProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const businessId = req.user!.id;

    const project = await this.projectsService.updateProjectStatus(projectId, businessId, {
      status: ProjectStatus.COMPLETED,
    });

    logger.info('Project completed', {
      projectId,
      businessId,
    });

    return res.json({
      message: 'Project completed successfully',
      project,
    });
  });

  // Get recommended projects for talent (based on skills and location)
  getRecommendedProjects = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      limit = '10',
      offset = '0',
    } = req.query;

    // Get user's skills and location
    const user = await this.projectsService.getUserSkillsAndLocation(userId);
    
    if (!user || !user.profile) {
      return res.json({
        projects: [],
        pagination: {
          total: 0,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          pages: 0,
        },
      });
    }

    const userSkills = user.profile.skills.map(us => us.skillId);
    const userLocation = user.profile.location;

    const query = {
      skills: userSkills,
      city: userLocation?.city,
      province: userLocation?.province,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: 'publishedAt' as const,
      sortOrder: 'desc' as const,
    };

    const result = await this.projectsService.searchProjects(query);

    return res.json({
      projects: result.projects,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });
}
