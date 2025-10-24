import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { calculateHours } from '../utils/timeCalculations';

export const clockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, tabletId, tabletLocation } = req.body;

    if (!pin) {
      throw new ValidationError('PIN is required');
    }

    if (!tabletId) {
      throw new ValidationError('Tablet ID is required');
    }

    // Find user by PIN
    const user = await prisma.user.findFirst({
      where: {
        pin: pin,
        status: 'ACTIVE'
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid PIN or inactive account');
    }

    // Check if user is already clocked in
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOutTime: null
      }
    });

    if (existingEntry) {
      throw new ConflictError('You are already clocked in');
    }

    // Find current or upcoming shift for the user
    const now = new Date();
    const shift = await prisma.shift.findFirst({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startTime: {
          lte: new Date(now.getTime() + 15 * 60 * 1000) // Within 15 minutes of start
        },
        endTime: {
          gte: now
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (!shift) {
      throw new NotFoundError('No scheduled shift found for this time');
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: user.id,
        shiftId: shift.id,
        clockInTime: now,
        tabletId,
        tabletLocation: tabletLocation || null
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        shift: {
          select: {
            startTime: true,
            endTime: true,
            position: true,
            location: true
          }
        }
      }
    });

    // Update shift status to IN_PROGRESS
    await prisma.shift.update({
      where: { id: shift.id },
      data: { status: 'IN_PROGRESS' }
    });

    res.json({
      message: 'Clocked in successfully',
      timeEntry: {
        id: timeEntry.id,
        clockInTime: timeEntry.clockInTime,
        user: timeEntry.user,
        shift: timeEntry.shift
      }
    });
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, tabletId } = req.body;

    if (!pin) {
      throw new ValidationError('PIN is required');
    }

    // Find user by PIN
    const user = await prisma.user.findFirst({
      where: {
        pin: pin,
        status: 'ACTIVE'
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid PIN or inactive account');
    }

    // Find active time entry
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOutTime: null
      },
      include: {
        shift: true
      }
    });

    if (!timeEntry) {
      throw new NotFoundError('No active clock-in found');
    }

    const clockOutTime = new Date();
    const totalHours = calculateHours(timeEntry.clockInTime, clockOutTime);

    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: {
        clockOutTime,
        totalHours
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        shift: {
          select: {
            startTime: true,
            endTime: true,
            position: true
          }
        }
      }
    });

    // Update shift status to COMPLETED
    await prisma.shift.update({
      where: { id: timeEntry.shiftId },
      data: { status: 'COMPLETED' }
    });

    res.json({
      message: 'Clocked out successfully',
      timeEntry: {
        id: updatedEntry.id,
        clockInTime: updatedEntry.clockInTime,
        clockOutTime: updatedEntry.clockOutTime,
        totalHours: updatedEntry.totalHours,
        user: updatedEntry.user,
        shift: updatedEntry.shift
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get current week's time entries
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        clockInTime: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      include: {
        shift: {
          select: {
            startTime: true,
            endTime: true,
            position: true,
            location: true
          }
        }
      },
      orderBy: {
        clockInTime: 'desc'
      }
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

    res.json({
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
      totalHours,
      entries: timeEntries
    });
  } catch (error) {
    next(error);
  }
};

export const getPayPeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get current pay period (bi-weekly, adjust as needed)
    const now = new Date();
    const referenceDate = new Date('2024-01-01');
    const daysSince = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    const payPeriodNum = Math.floor(daysSince / 14);

    const periodStart = new Date(referenceDate);
    periodStart.setDate(referenceDate.getDate() + (payPeriodNum * 14));
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 13);
    periodEnd.setHours(23, 59, 59, 999);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        clockInTime: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        shift: {
          select: {
            startTime: true,
            endTime: true,
            position: true
          }
        }
      },
      orderBy: {
        clockInTime: 'desc'
      }
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

    res.json({
      periodStart,
      periodEnd,
      totalHours,
      entries: timeEntries
    });
  } catch (error) {
    next(error);
  }
};

export const manualEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, shiftId, clockInTime, clockOutTime, note } = req.body;
    const managerId = req.user?.userId;

    if (!managerId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!userId || !shiftId || !clockInTime || !clockOutTime) {
      throw new ValidationError('User ID, shift ID, clock in time, and clock out time are required');
    }

    const clockIn = new Date(clockInTime);
    const clockOut = new Date(clockOutTime);

    if (clockOut <= clockIn) {
      throw new ValidationError('Clock out time must be after clock in time');
    }

    const totalHours = calculateHours(clockIn, clockOut);

    // Create manual time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId,
        shiftId,
        clockInTime: clockIn,
        clockOutTime: clockOut,
        totalHours,
        manualEntry: true,
        manualEntryBy: managerId,
        manualEntryNote: note || null
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        shift: true
      }
    });

    res.json({
      message: 'Manual time entry created successfully',
      timeEntry
    });
  } catch (error) {
    next(error);
  }
};

export const getLiveClockedIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all currently clocked in employees
    const clockedIn = await prisma.timeEntry.findMany({
      where: {
        clockOutTime: null
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
        shift: {
          select: {
            position: true,
            location: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: {
        clockInTime: 'asc'
      }
    });

    res.json({
      count: clockedIn.length,
      employees: clockedIn
    });
  } catch (error) {
    next(error);
  }
};
