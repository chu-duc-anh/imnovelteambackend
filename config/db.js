import mongoose from 'mongoose';

let gfs;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        gfs = new mongoose.mongo.GridFSBucket(conn.connection.db, {
            bucketName: 'uploads'
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export const getGfs = () => gfs;

export default connectDB;