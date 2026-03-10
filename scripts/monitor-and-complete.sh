#!/bin/bash

# Monitor and Complete Load Test Data Generation
# This script monitors the athlete generation and automatically runs revenue generation when done

echo "🔍 Monitoring athlete generation..."
echo "Will automatically run revenue generation when complete"
echo ""

# Get the PID of the running generation
GENERATION_PID=$(pgrep -f "generate-load-test-simple")

if [ -z "$GENERATION_PID" ]; then
    echo "❌ No athlete generation process found running"
    echo "Starting athlete generation now..."
    cd "$(dirname "$0")/.."
    npm run generate:load-test:simple -- --athletes 100000 &
    GENERATION_PID=$!
    echo "✅ Started athlete generation (PID: $GENERATION_PID)"
fi

echo "📊 Monitoring PID: $GENERATION_PID"
echo ""

# Wait for the process to complete
while kill -0 $GENERATION_PID 2>/dev/null; do
    sleep 60  # Check every minute
    echo "⏳ $(date +%H:%M:%S) - Still generating athletes..."
done

echo ""
echo "✅ Athlete generation complete!"
echo "🚀 Starting revenue generation..."
echo ""

# Run revenue generation
cd "$(dirname "$0")/.."
npm run generate:revenue-data

echo ""
echo "🎉 ALL DONE! Both athlete and revenue data generation complete!"
echo "📊 Your load test data is ready!"
echo ""
echo "Next steps:"
echo "  1. Run validation: npm run validate:data"
echo "  2. Check your dashboard for the new data"
echo "  3. Test performance with 100k+ records"
echo ""
