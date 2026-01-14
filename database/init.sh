#!/bin/bash
# HarmonizeIQ Database Initialization Script

set -e

# Load environment variables
source ../.env 2>/dev/null || true

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-harmonizeiq}
DB_USER=${DB_USER:-harmonize_admin}
DB_PASSWORD=${DB_PASSWORD:-harmonize_secret_2024}

echo "🚀 HarmonizeIQ Database Setup"
echo "=============================="

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Create database and user
echo "📦 Creating database and user..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER WITH SUPERUSER; -- Needed for pgvector extension
EOF

echo "✅ Database created successfully"

# Run schema
echo "📋 Applying schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql

echo "✅ Schema applied successfully"

# Seed data
if [ -f "seed.sql" ]; then
    echo "🌱 Seeding demo data..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f seed.sql
    echo "✅ Demo data seeded successfully"
fi

echo ""
echo "=============================="
echo "✅ HarmonizeIQ Database Ready!"
echo "=============================="
echo "Connection string: postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME"
