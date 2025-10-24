#!/bin/bash

echo "🚀 PushPoint Backend Setup Script"
echo "=================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL before continuing"
    exit 1
fi

echo "✅ PostgreSQL found"
echo ""

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pushpoint?schema=public"
echo "📝 DATABASE_URL set"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo "Make sure PostgreSQL is running and the database exists"
    exit 1
fi
echo "✅ Migrations completed"
echo ""

# Seed database
echo "🌱 Seeding database with test data..."
npm run prisma:seed
if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi
echo "✅ Database seeded"
echo ""

echo "✨ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "To view the database, run:"
echo "  npx prisma studio"
echo ""
echo "📚 See API_TESTING_GUIDE.md for API documentation"
echo ""
