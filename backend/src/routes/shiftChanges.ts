import { Router } from 'express';
import {
  createShiftChangeRequest,
  getMyShiftChangeRequests,
  getPendingShiftChangeRequests,
  approveShiftChangeRequest,
  denyShiftChangeRequest
} from '../controllers/shiftChangeController';
import { authenticate, requireManager } from '../middleware/auth';

const router = Router();

// Employee routes
router.post('/', authenticate, createShiftChangeRequest);
router.get('/mine', authenticate, getMyShiftChangeRequests);

// Manager routes
router.get('/pending', authenticate, requireManager, getPendingShiftChangeRequests);
router.put('/:id/approve', authenticate, requireManager, approveShiftChangeRequest);
router.put('/:id/deny', authenticate, requireManager, denyShiftChangeRequest);

export default router;
