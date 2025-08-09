import asyncHandler from 'express-async-handler';
import Setting from '../models/settingModel.js';
import { getGfs } from '../config/db.js';

// Helper to delete a file from GridFS by its filename
const deleteFileByName = async (filename) => {
    if (!filename) return;
    try {
        const gfs = getGfs();
        const files = await gfs.find({ filename }).toArray();
        if (files && files.length > 0) {
            await gfs.delete(files[0]._id);
            console.log(`Deleted old file from GridFS: ${filename}`);
        }
    } catch (error) {
        console.error(`Error deleting file ${filename} from GridFS:`, error);
    }
};

// @desc    Get all settings
// @route   GET /api/settings
// @access  Public
const getSettings = asyncHandler(async (req, res) => {
    const settings = await Setting.find({});
    res.json(settings.map(s => s.toJSON()));
});

// @desc    Update settings (bulk upsert)
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
    const settingsToUpdate = req.body; // Expecting an array of { key, value, mediaType }

    if (!Array.isArray(settingsToUpdate)) {
        res.status(400);
        throw new Error('Request body must be an array of settings.');
    }

    // Fetch current settings to check for old files that need deletion
    const currentSettings = await Setting.find({});
    const currentSettingsMap = new Map(currentSettings.map(s => [s.key, s.value]));

    for (const setting of settingsToUpdate) {
        const oldFileUrl = currentSettingsMap.get(setting.key);
        // If the value has changed and the old value was a GridFS file URL
        if (oldFileUrl && oldFileUrl !== setting.value && oldFileUrl.startsWith('/api/files/')) {
            const oldFilename = oldFileUrl.split('/').pop();
            await deleteFileByName(oldFilename);
        }
    }

    const operations = settingsToUpdate.map(setting => ({
        updateOne: {
            filter: { key: setting.key },
            update: { $set: { value: setting.value, mediaType: setting.mediaType } },
            upsert: true,
        },
    }));

    if (operations.length > 0) {
        await Setting.bulkWrite(operations);
    }

    const updatedSettings = await Setting.find({});
    res.json(updatedSettings.map(s => s.toJSON()));
});

export { getSettings, updateSettings };