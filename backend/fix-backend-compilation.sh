#!/bin/bash

# FINAL CORRECT FIX - addresses all actual compilation errors
# This script directly fixes the specific errors in the build output

set -e

cd /root/ayg-hr-automation/backend

echo "🔧 Applying final correct fixes..."

# STEP 1: Restore from backup to get clean state
echo "📥 Restoring from backups..."
if [ -f src/services/candidates.service.ts.backup ]; then
  cp src/services/candidates.service.ts.backup src/services/candidates.service.ts
  cp src/services/availability.service.ts.backup src/services/availability.service.ts
  cp src/services/appointments.service.ts.backup src/services/appointments.service.ts
  echo "✅ Restored from backups"
else
  echo "❌ No backup files found! Cannot proceed."
  exit 1
fi

# STEP 2: Fix candidates.service.ts
echo ""
echo "🔨 Fixing candidates.service.ts..."

# Replace location: true with locationRel: true in include blocks
sed -i 's/^\(\s*\)location: true,$/\1locationRel: true,/' src/services/candidates.service.ts

# Replace hiringManager: { with hiringManagerRel: {
sed -i 's/^\(\s*\)hiringManager: {$/\1hiringManagerRel: {/' src/services/candidates.service.ts

# Replace recruiter: { with recruiterRel: {
sed -i 's/^\(\s*\)recruiter: {$/\1recruiterRel: {/' src/services/candidates.service.ts

# Add location text field to createCandidate (only once)
if ! grep -q "location: data.location," src/services/candidates.service.ts; then
  sed -i '/emailId: data\.emailId,/a\      location: data.location,' src/services/candidates.service.ts
fi

echo "✅ Fixed candidates.service.ts"

# STEP 3: Fix availability.service.ts  
echo ""
echo "🔨 Fixing availability.service.ts..."

# Replace location: true with locationRel: true in include blocks
sed -i 's/^\(\s*\)location: true,$/\1locationRel: true,/' src/services/availability.service.ts

# Replace manager: { with managerRel: { in include blocks ONLY
sed -i 's/^\(\s*\)manager: {$/\1managerRel: {/' src/services/availability.service.ts

# Fix variable references (a.manager -> a.managerRel)
sed -i 's/a\.manager\([^N]\)/a.managerRel\1/g' src/services/availability.service.ts
sed -i 's/a\.manager$/a.managerRel/g' src/services/availability.service.ts

# Fix window.manager references (but NOT data.managerName/managerEmail)
sed -i 's/window\.manager\([^N]\)/window.managerRel\1/g' src/services/availability.service.ts
sed -i 's/window\.manager$/window.managerRel/g' src/services/availability.service.ts

# Fix window.location.name -> window.locationRel.name
sed -i 's/window\.location\.name/window.locationRel.name/g' src/services/availability.service.ts

# Fix orderBy
sed -i "s/{ location: { name: 'asc' }/{ locationRel: { name: 'asc' }/g" src/services/availability.service.ts

# Add text fields to createAvailability (find the exact line and add after managerId)
if ! grep -A10 "export async function createAvailability" src/services/availability.service.ts | grep -q "location: data.location"; then
  # Use a more specific pattern to find the right place
  sed -i '/export async function createAvailability/,/^}/ {
    /managerId,/a\      location: data.location,\
      managerName: data.managerName,\
      managerEmail: data.managerEmail,
  }' src/services/availability.service.ts
fi

echo "✅ Fixed availability.service.ts"

# STEP 4: Fix appointments.service.ts
echo ""
echo "🔨 Fixing appointments.service.ts..."

# Replace location: true with locationRel: true
sed -i 's/^\(\s*\)location: true,$/\1locationRel: true,/' src/services/appointments.service.ts

# Replace manager: { with managerRel: {
sed -i 's/^\(\s*\)manager: {$/\1managerRel: {/' src/services/appointments.service.ts

# Add text fields to createAppointment
if ! grep -A15 "export async function createAppointment" src/services/appointments.service.ts | grep -q "location: data.location"; then
  sed -i '/export async function createAppointment/,/^}/ {
    /active: true,/a\      location: data.location || "",\
      managerName: data.managerName,\
      managerEmail: data.managerEmail,
  }' src/services/appointments.service.ts
fi

echo "✅ Fixed appointments.service.ts"

# STEP 5: Verify no bad patterns remain
echo ""
echo "🔍 Checking for problematic patterns..."

BAD_PATTERNS=0

if grep -q "managerRelAvailability" src/services/availability.service.ts; then
  echo "❌ Found managerRelAvailability (should be managerAvailability)"
  BAD_PATTERNS=1
fi

if grep -q "managerRelName\|managerRelEmail" src/services/availability.service.ts; then
  echo "❌ Found managerRelName/managerRelEmail (should be managerName/managerEmail)"
  BAD_PATTERNS=1
fi

if [ $BAD_PATTERNS -eq 1 ]; then
  echo "❌ Bad patterns found! Manual fix required."
  exit 1
fi

echo "✅ No problematic patterns found"

# STEP 6: Test compilation
echo ""
echo "🔍 Testing compilation..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅✅✅ SUCCESS! Compilation passed!"
  echo ""
  echo "Next steps:"
  echo "  1. ./add-locations-route.sh"
  echo "  2. pm2 restart hr-backend"
  echo "  3. pm2 logs hr-backend"
else
  echo ""
  echo "❌ Compilation still failing. Showing remaining errors..."
  exit 1
fi
