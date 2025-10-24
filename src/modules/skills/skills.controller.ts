import { Request, Response } from 'express';
import { SkillsService, CreateSkillInput, UpdateSkillInput } from './skills.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { logger } from '@/config/logger';

export class SkillsController {
  private skillsService: SkillsService;

  constructor() {
    this.skillsService = new SkillsService();
  }

  // Get all skills with filtering
  getSkills = asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const query = {
      category: category as string | undefined,
      search: search as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.skillsService.getSkills(query);

    res.json({
      skills: result.skills,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get skill by ID
  getSkillById = asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params;
    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }
    const skill = await this.skillsService.getSkillById(skillId);

    return res.json({
      skill,
    });
  });

  // Get skill categories
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.skillsService.getCategories();

    res.json({
      categories,
    });
  });

  // Search skills (autocomplete)
  searchSkills = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = '10' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({ skills: [] });
    }

    const skills = await this.skillsService.searchSkills(
      q,
      parseInt(limit as string, 10)
    );

    return res.json({
      skills,
    });
  });

  // Get popular skills
  getPopularSkills = asyncHandler(async (req: Request, res: Response) => {
    const { limit = '20' } = req.query;

    const skills = await this.skillsService.getPopularSkills(
      parseInt(limit as string, 10)
    );

    res.json({
      skills,
    });
  });

  // Get trending skills
  getTrendingSkills = asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = '20' } = req.query;
    const skills = await this.skillsService.searchSkills(
      query as string || '',
      parseInt(limit as string, 10)
    );

    return res.json({
      success: true,
      data: { skills }
    });
  });

  // Create new skill (admin only)
  createSkill = asyncHandler(async (req: Request, res: Response) => {
    const input: CreateSkillInput = req.body;

    const skill = await this.skillsService.createSkill(input);

    logger.info('Skill created', {
      skillId: skill.id,
      name: skill.name,
      category: skill.category,
      createdBy: req.user!.id,
    });

    res.status(201).json({
      message: 'Skill created successfully',
      skill,
    });
  });

  // Update skill (admin only)
  updateSkill = asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params;
    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }
    const input: UpdateSkillInput = req.body;

    const skill = await this.skillsService.updateSkill(skillId, input);

    logger.info('Skill updated', {
      skillId,
      updatedFields: Object.keys(input),
      updatedBy: req.user!.id,
    });

    return res.json({
      message: 'Skill updated successfully',
      skill,
    });
  });

  // Delete skill (admin only)
  deleteSkill = asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params;
    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }
    await this.skillsService.deleteSkill(skillId);

    logger.info('Skill deleted', {
      skillId,
      deletedBy: req.user!.id,
    });

    return res.json({
      message: 'Skill deleted successfully',
    });
  });

  // Get skill statistics (admin only)
  getSkillStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.skillsService.getSkillStats();

    res.json({
      stats,
    });
  });

  // Bulk import skills (admin only)
  bulkImportSkills = asyncHandler(async (req: Request, res: Response) => {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        error: 'Skills must be an array',
      });
    }

    const result = await this.skillsService.bulkImportSkills(skills);

    logger.info('Bulk skill import completed', {
      total: skills.length,
      created: result.created,
      skipped: result.skipped,
      importedBy: req.user!.id,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: `Imported ${result.created} skills successfully`
    });
  });
}
