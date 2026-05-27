"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const UserSettings_1 = require("../models/UserSettings");
const getSettings = async (req, res, next) => {
    try {
        const settings = await UserSettings_1.UserSettings.findOne({});
        res.status(200).json(settings ?? {});
    }
    catch (error) {
        next(error);
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res, next) => {
    try {
        const settings = await UserSettings_1.UserSettings.findOneAndUpdate({}, req.body, { upsert: true, new: true, runValidators: true });
        res.status(200).json(settings);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
