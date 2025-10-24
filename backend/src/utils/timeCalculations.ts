export const calculateHours = (clockIn: Date, clockOut: Date): number => {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

export const getWeekRange = (date: Date = new Date()): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // End of week (Saturday)
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const getPayPeriodRange = (date: Date = new Date()): { start: Date; end: Date } => {
  // Assuming bi-weekly pay periods starting from a reference date
  // You can adjust this based on your company's pay period schedule
  const referenceDate = new Date('2024-01-01'); // Start of first pay period
  const daysSinceReference = Math.floor((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const payPeriodNumber = Math.floor(daysSinceReference / 14);

  const start = new Date(referenceDate);
  start.setDate(start.getDate() + (payPeriodNumber * 14));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isWithinShiftTime = (now: Date, shiftStart: Date, shiftEnd: Date): boolean => {
  // Allow clock-in 15 minutes before shift and clock-out up to 1 hour after
  const earlyClockInWindow = new Date(shiftStart.getTime() - 15 * 60 * 1000);
  const lateClockOutWindow = new Date(shiftEnd.getTime() + 60 * 60 * 1000);

  return now >= earlyClockInWindow && now <= lateClockOutWindow;
};
