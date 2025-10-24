import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';

export const createTimeOffRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate, type, reason } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!startDate || !endDate || !type) {
      throw new ValidationError('Start date, end date, and type are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new ValidationError('End date must be after or equal to start date');
    }

    // Check for overlapping time-off requests
    const overlapping = await prisma.timeOffRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      throw new ValidationError('Time-off request overlaps with existing request');
    }

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        userId,
        startDate: start,
        endDate: end,
        type,
        reason: reason || null
      }
    });

    // Create notification for managers
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'ADMIN'] },
        status: 'ACTIVE'
      }
    });

    await prisma.notification.createMany({
      data: managers.map(manager => ({
        userId: manager.id,
        type: 'TIME_OFF_REQUEST',
        message: `New time-off request from ${req.user?.email}`
      }))
    });

    res.status(201).json({
      message: 'Time-off request submitted successfully',
      timeOffRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTimeOffRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: { userId },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const getPendingTimeOffRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.timeOffRequest.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const approveTimeOffRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user?.userId;

    if (!managerId) {
      throw new UnauthorizedError('Authentication required');
    }

    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!request) {
      throw new NotFoundError('Time-off request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('Request has already been reviewed');
    }

    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: managerId,
        reviewedAt: new Date(),
        managerNotes: managerNotes || null
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'TIME_OFF_APPROVED',
        message: `Your time-off request has been approved`
      }
    });

    res.json({
      message: 'Time-off request approved',
      timeOffRequest: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

export const denyTimeOffRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user?.userId;

    if (!managerId) {
      throw new UnauthorizedError('Authentication required');
    }

    const request = await prisma.timeOffRequest.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundError('Time-off request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('Request has already been reviewed');
    }

    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'DENIED',
        reviewedBy: managerId,
        reviewedAt: new Date(),
        managerNotes: managerNotes || null
      },
      include: {
        reviewer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'TIME_OFF_DENIED',
        message: `Your time-off request has been denied${managerNotes ? ': ' + managerNotes : ''}`
      }
    });

    res.json({
      message: 'Time-off request denied',
      timeOffRequest: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};
