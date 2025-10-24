import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ValidationError, NotFoundError, UnauthorizedError } from '../utils/errors';

export const getShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { startDate, endDate, status } = req.query;

    // Build where clause based on role
    const where: any = {};

    if (userRole === 'EMPLOYEE') {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (status) {
      where.status = status;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        timeEntries: {
          select: {
            id: true,
            clockInTime: true,
            clockOutTime: true,
            totalHours: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({ shifts });
  } catch (error) {
    next(error);
  }
};

export const getUpcoming = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const shifts = await prisma.shift.findMany({
      where: {
        userId,
        startTime: {
          gte: now,
          lte: nextWeek
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({ shifts });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, startTime, endTime, location, position } = req.body;
    const createdById = req.user?.userId;

    if (!createdById) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!userId || !startTime || !endTime) {
      throw new ValidationError('User ID, start time, and end time are required');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      throw new ValidationError('End time must be after start time');
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new NotFoundError('User not found or inactive');
    }

    // Check for overlapping shifts
    const overlapping = await prisma.shift.findFirst({
      where: {
        userId,
        status: { notIn: ['CANCELLED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } }
            ]
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } }
            ]
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      throw new ValidationError('Shift overlaps with existing shift');
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        startTime: start,
        endTime: end,
        location: location || null,
        position: position || null,
        createdById
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Shift created successfully',
      shift
    });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, location, position, status } = req.body;

    const shift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    const updateData: any = {};

    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (position !== undefined) updateData.position = position;
    if (status) updateData.status = status;

    if (updateData.startTime && updateData.endTime) {
      if (updateData.endTime <= updateData.startTime) {
        throw new ValidationError('End time must be after start time');
      }
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Shift updated successfully',
      shift: updatedShift
    });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        timeEntries: true
      }
    });

    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    if (shift.timeEntries.length > 0) {
      throw new ValidationError('Cannot delete shift with time entries. Cancel it instead.');
    }

    await prisma.shift.delete({
      where: { id }
    });

    res.json({
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shifts } = req.body;
    const createdById = req.user?.userId;

    if (!createdById) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!Array.isArray(shifts) || shifts.length === 0) {
      throw new ValidationError('Shifts array is required');
    }

    // Validate all shifts
    for (const shift of shifts) {
      if (!shift.userId || !shift.startTime || !shift.endTime) {
        throw new ValidationError('Each shift must have userId, startTime, and endTime');
      }
    }

    // Create shifts
    const createdShifts = await prisma.$transaction(
      shifts.map(shift =>
        prisma.shift.create({
          data: {
            userId: shift.userId,
            startTime: new Date(shift.startTime),
            endTime: new Date(shift.endTime),
            location: shift.location || null,
            position: shift.position || null,
            createdById
          }
        })
      )
    );

    res.status(201).json({
      message: `${createdShifts.length} shifts created successfully`,
      shifts: createdShifts
    });
  } catch (error) {
    next(error);
  }
};
