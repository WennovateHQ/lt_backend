import { matchingQueue } from './queue';
import { MatchingService } from '../modules/matching/matching.service';
// Prisma is accessed through the matching service
import { logger } from '../config/logger';
import { queueApplicationNotification } from './email-jobs';

const matchingService = new MatchingService();

// Matching job types
export interface MatchingJobData {
  type: string;
  data: Record<string, any>;
}

// Process matching jobs
matchingQueue.process('find-project-matches', async (job) => {
  const { data } = job.data as MatchingJobData;
  logger.info(`Processing project matching job for project ${data['projectId']}`);
  
  try {
    const matches = await matchingService.findTalentForProject(data['projectId']);
    
    // Notify top matches via email (limit to top 10 to avoid spam)
    const topMatches = matches.slice(0, 10);
    
    for (const match of topMatches) {
      if (match.score >= 0.7) { // Only notify high-quality matches
        await queueApplicationNotification(
          'talent@example.com', // TODO: Get email from talent profile
          data['projectTitle'],
          `${match.talent.profile?.firstName} ${match.talent.profile?.lastName}`,
          data['businessName']
        );
      }
    }
    
    logger.info(`Found ${matches.length} matches for project ${data['projectId']}, notified ${topMatches.length} top candidates`);
    
    return { matchCount: matches.length, notifiedCount: topMatches.length };
  } catch (error) {
    logger.error(`Error processing project matching job for project ${data['projectId']}:`, error);
    throw error;
  }
});

matchingQueue.process('find-talent-matches', async (job) => {
  const { data } = job.data as MatchingJobData;
  logger.info(`Processing talent matching job for talent ${data['talentId']}`);
  
  try {
    const matches = await matchingService.findProjectsForTalent(data['talentId']);
    
    logger.info(`Found ${matches.length} project matches for talent ${data['talentId']}`);
    
    return { matchCount: matches.length };
  } catch (error) {
    logger.error(`Error processing talent matching job for talent ${data['talentId']}:`, error);
    throw error;
  }
});

matchingQueue.process('update-match-scores', async (job) => {
  const { data: _data } = job.data as MatchingJobData;
  logger.info(`Processing match score update job`);
  
  try {
    // This could be used to periodically recalculate match scores
    // based on updated user profiles, new skills, location changes, etc.
    
    // For now, we'll just log that the job was processed
    logger.info(`Match score update job completed`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Error processing match score update job:`, error);
    throw error;
  }
});

// Helper functions to add matching jobs to the queue
export const queueProjectMatching = async (
  projectId: string,
  projectTitle: string,
  businessName: string
) => {
  await matchingQueue.add('find-project-matches', {
    data: { projectId, projectTitle, businessName }
  }, {
    priority: 3,
    delay: 60000 // 1 minute delay to allow project to be fully created
  });
};

export const queueTalentMatching = async (talentId: string) => {
  await matchingQueue.add('find-talent-matches', {
    data: { talentId }
  }, {
    priority: 2,
    delay: 0
  });
};

export const queueMatchScoreUpdate = async () => {
  await matchingQueue.add('update-match-scores', {
    data: {}
  }, {
    priority: 1,
    delay: 0,
    repeat: { cron: '0 2 * * *' } // Run daily at 2 AM
  });
};
