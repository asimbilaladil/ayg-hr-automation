#!/bin/bash

# Backend Compilation Fix Script
# This script fixes all TypeScript compilation errors related to the database migration

set -e

echo "🔧 Starting backend compilation fixes..."

cd /root/ayg-hr-automation/backend

# Backup current files
echo "📦 Creating backups..."
cp src/services/candidates.service.ts src/services/candidates.service.ts.broken 2>/dev/null || true
cp src/services/availability.service.ts src/services/availability.service.ts.broken 2>/dev/null || true
cp src/services/appointments.service.ts src/services/appointments.service.ts.broken 2>/dev/null || true

# Restore from .backup files if they exist (clean state)
if [ -f src/services/candidates.service.ts.backup ]; then
  echo "📥 Restoring from backup files..."
  cp src/services/candidates.service.ts.backup src/services/candidates.service.ts
  cp src/services/availability.service.ts.backup src/services/availability.service.ts
  cp src/services/appointments.service.ts.backup src/services/appointments.service.ts
fi

echo "🔨 Fixing candidates.service.ts..."
# Fix relation names in include blocks
sed -i 's/location: true,/locationRel: true,/g' src/services/candidates.service.ts
sed -i 's/hiringManager: {/hiringManagerRel: {/g' src/services/candidates.service.ts  
sed -i 's/recruiter: {/recruiterRel: {/g' src/services/candidates.service.ts

# Add location text field to create candidate (only once)
if ! grep -q "location: data.location," src/services/candidates.service.ts; then
  sed -i '/emailId: data\.emailId,/a\      location: data.location,' src/services/candidates.service.ts
fi

echo "🔨 Fixing availability.service.ts..."
# Fix relation names
sed -i 's/location: true,/locationRel: true,/g' src/services/availability.service.ts
sed -i 's/manager: {/managerRel: {/g' src/services/availability.service.ts

# Fix variable references
sed -i 's/\ba\.manager\b/a.managerRel/g' src/services/availability.service.ts
sed -i 's/window\.manager\b/window.managerRel/g' src/services/availability.service.ts
sed -i 's/window\.location\.name/window.locationRel.name/g' src/services/availability.service.ts

# Fix orderBy
sed -i "s/orderBy: \[{ location: { name: 'asc' }/orderBy: [{ locationRel: { name: 'asc' }/g" src/services/availability.service.ts

# Add text fields to create availability
if ! grep -q "location: data.location," src/services/availability.service.ts | grep -A3 "prisma.managerAvailability.create"; then
  # Find the line with "managerId," in create block and add fields after it
  sed -i '/return prisma\.managerAvailability\.create/,/}/ {
    /managerId,/a\      location: data.location,\
      managerName: data.managerName,\
      managerEmail: data.managerEmail,
  }' src/services/availability.service.ts
fi

echo "🔨 Fixing appointments.service.ts..."
# Fix relation names
sed -i 's/location: true,/locationRel: true,/g' src/services/appointments.service.ts
sed -i 's/manager: {/managerRel: {/g' src/services/appointments.service.ts

# Add text fields to create appointment
if ! grep -q "location: data.location," src/services/appointments.service.ts | grep -B5 "prisma.appointment.create"; then
  sed -i '/return prisma\.appointment\.create/,/}/ {
    /active: true,/a\      location: data.location || "",\
      managerName: data.managerName,\
      managerEmail: data.managerEmail,
  }' src/services/appointments.service.ts
fi

echo "🧹 Removing duplicates..."
# Remove duplicate locationRel entries if any
for file in src/services/candidates.service.ts src/services/availability.service.ts src/services/appointments.service.ts; do
  awk '!seen[$0]++ || !/locationRel: true/' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done

echo "🔍 Testing compilation..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilation successful!"
  echo ""
  echo "Next steps:"
  echo "1. Add locations route to src/index.ts"
  echo "2. Restart backend: pm2 restart hr-backend"
  echo "3. Test the API"
else
  echo "❌ Compilation failed. Check errors above."
  exit 1
fi
