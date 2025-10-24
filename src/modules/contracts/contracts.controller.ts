import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { 
  CreateContractSchema, 
  UpdateContractSchema, 
  CreateMilestoneSchema, 
  UpdateMilestoneSchema,
  SubmitMilestoneSchema 
} from './contracts.types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { ValidationError } from '../../shared/utils/app-error';
import { AuthRequest } from '../../shared/middleware/auth';

export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  createContract = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = CreateContractSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid contract data', validation.error.errors);
    }

    const contract = await this.contractsService.createContract(
      validation.data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: { contract },
      message: 'Contract created successfully'
    });
  });

  getContract = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contractId } = req.params;
    
    if (!contractId) {
      throw new ValidationError('Contract ID is required');
    }
    const contract = await this.contractsService.getContract(contractId, req.user!.id);

    res.json({
      success: true,
      data: { contract }
    });
  });

  updateContract = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contractId } = req.params;
    if (!contractId) {
      throw new ValidationError('Contract ID is required');
    }
    const validation = UpdateContractSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid contract data', validation.error.errors);
    }

    const contract = await this.contractsService.updateContract(
      contractId,
      validation.data,
      req.user!.id
    );

    res.json({
      success: true,
      data: { contract },
      message: 'Contract updated successfully'
    });
  });

  signContract = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contractId } = req.params;
    if (!contractId) {
      throw new ValidationError('Contract ID is required');
    }
    
    const contract = await this.contractsService.signContract(
      contractId,
      req.user!.id,
      req.user!.userType as 'business' | 'talent'
    );

    res.json({
      success: true,
      data: { contract },
      message: 'Contract signed successfully'
    });
  });

  getMyContracts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;
    
    const contracts = await this.contractsService.getMyContracts(
      req.user!.id,
      req.user!.userType as unknown as 'business' | 'talent',
      status as any
    );

    res.json({
      success: true,
      data: { contracts }
    });
  });

  getContractStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.contractsService.getContractStats(
      req.user!.id,
      req.user!.userType as 'business' | 'talent'
    );

    res.json({
      success: true,
      data: { stats }
    });
  });

  // Milestone endpoints
  createMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contractId } = req.params;
    if (!contractId) {
      throw new ValidationError('Contract ID is required');
    }
    const validation = CreateMilestoneSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid milestone data', validation.error.errors);
    }

    const milestone = await this.contractsService.createMilestone(
      contractId,
      validation.data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: { milestone },
      message: 'Milestone created successfully'
    });
  });

  updateMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { milestoneId } = req.params;
    if (!milestoneId) {
      throw new ValidationError('Milestone ID is required');
    }
    const validation = UpdateMilestoneSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid milestone data', validation.error.errors);
    }

    const milestone = await this.contractsService.updateMilestone(
      milestoneId,
      validation.data,
      req.user!.id
    );

    res.json({
      success: true,
      data: { milestone },
      message: 'Milestone updated successfully'
    });
  });

  submitMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { milestoneId } = req.params;
    if (!milestoneId) {
      throw new ValidationError('Milestone ID is required');
    }
    const validation = SubmitMilestoneSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid submission data', validation.error.errors);
    }

    const milestone = await this.contractsService.submitMilestone(
      milestoneId,
      req.user!.id,
      validation.data.deliverables
    );

    res.json({
      success: true,
      data: { milestone },
      message: 'Milestone submitted successfully'
    });
  });

  approveMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { milestoneId } = req.params;
    if (!milestoneId) {
      throw new ValidationError('Milestone ID is required');
    }
    
    const milestone = await this.contractsService.approveMilestone(
      milestoneId,
      req.user!.id
    );

    res.json({
      success: true,
      data: { milestone },
      message: 'Milestone approved successfully'
    });
  });
}
