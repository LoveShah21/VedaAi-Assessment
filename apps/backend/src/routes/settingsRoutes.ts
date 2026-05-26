import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { validateRequest } from '../middlewares/validateRequest';
import { updateSettingsSchema } from '../validators/settingsValidator';

const router = Router();

router.get('/', getSettings);
router.put('/', validateRequest(updateSettingsSchema), updateSettings);

export default router;
