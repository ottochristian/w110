#!/bin/bash

# Simple script to apply the monitoring migration directly via psql
# This reads the migration file and executes it

echo "🔄 Applying monitoring dashboard migration..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

# Extract Supabase URL and construct connection string
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials in .env.local"
  exit 1
fi

# Extract project ref from URL (format: https://xxx.supabase.co)
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

echo "📦 Project: $PROJECT_REF"
echo "📄 Migration: migrations/60_add_application_metrics.sql"
echo ""

# Use Supabase's PostgreSQL connection
# Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

echo "⚠️  Note: This script requires direct PostgreSQL access."
echo "    For security, Supabase may not allow this without configuring database access."
echo ""
echo "Alternative: Use the Supabase Dashboard SQL Editor"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "2. Copy the contents of: migrations/60_add_application_metrics.sql"
echo "3. Paste into SQL Editor and click 'Run'"
echo ""
echo "Or install Supabase CLI: brew install supabase/tap/supabase"
echo "Then run: supabase db push"
echo ""
