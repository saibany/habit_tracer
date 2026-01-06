import { Router } from 'express';
import { getSettings, updateSettings, exportData, deleteAccount } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { sensitiveLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/export', sensitiveLimiter, exportData); // Rate limit data export
router.post('/delete-account', sensitiveLimiter, deleteAccount); // Rate limit account deletion

export default router;
