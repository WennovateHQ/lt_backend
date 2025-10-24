import { Request, Response } from 'express'
import { DisputesService } from './disputes.service'
import { 
  CreateDisputeRequest, 
  UpdateDisputeRequest,
  DisputeSearchParams,
  AddEvidenceRequest,
  AddDisputeMessageRequest,
  UpdateDisputeStatusRequest,
  ResolveDisputeRequest
} from './disputes.types'

export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  createDispute = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: CreateDisputeRequest = req.body

      // Validate required fields
      if (!data.type || !data.projectId || !data.subject || !data.description || !data.category || !data.requestedResolution) {
        return res.status(400).json({ 
          error: 'Type, project ID, subject, description, category, and requested resolution are required' 
        })
      }

      // Validate amount fields
      if (data.amountInDispute && data.amountInDispute < 0) {
        return res.status(400).json({ error: 'Amount in dispute must be positive' })
      }

      if (data.requestedAmount && data.requestedAmount < 0) {
        return res.status(400).json({ error: 'Requested amount must be positive' })
      }

      const dispute = await this.disputesService.createDispute(userId, data)
      return res.status(201).json(dispute)
    } catch (error) {
      console.error('Error creating dispute:', error)
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to create dispute' })
      }
    }
  }

  getDispute = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }

      const dispute = await this.disputesService.getDispute(disputeId, userId)
      return res.json(dispute)
    } catch (error) {
      console.error('Error getting dispute:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to get dispute' })
      }
    }
  }

  getMyDisputes = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const params: DisputeSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : 1,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : 10,
        status: req.query['status'] as any,
        type: req.query['type'] as any,
        priority: req.query['priority'] as any,
        projectId: req.query['projectId'] as string,
        contractId: req.query['contractId'] as string,
        dateFrom: req.query['dateFrom'] as string,
        dateTo: req.query['dateTo'] as string,
        amountMin: req.query['amountMin'] ? parseFloat(req.query['amountMin'] as string) : undefined,
        amountMax: req.query['amountMax'] ? parseFloat(req.query['amountMax'] as string) : undefined,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.disputesService.getUserDisputes(userId, params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting user disputes:', error)
      return res.status(500).json({ error: 'Failed to get disputes' })
    }
  }

  updateDispute = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }
      const userId = req.user?.id
      const data: UpdateDisputeRequest = req.body

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Validate amount fields if provided
      if (data.amountInDispute && data.amountInDispute < 0) {
        return res.status(400).json({ error: 'Amount in dispute must be positive' })
      }

      if (data.requestedAmount && data.requestedAmount < 0) {
        return res.status(400).json({ error: 'Requested amount must be positive' })
      }

      const dispute = await this.disputesService.updateDispute(disputeId, userId, data)
      return res.json(dispute)
    } catch (error) {
      console.error('Error updating dispute:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to update dispute' })
      }
    }
  }

  addEvidence = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }
      const userId = req.user?.id
      const data: AddEvidenceRequest = req.body

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Validate required fields
      if (!data.type || !data.fileName || !data.fileUrl || !data.description) {
        return res.status(400).json({ 
          error: 'Type, file name, file URL, and description are required' 
        })
      }

      const dispute = await this.disputesService.addEvidence(disputeId, userId, data)
      return res.json(dispute)
    } catch (error) {
      console.error('Error adding evidence:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to add evidence' })
      }
    }
  }

  addMessage = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }
      const userId = req.user?.id
      const data: AddDisputeMessageRequest = req.body

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Validate required fields
      if (!data.content || data.content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' })
      }

      if (data.content.length > 5000) {
        return res.status(400).json({ error: 'Message content too long (max 5000 characters)' })
      }

      const dispute = await this.disputesService.addMessage(disputeId, userId, data)
      return res.json(dispute)
    } catch (error) {
      console.error('Error adding message:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to add message' })
      }
    }
  }

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }
      const userId = req.user?.id
      const data: UpdateDisputeStatusRequest = req.body

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check if user is admin (this should be handled by middleware)
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      // Validate required fields
      if (!data.status) {
        return res.status(400).json({ error: 'Status is required' })
      }

      const dispute = await this.disputesService.updateStatus(disputeId, userId, data)
      return res.json(dispute)
    } catch (error) {
      console.error('Error updating dispute status:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to update dispute status' })
      }
    }
  }

  resolveDispute = async (req: Request, res: Response) => {
    try {
      const { disputeId } = req.params
      if (!disputeId) {
        return res.status(400).json({ error: 'Dispute ID is required' })
      }
      const userId = req.user?.id
      const data: ResolveDisputeRequest = req.body

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check if user is admin (this should be handled by middleware)
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      // Validate required fields
      if (!data.type || !data.outcome) {
        return res.status(400).json({ error: 'Resolution type and outcome are required' })
      }

      // Validate financial resolution amounts
      if (data.financialResolution) {
        const { refundAmount, compensationAmount, feeAdjustment } = data.financialResolution
        
        if (refundAmount && refundAmount < 0) {
          return res.status(400).json({ error: 'Refund amount must be positive' })
        }
        
        if (compensationAmount && compensationAmount < 0) {
          return res.status(400).json({ error: 'Compensation amount must be positive' })
        }
        
        if (feeAdjustment && Math.abs(feeAdjustment) > 10000) {
          return res.status(400).json({ error: 'Fee adjustment amount is too large' })
        }
      }

      const dispute = await this.disputesService.resolveDispute(disputeId, userId, data)
      return res.json(dispute)
    } catch (error) {
      console.error('Error resolving dispute:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Dispute not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to resolve dispute' })
      }
    }
  }

  // Admin endpoints
  getAllDisputes = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check if user is admin
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const params: DisputeSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : 1,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : 10,
        status: req.query['status'] as any,
        type: req.query['type'] as any,
        priority: req.query['priority'] as any,
        complainantId: req.query['complainantId'] as string,
        respondentId: req.query['respondentId'] as string,
        projectId: req.query['projectId'] as string,
        contractId: req.query['contractId'] as string,
        assignedMediator: req.query['assignedMediator'] as string,
        dateFrom: req.query['dateFrom'] as string,
        dateTo: req.query['dateTo'] as string,
        amountMin: req.query['amountMin'] ? parseFloat(req.query['amountMin'] as string) : undefined,
        amountMax: req.query['amountMax'] ? parseFloat(req.query['amountMax'] as string) : undefined,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.disputesService.getAdminDisputes(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting admin disputes:', error)
      return res.status(500).json({ error: 'Failed to get disputes' })
    }
  }

  getDisputeStats = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check if user is admin
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const stats = await this.disputesService.getDisputeStats()
      return res.json(stats)
    } catch (error) {
      console.error('Error getting dispute stats:', error)
      return res.status(500).json({ error: 'Failed to get dispute statistics' })
    }
  }
}
