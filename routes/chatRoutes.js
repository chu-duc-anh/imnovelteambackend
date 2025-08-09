import express from 'express';
const router = express.Router();
import {
    getChatThreads,
    sendMessage,
    markThreadAsRead,
    getMessageLimit,
    deleteConversation
} from '../controllers/chatController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Direct Messages
router.route('/threads').get(protect, getChatThreads);
router.route('/send').post(protect, sendMessage);
router.route('/threads/:id/read').put(protect, markThreadAsRead);
router.route('/threads/:id').delete(protect, admin, deleteConversation);
router.route('/limit').get(protect, getMessageLimit);


export default router;