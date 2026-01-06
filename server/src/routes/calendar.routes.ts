import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth';
import { validateUUID } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getEvents);
router.post('/', createEvent);
router.put('/:id', validateUUID('id'), updateEvent);
router.delete('/:id', validateUUID('id'), deleteEvent);

export default router;
