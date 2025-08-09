
import express from 'express';
const router = express.Router();
import {
    getComments,
    createComment,
    toggleCommentLike,
    togglePinComment,
    deleteComment
} from '../controllers/commentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/')
    .get(getComments)
    .post(protect, createComment);

router.route('/:id/like').put(protect, toggleCommentLike);
router.route('/:id/pin').put(protect, admin, togglePinComment);
router.route('/:id').delete(protect, deleteComment);

export default router;
