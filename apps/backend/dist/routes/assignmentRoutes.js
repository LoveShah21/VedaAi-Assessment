"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/backend/src/routes/assignmentRoutes.ts
const express_1 = require("express");
const upload_1 = require("../middlewares/upload");
const validateRequest_1 = require("../middlewares/validateRequest");
const assignmentValidator_1 = require("../validators/assignmentValidator");
const assignmentController_1 = require("../controllers/assignmentController");
const router = (0, express_1.Router)();
router.get('/', assignmentController_1.getAssignments);
router.get('/stats/summary', assignmentController_1.getAssignmentStats);
router.post('/', upload_1.upload.single('file'), (0, validateRequest_1.validateRequest)(assignmentValidator_1.createAssignmentSchema), assignmentController_1.createAssignment);
// Danger zone: delete all assignments
router.delete('/all', assignmentController_1.deleteAllAssignments);
// A1: status route BEFORE /:id to avoid route collision
router.get('/:id/status', assignmentController_1.getAssignmentStatus);
router.get('/:id/result', assignmentController_1.getAssignmentResult);
router.get('/:id/results', assignmentController_1.getResultByVersion); // plural alias
router.get('/:id/download', assignmentController_1.downloadAssignmentPDF);
// A6: /pdf alias alongside /download
router.get('/:id/pdf', assignmentController_1.downloadAssignmentPDF);
router.post('/:id/regenerate', assignmentController_1.regenerateAssignment);
router.delete('/:id', assignmentController_1.deleteAssignment);
router.post('/:id/duplicate', assignmentController_1.duplicateAssignment);
router.get('/:id', assignmentController_1.getAssignmentById);
exports.default = router;
