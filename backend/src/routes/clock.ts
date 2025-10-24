import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getMyWeek,
  getPayPeriod,
  manualEntry,
  getLiveClockedIn
} from '../controllers/clockController';
import { authenticate, requireManager } from '../middleware/auth';

const router = Router();

// Tablet routes (no auth required, uses PIN)
router.post('/in', clockIn);
router.post('/out', clockOut);

// Employee routes (requires auth)
router.get('/my-week', authenticate, getMyWeek);
router.get('/pay-period', authenticate, getPayPeriod);

// Manager routes
router.post('/manual', authenticate, requireManager, manualEntry);
router.get('/live', authenticate, requireManager, getLiveClockedIn);

export default router;
