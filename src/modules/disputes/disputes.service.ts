import { PrismaClient } from '@prisma/client'
import { 
  Dispute, 
  CreateDisputeRequest, 
  UpdateDisputeRequest,
  DisputeSearchParams,
  DisputeSearchResponse,
  AddEvidenceRequest,
  AddDisputeMessageRequest,
  UpdateDisputeStatusRequest,
  ResolveDisputeRequest,
  DisputeStats
} from './disputes.types'

export class DisputesService {
  constructor(private prisma: PrismaClient) {}

  async createDispute(userId: string, data: CreateDisputeRequest): Promise<Dispute> {
    // Get project and user details
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        business: {
          select: { 
            id: true, 
            email: true,
            profile: {
              select: { firstName: true, lastName: true, companyName: true }
            }
          }
        }
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const complainant = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        userType: true,
        profile: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    if (!complainant) {
      throw new Error('User not found')
    }

    // Determine respondent based on complainant type
    let respondent
    if (complainant.userType === 'BUSINESS') {
      // If business is complaining, need to find the talent (from applications/contracts)
      const application = await this.prisma.application.findFirst({
        where: { 
          projectId: data.projectId,
          status: 'ACCEPTED'
        },
        include: {
          talent: {
            select: { 
              id: true, 
              email: true, 
              userType: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      })
      respondent = (application as any)?.talent
    } else {
      // If talent is complaining, respondent is the project owner (business)
      respondent = {
        id: (project as any).business?.id,
        firstName: (project as any).business?.profile?.firstName || '',
        lastName: (project as any).business?.profile?.lastName || '',
        email: (project as any).business?.email,
        userType: 'BUSINESS' as const,
        profile: (project as any).business?.profile
      }
    }

    if (!respondent) {
      throw new Error('Could not determine dispute respondent')
    }

    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create dispute record (this would be stored in database in production)
    const dispute: Dispute = {
      id: disputeId,
      type: data.type,
      status: 'draft',
      priority: 'medium',
      projectId: data.projectId,
      ...(data.contractId && { contractId: data.contractId }),
      complainant: {
        userId: complainant.id,
        userType: complainant.userType.toLowerCase() as 'business' | 'talent',
        name: `${complainant.profile?.firstName || ''} ${complainant.profile?.lastName || ''}`.trim(),
        email: complainant.email
      },
      respondent: {
        userId: respondent.id,
        userType: respondent.userType.toLowerCase() as 'business' | 'talent',
        name: `${respondent.profile?.firstName || respondent.firstName || ''} ${respondent.profile?.lastName || respondent.lastName || ''}`.trim(),
        email: respondent.email
      },
      subject: data.subject,
      description: data.description,
      category: data.category,
      ...(data.subcategory && { subcategory: data.subcategory }),
      ...(data.amountInDispute && { amountInDispute: data.amountInDispute }),
      currency: data.currency || 'CAD',
      requestedResolution: data.requestedResolution,
      ...(data.requestedAmount && { requestedAmount: data.requestedAmount }),
      evidence: data.evidence?.map((e, index) => ({
        id: `evidence_${Date.now()}_${index}`,
        type: e.type as any,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        description: e.description,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      })) || [],
      messages: [] as any[],
      ...(data.tags && { tags: data.tags }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        description: project.description
      }
    }

    // TODO: Store in database
    // TODO: Send notifications to respondent
    // TODO: Log dispute creation

    return dispute
  }

  async getDispute(disputeId: string, _userId: string): Promise<Dispute> {
    // TODO: Fetch from database
    // TODO: Check user permissions (complainant, respondent, admin, or mediator)
    
    // Placeholder implementation
    const dispute: Dispute = {
      id: disputeId,
      type: 'payment',
      status: 'submitted',
      priority: 'high',
      projectId: 'project_123',
      complainant: {
        userId: 'user_123',
        userType: 'talent',
        name: 'John Doe',
        email: 'john@example.com'
      },
      respondent: {
        userId: 'user_456',
        userType: 'business',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      subject: 'Payment not received',
      description: 'Project completed but payment not released',
      category: 'payment',
      amountInDispute: 2500,
      currency: 'CAD',
      requestedResolution: 'refund',
      requestedAmount: 2500,
      evidence: [] as any[],
      messages: [] as any[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    }

    return dispute
  }

  async getUserDisputes(_userId: string, params: DisputeSearchParams): Promise<DisputeSearchResponse> {
    const {
      page = 1,
      limit = 20,
      status: _status,
      priority: _priority,
      search: _search,
      sortBy: _sortBy = 'createdAt',
      sortOrder: _sortOrder = 'desc'
    } = params

    // TODO: Implement database query
    // TODO: Filter by user (complainant or respondent)
    
    // Placeholder implementation
    const disputes: Dispute[] = []
    const total = 0

    return {
      disputes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        byStatus: {
          'draft': 0,
          'submitted': 0,
          'under_review': 0,
          'mediation': 0,
          'resolved': 0,
          'escalated': 0,
          'closed': 0
        },
        byType: {
          'payment': 0,
          'quality': 0,
          'timeline': 0,
          'scope': 0,
          'communication': 0,
          'contract_violation': 0
        },
        byPriority: {
          'low': 0,
          'medium': 0,
          'high': 0,
          'urgent': 0
        },
        totalAmount: 0,
        averageResolutionTime: 0
      }
    }
  }

  async updateDispute(disputeId: string, _userId: string, data: UpdateDisputeRequest): Promise<Dispute> {
    // TODO: Check permissions (only complainant can update)
    // TODO: Validate dispute status (only draft disputes can be updated)
    // TODO: Update database record
    
    const dispute = await this.getDispute(disputeId, _userId)
    
    // Update fields
    const updatedDispute: Dispute = {
      ...dispute,
      ...data,
      updatedAt: new Date().toISOString()
    }

    // TODO: Save to database
    // TODO: Log changes

    return updatedDispute
  }

  async addEvidence(disputeId: string, userId: string, data: AddEvidenceRequest): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId, userId)
    
    // TODO: Check permissions (complainant, respondent, or admin)
    // TODO: Validate file upload
    
    const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newEvidence = {
      id: evidenceId,
      type: data.type,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      description: data.description,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    }

    const updatedDispute: Dispute = {
      ...dispute,
      evidence: [...dispute.evidence, newEvidence],
      updatedAt: new Date().toISOString()
    }

    // TODO: Save to database
    // TODO: Notify other party
    // TODO: Log evidence addition

    return updatedDispute
  }

  async addMessage(disputeId: string, userId: string, data: AddDisputeMessageRequest): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId, userId)
    
    // TODO: Check permissions
    // TODO: Determine sender type
    
    const messageId = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newMessage = {
      id: messageId,
      senderId: userId,
      senderType: 'complainant' as const, // TODO: Determine actual sender type
      content: data.content,
      timestamp: new Date().toISOString(),
      ...(data.attachments && { attachments: data.attachments })
    }

    const updatedDispute: Dispute = {
      ...dispute,
      messages: [...dispute.messages, newMessage],
      updatedAt: new Date().toISOString()
    }

    // TODO: Save to database
    // TODO: Notify other parties
    // TODO: Log message

    return updatedDispute
  }

  async updateStatus(disputeId: string, adminId: string, data: UpdateDisputeStatusRequest): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId, adminId)
    
    // TODO: Check admin permissions
    // TODO: Validate status transition
    
    const updatedDispute: Dispute = {
      ...dispute,
      status: data.status,
      priority: data.priority || dispute.priority,
      ...(data.internalNotes && { internalNotes: data.internalNotes }),
      ...(data.escalationReason && { escalationReason: data.escalationReason }),
      updatedAt: new Date().toISOString()
    }

    // Set timestamp fields based on status
    switch (data.status) {
      case 'submitted':
        updatedDispute.submittedAt = new Date().toISOString()
        break
      case 'under_review':
        updatedDispute.reviewStartedAt = new Date().toISOString()
        break
      case 'mediation':
        updatedDispute.mediationStartedAt = new Date().toISOString()
        break
      case 'resolved':
        updatedDispute.resolvedAt = new Date().toISOString()
        break
      case 'closed':
        updatedDispute.closedAt = new Date().toISOString()
        break
    }

    // Assign mediator if specified
    if (data.assignMediator) {
      const mediator = await this.prisma.user.findUnique({
        where: { id: data.assignMediator },
        select: { 
          id: true, 
          email: true,
          profile: {
            select: { firstName: true, lastName: true }
          }
        }
      })
      
      if (mediator) {
        updatedDispute.assignedMediator = {
          id: mediator.id,
          name: `${mediator.profile?.firstName || ''} ${mediator.profile?.lastName || ''}`.trim(),
          email: mediator.email
        }
      }
    }

    // TODO: Save to database
    // TODO: Send notifications
    // TODO: Log status change

    return updatedDispute
  }

  async resolveDispute(disputeId: string, adminId: string, data: ResolveDisputeRequest): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId, adminId)
    
    // TODO: Check admin permissions
    // TODO: Validate resolution data
    
    const resolution = {
      type: data.type,
      outcome: data.outcome,
      ...(data.financialResolution && { financialResolution: data.financialResolution }),
      ...(data.agreementTerms && { agreementTerms: data.agreementTerms }),
      resolvedBy: adminId,
      resolvedAt: new Date().toISOString()
    }

    const updatedDispute: Dispute = {
      ...dispute,
      status: data.closeDispute ? 'closed' : 'resolved',
      resolution,
      resolvedAt: new Date().toISOString(),
      ...(data.closeDispute && { closedAt: new Date().toISOString() }),
      updatedAt: new Date().toISOString()
    }

    // TODO: Save to database
    // TODO: Process financial resolution (refunds, payments, etc.)
    // TODO: Send notifications to parties
    // TODO: Log resolution

    return updatedDispute
  }

  async getAdminDisputes(_params: DisputeSearchParams): Promise<DisputeSearchResponse> {
    // TODO: Implement admin view with all disputes
    // TODO: Apply filters and search
    // TODO: Calculate summary statistics
    
    return {
      disputes: [] as any[],
      total: 0,
      page: _params.page || 1,
      limit: _params.limit || 20,
      totalPages: 0,
      summary: {
        byStatus: {
          'draft': 0,
          'submitted': 0,
          'under_review': 0,
          'mediation': 0,
          'resolved': 0,
          'escalated': 0,
          'closed': 0
        },
        byType: {
          'payment': 0,
          'quality': 0,
          'timeline': 0,
          'scope': 0,
          'communication': 0,
          'contract_violation': 0
        },
        byPriority: {
          'low': 0,
          'medium': 0,
          'high': 0,
          'urgent': 0
        },
        totalAmount: 0,
        averageResolutionTime: 0
      }
    }
  }

  async getDisputeStats(): Promise<DisputeStats> {
    // TODO: Calculate comprehensive dispute statistics
    // TODO: Get trends and performance metrics
    
    return {
      overview: {
        totalDisputes: 0,
        activeDisputes: 0,
        resolvedDisputes: 0,
        averageResolutionTime: 0,
        totalAmountInDispute: 0,
        totalAmountResolved: 0
      },
      byStatus: {
        'draft': 0,
        'submitted': 0,
        'under_review': 0,
        'mediation': 0,
        'resolved': 0,
        'escalated': 0,
        'closed': 0
      },
      byType: {
        'payment': 0,
        'quality': 0,
        'timeline': 0,
        'scope': 0,
        'communication': 0,
        'contract_violation': 0
      },
      byPriority: {
        'low': 0,
        'medium': 0,
        'high': 0,
        'urgent': 0
      },
      trends: {
        disputesThisMonth: 0,
        disputesLastMonth: 0,
        resolutionTimeThisMonth: 0,
        resolutionTimeLastMonth: 0,
        satisfactionScore: 0
      },
      topCategories: [] as any[],
      mediatorPerformance: [] as any[]
    }
  }
}
