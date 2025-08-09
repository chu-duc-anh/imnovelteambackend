import mongoose from 'mongoose';

const settingSchema = mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    mediaType: { type: String, required: true, enum: ['image', 'video', 'audio'] },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
