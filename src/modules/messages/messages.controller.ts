import { Response } from 'express';
import { MessagesService } from './messages.service';
import { 
  CreateMessageSchema, 
  MessageFiltersSchema,
  SearchMessagesSchema
} from './messages.types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { ValidationError } from '../../shared/utils/app-error';
import { AuthRequest } from '../../shared/middleware/auth';

export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = CreateMessageSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid message data', validation.error.errors);
    }

    const message = await this.messagesService.sendMessage(
      validation.data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: { message },
      message: 'Message sent successfully'
    });
  });

  getMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const message = await this.messagesService.getMessage(messageId, req.user!.id);

    return res.json({
      success: true,
      data: { message }
    });
  });

  getMyMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = MessageFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      throw new ValidationError('Invalid filter parameters', validation.error.errors);
    }

    const messages = await this.messagesService.getMyMessages(
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      data: { messages }
    });
  });

  getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const conversations = await this.messagesService.getConversations(req.user!.id);

    return res.json({
      success: true,
      data: { conversations }
    });
  });

  getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { otherUserId } = req.params;
    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user ID is required' });
    }
    const { projectId, contractId } = req.query;

    const messages = await this.messagesService.getConversation(
      req.user!.id,
      otherUserId,
      projectId as string,
      contractId as string
    );

    return res.json({
      success: true,
      data: { messages }
    });
  });

  markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const message = await this.messagesService.markAsRead(messageId, req.user!.id);

    return res.json({
      success: true,
      data: { message },
      message: 'Message marked as read'
    });
  });

  deleteMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    await this.messagesService.deleteMessage(messageId, req.user!.id);

    return res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  });

  getMessageStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.messagesService.getMessageStats(req.user!.id);

    res.json({
      success: true,
      data: { stats }
    });
  });

  searchMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = SearchMessagesSchema.safeParse(req.query);
    if (!validation.success) {
      throw new ValidationError('Invalid search parameters', validation.error.errors);
    }

    const messages = await this.messagesService.searchMessages(
      req.user!.id,
      validation.data.query,
      validation.data.limit
    );

    res.json({
      success: true,
      data: { messages }
    });
  });

  // Send typing indicator (for real-time features)
  sendTypingIndicator = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    if (!conversationId) {
      throw new ValidationError('Conversation ID is required');
    }

    // In a real implementation, this would emit a WebSocket event
    // For now, we'll just return a success response
    const result = await this.messagesService.sendTypingIndicator(conversationId, userId);

    res.json({
      success: true,
      data: result,
      message: 'Typing indicator sent'
    });
  });
}
