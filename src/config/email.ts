import * as nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const emailTransporter = createTransporter();

// Email service interface
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// Send email function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: options.from || `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      subject: options.subject
    });
    return false;
  }
}

// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    await emailTransporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string, userType: string) => ({
    subject: 'Welcome to LocalTalents!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to LocalTalents!</h1>
        <p>Hi ${name},</p>
        <p>Welcome to LocalTalents! Your ${userType.toLowerCase()} account has been created successfully.</p>
        <p>You can now start ${userType === 'TALENT' ? 'browsing projects and submitting proposals' : 'posting projects and finding talented professionals'}.</p>
        <p>Best regards,<br>The LocalTalents Team</p>
      </div>
    `,
    text: `Welcome to LocalTalents! Hi ${name}, your ${userType.toLowerCase()} account has been created successfully.`
  }),

  applicationReceived: (talentName: string, projectTitle: string, businessName: string) => ({
    subject: `New Application for ${projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Application Received!</h1>
        <p>Hi ${businessName},</p>
        <p><strong>${talentName}</strong> has submitted an application for your project:</p>
        <h3 style="color: #1f2937;">${projectTitle}</h3>
        <p>You can review the application and proposal in your LocalTalents dashboard.</p>
        <p>Best regards,<br>The LocalTalents Team</p>
      </div>
    `,
    text: `New application from ${talentName} for ${projectTitle}. Review it in your dashboard.`
  }),

  applicationStatusUpdate: (talentName: string, projectTitle: string, status: string) => ({
    subject: `Application Update: ${projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Application Status Update</h1>
        <p>Hi ${talentName},</p>
        <p>Your application for <strong>${projectTitle}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
        <p>Check your LocalTalents dashboard for more details and next steps.</p>
        <p>Best regards,<br>The LocalTalents Team</p>
      </div>
    `,
    text: `Your application for ${projectTitle} has been ${status.toLowerCase()}. Check your dashboard for details.`
  }),

  passwordReset: (name: string, resetToken: string) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset for your LocalTalents account.</p>
        <p>Your reset code is: <strong style="font-size: 18px; color: #dc2626;">${resetToken}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Best regards,<br>The LocalTalents Team</p>
      </div>
    `,
    text: `Password reset code: ${resetToken}. This code expires in 15 minutes.`
  })
};

export default {
  sendEmail,
  testEmailConnection,
  emailTemplates
};
