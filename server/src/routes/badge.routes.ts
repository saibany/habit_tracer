import { Router } from 'express';
import { getBadges, getRecentBadges, getBadgeDetail, getNextGoal } from '../controllers/badge.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// List all badges with user progress
router.get('/', getBadges);

// Get recently earned badges
router.get('/recent', getRecentBadges);

// Get next badges to earn (goal recommendation)
router.get('/next-goal', getNextGoal);

// Get single badge detail
router.get('/:id', getBadgeDetail);

export default router;

