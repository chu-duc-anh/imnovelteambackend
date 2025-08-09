import asyncHandler from 'express-async-handler';
import { getGfs } from '../config/db.js';
import { Readable } from 'stream';
import crypto from 'crypto';
import path from 'path';

// @desc    Upload a file to GridFS from buffer
// @route   POST /api/files/upload
// @access  Private/Admin
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded.');
    }

    const gfs = getGfs();
    if (!gfs) {
        res.status(500);
        throw new Error('GridFS not initialized');
    }

    // Generate a unique filename
    const filename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);

    // Create a readable stream from the buffer
    const readableStream = Readable.from(req.file.buffer);

    const uploadStream = gfs.openUploadStream(filename, {
        contentType: req.file.mimetype,
    });

    // Pipe the buffer stream to GridFS
    readableStream.pipe(uploadStream);

    uploadStream.on('error', (error) => {
        if (!res.headersSent) {
            res.status(500);
            throw new Error('File upload failed: ' + error.message);
        }
    });

    uploadStream.on('finish', () => {
        res.status(201).json({
            message: 'File uploaded successfully',
            url: `/api/files/${filename}`,
            file: {
                filename: filename,
                id: uploadStream.id,
                contentType: req.file.mimetype,
                size: req.file.size,
            },
        });
    });
});


// @desc    Get a file from GridFS and stream it
// @route   GET /api/files/:filename
// @access  Public
const getFile = asyncHandler(async (req, res) => {
    const gfs = getGfs();
    if (!gfs) {
        res.status(500);
        throw new Error('GridFS not initialized');
    }

    const files = await gfs.find({ filename: req.params.filename }).toArray();

    if (!files || files.length === 0) {
        return res.status(404).json({ err: 'No file exists' });
    }

    // Set content type and stream the file
    res.set('Content-Type', files[0].contentType);
    const readstream = gfs.openDownloadStreamByName(req.params.filename);
    readstream.pipe(res);
});

// @desc    Delete a file from GridFS
// @route   DELETE /api/files/:filename
// @access  Private/Admin
const deleteFile = asyncHandler(async (req, res) => {
    const gfs = getGfs();
     if (!gfs) {
        res.status(500);
        throw new Error('GridFS not initialized');
    }

    const files = await gfs.find({ filename: req.params.filename }).toArray();

    if (!files || files.length === 0) {
        return res.status(404).json({ err: 'No file exists to delete' });
    }

    await gfs.delete(files[0]._id);
    res.status(204).send();
});


export { uploadFile, getFile, deleteFile };