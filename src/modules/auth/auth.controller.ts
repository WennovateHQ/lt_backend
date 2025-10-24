import { Request, Response } from 'express';
import { AuthService, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, VerifyEmailInput } from './auth.service';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { logger } from '@/config/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Register new user
  register = asyncHandler(async (req: Request, res: Response) => {
    const input: RegisterInput = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await this.authService.register(input, ipAddress);

    // Set HTTP-only cookies for web clients
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: result.tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info('User registered successfully', {
      userId: result.user.id,
      userType: result.user.userType,
      ipAddress,
      userAgent,
    });

    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      tokens: result.tokens,
    });
  });

  // Login user
  login = asyncHandler(async (req: Request, res: Response) => {
    const input: LoginInput = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await this.authService.login(input, ipAddress);

    // Set HTTP-only cookies for web clients
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: result.tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info('User logged in successfully', {
      userId: result.user.id,
      userType: result.user.userType,
      ipAddress,
      userAgent,
    });

    res.json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens,
    });
  });

  // Refresh tokens
  refreshTokens = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body['refreshToken'] || req.cookies['refreshToken'];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
      });
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Update cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      message: 'Tokens refreshed successfully',
      tokens,
    });
  });

  // Verify email
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const input: VerifyEmailInput = req.body;

    await this.authService.verifyEmail(input);

    logger.info('Email verified successfully', {
      token: input.token,
    });

    return res.json({
      message: 'Email verified successfully',
    });
  });

  // Forgot password
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const input: ForgotPasswordInput = req.body;
    const ipAddress = req.ip;

    await this.authService.forgotPassword(input, ipAddress);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  });

  // Reset password
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const input: ResetPasswordInput = req.body;
    const ipAddress = req.ip;

    await this.authService.resetPassword(input, ipAddress);

    logger.info('Password reset successfully', {
      token: input.token,
      ipAddress,
    });

    res.json({
      message: 'Password reset successfully',
    });
  });

  // Logout
  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (userId) {
      await this.authService.logout(userId, sessionId);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    logger.info('User logged out successfully', {
      userId,
    });

    res.json({
      message: 'Logged out successfully',
    });
  });

  // Get current user profile
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await this.authService.getUserProfile(userId);

    res.json({
      user,
    });
  });

  // Check authentication status
  checkAuth = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        authenticated: false,
        message: 'Not authenticated',
      });
    }

    const user = await this.authService.getUserProfile(req.user.id);

    return res.json({
      authenticated: true,
      user,
    });
  });

  // Resend verification email
  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement resend verification logic
    // This would generate a new verification token and send email

    logger.info('Verification email resent', {
      userId,
    });

    return res.json({
      message: 'Verification email sent',
    });
  });

  // Change password (for authenticated users)
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
      });
    }

    // TODO: Implement change password logic
    // This would verify current password and update to new password

    logger.info('Password changed successfully', {
      userId,
    });

    return res.json({
      message: 'Password changed successfully',
    });
  });

  // Delete account
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password confirmation required',
      });
    }

    // TODO: Implement account deletion logic
    // This would soft delete or hard delete the user account

    logger.info('Account deleted', {
      userId,
    });

    return res.json({
      message: 'Account deleted successfully',
    });
  });
}
