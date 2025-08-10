import express from 'express';
const router = express.Router();
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// @desc    Routes for site settings
// @route   /api/settings

router.route('/')
    .get(getSettings) // Anyone can get settings
    .put(protect, admin, updateSettings); // Only admins can update

export default router;
