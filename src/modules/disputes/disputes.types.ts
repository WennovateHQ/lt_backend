export interface Dispute {
  id: string
  type: 'payment' | 'quality' | 'timeline' | 'scope' | 'communication' | 'contract_violation'
  status: 'draft' | 'submitted' | 'under_review' | 'mediation' | 'resolved' | 'escalated' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Related entities
  projectId: string
  contractId?: string
  
  // Parties involved
  complainant: {
    userId: string
    userType: 'business' | 'talent'
    name: string
    email: string
  }
  
  respondent: {
    userId: string
    userType: 'business' | 'talent'
    name: string
    email: string
  }
  
  // Dispute details
  subject: string
  description: string
  category: string
  subcategory?: string
  
  // Financial details
  amountInDispute?: number
  currency?: string
  requestedResolution: 'refund' | 'partial_refund' | 'completion' | 'compensation' | 'mediation' | 'other'
  requestedAmount?: number
  
  // Evidence and documentation
  evidence: Array<{
    id: string
    type: 'document' | 'screenshot' | 'message' | 'contract' | 'invoice' | 'other'
    fileName: string
    fileUrl: string
    description: string
    uploadedBy: string
    uploadedAt: string
  }>
  
  // Timeline and communication
  messages: Array<{
    id: string
    senderId: string
    senderType: 'complainant' | 'respondent' | 'mediator' | 'admin'
    content: string
    timestamp: string
    attachments?: Array<{
      fileName: string
      fileUrl: string
      fileType: string
    }>
  }>
  
  // Resolution details
  resolution?: {
    type: 'agreement' | 'mediation' | 'admin_decision'
    outcome: string
    financialResolution?: {
      refundAmount?: number
      compensationAmount?: number
      feeAdjustment?: number
    }
    agreementTerms?: string
    resolvedBy: string
    resolvedAt: string
  }
  
  // Administrative details
  assignedMediator?: {
    id: string
    name: string
    email: string
  }
  
  internalNotes?: string
  escalationReason?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  submittedAt?: string
  reviewStartedAt?: string
  mediationStartedAt?: string
  resolvedAt?: string
  closedAt?: string
  
  // Metadata
  tags?: string[]
  relatedDisputes?: string[]
  
  // Populated fields for API responses
  project?: {
    id: string
    title: string
    description: string
  }
  
  contract?: {
    id: string
    title: string
    status: string
  }
}

export interface CreateDisputeRequest {
  type: Dispute['type']
  projectId: string
  contractId?: string
  subject: string
  description: string
  category: string
  subcategory?: string
  amountInDispute?: number
  currency?: string
  requestedResolution: Dispute['requestedResolution']
  requestedAmount?: number
  evidence?: Array<{
    type: string
    fileName: string
    fileUrl: string
    description: string
  }>
  tags?: string[]
}

export interface UpdateDisputeRequest {
  subject?: string
  description?: string
  category?: string
  subcategory?: string
  amountInDispute?: number
  requestedResolution?: Dispute['requestedResolution']
  requestedAmount?: number
  tags?: string[]
}

export interface DisputeSearchParams {
  page?: number
  limit?: number
  status?: Dispute['status']
  type?: Dispute['type']
  priority?: Dispute['priority']
  complainantId?: string
  respondentId?: string
  projectId?: string
  contractId?: string
  assignedMediator?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  search?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'amountInDispute'
  sortOrder?: 'asc' | 'desc'
}

export interface DisputeSearchResponse {
  disputes: Dispute[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: {
    byStatus: Record<Dispute['status'], number>
    byType: Record<Dispute['type'], number>
    byPriority: Record<Dispute['priority'], number>
    totalAmount: number
    averageResolutionTime: number
  }
}

export interface AddEvidenceRequest {
  type: 'document' | 'screenshot' | 'message' | 'contract' | 'invoice' | 'other'
  fileName: string
  fileUrl: string
  description: string
}

export interface AddDisputeMessageRequest {
  content: string
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileType: string
  }>
}

export interface UpdateDisputeStatusRequest {
  status: Dispute['status']
  reason?: string
  internalNotes?: string
  assignMediator?: string
  priority?: Dispute['priority']
  escalationReason?: string
}

export interface ResolveDisputeRequest {
  type: 'agreement' | 'mediation' | 'admin_decision'
  outcome: string
  financialResolution?: {
    refundAmount?: number
    compensationAmount?: number
    feeAdjustment?: number
  }
  agreementTerms?: string
  notifyParties: boolean
  closeDispute: boolean
}

export interface DisputeStats {
  overview: {
    totalDisputes: number
    activeDisputes: number
    resolvedDisputes: number
    averageResolutionTime: number
    totalAmountInDispute: number
    totalAmountResolved: number
  }
  
  byStatus: Record<Dispute['status'], number>
  byType: Record<Dispute['type'], number>
  byPriority: Record<Dispute['priority'], number>
  
  trends: {
    disputesThisMonth: number
    disputesLastMonth: number
    resolutionTimeThisMonth: number
    resolutionTimeLastMonth: number
    satisfactionScore: number
  }
  
  topCategories: Array<{
    category: string
    count: number
    averageResolutionTime: number
  }>
  
  mediatorPerformance: Array<{
    mediatorId: string
    mediatorName: string
    casesHandled: number
    averageResolutionTime: number
    successRate: number
  }>
}

export interface DisputeNotification {
  type: 'dispute_created' | 'dispute_updated' | 'evidence_added' | 'message_added' | 'status_changed' | 'dispute_resolved'
  disputeId: string
  recipientId: string
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, any>
}
