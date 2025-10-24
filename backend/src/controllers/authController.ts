import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const tabletVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      throw new ValidationError('PIN is required');
    }

    // Find user by PIN
    const user = await prisma.user.findFirst({
      where: {
        pin: pin,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        pin: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid PIN or inactive account');
    }

    // For tablet, we return limited user info (no token needed for quick verification)
    res.json({
      verified: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(newPayload);
    const refreshToken = generateRefreshToken(newPayload);

    res.json({
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const updatePIN = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPin } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!newPin) {
      throw new ValidationError('New PIN is required');
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new ValidationError('PIN must be 4-6 digits');
    }

    // Check if PIN is already in use
    const existingPin = await prisma.user.findFirst({
      where: {
        pin: newPin,
        id: { not: userId }
      }
    });

    if (existingPin) {
      throw new ValidationError('This PIN is already in use');
    }

    // Update user PIN
    await prisma.user.update({
      where: { id: userId },
      data: {
        pin: newPin,
        pinChangedAt: new Date()
      }
    });

    res.json({
      message: 'PIN updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
