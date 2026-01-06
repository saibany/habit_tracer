import { Router } from 'express';
import { getHabits, getHabit, createHabit, updateHabit, deleteHabit, logHabit, undoLog } from '../controllers/habit.controller';
import { authenticate } from '../middleware/auth';
import { validateUUID } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getHabits);
router.get('/:id', validateUUID('id'), getHabit);
router.post('/', createHabit);
router.put('/:id', validateUUID('id'), updateHabit);
router.delete('/:id', validateUUID('id'), deleteHabit);
router.post('/:id/log', validateUUID('id'), logHabit);
router.post('/:id/undo', validateUUID('id'), undoLog);

export default router;
