import { Request, Response } from 'express';
import { ApplicationsService, CreateApplicationInput, UpdateApplicationInput, UpdateApplicationStatusInput } from './applications.service';
import { ApplicationStatus } from '../../shared/types/enums';
import { ValidationError } from '../../shared/utils/app-error';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../config/logger';

export class ApplicationsController {
  private applicationsService: ApplicationsService;
  constructor() {
    this.applicationsService = new ApplicationsService();
  }

  // Create new application (talent users only)
  createApplication = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const input: CreateApplicationInput = req.body;

    const application = await this.applicationsService.createApplication(talentId, input);

    logger.info('Application created', {
      applicationId: application.id,
      projectId: application.projectId,
      talentId,
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  });

  // Get application by ID
  getApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const userId = req.user?.id;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.getApplicationById(applicationId, userId);

    res.json({
      application,
    });
  });

  // Update application (talent only)
  updateApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const talentId = req.user!.id;
    const input: UpdateApplicationInput = req.body;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.updateApplication(applicationId, talentId, input);

    logger.info('Application updated', {
      applicationId,
      talentId,
      updatedFields: Object.keys(input),
    });

    res.json({
      message: 'Application updated successfully',
      application,
    });
  });

  // Update application status (business only)
  updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const businessId = req.user!.id;
    const input: UpdateApplicationStatusInput = req.body;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.updateApplicationStatus(applicationId, businessId, input);

    logger.info('Application status updated', {
      applicationId,
      businessId,
      newStatus: input.status,
    });

    res.json({
      message: 'Application status updated successfully',
      application,
    });
  });

  // Withdraw application (talent only)
  withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const talentId = req.user!.id;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.withdrawApplication(applicationId, talentId);

    logger.info('Application withdrawn', {
      applicationId,
      talentId,
    });

    res.json({
      message: 'Application withdrawn successfully',
      application,
    });
  });

  // Accept application (business only)
  acceptApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const businessId = req.user!.id;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.updateApplicationStatus(applicationId, businessId, {
      status: ApplicationStatus.ACCEPTED,
    });

    logger.info('Application accepted', {
      applicationId,
      businessId,
    });

    res.json({
      message: 'Application accepted successfully',
      application,
    });
  });

  // Reject application (business only)
  rejectApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const businessId = req.user!.id;

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }
    const application = await this.applicationsService.updateApplicationStatus(applicationId, businessId, {
      status: ApplicationStatus.REJECTED,
    });

    logger.info('Application rejected', {
      applicationId,
      businessId,
    });

    res.json({
      message: 'Application rejected successfully',
      application,
    });
  });

  // Get applications for a project (business only)
  getProjectApplications = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const businessId = req.user!.id;
    const {
      status,
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      ...(status && { status: status as ApplicationStatus }),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }
    const result = await this.applicationsService.getProjectApplications(projectId, businessId, query);

    res.json({
      applications: result.applications,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get current user's applications (talent only)
  getMyApplications = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const {
      status,
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      ...(status && { status: status as ApplicationStatus }),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.applicationsService.getTalentApplications(talentId, query);

    res.json({
      applications: result.applications,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get application statistics (admin only)
  getApplicationStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await this.applicationsService.getApplicationStats();

    res.json({
      stats,
    });
  });

  // Check if user can apply to project
  canApplyToProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const talentId = req.user!.id;

    // Check if project exists and is published
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }
    const project = await this.applicationsService.getProjectForApplication(projectId);
    
    if (!project) {
      res.json({
        canApply: false,
        reason: 'Project not found or not published',
      });
      return;
    }

    // Check if user is the project owner
    if (project.businessId === talentId) {
      res.json({
        canApply: false,
        reason: 'Cannot apply to your own project',
      });
      return;
    }

    // Check if already applied
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }
    const existingApplication = await this.applicationsService.checkExistingApplication(projectId, talentId);
    
    if (existingApplication) {
      res.json({
        canApply: false,
        reason: 'Already applied to this project',
        applicationId: existingApplication.id,
        applicationStatus: existingApplication.status,
      });
      return;
    }

    res.json({
      canApply: true,
      project: {
        id: project.id,
        title: project.title,
        type: project.type,
        requiresRate: project.type === 'HOURLY',
      },
    });
  });

  // Get business applications (all applications for business user's projects)
  getBusinessApplications = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;
    const status = req.query['status'] as ApplicationStatus;

    const result = await this.applicationsService.getBusinessApplications(businessId, {
      page,
      limit,
      status
    });

    res.json(result);
  });

  // Review application (alternative to PATCH status)
  reviewApplication = asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const businessId = req.user!.id;
    const { status, feedback } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    if (!status) {
      throw new ValidationError('Status is required');
    }

    const application = await this.applicationsService.reviewApplication(applicationId, businessId, {
      status,
      feedback
    });

    logger.info('Application reviewed', {
      applicationId,
      businessId,
      status,
    });

    return res.json({
      message: 'Application reviewed successfully',
      application,
    });
  });

  // Get all applications (admin only)
  getAllApplications = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;
    const status = req.query['status'] as ApplicationStatus;
    const search = req.query['search'] as string;

    const result = await this.applicationsService.getAllApplications({
      offset: (page - 1) * limit,
      limit,
      status,
      search
    });

    res.json(result);
  });
}
