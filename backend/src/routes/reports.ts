import { Router } from 'express';
import {
  getWeeklyHours,
  getEmployeeHistory,
  getLaborCost,
  getDashboardStats
} from '../controllers/reportsController';
import { authenticate, requireManager } from '../middleware/auth';

const router = Router();

// All manager routes
router.get('/weekly-hours', authenticate, requireManager, getWeeklyHours);
router.get('/employee/:id/history', authenticate, requireManager, getEmployeeHistory);
router.get('/labor-cost', authenticate, requireManager, getLaborCost);
router.get('/dashboard-stats', authenticate, requireManager, getDashboardStats);

export default router;
