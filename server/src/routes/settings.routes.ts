import { Router } from 'express';
import { getSettings, updateSettings, exportData, deleteAccount } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/export', exportData);
router.post('/delete-account', deleteAccount);

export default router;
