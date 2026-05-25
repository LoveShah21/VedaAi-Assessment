import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { validateRequest } from '../middlewares/validateRequest';
import { createAssignmentSchema } from '../validators/assignmentValidator';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  getAssignmentResult,
  regenerateAssignment,
} from '../controllers/assignmentController';

const router = Router();

router.get('/', getAssignments);
router.post('/', upload.single('file'), validateRequest(createAssignmentSchema), createAssignment);
router.get('/:id', getAssignmentById);
router.get('/:id/result', getAssignmentResult);
router.post('/:id/regenerate', regenerateAssignment);

export default router;
