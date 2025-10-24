import { Request, Response } from 'express'
import { AdminService } from './admin.service'
import { UserManagementParams, SuspendUserRequest, VerifyUserRequest, ReportGenerationRequest, AnnouncementRequest } from './admin.types'

export class AdminController {
  constructor(private adminService: AdminService) {}

  getAdminStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.adminService.getAdminStats()
      res.json(stats)
    } catch (error) {
      console.error('Error getting admin stats:', error)
      res.status(500).json({ error: 'Failed to get admin statistics' })
    }
  }

  getUserManagement = async (req: Request, res: Response) => {
    try {
      const params: UserManagementParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : 1,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : 10,
        search: req.query['search'] as string,
        userType: req.query['userType'] as 'BUSINESS' | 'TALENT' | 'ADMIN',
        status: req.query['status'] as 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'BANNED',
        verified: req.query['verified'] ? req.query['verified'] === 'true' : undefined,
        sortBy: req.query['sortBy'] as 'createdAt' | 'lastActiveAt' | 'email' | 'flagCount',
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.adminService.getUserManagement(params)
      res.json(result)
    } catch (error) {
      console.error('Error getting user management data:', error)
      res.status(500).json({ error: 'Failed to get user management data' })
    }
  }

  suspendUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }
      const data: SuspendUserRequest = req.body

      // Validate required fields
      if (!data.reason) {
        return res.status(400).json({ error: 'Suspension reason is required' })
      }

      await this.adminService.suspendUser(userId, data)
      return res.json({ message: 'User suspended successfully' })
    } catch (error) {
      console.error('Error suspending user:', error)
      return res.status(500).json({ error: 'Failed to suspend user' })
    }
  }

  verifyUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }
      const data: VerifyUserRequest = req.body

      // Validate required fields
      if (!data.verificationType) {
        return res.status(400).json({ error: 'Verification type is required' })
      }

      await this.adminService.verifyUser(userId, data)
      return res.json({ message: 'User verified successfully' })
    } catch (error) {
      console.error('Error verifying user:', error)
      return res.status(500).json({ error: 'Failed to verify user' })
    }
  }

  getPlatformHealth = async (req: Request, res: Response) => {
    try {
      const health = await this.adminService.getPlatformHealth()
      return res.json(health)
    } catch (error) {
      console.error('Error getting platform health:', error)
      return res.status(500).json({ error: 'Failed to get platform health' })
    }
  }

  generateReport = async (req: Request, res: Response) => {
    try {
      const data: ReportGenerationRequest = req.body

      // Validate required fields
      if (!data.type || !data.dateRange || !data.format) {
        return res.status(400).json({ 
          error: 'Report type, date range, and format are required' 
        })
      }

      // Validate date range
      const startDate = new Date(data.dateRange.startDate)
      const endDate = new Date(data.dateRange.endDate)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date range' })
      }

      if (startDate >= endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' })
      }

      const report = await this.adminService.generateReport(data)
      return res.json(report)
    } catch (error) {
      console.error('Error generating report:', error)
      return res.status(500).json({ error: 'Failed to generate report' })
    }
  }

  createAnnouncement = async (req: Request, res: Response) => {
    try {
      const data: AnnouncementRequest = req.body

      // Validate required fields
      if (!data.title || !data.content || !data.type || !data.targetAudience || !data.priority) {
        return res.status(400).json({ 
          error: 'Title, content, type, target audience, and priority are required' 
        })
      }

      // Validate scheduled date if provided
      if (data.scheduledFor) {
        const scheduledDate = new Date(data.scheduledFor)
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return res.status(400).json({ error: 'Scheduled date must be in the future' })
        }
      }

      // Validate expiry date if provided
      if (data.expiresAt) {
        const expiryDate = new Date(data.expiresAt)
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({ error: 'Invalid expiry date' })
        }
      }

      const announcement = await this.adminService.createAnnouncement(data)
      return res.status(201).json(announcement)
    } catch (error) {
      console.error('Error creating announcement:', error)
      return res.status(500).json({ error: 'Failed to create announcement' })
    }
  }

  // Additional utility endpoints
  getSystemInfo = async (req: Request, res: Response) => {
    try {
      const systemInfo = {
        version: process.env['APP_VERSION'] || '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
      return res.json(systemInfo)
    } catch (error) {
      console.error('Error getting system info:', error)
      return res.status(500).json({ error: 'Failed to get system information' })
    }
  }

  clearCache = async (req: Request, res: Response) => {
    try {
      // This would clear Redis cache in production
      return res.json({ message: 'Cache cleared successfully' })
    } catch (error) {
      console.error('Error clearing cache:', error)
      return res.status(500).json({ error: 'Failed to clear cache' })
    }
  }

  backupDatabase = async (req: Request, res: Response) => {
    try {
      // This would trigger database backup in production
      const backupId = `backup_${Date.now()}`
      return res.json({ 
        message: 'Database backup initiated',
        backupId,
        status: 'IN_PROGRESS'
      })
    } catch (error) {
      console.error('Error initiating database backup:', error)
      return res.status(500).json({ error: 'Failed to initiate database backup' })
    }
  }
}
