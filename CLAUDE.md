# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loop is a TikTok-style video social media platform integrating with the Shelby protocol (https://docs.shelby.xyz). It's a monorepo with two main packages:

- **loop-backend/** — Express.js + TypeScript API server (port 3001)
- **loop-ui/** — Next.js + React frontend (port 3000)

The frontend is currently using mock data (`lib/api/mock-api.ts`) and is **not yet integrated** with the backend. See `INTEGRATION_STATUS.md` for details.

## Common Commands

### Backend (loop-backend/)
```bash
pnpm dev              # Start dev server (tsx watch)
pnpm build            # TypeScript compile
pnpm test             # Run tests (vitest)
pnpm test:watch       # Run tests in watch mode
vitest run tests/unit/auth.service.test.ts  # Run a single test file
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm type-check       # tsc --noEmit
pnpm migrate:dev      # Prisma migrate dev
pnpm db:push          # Prisma db push
pnpm db:studio        # Prisma Studio GUI
pnpm seed             # Seed database
```

### Frontend (loop-ui/)
```bash
pnpm dev              # Start Next.js dev server (port 3000)
pnpm build            # Next.js build
pnpm lint             # ESLint
```

### Infrastructure
```bash
# Start PostgreSQL and Redis via Docker
docker compose -f loop-backend/docker-compose.db.yml up -d
```

## Architecture

### Backend (loop-backend/)

Standard layered architecture: **Routes → Controllers → Services**, with Prisma ORM and Redis caching.

- `src/server.ts` — App entry point, Express setup, middleware registration
- `src/routes/` — Express route definitions
- `src/controllers/` — Request handling, calls services
- `src/services/` — Business logic (auth, video, feed, messaging, wallet, shelby integration, etc.)
- `src/middleware/` — Auth (JWT), error handling, file upload (multer), validation
- `src/validators/` — Zod request validation schemas
- `src/types/` — TypeScript type definitions
- `src/queues/` — BullMQ job queues (video processing)
- `prisma/schema.prisma` — Database schema
- `tests/` — Unit and integration tests with vitest (setup in `tests/helpers/setup.ts`)

Path alias: `@/*` maps to `src/*` (configured in tsconfig and vitest).

Key integrations:
- **Shelby Protocol** (`services/shelby.service.ts`) — Content storage/retrieval via `@shelby-protocol/sdk`
- **Wallet auth** (`services/wallet.service.ts`) — EVM (ethers), Solana, Aptos wallet authentication
- **WebSocket** (`services/websocket.service.ts`) — Real-time notifications and messaging via socket.io
- **Video processing** (`services/video-processing.service.ts`) — ffmpeg-based transcoding via BullMQ

### Frontend (loop-ui/)

Next.js app router with Tailwind CSS v4 and shadcn/ui components.

- `app/` — Next.js app router pages (discover, hashtag, inbox, login, signup, studio, video, etc.)
- `components/ui/` — shadcn/ui primitives
- `components/` — App-level components (video feed, comments, navigation)
- `lib/api/` — API client (currently mock)
- `hooks/` — Custom React hooks
- `types/` — TypeScript types

## Shelby Documentation

Pre-fetched Shelby docs are in `loop-backend/docs/shelby/` — read from there first before fetching online:
- `loop-backend/docs/shelby/shelby-full-docs.txt` — Complete documentation
- `loop-backend/docs/shelby/typescript-sdk.md` — TypeScript SDK reference
- `loop-backend/docs/shelby/protocol-quickstart.md` — Protocol quickstart

## Environment Setup

Backend requires `.env` (see `loop-backend/.env.example`):
- PostgreSQL via `DATABASE_URL`
- Redis via `REDIS_URL`
- JWT secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- Shelby API credentials (`SHELBY_API_KEY`, `SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY`)

Frontend uses `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`.

## Key Specs

- `loop-backend/docs/api-specs.md` — Full REST API specification
- `loop-backend/docs/websocket-specs.md` — WebSocket events
- `loop-backend/docs/video-processing.md` — Video pipeline details
- `loop-backend/docs/shelby-integration.md` — Shelby protocol integration

---

## Auto-Apply Rules

IMPORTANT: Always follow these rules automatically when performing the corresponding task. Do NOT wait for the user to ask — apply them whenever the task matches.

### Rule 1: Creating API Endpoints

When creating or adding a new backend API endpoint, ALWAYS scaffold the full stack:

1. **Check specs first** — Read `loop-backend/docs/api-specs.md` to see if the endpoint is already specified
2. **Read existing patterns** — Use `video` as the reference implementation:
   - `src/routes/video.routes.ts` → route pattern
   - `src/controllers/video.controller.ts` → controller pattern
   - `src/services/video.service.ts` → service pattern
   - `src/validators/video.validator.ts` → Zod validator pattern
   - `src/types/video.types.ts` → types pattern
3. **Create all files** in order: types → validator → service → controller → routes
4. **Register route** in `src/server.ts` (add import + `app.use()`)
5. **Create test skeleton** in `tests/unit/services/`

Conventions:
- Services: class-based, singleton export (`export const fooService = new FooService()`)
- Controllers: async functions, use `AuthRequest`, return `{ success: true, data: {...} }`
- Errors: use `AppError(message, statusCode, errorCode)`
- Validation: Zod schemas in validators/, applied via `validate()` middleware
- All routes behind `authenticate` middleware unless explicitly public

### Rule 2: Frontend-Backend Integration

When replacing mock API with real backend calls:

1. Read `INTEGRATION_STATUS.md` for current status
2. Read the mock function in `loop-ui/lib/api/mock-api.ts`
3. Read the backend endpoint (routes → controller → service) to understand the real API contract
4. Implement in `loop-ui/lib/api/api.ts` using `this.request<T>()` method
5. Update `loop-ui/lib/api/transformers.ts` if response shape differs
6. Find all components using the mock function (Grep for the function name) and replace imports
7. Update `INTEGRATION_STATUS.md` when done

Do NOT remove mock functions — other features may still depend on them.

### Rule 3: Writing Tests

When writing backend tests:

1. Read existing tests in `loop-backend/tests/` to match the pattern
2. Read `tests/helpers/setup.ts` for test utilities
3. Use vitest: `import { describe, it, expect, vi, beforeEach } from 'vitest'`
4. Mock Prisma: `vi.mock('@/config/database')`, mock logger: `vi.mock('@/utils/logger')`
5. Test all public methods: success path, error cases, edge cases
6. Run with `cd loop-backend && pnpm vitest run <test-file>`
7. Fix failures and re-run until green, then run full suite: `pnpm test`

### Rule 4: Shelby Protocol

When working with Shelby features:

1. **Always read local docs first** — `loop-backend/docs/shelby/shelby-full-docs.txt`, `loop-backend/docs/shelby/typescript-sdk.md`, `loop-backend/docs/shelby/protocol-quickstart.md`
2. Read current implementation: `src/services/shelby.service.ts` and `loop-backend/docs/shelby-integration.md`
3. Follow existing `shelby.service.ts` patterns
4. SDK package: `@shelby-protocol/sdk`

### Rule 5: Database Changes

When modifying the database schema:

1. Read `loop-backend/prisma/schema.prisma` first
2. Follow existing naming: PascalCase models, camelCase fields, always include `id`/`createdAt`/`updatedAt`
3. Use `@default(uuid())` for ids, `@default(now())` for createdAt, `@updatedAt` for updatedAt
4. Add `@@index` for foreign keys and frequently queried fields
5. Run `cd loop-backend && pnpm migrate:dev --name descriptive_name`
6. Update related types, services, and seed data
7. Verify with `pnpm type-check`

### Rule 6: Code Review

When reviewing code (or before finishing any task), check:

- **Architecture**: Routes → Controllers → Services separation, no business logic in controllers
- **Types**: No `any` without justification, Zod validators match request shape
- **Errors**: Use `AppError` with correct status codes, handle async errors
- **Security**: Input validation on all endpoints, auth middleware on protected routes, no hardcoded secrets
- **Performance**: Efficient queries with pagination, proper indexes, no N+1 queries
- **Quality**: Focused functions (<50 lines), no dead code, consistent naming

<!-- KNOWNS GUIDELINES START -->
# Knowns Guidelines

> These rules are NON-NEGOTIABLE. Violating them causes data corruption.

## Session Init (Required)

```json
mcp__knowns__detect_projects({})
mcp__knowns__set_project({ "projectRoot": "/path/to/project" })
```

**Skip this = tools fail or work on wrong project.**

---

## Critical Rules

| Rule | Description |
|------|-------------|
| **Never edit .md** | Use MCP tools (preferred) or CLI. NEVER edit task/doc files directly |
| **Docs first** | Read project docs BEFORE planning or coding |
| **Plan → Approve → Code** | Share plan, WAIT for approval, then implement |
| **AC after work** | Only check acceptance criteria AFTER completing work |
| **Time tracking** | `start_time` when taking task, `stop_time` when done |
| **Validate** | Run `validate` before marking task done |
| **appendNotes** | Use `appendNotes` for progress. `notes` REPLACES all (destroys history) |

---

## CLI Pitfalls

### The `-a` flag trap

| Command | `-a` means | NOT this |
|---------|------------|----------|
| `task create/edit` | `--assignee` | ~~acceptance criteria~~ |
| `doc edit` | `--append` | ~~assignee~~ |

```bash
# WRONG - sets assignee to garbage!
knowns task edit 35 -a "Criterion text"

# CORRECT
knowns task edit 35 --ac "Criterion text"
```

### --plain flag

**Only for view/list/search commands:**
```bash
knowns task <id> --plain      # ✓
knowns task list --plain      # ✓
knowns task create --plain    # ✗ ERROR
knowns task edit --plain      # ✗ ERROR
```

### Subtasks

```bash
knowns task create "Sub" --parent 48    # ✓ raw ID
knowns task create "Sub" --parent task-48  # ✗ WRONG
```

---

## References

Tasks and docs can reference each other:

| Type | Format |
|------|--------|
| Task | `@task-<id>` |
| Doc | `@doc/<path>` |
| Template | `@template/<name>` |

**Always follow refs recursively** before planning.

---

> **Full reference:** Run `knowns guidelines --plain` for complete documentation
<!-- KNOWNS GUIDELINES END -->
