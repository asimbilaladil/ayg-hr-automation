#!/bin/bash

# Add locations route to src/index.ts

cd /root/ayg-hr-automation/backend

echo "📝 Adding locations route to src/index.ts..."

# Check if the route is already added
if grep -q "locationRoutes" src/index.ts; then
  echo "✅ Locations route already exists in index.ts"
  exit 0
fi

# Add the import at the top with other route imports
sed -i '/import.*Routes.*from.*routes/a\import locationRoutes from '"'"'./routes/locations.routes'"'"';' src/index.ts

# Add the route usage with other app.use statements
sed -i '/app\.use.*\/api\/candidates/a\app.use('"'"'/api/locations'"'"', locationRoutes);' src/index.ts

echo "✅ Added locations route to src/index.ts"
echo ""
echo "Verifying..."
grep -A1 -B1 "locationRoutes" src/index.ts

echo ""
echo "✅ Done! Now restart the backend:"
echo "   pm2 restart hr-backend"
