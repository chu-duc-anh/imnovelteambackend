

import mongoose from 'mongoose';

const contentBlockSchema = mongoose.Schema({
    type: { type: String, required: true, enum: ['text', 'image'] },
    value: { type: String, required: true },
    alt: { type: String },
}, {
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    }
});

const chapterSchema = mongoose.Schema({
    title: { type: String, required: true },
    contentBlocks: [contentBlockSchema],
    timestamp: { type: Number, default: Date.now },
}, {
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    }
});

const volumeSchema = mongoose.Schema({
    title: { type: String, required: true },
    coverImageUrl: { type: String },
    chapters: [chapterSchema],
}, {
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    }
});

const ratingSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    score: { type: Number, required: true, min: 1, max: 5 },
}, { _id: false });


const storySchema = mongoose.Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    translator: { type: String },
    alternativeTitles: { type: [String], default: [] },
    coverImageUrl: { type: String, required: true },
    genres: { type: [String], required: true },
    description: { type: String, required: true },
    volumes: [volumeSchema],
    status: { type: String, enum: ['Ongoing', 'Completed', 'Dropped'], default: 'Ongoing' },
    isRecent: { type: Boolean, default: true },
    hot: { type: Boolean, default: false },
    lastUpdated: { type: Number },
    // New fields for likes and ratings
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    ratings: [ratingSchema],
     // The `rating` and `ratingCount` fields are deprecated in favor of calculating from the `ratings` array.
    rating: { type: Number }, // Kept for compatibility, but should not be the source of truth.
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            // Ensure bookmarks and likedBy are arrays of strings for the frontend
            if (ret.bookmarks) {
                ret.bookmarks = ret.bookmarks.map(id => id.toString());
            }
            if (ret.likedBy) {
                ret.likedBy = ret.likedBy.map(id => id.toString());
            }
            if(ret.ratings) {
                ret.ratings = ret.ratings.map(r => ({ userId: r.userId.toString(), score: r.score }));
            }
        }
    }
});

const Story = mongoose.model('Story', storySchema);

export default Story;