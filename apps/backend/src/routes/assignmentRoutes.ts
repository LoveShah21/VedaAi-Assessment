// apps/backend/src/routes/assignmentRoutes.ts
import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { validateRequest } from '../middlewares/validateRequest';
import { createAssignmentSchema } from '../validators/assignmentValidator';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  getAssignmentResult,
  getAssignmentStatus,
  regenerateAssignment,
  deleteAssignment,
  duplicateAssignment,
  getAssignmentStats,
  downloadAssignmentPDF,
  deleteAllAssignments,
  getResultByVersion,
} from '../controllers/assignmentController';

const router = Router();

router.get('/', getAssignments);
router.get('/stats/summary', getAssignmentStats);
router.post('/', upload.single('file'), validateRequest(createAssignmentSchema), createAssignment);

// Danger zone: delete all assignments
router.delete('/all', deleteAllAssignments);

// A1: status route BEFORE /:id to avoid route collision
router.get('/:id/status', getAssignmentStatus);
router.get('/:id/result', getAssignmentResult);
router.get('/:id/results', getResultByVersion); // plural alias
router.get('/:id/download', downloadAssignmentPDF);
// A6: /pdf alias alongside /download
router.get('/:id/pdf', downloadAssignmentPDF);
router.post('/:id/regenerate', regenerateAssignment);
router.delete('/:id', deleteAssignment);
router.post('/:id/duplicate', duplicateAssignment);
router.get('/:id', getAssignmentById);

export default router;
