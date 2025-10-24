import { PrismaClient, UserType, UserStatus } from '@prisma/client'
import { 
  AdminStats, 
  UserManagementData, 
  UserManagementParams, 
  SuspendUserRequest, 
  VerifyUserRequest,
  PlatformHealth,
  ReportGenerationRequest,
  GeneratedReport,
  AnnouncementRequest,
  Announcement
} from './admin.types'

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async getAdminStats(): Promise<AdminStats> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Overview stats
    const [
      totalUsers,
      totalProjects,
      totalApplications,
      activeContracts,
      disputeCount
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.application.count(),
      this.prisma.contract.count({ where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } } }),
      // Note: Dispute count will be 0 until disputes module is implemented
      Promise.resolve(0)
    ])

    // User stats
    const [
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsers,
      verifiedUsers,
      businessUsers,
      talentUsers
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      0, // lastActiveAt not tracked yet
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { userType: UserType.BUSINESS } }),
      this.prisma.user.count({ where: { userType: UserType.TALENT } })
    ])

    // Project stats
    const [
      projectsPostedToday,
      projectsPostedThisWeek,
      projectsPostedThisMonth,
      activeProjects,
      completedProjects
    ] = await Promise.all([
      this.prisma.project.count({ where: { createdAt: { gte: today } } }),
      this.prisma.project.count({ where: { createdAt: { gte: thisWeek } } }),
      this.prisma.project.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.project.count({ where: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } } }),
      this.prisma.project.count({ where: { status: 'COMPLETED' } })
    ])

    // Average project value - budget field doesn't exist yet
    const averageProjectValue = 0

    // Top categories - category field doesn't exist yet
    const topCategories: any[] = []

    // Financial stats (placeholder - will need payment integration)
    const financialStats = {
      revenueToday: 0,
      revenueThisWeek: 0,
      revenueThisMonth: 0,
      revenueThisYear: 0,
      platformFees: 0,
      processingFees: 0,
      escrowBalance: 0,
      pendingPayouts: 0
    }

    // Performance metrics (placeholder - will need monitoring integration)
    const performanceMetrics = {
      averageMatchTime: 24, // hours
      successfulMatches: 0,
      matchSuccessRate: 0,
      averageProjectCompletion: 85, // percentage
      userSatisfactionScore: 4.2,
      systemUptime: 99.9,
      responseTime: 250, // ms
      errorRate: 0.1 // percentage
    }

    return {
      overview: {
        totalUsers,
        totalProjects,
        totalApplications,
        totalRevenue: financialStats.revenueThisYear,
        activeContracts,
        disputeCount
      },
      userStats: {
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsers,
        verifiedUsers,
        businessUsers,
        talentUsers
      },
      projectStats: {
        projectsPostedToday,
        projectsPostedThisWeek,
        projectsPostedThisMonth,
        activeProjects,
        completedProjects,
        averageProjectValue,
        topCategories
      },
      financialStats,
      performanceMetrics
    }
  }

  async getUserManagement(params: UserManagementParams): Promise<UserManagementData> {
    const {
      page = 1,
      limit = 50,
      search: _search,
      userType: _userType,
      status: _status,
      verified: _verified,
      sortBy: _sortBy = 'createdAt',
      sortOrder: _sortOrder = 'desc'
    } = params

    const skip = (page - 1) * limit

    const where: any = {}

    if (_search) {
      where.OR = [
        { email: { contains: _search, mode: 'insensitive' } },
        { profile: {
          OR: [
            { firstName: { contains: _search, mode: 'insensitive' } },
            { lastName: { contains: _search, mode: 'insensitive' } },
            { companyName: { contains: _search, mode: 'insensitive' } }
          ]
        }}
      ]
    }

    if (_userType) {
      where.userType = _userType
    }

    if (_status) {
      where.status = _status
    }

    if (_verified !== undefined) {
      where.emailVerified = _verified
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [_sortBy]: _sortOrder },
        select: {
          id: true,
          email: true,
          userType: true,
          emailVerified: true,
          phoneVerified: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      }),
      this.prisma.user.count({ where })
    ])

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      userType: user.userType as 'BUSINESS' | 'TALENT' | 'ADMIN',
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      status: user.status as 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'BANNED',
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: '', // Field not tracked yet
      companyName: user.profile?.companyName || '',
      totalProjects: 0, // Projects don't have user relation yet
      totalApplications: user._count.applications,
      averageRating: 0, // Placeholder until reviews are implemented
      flagCount: 0 // Placeholder until flagging system is implemented
    }))

    return {
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async suspendUser(userId: string, data: SuspendUserRequest, _adminId?: string): Promise<void> {
    // TODO: Use expiresAt when suspension fields are added to schema
    // const expiresAt = data.duration 
    //   ? new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000)
    //   : null

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED
        // TODO: Add suspension fields to User schema:
        // suspendedAt, suspensionReason, suspensionExpiresAt, suspensionNotes
      }
    })

    // Store suspension details in admin logs or separate table
    // Reason: data.reason, Notes: data.internalNotes, Expires: expiresAt

    // TODO: Send notification to user if notifyUser is true
    // TODO: Log admin action
  }

  async verifyUser(userId: string, data: VerifyUserRequest, _adminId?: string): Promise<void> {
    const updateData: any = {}

    switch (data.verificationType) {
      case 'EMAIL':
        updateData.emailVerified = true
        updateData.emailVerifiedAt = new Date()
        break
      case 'PHONE':
        updateData.phoneVerified = true
        updateData.phoneVerifiedAt = new Date()
        break
      case 'BUSINESS':
        updateData.businessVerified = true
        updateData.businessVerifiedAt = new Date()
        break
      case 'IDENTITY':
        updateData.identityVerified = true
        updateData.identityVerifiedAt = new Date()
        break
    }

    if (data.adminNotes) {
      updateData.verificationNotes = data.adminNotes
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // TODO: Send notification to user
    // TODO: Log admin action
  }

  async getPlatformHealth(): Promise<PlatformHealth> {
    // This would integrate with monitoring services in production
    return {
      status: 'HEALTHY',
      uptime: 99.9,
      responseTime: 250,
      errorRate: 0.1,
      activeUsers: await this.prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      systemLoad: {
        cpu: 45,
        memory: 62,
        database: 38,
        redis: 25
      },
      services: [
        {
          name: 'Database',
          status: 'UP',
          responseTime: 15,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Redis',
          status: 'UP',
          responseTime: 5,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Email Service',
          status: 'UP',
          responseTime: 120,
          lastCheck: new Date().toISOString()
        }
      ],
      alerts: [] as any[]
    }
  }

  async generateReport(_data: ReportGenerationRequest): Promise<GeneratedReport> {
    // This would integrate with report generation service
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Placeholder implementation
    return {
      id: reportId,
      type: _data.type,
      status: 'GENERATING',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  async createAnnouncement(_data: AnnouncementRequest): Promise<Announcement> {
    // This would create announcement in database
    const announcementId = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: announcementId,
      title: _data.title,
      content: _data.content,
      type: _data.type,
      targetAudience: _data.targetAudience,
      priority: _data.priority,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      ...(_data.scheduledFor && { scheduledFor: _data.scheduledFor }),
      ...(_data.expiresAt && { expiresAt: _data.expiresAt }),
      actionRequired: _data.actionRequired || false,
      ...(_data.actionUrl && { actionUrl: _data.actionUrl }),
      createdBy: 'admin', // This should come from auth context
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      clickCount: 0
    }
  }
}
