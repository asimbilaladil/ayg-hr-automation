#!/bin/bash

# Better Backend Compilation Fix Script
# Uses Perl for more precise replacements

set -e

echo "🔧 Starting precise backend fixes..."

cd /root/ayg-hr-automation/backend

# Restore clean state
echo "📥 Restoring from backup files..."
cp src/services/candidates.service.ts.backup src/services/candidates.service.ts
cp src/services/availability.service.ts.backup src/services/availability.service.ts
cp src/services/appointments.service.ts.backup src/services/appointments.service.ts

echo "🔨 Fixing candidates.service.ts..."

# Replace relation names in include blocks only
perl -i -pe 's/(?<=\s)location: true,/locationRel: true,/g' src/services/candidates.service.ts
perl -i -pe 's/(?<=\s)hiringManager: \{/hiringManagerRel: {/g' src/services/candidates.service.ts
perl -i -pe 's/(?<=\s)recruiter: \{/recruiterRel: {/g' src/services/candidates.service.ts

# Add location field to create (only if not already there)
if ! grep -q "location: data.location," src/services/candidates.service.ts; then
  perl -i -pe 's/(emailId: data\.emailId,)/$1\n      location: data.location,/' src/services/candidates.service.ts
fi

echo "🔨 Fixing availability.service.ts..."

# DO NOT change prisma.managerAvailability - that's correct!
# Only change the include blocks and variable references

# Fix include blocks
perl -i -pe 's/(?<=\s)location: true,/locationRel: true,/g' src/services/availability.service.ts
perl -i -pe 's/(?<=\s)manager: \{/managerRel: {/g' src/services/availability.service.ts

# Fix variable references (but NOT prisma model names or data property names)
perl -i -pe 's/\ba\.manager(?!Name|Email)\b/a.managerRel/g' src/services/availability.service.ts
perl -i -pe 's/window\.manager(?!Name|Email)\b/window.managerRel/g' src/services/availability.service.ts
perl -i -pe 's/window\.location\.name/window.locationRel.name/g' src/services/availability.service.ts

# Fix orderBy
perl -i -pe "s/orderBy: \[\{ location: \{ name: 'asc' \}/orderBy: [{ locationRel: { name: 'asc' }/g" src/services/availability.service.ts

# Add text fields to createAvailability data block
# Find the create block and add fields ONLY if they don't exist
if ! grep -A10 "return prisma.managerAvailability.create" src/services/availability.service.ts | grep -q "location: data.location"; then
  perl -i -pe '
    if (/return prisma\.managerAvailability\.create/) {
      $in_create = 1;
    }
    if ($in_create && /managerId,/) {
      s/(managerId,)/$1\n      location: data.location,\n      managerName: data.managerName,\n      managerEmail: data.managerEmail,/;
      $in_create = 0;
    }
  ' src/services/availability.service.ts
fi

echo "🔨 Fixing appointments.service.ts..."

# Fix include blocks
perl -i -pe 's/(?<=\s)location: true,/locationRel: true,/g' src/services/appointments.service.ts
perl -i -pe 's/(?<=\s)manager: \{/managerRel: {/g' src/services/appointments.service.ts

# Add text fields to createAppointment ONLY if they don't exist
if ! grep -A15 "return prisma.appointment.create" src/services/appointments.service.ts | grep -q "location: data.location"; then
  perl -i -pe '
    if (/return prisma\.appointment\.create/) {
      $in_create = 1;
    }
    if ($in_create && /active: true,/) {
      s/(active: true,)/$1\n      location: data.location || "",\n      managerName: data.managerName,\n      managerEmail: data.managerEmail,/;
      $in_create = 0;
    }
  ' src/services/appointments.service.ts
fi

echo "🔍 Testing compilation..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Compilation successful!"
  echo ""
  echo "Next steps:"
  echo "1. Run: ./add-locations-route.sh"
  echo "2. Restart: pm2 restart hr-backend"
else
  echo ""
  echo "❌ Compilation failed."
  echo "Showing error context..."
  
  # Show specific problem areas
  echo ""
  echo "=== Checking for managerRelAvailability (should be managerAvailability) ==="
  grep -n "managerRelAvailability" src/services/availability.service.ts || echo "None found (good!)"
  
  echo ""
  echo "=== Checking for duplicate fields in create ==="
  grep -A15 "return prisma.managerAvailability.create" src/services/availability.service.ts | grep "location:\|managerName:\|managerEmail:"
  
  exit 1
fi
