import { Router } from 'express';
import {
  createTimeOffRequest,
  getMyTimeOffRequests,
  getPendingTimeOffRequests,
  approveTimeOffRequest,
  denyTimeOffRequest
} from '../controllers/timeOffController';
import { authenticate, requireManager } from '../middleware/auth';

const router = Router();

// Employee routes
router.post('/', authenticate, createTimeOffRequest);
router.get('/mine', authenticate, getMyTimeOffRequests);

// Manager routes
router.get('/pending', authenticate, requireManager, getPendingTimeOffRequests);
router.put('/:id/approve', authenticate, requireManager, approveTimeOffRequest);
router.put('/:id/deny', authenticate, requireManager, denyTimeOffRequest);

export default router;
