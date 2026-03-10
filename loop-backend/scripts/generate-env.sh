#!/bin/bash

# Generate .env file from .env.example
# This script generates JWT secrets automatically

echo "🔧 Generating .env file..."

# Copy example file
cp .env.example .env

# Generate JWT secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Replace JWT secrets in .env
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/your-super-secret-jwt-key-min-32-chars-random-generate-this/$JWT_SECRET/" .env
  sed -i '' "s/your-super-secret-refresh-key-min-32-chars-random-generate-this/$JWT_REFRESH_SECRET/" .env
else
  # Linux
  sed -i "s/your-super-secret-jwt-key-min-32-chars-random-generate-this/$JWT_SECRET/" .env
  sed -i "s/your-super-secret-refresh-key-min-32-chars-random-generate-this/$JWT_REFRESH_SECRET/" .env
fi

echo "✅ .env file created!"
echo "📝 JWT secrets generated automatically"
echo ""
echo "⚠️  Next steps:"
echo "   1. Edit .env and update:"
echo "      - DATABASE_URL (PostgreSQL connection)"
echo "      - REDIS_URL (if different)"
echo "      - SHELBY_API_KEY (get from Shelby)"
echo "      - SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY"
echo "      - SHELBY_SERVICE_ACCOUNT_ADDRESS"
echo ""
echo "   2. Start database:"
echo "      docker-compose -f docker-compose.db.yml up -d"
echo ""
echo "   3. Run migrations:"
echo "      pnpm run migrate:dev"
echo ""
echo "   4. Start server:"
echo "      pnpm run dev"

