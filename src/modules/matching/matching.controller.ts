import { Request, Response } from 'express';
import { MatchingService } from './matching.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { ValidationError } from '@/shared/utils/app-error';
import { logger } from '@/config/logger';
import { AuthRequest } from '@/shared/middleware/auth';

export class MatchingController {
  private matchingService: MatchingService;

  constructor() {
    this.matchingService = new MatchingService();
  }

  // Find talent matches for a project (business users only)
  findTalentForProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { projectId } = req.params;
    const { limit = '10' } = req.query;

    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const matches = await this.matchingService.findTalentForProject(
      projectId,
      parseInt(limit as string, 10)
    );

    logger.info('Talent matching requested', {
      projectId,
      userId: req.user!.id,
      matchesFound: matches.length,
    });

    res.json({
      matches,
      metadata: {
        projectId,
        totalMatches: matches.length,
        algorithm: 'weighted_scoring_v1',
        weights: {
          skills: 0.4,
          location: 0.25,
          experience: 0.15,
          rate: 0.1,
          availability: 0.1,
        },
      },
    });
  });

  // Find project matches for talent (talent users only)
  findProjectsForTalent = asyncHandler(async (req: Request, res: Response) => {
    const talentId = req.user!.id;
    const { limit = '10' } = req.query;

    const matches = await this.matchingService.findProjectsForTalent(
      talentId,
      parseInt(limit as string, 10)
    );

    logger.info('Project matching requested', {
      talentId,
      matchesFound: matches.length,
    });

    res.json({
      matches,
      metadata: {
        talentId,
        totalMatches: matches.length,
        algorithm: 'weighted_scoring_v1',
        weights: {
          skills: 0.4,
          location: 0.25,
          experience: 0.15,
          rate: 0.1,
          availability: 0.1,
        },
      },
    });
  });

  // Get matching statistics (admin only)
  getMatchingStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.matchingService.getMatchingStats();

    res.json({
      stats,
    });
  });

  // Get match explanation for a specific talent-project pair
  explainMatch = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, talentId } = req.params;

    if (!projectId || !talentId) {
      return res.status(400).json({ error: 'Project ID and Talent ID are required' });
    }

    // Find the specific match
    const matches = await this.matchingService.findTalentForProject(projectId, 100);
    const match = matches.find(m => m.talentId === talentId);

    if (!match) {
      return res.status(404).json({
        error: 'Match not found or score too low',
      });
    }

    logger.info('Match explanation requested', {
      projectId,
      talentId,
      userId: req.user!.id,
      score: match.score,
    });

    return res.json({
      match,
      explanation: {
        overallScore: match.score,
        breakdown: match.breakdown,
        recommendations: this.generateRecommendations(match.breakdown),
      },
    });
  });

  // Generate recommendations based on match breakdown
  private generateRecommendations(breakdown: any): string[] {
    const recommendations: string[] = [];

    if (breakdown.skillScore < 0.6) {
      recommendations.push('Consider developing skills that better match project requirements');
    }

    if (breakdown.locationScore < 0.5) {
      recommendations.push('Location may be a factor - consider remote work options or relocation');
    }

    if (breakdown.experienceScore < 0.6) {
      recommendations.push('Experience level may not align perfectly with project requirements');
    }

    if (breakdown.rateScore < 0.5) {
      recommendations.push('Rate expectations may not align with project budget');
    }

    if (breakdown.availabilityScore < 0.6) {
      recommendations.push('Consider updating availability to better match project timeline');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great match! Consider applying to this project');
    }

    return recommendations;
  }

  // Save talent for later
  saveTalent = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const { talentId, projectId } = req.body;

    if (!talentId) {
      throw new ValidationError('Talent ID is required');
    }

    const savedTalent = await this.matchingService.saveTalent(businessId, talentId, projectId);

    logger.info('Talent saved', {
      businessId,
      talentId,
      projectId,
    });

    res.status(201).json({
      message: 'Talent saved successfully',
      savedTalent,
    });
  });

  // Get saved talents
  getSavedTalents = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const { projectId } = req.query;

    const savedTalents = await this.matchingService.getSavedTalents(businessId, projectId as string);

    res.json({
      savedTalents,
      total: savedTalents.length,
    });
  });

  // Remove saved talent
  removeSavedTalent = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.user!.id;
    const { talentId } = req.params;

    if (!talentId) {
      throw new ValidationError('Talent ID is required');
    }

    const result = await this.matchingService.removeSavedTalent(businessId, talentId);

    logger.info('Saved talent removed', {
      businessId,
      talentId,
    });

    res.json(result);
  });
}
