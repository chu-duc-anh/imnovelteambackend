import asyncHandler from 'express-async-handler';
import Conversation from '../models/conversationModel.js';
import User from '../models/userModel.js';

// --- Direct Chat ---

// Helper function to check if a date was yesterday or earlier
const isPreviousDay = (date1, date2) => {
    return date1.getFullYear() !== date2.getFullYear() ||
           date1.getMonth() !== date2.getMonth() ||
           date1.getDate() !== date2.getDate();
};

// @desc    Get all chat threads for the current user
// @route   GET /api/chats/threads
// @access  Private
const getChatThreads = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Find all conversations the user is a part of
    const conversations = await Conversation.find({ participants: userId })
        .populate('participants', 'id name username picture')
        .populate('messages.senderId', 'id name username picture')
        .sort({ updatedAt: -1 });

    const threads = conversations.map(conv => {
        const otherParticipant = conv.participants.find(p => p.id.toString() !== userId);
        const lastMessage = conv.messages[conv.messages.length - 1];

        return {
            id: otherParticipant ? otherParticipant.id : userId, // Thread ID is the other person's ID
            userId: otherParticipant ? otherParticipant.id : userId,
            userName: otherParticipant ? otherParticipant.name : "Admin",
            userAvatar: otherParticipant ? otherParticipant.picture : "",
            messages: conv.messages.map(m => m.toJSON()),
            lastMessageTimestamp: lastMessage ? new Date(lastMessage.createdAt).getTime() : new Date(conv.updatedAt).getTime(),
        };
    });

    res.json(threads);
});

// @desc    Send a direct message
// @route   POST /api/chats/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { text, receiverId: providedReceiverId } = req.body;
    const sender = req.user;
    const senderId = sender.id;
    const DAILY_LIMIT = 5;

    // Determine the actual receiver
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
        res.status(500);
        throw new Error('Admin user not found or not configured.');
    }
    const receiverId = sender.role === 'admin' ? providedReceiverId : adminUser.id;

    if (!text || !receiverId) {
        res.status(400);
        throw new Error("Text and receiverId are required.");
    }

    if (senderId === receiverId) {
        res.status(400);
        throw new Error("Cannot send message to yourself.");
    }

    // Check if user is subject to daily limits
    const isLimitedUser = sender.role === 'user';

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
    });

    if (isLimitedUser) {
        if (!conversation) {
            // This is their first message, so we create the conversation
            conversation = new Conversation({
                participants: [senderId, receiverId],
                userMessageCount: 0,
                lastCountReset: new Date()
            });
        }

        // Check if we need to reset the daily count
        if (isPreviousDay(new Date(), new Date(conversation.lastCountReset))) {
            conversation.userMessageCount = 0;
            conversation.lastCountReset = new Date();
        }

        if (conversation.userMessageCount >= DAILY_LIMIT) {
            res.status(429); // Too Many Requests
            throw new Error(`Bạn đã đạt giới hạn ${DAILY_LIMIT} tin nhắn mỗi ngày. Vui lòng quay lại vào ngày mai.`);
        }
    } else if (!conversation) {
        // For contractors/admins starting a conversation
        conversation = new Conversation({ participants: [senderId, receiverId] });
    }

    const newMessage = { senderId, receiverId, text };
    conversation.messages.push(newMessage);

    if (isLimitedUser) {
        conversation.userMessageCount++;
    }

    await conversation.save();

    // In a real app, use WebSockets to push message to receiver
    res.status(201).json(conversation.messages[conversation.messages.length - 1].toJSON());
});

// @desc    Mark a thread's messages as read
// @route   PUT /api/chats/threads/:id/read
// @access  Private
const markThreadAsRead = asyncHandler(async (req, res) => {
    const otherUserId = req.params.id;
    const currentUserId = req.user.id;

    const conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, otherUserId] }
    });

    if (conversation) {
        conversation.messages.forEach(message => {
            if (message.receiverId.toString() === currentUserId.toString()) {
                message.isRead = true;
            }
        });
        await conversation.save();
    }

    res.status(204).send();
});

// @desc    Get message limit info for the current user
// @route   GET /api/chats/limit
// @access  Private
const getMessageLimit = asyncHandler(async (req, res) => {
    const user = req.user;
    const DAILY_LIMIT = 5;

    if (user.role === 'admin' || user.role === 'contractor') {
        return res.json({ limit: -1, remaining: -1 }); // Unlimited
    }

    // For 'user' role (including allies)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
        // This is a server configuration issue, but we can fail gracefully for the user.
        return res.json({ limit: DAILY_LIMIT, remaining: 0, error: "Admin account not found" });
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [user.id, adminUser.id] }
    });

    if (!conversation) {
        // No conversation started yet, so they have all their messages left
        return res.json({ limit: DAILY_LIMIT, remaining: DAILY_LIMIT });
    }

    let currentCount = conversation.userMessageCount;

    // Check if we need to reset the daily count
    if (isPreviousDay(new Date(), new Date(conversation.lastCountReset))) {
        // It's a new day, reset the count in the database for future requests
        conversation.userMessageCount = 0;
        conversation.lastCountReset = new Date();
        await conversation.save();
        currentCount = 0;
    }

    res.json({ limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - currentCount) });
});

// @desc    Delete a chat conversation
// @route   DELETE /api/chats/threads/:id
// @access  Private/Admin
const deleteConversation = asyncHandler(async (req, res) => {
    const otherUserId = req.params.id;
    const adminId = req.user.id; // The user calling this is an admin due to middleware

    const conversation = await Conversation.findOne({
        participants: { $all: [adminId, otherUserId] }
    });

    if (conversation) {
        await conversation.deleteOne();
        res.status(204).send();
    } else {
        res.status(404);
        throw new Error('Conversation not found');
    }
});


export {
    getChatThreads,
    sendMessage,
    markThreadAsRead,
    getMessageLimit,
    deleteConversation,
};