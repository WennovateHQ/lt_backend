import { PrismaClient, MilestoneStatus, DeliverableStatus, TimeEntryStatus } from '@prisma/client';
import TaxService from './tax.service';

const prisma = new PrismaClient();

export interface MilestoneWithDetails {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  dueDate: Date | null;
  order: number;
  status: MilestoneStatus;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  deliverables: DeliverableWithDetails[];
  timeEntries: TimeEntryWithDetails[];
  totalHours?: number;
  canSubmit: boolean;
  canApprove: boolean;
}

export interface DeliverableWithDetails {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  status: DeliverableStatus;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

export interface TimeEntryWithDetails {
  id: string;
  date: Date;
  hours: number;
  description: string;
  status: TimeEntryStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

export interface BiweeklyPaymentSummary {
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  timeEntries: TimeEntryWithDetails[];
  canProcess: boolean;
}

export class MilestoneService {
  
  /**
   * Get all milestones for a contract with details
   */
  static async getMilestonesByContract(
    contractId: string, 
    userId: string, 
    userRole: 'business' | 'talent'
  ): Promise<MilestoneWithDetails[]> {
    // Verify user has access to this contract
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        [userRole === 'business' ? 'businessId' : 'talentId']: userId
      },
      include: {
        project: { select: { type: true } }
      }
    });

    if (!contract) {
      throw new Error('Contract not found or access denied');
    }

    const milestones = await prisma.milestone.findMany({
      where: { contractId },
      include: {
        deliverables: true,
        timeEntries: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    return milestones.map(milestone => ({
      ...milestone,
      amount: Number(milestone.amount),
      deliverables: milestone.deliverables.map(d => ({
        ...d,
        // Convert any Decimal fields if needed
      })),
      timeEntries: milestone.timeEntries.map(t => ({
        ...t,
        hours: Number(t.hours)
      })),
      totalHours: milestone.timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0),
      canSubmit: this.canSubmitMilestone(milestone, userRole),
      canApprove: this.canApproveMilestone(milestone, userRole)
    }));
  }

  /**
   * Create a new deliverable for a milestone
   */
  static async createDeliverable(
    milestoneId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      fileUrl?: string;
    }
  ) {
    // Verify user is the talent on this contract
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        contract: { talentId: userId }
      }
    });

    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }

    return await prisma.deliverable.create({
      data: {
        milestoneId,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl || null,
        status: 'PENDING'
      }
    });
  }

  /**
   * Submit a deliverable
   */
  static async submitDeliverable(
    deliverableId: string,
    userId: string
  ) {
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        milestone: {
          contract: { talentId: userId }
        }
      }
    });

    if (!deliverable) {
      throw new Error('Deliverable not found or access denied');
    }

    if (deliverable.status !== 'PENDING') {
      throw new Error('Deliverable has already been submitted');
    }

    return await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });
  }

  /**
   * Approve or reject a deliverable
   */
  static async reviewDeliverable(
    deliverableId: string,
    userId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) {
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        milestone: {
          contract: { businessId: userId }
        }
      }
    });

    if (!deliverable) {
      throw new Error('Deliverable not found or access denied');
    }

    if (deliverable.status !== 'SUBMITTED') {
      throw new Error('Deliverable must be submitted before it can be reviewed');
    }

    const updateData = action === 'approve' 
      ? { status: 'APPROVED' as DeliverableStatus, approvedAt: new Date() }
      : { 
          status: 'REJECTED' as DeliverableStatus, 
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || 'No reason provided'
        };

    return await prisma.deliverable.update({
      where: { id: deliverableId },
      data: updateData
    });
  }

  /**
   * Submit milestone for approval
   */
  static async submitMilestone(
    milestoneId: string,
    userId: string
  ) {
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        contract: { talentId: userId }
      },
      include: {
        deliverables: true,
        contract: { include: { project: true } }
      }
    });

    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }

    if (milestone.status !== 'PENDING' && milestone.status !== 'IN_PROGRESS') {
      throw new Error('Milestone cannot be submitted in its current state');
    }

    // For fixed projects, check if all deliverables are submitted
    if (milestone.contract.project.type === 'FIXED_PRICE') {
      const pendingDeliverables = milestone.deliverables.filter(d => d.status === 'PENDING');
      if (pendingDeliverables.length > 0) {
        throw new Error('All deliverables must be submitted before milestone can be submitted');
      }
    }

    return await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });
  }

  /**
   * Approve or reject a milestone
   */
  static async reviewMilestone(
    milestoneId: string,
    userId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) {
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        contract: { businessId: userId }
      },
      include: {
        contract: {
          include: {
            business: { include: { profile: true } },
            talent: { include: { profile: true } }
          }
        }
      }
    });

    if (!milestone) {
      throw new Error('Milestone not found or access denied');
    }

    if (milestone.status !== 'SUBMITTED') {
      throw new Error('Milestone must be submitted before it can be reviewed');
    }

    const updateData = action === 'approve' 
      ? { status: 'APPROVED' as MilestoneStatus, approvedAt: new Date() }
      : { 
          status: 'REJECTED' as MilestoneStatus, 
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || 'No reason provided'
        };

    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData
    });

    // If approved, initiate payment
    if (action === 'approve') {
      await this.processMilestonePayment(milestone);
    }

    return updatedMilestone;
  }

  /**
   * Add time entry for hourly projects
   */
  static async addTimeEntry(
    contractId: string,
    userId: string,
    data: {
      date: Date;
      hours: number;
      description: string;
      milestoneId?: string;
    }
  ) {
    // Verify user is the talent on this contract
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        talentId: userId
      },
      include: { project: true }
    });

    if (!contract) {
      throw new Error('Contract not found or access denied');
    }

    if (contract.project.type !== 'HOURLY') {
      throw new Error('Time entries can only be added to hourly projects');
    }

    // Validate hours
    if (!data.hours || isNaN(data.hours) || data.hours <= 0) {
      throw new Error('Hours must be a valid positive number');
    }

    return await prisma.timeEntry.create({
      data: {
        contractId,
        milestoneId: data.milestoneId || null,
        date: data.date,
        hours: data.hours,
        description: data.description,
        status: 'PENDING'
      }
    });
  }

  /**
   * Approve or reject time entries
   */
  static async reviewTimeEntry(
    timeEntryId: string,
    userId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) {
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        contract: { businessId: userId }
      }
    });

    if (!timeEntry) {
      throw new Error('Time entry not found or access denied');
    }

    if (timeEntry.status !== 'PENDING') {
      throw new Error('Time entry has already been reviewed');
    }

    const updateData = action === 'approve' 
      ? { status: 'APPROVED' as TimeEntryStatus, approvedAt: new Date() }
      : { 
          status: 'REJECTED' as TimeEntryStatus, 
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || 'No reason provided'
        };

    return await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: updateData
    });
  }

  /**
   * Get biweekly payment summary for hourly projects
   */
  static async getBiweeklyPaymentSummary(
    contractId: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BiweeklyPaymentSummary> {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        businessId: userId
      },
      include: {
        project: true,
        talent: { 
          include: { 
            profile: {
              include: { location: true }
            }
          }
        }
      }
    });

    if (!contract) {
      throw new Error('Contract not found or access denied');
    }

    if (contract.project.type !== 'HOURLY') {
      throw new Error('Biweekly payments only apply to hourly projects');
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        contractId,
        date: {
          gte: periodStart,
          lte: periodEnd
        },
        status: 'APPROVED'
      },
      orderBy: { date: 'asc' }
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const hourlyRate = Number(contract.hourlyRate || 0);
    const grossAmount = totalHours * hourlyRate;

    // Calculate platform fee for talent
    const talentProvinceCode = contract.talent.profile?.location?.province || 'ON';
    const talentHasGstHst = Boolean(contract.talent.profile?.gstHstNumber) || Boolean(contract.talent.profile?.taxExempt);
    
    const platformFeeCalc = TaxService.calculateTalentPlatformFee(
      grossAmount,
      talentProvinceCode,
      talentHasGstHst
    );

    const netAmount = grossAmount - platformFeeCalc.totalFee;

    return {
      periodStart,
      periodEnd,
      totalHours,
      hourlyRate,
      grossAmount,
      platformFee: platformFeeCalc.totalFee,
      netAmount,
      timeEntries: timeEntries.map(entry => ({
        ...entry,
        hours: Number(entry.hours)
      })),
      canProcess: totalHours > 0
    };
  }

  /**
   * Process biweekly payment for hourly projects
   */
  static async processBiweeklyPayment(
    contractId: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    const summary = await this.getBiweeklyPaymentSummary(contractId, userId, periodStart, periodEnd);
    
    if (!summary.canProcess) {
      throw new Error('No approved hours to process for this period');
    }

    // Get contract with talent details
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { 
        talent: {
          select: {
            id: true,
            email: true,
            stripeConnectAccountId: true
          }
        }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Verify talent has Stripe Connect account
    if (!contract.talent.stripeConnectAccountId) {
      throw new Error('Talent does not have a payout account set up');
    }

    // Create payment record with PROCESSING status
    const payment = await prisma.payment.create({
      data: {
        contractId,
        payerId: contract.businessId,
        payeeId: contract.talentId,
        amount: summary.grossAmount,
        platformFee: summary.platformFee,
        netAmount: summary.netAmount,
        status: 'PROCESSING'
      }
    });

    try {
      // Transfer funds to talent's Stripe Connect account
      const { stripeService } = await import('./stripe.service');
      
      const transfer = await stripeService.transferToTalent(
        Number(summary.netAmount),
        contract.talent.stripeConnectAccountId,
        {
          contractId,
          paymentId: payment.id,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          description: `Biweekly payment for ${summary.totalHours} hours`
        }
      );

      // Update payment with transfer ID and mark as completed
      return await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: transfer.id,
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

    } catch (transferError: any) {
      console.error('Biweekly payment transfer failed:', transferError);
      
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
      
      throw new Error(`Failed to transfer biweekly payment: ${transferError?.message || 'Transfer failed'}`);
    }
  }

  /**
   * Process milestone payment
   */
  private static async processMilestonePayment(milestone: any) {
    const contract = milestone.contract;
    
    // Calculate platform fee for talent
    const talentProvinceCode = contract.talent.profile?.location?.province || 'ON';
    const talentHasGstHst = Boolean(contract.talent.profile?.gstHstNumber) || Boolean(contract.talent.profile?.taxExempt);
    
    const milestoneAmount = Number(milestone.amount);
    const platformFeeCalc = TaxService.calculateTalentPlatformFee(
      milestoneAmount,
      talentProvinceCode,
      talentHasGstHst
    );

    const netAmount = milestoneAmount - platformFeeCalc.totalFee;

    return await prisma.payment.create({
      data: {
        contractId: milestone.contractId,
        milestoneId: milestone.id,
        payerId: contract.businessId,
        payeeId: contract.talentId,
        amount: milestoneAmount,
        platformFee: platformFeeCalc.totalFee,
        netAmount: netAmount,
        status: 'PROCESSING'
      }
    });
  }

  /**
   * Check if milestone can be submitted
   */
  private static canSubmitMilestone(milestone: any, userRole: string): boolean {
    if (userRole !== 'talent') return false;
    return milestone.status === 'PENDING' || milestone.status === 'IN_PROGRESS';
  }

  /**
   * Check if milestone can be approved
   */
  private static canApproveMilestone(milestone: any, userRole: string): boolean {
    if (userRole !== 'business') return false;
    return milestone.status === 'SUBMITTED';
  }
}

export default MilestoneService;
