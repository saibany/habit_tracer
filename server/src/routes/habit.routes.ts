import { Router } from 'express';
import { getHabits, getHabit, createHabit, updateHabit, deleteHabit, logHabit, undoLog } from '../controllers/habit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getHabits);
router.get('/:id', getHabit);
router.post('/', createHabit);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/log', logHabit);
router.post('/:id/undo', undoLog);

export default router;
