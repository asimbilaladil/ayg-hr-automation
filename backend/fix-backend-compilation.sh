#!/bin/bash

# NUCLEAR OPTION - Complete fresh start with minimal changes
# This restores backups and applies ONLY the necessary changes

set -e

cd /root/ayg-hr-automation/backend

echo "🔥 NUCLEAR OPTION - Starting from scratch..."

# Step 1: Restore from backups
echo "📥 Restoring original files from backups..."
cp src/services/candidates.service.ts.backup src/services/candidates.service.ts
cp src/services/availability.service.ts.backup src/services/availability.service.ts
cp src/services/appointments.service.ts.backup src/services/appointments.service.ts

echo "✅ Restored clean files"

# Step 2: Fix ONLY candidates.service.ts
echo ""
echo "🔨 Fixing candidates.service.ts (replace location with locationRel in includes)..."
# This is a Python one-liner to be precise
python3 << 'PYTHONEOF'
import re

with open('src/services/candidates.service.ts', 'r') as f:
    content = f.read()

# Replace "location: true," with "locationRel: true," in include blocks
content = re.sub(r'(\s+)location: true,', r'\1locationRel: true,', content)

# Replace "hiringManager: {" with "hiringManagerRel: {"
content = re.sub(r'(\s+)hiringManager: \{', r'\1hiringManagerRel: {', content)

# Replace "recruiter: {" with "recruiterRel: {"
content = re.sub(r'(\s+)recruiter: \{', r'\1recruiterRel: {', content)

# Add location to create ONLY ONCE (check if already there)
if 'location: data.location,' not in content:
    content = re.sub(
        r'(emailId: data\.emailId,)',
        r'\1\n      location: data.location,',
        content,
        count=1
    )

with open('src/services/candidates.service.ts', 'w') as f:
    f.write(content)

print("✅ Fixed candidates.service.ts")
PYTHONEOF

# Step 3: Fix ONLY availability.service.ts
echo ""
echo "🔨 Fixing availability.service.ts..."
python3 << 'PYTHONEOF'
import re

with open('src/services/availability.service.ts', 'r') as f:
    content = f.read()

# Replace "location: true," with "locationRel: true," in include blocks
content = re.sub(r'(\s+)location: true,', r'\1locationRel: true,', content)

# Replace "manager: {" with "managerRel: {" in include blocks
content = re.sub(r'(\s+)manager: \{', r'\1managerRel: {', content)

# Replace a.manager with a.managerRel (but not a.managerName/Email)
content = re.sub(r'\ba\.manager(?!Name|Email)\b', 'a.managerRel', content)

# Replace window.manager with window.managerRel (but not window.managerName/Email)
content = re.sub(r'window\.manager(?!Name|Email)\b', 'window.managerRel', content)

# Replace window.location.name with window.locationRel.name
content = content.replace('window.location.name', 'window.locationRel.name')

# Fix orderBy
content = content.replace("{ location: { name: 'asc' }", "{ locationRel: { name: 'asc' }")

# Add text fields to create ONLY ONCE
if 'location: data.location,' not in content or 'managerName: data.managerName,' not in content:
    # Find createAvailability function and add fields
    content = re.sub(
        r'(export async function createAvailability.*?managerId,)',
        r'\1\n      location: data.location,\n      managerName: data.managerName,\n      managerEmail: data.managerEmail,',
        content,
        count=1,
        flags=re.DOTALL
    )

with open('src/services/availability.service.ts', 'w') as f:
    f.write(content)

print("✅ Fixed availability.service.ts")
PYTHONEOF

# Step 4: Fix ONLY appointments.service.ts
echo ""
echo "🔨 Fixing appointments.service.ts..."
python3 << 'PYTHONEOF'
import re

with open('src/services/appointments.service.ts', 'r') as f:
    content = f.read()

# Replace "location: true," with "locationRel: true,"
content = re.sub(r'(\s+)location: true,', r'\1locationRel: true,', content)

# Replace "manager: {" with "managerRel: {"
content = re.sub(r'(\s+)manager: \{', r'\1managerRel: {', content)

# Add text fields to create ONLY ONCE
if 'location: data.location' not in content:
    content = re.sub(
        r'(export async function createAppointment.*?active: true,)',
        r'\1\n      location: data.location || "",\n      managerName: data.managerName,\n      managerEmail: data.managerEmail,',
        content,
        count=1,
        flags=re.DOTALL
    )

with open('src/services/appointments.service.ts', 'w') as f:
    f.write(content)

print("✅ Fixed appointments.service.ts")
PYTHONEOF

# Step 5: Test
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
  echo "❌ Build failed. Showing specific issues:"
  echo ""
  echo "Checking for bad patterns..."
  grep -n "managerRelRel\|managerRelAvailability\|locationRel.*locationRel" src/services/*.ts || echo "No obvious patterns found"
  exit 1
fi
