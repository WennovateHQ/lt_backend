import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { ProjectStatus, UserType } from '@prisma/client';

// Matching criteria weights
const MATCHING_WEIGHTS = {
  SKILL_MATCH: 0.4,        // 40% - Skills alignment
  LOCATION_MATCH: 0.25,    // 25% - Geographic proximity
  EXPERIENCE_MATCH: 0.15,  // 15% - Experience level alignment
  RATE_MATCH: 0.10,        // 10% - Rate compatibility
  AVAILABILITY_MATCH: 0.10, // 10% - Availability alignment
};

// Distance calculation constants
// TODO: Use for location-based filtering
// const EARTH_RADIUS_KM = 6371;
// const MAX_DISTANCE_KM = 100; // Maximum reasonable distance for local matching

export interface TalentMatch {
  talentId: string;
  score: number;
  breakdown: {
    skillScore: number;
    locationScore: number;
    experienceScore: number;
    rateScore: number;
    availabilityScore: number;
  };
  talent: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      title: string | null;
      avatar: string | null;
      hourlyRate: number | null;
      availability: string | null;
      location: {
        city: string;
        province: string;
        latitude: number | null;
        longitude: number | null;
      } | null;
    } | null;
    skills: Array<{
      level: number;
      experience: number | null;
      skill: {
        id: string;
        name: string;
        category: string;
      };
    }>;
  };
}

export interface ProjectMatch {
  projectId: string;
  score: number;
  breakdown: {
    skillScore: number;
    locationScore: number;
    experienceScore: number;
    rateScore: number;
    availabilityScore: number;
  };
  project: {
    id: string;
    title: string;
    description: string;
    type: string;
    budgetMin: number | null;
    budgetMax: number | null;
    hourlyRate: number | null;
    isRemote: boolean;
    city: string | null;
    province: string | null;
    experienceLevel: string | null;
    publishedAt: Date | null;
    business: {
      profile: {
        firstName: string;
        lastName: string;
        companyName: string | null;
        avatar: string | null;
      } | null;
    };
    skills: Array<{
      required: boolean;
      level: number | null;
      skill: {
        id: string;
        name: string;
        category: string;
      };
    }>;
  };
}

export class MatchingService {
  private prisma = prisma;
  
  // TODO: Use for location-based matching
  // Calculate distance between two coordinates using Haversine formula
  // private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  //   const dLat = this.toRadians(lat2 - lat1);
  //   const dLon = this.toRadians(lon2 - lon1);
  //   
  //   const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //             Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
  //             Math.sin(dLon / 2) * Math.sin(dLon / 2);
  //   
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return EARTH_RADIUS_KM * c;
  // }

  // private toRadians(degrees: number): number {
  //   return degrees * (Math.PI / 180);
  // }

  // Calculate skill matching score
  private calculateSkillScore(talentSkills: any[], projectSkills: any[]): number {
    if (projectSkills.length === 0) return 0;

    let totalScore = 0;
    let requiredSkillsMatched = 0;
    let totalRequiredSkills = 0;

    for (const projectSkill of projectSkills) {
      if (projectSkill.required) {
        totalRequiredSkills++;
      }

      const talentSkill = talentSkills.find(ts => ts.skill.id === projectSkill.skill.id);
      
      if (talentSkill) {
        if (projectSkill.required) {
          requiredSkillsMatched++;
        }

        // Calculate skill level match (0-1 score)
        const requiredLevel = projectSkill.level || 3; // Default to mid-level if not specified
        const talentLevel = talentSkill.level;
        
        let levelScore = 1;
        if (talentLevel < requiredLevel) {
          // Penalty for being below required level
          levelScore = Math.max(0, 1 - (requiredLevel - talentLevel) * 0.2);
        } else if (talentLevel > requiredLevel) {
          // Slight bonus for exceeding requirements, but diminishing returns
          levelScore = Math.min(1, 1 + (talentLevel - requiredLevel) * 0.1);
        }

        totalScore += levelScore * (projectSkill.required ? 2 : 1); // Weight required skills more
      } else if (projectSkill.required) {
        // Missing required skill is a significant penalty
        totalScore -= 1;
      }
    }

    // If missing required skills, heavily penalize
    if (totalRequiredSkills > 0 && requiredSkillsMatched < totalRequiredSkills) {
      const missingRequiredRatio = (totalRequiredSkills - requiredSkillsMatched) / totalRequiredSkills;
      totalScore *= (1 - missingRequiredRatio * 0.8); // Up to 80% penalty
    }

    // Normalize score
    const maxPossibleScore = projectSkills.reduce((sum, ps) => sum + (ps.required ? 2 : 1), 0);
    return maxPossibleScore > 0 ? Math.max(0, Math.min(1, totalScore / maxPossibleScore)) : 0;
  }

  // Calculate location matching score
  private calculateLocationScore(
    talentLocation: { city: string; province: string; latitude?: number | null; longitude?: number | null } | null,
    projectLocation: { city?: string | null; province?: string | null; isRemote: boolean }
  ): number {
    // Remote projects get full location score
    if (projectLocation.isRemote) {
      return 1;
    }

    if (!talentLocation || !projectLocation.city || !projectLocation.province) {
      return 0.3; // Default score for missing location data
    }

    // Exact city match
    if (talentLocation.city.toLowerCase() === projectLocation.city.toLowerCase() &&
        talentLocation.province.toLowerCase() === projectLocation.province.toLowerCase()) {
      return 1;
    }

    // Same province
    if (talentLocation.province.toLowerCase() === projectLocation.province.toLowerCase()) {
      return 0.7;
    }

    // If we have coordinates, calculate distance
    if (talentLocation.latitude && talentLocation.longitude) {
      // For now, we don't have project coordinates, so we'll use province matching
      // In a full implementation, you'd geocode project locations
      return 0.4; // Different province but within reasonable distance
    }

    return 0.2; // Different province, no coordinate data
  }

  // Calculate experience level matching score
  private calculateExperienceScore(
    talentSkills: any[],
    projectExperienceLevel?: string | null
  ): number {
    if (!projectExperienceLevel) {
      return 0.8; // Default score when no experience requirement specified
    }

    // Calculate average experience from talent's skills
    const skillsWithExperience = talentSkills.filter(ts => ts.experience !== null);
    if (skillsWithExperience.length === 0) {
      return 0.5; // No experience data available
    }

    const avgExperience = skillsWithExperience.reduce((sum, ts) => sum + (ts.experience || 0), 0) / skillsWithExperience.length;

    // Map experience levels to years
    const experienceLevels = {
      'Junior': { min: 0, max: 2 },
      'Mid': { min: 2, max: 5 },
      'Senior': { min: 5, max: 20 },
    };

    const requiredLevel = experienceLevels[projectExperienceLevel as keyof typeof experienceLevels];
    if (!requiredLevel) {
      return 0.5;
    }

    // Calculate score based on how well experience aligns
    if (avgExperience >= requiredLevel.min && avgExperience <= requiredLevel.max) {
      return 1; // Perfect match
    } else if (avgExperience > requiredLevel.max) {
      // Overqualified - slight penalty for potential cost concerns
      const overqualification = (avgExperience - requiredLevel.max) / requiredLevel.max;
      return Math.max(0.7, 1 - overqualification * 0.3);
    } else {
      // Underqualified - penalty based on gap
      const underqualification = (requiredLevel.min - avgExperience) / requiredLevel.min;
      return Math.max(0.2, 1 - underqualification * 0.8);
    }
  }

  // Calculate rate matching score
  private calculateRateScore(
    talentRate: number | null,
    projectBudget: { budgetMin?: number | null; budgetMax?: number | null; hourlyRate?: number | null; type: string }
  ): number {
    if (!talentRate) {
      return 0.6; // Default score when talent hasn't set rate
    }

    if (projectBudget.type === 'HOURLY' && projectBudget.hourlyRate) {
      // Direct hourly rate comparison
      const projectRate = projectBudget.hourlyRate;
      const rateDifference = Math.abs(talentRate - projectRate) / projectRate;
      
      if (rateDifference <= 0.1) return 1; // Within 10%
      if (rateDifference <= 0.2) return 0.8; // Within 20%
      if (rateDifference <= 0.3) return 0.6; // Within 30%
      return Math.max(0.2, 1 - rateDifference);
    }

    if (projectBudget.type === 'FIXED_PRICE' && projectBudget.budgetMax) {
      // Estimate hours and compare effective hourly rate
      const estimatedHours = 40; // Default estimation - could be improved with project analysis
      const effectiveHourlyRate = projectBudget.budgetMax / estimatedHours;
      
      const rateDifference = Math.abs(talentRate - effectiveHourlyRate) / effectiveHourlyRate;
      return Math.max(0.3, 1 - rateDifference * 0.7); // Less precise for fixed price
    }

    return 0.5; // Default when budget information is incomplete
  }

  // Calculate availability matching score
  private calculateAvailabilityScore(
    talentAvailability: string | null,
    projectTimeline?: { startDate?: Date | null; endDate?: Date | null }
  ): number {
    // For MVP, we'll use a simple heuristic
    // In a full implementation, this would parse availability strings and compare with project timeline
    
    if (!talentAvailability) {
      return 0.7; // Default score when availability not specified
    }

    // Simple keyword matching for common availability indicators
    const availability = talentAvailability.toLowerCase();
    
    if (availability.includes('immediately') || availability.includes('available now')) {
      return 1;
    }
    
    if (availability.includes('week') || availability.includes('soon')) {
      return 0.9;
    }
    
    if (availability.includes('month')) {
      return 0.7;
    }
    
    if (availability.includes('not available') || availability.includes('busy')) {
      return 0.2;
    }

    return 0.8; // Default for other availability descriptions
  }

  // Find matching talent for a project
  async findTalentForProject(projectId: string, limit = 10): Promise<TalentMatch[]> {
    // Get project details with skills
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      throw new Error('Project not found or not published');
    }

    // Get all active talent users with their skills and profiles
    const talents = await prisma.user.findMany({
      where: {
        userType: UserType.TALENT,
        status: 'ACTIVE',
        emailVerified: true,
      },
      include: {
        profile: {
          include: {
            location: true,
            availability: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    const matches: TalentMatch[] = [];

    for (const talent of talents) {
      if (!talent.profile) continue;

      // Calculate individual scores
      const skillScore = this.calculateSkillScore(talent.profile.skills || [], project.skills);
      const locationScore = this.calculateLocationScore(
        talent.profile.location ? {
          city: talent.profile.location.city,
          province: talent.profile.location.province,
          latitude: talent.profile.location.latitude ? Number(talent.profile.location.latitude) : null,
          longitude: talent.profile.location.longitude ? Number(talent.profile.location.longitude) : null,
        } : null,
        {
          city: project.city,
          province: project.province,
          isRemote: project.isRemote,
        }
      );
      const experienceScore = this.calculateExperienceScore(
        talent.profile.skills || [],
        project.experienceLevel
      );
      const rateScore = this.calculateRateScore(
        talent.profile.hourlyRate ? Number(talent.profile.hourlyRate) : null,
        {
          budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
          budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
          hourlyRate: project.hourlyRate ? Number(project.hourlyRate) : null,
          type: project.type,
        }
      );
      const availabilityScore = this.calculateAvailabilityScore(
        talent.profile.availability?.status || null,
        {
          startDate: project.startDate,
          endDate: project.endDate,
        }
      );

      // Calculate weighted total score
      const totalScore = 
        skillScore * MATCHING_WEIGHTS.SKILL_MATCH +
        locationScore * MATCHING_WEIGHTS.LOCATION_MATCH +
        experienceScore * MATCHING_WEIGHTS.EXPERIENCE_MATCH +
        rateScore * MATCHING_WEIGHTS.RATE_MATCH +
        availabilityScore * MATCHING_WEIGHTS.AVAILABILITY_MATCH;

      // Only include matches with reasonable scores
      if (totalScore >= 0.3) {
        matches.push({
          talentId: talent.id,
          score: totalScore,
          breakdown: {
            skillScore,
            locationScore,
            experienceScore,
            rateScore,
            availabilityScore,
          },
          talent: {
            id: talent.id,
            profile: talent.profile ? {
              firstName: talent.profile.firstName,
              lastName: talent.profile.lastName,
              displayName: talent.profile.displayName,
              title: talent.profile.title,
              avatar: talent.profile.avatar,
              hourlyRate: talent.profile.hourlyRate ? Number(talent.profile.hourlyRate) : null,
              availability: talent.profile.availability?.status || null,
              location: talent.profile.location ? {
                city: talent.profile.location.city,
                province: talent.profile.location.province,
                latitude: talent.profile.location.latitude ? Number(talent.profile.location.latitude) : null,
                longitude: talent.profile.location.longitude ? Number(talent.profile.location.longitude) : null,
              } : null,
            } : null,
            skills: talent.profile.skills,
          },
        });
      }
    }

    // Sort by score and return top matches
    matches.sort((a, b) => b.score - a.score);
    
    logger.info('Talent matching completed', {
      projectId,
      totalTalents: talents.length,
      matches: matches.length,
      topScore: matches[0]?.score || 0,
    });

    return matches.slice(0, limit);
  }

  // Find matching projects for talent
  async findProjectsForTalent(talentId: string, limit = 10): Promise<ProjectMatch[]> {
    // Get talent details with skills and location
    const talent = await prisma.user.findUnique({
      where: { id: talentId },
      include: {
        profile: {
          include: {
            location: true,
            availability: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    if (!talent || talent.userType !== UserType.TALENT || !talent.profile) {
      throw new Error('Talent not found or invalid');
    }

    // Get all published projects
    const projects = await prisma.project.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        businessId: { not: talentId }, // Exclude own projects
      },
      include: {
        business: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                companyName: true,
                avatar: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    const matches: ProjectMatch[] = [];

    for (const project of projects) {
      // Calculate individual scores
      const skillScore = this.calculateSkillScore(talent.profile.skills || [], project.skills);
      const locationScore = this.calculateLocationScore(
        talent.profile.location ? {
          city: talent.profile.location.city,
          province: talent.profile.location.province,
          latitude: talent.profile.location.latitude ? Number(talent.profile.location.latitude) : null,
          longitude: talent.profile.location.longitude ? Number(talent.profile.location.longitude) : null,
        } : null,
        {
          city: project.city,
          province: project.province,
          isRemote: project.isRemote,
        }
      );
      const experienceScore = this.calculateExperienceScore(
        talent.profile.skills || [],
        project.experienceLevel
      );
      const rateScore = this.calculateRateScore(
        talent.profile.hourlyRate ? Number(talent.profile.hourlyRate) : null,
        {
          budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
          budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
          hourlyRate: project.hourlyRate ? Number(project.hourlyRate) : null,
          type: project.type,
        }
      );
      const availabilityScore = this.calculateAvailabilityScore(
        talent.profile.availability?.status || null,
        {
          startDate: project.startDate,
          endDate: project.endDate,
        }
      );

      // Calculate weighted total score
      const totalScore = 
        skillScore * MATCHING_WEIGHTS.SKILL_MATCH +
        locationScore * MATCHING_WEIGHTS.LOCATION_MATCH +
        experienceScore * MATCHING_WEIGHTS.EXPERIENCE_MATCH +
        rateScore * MATCHING_WEIGHTS.RATE_MATCH +
        availabilityScore * MATCHING_WEIGHTS.AVAILABILITY_MATCH;

      // Only include matches with reasonable scores
      if (totalScore >= 0.3) {
        matches.push({
          projectId: project.id,
          score: totalScore,
          breakdown: {
            skillScore,
            locationScore,
            experienceScore,
            rateScore,
            availabilityScore,
          },
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            type: project.type,
            budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
            budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
            hourlyRate: project.hourlyRate ? Number(project.hourlyRate) : null,
            isRemote: project.isRemote,
            city: project.city,
            province: project.province,
            experienceLevel: project.experienceLevel,
            publishedAt: project.publishedAt,
            business: project.business,
            skills: project.skills,
          },
        });
      }
    }

    // Sort by score and return top matches
    matches.sort((a, b) => b.score - a.score);
    
    logger.info('Project matching completed', {
      talentId,
      totalProjects: projects.length,
      matches: matches.length,
      topScore: matches[0]?.score || 0,
    });

    return matches.slice(0, limit);
  }

  // Get matching statistics
  async getMatchingStats(): Promise<{
    totalMatches: number;
    averageScore: number;
    matchesByScoreRange: Record<string, number>;
  }> {
    // This would be implemented with actual matching data storage
    // For now, return placeholder data
    return {
      totalMatches: 0,
      averageScore: 0,
      matchesByScoreRange: {
        '0.9-1.0': 0,
        '0.8-0.9': 0,
        '0.7-0.8': 0,
        '0.6-0.7': 0,
        '0.5-0.6': 0,
        '0.3-0.5': 0,
      },
    };
  }

  // Save talent for later (business users)
  async saveTalent(businessId: string, talentId: string, projectId?: string) {
    // Verify talent exists
    const talent = await this.prisma.user.findUnique({
      where: { 
        id: talentId,
        userType: 'TALENT'
      },
      select: { id: true }
    });

    if (!talent) {
      throw new Error('Talent not found');
    }

    // Check if already saved
    const existingSave = await this.prisma.savedTalent.findUnique({
      where: {
        businessId_talentId: {
          businessId,
          talentId
        }
      }
    });

    if (existingSave) {
      throw new Error('Talent already saved');
    }

    // Save talent
    const savedTalent = await this.prisma.savedTalent.create({
      data: {
        businessId,
        talentId,
        projectId,
        notes: '',
      },
      include: {
        talent: {
          include: {
            profile: {
              include: {
                skills: {
                  include: {
                    skill: true
                  }
                },
                location: true
              }
            }
          }
        }
      }
    });

    return savedTalent;
  }

  // Get saved talents for business user
  async getSavedTalents(businessId: string, _projectId?: string) {
    const where: any = { businessId };
    if (_projectId) {
      where.projectId = _projectId;
    }

    const savedTalents = await this.prisma.savedTalent.findMany({
      where,
      include: {
        talent: {
          include: {
            profile: {
              include: {
                skills: {
                  include: {
                    skill: true
                  }
                },
                location: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return savedTalents;
  }

  // Remove saved talent
  async removeSavedTalent(businessId: string, talentId: string) {
    const savedTalent = await this.prisma.savedTalent.findUnique({
      where: {
        businessId_talentId: {
          businessId,
          talentId
        }
      }
    });

    if (!savedTalent) {
      throw new Error('Saved talent not found');
    }

    await this.prisma.savedTalent.delete({
      where: {
        businessId_talentId: {
          businessId,
          talentId
        }
      }
    });

    return { message: 'Talent removed from saved list' };
  }
}
