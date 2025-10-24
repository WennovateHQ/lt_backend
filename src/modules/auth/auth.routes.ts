import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, optionalAuth } from '@/shared/middleware/auth';
import { rateLimiters } from '@/shared/middleware/rate-limiter';

const router = Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/register', 
  rateLimiters.registration,
  authController.register
);

router.post('/login', 
  rateLimiters.auth,
  authController.login
);

router.post('/refresh', 
  rateLimiters.auth,
  authController.refreshTokens
);

router.post('/verify-email', 
  rateLimiters.auth,
  authController.verifyEmail
);

router.post('/forgot-password', 
  rateLimiters.passwordReset,
  authController.forgotPassword
);

router.post('/reset-password', 
  rateLimiters.passwordReset,
  authController.resetPassword
);

// Routes with optional authentication
router.get('/check', 
  optionalAuth,
  authController.checkAuth
);

// Protected routes (authentication required)
router.use(authenticate); // All routes below require authentication

router.get('/profile', authController.getProfile);

router.post('/logout', authController.logout);

router.post('/resend-verification', authController.resendVerification);

router.post('/change-password', authController.changePassword);

router.delete('/account', authController.deleteAccount);

export { router as authRoutes };
