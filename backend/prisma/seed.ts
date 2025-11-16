import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pushpoint.com' },
    update: {},
    create: {
      email: 'admin@pushpoint.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      pin: '9999'
    }
  });
  console.log('✅ Created admin user');

  // Create Manager User
  const manager = await prisma.user.upsert({
    where: { email: 'manager@pushpoint.com' },
    update: {},
    create: {
      email: 'manager@pushpoint.com',
      passwordHash: await bcrypt.hash('manager123', 10),
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
      status: 'ACTIVE',
      pin: '8888'
    }
  });
  console.log('✅ Created manager user');

  // Create 5 Employee Users
  const employees: User[] = [];
  const employeeData = [
    { email: 'john.doe@pushpoint.com', firstName: 'John', lastName: 'Doe', pin: '1111' },
    { email: 'jane.smith@pushpoint.com', firstName: 'Jane', lastName: 'Smith', pin: '2222' },
    { email: 'mike.wilson@pushpoint.com', firstName: 'Mike', lastName: 'Wilson', pin: '3333' },
    { email: 'emily.brown@pushpoint.com', firstName: 'Emily', lastName: 'Brown', pin: '4444' },
    { email: 'david.lee@pushpoint.com', firstName: 'David', lastName: 'Lee', pin: '5555' }
  ];

  for (const emp of employeeData) {
    const employee = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        passwordHash: await bcrypt.hash('password123', 10),
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        pin: emp.pin,
        pinChangedAt: new Date()
      }
    });
    employees.push(employee);
  }
  console.log('✅ Created 5 employee users');

  // Create shifts for the next 2 weeks
  const now = new Date();
  const shifts = [];

  for (let day = 0; day < 14; day++) {
    for (const employee of employees) {
      const shiftDate = new Date(now);
      shiftDate.setDate(now.getDate() + day);
      shiftDate.setHours(9, 0, 0, 0); // 9 AM start

      const endTime = new Date(shiftDate);
      endTime.setHours(17, 0, 0, 0); // 5 PM end

      const shift = await prisma.shift.create({
        data: {
          userId: employee.id,
          startTime: shiftDate,
          endTime: endTime,
          location: 'Main Office',
          position: 'Sales Associate',
          status: day < 7 ? 'SCHEDULED' : 'SCHEDULED',
          createdById: manager.id
        }
      });
      shifts.push(shift);
    }
  }
  console.log(`✅ Created ${shifts.length} shifts (2 weeks)`);

  // Create some completed time entries for past week
  const pastWeekStart = new Date(now);
  pastWeekStart.setDate(now.getDate() - 7);

  for (let day = 0; day < 5; day++) {
    for (let i = 0; i < 3; i++) {
      const employee = employees[i];
      const clockInDate = new Date(pastWeekStart);
      clockInDate.setDate(pastWeekStart.getDate() + day);
      clockInDate.setHours(9, 5, 0, 0);

      const clockOutDate = new Date(clockInDate);
      clockOutDate.setHours(17, 2, 0, 0);

      const totalHours = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);

      // Find or create a shift for this time
      const shiftDate = new Date(clockInDate);
      shiftDate.setHours(9, 0, 0, 0);
      const shiftEndDate = new Date(shiftDate);
      shiftEndDate.setHours(17, 0, 0, 0);

      let shift = await prisma.shift.findFirst({
        where: {
          userId: employee.id,
          startTime: {
            gte: shiftDate,
            lt: new Date(shiftDate.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!shift) {
        shift = await prisma.shift.create({
          data: {
            userId: employee.id,
            startTime: shiftDate,
            endTime: shiftEndDate,
            location: 'Main Office',
            position: 'Sales Associate',
            status: 'COMPLETED',
            createdById: manager.id
          }
        });
      }

      await prisma.timeEntry.create({
        data: {
          userId: employee.id,
          shiftId: shift.id,
          clockInTime: clockInDate,
          clockOutTime: clockOutDate,
          totalHours: Math.round(totalHours * 100) / 100,
          tabletId: 'TABLET-001',
          tabletLocation: 'Main Office Entrance'
        }
      });
    }
  }
  console.log('✅ Created time entries for past week');

  // Create sample time-off requests
  const futureDate1 = new Date(now);
  futureDate1.setDate(now.getDate() + 10);
  const futureDate2 = new Date(futureDate1);
  futureDate2.setDate(futureDate1.getDate() + 2);

  await prisma.timeOffRequest.create({
    data: {
      userId: employees[0].id,
      startDate: futureDate1,
      endDate: futureDate2,
      type: 'VACATION',
      reason: 'Family vacation',
      status: 'PENDING'
    }
  });

  const futureDate3 = new Date(now);
  futureDate3.setDate(now.getDate() + 15);

  await prisma.timeOffRequest.create({
    data: {
      userId: employees[1].id,
      startDate: futureDate3,
      endDate: futureDate3,
      type: 'SICK',
      reason: 'Doctor appointment',
      status: 'PENDING'
    }
  });

  await prisma.timeOffRequest.create({
    data: {
      userId: employees[2].id,
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      type: 'PERSONAL',
      reason: 'Personal matter',
      status: 'APPROVED',
      reviewedBy: manager.id,
      reviewedAt: new Date()
    }
  });

  console.log('✅ Created sample time-off requests');

  // Create sample shift change requests
  const futureShift = shifts.find(s => s.userId === employees[0].id && new Date(s.startTime) > now);

  if (futureShift) {
    const newStartTime = new Date(futureShift.startTime);
    newStartTime.setHours(10, 0, 0, 0);
    const newEndTime = new Date(futureShift.endTime);
    newEndTime.setHours(18, 0, 0, 0);

    await prisma.shiftChangeRequest.create({
      data: {
        userId: employees[0].id,
        originalShiftId: futureShift.id,
        requestedStartTime: newStartTime,
        requestedEndTime: newEndTime,
        reason: 'Need to start later due to school',
        status: 'PENDING'
      }
    });
    console.log('✅ Created sample shift change request');
  }

  // Create some notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        type: 'TIME_OFF_REQUEST',
        message: 'New time-off request from John Doe',
        read: false
      },
      {
        userId: employees[0].id,
        type: 'SHIFT_ASSIGNED',
        message: 'You have been assigned a new shift',
        read: false
      }
    ]
  });
  console.log('✅ Created notifications');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:   admin@pushpoint.com / admin123 (PIN: 9999)');
  console.log('Manager: manager@pushpoint.com / manager123 (PIN: 8888)');
  console.log('\nEmployees (password: password123):');
  console.log('  - john.doe@pushpoint.com (PIN: 1111)');
  console.log('  - jane.smith@pushpoint.com (PIN: 2222)');
  console.log('  - mike.wilson@pushpoint.com (PIN: 3333)');
  console.log('  - emily.brown@pushpoint.com (PIN: 4444)');
  console.log('  - david.lee@pushpoint.com (PIN: 5555)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
