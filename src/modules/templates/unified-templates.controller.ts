import { Request, Response } from 'express'
import { UnifiedTemplatesService } from './unified-templates.service'

export class UnifiedTemplatesController {
  constructor(private unifiedTemplatesService: UnifiedTemplatesService) {}

  // Core CRUD operations
  getTemplates = async (req: Request, res: Response) => {
    try {
      const params = {
        page: req.query['page'] ? parseInt(req.query['page'] as string) : undefined,
        limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
        category: req.query['category'] as string,
        userType: req.query['userType'] as string,
        tags: req.query['tags'] ? (Array.isArray(req.query['tags']) ? req.query['tags'] as string[] : [req.query['tags'] as string]) : undefined,
        query: req.query['query'] as string,
        isPublic: req.query['isPublic'] ? req.query['isPublic'] === 'true' : undefined,
        createdBy: req.query['createdBy'] as string,
        sortBy: req.query['sortBy'] as string,
        sortOrder: req.query['sortOrder'] as 'asc' | 'desc'
      }

      const result = await this.unifiedTemplatesService.getTemplates(params)
      return res.json(result)
    } catch (error) {
      console.error('Error getting templates:', error)
      return res.status(500).json({ error: 'Failed to get templates' })
    }
  }

  getTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const template = await this.unifiedTemplatesService.getTemplate(templateId)
      return res.json(template)
    } catch (error) {
      console.error('Error getting template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else {
        return res.status(500).json({ error: 'Failed to get template' })
      }
    }
  }

  createTemplate = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const template = await this.unifiedTemplatesService.createTemplate(userId, req.body)
      return res.status(201).json(template)
    } catch (error) {
      console.error('Error creating template:', error)
      return res.status(500).json({ error: 'Failed to create template' })
    }
  }

  updateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const template = await this.unifiedTemplatesService.updateTemplate(templateId, userId, req.body)
      return res.json(template)
    } catch (error) {
      console.error('Error updating template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to update template' })
      }
    }
  }

  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      await this.unifiedTemplatesService.deleteTemplate(templateId, userId)
      return res.json({ message: 'Template deleted successfully' })
    } catch (error) {
      console.error('Error deleting template:', error)
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Template not found' })
      } else if (error instanceof Error && error.message.includes('permission')) {
        return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(500).json({ error: 'Failed to delete template' })
      }
    }
  }

  duplicateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const { name } = req.body
      const template = await this.unifiedTemplatesService.duplicateTemplate(templateId, userId, name)
      return res.status(201).json(template)
    } catch (error) {
      console.error('Error duplicating template:', error)
      return res.status(500).json({ error: 'Failed to duplicate template' })
    }
  }

  // Template usage and interaction
  generateFromTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const { variables } = req.body
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const result = await this.unifiedTemplatesService.generateFromTemplate(templateId, variables)
      return res.json(result)
    } catch (error) {
      console.error('Error generating from template:', error)
      return res.status(500).json({ error: 'Failed to generate from template' })
    }
  }

  useTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const result = await this.unifiedTemplatesService.useTemplate(templateId, userId, req.body)
      return res.json(result)
    } catch (error) {
      console.error('Error using template:', error)
      return res.status(500).json({ error: 'Failed to use template' })
    }
  }

  getTemplateUsage = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }
      const result = await this.unifiedTemplatesService.getTemplateUsage(templateId)
      return res.json(result)
    } catch (error) {
      console.error('Error getting template usage:', error)
      return res.status(500).json({ error: 'Failed to get template usage' })
    }
  }

  rateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const { rating, feedback } = req.body
      await this.unifiedTemplatesService.rateTemplate(templateId, userId, rating, feedback)
      return res.json({ message: 'Template rated successfully' })
    } catch (error) {
      console.error('Error rating template:', error)
      return res.status(500).json({ error: 'Failed to rate template' })
    }
  }

  // User templates and favorites
  getMyTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const templates = await this.unifiedTemplatesService.getMyTemplates(userId)
      return res.json(templates)
    } catch (error) {
      console.error('Error getting my templates:', error)
      return res.status(500).json({ error: 'Failed to get templates' })
    }
  }

  getFavoriteTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const templates = await this.unifiedTemplatesService.getFavoriteTemplates(userId)
      return res.json(templates)
    } catch (error) {
      console.error('Error getting favorite templates:', error)
      return res.status(500).json({ error: 'Failed to get favorite templates' })
    }
  }

  addToFavorites = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      await this.unifiedTemplatesService.addToFavorites(templateId, userId)
      return res.json({ message: 'Template added to favorites' })
    } catch (error) {
      console.error('Error adding to favorites:', error)
      return res.status(500).json({ error: 'Failed to add to favorites' })
    }
  }

  removeFromFavorites = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      await this.unifiedTemplatesService.removeFromFavorites(templateId, userId)
      return res.json({ message: 'Template removed from favorites' })
    } catch (error) {
      console.error('Error removing from favorites:', error)
      return res.status(500).json({ error: 'Failed to remove from favorites' })
    }
  }

  // Discovery and suggestions
  getTemplateCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.unifiedTemplatesService.getTemplateCategories()
      return res.json(categories)
    } catch (error) {
      console.error('Error getting template categories:', error)
      return res.status(500).json({ error: 'Failed to get template categories' })
    }
  }

  getSuggestedTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const suggestions = await this.unifiedTemplatesService.getSuggestedTemplates(userId, req.body)
      return res.json(suggestions)
    } catch (error) {
      console.error('Error getting suggested templates:', error)
      return res.status(500).json({ error: 'Failed to get suggested templates' })
    }
  }

  getPopularTemplates = async (req: Request, res: Response) => {
    try {
      const category = req.query['category']
      const userType = req.query['userType']
      const templates = await this.unifiedTemplatesService.getPopularTemplates(category as string, userType as string)
      return res.json(templates)
    } catch (error) {
      console.error('Error getting popular templates:', error)
      return res.status(500).json({ error: 'Failed to get popular templates' })
    }
  }

  // Template validation and processing
  validateTemplate = async (req: Request, res: Response) => {
    try {
      const validation = await this.unifiedTemplatesService.validateTemplate(req.body)
      return res.json(validation)
    } catch (error) {
      console.error('Error validating template:', error)
      return res.status(500).json({ error: 'Failed to validate template' })
    }
  }

  extractVariables = async (req: Request, res: Response) => {
    try {
      const { content } = req.body
      const variables = await this.unifiedTemplatesService.extractVariables(content)
      return res.json(variables)
    } catch (error) {
      console.error('Error extracting variables:', error)
      return res.status(500).json({ error: 'Failed to extract variables' })
    }
  }

  // Bulk operations
  bulkUpdateTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { templateIds, updates } = req.body
      const result = await this.unifiedTemplatesService.bulkUpdateTemplates(templateIds, updates, userId)
      return res.json(result)
    } catch (error) {
      console.error('Error bulk updating templates:', error)
      return res.status(500).json({ error: 'Failed to bulk update templates' })
    }
  }

  bulkDeleteTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { templateIds } = req.body
      const result = await this.unifiedTemplatesService.bulkDeleteTemplates(templateIds, userId)
      return res.json(result)
    } catch (error) {
      console.error('Error bulk deleting templates:', error)
      return res.status(500).json({ error: 'Failed to bulk delete templates' })
    }
  }

  // Import/Export
  exportTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { templateIds } = req.body
      const exportData = await this.unifiedTemplatesService.exportTemplates(templateIds, userId)
      
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=templates.json')
      return res.send(exportData)
    } catch (error) {
      console.error('Error exporting templates:', error)
      return res.status(500).json({ error: 'Failed to export templates' })
    }
  }

  importTemplates = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const result = await this.unifiedTemplatesService.importTemplates(req.file.buffer, userId)
      return res.json(result)
    } catch (error) {
      console.error('Error importing templates:', error)
      return res.status(500).json({ error: 'Failed to import templates' })
    }
  }

  // Analytics
  getTemplateAnalytics = async (req: Request, res: Response) => {
    try {
      const templateId = req.query['templateId']
      const dateFrom = req.query['dateFrom']
      const dateTo = req.query['dateTo']
      const analytics = await this.unifiedTemplatesService.getTemplateAnalytics(
        templateId as string,
        dateFrom as string,
        dateTo as string
      )
      return res.json(analytics)
    } catch (error) {
      console.error('Error getting template analytics:', error)
      return res.status(500).json({ error: 'Failed to get template analytics' })
    }
  }

  // Admin moderation
  moderateTemplate = async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params
      const { action, reason } = req.body
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      await this.unifiedTemplatesService.moderateTemplate(templateId, action, reason)
      return res.json({ message: 'Template moderated successfully' })
    } catch (error) {
      console.error('Error moderating template:', error)
      return res.status(500).json({ error: 'Failed to moderate template' })
    }
  }

  getFlaggedTemplates = async (req: Request, res: Response) => {
    try {
      const flaggedTemplates = await this.unifiedTemplatesService.getFlaggedTemplates()
      return res.json(flaggedTemplates)
    } catch (error) {
      console.error('Error getting flagged templates:', error)
      return res.status(500).json({ error: 'Failed to get flagged templates' })
    }
  }

  getTemplateReports = async (req: Request, res: Response) => {
    try {
      const reports = await this.unifiedTemplatesService.getTemplateReports()
      return res.json(reports)
    } catch (error) {
      console.error('Error getting template reports:', error)
      return res.status(500).json({ error: 'Failed to get template reports' })
    }
  }
}
