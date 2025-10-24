import { Router } from 'express';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { authenticate } from '../../shared/middleware/auth';
import { messageLimiter, apiLimiter, searchLimiter } from '../../shared/middleware/rate-limiter';
import { prisma } from '../../config/database';

const router = Router();

// Initialize service and controller
const messagesService = new MessagesService(prisma);
const messagesController = new MessagesController(messagesService);

// Apply authentication to all routes
router.use(authenticate);

// Message routes
router.post(
  '/',
  messageLimiter,
  messagesController.sendMessage
);

router.get(
  '/conversations',
  apiLimiter,
  messagesController.getConversations
);

router.get(
  '/my/messages',
  apiLimiter,
  messagesController.getMyMessages
);

router.get(
  '/stats',
  apiLimiter,
  messagesController.getMessageStats
);

router.get(
  '/search',
  searchLimiter,
  messagesController.searchMessages
);

router.get(
  '/conversation/:userId',
  apiLimiter,
  messagesController.getConversation
);

// Add missing typing indicator endpoint
router.post(
  '/conversations/:conversationId/typing',
  apiLimiter,
  messagesController.sendTypingIndicator
);

router.get(
  '/:messageId',
  apiLimiter,
  messagesController.getMessage
);

router.patch(
  '/:messageId/read',
  apiLimiter,
  messagesController.markAsRead
);

router.delete(
  '/:messageId',
  apiLimiter,
  messagesController.deleteMessage
);

export default router;
