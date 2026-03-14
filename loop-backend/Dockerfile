# syntax=docker/dockerfile:1
# Multi-stage build for Loop backend (Node 20 on Alpine)

FROM node:20-alpine AS builder
WORKDIR /app

# System deps needed to build native modules (e.g., bcrypt) and prisma generate
RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ pkgconfig

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8.15.7 --activate

# Only copy files needed for dependency resolution first (better layer caching)
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies (dev deps included for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the backend source
COPY . .

# Generate Prisma client before build (does not require DB connection)
RUN pnpm prisma generate

# TypeScript build to dist/
RUN pnpm build

# Prune dev dependencies to reduce final image size
RUN pnpm prune --prod

# ----- Runtime image -----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install runtime tools: ffmpeg required by video pipeline; curl used by healthcheck
RUN apk add --no-cache ffmpeg curl

# Use non-root user for security (user `node` exists in official node image)
USER node

# Copy built app and production deps from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Expose API port and define container healthcheck hitting /health
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]
