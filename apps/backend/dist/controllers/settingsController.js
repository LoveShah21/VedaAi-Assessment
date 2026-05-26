"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const UserSettings_1 = require("../models/UserSettings");
const getSettings = async (req, res, next) => {
    try {
        // If no settings exist, this will create the singleton with defaults and return it.
        const settings = await UserSettings_1.UserSettings.findOneAndUpdate({}, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.status(200).json(settings);
    }
    catch (error) {
        next(error);
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res, next) => {
    try {
        const data = req.body;
        // Singleton guard: findOneAndUpdate({}, data, { upsert: true, new: true }) - never create()
        const settings = await UserSettings_1.UserSettings.findOneAndUpdate({}, data, { upsert: true, new: true, runValidators: true });
        res.status(200).json(settings);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
