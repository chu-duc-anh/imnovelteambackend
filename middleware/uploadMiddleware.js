import multer from 'multer';

// Use memory storage to handle the file in memory before streaming to GridFS
const storage = multer.memoryStorage();
const upload = multer({ storage });

export default upload;