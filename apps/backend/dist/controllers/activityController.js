"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivities = void 0;
const Activity_1 = require("../models/Activity");
const getActivities = async (req, res, next) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const activities = await Activity_1.Activity.find()
            .sort({ createdAt: -1 })
            .limit(limit);
        res.status(200).json(activities);
    }
    catch (error) {
        next(error);
    }
};
exports.getActivities = getActivities;
