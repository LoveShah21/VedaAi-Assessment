"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        teacherName: zod_1.z.string().optional(),
        schoolName: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        board: zod_1.z.string().optional(),
        defaultTimeAllowed: zod_1.z.number().min(15).max(180).optional(),
        defaultDifficulty: zod_1.z.object({
            easy: zod_1.z.number().min(0).max(100),
            medium: zod_1.z.number().min(0).max(100),
            hard: zod_1.z.number().min(0).max(100),
        }).optional(),
        includeAnswerKeyDefault: zod_1.z.boolean().optional(),
    }),
});
