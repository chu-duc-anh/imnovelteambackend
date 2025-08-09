import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Story from '../models/storyModel.js';
import Comment from '../models/commentModel.js';
import generateToken from '../utils/generateToken.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Check if this is the first user to determine role
    const userCount = await User.countDocuments({});
    const role = userCount === 0 ? 'admin' : 'user';
    const race = role === 'admin' ? 'Tổng lãnh thiên thần' : 'Nhân tộc'; // Default race for admin

    const user = await User.create({
        username,
        email,
        name: username,
        passwordHash: password,
        role,
        race,
    });

    if (user) {
        res.status(201).json({
            user: user.toJSON(),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { loginIdentifier, password } = req.body;

    const user = await User.findOne({
        $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    }).populate('allyOf', 'id username').select('+passwordHash');

    if (user && (await user.matchPassword(password))) {
        res.json({
            user: user.toJSON(),
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('allyOf', 'id username');
    res.status(200).json(user.toJSON());
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        // Admin race cannot be changed
        if (user.role !== 'admin') {
            user.race = req.body.race || user.race;
        }
        user.picture = req.body.picture || user.picture;

        let updatedUser = await user.save();
        updatedUser = await updatedUser.populate('allyOf', 'id username');
        res.json(updatedUser.toJSON());
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
const updateUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+passwordHash');
    
    if (user && await user.matchPassword(oldPassword)) {
        user.passwordHash = newPassword;
        await user.save();
        res.status(204).send();
    } else {
        res.status(401);
        throw new Error('Incorrect old password');
    }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin or Private/Contractor
const getAllUsers = asyncHandler(async (req, res) => {
    // Authorization check inside the controller
    if (req.user.role !== 'admin' && req.user.role !== 'contractor') {
        res.status(403);
        throw new Error('You are not authorized to view the user list.');
    }

    const users = await User.find({}).populate('allyOf', 'id username');
    res.json(users.map(u => u.toJSON()));
});


// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!['user', 'admin', 'contractor'].includes(role)) {
        res.status(400);
        throw new Error('Invalid role specified.');
    }

    const user = await User.findById(req.params.id);
    if (user) {
        user.role = role;
        await user.save();
        res.status(204).send();
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        await user.deleteOne();
        // Also remove their comments, etc. Could be done with middleware or here
        res.status(204).send();
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Check username availability
// @route   POST /api/users/check-username
// @access  Public
const checkUsername = asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    res.json({ available: !user });
});

// @desc    Check email availability
// @route   POST /api/users/check-email
// @access  Public
const checkEmail = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    res.json({ available: !user });
});

// @desc    Add or remove an ally for a contractor
// @route   PUT /api/users/manage-ally
// @access  Private (Contractor)
const manageAlly = asyncHandler(async (req, res) => {
    const contractor = req.user;
    if (contractor.role !== 'contractor') {
        res.status(403);
        throw new Error('Only contractors can manage allies.');
    }

    const { action, allyUsername } = req.body;
    if (!action || !allyUsername) {
        res.status(400);
        throw new Error('Action and allyUsername are required.');
    }

    const allyUser = await User.findOne({ username: allyUsername });

    if (!allyUser) {
        res.status(404);
        throw new Error('User to be made an ally not found.');
    }

    if (action === 'add') {
        if (allyUser.role !== 'user') {
            res.status(400);
            throw new Error('Only users with the "user" role can become allies.');
        }
        if (allyUser.allyOf && allyUser.allyOf.toString() !== contractor.id) {
            res.status(400);
            throw new Error('This user is already an ally of another contractor.');
        }
        allyUser.allyOf = contractor._id;
    } else if (action === 'remove') {
        if (!allyUser.allyOf || allyUser.allyOf.toString() !== contractor.id) {
            res.status(400);
            throw new Error('This user is not your ally.');
        }
        allyUser.allyOf = null;
    } else {
        res.status(400);
        throw new Error('Invalid action. Must be "add" or "remove".');
    }

    let updatedAlly = await allyUser.save();
    updatedAlly = await updatedAlly.populate('allyOf', 'id username');
    res.json(updatedAlly.toJSON());
});

// @desc    Ally leaves their contractor's team
// @route   PUT /api/users/leave-ally
// @access  Private
const leaveAllyTeam = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (!user.allyOf) {
        res.status(400);
        throw new Error('You are not currently an ally for any contractor.');
    }

    user.allyOf = null;
    const updatedUser = await user.save();

    res.json(updatedUser.toJSON());
});

// @desc    Get all users with public information only
// @route   GET /api/users/public
// @access  Public
const getPublicUsers = asyncHandler(async (req, res) => {
    // We select fields that are safe to be public for the leaderboard
    const users = await User.find({}).select('username name picture role race');
    res.json(users.map(u => u.toJSON()));
});


// @desc    Get top users for the leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
const getLeaderboard = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('id username name picture role race');
    const comments = await Comment.find({}).select('userId likes');
    const stories = await Story.find({}).select('creatorId');

    const scores = new Map();

    // Initialize scores for all users
    users.forEach(user => {
        scores.set(user.id.toString(), { comments: 0, likes: 0, stories: 0 });
    });

    // Calculate score from stories created
    stories.forEach(story => {
        const creatorId = story.creatorId?.toString();
        if (creatorId && scores.has(creatorId)) {
            scores.get(creatorId).stories += 1;
        }
    });

    // Calculate score from comments and likes
    comments.forEach(comment => {
        const authorId = comment.userId?.toString();
        if (authorId && scores.has(authorId)) {
            // Add points for making a comment
            scores.get(authorId).comments += 1;
            // Add points for likes received on that comment
            scores.get(authorId).likes += comment.likes.length;
        }
    });
    
    // Calculate final weighted score
    const usersWithScores = users.map(user => {
        const userScoreData = scores.get(user.id.toString()) || { comments: 0, likes: 0, stories: 0 };
        // Weighted score: Story created = 10 pts, Like received = 2 pts, Comment made = 1 pt
        const totalScore = (userScoreData.stories * 10) + (userScoreData.likes * 2) + (userScoreData.comments * 1);
        
        return {
            ...user.toJSON(),
            totalScore,
        };
    });

    // Sort by score and take the top 10
    const topUsers = usersWithScores
      .filter(user => user.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    res.json(topUsers);
});

// @desc    Forgot password
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        // To prevent email enumeration, we send a success response even if the user doesn't exist.
        return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // The frontend URL should come from an env var, but this works for now.
    const resetURL = `https://imnovelteam.vercel.app/?resetToken=${resetToken}`;
    const message = `Forgot your password? Click the link to reset it: ${resetURL}\nIf you didn't forget your password, please ignore this email! This link is valid for 10 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'IMnovel Team - Your password reset token (valid for 10 min)',
            text: message,
        });

        res.status(200).json({ message: 'Token sent to email!' });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('EMAIL ERROR', err);
        res.status(500);
        throw new Error('There was an error sending the email. Try again later.');
    }
});

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordHash');

    if (!user) {
        res.status(400);
        throw new Error('Token is invalid or has expired.');
    }
    
    if (!req.body.password || req.body.password.length < 6) {
        res.status(400);
        throw new Error('Please provide a password with at least 6 characters.');
    }

    user.passwordHash = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
        user: user.toJSON(),
        token: generateToken(user._id),
    });
});


export {
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
    forgotPassword,
    resetPassword,
};
