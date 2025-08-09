
import mongoose from 'mongoose';

const commentSchema = mongoose.Schema({
    storyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Story' },
    chapterId: { type: String, required: false, default: null }, // Using String as chapter/volume IDs are nested and not separate models
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    isPinned: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret.__v;
            // Frontend expects timestamps as numbers
            ret.timestamp = new Date(ret.createdAt).getTime();
        }
    }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
