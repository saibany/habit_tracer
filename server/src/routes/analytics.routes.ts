import { Router } from 'express';
import { getSummary, getHeatmap, getCompletionStats, getStreakTrends, getXpProgression } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/heatmap', getHeatmap);
router.get('/completion', getCompletionStats);
router.get('/streaks', getStreakTrends);
router.get('/xp', getXpProgression);

export default router;
