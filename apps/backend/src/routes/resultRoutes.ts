// apps/backend/src/routes/resultRoutes.ts
import { Router } from 'express';
import { getResultById, getResult, streamPdf } from '../controllers/resultController';

const router = Router();

router.get('/:id/pdf', streamPdf);
router.get('/:id', getResult); // standalone result fetch
router.get('/legacy/:id', getResultById); // legacy alias

export default router;
