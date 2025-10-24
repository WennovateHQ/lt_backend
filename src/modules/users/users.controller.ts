import { Request, Response } from 'express';
import { UsersService, UpdateProfileInput, UpdateLocationInput, AddSkillInput } from './users.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { logger } from '@/config/logger';
import { UserType } from '@prisma/client';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  // Get current user's profile
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const profile = await this.usersService.getUserProfile(userId);

    return res.json({
      user: profile,
    });
  });

  // Get public user profile
  getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const profile = await this.usersService.getPublicProfile(userId);

    return res.json({
      user: profile,
    });
  });

  // Update user profile
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input: UpdateProfileInput = req.body;

    const updatedProfile = await this.usersService.updateProfile(userId, input);

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(input),
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updatedProfile,
    });
  });

  // Update user location
  updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input: UpdateLocationInput = req.body;

    const updatedProfile = await this.usersService.updateLocation(userId, input);

    logger.info('User location updated', {
      userId,
      city: input.city,
      province: input.province,
    });

    return res.json({
      message: 'Location updated successfully',
      user: updatedProfile,
    });
  });

  // Add skill to profile
  addSkill = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input: AddSkillInput = req.body;

    const updatedProfile = await this.usersService.addSkill(userId, input);

    logger.info('Skill added to profile', {
      userId,
      skillId: input.skillId,
      level: input.level,
    });

    return res.json({
      message: 'Skill added successfully',
      user: updatedProfile,
    });
  });

  // Remove skill from profile
  removeSkill = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { skillId } = req.params;
    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    const updatedProfile = await this.usersService.removeSkill(userId, skillId);

    logger.info('Skill removed from profile', {
      userId,
      skillId,
    });

    return res.json({
      message: 'Skill removed successfully',
      user: updatedProfile,
    });
  });

  // Update skill level/experience
  updateSkill = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { skillId } = req.params;
    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }
    const input: Partial<AddSkillInput> = req.body;

    const updatedProfile = await this.usersService.updateSkill(userId, skillId, input);

    logger.info('Skill updated', {
      userId,
      skillId,
      level: input.level,
      experience: input.experience,
    });

    return res.json({
      message: 'Skill updated successfully',
      user: updatedProfile,
    });
  });

  // Search users (public endpoint with rate limiting)
  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const {
      userType,
      city,
      province,
      skills,
      limit = '20',
      offset = '0',
    } = req.query;

    const query = {
      userType: userType as UserType | undefined,
      city: city as string | undefined,
      province: province as string | undefined,
      skills: skills ? (skills as string).split(',') : undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const result = await this.usersService.searchUsers(query);

    return res.json({
      users: result.users,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(result.total / query.limit),
      },
    });
  });

  // Get user statistics (admin only)
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.usersService.getUserStats();

    return res.json({
      stats,
    });
  });

  // Upload avatar
  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // TODO: Implement file upload to Azure Blob Storage
    // For now, we'll just return a placeholder URL
    const avatarUrl = `/uploads/avatars/${userId}/${req.file.filename}`;

    // Update user profile with avatar URL
    const updatedProfile = await this.usersService.updateProfile(userId, {
      avatar: avatarUrl,
    });

    logger.info('Avatar uploaded', {
      userId,
      filename: req.file.filename,
      size: req.file.size,
    });

    return res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user: updatedProfile,
    });
  });

  // Delete avatar
  deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Update user profile to remove avatar
    const updatedProfile = await this.usersService.updateProfile(userId, {
      avatar: null,
    });

    logger.info('Avatar deleted', {
      userId,
    });

    return res.json({
      message: 'Avatar deleted successfully',
      user: updatedProfile,
    });
  });

  // Get user's dashboard data
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    // const userType = req.user!.userType; // TODO: Use this for conditional dashboard data

    // Get user profile
    const profile = await this.usersService.getUserProfile(userId);

    // TODO: Get dashboard-specific data based on user type
    // For businesses: recent projects, applications, contracts
    // For talents: recent applications, contracts, earnings

    const dashboardData = {
      user: profile,
      // Add more dashboard-specific data here
      stats: {
        // Placeholder stats
        totalProjects: 0,
        activeContracts: 0,
        totalEarnings: 0,
      },
      recentActivity: [],
    };

    return res.json(dashboardData);
  });

  // Check if profile is complete
  checkProfileCompletion = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userType = req.user!.userType;

    const profile = await this.usersService.getUserProfile(userId);

    // Define required fields based on user type
    const requiredFields = {
      [UserType.BUSINESS]: [
        'profile.firstName',
        'profile.lastName',
        'profile.companyName',
        'profile.location.city',
        'profile.location.province',
      ],
      [UserType.TALENT]: [
        'profile.firstName',
        'profile.lastName',
        'profile.title',
        'profile.hourlyRate',
        'profile.location.city',
        'profile.location.province',
        'profile.skills', // At least one skill
      ],
      [UserType.ADMIN]: [
        'profile.firstName',
        'profile.lastName',
      ],
    };

    const required = requiredFields[userType];
    const missing: string[] = [];

    // Check each required field
    required.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], profile as any);
      
      if (field === 'profile.skills') {
        if (!value || value.length === 0) {
          missing.push(field);
        }
      } else if (!value) {
        missing.push(field);
      }
    });

    const isComplete = missing.length === 0;
    const completionPercentage = Math.round(
      ((required.length - missing.length) / required.length) * 100
    );

    return res.json({
      isComplete,
      completionPercentage,
      missingFields: missing,
      nextSteps: missing.slice(0, 3), // Show top 3 next steps
    });
  });

  // Portfolio management methods
  addPortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const portfolioData = req.body;

    const portfolioItem = await this.usersService.addPortfolioItem(userId, portfolioData);

    logger.info('Portfolio item added', {
      userId,
      portfolioItemId: portfolioItem.id,
    });

    return res.status(201).json({
      message: 'Portfolio item added successfully',
      portfolioItem,
    });
  });

  updatePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { portfolioId } = req.params;
    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }
    const portfolioData = req.body;

    const updatedItem = await this.usersService.updatePortfolioItem(userId, portfolioId, portfolioData);

    logger.info('Portfolio item updated', {
      userId,
      portfolioItemId: portfolioId,
    });

    return res.json({
      message: 'Portfolio item updated successfully',
      portfolioItem: updatedItem,
    });
  });

  deletePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { portfolioId } = req.params;
    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    const result = await this.usersService.deletePortfolioItem(userId, portfolioId);

    logger.info('Portfolio item deleted', {
      userId,
      portfolioItemId: portfolioId,
    });

    return res.json(result);
  });

  getPortfolioItems = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const portfolioItems = await this.usersService.getPortfolioItems(userId);

    return res.json({
      portfolioItems,
    });
  });
}
