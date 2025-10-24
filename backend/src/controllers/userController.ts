import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { validatePIN } from '../utils/pin';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        pin: true,
        pinChangedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateMyPIN = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { newPin } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!newPin) {
      throw new ValidationError('New PIN is required');
    }

    // Validate PIN
    const validation = validatePIN(newPin);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid PIN');
    }

    // Check if PIN is already in use
    const existingPin = await prisma.user.findFirst({
      where: {
        pin: newPin,
        id: { not: userId }
      }
    });

    if (existingPin) {
      throw new ValidationError('This PIN is already in use by another employee');
    }

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

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, status } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, role, pin } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Email, password, first name, and last name are required');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    // Validate PIN if provided
    if (pin) {
      const validation = validatePIN(pin);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid PIN');
      }

      // Check if PIN is already in use
      const existingPin = await prisma.user.findFirst({
        where: { pin }
      });

      if (existingPin) {
        throw new ValidationError('PIN already in use');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: role || 'EMPLOYEE',
        pin: pin || null,
        pinChangedAt: pin ? new Date() : null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, status, pin } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    if (pin !== undefined) {
      if (pin) {
        const validation = validatePIN(pin);
        if (!validation.valid) {
          throw new ValidationError(validation.error || 'Invalid PIN');
        }

        const existingPin = await prisma.user.findFirst({
          where: {
            pin,
            id: { not: id }
          }
        });

        if (existingPin) {
          throw new ValidationError('PIN already in use');
        }

        updateData.pin = pin;
        updateData.pinChangedAt = new Date();
      } else {
        updateData.pin = null;
        updateData.pinChangedAt = null;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        pin: true,
        pinChangedAt: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
