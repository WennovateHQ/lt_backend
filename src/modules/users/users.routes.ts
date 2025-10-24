import { Router } from 'express';
import multer from 'multer';
import { UsersController } from './users.controller';
import { authenticateToken, requireAdmin, requireTalent } from '../../middleware/auth';

const router = Router();
const usersController = new UsersController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes (with optional authentication)
router.get('/search', usersController.searchUsers);

router.get('/:userId/public', usersController.getPublicProfile);

// Protected routes (authentication required)
router.use(authenticateToken);

// Current user profile routes
router.get('/profile', usersController.getProfile);

router.put('/profile', usersController.updateProfile);

router.put('/location', usersController.updateLocation);

// Profile completion check
router.get('/profile/completion', usersController.checkProfileCompletion);

// Dashboard data
router.get('/dashboard', usersController.getDashboard);

// Skills management
router.post('/skills', usersController.addSkill);

router.put('/skills/:skillId', usersController.updateSkill);

router.delete('/skills/:skillId', usersController.removeSkill);

// Avatar management
router.post('/avatar', 
  upload.single('avatar'),
  usersController.uploadAvatar
);

router.delete('/avatar', usersController.deleteAvatar);

// Portfolio management (talent users only)
router.get('/talent/portfolio', 
  requireTalent,
  usersController.getPortfolioItems
);

router.post('/talent/portfolio', 
  requireTalent,
  usersController.addPortfolioItem
);

router.put('/talent/portfolio/:portfolioId', 
  requireTalent,
  usersController.updatePortfolioItem
);

router.delete('/talent/portfolio/:portfolioId', 
  requireTalent,
  usersController.deletePortfolioItem
);

// Fix route difference: frontend expects /users/upload-avatar vs /users/avatar
router.post('/upload-avatar', 
  upload.single('avatar'),
  usersController.uploadAvatar
);

// Admin routes (admin only)
router.get('/admin/stats', 
  requireAdmin,
  usersController.getUserStats
);

export { router as usersRoutes };
