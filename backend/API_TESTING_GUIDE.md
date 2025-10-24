# PushPoint API Testing Guide

## Quick Start

### 1. Setup Database

Make sure PostgreSQL is running, then:

```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pushpoint?schema=public"

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed
```

### 2. Start the Server

```bash
npm run dev
```

Server will run on http://localhost:5000

---

## Test Credentials

### Admin
- **Email**: admin@pushpoint.com
- **Password**: admin123
- **PIN**: 9999

### Manager
- **Email**: manager@pushpoint.com
- **Password**: manager123
- **PIN**: 8888

### Employees (password: password123)
- john.doe@pushpoint.com (PIN: 1111)
- jane.smith@pushpoint.com (PIN: 2222)
- mike.wilson@pushpoint.com (PIN: 3333)
- emily.brown@pushpoint.com (PIN: 4444)
- david.lee@pushpoint.com (PIN: 5555)

---

## API Endpoints

### Authentication

#### Login (Mobile/Web)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@pushpoint.com",
  "password": "password123"
}

# Response:
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { ... }
}
```

#### Tablet PIN Verification
```bash
POST /api/auth/tablet-verify
Content-Type: application/json

{
  "pin": "1111"
}

# Response:
{
  "verified": true,
  "user": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Refresh Token
```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Update PIN
```bash
PUT /api/auth/pin
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "newPin": "6789"
}
```

---

### Clock In/Out (Tablet)

#### Clock In
```bash
POST /api/clock/in
Content-Type: application/json

{
  "pin": "1111",
  "tabletId": "TABLET-001",
  "tabletLocation": "Main Office Entrance"
}

# Response:
{
  "message": "Clocked in successfully",
  "timeEntry": { ... }
}
```

#### Clock Out
```bash
POST /api/clock/out
Content-Type: application/json

{
  "pin": "1111",
  "tabletId": "TABLET-001"
}

# Response:
{
  "message": "Clocked out successfully",
  "timeEntry": {
    "clockInTime": "...",
    "clockOutTime": "...",
    "totalHours": 8.05
  }
}
```

---

### Time Entries (Employee Mobile App)

#### Get My Week
```bash
GET /api/clock/my-week
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "weekStart": "...",
  "weekEnd": "...",
  "totalHours": 40.25,
  "entries": [ ... ]
}
```

#### Get Pay Period
```bash
GET /api/clock/pay-period
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "periodStart": "...",
  "periodEnd": "...",
  "totalHours": 80.5,
  "entries": [ ... ]
}
```

---

### Shifts

#### Get My Shifts (Employee)
```bash
GET /api/shifts
Authorization: Bearer YOUR_TOKEN

# Optional query params:
# ?startDate=2025-01-01&endDate=2025-01-31
# ?status=SCHEDULED
```

#### Get All Shifts (Manager)
```bash
GET /api/shifts
Authorization: Bearer MANAGER_TOKEN

# Returns all employees' shifts
```

#### Get Upcoming Shifts
```bash
GET /api/shifts/upcoming
Authorization: Bearer YOUR_TOKEN

# Returns next 7 days of shifts
```

#### Create Shift (Manager Only)
```bash
POST /api/shifts
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "userId": "employee_id",
  "startTime": "2025-10-25T09:00:00Z",
  "endTime": "2025-10-25T17:00:00Z",
  "location": "Main Office",
  "position": "Sales Associate"
}
```

#### Bulk Create Shifts (Manager Only)
```bash
POST /api/shifts/bulk-create
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "shifts": [
    {
      "userId": "employee_id_1",
      "startTime": "2025-10-25T09:00:00Z",
      "endTime": "2025-10-25T17:00:00Z",
      "location": "Main Office",
      "position": "Sales Associate"
    },
    {
      "userId": "employee_id_2",
      "startTime": "2025-10-25T09:00:00Z",
      "endTime": "2025-10-25T17:00:00Z",
      "location": "Main Office",
      "position": "Cashier"
    }
  ]
}
```

#### Update Shift (Manager Only)
```bash
PUT /api/shifts/:id
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "startTime": "2025-10-25T10:00:00Z",
  "status": "CANCELLED"
}
```

#### Delete Shift (Manager Only)
```bash
DELETE /api/shifts/:id
Authorization: Bearer MANAGER_TOKEN
```

---

### Time-Off Requests

#### Create Time-Off Request (Employee)
```bash
POST /api/time-off-requests
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "startDate": "2025-11-01",
  "endDate": "2025-11-03",
  "type": "VACATION",
  "reason": "Family vacation"
}

# type options: VACATION, SICK, PERSONAL
```

#### Get My Time-Off Requests
```bash
GET /api/time-off-requests/mine
Authorization: Bearer YOUR_TOKEN
```

#### Get Pending Requests (Manager)
```bash
GET /api/time-off-requests/pending
Authorization: Bearer MANAGER_TOKEN
```

#### Approve Request (Manager)
```bash
PUT /api/time-off-requests/:id/approve
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "managerNotes": "Approved - enjoy your vacation"
}
```

#### Deny Request (Manager)
```bash
PUT /api/time-off-requests/:id/deny
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "managerNotes": "We're short-staffed that week"
}
```

---

### Shift Change Requests

#### Create Shift Change Request (Employee)
```bash
POST /api/shift-change-requests
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "originalShiftId": "shift_id",
  "requestedStartTime": "2025-10-25T10:00:00Z",
  "requestedEndTime": "2025-10-25T18:00:00Z",
  "reason": "Need to start later due to school"
}
```

#### Get My Shift Change Requests
```bash
GET /api/shift-change-requests/mine
Authorization: Bearer YOUR_TOKEN
```

#### Get Pending Requests (Manager)
```bash
GET /api/shift-change-requests/pending
Authorization: Bearer MANAGER_TOKEN
```

#### Approve Request (Manager)
```bash
PUT /api/shift-change-requests/:id/approve
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "managerNotes": "Approved"
}

# This automatically updates the original shift
```

#### Deny Request (Manager)
```bash
PUT /api/shift-change-requests/:id/deny
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "managerNotes": "Cannot accommodate"
}
```

---

### User Management

#### Get My Profile
```bash
GET /api/users/me
Authorization: Bearer YOUR_TOKEN
```

#### Update My PIN
```bash
PUT /api/users/me/pin
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "newPin": "6789"
}
```

#### Get All Users (Manager)
```bash
GET /api/users
Authorization: Bearer MANAGER_TOKEN

# Optional query params:
# ?role=EMPLOYEE
# ?status=ACTIVE
```

#### Create User (Admin Only)
```bash
POST /api/users
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "email": "new.employee@pushpoint.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "Employee",
  "phone": "555-1234",
  "role": "EMPLOYEE",
  "pin": "7777"
}
```

#### Update User (Manager)
```bash
PUT /api/users/:id
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "firstName": "Updated",
  "status": "INACTIVE",
  "pin": "8888"
}
```

---

### Reports (Manager Only)

#### Weekly Hours Report
```bash
GET /api/reports/weekly-hours
Authorization: Bearer MANAGER_TOKEN

# Optional query params:
# ?startDate=2025-10-20&endDate=2025-10-26

# Response:
{
  "period": { "start": "...", "end": "..." },
  "employeeCount": 5,
  "totalHours": 200.5,
  "employees": [
    {
      "user": { "firstName": "John", "lastName": "Doe" },
      "totalHours": 40.5,
      "entries": [ ... ]
    }
  ]
}
```

#### Employee History
```bash
GET /api/reports/employee/:id/history
Authorization: Bearer MANAGER_TOKEN

# Optional query params:
# ?startDate=2025-10-01&endDate=2025-10-31
# ?limit=50

# Response:
{
  "user": { ... },
  "totalHours": 160.25,
  "entryCount": 20,
  "entries": [ ... ]
}
```

#### Labor Cost Report
```bash
GET /api/reports/labor-cost
Authorization: Bearer MANAGER_TOKEN

# Required query params:
# ?startDate=2025-10-01&endDate=2025-10-31&hourlyRate=15

# Response:
{
  "period": { ... },
  "hourlyRate": 15,
  "totalHours": 200,
  "totalLaborCost": 3000,
  "employeeCount": 5,
  "employees": [ ... ]
}
```

#### Dashboard Stats
```bash
GET /api/reports/dashboard-stats
Authorization: Bearer MANAGER_TOKEN

# Response:
{
  "currentlyClockedIn": 3,
  "todayShiftsCount": 15,
  "pendingTimeOffRequests": 2,
  "pendingShiftChangeRequests": 1,
  "weekTotalHours": 120.5,
  "activeEmployees": 5
}
```

---

### Manager Time Entry Corrections

#### Manual Time Entry (Manager Only)
```bash
POST /api/clock/manual
Authorization: Bearer MANAGER_TOKEN
Content-Type: application/json

{
  "userId": "employee_id",
  "shiftId": "shift_id",
  "clockInTime": "2025-10-25T09:00:00Z",
  "clockOutTime": "2025-10-25T17:00:00Z",
  "note": "Forgot to clock out"
}
```

#### Live Clocked-In Status (Manager Only)
```bash
GET /api/clock/live
Authorization: Bearer MANAGER_TOKEN

# Response:
{
  "count": 3,
  "employees": [
    {
      "id": "...",
      "clockInTime": "...",
      "user": { "firstName": "John", "lastName": "Doe" },
      "shift": { "position": "Sales Associate" }
    }
  ]
}
```

---

## Testing Workflow

### 1. Tablet Kiosk Flow
```bash
# 1. Employee arrives and enters PIN
POST /api/auth/tablet-verify { "pin": "1111" }

# 2. Clock in
POST /api/clock/in { "pin": "1111", "tabletId": "TABLET-001" }

# 3. Work shift...

# 4. Clock out
POST /api/clock/out { "pin": "1111", "tabletId": "TABLET-001" }
```

### 2. Employee Mobile App Flow
```bash
# 1. Login
POST /api/auth/login { "email": "john.doe@pushpoint.com", "password": "password123" }

# 2. View upcoming shifts
GET /api/shifts/upcoming

# 3. View this week's hours
GET /api/clock/my-week

# 4. Request time off
POST /api/time-off-requests { ... }

# 5. Request shift change
POST /api/shift-change-requests { ... }
```

### 3. Manager Dashboard Flow
```bash
# 1. Login as manager
POST /api/auth/login { "email": "manager@pushpoint.com", "password": "manager123" }

# 2. View dashboard stats
GET /api/reports/dashboard-stats

# 3. See who's currently clocked in
GET /api/clock/live

# 4. Review pending requests
GET /api/time-off-requests/pending
GET /api/shift-change-requests/pending

# 5. Create shifts for next week
POST /api/shifts/bulk-create { "shifts": [...] }

# 6. Generate weekly hours report
GET /api/reports/weekly-hours

# 7. Make manual time correction
POST /api/clock/manual { ... }
```

---

## Error Handling

All errors follow this format:
```json
{
  "error": "Error message here",
  "statusCode": 400
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token or PIN)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., already clocked in)
- `500` - Internal Server Error

---

## Notes

### PIN Security
- PINs must be 4-6 digits
- Weak PINs (1234, 0000, etc.) are rejected
- Sequential PINs (12345) are rejected
- Each PIN must be unique across all users

### Time Entry Business Logic
- Can only clock in if there's a scheduled shift
- Can clock in up to 15 minutes before shift starts
- Can clock out up to 1 hour after shift ends
- Cannot clock in if already clocked in
- Hours are automatically calculated on clock out

### Shift Management
- Shifts cannot overlap for the same employee
- Cannot delete shifts that have time entries
- Manager can cancel shifts instead

### Request Workflows
- All requests create notifications for managers
- Approved shift changes automatically update the shift
- Status changes create notifications for employees

---

## Development Tips

### View Database with Prisma Studio
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma migrate reset
# This will drop the DB, run migrations, and re-seed
```

### Check Logs
The server logs all requests and errors to console in development mode.
