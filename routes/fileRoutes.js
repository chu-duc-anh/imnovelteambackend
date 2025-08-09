import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { uploadFile, getFile, deleteFile } from '../controllers/fileController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:filename', getFile);
router.post('/upload', protect, admin, upload.single('file'), uploadFile);
router.delete('/:filename', protect, admin, deleteFile);

export default router;
