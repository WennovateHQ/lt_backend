export interface QualityMetrics {
  overview: {
    totalProjects: number
    completedProjects: number
    successRate: number
    averageRating: number
    userSatisfactionScore: number
    platformHealth: 'excellent' | 'good' | 'fair' | 'poor'
  }
  
  projectMetrics: {
    completionRate: number
    onTimeDelivery: number
    budgetAdherence: number
    qualityScore: number
    clientSatisfaction: number
    talentSatisfaction: number
    
    trends: {
      completionRateTrend: number
      qualityTrend: number
      satisfactionTrend: number
    }
    
    byCategory: Array<{
      category: string
      projectCount: number
      successRate: number
      averageRating: number
      averageBudget: number
    }>
  }
  
  userMetrics: {
    totalUsers: number
    activeUsers: number
    retentionRate: number
    verificationRate: number
    
    businesses: {
      total: number
      active: number
      averageProjectsPosted: number
      averageSpend: number
      satisfactionScore: number
    }
    
    talents: {
      total: number
      active: number
      averageApplications: number
      averageEarnings: number
      satisfactionScore: number
    }
  }
  
  financialMetrics: {
    totalTransactionVolume: number
    averageProjectValue: number
    platformRevenue: number
    paymentSuccessRate: number
    disputeRate: number
    refundRate: number
  }
  
  performanceMetrics: {
    averageMatchTime: number
    applicationSuccessRate: number
    timeToHire: number
    projectStartTime: number
    communicationResponseTime: number
  }
}

export interface PerformanceDashboard {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    responseTime: number
    errorRate: number
    throughput: number
    activeConnections: number
  }
  
  userActivity: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    newRegistrations: number
    sessionDuration: number
    bounceRate: number
  }
  
  businessMetrics: {
    projectsPosted: number
    applicationsReceived: number
    contractsSigned: number
    paymentsProcessed: number
    averageTimeToHire: number
    customerLifetimeValue: number
  }
  
  technicalMetrics: {
    apiResponseTimes: Array<{
      endpoint: string
      averageTime: number
      errorRate: number
      requestCount: number
    }>
    databasePerformance: {
      queryTime: number
      connectionPool: number
      slowQueries: number
    }
    cacheHitRate: number
    cdnPerformance: number
  }
  
  alerts: Array<{
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    category: 'system' | 'business' | 'security' | 'performance'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

export interface UserBehaviorAnalytics {
  demographics: {
    ageGroups: Record<string, number>
    locations: Array<{
      city: string
      province: string
      userCount: number
      percentage: number
    }>
    userTypes: Record<'business' | 'talent', number>
    industries: Array<{
      industry: string
      userCount: number
      percentage: number
    }>
  }
  
  engagement: {
    averageSessionDuration: number
    pagesPerSession: number
    returnVisitorRate: number
    featureUsage: Array<{
      feature: string
      usageCount: number
      uniqueUsers: number
      adoptionRate: number
    }>
  }
  
  conversionFunnels: {
    registration: {
      visitors: number
      signups: number
      emailVerified: number
      profileCompleted: number
      firstAction: number
      conversionRate: number
    }
    
    projectPosting: {
      projectStarted: number
      projectCompleted: number
      projectPublished: number
      applicationsReceived: number
      talentHired: number
      conversionRate: number
    }
    
    talentApplication: {
      projectsViewed: number
      applicationsStarted: number
      applicationsSubmitted: number
      applicationsAccepted: number
      contractsSigned: number
      conversionRate: number
    }
  }
  
  userJourney: {
    commonPaths: Array<{
      path: string[]
      userCount: number
      conversionRate: number
      averageTime: number
    }>
    
    dropOffPoints: Array<{
      page: string
      dropOffRate: number
      commonNextAction: string
      suggestions: string[]
    }>
  }
  
  satisfaction: {
    npsScore: number
    customerSatisfactionScore: number
    featureSatisfaction: Array<{
      feature: string
      satisfactionScore: number
      usageFrequency: number
    }>
    
    feedback: {
      totalFeedback: number
      positivePercentage: number
      commonComplaints: Array<{
        category: string
        count: number
        severity: 'low' | 'medium' | 'high'
      }>
      
      featureRequests: Array<{
        feature: string
        requestCount: number
        priority: number
      }>
    }
  }
}

export interface FinancialReports {
  revenue: {
    totalRevenue: number
    recurringRevenue: number
    oneTimeRevenue: number
    revenueGrowthRate: number
    
    byPeriod: Array<{
      period: string
      revenue: number
      transactions: number
      averageTransactionValue: number
    }>
    
    bySource: Array<{
      source: 'platform_fees' | 'payment_processing' | 'premium_features' | 'advertising'
      amount: number
      percentage: number
      growth: number
    }>
  }
  
  expenses: {
    totalExpenses: number
    operatingExpenses: number
    marketingExpenses: number
    technologyExpenses: number
    
    breakdown: Array<{
      category: string
      amount: number
      percentage: number
      trend: number
    }>
  }
  
  profitability: {
    grossProfit: number
    netProfit: number
    profitMargin: number
    ebitda: number
    
    customerAcquisitionCost: number
    customerLifetimeValue: number
    paybackPeriod: number
  }
  
  cashFlow: {
    operatingCashFlow: number
    freeCashFlow: number
    cashReserves: number
    burnRate: number
    runwayMonths: number
  }
  
  transactions: {
    totalTransactions: number
    successfulTransactions: number
    failedTransactions: number
    chargebacks: number
    refunds: number
    
    averageTransactionValue: number
    transactionVolume: number
    processingFees: number
  }
}

export interface PlatformInsights {
  marketTrends: {
    demandByCategory: Array<{
      category: string
      projectCount: number
      growthRate: number
      averageBudget: number
      competitionLevel: 'low' | 'medium' | 'high'
    }>
    
    skillDemand: Array<{
      skill: string
      demandScore: number
      supplyScore: number
      averageRate: number
      growthTrend: number
    }>
    
    geographicTrends: Array<{
      location: string
      projectCount: number
      talentCount: number
      averageRates: number
      marketSaturation: number
    }>
  }
  
  competitiveAnalysis: {
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche'
    marketShare: number
    competitiveAdvantages: string[]
    threats: string[]
    opportunities: string[]
  }
  
  userSegmentation: {
    segments: Array<{
      name: string
      size: number
      characteristics: string[]
      behavior: {
        averageSpend: number
        frequency: number
        retention: number
        satisfaction: number
      }
      growthPotential: 'high' | 'medium' | 'low'
    }>
  }
  
  recommendations: {
    strategic: Array<{
      category: 'growth' | 'retention' | 'monetization' | 'product' | 'marketing'
      recommendation: string
      impact: 'high' | 'medium' | 'low'
      effort: 'high' | 'medium' | 'low'
      timeline: string
    }>
    
    tactical: Array<{
      area: string
      action: string
      expectedOutcome: string
      metrics: string[]
    }>
  }
  
  forecasting: {
    userGrowth: Array<{
      period: string
      projectedUsers: number
      confidence: number
    }>
    
    revenueProjection: Array<{
      period: string
      projectedRevenue: number
      confidence: number
    }>
    
    marketOpportunity: {
      totalAddressableMarket: number
      serviceableAddressableMarket: number
      serviceableObtainableMarket: number
    }
  }
}

export interface AnalyticsFilters {
  dateRange: {
    startDate: string
    endDate: string
  }
  userType?: 'business' | 'talent' | 'admin'
  location?: {
    province?: string
    city?: string
  }
  category?: string
  projectSize?: 'small' | 'medium' | 'large'
  budgetRange?: {
    min: number
    max: number
  }
  userSegment?: string
}

export interface CustomReport {
  id: string
  name: string
  description: string
  type: 'quality' | 'performance' | 'financial' | 'user_behavior' | 'platform_insights'
  filters: AnalyticsFilters
  metrics: string[]
  visualizations: Array<{
    type: 'chart' | 'table' | 'kpi' | 'heatmap' | 'funnel'
    config: Record<string, any>
  }>
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    recipients: string[]
    format: 'pdf' | 'excel' | 'dashboard'
  }
  createdBy: string
  createdAt: string
  lastGenerated?: string
}

export interface AnalyticsExport {
  id: string
  type: 'quality' | 'performance' | 'financial' | 'user_behavior' | 'platform_insights'
  format: 'csv' | 'excel' | 'pdf' | 'json'
  filters: AnalyticsFilters
  status: 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  generatedAt?: string
  expiresAt?: string
  fileSize?: number
  error?: string
}
