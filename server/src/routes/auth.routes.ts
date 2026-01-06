import { Router } from 'express';
import { register, login, logout, refreshAccessToken, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit';
import { checkLockout } from '../middleware/accountLockout';

const router = Router();

// Apply stricter rate limiting to auth endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, checkLockout, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, refreshAccessToken);
router.get('/me', authenticate, me);

export default router;
