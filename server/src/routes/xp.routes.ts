import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getXpBreakdown, getXpHistory, getLevelInfo } from '../controllers/xp.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// XP breakdown - today, week, by source
router.get('/breakdown', getXpBreakdown);

// XP history timeline
router.get('/history', getXpHistory);

// Level info with curve
router.get('/level', getLevelInfo);

export default router;
