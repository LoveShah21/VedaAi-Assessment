import { Router } from 'express';
import { createGroup, getGroups, deleteGroup } from '../controllers/groupController';
import { validateRequest } from '../middlewares/validateRequest';
import { createGroupSchema } from '../validators/groupValidator';

const router = Router();

router.post('/', validateRequest(createGroupSchema), createGroup);
router.get('/', getGroups);
router.delete('/:id', deleteGroup);

export default router;
