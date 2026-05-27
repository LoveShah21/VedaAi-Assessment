"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGroup = exports.getGroups = exports.createGroup = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Group_1 = require("../models/Group");
const createGroup = async (req, res, next) => {
    try {
        const { name, className, subject, studentCount } = req.body;
        const group = new Group_1.Group({
            name,
            className,
            subject,
            studentCount,
        });
        await group.save();
        res.status(201).json(group);
    }
    catch (error) {
        next(error);
    }
};
exports.createGroup = createGroup;
const getGroups = async (req, res, next) => {
    try {
        const groups = await Group_1.Group.find().sort({ createdAt: -1 });
        res.status(200).json(groups);
    }
    catch (error) {
        next(error);
    }
};
exports.getGroups = getGroups;
const deleteGroup = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(404).json({
                success: false,
                message: 'Group not found',
            });
            return;
        }
        const group = await Group_1.Group.findByIdAndDelete(id);
        if (!group) {
            res.status(404).json({
                success: false,
                message: 'Group not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Group deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteGroup = deleteGroup;
