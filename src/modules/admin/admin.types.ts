export interface AdminStats {
  overview: {
    totalUsers: number
    totalProjects: number
    totalApplications: number
    totalRevenue: number
    activeContracts: number
    disputeCount: number
  }
  userStats: {
    newUsersToday: number
    newUsersThisWeek: number
    newUsersThisMonth: number
    activeUsers: number
    verifiedUsers: number
    businessUsers: number
    talentUsers: number
  }
  projectStats: {
    projectsPostedToday: number
    projectsPostedThisWeek: number
    projectsPostedThisMonth: number
    activeProjects: number
    completedProjects: number
    averageProjectValue: number
    topCategories: Array<{
      category: string
      count: number
      percentage: number
    }>
  }
  financialStats: {
    revenueToday: number
    revenueThisWeek: number
    revenueThisMonth: number
    revenueThisYear: number
    platformFees: number
    processingFees: number
    escrowBalance: number
    pendingPayouts: number
  }
  performanceMetrics: {
    averageMatchTime: number
    successfulMatches: number
    matchSuccessRate: number
    averageProjectCompletion: number
    userSatisfactionScore: number
    systemUptime: number
    responseTime: number
    errorRate: number
  }
}

export interface UserManagementData {
  users: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    userType: 'BUSINESS' | 'TALENT' | 'ADMIN'
    emailVerified: boolean
    phoneVerified: boolean
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'BANNED'
    createdAt: string
    lastActiveAt?: string
    companyName?: string
    totalProjects?: number
    totalApplications?: number
    averageRating?: number
    flagCount: number
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserManagementParams {
  page?: number
  limit?: number
  search?: string
  userType?: 'BUSINESS' | 'TALENT' | 'ADMIN'
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'BANNED'
  verified?: boolean
  sortBy?: 'createdAt' | 'lastActiveAt' | 'email' | 'flagCount'
  sortOrder?: 'asc' | 'desc'
}

export interface SuspendUserRequest {
  reason: string
  duration?: number // days, null for permanent
  notifyUser: boolean
  internalNotes?: string
}

export interface VerifyUserRequest {
  verificationType: 'EMAIL' | 'PHONE' | 'BUSINESS' | 'IDENTITY'
  verificationData?: Record<string, any>
  adminNotes?: string
}

export interface PlatformHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  uptime: number
  responseTime: number
  errorRate: number
  activeUsers: number
  systemLoad: {
    cpu: number
    memory: number
    database: number
    redis: number
  }
  services: Array<{
    name: string
    status: 'UP' | 'DOWN' | 'DEGRADED'
    responseTime: number
    lastCheck: string
  }>
  alerts: Array<{
    id: string
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

export interface ReportGenerationRequest {
  type: 'USER_ACTIVITY' | 'FINANCIAL' | 'PLATFORM_HEALTH' | 'QUALITY_METRICS'
  dateRange: {
    startDate: string
    endDate: string
  }
  format: 'PDF' | 'CSV' | 'EXCEL'
  filters?: Record<string, any>
  includeCharts: boolean
  recipients?: string[]
}

export interface GeneratedReport {
  id: string
  type: string
  status: 'GENERATING' | 'COMPLETED' | 'FAILED'
  downloadUrl?: string
  generatedAt: string
  expiresAt: string
  fileSize?: number
  error?: string
}

export interface AnnouncementRequest {
  title: string
  content: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'FEATURE'
  targetAudience: 'ALL' | 'BUSINESS' | 'TALENT' | 'ADMIN'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  scheduledFor?: string
  expiresAt?: string
  actionRequired: boolean
  actionUrl?: string
  actionText?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'FEATURE'
  targetAudience: 'ALL' | 'BUSINESS' | 'TALENT' | 'ADMIN'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED'
  publishedAt?: string
  scheduledFor?: string
  expiresAt?: string
  actionRequired: boolean
  actionUrl?: string
  actionText?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  viewCount: number
  clickCount: number
}
