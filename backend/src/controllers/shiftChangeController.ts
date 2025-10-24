import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';

export const createShiftChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { originalShiftId, requestedStartTime, requestedEndTime, reason } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!originalShiftId || !requestedStartTime || !requestedEndTime) {
      throw new ValidationError('Original shift ID, requested start time, and requested end time are required');
    }

    // Verify the shift belongs to the user
    const shift = await prisma.shift.findUnique({
      where: { id: originalShiftId }
    });

    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    if (shift.userId !== userId) {
      throw new ValidationError('You can only request changes to your own shifts');
    }

    const reqStart = new Date(requestedStartTime);
    const reqEnd = new Date(requestedEndTime);

    if (reqEnd <= reqStart) {
      throw new ValidationError('Requested end time must be after start time');
    }

    // Check for existing pending requests for this shift
    const existingRequest = await prisma.shiftChangeRequest.findFirst({
      where: {
        originalShiftId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      throw new ValidationError('A pending change request already exists for this shift');
    }

    const shiftChangeRequest = await prisma.shiftChangeRequest.create({
      data: {
        userId,
        originalShiftId,
        requestedStartTime: reqStart,
        requestedEndTime: reqEnd,
        reason: reason || null
      },
      include: {
        originalShift: true
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
        type: 'SHIFT_CHANGE_REQUEST',
        message: `New shift change request from ${req.user?.email}`
      }))
    });

    res.status(201).json({
      message: 'Shift change request submitted successfully',
      shiftChangeRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getMyShiftChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const requests = await prisma.shiftChangeRequest.findMany({
      where: { userId },
      include: {
        originalShift: true,
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

export const getPendingShiftChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.shiftChangeRequest.findMany({
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
        },
        originalShift: true
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

export const approveShiftChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user?.userId;

    if (!managerId) {
      throw new UnauthorizedError('Authentication required');
    }

    const request = await prisma.shiftChangeRequest.findUnique({
      where: { id },
      include: {
        originalShift: true
      }
    });

    if (!request) {
      throw new NotFoundError('Shift change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('Request has already been reviewed');
    }

    // Update the request and the shift in a transaction
    const [updatedRequest] = await prisma.$transaction([
      prisma.shiftChangeRequest.update({
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
          },
          originalShift: true
        }
      }),
      prisma.shift.update({
        where: { id: request.originalShiftId },
        data: {
          startTime: request.requestedStartTime,
          endTime: request.requestedEndTime
        }
      })
    ]);

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'SHIFT_CHANGE_APPROVED',
        message: `Your shift change request has been approved`
      }
    });

    res.json({
      message: 'Shift change request approved and shift updated',
      shiftChangeRequest: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

export const denyShiftChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;
    const managerId = req.user?.userId;

    if (!managerId) {
      throw new UnauthorizedError('Authentication required');
    }

    const request = await prisma.shiftChangeRequest.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundError('Shift change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('Request has already been reviewed');
    }

    const updatedRequest = await prisma.shiftChangeRequest.update({
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
        },
        originalShift: true
      }
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'SHIFT_CHANGE_DENIED',
        message: `Your shift change request has been denied${managerNotes ? ': ' + managerNotes : ''}`
      }
    });

    res.json({
      message: 'Shift change request denied',
      shiftChangeRequest: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};
