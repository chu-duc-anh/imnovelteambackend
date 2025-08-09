



import asyncHandler from 'express-async-handler';
import Story from '../models/storyModel.js';
import Comment from '../models/commentModel.js';
import mongoose from 'mongoose';

// Helper to populate story creator and convert to JSON
const formatStoryResponse = async (story) => {
    const populated = await story.populate('creatorId', 'id username');
    return populated.toJSON();
};


// @desc    Fetch all stories
// @route   GET /api/stories
// @access  Public
const getStories = asyncHandler(async (req, res) => {
    const stories = await Story.find({}).sort({ lastUpdated: -1 }).populate('creatorId', 'id username');
    res.json(stories.map(s => s.toJSON()));
});

// @desc    Fetch single story
// @route   GET /api/stories/:id
// @access  Public
const getStoryById = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (story) {
        res.json(await formatStoryResponse(story));
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Create a story
// @route   POST /api/stories
// @access  Private/Admin or Contractor
const createStory = asyncHandler(async (req, res) => {
    const user = req.user;

    // Authorization check
    if (user.role !== 'admin' && user.role !== 'contractor') {
        res.status(403);
        throw new Error('User not authorized to create stories');
    }

    const { title, author, translator, coverImageUrl, genres, description, volumes, status, hot, alternativeTitles } = req.body;

    const story = new Story({
        creatorId: user._id, // Creator is always the logged-in admin/contractor
        title,
        author,
        translator,
        alternativeTitles,
        coverImageUrl,
        genres,
        description,
        volumes,
        status,
        hot,
        isRecent: true,
        lastUpdated: Date.now(),
    });

    const createdStory = await story.save();
    res.status(201).json(await formatStoryResponse(createdStory));
});

// @desc    Update a story
// @route   PUT /api/stories/:id
// @access  Private/Admin or Contractor (owner) or Ally
const updateStory = asyncHandler(async (req, res) => {
    const { title, author, translator, coverImageUrl, genres, description, volumes, status, hot, rating, alternativeTitles } = req.body;

    const story = await Story.findById(req.params.id);

    if (story) {
        // Authorization check: Must be admin, the story's creator, or an ally of the creator
        const isAdmin = req.user.role === 'admin';
        const isOwner = story.creatorId ? story.creatorId.toString() === req.user.id : false;
        const isAlly = story.creatorId && req.user.allyOf ? story.creatorId.equals(req.user.allyOf) : false;

        if (!isAdmin && !isOwner && !isAlly) {
             res.status(403);
             throw new Error('User not authorized to update this story');
        }

        // If creatorId is missing, only an admin can proceed past the check above.
        if (!story.creatorId && !isAdmin) {
            res.status(500);
            throw new Error('Story has an invalid owner and cannot be modified.');
        }

        story.title = title ?? story.title;
        story.author = author ?? story.author;
        story.translator = translator ?? story.translator;
        story.alternativeTitles = alternativeTitles ?? story.alternativeTitles;
        story.coverImageUrl = coverImageUrl ?? story.coverImageUrl;
        story.genres = genres ?? story.genres;
        story.description = description ?? story.description;
        story.volumes = volumes ?? story.volumes;
        story.status = status ?? story.status;
        story.hot = hot ?? story.hot;
        story.rating = rating ?? story.rating;
        story.lastUpdated = Date.now();
        story.isRecent = false; // It's not new anymore if it's being updated

        const updatedStory = await story.save();
        res.json(await formatStoryResponse(updatedStory));
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private/Admin or Contractor (owner) or Ally
const deleteStory = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (story) {
       // Authorization check: Must be admin, the story's creator, or an ally of the creator
        const isAdmin = req.user.role === 'admin';
        const isOwner = story.creatorId ? story.creatorId.toString() === req.user.id : false;
        const isAlly = story.creatorId && req.user.allyOf ? story.creatorId.equals(req.user.allyOf) : false;

        if (!isAdmin && !isOwner && !isAlly) {
             res.status(403);
             throw new Error('User not authorized to delete this story');
        }

        if (!story.creatorId && !isAdmin) {
            res.status(500);
            throw new Error('Story has an invalid owner and cannot be deleted.');
        }

        await story.deleteOne();
        // Also delete associated comments
        await Comment.deleteMany({ storyId: story._id });
        res.status(204).send();
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Check if a story title is available
// @route   POST /api/stories/check-title
// @access  Private
const checkStoryTitle = asyncHandler(async (req, res) => {
    const { title, excludeId } = req.body;

    // Build case-insensitive query
    const query = { title: { $regex: new RegExp(`^${title}$`, 'i') } };

    // If editing, exclude the current story's ID from the check
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const story = await Story.findOne(query);

    res.json({ available: !story });
});


// @desc    Update a chapter's content blocks
// @route   PUT /api/stories/:id/volumes/:volumeId/chapters/:chapterId/content
// @access  Private/Admin or Contractor (owner) or Ally
const updateChapterContent = asyncHandler(async (req, res) => {
    const { contentBlocks } = req.body;

    const story = await Story.findById(req.params.id);

    if (story) {
        // Authorization check
        const isAdmin = req.user.role === 'admin';
        const isOwner = story.creatorId ? story.creatorId.toString() === req.user.id : false;
        const isAlly = story.creatorId && req.user.allyOf ? story.creatorId.equals(req.user.allyOf) : false;

        if (!isAdmin && !isOwner && !isAlly) {
             res.status(403);
             throw new Error('User not authorized to update this story');
        }

        const volume = story.volumes.id(req.params.volumeId);
        if (volume) {
            const chapter = volume.chapters.id(req.params.chapterId);
            if (chapter) {
                chapter.contentBlocks = contentBlocks;
                story.lastUpdated = Date.now();
                const updatedStory = await story.save();
                res.json(await formatStoryResponse(updatedStory));
            } else {
                res.status(404);
                throw new Error('Chapter not found');
            }
        } else {
            res.status(404);
            throw new Error('Volume not found');
        }
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Like or unlike a story
// @route   PUT /api/stories/:id/like
// @access  Private
const toggleStoryLike = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (story) {
        const userId = req.user._id;
        const isLiked = story.likedBy.includes(userId);

        if (isLiked) {
            // Unlike
            story.likedBy.pull(userId);
        } else {
            // Like
            story.likedBy.push(userId);
        }

        const updatedStory = await story.save();
        res.json(await formatStoryResponse(updatedStory));
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Rate a story
// @route   POST /api/stories/:id/rate
// @access  Private
const rateStory = asyncHandler(async (req, res) => {
    const { score } = req.body;
    const story = await Story.findById(req.params.id);

    if (story) {
        const userId = req.user._id;

        if (!score || score < 1 || score > 5) {
            res.status(400);
            throw new Error('Score must be between 1 and 5');
        }

        const existingRating = story.ratings.find(r => r.userId.equals(userId));

        if (existingRating) {
            // Update existing rating
            existingRating.score = score;
        } else {
            // Add new rating
            story.ratings.push({ userId, score });
        }

        const updatedStory = await story.save();
        res.json(await formatStoryResponse(updatedStory));

    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});

// @desc    Bookmark or unbookmark a story
// @route   PUT /api/stories/:id/bookmark
// @access  Private
const toggleBookmark = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (story) {
        const userId = req.user._id;
        const isBookmarked = story.bookmarks.includes(userId);

        if (isBookmarked) {
            // Unbookmark
            story.bookmarks.pull(userId);
        } else {
            // Bookmark
            story.bookmarks.push(userId);
        }

        const updatedStory = await story.save();
        res.json(await formatStoryResponse(updatedStory));
    } else {
        res.status(404);
        throw new Error('Story not found');
    }
});


export {
    getStories,
    getStoryById,
    createStory,
    updateStory,
    deleteStory,
    updateChapterContent,
    checkStoryTitle,
    toggleStoryLike,
    rateStory,
    toggleBookmark,
};