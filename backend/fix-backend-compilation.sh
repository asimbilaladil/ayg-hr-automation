#!/bin/bash

# Cleanup script to fix managerRelName/managerRelEmail back to managerName/managerEmail

cd /root/ayg-hr-automation/backend

echo "🧹 Cleaning up managerRelName/managerRelEmail..."

# Fix data.managerRelName back to data.managerName
sed -i 's/data\.managerRelName/data.managerName/g' src/services/availability.service.ts
sed -i 's/data\.managerRelEmail/data.managerEmail/g' src/services/availability.service.ts

# Also fix any managerRelAvailability back to managerAvailability
sed -i 's/managerRelAvailability/managerAvailability/g' src/services/availability.service.ts

echo "✅ Cleaned up!"

echo ""
echo "🔍 Verifying no bad patterns remain..."

if grep -q "managerRelAvailability\|managerRelName\|managerRelEmail" src/services/availability.service.ts; then
  echo "❌ Still found bad patterns:"
  grep -n "managerRelAvailability\|managerRelName\|managerRelEmail" src/services/availability.service.ts
  exit 1
else
  echo "✅ All clean!"
fi

echo ""
echo "🔍 Testing compilation..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅✅✅ SUCCESS! BUILD PASSED!"
  echo ""
  echo "Next steps:"
  echo "  1. ./add-locations-route.sh"
  echo "  2. pm2 restart hr-backend"
else
  echo ""
  echo "❌ Build failed. Here are the remaining errors:"
fi
