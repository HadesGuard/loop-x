# E2E API Tests

These tests validate critical HTTP flows using the real PostgreSQL database and `supertest`.

## Prerequisites

- Postgres running and reachable from `DATABASE_URL`
- Backend env configured (`.env` or `.env.test`) with:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`

## Run

```bash
pnpm test tests/e2e/api-flows.e2e.test.ts
```

The suite runs `pnpm prisma migrate deploy` in `beforeAll` to ensure schema is current.

## Notes

- Tests create uniquely tagged records and clean them up after each test.
- External Shelby and queue integrations are mocked so E2E coverage focuses on API + DB behavior.
