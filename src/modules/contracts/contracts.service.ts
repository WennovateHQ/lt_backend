import { PrismaClient, ContractStatus } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/utils/app-error';
import { CreateContractDTO, UpdateContractDTO, CreateMilestoneDTO, UpdateMilestoneDTO } from './contracts.types';

export class ContractsService {
  constructor(private prisma: PrismaClient) {}

  async createContract(data: CreateContractDTO, businessId: string) {
    // Verify the application exists and belongs to the business
    const application = await this.prisma.application.findFirst({
      where: {
        id: data.applicationId,
        project: {
          businessId
        },
        status: 'ACCEPTED'
      },
      include: {
        project: true,
        talent: true
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found or not accepted');
    }

    // Check if contract already exists for this application
    const existingContract = await this.prisma.contract.findFirst({
      where: { applicationId: data.applicationId }
    });

    if (existingContract) {
      throw new ValidationError('Contract already exists for this application');
    }

    const contract = await this.prisma.contract.create({
      data: {
        applicationId: data.applicationId,
        businessId,
        talentId: application.talentId,
        projectId: application.projectId,
        title: data.title,
        description: data.description,
        totalAmount: data.totalAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        terms: data.terms,
        status: 'DRAFT'
      },
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        milestones: true
      }
    });

    return contract;
  }

  async getContract(contractId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        milestones: {
          orderBy: { order: 'asc' }
        },
        payments: true
      }
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Check if user has access to this contract
    if (contract.businessId !== userId && contract.talentId !== userId) {
      throw new ForbiddenError('Access denied to this contract');
    }

    return contract;
  }

  async updateContract(contractId: string, data: UpdateContractDTO, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Only business can update contract, and only if it's in DRAFT status
    if (contract.businessId !== userId) {
      throw new ForbiddenError('Only the business can update the contract');
    }

    if (contract.status !== 'DRAFT') {
      throw new ValidationError('Can only update contracts in DRAFT status');
    }

    const updatedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        title: data.title,
        description: data.description,
        totalAmount: data.totalAmount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        terms: data.terms
      },
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        milestones: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return updatedContract;
  }

  async signContract(contractId: string, userId: string, userType: 'business' | 'talent') {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Verify user has access to this contract
    if (
      (userType === 'business' && contract.businessId !== userId) ||
      (userType === 'talent' && contract.talentId !== userId)
    ) {
      throw new ForbiddenError('Access denied to this contract');
    }

    if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGNATURES') {
      throw new ValidationError('Contract cannot be signed in current status');
    }

    const updateData: any = {};
    
    if (userType === 'business') {
      updateData.businessSignedAt = new Date();
      updateData.businessSignature = `${userId}_${Date.now()}`;
    } else {
      updateData.talentSignedAt = new Date();
      updateData.talentSignature = `${userId}_${Date.now()}`;
    }

    // Check if both parties have signed
    const isFullySigned = userType === 'business' 
      ? contract.talentSignedAt !== null
      : contract.businessSignedAt !== null;

    if (isFullySigned) {
      updateData.status = 'ACTIVE';
      updateData.activatedAt = new Date();
    } else {
      updateData.status = 'PENDING_SIGNATURES';
    }

    const updatedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        milestones: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return updatedContract;
  }

  async createMilestone(contractId: string, data: CreateMilestoneDTO, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { milestones: true }
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Only business can create milestones
    if (contract.businessId !== userId) {
      throw new ForbiddenError('Only the business can create milestones');
    }

    if (contract.status !== 'DRAFT') {
      throw new ValidationError('Can only add milestones to contracts in DRAFT status');
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        contractId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        order: data.order || contract.milestones.length + 1,
        status: 'PENDING'
      }
    });

    return milestone;
  }

  async updateMilestone(milestoneId: string, data: UpdateMilestoneDTO, userId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true }
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    // Only business can update milestones, and only if contract is in DRAFT
    if (milestone.contract.businessId !== userId) {
      throw new ForbiddenError('Only the business can update milestones');
    }

    if (milestone.contract.status !== 'DRAFT') {
      throw new ValidationError('Can only update milestones for contracts in DRAFT status');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        order: data.order
      }
    });

    return updatedMilestone;
  }

  async submitMilestone(milestoneId: string, userId: string, deliverables?: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true }
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    // Only talent can submit milestones
    if (milestone.contract.talentId !== userId) {
      throw new ForbiddenError('Only the talent can submit milestones');
    }

    if (milestone.status !== 'PENDING' && milestone.status !== 'IN_PROGRESS') {
      throw new ValidationError('Milestone cannot be submitted in current status');
    }

    // TODO: Handle deliverables separately as they are a relation, not a field
    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    return updatedMilestone;
  }

  async approveMilestone(milestoneId: string, userId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { contract: true }
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    // Only business can approve milestones
    if (milestone.contract.businessId !== userId) {
      throw new ForbiddenError('Only the business can approve milestones');
    }

    if (milestone.status !== 'SUBMITTED') {
      throw new ValidationError('Can only approve submitted milestones');
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });

    return updatedMilestone;
  }

  async getMyContracts(userId: string, userType: 'business' | 'talent', status?: ContractStatus) {
    const where: any = {};
    
    if (userType === 'business') {
      where.businessId = userId;
    } else {
      where.talentId = userId;
    }

    if (status) {
      where.status = status;
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        business: {
          include: { profile: true }
        },
        talent: {
          include: { profile: true }
        },
        project: true,
        milestones: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return contracts;
  }

  async getContractStats(userId: string, userType: 'business' | 'talent') {
    const where: any = {};
    
    if (userType === 'business') {
      where.businessId = userId;
    } else {
      where.talentId = userId;
    }

    const [total, active, completed, totalEarnings] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.contract.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { totalAmount: true }
      })
    ]);

    return {
      total,
      active,
      completed,
      totalEarnings: totalEarnings._sum.totalAmount || 0
    };
  }
}
