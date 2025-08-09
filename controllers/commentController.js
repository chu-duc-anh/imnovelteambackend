

import asyncHandler from 'express-async-handler';
import Comment from '../models/commentModel.js';

const USER_FIELDS_TO_POPULATE = 'id name username picture role race allyOf';

// @desc    Get comments, optionally by story or chapter
// @route   GET /api/comments
// @access  Public
const getComments = asyncHandler(async (req, res) => {
    const { storyId, chapterId } = req.query;
    const filter = {};
    if (storyId) filter.storyId = storyId;
    if (chapterId) filter.chapterId = chapterId;

    const comments = await Comment.find(filter)
        .populate('userId', USER_FIELDS_TO_POPULATE)
        .sort({ createdAt: -1 });

    res.json(comments.map(c => c.toJSON()));
});

// @desc    Create a new comment
// @route   POST /api/comments
// @access  Private
const createComment = asyncHandler(async (req, res) => {
    const { storyId, chapterId, text, parentId } = req.body;
    const user = req.user;

    if (!text || !storyId) {
        res.status(400);
        throw new Error('Text and storyId are required');
    }

    let comment = await Comment.create({
        storyId,
        chapterId,
        text,
        parentId: parentId || null, // Sanitize parentId to prevent CastError on empty strings
        userId: user._id,
    });

    // Populate the user details before sending back to the client
    comment = await comment.populate('userId', USER_FIELDS_TO_POPULATE);

    res.status(201).json(comment.toJSON());
});

// @desc    Toggle like on a comment
// @route   PUT /api/comments/:id/like
// @access  Private
const toggleCommentLike = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);

    if (comment) {
        const userId = req.user._id;
        const isLiked = comment.likes.includes(userId);

        if (isLiked) {
            comment.likes.pull(userId);
        } else {
            comment.likes.push(userId);
        }
        await comment.save();
        await comment.populate('userId', USER_FIELDS_TO_POPULATE);
        res.json(comment.toJSON());
    } else {
        res.status(404);
        throw new Error('Comment not found');
    }
});

// @desc    Toggle pin on a comment
// @route   PUT /api/comments/:id/pin
// @access  Private/Admin
const togglePinComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);
    if (comment) {
        comment.isPinned = !comment.isPinned;
        await comment.save();
        await comment.populate('userId', USER_FIELDS_TO_POPULATE);
        res.json(comment.toJSON());
    } else {
        res.status(404);
        throw new Error('Comment not found');
    }
});


// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
    const comment = await Comment.findById(req.params.id);

    if (comment) {
        // Check if user is the comment owner or an admin
        if (comment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            res.status(401);
            throw new Error('User not authorized to delete this comment');
        }

        await comment.deleteOne();
        // Also delete replies
        await Comment.deleteMany({ parentId: req.params.id });

        res.status(204).send();
    } else {
        res.status(404);
        throw new Error('Comment not found');
    }
});


export {
    getComments,
    createComment,
    toggleCommentLike,
    togglePinComment,
    deleteComment
};