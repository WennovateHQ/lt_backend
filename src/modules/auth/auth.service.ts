import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { jwtConfig } from '@/config/env';
import { SessionService } from '@/config/redis';
import { AppError, ErrorMessages, ErrorCodes } from '@/shared/utils/app-error';
import { logAuthEvent, logSecurityEvent } from '@/config/logger';
import { UserType, UserStatus } from '../../shared/types/enums';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  userType: z.nativeEnum(UserType),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  emailVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    companyName: string | null;
  } | null;
}

export class AuthService {
  // Generate JWT tokens
  private generateTokens(userId: string, email: string, userType: UserType): AuthTokens {
    const payload = {
      sub: userId,
      email,
      userType,
      emailVerified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      aud: 'localtalents.ca',
      iss: 'localtalents.ca',
    };

    const accessToken = jwt.sign(payload, jwtConfig.secret as string, {
      expiresIn: jwtConfig.expiresIn,
    });

    const refreshToken = jwt.sign(
      { sub: payload.sub, type: 'refresh' },
      jwtConfig.secret as string,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  // Register new user
  async register(input: RegisterInput, ipAddress?: string): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const validatedInput = registerSchema.parse(input);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('User already exists with this email', 409, ErrorCodes.ALREADY_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedInput.password, 12);

    // Create user and profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validatedInput.email.toLowerCase(),
          password: hashedPassword,
          userType: validatedInput.userType,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: false,
        },
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: validatedInput.firstName,
          lastName: validatedInput.lastName,
          displayName: `${validatedInput.firstName} ${validatedInput.lastName}`,
          ...(validatedInput.companyName && { companyName: validatedInput.companyName }),
          ...(validatedInput.phone && { phone: validatedInput.phone }),
        },
      });

      return { user, profile };
    });

    // Generate tokens
    const tokens = this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.userType
    );

    // Create session
    await SessionService.createSession(result.user.id, {
      userType: result.user.userType,
      ipAddress,
      userAgent: 'registration',
    });

    logAuthEvent('User registered', result.user.id, {
      userType: result.user.userType,
      ipAddress,
    });

    // TODO: Send verification email
    // await this.sendVerificationEmail(result.user.email, verificationToken);

    const userProfile: UserProfile = {
      id: result.user.id,
      email: result.user.email,
      userType: result.user.userType,
      status: result.user.status,
      emailVerified: result.user.emailVerified,
      profile: {
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
        displayName: result.profile.displayName ?? null,
        avatar: result.profile.avatar ?? null,
        companyName: result.profile.companyName ?? null,
      },
    };

    return { user: userProfile, tokens };
  }

  // Login user
  async login(input: LoginInput, ipAddress?: string): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Validate input
    const validatedInput = loginSchema.parse(input);

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { email: validatedInput.email.toLowerCase() },
      include: {
        profile: true,
      },
    });

    if (!user || !user.password) {
      logSecurityEvent('Login attempt with invalid email', undefined, {
        email: validatedInput.email,
        ipAddress,
      });
      throw new AppError(ErrorMessages.INVALID_CREDENTIALS, 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(validatedInput.password, user.password);

    if (!isValidPassword) {
      logSecurityEvent('Login attempt with invalid password', user.id, {
        email: validatedInput.email,
        ipAddress,
      });
      throw new AppError(ErrorMessages.INVALID_CREDENTIALS, 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    // Check user status
    if (user.status === UserStatus.SUSPENDED) {
      logSecurityEvent('Login attempt by suspended user', user.id, { ipAddress });
      throw new AppError(ErrorMessages.ACCOUNT_SUSPENDED, 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.userType);

    // Create session
    await SessionService.createSession(user.id, {
      userType: user.userType,
      ipAddress,
      userAgent: 'login',
    });

    logAuthEvent('User logged in', user.id, {
      userType: user.userType,
      ipAddress,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      status: user.status,
      emailVerified: user.emailVerified,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar,
        companyName: user.profile.companyName,
      } : null,
    };

    return { user: userProfile, tokens };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.secret) as any;

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid refresh token', 401, ErrorCodes.TOKEN_INVALID);
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          userType: true,
          status: true,
        },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new AppError('User not found or inactive', 401, ErrorCodes.AUTHENTICATION_REQUIRED);
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email, user.userType);

      logAuthEvent('Tokens refreshed', user.id);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401, ErrorCodes.TOKEN_EXPIRED);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401, ErrorCodes.TOKEN_INVALID);
      }
      throw error;
    }
  }

  // Verify email
  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const validatedInput = verifyEmailSchema.parse(input);

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: validatedInput.token,
        emailVerified: false,
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        status: UserStatus.ACTIVE, // Activate account after email verification
      },
    });

    logAuthEvent('Email verified', user.id);
  }

  // Forgot password
  async forgotPassword(input: ForgotPasswordInput, ipAddress?: string): Promise<void> {
    const validatedInput = forgotPasswordSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validatedInput.email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      logSecurityEvent('Password reset attempt for non-existent email', undefined, {
        email: validatedInput.email,
        ipAddress,
      });
      return;
    }

    // Generate reset token
    const resetToken = this.generateRandomToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    logAuthEvent('Password reset requested', user.id, { ipAddress });

    // TODO: Send password reset email
    // await this.sendPasswordResetEmail(user.email, resetToken);
  }

  // Reset password
  async resetPassword(input: ResetPasswordInput, ipAddress?: string): Promise<void> {
    const validatedInput = resetPasswordSchema.parse(input);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: validatedInput.token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      logSecurityEvent('Invalid password reset attempt', undefined, {
        token: validatedInput.token,
        ipAddress,
      });
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(validatedInput.password);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all sessions
    await SessionService.deleteUserSessions(user.id);

    logAuthEvent('Password reset completed', user.id, { ipAddress });
  }

  // Logout
  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await SessionService.deleteSession(sessionId);
    } else {
      // Logout from all sessions
      await SessionService.deleteUserSessions(userId);
    }

    logAuthEvent('User logged out', userId);
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      status: user.status,
      emailVerified: user.emailVerified,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar,
        companyName: user.profile.companyName,
      } : null,
    };
  }

  // Helper: Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Helper: Verify password
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Helper: Generate random token
  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
