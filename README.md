# Allo Inventory — Engineering Take-Home

A Next.js inventory reservation platform for multi-warehouse retail. Handles the checkout race condition by temporarily holding stock during payment.

## Live Demo

> Deploy URL goes here after Vercel deployment.

■ [Click here to run live](https://task-allo-inventory.tiiny.site)

## How to Run Locally

### 1. Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) (or Supabase) Postgres instance — **free tier works**
- An [Upstash](https://upstash.com) Redis instance — **free tier works**

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd allo-inventory
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Neon → project → Connection string (pooled, for Prisma) |
| `DIRECT_URL` | Neon → Connection string (direct, for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → Database → REST API |
| `CRON_SECRET` | Any random string |

### 4. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

### 5. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How Expiry Works in Production

Reservations that aren't confirmed before `expiresAt` are released by a **Vercel Cron Job** defined in `vercel.json`:

```json
{ "path": "/api/cron/expire-reservations", "schedule": "* * * * *" }
```

Every minute, the cron route:
1. Finds all `PENDING` reservations where `expiresAt < now()`
2. Wraps each in a Prisma transaction: decrements `reservedUnits` on the `Stock` row, then sets the reservation `status = RELEASED`

**Lazy cleanup is also layered in**: when a client polls `/api/reservations/:id`, the `expiresAt` is included in the response, so the UI can reflect expiry immediately without waiting for the cron tick.

---

## Concurrency Approach

The core race condition: two users simultaneously try to reserve the last unit.

**Solution — belt-and-suspenders:**

1. **Redis distributed lock** (`SET NX PX 8000`) on key `lock:stock:{productId}:{warehouseId}`. Only one request proceeds at a time per SKU per warehouse.

2. **Postgres row-level lock** (`SELECT ... FOR UPDATE`) inside a Prisma `$transaction`. Even if the Redis lock is skipped (e.g. Redis down), the DB-level lock prevents double-reserving.

3. The check (`available >= units`) and the `UPDATE reservedUnits += N` happen inside the same transaction, so they're atomic.

Result: exactly one of two simultaneous requests for the last unit succeeds; the other gets HTTP 409.

---

## Idempotency (Bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` support the `Idempotency-Key` header.

Implementation:
- On first request with key `X`: process normally, then store `JSON.stringify(response)` in Redis under `idempotency:{X}` with a 24-hour TTL.
- On retry with same key: return the cached response immediately, no side effects.

---

## Trade-offs & What I'd Do Differently

| Area | Decision | Trade-off |
|---|---|---|
| Locking | Redis + Postgres double-lock | Redis adds a network hop; could use pure Postgres advisory locks to remove the dependency |
| Cron granularity | Every 1 minute | Units can be "phantom reserved" for up to 1 min after expiry without the cron. For tighter guarantees, use a background job queue (BullMQ). |
| Auth | None (out of scope) | A real system would tie reservations to a user session |
| Optimistic UI | 5-second polling for reservation status | WebSockets or Server-Sent Events would be lower latency |
| Error handling | Top-level try/catch | Production would benefit from a structured error logging service (e.g. Sentry) |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units (409 if insufficient stock) |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation (410 if expired) |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/cron/expire-reservations` | Cron: release expired reservations |
