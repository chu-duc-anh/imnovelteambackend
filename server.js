console.log("--- RUNNING LATEST SERVER.JS (v2) ---"); // Diagnostic log

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB, { getGfs } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import middleware and models needed for inlined controller logic
import asyncHandler from 'express-async-handler';
import Setting from './models/settingModel.js';
import { protect, admin } from './middleware/authMiddleware.js';

// Import other route handlers
import storyRoutes from './routes/storyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import fileRoutes from './routes/fileRoutes.js';


dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


// --- Inlined Setting Controller Logic ---

// Helper to delete a file from GridFS by its filename
const deleteFileByName = async (filename) => {
    if (!filename) return;
    try {
        const gfs = getGfs();
        const files = await gfs.find({ filename }).toArray();
        if (files && files.length > 0) {
            await gfs.delete(files[0]._id);
            console.log(`Deleted old file from GridFS: ${filename}`);
        }
    } catch (error) {
        console.error(`Error deleting file ${filename} from GridFS:`, error);
    }
};

// @desc    Get all settings
const getSettings = asyncHandler(async (req, res) => {
    const settings = await Setting.find({});
    res.json(settings.map(s => s.toJSON()));
});

// @desc    Update settings (bulk upsert)
const updateSettings = asyncHandler(async (req, res) => {
    const settingsToUpdate = req.body; 

    if (!Array.isArray(settingsToUpdate)) {
        res.status(400);
        throw new Error('Request body must be an array of settings.');
    }

    const currentSettings = await Setting.find({});
    const currentSettingsMap = new Map(currentSettings.map(s => [s.key, s.value]));

    for (const setting of settingsToUpdate) {
        const oldFileUrl = currentSettingsMap.get(setting.key);
        if (oldFileUrl && oldFileUrl !== setting.value && oldFileUrl.startsWith('/api/files/')) {
            const oldFilename = oldFileUrl.split('/').pop();
            await deleteFileByName(oldFilename);
        }
    }
    
    const operations = settingsToUpdate.map(setting => ({
        updateOne: {
            filter: { key: setting.key },
            update: { $set: { value: setting.value, mediaType: setting.mediaType } },
            upsert: true,
        },
    }));

    if (operations.length > 0) {
        await Setting.bulkWrite(operations);
    }
    
    const updatedSettings = await Setting.find({});
    res.json(updatedSettings.map(s => s.toJSON()));
});

// --- End of Inlined Logic ---

app.get('/', (req, res) => {
    res.send('Welcome to the IMnovel Team API. The service is running correctly. Please use the frontend application to interact with the API.');
});

app.get('/api', (req, res) => {
    res.send('API is running...');
});

// Define Routes
app.use('/api/stories', storyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/files', fileRoutes);

// Inlined Setting Routes
const settingRouter = express.Router();
settingRouter.route('/')
    .get(getSettings)
    .put(protect, admin, updateSettings);
app.use('/api/settings', settingRouter);


// Error Middleware
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
