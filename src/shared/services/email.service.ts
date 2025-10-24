import sgMail from '@sendgrid/mail';
import { logger } from '../../config/logger';
import { AppError } from '../utils/app-error';

export class EmailService {
  constructor() {
    if (!process.env["SENDGRID_API_KEY"]) {
      throw new AppError('SendGrid API key is required', 500);
    }
    sgMail.setApiKey(process.env["SENDGRID_API_KEY"]);
  }

  private async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const msg = {
        to,
        from: {
          email: process.env["FROM_EMAIL"]!,
          name: 'LocalTalents.ca'
        },
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}`, { subject });
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}`, { 
        error: error.message,
        subject,
        code: error.code
      });
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verificationUrl = `${process.env["FRONTEND_URL"]}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>Welcome to LocalTalents.ca, ${firstName}!</h2>
          
          <p>Thank you for joining our platform connecting local businesses with talented professionals.</p>
          
          <p>To complete your registration and start using your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours for security reasons.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            If you didn't create an account with LocalTalents.ca, you can safely ignore this email.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Verify Your Email Address - LocalTalents.ca', html);
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${process.env["FRONTEND_URL"]}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>Password Reset Request</h2>
          
          <p>Hi ${firstName},</p>
          
          <p>We received a request to reset your password for your LocalTalents.ca account.</p>
          
          <p>Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p>This password reset link will expire in 1 hour for security reasons.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, 'Reset Your Password - LocalTalents.ca', html);
  }

  async sendApplicationNotification(
    businessEmail: string,
    projectTitle: string,
    talentName: string,
    businessName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/projects`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Application Received - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>New Application Received!</h2>
          
          <p>Hi ${businessName},</p>
          
          <p><strong>${talentName}</strong> has applied to your project:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1e40af;">${projectTitle}</h3>
          </div>
          
          <p>Review their application, portfolio, and proposal to see if they're a good fit for your project.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Application
            </a>
          </div>
          
          <p>Don't keep talented professionals waiting - respond to applications promptly to maintain a good reputation on the platform.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(businessEmail, `New Application: ${projectTitle}`, html);
  }

  async sendApplicationStatusEmail(
    talentEmail: string,
    projectTitle: string,
    status: string,
    talentName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/applications`;
    
    const statusMessages = {
      'ACCEPTED': {
        title: 'Congratulations! Your Application Was Accepted',
        message: 'Great news! Your application has been accepted.',
        color: '#059669',
        action: 'View Details'
      },
      'REJECTED': {
        title: 'Application Update',
        message: 'Thank you for your interest. While your application wasn\'t selected this time, we encourage you to apply to other projects.',
        color: '#dc2626',
        action: 'Find More Projects'
      }
    };

    const statusInfo = statusMessages[status as keyof typeof statusMessages];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${statusInfo.title} - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>${statusInfo.title}</h2>
          
          <p>Hi ${talentName},</p>
          
          <p>${statusInfo.message}</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1e40af;">${projectTitle}</h3>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: ${statusInfo.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ${statusInfo.action}
            </a>
          </div>
          
          ${status === 'REJECTED' ? 
            '<p>Keep building your profile and applying to projects that match your skills. The right opportunity is out there!</p>' :
            '<p>The business will be in touch soon to discuss next steps and potentially create a contract.</p>'
          }
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(talentEmail, `${statusInfo.title}: ${projectTitle}`, html);
  }

  async sendContractNotification(
    email: string,
    contractTitle: string,
    actionType: string,
    recipientName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/contracts`;
    
    const actionMessages = {
      'created': 'A new contract has been created for you to review and sign.',
      'signed': 'The contract has been signed by the other party.',
      'activated': 'The contract is now active and work can begin!'
    };
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contract Update - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>Contract Update</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>${actionMessages[actionType as keyof typeof actionMessages]}</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1e40af;">${contractTitle}</h3>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Contract
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Contract Update: ${contractTitle}`, html);
  }

  async sendMilestoneNotification(
    email: string,
    milestoneTitle: string,
    contractTitle: string,
    actionType: string,
    recipientName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/contracts`;
    
    const actionMessages = {
      'submitted': 'A milestone has been submitted for your review.',
      'approved': 'Your milestone has been approved!'
    };
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Milestone Update - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>Milestone Update</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>${actionMessages[actionType as keyof typeof actionMessages]}</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1e40af;">${milestoneTitle}</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Contract: ${contractTitle}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Milestone
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Milestone ${actionType}: ${milestoneTitle}`, html);
  }

  async sendPaymentNotification(
    email: string,
    amount: number,
    contractTitle: string,
    recipientName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/payments`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Received - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>Payment Received!</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>Great news! You have received a payment.</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin: 0; color: #15803d;">$${amount.toFixed(2)} CAD</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Contract: ${contractTitle}</p>
          </div>
          
          <p>The payment has been processed and will be deposited to your account according to your payout schedule.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Payment Details
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `Payment Received: $${amount.toFixed(2)}`, html);
  }

  async sendReviewNotification(
    email: string,
    rating: number,
    contractTitle: string,
    reviewerName: string,
    recipientName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/reviews`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Review Received - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>New Review Received!</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p><strong>${reviewerName}</strong> has left you a review for your completed work.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 24px; color: #fbbf24;">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>
              <span style="margin-left: 10px; font-weight: bold;">${rating}/5 stars</span>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">Contract: ${contractTitle}</p>
          </div>
          
          <p>Reviews help build your reputation on the platform and attract more clients.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Review
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `New ${rating}-Star Review Received`, html);
  }

  async sendMessageNotification(
    email: string,
    senderName: string,
    messagePreview: string,
    recipientName: string
  ) {
    const dashboardUrl = `${process.env["FRONTEND_URL"]}/dashboard/messages`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Message - LocalTalents.ca</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">LocalTalents.ca</h1>
          </div>
          
          <h2>New Message</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>You have received a new message from <strong>${senderName}</strong>:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-style: italic;">"${messagePreview}${messagePreview.length > 100 ? '...' : ''}"</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Read Message
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            The LocalTalents.ca Team
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, `New message from ${senderName}`, html);
  }
}
