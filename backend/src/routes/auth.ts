import { Router } from 'express';
import { login, tabletVerify, refreshToken, updatePIN } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/tablet-verify', tabletVerify);
router.post('/refresh-token', refreshToken);
router.put('/pin', authenticate, updatePIN);

export default router;
