import express from 'express';
const router = express.Router();
import {
    registerUser,
    loginUser,
    getCurrentUser,
    updateUserProfile,
    updateUserPassword,
    getAllUsers,
    updateUserRole,
    deleteUser,
    checkUsername,
    checkEmail,
    manageAlly,
    leaveAllyTeam,
    getPublicUsers,
    getLeaderboard,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Public routes
router.get('/public', getPublicUsers);
router.get('/leaderboard', getLeaderboard);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/check-username', checkUsername);
router.post('/check-email', checkEmail);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updateUserPassword);
router.put('/manage-ally', protect, manageAlly);
router.put('/leave-ally', protect, leaveAllyTeam);

// This route is now protected but not restricted to admins only.
// The controller will handle role-based authorization.
router.get('/', protect, getAllUsers);

// Admin routes
router.put('/:id/role', protect, admin, updateUserRole);
router.delete('/:id', protect, admin, deleteUser);

export default router;