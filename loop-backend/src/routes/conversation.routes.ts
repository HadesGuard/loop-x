import { Router } from 'express';
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markAsRead,
} from '../controllers/messaging.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validateParams } from '../middleware/validation.middleware';
import {
  createConversationSchema,
  sendMessageSchema,
  getMessagesQuerySchema,
} from '../validators/messaging.validator';
import { idParamSchema } from '../validators/params.validator';

const router: Router = Router();

// All conversation routes require authentication
router.use(authenticate);

// Get all conversations
router.get('/', getConversations);

// Create or get conversation
router.post('/', validate(createConversationSchema), createOrGetConversation);

// Mark conversation as read
router.put('/:id/read', validateParams(idParamSchema), markAsRead);

// Get messages
router.get('/:id/messages', validate(getMessagesQuerySchema, 'query'), getMessages);

// Send message
router.post('/:id/messages', validate(sendMessageSchema), sendMessage);

export default router;



