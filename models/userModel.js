
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    picture: { type: String, default: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath fill-rule='evenodd' d='M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15c1.447 0 2.796.414 3.91 1.153A7.47 7.47 0 0 1 18 12c0-4.135-3.365-7.5-7.5-7.5S3 7.865 3 12a7.47 7.47 0 0 1 2.088 5.002Z' clip-rule='evenodd' /%3E%3Cpath d='M12 9a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5ZM12 15a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z' /%3E%3C/svg%3E" },
    role: { type: String, enum: ['user', 'admin', 'contractor'], default: 'user' },
    race: { type: String, default: 'Nhân tộc' },
    googleId: { type: String },
    allyOf: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.passwordHash; // Ensure hash is not sent
        }
    }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const User = mongoose.model('User', userSchema);

export default User;