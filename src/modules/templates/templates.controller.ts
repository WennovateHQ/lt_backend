import { Request, Response } from 'express'
import { TemplatesService } from './templates.service'
import { 
  CreateMessageTemplateRequest,
  UpdateMessageTemplateRequest,
  CreateContractTemplateRequest,
  UpdateContractTemplateRequest,
  CreateProposalTemplateRequest,
  TemplateSearchParams,
  GenerateFromTemplateRequest
} from './templates.types'

export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  // Message Templates
  getMessageTemplates = async (req: Request, res: Response) => {
    try {
      const params: TemplateSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        category: req.query['category'] as string,
        type: req.query['type'] as string,
        usage: req.query['usage'] as any,
        isSystem: req.query['isSystem'] ? req.query['isSystem'] === 'true' : undefined,
        isActive: req.query['isActive'] ? req.query['isActive'] === 'true' : undefined,
        isPublic: req.query['isPublic'] ? req.query['isPublic'] === 'true' : undefined,
        createdBy: req.query['createdBy'] as string,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.templatesService.getMessageTemplates(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting message templates:', error)
      return res.status(500).json({ error: 'Failed to get message templates' })
    }
  }

  getMessageTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const template = await this.templatesService.getMessageTemplate(templateId)
      return res.json(template)
    } catch (error) {
      console.error('Error getting message template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to get message template' })
      }
    }
  }

  createMessageTemplate = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: CreateMessageTemplateRequest = req.body

      // Validate required fields
      if (!data.name || !data.description || !data.category || !data.type || !data.content || !data.usage) {
        return res.status(400).json({ 
          error: 'Name, description, category, type, content, and usage are required' 
        })
      }

      // Validate variables array
      if (data.variables && !Array.isArray(data.variables)) {
        return res.status(400).json({ error: 'Variables must be an array' })
      }

      const template = await this.templatesService.createMessageTemplate(userId, data)
      return res.status(201).json(template)
    } catch (error) {
      console.error('Error creating message template:', error)
      return res.status(500).json({ error: 'Failed to create message template' })
    }
  }

  updateMessageTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const data: UpdateMessageTemplateRequest = req.body

      const template = await this.templatesService.updateMessageTemplate(templateId, userId, data)
      return res.json(template)
    } catch (error) {
      console.error('Error updating message template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to update message template' })
      }
    }
  }

  deleteMessageTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      await this.templatesService.deleteMessageTemplate(templateId, userId)
      return res.json({ message: 'Template deleted successfully' })
    } catch (error) {
      console.error('Error deleting message template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to delete message template' })
      }
    }
  }

  // Contract Templates
  getContractTemplates = async (req: Request, res: Response) => {
    try {
      const params: TemplateSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        category: req.query['category'] as string,
        usage: req.query['usage'] as any,
        isSystem: req.query['isSystem'] ? req.query['isSystem'] === 'true' : undefined,
        isActive: req.query['isActive'] ? req.query['isActive'] === 'true' : undefined,
        isPublic: req.query['isPublic'] ? req.query['isPublic'] === 'true' : undefined,
        createdBy: req.query['createdBy'] as string,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.templatesService.getContractTemplates(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting contract templates:', error)
      return res.status(500).json({ error: 'Failed to get contract templates' })
    }
  }

  getContractTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const template = await this.templatesService.getContractTemplate(templateId)
      return res.json(template)
    } catch (error) {
      console.error('Error getting contract template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to get contract template' })
      }
    }
  }

  createContractTemplate = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: CreateContractTemplateRequest = req.body

      // Validate required fields
      if (!data.name || !data.description || !data.category || !data.contractType || !data.jurisdiction || !data.usage) {
        return res.status(400).json({ 
          error: 'Name, description, category, contract type, jurisdiction, and usage are required' 
        })
      }

      // Validate sections
      if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
        return res.status(400).json({ error: 'At least one section is required' })
      }

      // Validate compliance
      if (!data.compliance) {
        return res.status(400).json({ error: 'Compliance information is required' })
      }

      const template = await this.templatesService.createContractTemplate(userId, data)
      return res.status(201).json(template)
    } catch (error) {
      console.error('Error creating contract template:', error)
      return res.status(500).json({ error: 'Failed to create contract template' })
    }
  }

  updateContractTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: UpdateContractTemplateRequest = req.body

      const template = await this.templatesService.updateContractTemplate(templateId, userId, data)
      return res.json(template)
    } catch (error) {
      console.error('Error updating contract template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to update contract template' })
      }
    }
  }

  // Proposal Templates
  getProposalTemplates = async (req: Request, res: Response) => {
    try {
      const params: TemplateSearchParams = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        category: req.query['category'] as string,
        usage: req.query['usage'] as any,
        isSystem: req.query['isSystem'] ? req.query['isSystem'] === 'true' : undefined,
        isActive: req.query['isActive'] ? req.query['isActive'] === 'true' : undefined,
        isPublic: req.query['isPublic'] ? req.query['isPublic'] === 'true' : undefined,
        createdBy: req.query['createdBy'] as string,
        search: req.query['search'] as string,
        sortBy: req.query['sortBy'] as any,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.templatesService.getProposalTemplates(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting proposal templates:', error)
      return res.status(500).json({ error: 'Failed to get proposal templates' })
    }
  }

  getProposalTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const template = await this.templatesService.getProposalTemplate(templateId)
      return res.json(template)
    } catch (error) {
      console.error('Error getting proposal template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to get proposal template' })
      }
    }
  }

  createProposalTemplate = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: CreateProposalTemplateRequest = req.body

      // Validate required fields
      if (!data.name || !data.description || !data.category || !data.targetAudience) {
        return res.status(400).json({ 
          error: 'Name, description, category, and target audience are required' 
        })
      }

      // Validate sections
      if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
        return res.status(400).json({ error: 'At least one section is required' })
      }

      const template = await this.templatesService.createProposalTemplate(userId, data)
      return res.status(201).json(template)
    } catch (error) {
      console.error('Error creating proposal template:', error)
      return res.status(500).json({ error: 'Failed to create proposal template' })
    }
  }

  // Template Generation and Processing
  generateFromTemplate = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const data: GenerateFromTemplateRequest = req.body

      // Validate required fields
      if (!data.templateId || !data.variables) {
        return res.status(400).json({ error: 'Template ID and variables are required' })
      }

      const generated = await this.templatesService.generateFromTemplate(userId, data)
      return res.json(generated)
    } catch (error) {
      console.error('Error generating from template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('variable')) {
        return res.status(400).json({ error: error.message })
      } else {
        return res.status(500).json({ error: 'Failed to generate from template' })
      }
    }
  }

  previewTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const variables = req.body.variables || {}

      const preview = await this.templatesService.previewTemplate(templateId, variables)
      return res.json(preview)
    } catch (error) {
      console.error('Error previewing template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to preview template' })
      }
    }
  }

  validateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateType } = req.params
      if (!templateType) {
        return res.status(400).json({ error: 'Template type is required' })
      }
      const templateData = req.body

      if (!['message', 'contract', 'proposal'].includes(templateType)) {
        return res.status(400).json({ error: 'Invalid template type' })
      }

      const validation = await this.templatesService.validateTemplate(templateType as any, templateData)
      return res.json(validation)
    } catch (error) {
      console.error('Error validating template:', error)
      return res.status(500).json({ error: 'Failed to validate template' })
    }
  }

  // User Templates
  getUserTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const templateType = req.query['type'] as 'message' | 'contract' | 'proposal' | undefined

      const templates = await this.templatesService.getUserTemplates(userId, templateType)
      return res.json(templates)
    } catch (error) {
      console.error('Error getting user templates:', error)
      return res.status(500).json({ error: 'Failed to get user templates' })
    }
  }

  duplicateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { name } = req.body

      const duplicatedTemplate = await this.templatesService.duplicateTemplate(templateId, userId, name)
      return res.status(201).json(duplicatedTemplate)
    } catch (error) {
      console.error('Error duplicating template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to duplicate template' })
      }
    }
  }

  shareTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { shareWithUserIds } = req.body

      if (!shareWithUserIds || !Array.isArray(shareWithUserIds)) {
        return res.status(400).json({ error: 'Share with user IDs must be an array' })
      }

      await this.templatesService.shareTemplate(templateId, userId, shareWithUserIds)
      return res.json({ message: 'Template shared successfully' })
    } catch (error) {
      console.error('Error sharing template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to share template' })
      }
    }
  }

  getSharedTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const templates = await this.templatesService.getSharedTemplates(userId)
      return res.json(templates)
    } catch (error) {
      console.error('Error getting shared templates:', error)
      return res.status(500).json({ error: 'Failed to get shared templates' })
    }
  }

  // Statistics
  getTemplateStats = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check admin permissions
      if (req.user?.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const stats = await this.templatesService.getTemplateStats()
      return res.json(stats)
    } catch (error) {
      console.error('Error getting template stats:', error)
      return res.status(500).json({ error: 'Failed to get template statistics' })
    }
  }
}
