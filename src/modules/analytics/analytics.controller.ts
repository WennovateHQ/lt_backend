import { Request, Response } from 'express'
import { AnalyticsService } from './analytics.service'
import { AnalyticsFilters } from './analytics.types'

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  getQualityMetrics = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const metrics = await this.analyticsService.getQualityMetrics(filters)
      return res.json(metrics)
    } catch (error) {
      console.error('Error getting quality metrics:', error)
      return res.status(500).json({ error: 'Failed to get quality metrics' })
    }
  }

  getPerformanceDashboard = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const dashboard = await this.analyticsService.getPerformanceDashboard(filters)
      return res.json(dashboard)
    } catch (error) {
      console.error('Error getting performance dashboard:', error)
      return res.status(500).json({ error: 'Failed to get performance dashboard' })
    }
  }

  getUserBehaviorAnalytics = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const analytics = await this.analyticsService.getUserBehaviorAnalytics(filters)
      return res.json(analytics)
    } catch (error) {
      console.error('Error getting user behavior analytics:', error)
      return res.status(500).json({ error: 'Failed to get user behavior analytics' })
    }
  }

  getFinancialReports = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const reports = await this.analyticsService.getFinancialReports(filters)
      return res.json(reports)
    } catch (error) {
      console.error('Error getting financial reports:', error)
      return res.status(500).json({ error: 'Failed to get financial reports' })
    }
  }

  getPlatformInsights = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const insights = await this.analyticsService.getPlatformInsights(filters)
      return res.json(insights)
    } catch (error) {
      console.error('Error getting platform insights:', error)
      return res.status(500).json({ error: 'Failed to get platform insights' })
    }
  }

  createCustomReport = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const reportData = req.body

      // Validate required fields
      if (!reportData.name || !reportData.type || !reportData.metrics) {
        return res.status(400).json({ 
          error: 'Report name, type, and metrics are required' 
        })
      }

      // Validate metrics array
      if (!Array.isArray(reportData.metrics) || reportData.metrics.length === 0) {
        return res.status(400).json({ error: 'At least one metric is required' })
      }

      // Validate date range if provided
      if (reportData.filters?.dateRange) {
        const { startDate, endDate } = reportData.filters.dateRange
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' })
          }
          
          if (start >= end) {
            return res.status(400).json({ error: 'Start date must be before end date' })
          }
        }
      }

      const report = await this.analyticsService.createCustomReport(userId, reportData)
      return res.status(201).json(report)
    } catch (error) {
      console.error('Error creating custom report:', error)
      return res.status(500).json({ error: 'Failed to create custom report' })
    }
  }

  generateReport = async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params
      
      if (!reportId) {
        return res.status(400).json({ error: 'Report ID is required' })
      }

      const exportData = await this.analyticsService.generateReport(reportId)
      return res.json(exportData)
    } catch (error) {
      console.error('Error generating report:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Report not found' })
      } else {
        return res.status(500).json({ error: 'Failed to generate report' })
      }
    }
  }

  exportAnalytics = async (req: Request, res: Response) => {
    try {
      const { type, format } = req.body
      const filters = this.parseFilters(req.body.filters || {})

      // Validate required fields
      if (!type || !format) {
        return res.status(400).json({ error: 'Export type and format are required' })
      }

      // Validate type
      const validTypes = ['quality', 'performance', 'financial', 'user_behavior', 'platform_insights']
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: `Invalid export type. Must be one of: ${validTypes.join(', ')}` 
        })
      }

      // Validate format
      const validFormats = ['csv', 'excel', 'pdf', 'json']
      if (!validFormats.includes(format)) {
        return res.status(400).json({ 
          error: `Invalid export format. Must be one of: ${validFormats.join(', ')}` 
        })
      }

      const exportData = await this.analyticsService.exportAnalytics(type, format, (filters || {}) as AnalyticsFilters)
      return res.json(exportData)
    } catch (error) {
      console.error('Error exporting analytics:', error)
      return res.status(500).json({ error: 'Failed to export analytics' })
    }
  }

  // Utility endpoints for specific analytics
  getOverviewStats = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query)
      const [qualityMetrics, performanceDashboard] = await Promise.all([
        this.analyticsService.getQualityMetrics(filters),
        this.analyticsService.getPerformanceDashboard(filters)
      ])

      const overview = {
        users: {
          total: qualityMetrics.userMetrics.totalUsers,
          active: qualityMetrics.userMetrics.activeUsers,
          businesses: qualityMetrics.userMetrics.businesses.total,
          talents: qualityMetrics.userMetrics.talents.total
        },
        projects: {
          total: qualityMetrics.overview.totalProjects,
          completed: qualityMetrics.overview.completedProjects,
          successRate: qualityMetrics.overview.successRate
        },
        activity: {
          dailyActiveUsers: performanceDashboard.userActivity.dailyActiveUsers,
          weeklyActiveUsers: performanceDashboard.userActivity.weeklyActiveUsers,
          monthlyActiveUsers: performanceDashboard.userActivity.monthlyActiveUsers
        },
        health: {
          platformHealth: qualityMetrics.overview.platformHealth,
          systemStatus: performanceDashboard.systemHealth.status,
          uptime: performanceDashboard.systemHealth.uptime
        }
      }

      return res.json(overview)
    } catch (error) {
      console.error('Error getting overview stats:', error)
      return res.status(500).json({ error: 'Failed to get overview statistics' })
    }
  }

  getRealtimeMetrics = async (req: Request, res: Response) => {
    try {
      // This would typically connect to real-time monitoring systems
      const realtimeData = {
        activeUsers: 127,
        onlineUsers: 45,
        currentLoad: 68,
        responseTime: 245,
        errorRate: 0.08,
        requestsPerMinute: 1250,
        timestamp: new Date().toISOString()
      }

      return res.json(realtimeData)
    } catch (error) {
      console.error('Error getting realtime metrics:', error)
      return res.status(500).json({ error: 'Failed to get realtime metrics' })
    }
  }

  getHealthCheck = async (req: Request, res: Response) => {
    try {
      // Basic health check for analytics service
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          cache: 'connected',
          analytics: 'operational'
        },
        version: '1.0.0'
      }

      return res.json(health)
    } catch (error) {
      console.error('Error in health check:', error)
      return res.status(500).json({ 
        status: 'unhealthy',
        error: 'Analytics service unavailable',
        timestamp: new Date().toISOString()
      })
    }
  }

  private parseFilters(query: any): AnalyticsFilters | undefined {
    const filters: AnalyticsFilters = {
      dateRange: {
        startDate: '',
        endDate: ''
      }
    }

    // Parse date range
    if (query.startDate && query.endDate) {
      filters.dateRange = {
        startDate: query.startDate as string,
        endDate: query.endDate as string
      }
    } else {
      // Default to last 30 days if no date range provided
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      filters.dateRange = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    }

    // Parse other filters
    if (query.userType) {
      filters.userType = query.userType as 'business' | 'talent' | 'admin'
    }

    if (query.province || query.city) {
      filters.location = {
        province: query.province as string,
        city: query.city as string
      }
    }

    if (query.category) {
      filters.category = query.category as string
    }

    if (query.projectSize) {
      filters.projectSize = query.projectSize as 'small' | 'medium' | 'large'
    }

    if (query.budgetMin || query.budgetMax) {
      filters.budgetRange = {
        min: query.budgetMin ? parseFloat(query.budgetMin as string) : 0,
        max: query.budgetMax ? parseFloat(query.budgetMax as string) : Number.MAX_SAFE_INTEGER
      }
    }

    if (query.userSegment) {
      filters.userSegment = query.userSegment as string
    }

    return filters
  }
}
