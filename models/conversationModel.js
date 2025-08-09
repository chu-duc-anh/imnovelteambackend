import mongoose from 'mongoose';

const messageSchema = mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    receiverId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            ret.timestamp = new Date(ret.createdAt).getTime();
        }
    }
});

const conversationSchema = mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    messages: [messageSchema],
    userMessageCount: {
        type: Number,
        default: 0
    },
    lastCountReset: {
        type: Date,
        default: () => new Date()
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret.__v;
        }
    }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
