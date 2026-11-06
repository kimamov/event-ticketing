# Plan — Event Ticketing Platform

Organizers create events at venues with seat maps. Customers browse, **hold** seats for a few minutes,
pay, and receive tickets. The hard parts are the reason we picked it: no double-booking under contention,
payments that are safe to retry, async fulfillment that survives crashes, and a read path that scales.

Tags: `[YOU]` hand-written · `[AGENT]` Claude implements · `[PAIR]` you design, Claude implements.
Each milestone ends with: a PR review against [REVIEW.md](REVIEW.md), an ADR for any real decision,
and answers to the "Interview questions" written in the PR description in your own words.

---

## M0 — Foundations
Goal: a repo that a senior would be happy to join.
- `[AGENT]` pnpm monorepo, TS strict, ESLint + Prettier, Vitest, `apps/api` health route, `apps/web` hello page
- `[AGENT]` docker compose (Postgres, Redis), `.env.example`, GitHub Actions: lint, typecheck, test
- `[YOU]` ADR-0001: stack choices and what you rejected (ORM vs query builder, Fastify vs Nest, REST vs tRPC)
- `[YOU]` Fill in the Commands section of CLAUDE.md
Done when: fresh clone → `docker compose up -d && pnpm i && pnpm test` is green; CI green on a PR.
Interview questions: Why a monorepo here? What does strict TS buy you at the API boundary?

## M1 — Catalog & data model
Goal: model the domain correctly before writing behaviour.
- `[YOU]` Schema + migrations: venues, sections, seats, events, event_seats (per-event seat state), prices
- `[YOU]` Constraints in the DB: unique, FK, CHECK. Explain which invariants live in the DB vs the app
- `[PAIR]` REST API: list/get events, cursor pagination, Zod schemas in `packages/shared`
- `[AGENT]` Web: event list + detail page with seat map rendering
- `[AGENT]` Seed script: 1 venue, 5k seats, 3 events
Done when: pagination is stable under inserts; invalid input → 400 with a typed error shape.
Interview questions: Offset vs cursor pagination? Why per-event seat rows instead of a JSON blob?

## M2 — Identity & authorization
- `[YOU]` ADR-0002: sessions (cookie + Redis) vs JWT. Decide revocation, CSRF, rotation
- `[YOU]` Password hashing (argon2id), login/logout, session middleware
- `[PAIR]` Roles: customer / organizer / admin; organizers own their events (row-level checks)
- `[AGENT]` Web: sign-up/login forms, auth-aware routing
Done when: tests prove an organizer cannot edit another organizer's event; sessions revocable.
Interview questions: Where does JWT hurt? How would you do authz across services later?

## M3 — Seat holds under contention (the core)
Goal: zero double-bookings with 1,000 concurrent users fighting for 100 seats.
- `[YOU]` Hold N seats with a TTL (e.g. 10 min). Pick a strategy and **prove it**:
  `SELECT ... FOR UPDATE SKIP LOCKED`, optimistic version column, or Redis lock. ADR-0003 compares them
- `[YOU]` Expiry: holds release without a cron race (lazy expiry on read, or sweeper, or both — justify)
- `[AGENT]` k6 script: 1,000 VUs hammer one event; assertion query that counts double-bookings
- `[AGENT]` Web: select seats, countdown timer, hold-expired state
Done when: load test shows 0 double-bookings and p95 hold latency is recorded in the PR.
Interview questions: What isolation level are you on and why is it enough? What happens if the DB fails over mid-hold?

## M4 — Checkout, payments, idempotency
- `[YOU]` Order state machine (pending → paid → fulfilled / cancelled / refunded), illegal transitions rejected
- `[YOU]` Idempotency keys on `POST /orders` and `POST /payments`: scope, storage, TTL, concurrent duplicate handling
- `[AGENT]` Fake payment provider service: random latency, failures, duplicate + out-of-order webhooks
- `[PAIR]` Webhook handler: signature verification, dedupe, ordering
- `[YOU]` Transactional outbox: order paid → outbox row in the same transaction
Done when: a chaos test (kill API mid-payment, replay webhooks 3×) leaves every order in a valid state.
Interview questions: Exactly-once vs at-least-once + idempotency? Why not publish to the queue inside the request?

## M5 — Async fulfillment
- `[PAIR]` Outbox relay → queue (BullMQ on Redis first; ADR on when you'd move to SQS/Kafka)
- `[YOU]` Worker: generate ticket (signed QR payload), retries with backoff, dead-letter queue, poison messages
- `[AGENT]` Email via a local mail catcher (Mailpit), ticket PDF/QR rendering
- `[AGENT]` Admin page: DLQ view + replay
Done when: killing the worker mid-job loses nothing and sends nothing twice.

## M6 — Read path at scale
- `[YOU]` Cache event catalog + seat availability in Redis; pick invalidation (write-through, TTL, events). ADR-0005
- `[YOU]` Rate limiting (token bucket in Redis) per user + per IP on hold endpoint
- `[AGENT]` HTTP caching: ETag / Cache-Control on catalog, CDN-ready headers
- `[AGENT]` k6 read test before/after; numbers in the PR
Interview questions: Thundering herd on a hot event — what do you do? Cache stampede protection?

## M7 — Realtime seat map
- `[YOU]` ADR: SSE vs WebSockets. Fan-out via Redis pub/sub across multiple API instances
- `[PAIR]` Server push of seat state changes; client reconciles with optimistic UI
- `[AGENT]` Run 2 API instances behind a local proxy (Caddy/nginx) to prove fan-out works
Done when: two browsers see each other's holds within 1 s, across instances.

## M8 — Observability & operations
- `[AGENT]` OpenTelemetry traces API → DB → queue → worker; structured JSON logs with trace IDs
- `[YOU]` Define 3 SLOs (e.g. hold success rate, checkout p95, fulfillment lag) + metrics that measure them
- `[YOU]` Write a runbook + one blameless postmortem for an incident you inject on purpose
- `[AGENT]` Grafana/Tempo/Prometheus in compose
Interview questions: How do you trace a request across an async boundary?

## M9 — Polyglot service (Go or Java)
- `[YOU]` ADR: which service to extract and why (fulfillment worker or payment service), contract first
  (OpenAPI / AsyncAPI / protobuf)
- `[YOU]` Rewrite it in Go (or Java/Spring) — hand-written, since the language is the learning goal
- `[AGENT]` Contract tests that run against both implementations; swap with no TS changes
Done when: the TS worker can be deleted and all M5 tests pass against the new service.

---

## Stretch (pick later)
Waiting room / virtual queue for on-sale spikes · multi-region read replicas · refunds & partial refunds ·
event sourcing for the order aggregate · deploy to a real cloud with IaC (Terraform).
