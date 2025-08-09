import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import storyRoutes from './routes/storyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
// import settingRoutes from './routes/settingRoutes.js'; // Removed to fix module not found error
import fileRoutes from './routes/fileRoutes.js';

// Import dependencies for inlined setting routes
import { getSettings, updateSettings } from './controllers/settingController.js';
import { protect, admin } from './middleware/authMiddleware.js';


dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' })); // Increased limit for base64 images, videos, and audio
app.use(express.urlencoded({ limit: '100mb', extended: true }));


app.get('/api', (req, res) => {
    res.send('API is running...');
});

app.use('/api/stories', storyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/chats', chatRoutes);
// app.use('/api/settings', settingRoutes); // Replaced with inlined router
app.use('/api/files', fileRoutes);

// Inlined Setting Routes
const settingRouter = express.Router();
settingRouter.route('/')
    .get(getSettings)
    .put(protect, admin, updateSettings);
app.use('/api/settings', settingRouter);


app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
