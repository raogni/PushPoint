#!/bin/bash

BASE_URL="http://localhost:5000"

echo "🧪 PushPoint API Quick Test"
echo "============================"
echo ""
echo "Make sure the server is running (npm run dev)"
echo ""

# Health check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Server is running"
else
    echo "❌ Server is not responding"
    exit 1
fi
echo ""

# Login as employee
echo "2️⃣  Testing employee login..."
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@pushpoint.com","password":"password123"}')

if echo "$LOGIN" | grep -q "accessToken"; then
    echo "✅ Employee login successful"
    TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    echo "❌ Employee login failed"
    echo "$LOGIN"
    exit 1
fi
echo ""

# Tablet PIN verification
echo "3️⃣  Testing tablet PIN verification..."
PIN_VERIFY=$(curl -s -X POST "$BASE_URL/api/auth/tablet-verify" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1111"}')

if echo "$PIN_VERIFY" | grep -q "verified"; then
    echo "✅ PIN verification successful"
else
    echo "❌ PIN verification failed"
    echo "$PIN_VERIFY"
    exit 1
fi
echo ""

# Get upcoming shifts
echo "4️⃣  Testing get upcoming shifts..."
SHIFTS=$(curl -s "$BASE_URL/api/shifts/upcoming" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SHIFTS" | grep -q "shifts"; then
    SHIFT_COUNT=$(echo "$SHIFTS" | grep -o '"id"' | wc -l)
    echo "✅ Found $SHIFT_COUNT upcoming shifts"
else
    echo "❌ Failed to get shifts"
    echo "$SHIFTS"
    exit 1
fi
echo ""

# Get weekly hours
echo "5️⃣  Testing get weekly hours..."
WEEK=$(curl -s "$BASE_URL/api/clock/my-week" \
  -H "Authorization: Bearer $TOKEN")

if echo "$WEEK" | grep -q "totalHours"; then
    HOURS=$(echo "$WEEK" | grep -o '"totalHours":[0-9.]*' | cut -d':' -f2)
    echo "✅ Weekly hours: $HOURS"
else
    echo "❌ Failed to get weekly hours"
    echo "$WEEK"
    exit 1
fi
echo ""

# Login as manager
echo "6️⃣  Testing manager login..."
MANAGER_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@pushpoint.com","password":"manager123"}')

if echo "$MANAGER_LOGIN" | grep -q "accessToken"; then
    echo "✅ Manager login successful"
    MANAGER_TOKEN=$(echo "$MANAGER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    echo "❌ Manager login failed"
    echo "$MANAGER_LOGIN"
    exit 1
fi
echo ""

# Get dashboard stats
echo "7️⃣  Testing dashboard stats..."
STATS=$(curl -s "$BASE_URL/api/reports/dashboard-stats" \
  -H "Authorization: Bearer $MANAGER_TOKEN")

if echo "$STATS" | grep -q "currentlyClockedIn"; then
    CLOCKED_IN=$(echo "$STATS" | grep -o '"currentlyClockedIn":[0-9]*' | cut -d':' -f2)
    ACTIVE_EMPLOYEES=$(echo "$STATS" | grep -o '"activeEmployees":[0-9]*' | cut -d':' -f2)
    echo "✅ Dashboard stats: $CLOCKED_IN clocked in, $ACTIVE_EMPLOYEES active employees"
else
    echo "❌ Failed to get dashboard stats"
    echo "$STATS"
    exit 1
fi
echo ""

# Get pending requests
echo "8️⃣  Testing pending time-off requests..."
PENDING=$(curl -s "$BASE_URL/api/time-off-requests/pending" \
  -H "Authorization: Bearer $MANAGER_TOKEN")

if echo "$PENDING" | grep -q "requests"; then
    REQUEST_COUNT=$(echo "$PENDING" | grep -o '"id"' | wc -l)
    echo "✅ Found $REQUEST_COUNT pending time-off requests"
else
    echo "❌ Failed to get pending requests"
    echo "$PENDING"
    exit 1
fi
echo ""

echo "🎉 All tests passed!"
echo ""
echo "✨ Your API is working correctly!"
echo ""
echo "Next steps:"
echo "  - Try clock in/out with PIN (see API_TESTING_GUIDE.md)"
echo "  - Create shifts, approve requests"
echo "  - View detailed reports"
echo ""
