import { Router } from 'express';
import {
  getMe,
  updateMyPIN,
  getAllUsers,
  createUser,
  updateUser
} from '../controllers/userController';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth';

const router = Router();

// Employee routes
router.get('/me', authenticate, getMe);
router.put('/me/pin', authenticate, updateMyPIN);

// Manager routes
router.get('/', authenticate, requireManager, getAllUsers);
router.put('/:id', authenticate, requireManager, updateUser);

// Admin routes
router.post('/', authenticate, requireAdmin, createUser);

export default router;
