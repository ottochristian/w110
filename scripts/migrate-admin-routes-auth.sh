#!/bin/bash
# Migrate admin API routes to use requireAuth helper
# This improves consistency, security, and maintainability

echo "🔧 Migrating Admin API Routes to requireAuth Helper"
echo "═══════════════════════════════════════════════════"
echo ""

# List of files to migrate
ROUTES=(
  "app/api/admin/athletes/by-age/route.ts"
  "app/api/admin/athletes/by-gender/route.ts"
  "app/api/admin/athletes/by-program/route.ts"
  "app/api/admin/athletes/summary/route.ts"
  "app/api/admin/programs/route.ts"
  "app/api/admin/programs/analytics/route.ts"
  "app/api/admin/registrations/by-sport/route.ts"
  "app/api/admin/registrations/program-timeseries/route.ts"
  "app/api/admin/registrations/revenue-timeseries/route.ts"
  "app/api/admin/registrations/summary/route.ts"
  "app/api/admin/revenue/by-method/route.ts"
  "app/api/admin/revenue/by-program/route.ts"
  "app/api/admin/revenue/cumulative/route.ts"
  "app/api/admin/revenue/outstanding/route.ts"
  "app/api/admin/revenue/summary/route.ts"
  "app/api/admin/waivers/by-program/route.ts"
  "app/api/admin/waivers/details/route.ts"
  "app/api/admin/waivers/missing/route.ts"
  "app/api/admin/waivers/summary/route.ts"
  "app/api/admin/waivers/timeline/route.ts"
  "app/api/athletes/admin-create/route.ts"
)

echo "📋 Found ${#ROUTES[@]} routes to migrate"
echo ""

# We'll do this manually one by one with the assistant
echo "Routes to migrate:"
for route in "${ROUTES[@]}"; do
  echo "  - $route"
done

echo ""
echo "📝 Migration pattern:"
echo ""
echo "OLD:"
echo "  const { data: { user }, error } = await supabase.auth.getUser()"
echo "  if (error || !user) {"
echo "    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"
echo "  }"
echo ""
echo "NEW:"
echo "  const authResult = await requireAuth(request)"
echo "  if (authResult instanceof NextResponse) {"
echo "    return authResult"
echo "  }"
echo "  const { user, supabase } = authResult"
echo ""
echo "Ready to migrate! Use the assistant to update each file."
