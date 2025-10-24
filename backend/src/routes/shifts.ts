import { Router } from 'express';
import {
  getShifts,
  getUpcoming,
  createShift,
  updateShift,
  deleteShift,
  bulkCreateShifts
} from '../controllers/shiftController';
import { authenticate, requireManager } from '../middleware/auth';

const router = Router();

// Employee and Manager routes
router.get('/', authenticate, getShifts);
router.get('/upcoming', authenticate, getUpcoming);

// Manager only routes
router.post('/', authenticate, requireManager, createShift);
router.put('/:id', authenticate, requireManager, updateShift);
router.delete('/:id', authenticate, requireManager, deleteShift);
router.post('/bulk-create', authenticate, requireManager, bulkCreateShifts);

export default router;
