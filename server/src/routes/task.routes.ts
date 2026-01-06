import { Router } from 'express';
import { getTasks, getTask, createTask, updateTask, deleteTask, completeTask } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { validateUUID } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getTasks);
router.get('/:id', validateUUID('id'), getTask);
router.post('/', createTask);
router.put('/:id', validateUUID('id'), updateTask);
router.delete('/:id', validateUUID('id'), deleteTask);
router.post('/:id/complete', validateUUID('id'), completeTask);

export default router;
