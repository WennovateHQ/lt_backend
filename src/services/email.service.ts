import { sendEmail, emailTemplates } from '@/config/email';
import { logger } from '@/config/logger';

export interface User {
  id: string;
  email: string;
  userType: string;
  profile?: {
    firstName: string;
    lastName: string;
    companyName?: string | null;
    displayName?: string | null;
    [key: string]: any; // Allow additional profile fields from Prisma
  } | null;
}

export interface Project {
  id: string;
  title: string;
  type?: string;
}

export interface Application {
  id: string;
  status: string;
  feedback?: string;
  proposedRate?: string;
}

export interface Contract {
  id: string;
  status: string;
  title?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
}

export class EmailService {
  // Send interview request email to talent
  static async sendInterviewRequestEmail(talent: User, business: User, project: Project, application: Application): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 'there';
      const businessName = business.profile?.companyName || business.profile?.firstName || 'the client';
      
      const subject = `Interview Request for ${project.title}`;
      const htmlContent = `
        <h2>Interview Request</h2>
        <p>Hi ${talentName},</p>
        <p>${businessName} would like to schedule an interview with you for the <strong>${project.title}</strong> project.</p>
        <p>Please log in to your LocalTalents account to provide 3 available time slots for the interview.</p>
        <p>We're flexible with timing and can accommodate your schedule.</p>
        <br>
        <p>Best regards,<br>The LocalTalents Team</p>
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent
      });

      logger.info('Interview request email sent successfully', { 
        talentId: talent.id, 
        businessId: business.id,
        applicationId: application.id 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send interview request email', error);
      return false;
    }
  }

  // Send interview scheduled email to talent
  static async sendInterviewScheduledEmail(
    talent: User, 
    business: User, 
    project: Project, 
    application: Application, 
    interviewDate: Date
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 'there';
      const businessName = business.profile?.companyName || business.profile?.firstName || 'the client';
      
      const subject = `Interview Scheduled for ${project.title}`;
      const htmlContent = `
        <h2>Interview Scheduled</h2>
        <p>Hi ${talentName},</p>
        <p>Great news! Your interview with ${businessName} for the <strong>${project.title}</strong> project has been scheduled.</p>
        <p><strong>Interview Details:</strong></p>
        <ul>
          <li><strong>Date:</strong> ${interviewDate.toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${interviewDate.toLocaleTimeString()}</li>
          <li><strong>Project:</strong> ${project.title}</li>
        </ul>
        <p>The meeting details will be shared with you shortly. Please log in to your LocalTalents account for any updates.</p>
        <p>Good luck with your interview!</p>
        <br>
        <p>Best regards,<br>The LocalTalents Team</p>
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent
      });

      logger.info('Interview scheduled email sent successfully', { 
        talentId: talent.id, 
        businessId: business.id,
        applicationId: application.id,
        interviewDate: interviewDate.toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send interview scheduled email', error);
      return false;
    }
  }

  // Send welcome email to new users
  static async sendWelcomeEmail(user: User): Promise<boolean> {
    try {
      const name = user.profile?.firstName || 
                   user.profile?.companyName || 
                   user.email.split('@')[0] || 'User';

      const template = emailTemplates.welcome(name, user.userType);

      const success = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      if (success) {
        logger.info('Welcome email sent', {
          userId: user.id,
          email: user.email,
          userType: user.userType
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to send welcome email', {
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send application received notification to business
  static async sendApplicationReceivedEmail(
    business: User,
    talent: User,
    project: Project
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName && talent.profile?.lastName
        ? `${talent.profile.firstName} ${talent.profile.lastName}`
        : talent.email.split('@')[0];

      const businessName = business.profile?.firstName || 
                          business.profile?.companyName || 
                          business.email.split('@')[0];

      const template = emailTemplates.applicationReceived(
        talentName || 'Talent',
        project.title,
        businessName || 'Business'
      );

      const success = await sendEmail({
        to: business.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      if (success) {
        logger.info('Application received email sent', {
          businessId: business.id,
          talentId: talent.id,
          projectId: project.id
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to send application received email', {
        businessId: business.id,
        talentId: talent.id,
        projectId: project.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send application status update to talent
  static async sendApplicationStatusEmail(
    talent: User,
    project: Project,
    application: Application
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName && talent.profile?.lastName
        ? `${talent.profile.firstName} ${talent.profile.lastName}`
        : talent.email.split('@')[0];

      const template = emailTemplates.applicationStatusUpdate(
        talentName || 'Talent',
        project.title,
        application.status
      );

      // Add feedback to email if provided
      let htmlContent = template.html;
      let textContent = template.text;

      if (application.feedback && application.status === 'REJECTED') {
        htmlContent = htmlContent.replace(
          '</div>',
          `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #dc2626; margin-top: 0;">Feedback:</h4>
            <p style="color: #7f1d1d;">${application.feedback}</p>
          </div></div>`
        );
        textContent += `\n\nFeedback: ${application.feedback}`;
      }

      const success = await sendEmail({
        to: talent.email,
        subject: template.subject,
        html: htmlContent,
        text: textContent
      });

      if (success) {
        logger.info('Application status email sent', {
          talentId: talent.id,
          projectId: project.id,
          applicationId: application.id,
          status: application.status
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to send application status email', {
        talentId: talent.id,
        projectId: project.id,
        applicationId: application.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
    try {
      const name = user.profile?.firstName || 
                   user.profile?.companyName || 
                   user.email.split('@')[0] || 'User';

      const template = emailTemplates.passwordReset(name, resetToken);

      const success = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      if (success) {
        logger.info('Password reset email sent', {
          userId: user.id,
          email: user.email
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to send password reset email', {
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send project published notification to relevant talents
  static async sendProjectPublishedEmail(
    talents: User[],
    project: Project,
    business: User
  ): Promise<boolean> {
    try {
      const businessName = business.profile?.companyName || 
                          business.profile?.firstName || 
                          business.email.split('@')[0];

      const emailPromises = talents.map(talent => {
        const talentName = talent.profile?.firstName || talent.email.split('@')[0];

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">New Project Available!</h1>
            <p>Hi ${talentName},</p>
            <p>A new project matching your skills has been posted:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0;">${project.title}</h2>
              <p><strong>Posted by:</strong> ${businessName}</p>
              <p><strong>Type:</strong> ${project.type || 'Not specified'}</p>
            </div>
            <p>Visit your LocalTalents dashboard to view details and submit a proposal.</p>
            <p>Best regards,<br>The LocalTalents Team</p>
          </div>
        `;

        return sendEmail({
          to: talent.email,
          subject: `New Project: ${project.title}`,
          html,
          text: `New project available: ${project.title} by ${businessName}. Check your dashboard to apply.`
        });
      });

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      logger.info('Project published emails sent', {
        projectId: project.id,
        businessId: business.id,
        totalTalents: talents.length,
        successCount
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Failed to send project published emails', {
        projectId: project.id,
        businessId: business.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send contract signed notification
  static async sendContractSignedEmail(
    business: User,
    talent: User,
    project: Project
  ): Promise<boolean> {
    try {
      const businessName = business.profile?.companyName || business.email.split('@')[0];
      const talentName = talent.profile?.firstName && talent.profile?.lastName
        ? `${talent.profile.firstName} ${talent.profile.lastName}`
        : talent.email.split('@')[0];

      // Email to business
      const businessEmail = sendEmail({
        to: business.email,
        subject: `Contract Signed: ${project.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #059669;">Contract Signed!</h1>
            <p>Great news! ${talentName} has signed the contract for:</p>
            <h2 style="color: #1f2937;">${project.title}</h2>
            <p>You can now begin working together. Check your dashboard for project details.</p>
            <p>Best regards,<br>The LocalTalents Team</p>
          </div>
        `,
        text: `Contract signed by ${talentName} for ${project.title}. Check your dashboard.`
      });

      // Email to talent
      const talentEmail = sendEmail({
        to: talent.email,
        subject: `Contract Confirmed: ${project.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #059669;">Contract Confirmed!</h1>
            <p>Your contract with ${businessName} has been confirmed for:</p>
            <h2 style="color: #1f2937;">${project.title}</h2>
            <p>You can now start working on this project. Check your dashboard for details.</p>
            <p>Best regards,<br>The LocalTalents Team</p>
          </div>
        `,
        text: `Contract confirmed with ${businessName} for ${project.title}. Check your dashboard.`
      });

      const [businessResult, talentResult] = await Promise.allSettled([businessEmail, talentEmail]);

      logger.info('Contract signed emails sent', {
        projectId: project.id,
        businessId: business.id,
        talentId: talent.id,
        businessEmailSent: businessResult.status === 'fulfilled' && businessResult.value,
        talentEmailSent: talentResult.status === 'fulfilled' && talentResult.value
      });

      return (businessResult.status === 'fulfilled' && businessResult.value) ||
             (talentResult.status === 'fulfilled' && talentResult.value);
    } catch (error) {
      logger.error('Failed to send contract signed emails', {
        projectId: project.id,
        businessId: business.id,
        talentId: talent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send new application notification to talent (confirmation)
  static async sendApplicationSubmittedEmail(
    talent: User,
    project: Project,
    application: Application
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 'there';
      
      const subject = `Application Submitted: ${project.title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Application Submitted Successfully!</h1>
          <p>Hi ${talentName},</p>
          <p>Your application has been successfully submitted for:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">${project.title}</h2>
            <p><strong>Proposed Rate:</strong> ${application.proposedRate ? `$${application.proposedRate}` : 'Not specified'}</p>
            <p><strong>Status:</strong> Under Review</p>
          </div>
          <p>The client will review your application and get back to you soon. You can track the status in your dashboard.</p>
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent
      });

      logger.info('Application submitted email sent successfully', { 
        talentId: talent.id, 
        projectId: project.id,
        applicationId: application.id 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send application submitted email', error);
      return false;
    }
  }

  // Send contract creation notification
  static async sendContractCreatedEmail(
    talent: User,
    business: User,
    project: Project,
    contract: Contract
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 'there';
      const businessName = business.profile?.companyName || business.profile?.firstName || 'the client';
      
      const subject = `New Contract: ${project.title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">New Contract Available!</h1>
          <p>Hi ${talentName},</p>
          <p>${businessName} has created a contract for you for the project:</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">${project.title}</h2>
            <p><strong>Contract ID:</strong> ${contract.id}</p>
            <p><strong>Status:</strong> ${contract.status}</p>
          </div>
          <p>Please review and sign the contract in your dashboard to begin working on this project.</p>
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent
      });

      logger.info('Contract created email sent successfully', { 
        talentId: talent.id, 
        businessId: business.id,
        contractId: contract.id 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send contract created email', error);
      return false;
    }
  }

  // Send contract status update notification
  static async sendContractStatusUpdateEmail(
    user: User,
    project: Project,
    contract: Contract,
    oldStatus: string
  ): Promise<boolean> {
    try {
      const userName = user.profile?.['displayName'] || user.profile?.firstName || 'User';
      
      const subject = `Contract Update: ${project.title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Contract Status Updated</h1>
          <p>Hi ${userName},</p>
          <p>The contract status for <strong>${project.title}</strong> has been updated:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Previous Status:</strong> ${oldStatus}</p>
            <p><strong>New Status:</strong> ${contract.status}</p>
            <p><strong>Contract ID:</strong> ${contract.id}</p>
          </div>
          <p>Check your dashboard for more details and any required actions.</p>
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html: htmlContent
      });

      logger.info('Contract status update email sent successfully', { 
        userId: user.id,
        contractId: contract.id,
        oldStatus,
        newStatus: contract.status
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send contract status update email', error);
      return false;
    }
  }

  // Send new message notification
  static async sendNewMessageEmail(
    recipient: User,
    sender: User,
    message: Message,
    conversationContext?: string
  ): Promise<boolean> {
    try {
      const recipientName = recipient.profile?.firstName || recipient.profile?.companyName || 'there';
      const senderName = sender.profile?.firstName || sender.profile?.companyName || sender.email.split('@')[0];
      
      const subject = `New Message from ${senderName}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Message</h1>
          <p>Hi ${recipientName},</p>
          <p>You have received a new message from <strong>${senderName}</strong>:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; color: #374151;">${message.content}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              Sent on ${message.createdAt.toLocaleDateString()} at ${message.createdAt.toLocaleTimeString()}
            </p>
          </div>
          ${conversationContext ? `<p><strong>Context:</strong> ${conversationContext}</p>` : ''}
          <p>Reply to this message in your LocalTalents dashboard.</p>
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: recipient.email,
        subject,
        html: htmlContent
      });

      logger.info('New message email sent successfully', { 
        recipientId: recipient.id,
        senderId: sender.id,
        messageId: message.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send new message email', error);
      return false;
    }
  }

  // Send message thread update notification (for multiple messages)
  static async sendMessageThreadUpdateEmail(
    recipient: User,
    sender: User,
    messageCount: number,
    latestMessage: Message,
    conversationContext?: string
  ): Promise<boolean> {
    try {
      const recipientName = recipient.profile?.firstName || recipient.profile?.companyName || 'there';
      const senderName = sender.profile?.firstName || sender.profile?.companyName || sender.email.split('@')[0];
      
      const subject = `${messageCount} New Messages from ${senderName}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">${messageCount} New Messages</h1>
          <p>Hi ${recipientName},</p>
          <p>You have <strong>${messageCount} new messages</strong> from <strong>${senderName}</strong>.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Latest message:</p>
            <p style="margin: 0; color: #374151;">${latestMessage.content}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              Sent on ${latestMessage.createdAt.toLocaleDateString()} at ${latestMessage.createdAt.toLocaleTimeString()}
            </p>
          </div>
          ${conversationContext ? `<p><strong>Context:</strong> ${conversationContext}</p>` : ''}
          <p>Check your LocalTalents dashboard to view all messages and reply.</p>
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: recipient.email,
        subject,
        html: htmlContent
      });

      logger.info('Message thread update email sent successfully', { 
        recipientId: recipient.id,
        senderId: sender.id,
        messageCount,
        latestMessageId: latestMessage.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send message thread update email', error);
      return false;
    }
  }

  // Send email verification email to new users
  static async sendEmailVerificationEmail(user: User, verificationToken: string): Promise<boolean> {
    try {
      const name = user.profile?.firstName || 
                   user.profile?.companyName || 
                   user.email.split('@')[0];

      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      
      const subject = 'Verify Your LocalTalents Account';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">LocalTalents</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Connecting Local Talent with Opportunities</p>
          </div>
          
          <h2 style="color: #1f2937;">Welcome to LocalTalents, ${name}!</h2>
          
          <p>Thank you for creating your LocalTalents account. To complete your registration and start using our platform, please verify your email address.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">What's Next?</h3>
            <ul style="color: #374151;">
              <li>Complete your profile with skills and experience</li>
              <li>Browse available projects or post your own</li>
              <li>Connect with ${user.userType === 'BUSINESS' ? 'talented freelancers' : 'exciting opportunities'}</li>
              <li>Build your professional network</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
          </p>
          
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      const textContent = `
        Welcome to LocalTalents, ${name}!
        
        Thank you for creating your LocalTalents account. To complete your registration, please verify your email address by clicking this link:
        
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        Best regards,
        The LocalTalents Team
      `;

      await sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
        text: textContent
      });

      logger.info('Email verification email sent successfully', { 
        userId: user.id,
        email: user.email,
        userType: user.userType
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send email verification email', {
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send email verification success notification
  static async sendEmailVerifiedConfirmationEmail(user: User): Promise<boolean> {
    try {
      const name = user.profile?.firstName || 
                   user.profile?.companyName || 
                   user.email.split('@')[0];

      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
      const dashboardUrl = `${frontendUrl}/${user.userType.toLowerCase()}`;
      
      const subject = 'Email Verified - Welcome to LocalTalents!';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">LocalTalents</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Connecting Local Talent with Opportunities</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 20px;">
              ✓
            </div>
            <h2 style="color: #1f2937; margin: 0;">Email Verified Successfully!</h2>
          </div>
          
          <p>Hi ${name},</p>
          
          <p>Congratulations! Your email has been verified and your LocalTalents account is now active. You can now access all platform features.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #1f2937; margin-top: 0;">Get Started:</h3>
            <ul style="color: #374151;">
              ${user.userType === 'BUSINESS' ? `
                <li>Post your first project to find talented freelancers</li>
                <li>Browse talent profiles and portfolios</li>
                <li>Set up your company profile</li>
                <li>Manage applications and contracts</li>
              ` : `
                <li>Complete your profile and add your skills</li>
                <li>Upload portfolio items to showcase your work</li>
                <li>Browse available projects and submit proposals</li>
                <li>Set your availability and rates</li>
              `}
            </ul>
          </div>
          
          <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
          
          <p>Welcome to the LocalTalents community!</p>
          
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html: htmlContent
      });

      logger.info('Email verification confirmation sent successfully', { 
        userId: user.id,
        email: user.email,
        userType: user.userType
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send email verification confirmation', {
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send project start notification when escrow is funded
  static async sendProjectStartNotificationEmail(
    talent: User,
    business: User,
    project: Project,
    contract: { id: string; title: string; amount: any }
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 'there';
      const businessName = business.profile?.companyName || business.profile?.firstName || 'the client';
      
      const subject = `🚀 Project Ready to Start: ${project.title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">LocalTalents</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Connecting Local Talent with Opportunities</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 20px;">
              🚀
            </div>
            <h2 style="color: #1f2937; margin: 0;">Project Ready to Start!</h2>
          </div>
          
          <p>Hi ${talentName},</p>
          
          <p>Great news! The escrow account for your project has been successfully funded by ${businessName}. You can now start working on:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #1f2937; margin-top: 0;">${project.title}</h3>
            <p><strong>Client:</strong> ${businessName}</p>
            <p><strong>Contract Value:</strong> $${contract.amount}</p>
            <p><strong>Contract ID:</strong> ${contract.id}</p>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h4 style="color: #1f2937; margin-top: 0;">💰 Escrow Protection</h4>
            <p style="color: #374151; margin: 0;">
              The full project amount has been securely deposited in escrow. You'll receive payment as you complete and get approval for each milestone.
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #1f2937; margin-top: 0;">📋 Next Steps</h4>
            <ul style="color: #374151; margin: 0;">
              <li>Review the project milestones in your dashboard</li>
              <li>Start working on the first milestone</li>
              <li>Communicate regularly with ${businessName}</li>
              <li>Submit deliverables for approval when ready</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/talent/contracts/${contract.id}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Contract & Start Project
            </a>
          </div>
          
          <p>If you have any questions about the project or need assistance, don't hesitate to reach out through the platform messaging system.</p>
          
          <p>Best of luck with your project!</p>
          
          <p>Best regards,<br>The LocalTalents Team</p>
        </div>
      `;

      const textContent = `
        Project Ready to Start: ${project.title}
        
        Hi ${talentName},
        
        Great news! The escrow account for your project has been successfully funded by ${businessName}. You can now start working on: ${project.title}
        
        Contract Details:
        - Client: ${businessName}
        - Contract Value: $${contract.amount}
        - Contract ID: ${contract.id}
        
        The full project amount has been securely deposited in escrow. You'll receive payment as you complete and get approval for each milestone.
        
        Next Steps:
        - Review the project milestones in your dashboard
        - Start working on the first milestone
        - Communicate regularly with ${businessName}
        - Submit deliverables for approval when ready
        
        View your contract: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/talent/contracts/${contract.id}
        
        Best regards,
        The LocalTalents Team
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent,
        text: textContent
      });

      logger.info('Project start notification email sent successfully', { 
        talentId: talent.id,
        businessId: business.id,
        projectId: project.id,
        contractId: contract.id
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send project start notification email', {
        talentId: talent.id,
        businessId: business.id,
        projectId: project.id,
        contractId: contract.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Send payout setup notification to talent
  static async sendPayoutSetupNotification(
    talent: User, 
    business: User, 
    project: Project, 
    contract: any
  ): Promise<boolean> {
    try {
      const talentName = talent.profile?.firstName || 
                        talent.profile?.displayName || 
                        talent.email.split('@')[0];
      
      const businessName = business.profile?.companyName || 
                          business.profile?.displayName || 
                          `${business.profile?.firstName || ''} ${business.profile?.lastName || ''}`.trim() ||
                          business.email.split('@')[0];

      const subject = `Action Required: Set Up Your Payout Account - ${project.title}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🏦 Payout Account Setup Required</h2>
          
          <p>Hi ${talentName},</p>
          
          <p><strong>${businessName}</strong> is ready to fund the escrow for your project <strong>"${project.title}"</strong>, but you need to set up your payout account first.</p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Action Required:</strong></p>
            <p style="margin: 10px 0 0 0; color: #92400e;">Complete your payout account setup to receive payments for this project.</p>
          </div>
          
          <h3 style="color: #1f2937;">How to Set Up Your Payout Account:</h3>
          
          <ol style="line-height: 1.8;">
            <li>Log in to your LocalTalents account</li>
            <li>Go to <strong>Payments</strong> page</li>
            <li>Click <strong>"Set Up Payout Account"</strong></li>
            <li>Complete the Stripe Connect setup</li>
            <li>Connect your bank account</li>
          </ol>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1f2937;">Project Details:</h4>
            <p style="margin: 5px 0;"><strong>Project:</strong> ${project.title}</p>
            <p style="margin: 5px 0;"><strong>Client:</strong> ${businessName}</p>
            <p style="margin: 5px 0;"><strong>Contract ID:</strong> ${contract.id}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/talent/payments" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Set Up Payout Account
            </a>
          </div>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>💡 Why is this needed?</strong></p>
            <p style="margin: 10px 0 0 0; color: #1e40af;">Your payout account ensures secure and direct payments. Once set up, funds will be held in escrow and released to your account as you complete milestones.</p>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The LocalTalents Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;

      await sendEmail({
        to: talent.email,
        subject,
        html: htmlContent
      });

      logger.info('Payout setup notification sent', {
        talentId: talent.id,
        talentEmail: talent.email,
        projectId: project.id,
        contractId: contract.id
      });

      return true;
    } catch (error) {
      logger.error('Failed to send payout setup notification email', {
        talentId: talent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export default EmailService;
