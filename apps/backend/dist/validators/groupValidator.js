"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Group name is required' }).min(1, 'Group name is required'),
        className: zod_1.z.string({ required_error: 'Class Name is required' }).min(1, 'Class Name is required'),
        subject: zod_1.z.string({ required_error: 'Subject is required' }).min(1, 'Subject is required'),
        studentCount: zod_1.z.number({ required_error: 'Student count is required' }).min(1, 'Student count must be at least 1'),
    }),
});
