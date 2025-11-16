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

