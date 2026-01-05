import { Router } from 'express';
import { register, login, logout, refreshAccessToken, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshAccessToken);
router.get('/me', authenticate, me);

export default router;
