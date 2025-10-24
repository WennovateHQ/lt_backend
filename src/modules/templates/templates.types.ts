export interface MessageTemplate {
  id: string
  name: string
  description: string
  category: 'project_inquiry' | 'application_response' | 'contract_negotiation' | 'project_update' | 'payment_reminder' | 'general'
  type: 'email' | 'in_app_message' | 'notification'
  
  // Template content
  subject?: string // For email templates
  content: string
  variables: Array<{
    name: string
    description: string
    required: boolean
    defaultValue?: string
    type: 'text' | 'number' | 'date' | 'currency' | 'boolean'
  }>
  
  // Template metadata
  isSystem: boolean
  isActive: boolean
  usage: 'business' | 'talent' | 'admin' | 'all'
  
  // Statistics
  usageCount: number
  lastUsed?: string
  
  // Ownership and permissions
  createdBy: string
  isPublic: boolean
  sharedWith?: string[]
  
  // Timestamps
  createdAt: string
  updatedAt: string
  
  // Populated fields
  creator?: {
    id: string
    firstName: string
    lastName: string
    userType: 'business' | 'talent' | 'admin'
  }
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  category: 'web_development' | 'mobile_development' | 'design' | 'marketing' | 'writing' | 'consulting' | 'general'
  
  // Contract structure
  sections: Array<{
    id: string
    title: string
    content: string
    required: boolean
    order: number
    variables: string[]
  }>
  
  // Template configuration
  contractType: 'fixed_price' | 'hourly' | 'milestone_based'
  jurisdiction: 'BC' | 'AB' | 'ON' | 'QC' | 'other'
  
  // Legal compliance
  compliance: {
    bcCompliant: boolean
    includesTermination: boolean
    includesIntellectualProperty: boolean
    includesConfidentiality: boolean
    includesDispute: boolean
  }
  
  // Variables and customization
  variables: Array<{
    name: string
    description: string
    section: string
    required: boolean
    type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'list'
    defaultValue?: string
    options?: string[] // For list type
    validation?: {
      min?: number
      max?: number
      pattern?: string
    }
  }>
  
  // Template metadata
  isSystem: boolean
  isActive: boolean
  usage: 'business' | 'talent' | 'admin' | 'all'
  
  // Statistics
  usageCount: number
  lastUsed?: string
  averageRating?: number
  
  // Ownership and permissions
  createdBy: string
  isPublic: boolean
  sharedWith?: string[]
  
  // Timestamps
  createdAt: string
  updatedAt: string
  
  // Populated fields
  creator?: {
    id: string
    firstName: string
    lastName: string
    userType: 'business' | 'talent' | 'admin'
  }
}

export interface ProposalTemplate {
  id: string
  name: string
  description: string
  category: string
  
  // Proposal structure
  sections: Array<{
    id: string
    title: string
    content: string
    required: boolean
    order: number
    type: 'text' | 'list' | 'timeline' | 'pricing' | 'portfolio'
  }>
  
  // Template configuration
  targetAudience: 'small_business' | 'enterprise' | 'startup' | 'agency' | 'individual'
  projectType: string[]
  
  // Variables and customization
  variables: Array<{
    name: string
    description: string
    section: string
    required: boolean
    type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'list'
    defaultValue?: string
  }>
  
  // Template metadata
  isSystem: boolean
  isActive: boolean
  usage: 'talent' | 'admin' | 'all'
  
  // Statistics
  usageCount: number
  lastUsed?: string
  successRate?: number // Percentage of proposals using this template that were accepted
  
  // Ownership and permissions
  createdBy: string
  isPublic: boolean
  sharedWith?: string[]
  
  // Timestamps
  createdAt: string
  updatedAt: string
  
  // Populated fields
  creator?: {
    id: string
    firstName: string
    lastName: string
    userType: 'business' | 'talent' | 'admin'
  }
}

export interface CreateMessageTemplateRequest {
  name: string
  description: string
  category: MessageTemplate['category']
  type: MessageTemplate['type']
  subject?: string
  content: string
  variables: MessageTemplate['variables']
  usage: MessageTemplate['usage']
  isPublic?: boolean
  sharedWith?: string[]
}

export interface UpdateMessageTemplateRequest {
  name?: string
  description?: string
  category?: MessageTemplate['category']
  subject?: string
  content?: string
  variables?: MessageTemplate['variables']
  isActive?: boolean
  isPublic?: boolean
  sharedWith?: string[]
}

export interface CreateContractTemplateRequest {
  name: string
  description: string
  category: ContractTemplate['category']
  sections: ContractTemplate['sections']
  contractType: ContractTemplate['contractType']
  jurisdiction: ContractTemplate['jurisdiction']
  compliance: ContractTemplate['compliance']
  variables: ContractTemplate['variables']
  usage: ContractTemplate['usage']
  isPublic?: boolean
  sharedWith?: string[]
}

export interface UpdateContractTemplateRequest {
  name?: string
  description?: string
  category?: ContractTemplate['category']
  sections?: ContractTemplate['sections']
  contractType?: ContractTemplate['contractType']
  jurisdiction?: ContractTemplate['jurisdiction']
  compliance?: ContractTemplate['compliance']
  variables?: ContractTemplate['variables']
  isActive?: boolean
  isPublic?: boolean
  sharedWith?: string[]
}

export interface CreateProposalTemplateRequest {
  name: string
  description: string
  category: string
  sections: ProposalTemplate['sections']
  targetAudience: ProposalTemplate['targetAudience']
  projectType: string[]
  variables: ProposalTemplate['variables']
  isPublic?: boolean
  sharedWith?: string[]
}

export interface UpdateProposalTemplateRequest {
  name?: string
  description?: string
  category?: string
  sections?: ProposalTemplate['sections']
  targetAudience?: ProposalTemplate['targetAudience']
  projectType?: string[]
  variables?: ProposalTemplate['variables']
  isActive?: boolean
  isPublic?: boolean
  sharedWith?: string[]
}

export interface TemplateSearchParams {
  page?: number
  limit?: number
  category?: string
  type?: string
  usage?: 'business' | 'talent' | 'admin' | 'all'
  isSystem?: boolean
  isActive?: boolean
  isPublic?: boolean
  createdBy?: string
  search?: string
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'lastUsed'
  sortOrder?: 'asc' | 'desc'
}

export interface TemplateSearchResponse<T> {
  templates: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GenerateFromTemplateRequest {
  templateId: string
  variables: Record<string, any>
  customizations?: {
    sections?: Array<{
      id: string
      content?: string
      include?: boolean
    }>
    additionalContent?: string
  }
}

export interface GeneratedContent {
  id: string
  templateId: string
  content: string
  subject?: string
  variables: Record<string, any>
  generatedAt: string
  expiresAt?: string
}

export interface TemplateStats {
  overview: {
    totalTemplates: number
    activeTemplates: number
    systemTemplates: number
    userTemplates: number
    publicTemplates: number
  }
  
  usage: {
    totalUsage: number
    usageThisMonth: number
    usageLastMonth: number
    mostUsedTemplates: Array<{
      templateId: string
      templateName: string
      usageCount: number
      category: string
    }>
  }
  
  byCategory: Record<string, {
    count: number
    usage: number
    averageRating?: number
  }>
  
  byType: Record<string, {
    count: number
    usage: number
  }>
  
  performance: {
    averageSuccessRate?: number
    topPerformingTemplates: Array<{
      templateId: string
      templateName: string
      successRate: number
      usageCount: number
    }>
  }
}

export interface TemplateValidation {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    severity: 'error' | 'warning'
  }>
  warnings: Array<{
    field: string
    message: string
    suggestion?: string
  }>
  suggestions: Array<{
    type: 'content' | 'structure' | 'variables' | 'compliance'
    message: string
    impact: 'high' | 'medium' | 'low'
  }>
}

export interface TemplatePreview {
  content: string
  subject?: string
  sections?: Array<{
    title: string
    content: string
  }>
  variables: Record<string, any>
  estimatedLength: number
  readabilityScore?: number
  complianceScore?: number
}
