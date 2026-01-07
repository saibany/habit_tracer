import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listChallenges, joinChallenge, leaveChallenge, challengeLeaderboard, createChallenge, getChallengeHistory, getChallengeDetail } from '../controllers/challenge.controller';

const router = Router();

router.use(authenticate);

// List active/upcoming challenges
router.get('/', listChallenges);

// Challenge history (completed/failed)
router.get('/history', getChallengeHistory);

// Create personal challenge
router.post('/', createChallenge);

// Join/leave challenge
router.post('/:id/join', joinChallenge);
router.post('/:id/leave', leaveChallenge);

// Leaderboard
router.get('/:id/leaderboard', challengeLeaderboard);

// Single challenge detail
router.get('/:id', getChallengeDetail);

export default router;

