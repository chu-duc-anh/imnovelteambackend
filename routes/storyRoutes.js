import express from 'express';
const router = express.Router();
import {
    getStories,
    getHotStories,
    getRecentStories,
    getStoryById,
    createStory,
    updateStory,
    deleteStory,
    updateChapterContent,
    checkStoryTitle,
    toggleStoryLike,
    rateStory,
    toggleBookmark,
    searchStories,
    getBookmarkedStories,
} from '../controllers/storyController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.get('/hot', getHotStories);
router.get('/recent', getRecentStories);
router.get('/search', searchStories);
router.get('/me/bookmarks', protect, getBookmarkedStories);
router.post('/check-title', protect, checkStoryTitle);

router.route('/')
    .get(getStories)
    .post(protect, createStory);

router.route('/:id')
    .get(getStoryById)
    .put(protect, updateStory)
    .delete(protect, deleteStory);

// New routes for liking and rating
router.put('/:id/like', protect, toggleStoryLike);
router.post('/:id/rate', protect, rateStory);
router.put('/:id/bookmark', protect, toggleBookmark);


router.put('/:id/volumes/:volumeId/chapters/:chapterId/content', protect, updateChapterContent);

export default router;
