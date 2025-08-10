console.log("--- RUNNING LATEST SERVER.JS (v2) ---"); // Diagnostic log

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import route handlers
import storyRoutes from './routes/storyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import settingRoutes from './routes/settingRoutes.js';


dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


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
app.use('/api/settings', settingRoutes);


// Error Middleware
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
