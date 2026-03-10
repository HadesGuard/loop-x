# Loop

A TikTok-style video social media platform built with the [Shelby protocol](https://docs.shelby.xyz) for decentralized content storage.

## Architecture

```
loop-backend/    Express.js + TypeScript API (port 3001)
loop-ui/         Next.js + React frontend (port 3000)
docs/            Shelby protocol documentation
```

### Backend
- **API**: Express.js with layered architecture (Routes → Controllers → Services)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Storage**: Shelby protocol (decentralized blob storage on Aptos)
- **Video**: ffmpeg transcoding, HLS adaptive streaming
- **Auth**: JWT + wallet auth (EVM, Solana, Aptos) + OAuth
- **Real-time**: Socket.io for messaging and notifications
- **Queue**: BullMQ for video processing jobs

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: React hooks + API client

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# 1. Start database and cache
docker compose -f loop-backend/docker-compose.db.yml up -d

# 2. Backend
cd loop-backend
cp .env.example .env        # Edit with your credentials
pnpm install
pnpm migrate:dev
pnpm dev                    # http://localhost:3001

# 3. Frontend
cd loop-ui
cp .env.example .env.local
pnpm install
pnpm dev                    # http://localhost:3000
```

### Environment Variables

See [`loop-backend/.env.example`](loop-backend/.env.example) for all required variables:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Auth tokens
- `SHELBY_API_KEY` — Shelby protocol API key
- `SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY` — Shelby service account for blob storage

## Development

```bash
# Backend
cd loop-backend
pnpm dev              # Dev server with hot reload
pnpm test             # Run tests (164 tests)
pnpm type-check       # TypeScript check
pnpm lint             # ESLint

# Frontend
cd loop-ui
pnpm dev              # Next.js dev server
pnpm build            # Production build
```

## Features

- Video upload with Shelby decentralized storage
- HLS adaptive streaming (720p/1080p)
- Chunked upload for large files
- Video feed with infinite scroll
- Comments, likes, shares
- Real-time messaging (WebSocket)
- User profiles and analytics
- Content discovery and search
- Hashtag system
- Report and moderation system
- Watch history

## API Specs

- [REST API](loop-backend/API_SPECS.md)
- [WebSocket Events](loop-backend/WEBSOCKET_SPECS.md)
- [Video Processing](loop-backend/VIDEO_PROCESSING_SPECS.md)
- [Shelby Integration](loop-backend/SHELBY_STORAGE_INTEGRATION.md)
