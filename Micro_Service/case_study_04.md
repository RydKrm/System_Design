# Microservices — Complete Study & Failure Cases (Volume 4)

> 12 Parts · 66 Cases — Expert-level patterns covering distributed locking, service versioning, health engineering, traffic management, database migration strategies, incident command, capacity planning, and real production forensics.

---

## Part 29 — Distributed Locking Failures

### 29.1 Lock Acquired, Worker Crashes — Lock Never Released

- **What happens:** Worker acquires distributed lock to process a job, crashes mid-processing — lock held indefinitely, no other worker can acquire it, job processing halted forever
- **Real pattern:** `lock.Acquire("job:456")` — worker starts processing 10,000-row export. OOM kill at row 5,000. Lock in Redis: `SET job:456 worker-A NX` with no TTL (forgot EX parameter). Key exists forever. No other worker picks up job:456. Job stuck. Customer export never completes.
- **Scale trigger:** Any worker crash between lock acquire and lock release, missing TTL on lock key
- **Symptoms:** Jobs stuck permanently, lock keys accumulate in Redis with no TTL, workers idle while jobs show as "processing", only fix is manual Redis key deletion
- **Solution:** Always set TTL on lock: `SET job:456 worker-A NX EX 300`. TTL = max expected job duration + buffer. If job takes longer: heartbeat extends TTL: `EXPIRE job:456 300` every 60 seconds from the processing goroutine. No heartbeat = lock released automatically. Another worker picks up. Implement lock heartbeat as a separate goroutine that runs until job completes or times out.
- **Lesson:** A distributed lock without TTL is a single point of failure. Crashes are inevitable — TTL is the safety valve. Heartbeat extends lock for long-running jobs while keeping the crash-recovery guarantee.

---

### 29.2 Lock Released by Wrong Owner — Fencing Token Not Used

- **What happens:** Worker A holds lock, pauses (GC pause, network stall) — lock TTL expires — Worker B acquires same lock, starts processing — Worker A resumes, releases the lock (now owned by B) — Worker B's lock stolen mid-operation
- **Real pattern:** Worker A: acquires lock (TTL 30s). GC pause: 35 seconds. Lock expires. Worker B acquires lock. Worker A resumes, calls `lock.Release("job:456")` — deletes Redis key that now belongs to Worker B. Worker B: continues processing without knowing lock was stolen. Two workers process same job simultaneously.
- **Scale trigger:** GC pauses (JVM/Go), network stalls, any pause longer than lock TTL
- **Symptoms:** Duplicate job processing, data corruption from concurrent modification, race conditions thought impossible because "only one worker holds the lock"
- **Solution:** Fencing token: lock value = unique token per acquisition. Release only if token matches: `GET job:456 == my-token → DEL job:456` (atomic via Lua script). Worker A's token no longer matches (B set new token) — release silently fails. Worker A detects it no longer owns the lock (release failed) and aborts. Go redis library `redislock` implements this correctly.
- **Lesson:** `DEL key` releases any lock. Only release the lock if you still own it (token matches). Fencing tokens prevent stale workers from releasing locks they no longer hold.

---

### 29.3 Redlock Algorithm — Theoretically Unsafe

- **What happens:** Team implements Redlock (multi-node Redis distributed lock) believing it provides stronger guarantees — but Redlock is unsafe under clock drift and network delays — two processes simultaneously hold the "lock"
- **Real pattern:** Redlock: acquire lock on 3/5 Redis nodes. Network partition: client A gets lock from nodes 1, 2, 3. Node 3 restarts (loses lock). Client B gets lock from nodes 3, 4, 5. Both clients believe they hold the lock. Both process the job simultaneously. Martin Kleppmann's critique of Redlock (2016) documented this failure mode.
- **Scale trigger:** Redis node restarts, network partitions, clock drift between Redis nodes
- **Symptoms:** Concurrent processing despite distributed lock, data corruption, race conditions that shouldn't be possible, only occurs during Redis infrastructure events
- **Solution:** For true distributed locking: use Zookeeper (ZAB consensus protocol, not clock-dependent) or etcd (Raft consensus). For most use cases: single Redis instance with TTL + fencing token is sufficient if you can tolerate lock loss on Redis failure. Choose based on actual failure tolerance: single Redis = simpler, fails during Redis outage. Zookeeper/etcd = complex, survives node failures.
- **Lesson:** Redlock is controversial and has documented safety issues under network/clock conditions. For critical locks: use consensus-based systems (etcd, Zookeeper). For most use cases: single Redis with TTL and fencing tokens is simpler and good enough.

---

### 29.4 Distributed Lock as Crutch — Should Be Database Constraint

- **What happens:** Distributed lock used to prevent duplicate user registration — lock logic complex, has edge cases — `UNIQUE` constraint on email column would enforce the same guarantee atomically at the DB layer
- **Real pattern:** `lock.Acquire("register:" + email)` → check if email exists → create user → `lock.Release()`. Complex, has TTL race conditions. If lock library has bug: two users registered with same email. Meanwhile: `CREATE UNIQUE INDEX users_email_unique ON users(email)` — DB rejects duplicate insert at the constraint level, atomically, always.
- **Scale trigger:** Using distributed locks for problems that DB constraints or atomic DB operations can solve
- **Symptoms:** Complex locking code with subtle race conditions, lock expiry bugs, distributed lock is the most complex part of a conceptually simple operation
- **Solution:** Use the right tool: DB `UNIQUE` constraints for uniqueness, `SELECT ... FOR UPDATE` for row-level locking within a transaction, `INSERT ... ON CONFLICT DO NOTHING` for idempotent inserts. Distributed locks are for coordinating across services with no shared DB. If services share a DB: use DB concurrency primitives instead.
- **Lesson:** A distributed lock solving a single-database problem is over-engineering. DB constraints and transactions provide stronger atomicity guarantees with less complexity. Use distributed locks only when no shared DB exists.

---

### 29.5 Lock Contention at Scale — Serializing Parallel Work

- **What happens:** 100 workers all compete for same lock to update a shared counter — 99 workers waiting at any moment — throughput: 1 job/lock-duration instead of 100 jobs/lock-duration
- **Real pattern:** Inventory deduction: `lock.Acquire("inventory:product:789")` → check stock → deduct → `lock.Release()`. 100 concurrent purchase requests. Only 1 runs at a time. Lock hold time: 50ms. Throughput: 20 deductions/sec instead of potential 2000/sec. Peak flash sale: queue of 100 waiting, p99 = 100 × 50ms = 5 seconds.
- **Scale trigger:** High concurrency on shared resource, fine-grained locks with many waiters, flash sales, popular items
- **Symptoms:** Throughput ceiling at `1/lock_duration`, high p99 latency under concurrent load, lock contention metrics showing 99% wait time
- **Solution:** Optimistic locking (CAS): `UPDATE inventory SET stock = stock - 1, version = version + 1 WHERE product_id = 789 AND stock >= 1 AND version = <read_version>`. If 0 rows updated: retry (someone else modified). No lock held. Concurrent execution. DB serializes via MVCC. Or: Redis DECR with Lua script — atomic without lock. Reserve-confirm pattern for high contention.
- **Lesson:** Pessimistic locking serializes work that could be parallelized. Optimistic locking (CAS) allows parallel execution with conflict detection and retry — dramatically higher throughput under contention.

---

## Part 30 — Service Versioning Advanced

### 30.1 Versioning Strategy Inconsistency — URL vs Header vs Query Param

- **What happens:** 8 microservices each chose different versioning strategy — consumers need different version negotiation logic per service — client code becomes a compatibility matrix
- **Real pattern:** `user-service`: URL versioning (`/v2/users`). `order-service`: header versioning (`API-Version: 2`). `notification-service`: query param (`?version=2`). `payment-service`: content negotiation (`Accept: application/vnd.payment.v2+json`). Client team builds 4 different version negotiation patterns. Every new service potentially adds a 5th.
- **Scale trigger:** No org-wide API versioning standard, each team choosing independently
- **Symptoms:** Client complexity grows with service count, integration test matrix explosion, client bugs from wrong versioning pattern per service
- **Solution:** Org-wide API versioning standard: choose one strategy and document it. Common choice: URL versioning (`/v{N}/`) for REST — explicit, cacheable, visible in logs. Document in engineering handbook. API gateway enforces standard via linting. New services use the standard or get PR rejected.
- **Lesson:** API versioning strategy is an org-level decision, not a per-team decision. Inconsistency across services creates compounding complexity for every client. Standardize early.

---

### 30.2 Version Sunset — Clients Never Migrate

- **What happens:** v1 deprecated 12 months ago, sunset date set, `Sunset` header added — 15% of traffic still on v1 on sunset date — can't turn off v1 without impacting 15% of users
- **Real pattern:** v1 deprecated with `Sunset: Sat, 1 Jan 2026 00:00:00 GMT` header. Client team has "migrate to v2" on backlog — never prioritized. Sunset date arrives. 15% of traffic still v1. Options: (a) turn off v1 and break 15% of users, (b) extend sunset again, (c) keep v1 forever. Team extends sunset (again). v1 lives indefinitely.
- **Scale trigger:** Clients that don't monitor `Sunset` headers, external clients outside your control, mobile apps that can't force-update
- **Symptoms:** Sunset dates extended repeatedly, deprecated versions never actually sunset, v1 maintenance cost paid indefinitely
- **Solution:** Enforcement mechanisms beyond headers: (1) Gradually reduce v1 rate limits (1000 → 500 → 100 → 10 req/min) on approach to sunset. (2) Return `Warning` header with countdown. (3) Inject artificial latency on deprecated version (motivates migration). (4) Require re-authentication for v1 (friction). (5) For internal clients: make migration a sprint blocker for their team. Passive deprecation notices aren't enough.
- **Lesson:** `Sunset` headers inform but don't enforce. Clients migrate when not migrating is more painful than migrating. Build enforcement mechanisms — rate limit reduction, artificial latency, re-auth friction — not just documentation.

---

### 30.3 Database Migration Incompatible With Rolling Deploy

- **What happens:** New version requires column renamed — migration runs before rolling deploy — old version pods still running read old column name — old pods throw DB errors during rolling update window
- **Real pattern:** v1 reads `orders.customer_name`. Migration renames to `orders.customer_full_name`. Migration runs. v1 pods (still running during rolling deploy): `SELECT customer_name FROM orders` — column not found — 500 errors for all in-flight requests during the 5-minute rolling deploy window.
- **Scale trigger:** Any rename/drop operation run as part of rolling deployment, v1 and v2 running simultaneously
- **Symptoms:** Error spike during rolling deploy proportional to rename impact, customer-visible errors during deployment, deployment = mini-outage
- **Solution:** Expand-Contract for rolling deploys: Phase 1 (v1 compatible migration): add new column `customer_full_name`, copy data, keep old column. Phase 2 (deploy v2): v2 reads new column, writes both. Phase 3 (after v1 pods gone): drop old column. Schema is always compatible with the running version. Never rename/drop during rolling deploy.
- **Lesson:** Any schema change that breaks the previous version makes rolling deployment impossible without errors. Expand-contract is mandatory for zero-downtime rolling deploys.

---

### 30.4 API Version Explosion — Supporting N Versions Forever

- **What happens:** 5 major API versions all in production — v1 (2020), v2 (2021), v3 (2022), v4 (2023), v5 (2024) — every feature added to 5 codepaths, bugs fixed in 5 places, test matrix 5×
- **Real pattern:** Each breaking change creates new version. No sunset enforcement (see 30.2). 5 versions now active. New feature: add `discount_code` to order creation. Implemented in v5 only. Customer on v3 (major enterprise, slow to migrate): can't use new feature. Or: implement in all 5 versions — 5× development cost.
- **Scale trigger:** No sunset enforcement, enterprise clients resistant to migration, breaking change frequency high
- **Symptoms:** Feature development cost multiplied by active version count, bug fix deployed to N versions, tests fail on version N-3 that nobody noticed
- **Solution:** Actively reduce active versions. Target: max 2 concurrent major versions (current + previous for migration window). Enforce sunset dates (30.2 mechanisms). For breaking changes: additive-only where possible (new field alongside old). When break required: version + sunset + migration support (tooling, docs, 1:1 migration help for large clients).
- **Lesson:** API versions are technical debt that grows multiplicatively with feature count. Every active version multiplies maintenance cost. Two versions maximum: current and one migration window.

---

### 30.5 Implicit Versioning — Behavior Change Without Version

- **What happens:** Service changes validation logic (now rejects previously-accepted inputs) — no version bump — clients suddenly receive 400s for requests that previously returned 200
- **Real pattern:** `order-service` tightens validation: order quantity must now be > 0 (previously 0 was allowed as "quote request"). Deployed without version bump — it's "just a bug fix." All clients sending `quantity: 0` for quotes: now receive 400. Client integration broken. No migration path (no new version to migrate to, no old version to stay on).
- **Scale trigger:** Any behavior change framed as "bug fix" that breaks existing clients
- **Symptoms:** Client 400 errors on requests that previously worked, clients have no migration option (no old version available), "bug fix" causes client outage
- **Solution:** Any change that alters observable behavior for existing valid inputs is a breaking change — version it. Expand validation: add new endpoint or new version for stricter behavior. Existing behavior: preserved on current version. "Bug fix vs breaking change" distinction: does it change what existing clients experience? If yes: breaking change, needs version.
- **Lesson:** "Bug fix" that changes observable behavior for existing clients is a breaking change. Behavior changes require versions. The client defines what's "correct" for their integration — your fix is their breaking change.

---

## Part 31 — Health Engineering

### 31.1 Health Check Causes Cascade — Expensive Health Check

- **What happens:** Health check endpoint runs a DB query to verify connectivity — under load, health checks themselves consume DB connection pool — health check causes the failure it's checking for
- **Real pattern:** `/health` endpoint: `db.QueryRow("SELECT 1")`. Health check interval: 5 seconds. Load balancer checks all 10 pods every 5 seconds = 2 checks/sec/pod. During DB slowness: health check queries queue behind slow queries. Pool at capacity. Health check fails. Pod marked unhealthy. More pods marked unhealthy. Load concentrates on fewer remaining pods. Cascade.
- **Scale trigger:** Expensive health checks under load, health check polling from multiple sources (LB + K8s + monitoring)
- **Symptoms:** Health checks trigger the failure they're designed to detect, cascade from health check induced DB pressure, healthy pods marked unhealthy
- **Solution:** Health check uses pre-existing connection state, not new query: check `db.Stats().OpenConnections > 0` (is pool alive?). Or: maintain a health flag set by background goroutine: background pings DB every 30s, sets `healthy=true/false`. Health endpoint reads flag — no DB query on health check path. Health check must be cheap and non-interactive with production load.
- **Lesson:** A health check that queries the DB under load adds load to the DB when the DB is already struggling. Health checks must be cheap, pre-computed, and non-interactive with the resources they're checking.

---

### 31.2 Liveness vs Readiness Confusion — Restarting Healthy Pods

- **What happens:** K8s liveness probe set too aggressively — slow startup causes liveness probe to fail — K8s kills the pod — pod restarts — slow startup again — CrashLoopBackOff despite nothing being wrong
- **Real pattern:** Go service: startup takes 45 seconds (DB migration + cache warmup). Liveness probe: fails after 30 seconds with no response. K8s kills pod at 30s. Pod restarts. Again 45s startup. Again killed at 30s. CrashLoopBackOff. Service never starts. Nothing is wrong with the service — liveness probe is wrong.
- **Scale trigger:** Services with slow startup, liveness probe configured identically to readiness probe, first deployment of a new service
- **Symptoms:** CrashLoopBackOff during deployment of new service, pod never reaches running state despite service being functionally correct, increasing restart backoff delays
- **Solution:** Three distinct probes with distinct purposes: (1) **startupProbe**: generous timeout, probe only during startup (`failureThreshold: 30, periodSeconds: 10` = 5 minutes). Disables liveness during startup. (2) **livenessProbe**: detects deadlock/hung process (only restart if truly stuck). Simple: HTTP 200 on `/livez`. (3) **readinessProbe**: detects not-ready-for-traffic (DB connection lost, cache miss). Remove from LB rotation without restart.
- **Lesson:** Liveness = should this pod be restarted? Readiness = should this pod receive traffic? Startup probe disables liveness during slow startup. All three serve different purposes and need separate configuration.

---

### 31.3 Readiness Probe Too Strict — Rolling Deploy Stalls

- **What happens:** Readiness probe checks all downstream dependencies — one non-critical downstream is degraded — all new pods fail readiness — rolling deploy stalls at 0% progress
- **Real pattern:** `/readyz` checks: DB ping (critical), Redis ping (critical), `recommendation-service` HTTP check (non-critical). `recommendation-service` degraded. All new pods fail readiness. Rolling deploy: new pod started → readiness fails → old pod not terminated → deploy stuck indefinitely.
- **Scale trigger:** Readiness probe checking non-critical dependencies, downstream degradation during deploy window
- **Symptoms:** Rolling deploy stalls permanently, no new pods become ready, old pods never terminated, deploy requires manual intervention
- **Solution:** Readiness probe checks only what is required to serve traffic: critical DB and cache connectivity. Non-critical dependencies: fail gracefully in handlers (circuit breaker), not in readiness probe. Readiness = "can I serve any traffic at all?" — not "are all my integrations perfect?" Separate critical from non-critical health explicitly.
- **Lesson:** Readiness probe should only fail if the pod cannot serve ANY traffic. Non-critical dependency failures belong in circuit breakers and graceful degradation, not readiness probes.

---

### 31.4 Health Check Authentication — Probe Blocked by Auth Middleware

- **What happens:** Auth middleware added to all routes — health check endpoint now returns 401 — K8s marks all pods as unhealthy — entire deployment taken down
- **Real pattern:** New auth middleware: `router.Use(authMiddleware)` applied globally. `/health` endpoint now requires `Authorization` header. K8s probe has no credentials. HTTP GET `/health` → 401 Unauthorized. K8s liveness probe: failing. All pods killed. Service taken down by its own auth middleware.
- **Scale trigger:** Adding auth middleware globally without excluding health/metrics endpoints, security hardening applied too broadly
- **Symptoms:** Entire service taken down immediately after auth middleware deployment, all pods in CrashLoopBackOff, health endpoints returning 401
- **Solution:** Health and metrics endpoints must be exempt from auth middleware: `router.GET("/health", healthHandler)` registered before auth middleware. Or: separate router for internal endpoints (health, metrics, debug) on different port (`:9090`) not exposed externally — no auth needed on internal port. Never apply auth middleware globally without explicit exceptions for health/metrics.
- **Lesson:** Health check, readiness, and metrics endpoints must never require authentication. Register them before auth middleware or on a separate internal port. Auth middleware must have an explicit exception list.

---

### 31.5 Cascading Unhealthy — Health Check Dependency Chain

- **What happens:** Service A health check calls Service B. Service B health check calls Service C. Service C goes down. B unhealthy. A unhealthy. Three services marked unhealthy due to one downstream dependency — load balancer removes all three
- **Real pattern:** `api-service /health` → calls `order-service /health` → calls `db-service /health` → DB down. `db-service`: unhealthy. `order-service /health`: fails because db-service unhealthy. `api-service /health`: fails because order-service unhealthy. Load balancer removes all three. Only DB is actually down.
- **Scale trigger:** Health checks that call downstream service health endpoints, deep health check dependency chains
- **Symptoms:** Single component failure cascades to mark multiple healthy services as unhealthy, over-removal from load balancer, reduced capacity beyond actual failure scope
- **Solution:** Health checks must only check the local component's ability to function — never call downstream services. `order-service /health`: can I reach MY database? Is MY connection pool alive? Not: is the service I call healthy? Downstream health is that service's load balancer's concern. Local health only.
- **Lesson:** Health check chains multiply failures. A health check that tests downstream services is a distributed health check — it fails when any downstream fails, regardless of local health. Health checks must be locally scoped only.

---

## Part 32 — Traffic Management Failures

### 32.1 Weighted Routing Misconfigured — All Traffic to New Version

- **What happens:** Canary configured to send 5% to v2 — misconfiguration sends 100% to v2 — v2 has a critical bug — full user impact instead of 5% impact
- **Real pattern:** Istio VirtualService: `weight: 95` for v1, `weight: 5` for v2. Config applied incorrectly — values swapped in YAML: `weight: 5` for v1, `weight: 95` for v2. v2 has payment bug. 95% of users hit buggy v2 instead of 5%. Full scale incident instead of controlled canary test.
- **Scale trigger:** YAML config with easy-to-swap values, insufficient review of traffic config changes, no automated validation
- **Symptoms:** Error rate immediately at scale instead of 5%, full incident instead of canary detection, weight inversion not caught until traffic anomaly detected
- **Solution:** Validate traffic weight config before apply: `kubectl diff` before apply, CI validation that weights sum to 100 and canary % matches expected (e.g., max 10% for new version by policy). Automated canary promotion tool (Flagger, Argo Rollouts) that manages weights automatically — removes human YAML editing from the critical path. Alert on error rate from new version > N% immediately after weight change.
- **Lesson:** Manual YAML editing of traffic weights is error-prone. Automate canary weight management with tools that validate and gradually increment — remove humans from the hot path of traffic configuration.

---

### 32.2 Sticky Session Bias — Uneven Load Distribution

- **What happens:** Sticky sessions configured for Socket.IO — large enterprise client with 5,000 users all hashed to instance 3 — instance 3 at 300% load while instances 1 and 2 at 30%
- **Real pattern:** Sticky sessions by IP hash. Enterprise uses NAT gateway — all 5,000 employees appear as one IP to the load balancer. All 5,000 stick to instance 3. Instance 3: OOM. Instances 1, 2: idle. Load balancer shows 33% traffic per instance (by connection count) but instance 3 has 5,000 active users vs 50 on others.
- **Scale trigger:** Enterprise clients behind NAT, large user groups from single IP, any IP-hash sticky session configuration
- **Symptoms:** One instance OOM/high CPU while others idle, sticky sessions not distributing by user count — only by source IP
- **Solution:** Cookie-based stickiness instead of IP-hash: first request assigned to instance, cookie set (`SERVERID=instance-3`). Subsequent requests use cookie — each user individually assigned. Enterprise behind NAT: 5,000 users spread across all instances. Load balancer: ALB with cookie-based stickiness, Nginx `ip_hash` → Nginx `sticky cookie`.
- **Lesson:** IP-hash sticky sessions fail for users behind NAT or corporate proxies. Cookie-based stickiness assigns per user, not per IP — it's the only correct sticky session approach for user-facing services.

---

### 32.3 Circuit Breaker State Not Shared — Per-Instance Open/Closed

- **What happens:** Circuit breaker state stored in process memory — 10 service instances each have independent circuit state — one instance opens circuit, 9 others still forward to failing downstream
- **Real pattern:** `gobreaker.CircuitBreaker` in Go, one per process. Downstream `payment-service` failing. Instance 1: 5 failures → circuit opens, routes to fallback. Instances 2–10: no failures yet (or fewer) → still forwarding to failing payment-service. 90% of traffic still hitting the broken downstream.
- **Scale trigger:** Horizontal scaling of services with in-process circuit breakers, downstream service failure
- **Symptoms:** Circuit breaker opens on some instances but not others, 90% of traffic still hitting failing downstream, partial protection only
- **Solution:** Options: (1) Accept per-instance circuit breakers — each instance learns independently (fast, eventually all open). (2) Shared circuit state in Redis: counter of recent failures shared across instances, all open/close together. (3) Service mesh circuit breaker (Istio `outlierDetection`) — operates at the mesh layer, shared across all instances automatically. For most cases: per-instance is acceptable — all instances learn within one failure window.
- **Lesson:** Per-instance circuit breakers offer partial protection during the learning window. For faster global protection: service mesh circuit breaker or shared state. Evaluate whether per-instance learning window is acceptable for your failure tolerance.

---

### 32.4 Header Propagation Lost — Tracing and Feature Flags Broken

- **What happens:** Service B calls Service C without forwarding `X-Request-ID`, `traceparent`, and feature flag headers — tracing chain broken, user's active feature flags not applied in Service C
- **Real pattern:** Gateway sets `X-Request-ID: abc123` and `X-Feature-Flags: checkout-v2=true`. Service A: reads headers, passes to handler. Service A calls Service B: uses `http.NewRequest()` without copying headers. Service B calls Service C: headers gone. Service C: no trace context, default feature flags (not the user's flags). Trace: shows gap between A and C. Feature: checkout-v2 not applied in C.
- **Scale trigger:** Any inter-service call that creates a new HTTP request without explicit header propagation
- **Symptoms:** Broken distributed traces (gap between services), feature flags not applied consistently across service chain, A/B tests showing inconsistent behavior
- **Solution:** Propagate all tracing and context headers at every hop. Create a middleware/utility function: `copyContextHeaders(incoming *http.Request, outgoing *http.Request)` that copies `traceparent`, `tracestate`, `X-Request-ID`, `X-Correlation-ID`, `X-Feature-Flags`, `X-User-ID`. Use OpenTelemetry automatic context propagation — `otel.GetTextMapPropagator().Inject(ctx, carrier)` handles tracing headers automatically.
- **Lesson:** Headers are not automatically forwarded between services — they must be explicitly propagated at every hop. Create a standard header-forwarding utility used by all service clients. Missing propagation breaks tracing and context-dependent behavior silently.

---

### 32.5 Traffic Mirroring to Production Database

- **What happens:** Shadow traffic enabled for new service — shadow service connected to production read replica — shadow service's read queries appear in production slow query log, impact production query performance
- **Real pattern:** `checkout-service-v2` receives 100% mirrored traffic. Reads from production Postgres read replica to compare responses with v1. 2× read query load on production DB (mirrored + real traffic). During high traffic: read replica saturated. Production read performance degrades. Shadow testing causes production degradation.
- **Scale trigger:** Shadow traffic at 100%, production-connected shadow services, high-traffic testing periods
- **Symptoms:** Read replica CPU doubling after shadow enabled, production query latency increasing, shadow traffic not isolated from production resources
- **Solution:** Shadow services must use isolated infrastructure: dedicated read replica for shadow traffic only, separate from the replica serving production reads. Or: use production data snapshots restored to shadow DB (slightly stale but isolated). Mirror percentage: 10% not 100% until shadow DB capacity validated. Shadow ≠ production — resources must be separate.
- **Lesson:** Shadow services sharing production read replicas double the read load — shadow testing causes the production impact you're trying to avoid. Shadow infrastructure must be isolated from production infrastructure.

---

## Part 33 — Database Migration Strategy Failures

### 33.1 Long-Running Transaction Blocking All DDL

- **What happens:** `ALTER TABLE` migration runs, acquires AccessExclusiveLock, waits for one long-running transaction to finish — every new query on that table queues behind the DDL — table effectively locked for minutes
- **Real pattern:** Migration: `ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50)`. Requires `AccessExclusiveLock`. Long-running report query (5 minutes) holds `AccessShareLock`. Migration waits. All new queries on `orders` queue behind the waiting migration. 1000 queries queue. Report finishes: migration runs (1 second). But 1000 queries that queued during wait all execute simultaneously: DB overwhelmed.
- **Scale trigger:** Long-running queries (reports, batch jobs), DDL migrations on busy tables
- **Symptoms:** Table lock for duration of longest running query, cascade of queued queries after lock releases, brief DB overwhelm post-migration
- **Solution:** Set `lock_timeout` on migration session: `SET lock_timeout = '2s'`. If can't acquire lock in 2 seconds, retry later. Prevents long queue accumulation. Kill long-running queries before migration: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '1 minute' AND state = 'active'`. For index creation: `CREATE INDEX CONCURRENTLY` never blocks reads.
- **Lesson:** DDL on a busy table doesn't just pause the table — it causes a queue of waiting queries to pile up behind the lock. Set `lock_timeout` to fail fast and retry rather than holding a queue hostage.

---

### 33.2 Data Backfill Locking Table for Hours

- **What happens:** `UPDATE orders SET region = 'EU' WHERE country IN ('DE', 'FR', 'IT')` run against 50M row table — single transaction, table scan, row locks on 30M rows — table effectively write-blocked for 3 hours
- **Real pattern:** Single UPDATE statement on 50M rows. Postgres: entire statement runs in one transaction. Locks rows as it scans. Other writers queue. 3 hours to complete. 3 hours of write degradation on the orders table.
- **Scale trigger:** Large tables, bulk backfill migrations, single-transaction DML on millions of rows
- **Symptoms:** Write latency spike for duration of backfill, lock wait timeout errors for other writers, prolonged degradation during business hours
- **Solution:** Batch updates with sleep: `UPDATE orders SET region='EU' WHERE id IN (SELECT id FROM orders WHERE country IN ('DE','FR','IT') AND region IS NULL LIMIT 1000)` in a loop with `pg_sleep(0.1)` between batches. 1000 rows at a time, 100ms sleep = locks released between batches, other writers get turns. Total time: longer but zero impact on production.
- **Lesson:** Single-transaction bulk updates on large tables are table-locking operations. Batch updates (1000 rows, sleep 100ms) have the same end result with near-zero production impact. Always batch large DML.

---

### 33.3 Migration Rollback Impossible — No Down Migration

- **What happens:** Migration adds NOT NULL column, removes old column — bugs found — rollback attempt fails because down migration not written — stuck on new version or data loss on rollback
- **Real pattern:** Up migration: `ALTER TABLE orders ADD COLUMN new_status VARCHAR(20) NOT NULL DEFAULT 'pending'; ALTER TABLE orders DROP COLUMN old_status`. Bug found in `new_status` logic. Down migration: `ALTER TABLE orders ADD COLUMN old_status... DROP COLUMN new_status`. Problem: `old_status` data is gone — it was in the dropped column. Rollback = data loss or impossible.
- **Scale trigger:** Destructive migrations without rollback plan, missing down migration files
- **Symptoms:** Migration is one-way, rollback impossible without data loss, stuck between versions during incident
- **Solution:** Write down migrations for every up migration before merging. Test them. Avoid destructive up migrations that make rollback data-lossy: instead of dropping old column, keep it (mark as deprecated). Only drop old column in a follow-up migration after full verification. Rollback window = time between up deploy and old column drop deploy.
- **Lesson:** Every migration needs a tested down migration. Destructive operations (DROP COLUMN) close the rollback window permanently. Delay destructive cleanup until the new version is fully verified.

---

### 33.4 ORM Auto-Migration in Production — Unreviewed Schema Change

- **What happens:** ORM's `AutoMigrate` / `syncdb` runs on service startup in production — model change in code automatically alters production schema — unreviewed DDL runs against production data
- **Real pattern:** GORM `db.AutoMigrate(&Order{})` called in `main()`. Developer adds struct field. Deploy to production. AutoMigrate runs `ALTER TABLE orders ADD COLUMN new_field`. No review, no staging validation, no migration file tracked in version control. On another deploy: field renamed in struct — AutoMigrate adds new column, old column stays (GORM doesn't drop). Schema drift accumulates.
- **Scale trigger:** Any ORM auto-migration in production, developer convenience features enabled in production config
- **Symptoms:** Unreviewed schema changes applied to production, schema drift from ORM not removing old columns, migration audit trail nonexistent
- **Solution:** Disable ORM auto-migration in production — always. Use explicit migration files (golang-migrate, Flyway, Liquibase). Every schema change: reviewed, tested in staging, version-controlled, applied explicitly. ORM auto-migration: development convenience only. Production schema is too important for automatic changes.
- **Lesson:** Auto-migration in production is unreviewed DDL running against your most critical data. It is always disabled in production. Explicit, versioned, reviewed migration files are the only acceptable approach.

---

### 33.5 Missing Index After Migration — Silent Performance Regression

- **What happens:** Migration adds new column used in WHERE clauses — no index added — queries work correctly but are slow — full table scan on 10M rows for every query on new column
- **Real pattern:** `ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50)`. New feature: `SELECT * FROM orders WHERE promo_code = 'SUMMER20'`. Missing index: sequential scan of 10M rows. Latency: 800ms per query. With index: 2ms. 400× performance regression. Not caught in testing (test DB has 1000 rows — fast either way).
- **Scale trigger:** New query patterns on new columns, testing with small datasets that don't reveal scan performance, index omission in migration
- **Symptoms:** New feature works correctly but slowly, latency spike on new endpoint, `EXPLAIN ANALYZE` shows `Seq Scan` on large table
- **Solution:** Migration checklist: for every new column that will be queried: add index in same migration. Use `CREATE INDEX CONCURRENTLY` (non-blocking). Review `EXPLAIN ANALYZE` in staging with production-volume data before releasing feature. Performance testing with production-realistic data volumes is mandatory for new query patterns.
- **Lesson:** A column without an index is a full table scan waiting to happen. Every migrated column that will be queried needs a concurrent index added in the same migration. Test query plans with production-volume data.

---

## Part 34 — Incident Command Failures

### 34.1 No Incident Commander — Too Many Cooks

- **What happens:** P1 incident: 8 engineers in war room, all making changes simultaneously — competing theories, simultaneous fixes applied, impossible to correlate which change caused what effect
- **Real pattern:** Payment service down. 8 engineers join incident call. Engineer 1 restarts pods. Engineer 2 rolls back deploy. Engineer 3 changes DB config. Engineer 4 scales up replicas. All simultaneously. Which change helped? Which made it worse? Nobody knows. MTTR: 90 minutes to identify root cause in the noise.
- **Scale trigger:** High-severity incident, many senior engineers available, no defined incident response process
- **Symptoms:** Simultaneous changes make root cause impossible to isolate, conflicting actions taken, incident call chaotic with no clear decision authority
- **Solution:** Incident Commander role: one person makes all decisions, all changes go through them. IC doesn't debug — they coordinate. Roles: IC (coordinates, decides), Tech Lead (investigates, suggests), Comms (updates stakeholders), Scribe (logs timeline). Only one change at a time with a recovery window to observe effect before the next change. Clear handoff: "I am now IC."
- **Lesson:** A P1 incident without an incident commander is a chaos event. Assign IC immediately. IC is authoritative, not democratic. Parallel uncoordinated changes in an incident make diagnosis impossible.

---

### 34.2 Incident Communication Breakdown — Customers Informed Before Executives

- **What happens:** Major outage: status page updated publicly before internal escalation — CEO reads about outage on Twitter from a customer — learns of their own company's outage from social media
- **Real pattern:** On-call engineer: detects outage, updates status page immediately (correct for customers), keeps debugging. Doesn't page management. Doesn't send internal update. 30 minutes later: CEO phones CTO asking what's happening. CTO unaware. Executive team learning from public sources.
- **Scale trigger:** P1 outage, no defined escalation procedure, engineer focused on technical fix not communication
- **Symptoms:** Executive surprise during outage, no internal incident timeline, communications reactive not proactive, post-incident: "why didn't anyone tell us?"
- **Solution:** Incident communication matrix by severity: P1 (revenue-impacting): alert on-call → alert tech lead (5 min) → alert VP Engineering (10 min) → alert CEO/CTO (15 min) → customer status page (parallel). Use an incident management tool (PagerDuty Incidents, FireHydrant, Incident.io) with automatic escalation timers. Communication cadence: internal update every 15 min, external status page every 30 min.
- **Lesson:** Technical fix and communication are parallel tracks in an incident. Define escalation paths and timers before the incident. Executives should never learn about an outage from a customer.

---

### 34.3 Runbook Outdated — Wrong Fix Applied

- **What happens:** On-call follows runbook for "Redis connection exhaustion" — runbook says increase `maxclients` on Redis — real issue is connection pool in Go service not bounded — wrong fix applied, issue worsens
- **Real pattern:** Runbook written 18 months ago when Redis was the bottleneck. Since then: Go service changed to per-request connection creation. Now: 10,000 open connections from Go service. Runbook says increase Redis `maxclients` to 20,000. On-call increases limit. 20,000 connections now allowed. Go service creates them all. Redis OOM. Runbook made it worse.
- **Scale trigger:** Outdated runbooks, architectural changes not reflected in operational documentation, stale operational knowledge
- **Symptoms:** Runbook fix doesn't work or makes things worse, on-call following correct procedure getting wrong outcome, incident longer than necessary
- **Solution:** Runbooks must be reviewed and updated after every related incident and architecture change. "Runbook accuracy check" as standing item in post-mortem: does the runbook still reflect how the system works? Date-stamp runbooks. Alert if runbook > 6 months without review. Better: runbooks include diagnostic steps first (verify the symptom matches the runbook scenario) before remediation.
- **Lesson:** An outdated runbook is worse than no runbook — it gives false confidence. Runbooks are living documents that must be updated after every architectural change and every incident where the runbook was used.

---

### 34.4 Rollback Fear — Workaround Applied Instead

- **What happens:** Bad deploy identified — engineer afraid to rollback (might make things worse) — applies workaround config change instead — workaround addresses symptom not cause — second incident 2 days later
- **Real pattern:** Deploy introduced memory leak. Incident. Engineer: "if I rollback, the config changes from yesterday might conflict." Applies: `memory_limit: 4GB` (doubled). Memory leak still present. Service stable for 2 days. Memory fills 4GB: second incident. Root cause (leaked deploy): still running. Each workaround buys days, not fixes.
- **Scale trigger:** Fear of rollback, complex deploy with mixed changes, no tested rollback procedure
- **Symptoms:** Workarounds layered on top of root cause, recurring incidents from same cause, system in an unknown state mixing workarounds
- **Solution:** Rollback must be practiced, fast, and the default response to a bad deploy. Blue-green/canary make rollback instant. Immutable image tags make rollback deterministic: `docker service update --image app:git-abc123` (previous known-good SHA). Practice rollback in game days. Remove fear by making rollback routine and low-risk.
- **Lesson:** Rollback fear leads to workarounds that accumulate debt. Rollback should be fast (< 5 minutes), rehearsed, and the default first response to a bad deploy. The worst outcome of a rollback is starting from a known-good state.

---

### 34.5 Post-Incident Review Blame — Engineers Hide Future Incidents

- **What happens:** Post-mortem culture is blame-oriented — engineer who caused outage is named, faces consequences — engineers start hiding incidents, not escalating, fixing quietly to avoid blame
- **Real pattern:** Post-mortem: "Engineer X's deploy caused the outage." X put on performance improvement plan. Result: team learns that causing an incident has personal consequences. Next incident: engineer who caused it spends 30 minutes quietly trying to fix it before escalating. MTTR doubles. Hidden incidents happen that never get documented or fixed.
- **Scale trigger:** Non-blameless post-mortem culture, punitive response to incidents, HR involvement in technical post-mortems
- **Symptoms:** Engineers slow to escalate incidents (fixing quietly), near-misses not reported, post-mortems lack honest root cause analysis (people hiding contributing factors)
- **Solution:** Blameless post-mortems (Google SRE, Etsy): systems and processes are blamed, never individuals. "How did our system allow this to happen?" not "who caused this?" Engineers are rational actors making decisions with the information available at the time. Psychological safety: engineer who escalates quickly is praised, not punished. Hiding incidents: unacceptable and addressed separately.
- **Lesson:** Blame-oriented post-mortems don't just feel bad — they actively make systems less safe by creating incentives to hide incidents. Blameless culture produces honest analysis that prevents recurrence. Safety requires people to speak up.

---

## Part 35 — Capacity Planning Failures

### 35.1 Capacity Planning Based on Current Traffic — No Growth Model

- **What happens:** Infrastructure sized for current 1000 req/sec — 6 months later: 3000 req/sec — infrastructure at 300% — scramble to scale under live traffic
- **Real pattern:** January: 1000 req/sec, 10 pods provisioned. Team: "we're at 30% utilization, we're fine." No growth model. July: product launch, 3× traffic overnight. Pods at 100% CPU. Autoscaler trying to scale but node pool exhausted. New nodes: 10-minute provision time. 30 minutes of degradation while scaling.
- **Scale trigger:** Product launches, seasonal spikes, viral growth, marketing campaigns without infrastructure pre-planning
- **Symptoms:** Reactive scaling during live traffic spikes, degradation during provisioning, engineering firefighting during business critical moments
- **Solution:** Capacity planning = traffic forecast × resource per request. Forecast: historical growth rate + planned events (launches, campaigns). Provision headroom: 3× current peak capacity as target baseline. Pre-scale before known events: `kubectl scale deployment api --replicas=50` before marketing campaign. Node pool pre-warming: warm nodes take seconds to add pods; cold nodes take minutes.
- **Lesson:** Capacity planning is forecasting, not monitoring. Current utilization tells you where you are; growth model tells you where you're going. Plan for 3× current peak and pre-scale before known demand spikes.

---

### 35.2 Autoscaler Lag — Scale-Up Slower Than Traffic Spike

- **What happens:** HPA scales on CPU metric — CPU rises → HPA detects → new pods scheduled → node capacity available → pod starts → warmup → ready. Total: 5–8 minutes. Traffic spike duration: 3 minutes. Spike resolved before autoscaler finishes.
- **Real pattern:** Flash sale: 10× traffic spike, 3 minutes. HPA detects CPU > 70% at 30s. Schedules new pods at 60s. Pod pending (node needs scaling): 3 minutes. Node ready: 4 minutes. Pod starts, warms up: 5 minutes. Traffic spike over at 3 minutes. Autoscaler never helped — arrived after the storm.
- **Scale trigger:** Short traffic spikes, autoscaler lag from pod scheduling + node provision + warmup
- **Symptoms:** Autoscaler scaling up after spike already resolved, degradation during spike despite autoscaler configured, autoscaler metric shows correct detection but incorrect timing
- **Solution:** Proactive scaling strategies: (1) Pre-scale before known events. (2) Scale on leading indicators: queue depth (scales before CPU maxes), RPS rate-of-change (scales on trend not current). (3) Maintain warm standby pods: keep minimum replicas high enough to absorb typical spikes. (4) KEDA event-driven scaling: scales on queue depth immediately, not CPU lag.
- **Lesson:** HPA on CPU is a lagging indicator — it responds after the problem has already arrived. Scale on leading indicators (queue depth, RPS trend) or pre-scale for known demand events.

---

### 35.3 Cascading Quota Exhaustion — Cloud Provider Limits

- **What happens:** Traffic spike triggers autoscaler — autoscaler requests 50 new EC2 instances — AWS account vCPU quota (200) already at 180 — only 20 instances provisioned — not enough to handle load — service still degraded
- **Real pattern:** AWS account default vCPU limit: 200. Running: 180 vCPUs. HPA requests 50 new pods × 2 vCPU = 100 vCPU. AWS: 20 vCPU available. 10 pods provisioned instead of 50. Load not absorbed. Service at 80% of needed capacity. Team discovers limit during incident.
- **Scale trigger:** Rapid autoscaling, cloud provider account quotas not pre-requested for peak capacity
- **Symptoms:** Autoscaler scales but not to requested replica count, pending pods that never become nodes, capacity ceiling hit at cloud provider account level
- **Solution:** Audit cloud provider quotas before they become a bottleneck. For AWS: EC2 vCPU limits, EIP limits, ELB listener limits, Security Group rule limits. Request quota increases proactively (before needed) — increases take 1–3 days to process. Set alerts when utilization reaches 70% of quota. Multi-region failover as quota ceiling escape valve.
- **Lesson:** Cloud provider quotas are invisible capacity ceilings. Audit them proactively, request increases before you need them, and set alerts at 70% utilization. Discovering quota limits during an incident is too late.

---

### 35.4 Memory Overcommit — Nodes OOM Killing Pods at Random

- **What happens:** K8s nodes have 32 GB RAM. Pod `requests: memory: 1Gi`. 35 pods scheduled on node (35 GB requested > 32 GB available). Kubernetes allows this (overcommit). Under load, pods use more than requested — node hits 32 GB — Linux OOM killer selects pods to kill at random
- **Real pattern:** Requests set low (1 GB) to fit more pods per node. Limits set high (4 GB). Scheduler: sees 1 GB requested, schedules 35 pods. Under load: pods use 2–3 GB each. Node: 35 × 2.5 GB = 87 GB demand on 32 GB node. OOM killer fires. Kills random pods. Pods restart. Restart loops.
- **Scale trigger:** Low memory requests relative to actual usage, K8s memory overcommit, traffic spike increasing per-pod memory usage
- **Symptoms:** Random pod OOM kills during load spikes, pods killed that appear healthy (OOM from node level, not pod limit), non-deterministic failures
- **Solution:** Set requests = actual p95 memory usage (from monitoring). Requests determine scheduling — they must reflect real needs. Requests and limits should be close (within 2×): large gap between request and limit enables dangerous overcommit. For critical services: `requests = limits` (Guaranteed QoS class — never OOM killed except when exceeding own limit).
- **Lesson:** K8s memory requests are scheduler inputs, not suggestions. Low requests enable dangerous overcommit — pods are scheduled onto nodes that can't support their actual usage. Set requests from actual measured usage.

---

### 35.5 No Capacity for Testing — Staging Under-Resourced by 10×

- **What happens:** Staging has 1/10 production resources — load test in staging shows service handles 1000 req/sec — production resources are 10× — actual production capacity unknown until production load test (which nobody runs)
- **Real pattern:** Staging: 2 pods, 1 CPU each. Production: 20 pods, 2 CPU each. Load test staging: 1000 req/sec capacity. Team assumes: production = 10× = 10,000 req/sec. Actual production: 10 pods × 2 CPU (not linear) ≈ 8,000 req/sec (connection pool bottleneck, not CPU). At 9,000 req/sec: degradation. Discovered during Black Friday.
- **Scale trigger:** Staging/production resource ratio mismatch, non-linear scaling assumptions, untested production capacity
- **Symptoms:** Load test results don't translate to production, capacity discovered during production events, non-linear bottlenecks invisible at staging scale
- **Solution:** Run load tests in production (during low-traffic windows, with feature flags gating test traffic). Or: production-scale staging (expensive but accurate). Test in staging: validate behavior, not capacity. Capacity: measure in production at low traffic, extrapolate with bottleneck analysis. Connection pool limits, DB connections, and external API rate limits are bottlenecks that only appear at production scale.
- **Lesson:** Staging-sized load tests measure staging capacity. Production capacity can only be measured in production or in production-scale staging. Run production load tests during low-traffic windows before relying on capacity assumptions.

---

## Part 36 — Production Forensics

### 36.1 Heisenbug — Bug Disappears When Debugging

- **What happens:** Race condition bug manifested as sporadic 500 errors in production — reproduce in staging with added logging — logging changes timing, race condition disappears — "works fine in staging"
- **Real pattern:** Race condition: goroutine A reads shared map, goroutine B writes simultaneously. Timing window: 5 microseconds. Adding `log.Printf` statements: each log call adds ~10 microseconds overhead. Race condition timing window: eliminated by logging overhead. Bug: can't reproduce with logging enabled, doesn't appear without logging.
- **Scale trigger:** Race conditions with tight timing windows, production-only concurrency (higher traffic → higher goroutine contention)
- **Symptoms:** Production errors that disappear in staging, "can't reproduce," errors correlate with concurrency level, timing-sensitive behavior
- **Solution:** Go race detector: `go run -race main.go` — instruments memory accesses, detects race conditions without needing to reproduce the exact timing. Run production binary with `-race` in staging at production traffic level. Continuous profiling: collect goroutine traces from production without adding per-operation logging. Structured approach: use sync primitives (`sync.RWMutex`, `sync/atomic`) on shared state — don't rely on timing being correct.
- **Lesson:** Heisenbugs are often race conditions. The Go race detector finds them statically without requiring timing reproduction. Run the race detector on production-realistic concurrency in staging. Never rely on logging to observe race conditions.

---

### 36.2 The Gradual Degradation — Six Months to OOM

- **What happens:** Service memory grows 10 MB/week — so slow it never triggers alerts — after 6 months: 240 MB over baseline — service OOM killed — nobody connects it to the gradual growth
- **Real pattern:** Memory baseline: 500 MB. Alert threshold: > 1 GB (doesn't alert). Week 1: 510 MB. Week 26: 750 MB. Week 50: 1,000 MB — alert fires for first time. By this point: the leak has been running for a year. Root cause: goroutine leak from abandoned HTTP client connections, but the connection between memory growth and HTTP clients is not obvious after 50 weeks.
- **Scale trigger:** Slow leaks below alerting thresholds, memory growth rate vs alert threshold gap
- **Symptoms:** Memory growing slowly but never triggering point-in-time alerts, OOM eventually, root cause difficult to connect to months-old code changes
- **Solution:** Alert on rate of change not just absolute value: `rate(process_resident_memory_bytes[1h]) > threshold` — alert if memory growing faster than X MB/hour regardless of absolute value. Weekly memory baseline comparison: plot memory as week-over-week delta. Continuous profiling (Pyroscope, Parca) records heap profiles over time — can compare heap from 6 months ago to today to find accumulating allocations.
- **Lesson:** Point-in-time alerts miss gradual leaks. Alert on rate of change. Continuous profiling builds a history of allocation patterns — invaluable for diagnosing slow leaks months after introduction.

---

### 36.3 Third-Party SDK Leak — Not Your Code, Your Problem

- **What happens:** Memory leak in third-party analytics SDK — SDK spawns goroutines that never exit — updated SDK version fixes it — but team assumes "our code is fine" for weeks
- **Real pattern:** `analytics.TrackEvent(event)` from SDK starts goroutine to send HTTP async. SDK bug: goroutine waits for response that never comes (wrong timeout config in SDK). 1000 events/sec × leaked goroutine = 1000 goroutines/sec. After 10 minutes: 600,000 leaked goroutines. OOM.
- **Scale trigger:** High-frequency SDK calls, third-party SDKs with goroutine/thread management bugs
- **Symptoms:** Goroutine count growing proportional to event tracking calls, memory growth without obvious internal leak, `pprof` goroutine dump shows all goroutines in third-party SDK code
- **Solution:** `pprof` goroutine dump is the first diagnostic: `GET http://service:6060/debug/pprof/goroutine?debug=2` — shows all goroutine stack traces, grouped by source. Third-party SDK goroutines visible immediately. Vendor audit: review all third-party SDKs for goroutine/resource management. Pin SDK versions. Monitor CVE feeds for SDK updates. Wrap SDK calls with context timeouts.
- **Lesson:** Third-party SDKs run in your process and their bugs are your incidents. `pprof` goroutine dumps immediately reveal which code owns leaked goroutines — including third-party. Audit SDK resource management before adoption.

---

### 36.4 Clock Skew Between Services — Signature Validation Failure

- **What happens:** JWT expiry validation fails intermittently — some service instances show expired tokens 2 minutes before they actually expire — NTP sync not configured on new nodes
- **Real pattern:** New EC2 nodes added to autoscaling group. NTP not configured in AMI. Nodes: clock drifts 3 minutes in 24 hours. Service validating JWTs: `if token.ExpiresAt < time.Now()` — uses drifted clock. 3-minute token appears expired 3 minutes early. Users logged out randomly. Only some nodes affected (those with drifted clocks). Intermittent, seemingly random auth failures.
- **Scale trigger:** New nodes without NTP configuration, any system relying on wall clock for security decisions
- **Symptoms:** Intermittent auth failures, random user logouts, failures correlate with specific pods (the ones with drifted clocks), "it works if you refresh"
- **Solution:** Enable and verify NTP on all nodes (AWS: `chrony` in Amazon Linux 2 / `timesyncd` in Ubuntu). Alert on clock drift > 1 second. For JWT validation: add clock skew tolerance: `leeway: 30 * time.Second` — accept tokens expired up to 30 seconds ago. Cross-service timestamps: use UTC everywhere, log clock offset for debugging.
- **Lesson:** Clock skew causes intermittent, hard-to-diagnose auth failures. Verify NTP on all new nodes. Add explicit clock skew tolerance in time-based validation logic. Clock drift is infrastructure hygiene.

---

### 36.5 Duplicate Event ID — Idempotency Key Collision

- **What happens:** Idempotency key generated from timestamp + random: `2024-01-15-abc123` — under load, two concurrent requests generate identical key (same millisecond, same random seed) — second request returns first request's response — wrong order confirmed
- **Real pattern:** Idempotency key: `time.Now().UnixMilli() + rand.Intn(1000)`. Under 10,000 concurrent requests: birthday problem — collision likely. Two order requests get same idempotency key. Second: returns first order's response (idempotency cache hit). Customer 2 sees customer 1's order. Order 2 never created.
- **Scale trigger:** High concurrency, weak idempotency key generation, birthday problem at scale
- **Symptoms:** Customers receiving each other's order confirmations, orders silently not created (idempotency cache serves wrong response), rate of collision grows with concurrency
- **Solution:** Idempotency keys must be globally unique: `uuid.New()` (UUID v4 = 122 bits of randomness, collision probability negligible) or `ulid.Make()` (sortable + unique). Never generate idempotency keys from timestamp alone or timestamp + small random. Client generates idempotency key and sends it in request header — server stores key → response mapping.
- **Lesson:** Idempotency keys must be cryptographically unique. UUID v4 provides negligible collision probability at any realistic scale. Timestamp-based or sequential keys invite birthday-problem collisions under concurrency.