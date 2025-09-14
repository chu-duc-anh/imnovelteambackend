import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { uploadFile, getFile, deleteFile } from '../controllers/fileController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:filename', getFile);
// Allow any authenticated user to upload files (e.g., for comments)
router.post('/upload', protect, upload.single('file'), uploadFile);
router.delete('/:filename', protect, admin, deleteFile);

export default router;
