import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { getWeekRange } from '../utils/timeCalculations';

export const getWeeklyHours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      const range = getWeekRange();
      start = range.start;
      end = range.end;
    }

    // Get all time entries for the period
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        clockInTime: {
          gte: start,
          lte: end
        }
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
      }
    });

    // Group by user
    const userHours: { [key: string]: any } = {};

    timeEntries.forEach(entry => {
      const userId = entry.user.id;

      if (!userHours[userId]) {
        userHours[userId] = {
          user: entry.user,
          totalHours: 0,
          entries: []
        };
      }

      userHours[userId].totalHours += entry.totalHours || 0;
      userHours[userId].entries.push({
        id: entry.id,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime,
        totalHours: entry.totalHours
      });
    });

    const report = Object.values(userHours).sort((a, b) =>
      b.totalHours - a.totalHours
    );

    res.json({
      period: { start, end },
      employeeCount: report.length,
      totalHours: report.reduce((sum, emp) => sum + emp.totalHours, 0),
      employees: report
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit } = req.query;

    const where: any = {
      userId: id
    };

    if (startDate && endDate) {
      where.clockInTime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
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
      },
      take: limit ? parseInt(limit as string) : undefined
    });

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    res.json({
      user,
      totalHours,
      entryCount: timeEntries.length,
      entries: timeEntries
    });
  } catch (error) {
    next(error);
  }
};

export const getLaborCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, hourlyRate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const rate = hourlyRate ? parseFloat(hourlyRate as string) : 15; // Default $15/hr

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all time entries for the period
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        clockInTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // Calculate by user
    const userCosts: { [key: string]: any } = {};

    timeEntries.forEach(entry => {
      const userId = entry.user.id;
      const hours = entry.totalHours || 0;
      const cost = hours * rate;

      if (!userCosts[userId]) {
        userCosts[userId] = {
          user: entry.user,
          totalHours: 0,
          laborCost: 0,
          entryCount: 0
        };
      }

      userCosts[userId].totalHours += hours;
      userCosts[userId].laborCost += cost;
      userCosts[userId].entryCount += 1;
    });

    const report = Object.values(userCosts).sort((a, b) =>
      b.laborCost - a.laborCost
    );

    const totalHours = report.reduce((sum, emp) => sum + emp.totalHours, 0);
    const totalCost = report.reduce((sum, emp) => sum + emp.laborCost, 0);

    res.json({
      period: { start, end },
      hourlyRate: rate,
      totalHours,
      totalLaborCost: totalCost,
      employeeCount: report.length,
      employees: report
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    // Currently clocked in
    const clockedInCount = await prisma.timeEntry.count({
      where: {
        clockOutTime: null
      }
    });

    // Today's shifts
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayShifts = await prisma.shift.count({
      where: {
        startTime: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    // Pending requests
    const pendingTimeOff = await prisma.timeOffRequest.count({
      where: { status: 'PENDING' }
    });

    const pendingShiftChanges = await prisma.shiftChangeRequest.count({
      where: { status: 'PENDING' }
    });

    // This week's hours
    const weekRange = getWeekRange();
    const weekEntries = await prisma.timeEntry.findMany({
      where: {
        clockInTime: {
          gte: weekRange.start,
          lte: weekRange.end
        }
      }
    });

    const weekTotalHours = weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

    // Active employees
    const activeEmployees = await prisma.user.count({
      where: {
        status: 'ACTIVE',
        role: 'EMPLOYEE'
      }
    });

    res.json({
      currentlyClockedIn: clockedInCount,
      todayShiftsCount: todayShifts,
      pendingTimeOffRequests: pendingTimeOff,
      pendingShiftChangeRequests: pendingShiftChanges,
      weekTotalHours,
      activeEmployees
    });
  } catch (error) {
    next(error);
  }
};
