# PushPoint - Time Clock Management System

A comprehensive workplace time tracking system with three interfaces: fixed workplace tablet kiosk, employee mobile app, and manager web dashboard.

## System Overview

### Three Interfaces

1. **Workplace Tablet (React Native Kiosk)**
   - Fixed device at workplace entrance
   - Employees clock in/out using 4-6 digit PIN
   - Large touch-friendly interface
   - No GPS tracking (tablet location = workplace)
   - Auto-returns to welcome screen

2. **Employee Mobile App (React Native - iOS/Android)**
   - View upcoming shifts and schedule
   - View time reports (weekly, pay period totals)
   - Submit time-off requests
   - Submit shift change requests
   - Receive push notifications
   - **Cannot clock in/out** (tablet only)

3. **Manager Web Dashboard (React - Desktop Browser)**
   - Schedule builder with drag-drop
   - Employee management
   - Approve/deny time-off requests
   - Approve/deny shift change requests
   - Live view of who's clocked in
   - Reports and analytics
   - Manual time entry corrections

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **JWT** authentication
- **bcryptjs** for password hashing

### Database Models
- User (with PIN, role, status)
- Shift
- TimeEntry (with tablet tracking)
- TimeOffRequest
- ShiftChangeRequest
- Notification

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Generate Prisma Client
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pushpoint?schema=public"
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with test data
npm run prisma:seed

# Start development server
npm run dev
```

Server runs on http://localhost:5000

### Test Credentials

**Admin**: admin@pushpoint.com / admin123 (PIN: 9999)
**Manager**: manager@pushpoint.com / manager123 (PIN: 8888)
**Employees** (password: password123):
- john.doe@pushpoint.com (PIN: 1111)
- jane.smith@pushpoint.com (PIN: 2222)
- mike.wilson@pushpoint.com (PIN: 3333)
- emily.brown@pushpoint.com (PIN: 4444)
- david.lee@pushpoint.com (PIN: 5555)

## API Documentation

See [API_TESTING_GUIDE.md](/backend/API_TESTING_GUIDE.md) for complete endpoint documentation.

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Email/password login (mobile/web)
- `POST /api/auth/tablet-verify` - PIN verification (tablet)
- `POST /api/auth/refresh-token` - Refresh JWT

#### Clock In/Out (Tablet)
- `POST /api/clock/in` - Clock in with PIN
- `POST /api/clock/out` - Clock out with PIN

#### Time Tracking (Employee)
- `GET /api/clock/my-week` - Current week hours
- `GET /api/clock/pay-period` - Pay period totals

#### Shifts
- `GET /api/shifts` - Get shifts (employee sees theirs, manager sees all)
- `GET /api/shifts/upcoming` - Next 7 days
- `POST /api/shifts` - Create shift (manager)
- `POST /api/shifts/bulk-create` - Bulk create (manager)

#### Requests
- `POST /api/time-off-requests` - Submit time-off
- `POST /api/shift-change-requests` - Request shift change
- `PUT /api/time-off-requests/:id/approve` - Approve (manager)
- `PUT /api/shift-change-requests/:id/deny` - Deny (manager)

#### Reports (Manager)
- `GET /api/reports/weekly-hours` - Weekly hours by employee
- `GET /api/reports/employee/:id/history` - Employee time history
- `GET /api/reports/labor-cost` - Labor cost calculations
- `GET /api/reports/dashboard-stats` - Real-time dashboard stats

## Features

### Tablet Kiosk
✅ PIN-based clock in/out (no authentication needed)
✅ Prevent double clock-in
✅ Automatic shift detection
✅ Tablet ID and location tracking
✅ Large, touch-friendly UI
✅ Instant feedback (success/error messages)

### Employee Mobile App
✅ View upcoming shifts
✅ View weekly/pay period hours
✅ Submit time-off requests (vacation/sick/personal)
✅ Submit shift change requests
✅ View request status
✅ Push notifications
❌ Cannot clock in/out (enforced at API level)

### Manager Dashboard
✅ Real-time "who's clocked in" view
✅ Create/edit/delete shifts
✅ Bulk shift creation
✅ Approve/deny time-off requests
✅ Approve/deny shift change requests
✅ Manual time entry corrections
✅ Weekly hours reports
✅ Employee time history
✅ Labor cost calculations
✅ Dashboard analytics

## Security Features

### PIN Validation
- 4-6 digits only
- Rejects weak PINs (1234, 0000, etc.)
- Rejects sequential PINs (12345, 54321)
- Must be unique across all users

### Authentication
- JWT tokens for mobile/web
- Role-based access control (EMPLOYEE, MANAGER, ADMIN)
- Bcrypt password hashing
- Refresh token support

### Business Logic Protection
- Can only clock in with scheduled shift
- Clock-in window: 15 minutes before shift start
- Clock-out window: up to 1 hour after shift end
- Prevents overlapping shifts
- Audit trail for manual corrections

## Database Schema

```
User
├── id, email, passwordHash
├── firstName, lastName, phone
├── role (EMPLOYEE | MANAGER | ADMIN)
├── status (ACTIVE | INACTIVE)
├── pin (unique, 4-6 digits)
└── pinChangedAt

Shift
├── id, userId, createdById
├── startTime, endTime
├── location, position
└── status (SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED)

TimeEntry
├── id, userId, shiftId
├── clockInTime, clockOutTime
├── tabletId, tabletLocation
├── totalHours (auto-calculated)
├── manualEntry, manualEntryBy, manualEntryNote
└── timestamps

TimeOffRequest
├── id, userId
├── startDate, endDate
├── type (VACATION | SICK | PERSONAL)
├── status (PENDING | APPROVED | DENIED)
├── reviewedBy, reviewedAt, managerNotes
└── timestamps

ShiftChangeRequest
├── id, userId, originalShiftId
├── requestedStartTime, requestedEndTime
├── reason, status
├── reviewedBy, reviewedAt, managerNotes
└── timestamps

Notification
├── id, userId
├── type, message
└── read (boolean)
```

## Project Structure

```
PushPoint/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, error handling
│   │   ├── utils/            # JWT, PIN validation, helpers
│   │   └── index.ts          # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── seed.ts           # Test data
│   │   └── migrations/       # Database migrations
│   ├── .env                  # Environment variables
│   └── package.json
│
├── mobile/                   # React Native app (to be implemented)
│   └── (Expo React Native scaffold)
│
└── README.md                 # This file
```

## Development Workflow

### Run Development Server
```bash
cd backend
npm run dev
```

### View Database
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma migrate reset
# Drops DB, runs migrations, re-seeds
```

### Run Migrations
```bash
npx prisma migrate dev --name migration_name
```

## Testing

Test the API using the provided test credentials and the examples in [API_TESTING_GUIDE.md](/backend/API_TESTING_GUIDE.md).

### Example: Tablet Clock-In Flow
```bash
# 1. Verify PIN
curl -X POST http://localhost:5000/api/auth/tablet-verify \
  -H "Content-Type: application/json" \
  -d '{"pin":"1111"}'

# 2. Clock in
curl -X POST http://localhost:5000/api/clock/in \
  -H "Content-Type: application/json" \
  -d '{
    "pin":"1111",
    "tabletId":"TABLET-001",
    "tabletLocation":"Main Office Entrance"
  }'

# 3. Clock out
curl -X POST http://localhost:5000/api/clock/out \
  -H "Content-Type: application/json" \
  -d '{"pin":"1111","tabletId":"TABLET-001"}'
```

## Next Steps

### Tablet Kiosk UI (React Native)
- [ ] Build PIN entry interface
- [ ] Large touch buttons
- [ ] Success/error animations
- [ ] Auto-return to welcome screen

### Employee Mobile App (React Native)
- [ ] Login screen
- [ ] Shift calendar view
- [ ] Time report screens
- [ ] Request submission forms
- [ ] Push notification setup

### Manager Web Dashboard (React)
- [ ] Login screen
- [ ] Live dashboard with stats
- [ ] Schedule builder (drag-drop)
- [ ] Request approval interface
- [ ] Reports and charts
- [ ] Employee management

## License

MIT

## Support

For issues or questions, open an issue on GitHub.
