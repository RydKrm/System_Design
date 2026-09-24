# Microservices — Complete Study & Failure Cases (Volume 3)

> 12 Parts · 66 Cases — Deep-dive patterns covering rate limiting, backpressure, service identity, data pipeline failures, SLA engineering, cost optimization, team topology failures, and advanced production war stories.

---

## Part 21 — Rate Limiting & Throttling Failures

### 21.1 Rate Limiting Per Instance — Not Global

- **What happens:** Rate limiter allows 100 req/min per user — but limit is tracked in-process per instance — with 10 instances, user can make 1000 req/min total (100 × 10 instances)
- **Real pattern:** `limiter := rate.NewLimiter(rate.Every(time.Minute/100), 1)` stored in Go process memory. 10 API pods, each with own limiter. User sends 100 requests to each pod (round-robin) = 1000 requests allowed. Rate limit is 10× higher than intended.
- **Scale trigger:** Horizontal scaling of any service with in-process rate limiter, any load-balanced service
- **Symptoms:** Rate limit violations by determined users, abuse patterns not caught, protection goal unmet
- **Solution:** Centralized rate limiting with Redis: `INCR ratelimit:user:123:minute` with `EXPIRE ratelimit:user:123:minute 60`. Atomic increment + check in single Lua script. All instances share the same counter. Or use a dedicated rate limit service (Kong Rate Limiting plugin, Envoy global rate limit service). Per-instance limiters only work for protecting the instance itself (e.g., connection limits), not for enforcing business quotas.
- **Lesson:** In-process rate limiters are per-instance counters. Any rate limit that is a business or security policy must be centralized — Redis atomic counters are the standard implementation.

---

### 21.2 Rate Limit Bypass via Header Spoofing

- **What happens:** Rate limiting based on `X-Forwarded-For` IP — client sends forged `X-Forwarded-For` header with different IP on each request — bypasses rate limit entirely
- **Real pattern:** Nginx extracts client IP from `X-Forwarded-For` header for rate limiting. Attacker sends: `X-Forwarded-For: 1.2.3.4`, next request: `X-Forwarded-For: 1.2.3.5`, next: `1.2.3.6`. Nginx reads attacker-supplied IP, treats each as different client. Rate limit: never triggered.
- **Scale trigger:** Any rate limiting based on client-supplied headers, any system behind a proxy or load balancer
- **Symptoms:** Rate limit alerts never fire despite abuse, one client making unlimited requests, rate limit dashboard showing many unique IPs that are all the same attacker
- **Solution:** Use the actual connection IP (set by the load balancer or proxy), not the `X-Forwarded-For` header value from the client. If behind a trusted proxy, read the LAST IP in `X-Forwarded-For` that the proxy appended — not the first (which the client controls). For authenticated APIs, rate limit on user ID or API key, not IP — these can't be spoofed.
- **Lesson:** Client-controlled headers cannot be trusted for rate limiting. Limit by authenticated identity (user ID, API key) or connection IP as set by the trusted proxy layer — not by headers the client can forge.

---

### 21.3 Hard Rate Limit Without Retry-After — Client Retry Storm

- **What happens:** Service returns `429 Too Many Requests` with no `Retry-After` header — clients immediately retry, generating more 429s, exponential retry storm
- **Real pattern:** Client library: `if status == 429 { retry() }`. No backoff, no `Retry-After`. Server returns 429, client retries immediately, gets 429, retries, gets 429 — at full speed. Client generates 10× more requests during rate limit than it did before being rate limited.
- **Scale trigger:** Any rate-limited API with clients that have immediate retry logic
- **Symptoms:** Rate-limited clients make MORE requests than before limit triggered, rate limit prevents itself from being effective, cascading 429s
- **Solution:** Always include `Retry-After: <seconds>` or `X-RateLimit-Reset: <unix_timestamp>` in 429 responses. Good client libraries respect `Retry-After` and wait the specified time. For internal services: return `Retry-After` and document it. For external APIs: enforce it and add to API documentation as contract.
- **Lesson:** A rate limit without `Retry-After` is a rate limit that invites retry storms. Always tell clients when they can retry — this is part of the rate limiting contract.

---

### 21.4 Quota Leak — Usage Not Decremented on Failure

- **What happens:** API quota decremented when request starts, not when it succeeds — failed requests still consume quota — users exhaust their daily quota on errors they can't control
- **Real pattern:** User has 1000 API calls/day. Each call: `quota.Decrement(userID)` at request start. Service downstream fails: user gets 500 error AND loses 1 API call from quota. User hits 1000 errors (service outage) = exhausted quota for the day. Can't make real requests until midnight.
- **Scale trigger:** Service outages, downstream failures, any error rate > 0 with pre-decrement quota
- **Symptoms:** Users exhausting quota during service outages, complaints about quota consumed by errors, customer support tickets from valid users locked out
- **Solution:** Decrement quota only on successful responses (2xx). For quota tracking: `quota.Decrement()` in success path only. Or: pre-decrement + refund on error: `quota.Decrement()` then `defer func() { if err != nil { quota.Refund() } }()`. Design: quota counts successful operations, not attempts.
- **Lesson:** Quota should measure successful consumption, not attempts. Pre-decrement without refund on failure penalizes users for errors outside their control.

---

### 21.5 Throttling Asymmetry — Write vs Read Rate Limits Identical

- **What happens:** Read and write endpoints share the same rate limit — 100 req/min. User reads 90 records (lightweight), tries to write 10 (expensive) — write blocked by read consumption of the shared quota
- **Real pattern:** Rate limit bucket: 100 req/min total. `GET /data` (cheap, read-only) and `POST /data` (expensive, triggers async job) share bucket. User doing valid monitoring (90 GETs/min) exhausts quota, can't POST. Or: attacker floods GETs to block user's POSTs.
- **Scale trigger:** Mixed read/write APIs, different cost profiles per endpoint, users with both monitoring and transactional usage patterns
- **Symptoms:** Write operations blocked by read quota consumption, legitimate users unable to create/update because monitoring queries consumed quota
- **Solution:** Separate rate limit buckets per operation type: read bucket (1000 req/min), write bucket (100 req/min). Or cost-based rate limiting: GET costs 1 credit, POST costs 10 credits, bucket has 200 credits/min. Different endpoints have different cost weights reflecting their server-side expense.
- **Lesson:** Read and write operations have different cost profiles. Sharing a rate limit bucket between them allows cheap operations to starve expensive ones. Separate buckets or cost-weighted credits.

---

## Part 22 — Backpressure & Flow Control Failures

### 22.1 No Backpressure — Unbounded Queue Grows to OOM

- **What happens:** Fast producer (API gateway) pushes requests to slow consumer (order processor) — internal channel/queue grows without bound until OOM
- **Real pattern:** API receives 1000 req/sec. Order processor handles 100 req/sec. Internal buffered channel: `jobs := make(chan Order, 1000000)` (unbounded effectively). Queue grows by 900 items/sec. After 10 minutes: 540,000 items queued, 500 MB memory consumed, OOM kill. All queued orders lost.
- **Scale trigger:** Any producer faster than consumer over sustained period, any traffic spike sustained longer than queue buffer
- **Symptoms:** Memory growing monotonically under load, eventual OOM kill, all in-flight work lost on kill, queue depth metric growing linearly
- **Solution:** Bounded queue with explicit backpressure: `jobs := make(chan Order, 100)`. When full, sender receives backpressure: `select { case jobs <- order: default: return errors.New("service overloaded") }`. Return 503 to caller — let load balancer route to other instances or let client retry. Never buffer more work than you can process in a reasonable time.
- **Lesson:** Unbounded queues trade immediate failure for delayed OOM failure — the worst trade. Bounded queues with explicit backpressure fail fast and predictably. Fail at the edge, not in the middle.

---

### 22.2 Load Shedding Not Implemented — Serving Under Duress

- **What happens:** Service at 95% capacity receives traffic spike — tries to serve all requests, serves all of them slowly — p99 goes to 30s, all users get degraded experience instead of some users getting fast responses
- **Real pattern:** Normal: 500 req/sec, p99: 200ms. Spike: 2000 req/sec arrives. Service tries to serve all 2000. p99: 8000ms for everyone. Total work completed: 500 req/sec (still capacity limited) but all 2000 users wait 8 seconds instead of 500 users getting 200ms.
- **Scale trigger:** Any traffic spike beyond service capacity, marketing events, viral moments
- **Symptoms:** p99 latency grows proportionally with excess traffic, all users degraded instead of some users rejected, system appears overloaded for longer than spike duration
- **Solution:** Implement load shedding: reject excess requests with 503 when utilization exceeds threshold (80%). Serve the 500 requests you can handle well; return 503 to the remaining 1500 immediately. Users getting 503 know to retry. Users getting slow responses don't know when it'll end. Fast rejection > slow degradation. Use a token bucket at the service entry point.
- **Lesson:** A service that tries to serve every request under overload serves none of them well. Load shedding protects the service and gives some users a good experience instead of all users a terrible one.

---

### 22.3 Backpressure Not Propagated Upstream

- **What happens:** Worker queue full, worker returns backpressure error — API handler catches error and returns 200 to client anyway — client thinks request succeeded, work was never done
- **Real pattern:** `err := queue.Enqueue(order)` — returns `ErrQueueFull`. Handler: `if err != nil { log.Error(err); return c.JSON(200, "order received") }`. Client receives success. Order never processed. Customer placed order, got confirmation, order silently dropped.
- **Scale trigger:** Queue saturation, any overload scenario where the failure is swallowed
- **Symptoms:** Orders confirmed but never fulfilled, gap between order count in API logs and order count in processing logs, silent data loss under load
- **Solution:** Backpressure errors must propagate to the client: `ErrQueueFull` → HTTP 503 with `Retry-After: 5`. Never return success when work was not accepted. The contract: 2xx means the work was accepted. 503 means "I can't take this right now, retry later." Clients that retry on 503 are correct behavior.
- **Lesson:** Swallowed backpressure errors turn overload into silent data loss. Backpressure must propagate to the caller with a retryable error code. 2xx means work accepted, always.

---

### 22.4 Priority Queue Not Used — Low Priority Starves High Priority

- **What happens:** Password reset emails queue behind 10,000 marketing newsletters — user requesting password reset waits 2 hours while newsletters process
- **Real pattern:** Single RabbitMQ queue for all emails. Marketing campaign triggers 10,000 newsletter emails. Then user requests password reset email. FIFO queue: password reset email waits behind all 10,000 newsletters. Consumer processes 1 email/sec. User waits 2+ hours for password reset.
- **Scale trigger:** Mixed priority workloads on single queue, large batch jobs mixed with real-time user requests
- **Symptoms:** Time-sensitive operations (password reset, 2FA, order confirmation) delayed by batch processing, user-facing SLA violated by background jobs
- **Solution:** Separate queues by priority: `emails.high` (transactional: password reset, order confirmation, 2FA), `emails.low` (marketing, newsletters). Consumers: always drain `emails.high` first, process `emails.low` only when `emails.high` is empty. Or: priority queue with weight: 80% consumer capacity to high priority, 20% to low. Never mix latency-sensitive and batch workloads on the same queue.
- **Lesson:** All queues are FIFO by default. Batch jobs and real-time user requests must be separated. User-facing operations need dedicated queues with dedicated consumer capacity.

---

### 22.5 Timeout Mismatch — Parent Times Out Before Child Can Complete

- **What happens:** API gateway timeout: 5s. Service A timeout calling Service B: 4s. Service B timeout calling DB: 4s. DB query takes 3.9s — DB query completes. Service B returns at 4s. Service A received result, but gateway already timed out at 5s. Response discarded. Work done, result lost. DB write committed. Client retries. Duplicate.
- **Real pattern:** Cascading timeout budget: each layer must finish within the previous layer's remaining budget. Gateway (5s) → Service A (4s budget) → Service B (3s budget) → DB (2s budget). If Service A waits 4s for B, and gateway cuts at 5s, there's only 1s slack for the entire call chain. Any variance exceeds budget.
- **Scale trigger:** Multi-layer synchronous call chains with no coordinated timeout budget, any latency-sensitive chain
- **Symptoms:** Successful DB operations with client receiving timeout, duplicate processing on retry, inconsistent client-visible state vs actual state
- **Solution:** Cascading deadline propagation via context: Gateway creates `ctx` with 5s deadline. Passes to A. A's call to B: uses same context (remaining budget automatically enforced). Each hop respects remaining time, not a fresh timeout. In Go: `context.WithTimeout(parentCtx, ...)` — parent cancellation propagates to child. Budget consumed, not reset, at each hop.
- **Lesson:** Each layer should not reset the timeout clock — it should pass remaining budget downstream. Cascading context deadlines ensure that if the client gives up, all downstream work stops too.

---

## Part 23 — Service Identity & Trust Failures

### 23.1 Service Impersonation — No Mutual Authentication

- **What happens:** Attacker deploys rogue service claiming to be `payment-service` — other services trust the claim, route sensitive financial data to attacker
- **Real pattern:** `order-service` calls `http://payment-service` via DNS. Attacker compromises DNS or deploys a pod named `payment-service` in the cluster. No mTLS, no certificate validation. Order service sends payment data to attacker's service. Financial data exfiltrated.
- **Scale trigger:** Any K8s cluster without NetworkPolicy and mTLS, compromised DNS, rogue pod deployment
- **Symptoms:** Financial data exfiltrated, attacker receives real payment information, no indication in service logs of wrong destination
- **Solution:** mTLS with SPIFFE/SPIRE: each service gets a cryptographic identity (SVID) based on its K8s service account. When `order-service` connects to `payment-service`, certificates are mutually verified — both services prove their identity. Attacker's rogue service has no valid certificate — connection rejected. Service mesh (Istio/Linkerd) implements this automatically.
- **Lesson:** Service-to-service communication without mutual authentication is vulnerable to service impersonation. mTLS with SPIFFE identities is the solution — both sides prove who they are cryptographically.

---

### 23.2 Overly Broad Service Token — Privilege Creep

- **What happens:** `reporting-service` uses same service token as `order-service` for convenience — both services can now create, modify, and delete orders — reporting service has write access it should never have
- **Real pattern:** One shared service account token for multiple services. Reporting service only reads data. But its token has order-write permissions (inherited from order-service). If reporting service is compromised, attacker can modify/delete orders.
- **Scale trigger:** Fast-moving teams sharing credentials for convenience, service credential sprawl
- **Symptoms:** Security audit finding, blast radius of any service compromise extends to all services sharing the token
- **Solution:** One service identity per service. Principle of least privilege for service tokens: `reporting-service` token: read-only on specific resources. `order-service` token: read-write on its own resources. Rotate service tokens regularly. Audit token permissions quarterly. Use K8s service accounts with per-service RBAC.
- **Lesson:** Shared service credentials eliminate service-level blast radius containment. One identity per service is required — shared tokens mean a single compromise grants all shared permissions.

---

### 23.3 JWT Service Token Never Rotated — Permanent Compromise Risk

- **What happens:** Service-to-service JWT signed with static secret defined at deployment — secret never rotated — if compromised, permanently valid until system redesign
- **Real pattern:** `SERVICE_JWT_SECRET=abc123xyz` in deployment config, unchanged for 3 years. If attacker gets the secret (leaked config, insider), they can generate valid service tokens indefinitely. No rotation = no recovery from compromise.
- **Scale trigger:** Static secrets in config, no secret rotation policy, long-lived secrets
- **Symptoms:** Compromised secret = permanent system backdoor, no way to invalidate existing tokens without changing all services simultaneously
- **Solution:** Automate secret rotation: HashiCorp Vault dynamic secrets (auto-rotated, short-lived), AWS Secrets Manager rotation, or periodic manual rotation with zero-downtime procedure. Short-lived tokens (1 hour max) with auto-refresh. If secret compromised: rotate immediately, all tokens expire within 1 hour of rotation. Rotation should be a routine operation, not an emergency procedure.
- **Lesson:** Secrets that are never rotated become permanent liabilities. Design secret rotation into the system from day one. A compromised static secret is a permanently open door.

---

### 23.4 SSRF via Service-to-Service Calls

- **What happens:** Service accepts URL from user input and fetches it server-side — attacker passes internal service URL — service fetches internal admin endpoint on attacker's behalf
- **Real pattern:** `notification-service` accepts `callback_url` in request body and POSTs notification to it. Attacker sends `callback_url: http://user-service/internal/admin/users`. `notification-service` fetches that URL with its service token (which has admin rights). Returns all users to attacker via callback response.
- **Scale trigger:** Any service that accepts URLs from user input and fetches them, webhook implementations, notification systems
- **Symptoms:** Internal service endpoints accessible via SSRF, internal admin APIs callable by external users, potential data exfiltration
- **Solution:** Validate and allowlist callback URLs: only allow HTTPS, only allow external domains (block private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16). Use a dedicated outbound HTTP client with blocked internal IP ranges. Never use service credentials for user-triggered outbound requests.
- **Lesson:** Server-Side Request Forgery turns your service into a proxy for internal network access. Never fetch user-supplied URLs with service credentials. Validate and allowlist all outbound destinations.

---

## Part 24 — Data Pipeline & ETL Failures

### 24.1 ETL Without Idempotency — Duplicate Data on Re-run

- **What happens:** ETL pipeline fails halfway through — re-run to completion — first half processed twice, second half once — analytics DB has duplicate records for first half
- **Real pattern:** Nightly ETL: load 1M rows from Postgres to data warehouse. Fails at row 500K. Re-run. Rows 1–500K inserted again (no dedup). Data warehouse now has 1.5M rows instead of 1M. Analytics reports double-count for first half of data set.
- **Scale trigger:** Any ETL pipeline failure and re-run, any incremental load without deduplication
- **Symptoms:** Analytics showing inflated numbers after ETL re-run, data warehouse row counts inconsistent with source, double-counted metrics in reports
- **Solution:** Idempotent ETL: use `UPSERT` (INSERT ... ON CONFLICT UPDATE) instead of INSERT. Or: delete-insert per batch — delete existing rows for the load period, re-insert fresh from source. Or: stage → swap (write to staging table, atomic swap with production table). ETL re-run must be safe to execute multiple times.
- **Lesson:** ETL pipelines that can't be safely re-run will eventually produce duplicate data — pipeline failures are inevitable. Idempotent loads (upsert or stage-swap) are mandatory.

---

### 24.2 Change Data Capture Lag — Analytics Shows Yesterday's Data

- **What happens:** CDC pipeline (Debezium → Kafka → data warehouse) has 4-hour lag — business makes decisions on analytics showing data from 4 hours ago — real-time dashboard is a lie
- **Real pattern:** Debezium reads Postgres WAL, publishes to Kafka. Kafka consumer writes to BigQuery. Pipeline has: WAL read delay (1 min) + Kafka consumer lag (2 hours, under-scaled) + BigQuery batch load (30 min). Total: ~3 hours. "Real-time" dashboard shows 3-hour-old data. Sales reports wrong revenue for today.
- **Scale trigger:** High write volume overwhelming CDC pipeline, consumer under-provisioned, batch loading instead of streaming
- **Symptoms:** Analytics data consistently behind real-time by hours, business decisions based on stale data, "real-time" SLA violated
- **Solution:** Monitor CDC lag as P1 SLA: alert on consumer lag > 5 minutes. Scale Kafka consumers for data warehouse writes. Use streaming inserts (BigQuery streaming API, Snowflake Snowpipe) instead of batch. Measure and publish data freshness timestamp on every dashboard: "Data as of: 14:23:15" — users know what they're looking at.
- **Lesson:** CDC lag is invisible without explicit monitoring. Label all analytics with data freshness timestamp. Alert on lag SLA violations. "Real-time" means nothing without measuring and alerting on actual lag.

---

### 24.3 Schema Evolution in CDC — Old Events Break New Consumers

- **What happens:** Postgres column renamed — Debezium publishes old name until next full snapshot — new data warehouse consumer built for new name — consumer breaks on old-name events for hours
- **Real pattern:** `user.email` renamed to `user.primary_email` in Postgres. Debezium immediately publishes `primary_email`. But event backlog still has `email` events from before the rename. New data warehouse consumer expects `primary_email`. Processes new events fine. Old events (pre-rename): `email` field missing, null stored, data loss in warehouse.
- **Scale trigger:** Any Postgres column rename/removal while CDC is active, event backlog during migrations
- **Symptoms:** Null values in data warehouse for historical data, inconsistency between pre-rename and post-rename data, window of data loss around migration time
- **Solution:** Treat CDC events like API versioning: consumers must handle both old and new field names during transition. Tolerant reader: `email = event.primary_email ?? event.email`. Or: transformation layer (Kafka Streams, Flink) that normalizes field names before reaching consumers. Never assume CDC events are uniformly shaped — schema changes create mixed event streams.
- **Lesson:** CDC event streams are not uniformly shaped across time. Schema changes create mixed old/new field events in the same stream. CDC consumers must be tolerant readers that handle schema evolution.

---

### 24.4 Missing Watermark — Late-Arriving Events Miscounted

- **What happens:** Real-time analytics counts orders per hour — some events arrive 10 minutes late (mobile clients with poor connectivity) — hour closes at 14:00, late events arrive at 14:10 — counted in 14:00 hour by some systems, 15:00 by others
- **Real pattern:** Stream processing (Flink/Spark Streaming) closes hourly window at 14:00:00. Events with `event_time: 13:58:00` arrive at 14:10:00 (10 minutes late). Without watermarks: events ignored (window closed). With incorrect watermarks: counted in wrong window. Revenue report for 13:00–14:00 hour is wrong.
- **Scale trigger:** Mobile clients with buffered events, network delays, IoT devices, any event source with potential delay
- **Symptoms:** Hourly/daily counts slightly wrong, historical analytics doesn't match real-time, late-arriving events dropped or misattributed
- **Solution:** Watermarks with allowed lateness: `event_time - max_lateness_allowed`. Flink: `assignTimestampsAndWatermarks(WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofMinutes(10)))`. Window waits for watermark before closing — accommodates 10-minute late arrivals. Events later than watermark: go to side output for separate handling. Track late event rate as metric.
- **Lesson:** Real-time stream processing must account for late-arriving events. Watermarks define how long to wait for late events before closing a time window. Missing watermark strategy causes silent undercounting.

---

### 24.5 Data Pipeline Failure — No Alerting, Business Decides on Stale Data

- **What happens:** Nightly ETL fails silently at 2 AM — business reviews morning dashboard at 9 AM — data is from 48 hours ago — decisions made — pipeline failure discovered at noon
- **Real pattern:** ETL fails: connection timeout to source DB. Error logged but no alert configured. Dashboard loads data from last successful run (2 days ago). Business reports show 2-day-old revenue. Marketing decisions made on stale data. Pipeline failure discovered when data team checks manually at noon.
- **Scale trigger:** Any unmonitored data pipeline, pipelines that fail silently without alerting
- **Symptoms:** Business operating on stale data without knowing it, decisions based on wrong data, pipeline failure discovered hours after impact began
- **Solution:** Pipeline monitoring as P1: alert on (1) pipeline not completed by expected time, (2) row count outside normal range (anomaly detection), (3) pipeline failed with error. Dashboard freshness indicator: show last updated time prominently — users immediately see "Last updated: 2 days ago." Dead man's switch: alert if no successful run in 24 hours.
- **Lesson:** A failed data pipeline that doesn't alert is indistinguishable from a successful one at the dashboard level. Monitor pipeline completion, row counts, and freshness. Show data age prominently.

---

## Part 25 — SLA Engineering Failures

### 25.1 SLA Without Error Budget — Binary Pass/Fail

- **What happens:** SLA defined as "99.9% uptime" — team treats any incident as SLA violation — excessive caution slows feature delivery — fear of deployment means less deployment
- **Real pattern:** SLA: 99.9% = 8.7 hours downtime/year allowed. Team has had 2 incidents totaling 45 minutes. They're well within budget but track SLA as a binary: any incident = failure. Teams become change-averse. Deployment frequency drops. Quarterly release cycles to minimize incident risk. Feature velocity collapses.
- **Scale trigger:** SLA defined without error budget concept, binary good/bad SLA tracking
- **Symptoms:** Fear of deployment, infrequent releases to minimize risk, available error budget not used for feature delivery
- **Solution:** Error budget = 1 - SLA. 99.9% SLA = 0.1% error budget = 43.8 minutes/month. Budget is a resource to spend, not a threshold to fear. Spend it on: deployments, experiments, technical debt. If budget exhausted: freeze non-critical changes, focus on reliability. If budget plentiful: move fast, experiment, deploy often. SRE error budget policy formalizes this.
- **Lesson:** SLA without error budget creates reliability theater and change aversion. Error budget converts availability into a deployable resource — teams spend it on velocity, refill it with reliability work.

---

### 25.2 Measuring Availability Wrong — Internal Metrics vs User Experience

- **What happens:** Internal monitoring shows 99.95% availability. Customer reports 15% of their requests failing. Both are correct — different measurement points, different realities.
- **Real pattern:** Internal: health check hits `/health` endpoint. `/health` returns 200 (server alive). Actual user requests: 15% hit a downstream dependency that's failing. `/health` doesn't check dependencies. Internal uptime: 99.95% (health check perspective). User availability: 85% (actual request success rate).
- **Scale trigger:** Health checks that don't reflect real user experience, internal vs external measurement point mismatch
- **Symptoms:** SLA reported as met internally, user complaints of high error rate, customer trust erosion despite "green" dashboards
- **Solution:** Measure availability from the user's perspective: synthetic monitoring (run real user journeys every minute from external locations), Real User Monitoring (RUM — measure actual user request success rates), external monitoring (Pingdom, Datadog Synthetics hitting real endpoints). Internal health check ≠ user availability. Track both.
- **Lesson:** Availability measured at the wrong point is a vanity metric. Measure from where the user is (external synthetic), not from inside your own infrastructure.

---

### 25.3 Cascading SLA — Downstream SLA Lower Than Own SLA

- **What happens:** Service promises 99.9% uptime. Depends on three external services each with 99.5% SLA. Math: 0.995 × 0.995 × 0.995 = 98.5% availability even if your service is perfect. Your 99.9% SLA is mathematically impossible to achieve.
- **Real pattern:** Payment SLA: 99.9% (8.7 hours downtime/year). Depends on: Payment provider (99.5%), SMS provider for 2FA (99.5%), Fraud detection API (99.5%). Combined dependency availability: 98.5% = 131 hours/year potential downtime. Service promises 8.7 hours, dependencies allow 131 hours of failure. SLA is a lie.
- **Scale trigger:** Multiple external dependencies, ambitious SLAs without dependency analysis
- **Symptoms:** SLA frequently missed due to dependency failures, customer SLA credits paid due to third-party outages, SLA impossible to negotiate better given dependencies
- **Solution:** SLA = min(your_availability × dependency_availabilities). Dependency SLAs constrain your SLA. For each dependency: implement fallback (circuit breaker + cache), reduce dependency (async where possible), or accept the constraint in your SLA. Publish your true achievable SLA based on dependency chain math.
- **Lesson:** Your SLA cannot exceed the product of your dependency SLAs. Calculate mathematically before publishing. Fallbacks and async dependencies reduce the constraint — synchronous hard dependencies directly cap your availability.

---

### 25.4 P99 Latency SLA — Long Tail Ignored in Development

- **What happens:** Development and testing use average latency — service feels fast in testing, SLA is p99 < 500ms — production p99 is 3 seconds — SLA violated but never caught in testing
- **Real pattern:** Dev tests: 100 requests, average latency 120ms. Looks great. Production: 10,000 requests, 99th percentile (the slowest 100 requests) take 3 seconds — DB query with missing index on rare filter combination, only triggered by specific production data patterns. SLA: p99 < 500ms. Violated. Never caught in dev because test data is uniform, production data is not.
- **Scale trigger:** Non-uniform production data, query performance dependent on data distribution, index selectivity issues
- **Symptoms:** p99 latency SLA violated in production but not in testing, long tail driven by specific data patterns not present in test data, customers on specific data paths experiencing slow responses
- **Solution:** Always test with production-representative data distribution. Profile p95, p99, p999 latency — not just average or median. `EXPLAIN ANALYZE` with realistic production data in staging. Continuous latency percentile tracking in production: alert on p99 > threshold. Load test with data that includes the edge cases that exist in production.
- **Lesson:** Average latency hides the long tail. SLAs are about worst-case user experience. Always measure and optimize p99, not average. Test with production-realistic data distribution.

---

### 25.5 SLO Misaligned With Business — Technically Met, Business Failing

- **What happens:** SLO: API error rate < 1%. Measured across all endpoints. 0.8% error rate — SLO met. But: 15% of `/checkout` requests failing (critical path). Other endpoints healthy. Overall SLO met, checkout broken, revenue impacted.
- **Real pattern:** Aggregate error rate diluted by high-volume, low-importance endpoints (`/health`, `/metrics`, `/static`). Checkout: 200 requests/min, 30 errors/min = 15% error rate. Health checks: 10,000 req/min, 0 errors. Overall: 30/(10,200) = 0.29% — SLO green. Business: checkout broken.
- **Scale trigger:** Aggregate SLOs that dilute critical endpoint failures, high-volume low-importance endpoints dominating metrics
- **Symptoms:** SLO shows green, business metrics (revenue, conversions) show red, critical user flows broken while monitoring says healthy
- **Solution:** Define SLOs per critical user journey, not aggregate: `checkout_success_rate > 99%`, `payment_error_rate < 0.1%`, `login_latency_p99 < 500ms`. Separate SLOs for critical paths from aggregate. Weight SLOs by business impact. Critical path SLO breach = P1 regardless of overall aggregate health.
- **Lesson:** Aggregate SLOs hide critical path failures. Define SLOs for each critical user journey. A system that processes 10K health checks successfully while failing 30% of checkouts is not 99.7% available from a business perspective.

---

## Part 26 — Cost Optimization Failures

### 26.1 Over-Provisioned Services — Paying for Idle Capacity

- **What happens:** Service provisioned for peak (Black Friday) runs at 5% utilization 360 days/year — paying for 20× needed capacity year-round
- **Real pattern:** `order-service`: provisioned 50 pods × 2 CPU × 4 GB = 100 CPU, 200 GB RAM reserved. Average utilization: 5 CPU (5%). 95 CPUs idle and paid for. Monthly cost: $15,000. Needed capacity: $750/month average. Waste: $14,250/month = $171,000/year.
- **Scale trigger:** Capacity planned for peak without autoscaling, fear of under-provisioning leading to permanent over-provisioning
- **Symptoms:** Low CPU/memory utilization on all instances, cloud bill doesn't decrease between peaks, utilization dashboards showing < 20% average
- **Solution:** Horizontal Pod Autoscaler (HPA) + cluster autoscaler: scale down to minimum replicas (2) during off-peak, scale up to max during peak. Right-size requests/limits: set to p95 of actual usage + 30% headroom, not "what if" maximum. KEDA for event-driven scaling (scale to zero when queue empty). Spot/preemptible instances for non-critical workers.
- **Lesson:** Static provisioning for peak is paying peak prices year-round. Autoscaling scales cost with load. The cloud's economic advantage only materializes with dynamic scaling.

---

### 26.2 Chatty Microservices — Data Transfer Costs Exceed Compute Costs

- **What happens:** Microservices in different AWS regions/AZs calling each other — data transfer costs exceed compute costs — architecture designed for correctness not cost
- **Real pattern:** `api-service` (us-east-1) calls `data-service` (us-west-2) 10,000 times/hour × 50 KB payload = 500 MB/hour cross-region. AWS cross-region data transfer: $0.02/GB. 500 MB/hour × 24 × 30 = 360 GB/month × $0.02 = $7.20. Doesn't sound like much. Scale to 100K calls/hour: $72/month. 10M calls/hour: $7,200/month. Plus cross-AZ transfer.
- **Scale trigger:** Services in different regions/AZs, high-frequency inter-service calls, large response payloads
- **Symptoms:** Data transfer line item growing with traffic, cross-region costs disproportionate to compute, architecture driver is correctness not cost
- **Solution:** Co-locate services that talk frequently (same AZ, same region). Cache cross-region responses aggressively. Batch cross-region calls (one call with 100 records instead of 100 calls with 1 record). Use VPC endpoints for AWS service calls (avoids internet data transfer charges). Audit data transfer costs per service pair in cost attribution.
- **Lesson:** Data transfer costs are invisible until they're not. Chatty inter-service communication across region/AZ boundaries has real cost that scales with call frequency × payload size. Co-locate or cache.

---

### 26.3 Logging & Metrics Storage Cost Explosion

- **What happens:** Detailed logs + high-cardinality metrics stored for 90 days — storage cost $50K/month — nobody queried most of it after 7 days
- **Real pattern:** All services log at DEBUG level (see Part 8). Each service emits 500 metrics with high cardinality (per-user labels). CloudWatch/Datadog: $0.30/GB ingested + $0.03/GB stored × 90 days. 100 GB/day × 90 days = 9 TB × $0.03 = $270/month storage. Plus ingestion: 100 GB/day × 30 × $0.30 = $900/month. Times 10 services = $11,700/month. Add high-cardinality metrics: $38,300/month. Total: $50K/month.
- **Scale trigger:** Growing service count, high log verbosity, high-cardinality metrics (per-user, per-request labels)
- **Symptoms:** Observability costs scaling faster than business growth, ROI of logs/metrics unclear, engineers not actually querying most of what's stored
- **Solution:** Log tiering: hot (7 days, fast query), warm (30 days, slower), cold (90 days, archival). Reduce log verbosity (INFO not DEBUG in production). Metrics cardinality: never use user ID, session ID, or request ID as metric label — these create millions of unique time series. Aggregate high-cardinality data in logs, not metrics. Sample debug-level events.
- **Lesson:** Observability has a cost curve that grows faster than traffic. Set retention policies, reduce verbosity, and eliminate high-cardinality metric labels. Observability ROI = (incidents caught × MTTR reduction) - storage cost.

---

### 26.4 Synchronous Calls Preventing Efficient Resource Use

- **What happens:** Service holds open HTTP connection (and goroutine) for 3 seconds waiting for downstream response — goroutine pool exhausted — 1000 concurrent connections × 3 second hold = 3000 goroutine-seconds of blocked capacity per second
- **Real pattern:** 1000 concurrent API requests, each waiting 3s for downstream. 1000 goroutines blocked. New request: goroutine pool at capacity (Go default: no limit but memory bounded). Each goroutine uses ~8 KB stack × 1000 = 8 MB minimum (grows with call depth). Under load: 100K goroutines × 50 KB average = 5 GB just for goroutine stacks.
- **Scale trigger:** High concurrency + high downstream latency, large goroutine/thread pools blocked on I/O
- **Symptoms:** Memory consumption proportional to concurrent request count × downstream latency, goroutine count in millions under load, high memory cost per concurrent user
- **Solution:** Async where possible: fire request, return immediately, callback/webhook/polling for result. For sync-required: use async internally with a response channel (Go pattern: submit to worker pool, await on channel). Limit concurrency explicitly: semaphore pattern limits max concurrent downstream calls. Worker pool with bounded size.
- **Lesson:** Synchronous blocking calls consume goroutines/threads for the full duration of downstream latency. High concurrency × high latency = goroutine explosion. Async submission with bounded worker pools is more efficient.

---

### 26.5 Unused Feature Accumulation — Dead Code Serving Real Traffic

- **What happens:** Feature A deprecated 18 months ago — still 5% of API traffic hitting it — feature still fully operational, DB queries running, resources consumed — nobody cleaned it up
- **Real pattern:** `/api/v1/recommendations` deprecated in favor of v2. Deprecation notice sent once in email. 5% of clients (old mobile app versions) still calling v1. v1 handler: still runs, still queries DB, still consumes 5% of resources. Team assumes traffic will drop to zero "eventually." 18 months later: still 5%.
- **Scale trigger:** Long deprecation windows, mobile clients that never update, no hard cutoff enforcement
- **Symptoms:** Resources consumed by deprecated features indefinitely, technical debt accumulates, deprecated code paths need maintenance during refactors
- **Solution:** Deprecation with hard cutoff: set sunset date in `Sunset` header, document it, enforce it. 6-month warning → return 410 Gone after cutoff. Monitor deprecated endpoint traffic actively: alert when traffic drops below 0.1%, then cut over. For mobile: force update minimum version. Never assume "traffic will drop on its own" — it won't.
- **Lesson:** Deprecated features without hard cutoff dates never actually get deprecated. Set a sunset date, communicate it, enforce it with HTTP 410. Lingering deprecated traffic is real resource cost.

---

## Part 27 — Team Topology & Organizational Failures

### 27.1 Conway's Law Violation — Service Boundaries Don't Match Teams

- **What happens:** Microservices decomposed by technology (frontend team, backend team, data team) not by business domain — every feature requires coordination across all three teams, each owning a piece
- **Real pattern:** User notification feature: frontend team changes UI (1 sprint), backend team adds endpoint (1 sprint), data team adds analytics event (1 sprint). Sequential coordination: 3 sprints for one feature. Teams block each other. Each team has perfect ownership of their technical layer, zero ownership of a complete feature.
- **Scale trigger:** Technology-aligned teams in a microservice organization, any feature requiring cross-team coordination for basic operations
- **Symptoms:** Features require 3+ team coordination for every change, cross-team meetings for simple additions, long lead time from idea to production
- **Solution:** Team Topologies (Matthew Skelton): stream-aligned teams own a product domain end-to-end (frontend, backend, data for their domain). `notifications-team` owns notification UI + backend + analytics. Services align with team boundaries — Conway's Law works for you, not against you. Platform teams provide self-service infrastructure.
- **Lesson:** Conway's Law: your system architecture mirrors your communication structure. Design teams around business capabilities, not technical layers. Service boundaries should match team boundaries.

---

### 27.2 Platform Team Bottleneck — Every Team Needs Platform for Everything

- **What happens:** Platform team required for: new service creation, K8s config changes, new database provisioning, monitoring setup — every product team blocked waiting for platform team ticket resolution
- **Real pattern:** Product team wants to create `review-service`. Needs: K8s namespace (platform ticket), Postgres instance (DBA ticket), Monitoring dashboard (platform ticket), Service mesh config (platform ticket). 4 tickets, 4 teams, 3-week wait. Platform team at 150% capacity permanently. Product teams blocked.
- **Scale trigger:** Platform team as gatekeeper for all infrastructure, manual provisioning processes, growing number of product teams
- **Symptoms:** Platform team permanently backlogged, product teams blocked on infrastructure, feature lead time dominated by infrastructure wait time
- **Solution:** Golden Path / Paved Road: platform team provides self-service tools. Product team runs `service-create --name review-service --db postgres --size small` — automates K8s namespace, Postgres, monitoring, mesh config. Platform team builds tools and templates, not tickets. Product teams use tools independently. Platform as a product, not as a gatekeeper.
- **Lesson:** A platform team that approves and executes every infrastructure change is a bottleneck at the center of every product team. Platform teams should build self-service capabilities, not handle manual requests.

---

### 27.3 Shared Library Hell — Coupling Via Common Dependencies

- **What happens:** All services depend on `company-common-lib` v1 — lib v2 released with breaking change — updating any service requires updating all services simultaneously — big-bang coordinated migration
- **Real pattern:** `common-lib` contains: DB connection setup, logging, metrics, HTTP middleware. Version 2 changes DB connection API. All 25 services must upgrade together (API incompatible). 25 teams × coordination = 3-month migration project. During migration: some services on v1, some on v2, lib team can't release v3 until v2 migration complete.
- **Scale trigger:** Large shared internal library, breaking API changes, many dependent services
- **Symptoms:** Shared library updates require org-wide migration, no service can independently upgrade, shared lib team blocked from evolving
- **Solution:** Thin shared libraries: only truly universal, stable utilities (logging interface, metric interfaces). Business logic: never in shared lib. Keep shared libs small and stable — avoid change. Breaking changes: new package name (`company-common-lib/v2`) allowing parallel versions. Or: accept duplication over coupling — each service has its own logging setup (DRY applies within a service, not across services).
- **Lesson:** Shared libraries create coupling across service boundaries. Every breaking change requires coordinated migration. Keep shared libraries thin, stable, and interface-based. Accept some duplication across services to preserve independence.

---

### 27.4 On-Call Rotation Without Ownership — Wrong Team Paged

- **What happens:** `payment-service` alert fires at 2 AM, pages the platform team (owns infrastructure) instead of payments team (owns the service) — platform team doesn't know payment business logic, spends 45 minutes finding the right person
- **Real pattern:** Alerts configured to page the on-call rotation. On-call rotation: platform team (because "they manage production"). `payment-service` has a business logic bug (wrong tax calculation). Platform team on-call has no context, no runbook access, can't fix business logic. Pages payments team at 3 AM after 45 minutes of confusion.
- **Scale trigger:** Centralized on-call not aligned with service ownership, growing service count without on-call restructuring
- **Symptoms:** Wrong team paged, MTTR includes "find the right person" time, on-call burden concentrated on platform team, service teams not owning their production behavior
- **Solution:** You build it, you run it (Werner Vogels, Amazon): each service team has its own on-call rotation. `payment-service` alert → pages payments team. Platform team: paged only for infrastructure issues (K8s node down, network partition). Service ownership includes production ownership. Runbooks maintained by the service team that understands the service.
- **Lesson:** On-call ownership must match service ownership. Teams that build services must also operate them — they have the context. Centralizing on-call creates knowledge gaps and longer MTTR.

---

### 27.5 Post-Mortem Without Action Items — Same Failure Repeats

- **What happens:** Incident post-mortem written, root cause identified, lessons documented — no action items assigned with owners and deadlines — same failure pattern repeats 6 weeks later
- **Real pattern:** Post-mortem: "root cause: no connection pool limit on Redis, connection exhaustion under load. Prevention: add connection limit." No owner assigned. No deadline. Document filed. 6 weeks later: same issue in `notification-service`. Same root cause. Same post-mortem. Second post-mortem: "as identified in previous post-mortem, we still haven't implemented connection limits."
- **Scale trigger:** Post-mortem culture without follow-through, action items without tracking, same team handling multiple incidents
- **Symptoms:** Same failure patterns repeat across services and over time, post-mortem documents accumulate with no visible improvement, on-call burden doesn't decrease over time
- **Solution:** Post-mortem action items: specific, assigned owner, deadline, tracked in project management system (Jira, Linear). Follow-up: review open post-mortem items in weekly team meeting. Close when fixed, not when documented. Track: "actions from post-mortems completed in 30 days" as an engineering metric. Blameless culture + accountability for action items = learning organization.
- **Lesson:** A post-mortem without action items with owners and deadlines is a historical document, not an improvement mechanism. The measure of post-mortem quality is: did the same failure recur? Track and hold teams accountable for post-mortem action completion.

---

## Part 28 — Advanced Production War Stories

### 28.1 The Thundering Herd From Configuration Push

- **What happens:** Configuration change pushed to all services simultaneously via feature flag — all 10,000 service instances reload config at same time — all clear in-process caches simultaneously — DB hit by 10,000 cache misses at once
- **Real pattern:** Feature flag system pushes flag update via pub/sub. All 10,000 service pods receive update simultaneously. Flag change causes cache invalidation. All 10,000 pods query DB for fresh data simultaneously. DB: 10,000 concurrent queries for same data. DB collapses. Platform-wide outage from a config change.
- **Scale trigger:** Synchronized config pushes, large pod counts, cache invalidation on config change
- **Symptoms:** Platform-wide outage immediately after config push, DB overwhelmed by synchronized cache miss stampede, outage correlated exactly with config deployment
- **Solution:** Staggered config propagation: push config change with random delay per pod (0–60 seconds jitter). Only N% of pods update config per minute. Cache invalidation on config change: don't invalidate — let TTL expire (desynchronized). Config push: canary (1% of pods) → verify → gradual rollout. Never push config changes to all instances simultaneously.
- **Lesson:** Synchronized state changes across all instances at once create synchronized load spikes. Configuration rollouts need the same gradual rollout strategy as code deployments.

---

### 28.2 The Accidental Recursive Event — Self-Triggering Loop

- **What happens:** Service subscribes to its own event topic — processes event, emits same event type, receives it again, processes, emits, receives — infinite loop consuming 100% CPU, growing queue depth exponentially
- **Real pattern:** `audit-service` subscribes to `entity:updated` events from all services. `audit-service` writes audit log — triggers DB trigger that publishes `entity:updated` event (audit table is also an entity). `audit-service` receives `audit:updated` event, writes audit of the audit, publishes again. Infinite loop. Queue depth: doubles every second.
- **Scale trigger:** Services subscribing to entity update events from shared topics, DB triggers publishing events, audit systems consuming all events
- **Symptoms:** Queue depth growing exponentially, CPU at 100%, specific service consuming all queue capacity, events growing geometrically
- **Solution:** Event source filtering: consumers filter events by source service `if event.source == "audit-service" { skip }`. Or: publish audit events to separate topic (`audit:entries`) not subscribed to by the audit service itself. Design: services should never consume events from their own output topic. Circuit breaker on event consumption rate: if processing rate > N events/sec, pause and alert.
- **Lesson:** A service that consumes its own output events creates an infinite loop. Always check that a service's subscriptions don't include topics it publishes to. Event loops are production-ending failures.

---

### 28.3 The Network Partition Island — Services Splitting Into Two Groups

- **What happens:** Network partition splits cluster into two halves — both halves continue operating independently, both accepting writes — partition heals — two divergent states must be reconciled
- **Real pattern:** K8s cluster: 3 nodes in AZ-A, 3 nodes in AZ-B. Network failure isolates AZs. AZ-A: processes orders, writes to its Postgres primary. AZ-B: elects new Postgres primary (thinks AZ-A is dead), also processes orders, writes to new primary. 20 minutes of partition: 200 orders written to each side, some with same IDs, different data. Partition heals: split brain. Data reconciliation required.
- **Scale trigger:** Multi-AZ deployment without proper consensus, network partitions in production
- **Symptoms:** After partition heals: conflicting records, orders with same ID but different status, customer service tickets from confused state
- **Solution:** Consensus-based writes: Postgres with Patroni requires quorum for write availability — if AZ-B can't reach majority, it doesn't elect primary and goes read-only. Consistency over availability during partition (CP not AP for financial data). For AP systems (eventually consistent): design for conflict resolution upfront (last-write-wins, CRDT, application-level merge). Don't discover the conflict resolution strategy during a production incident.
- **Lesson:** Network partitions choose: consistency (refuse writes without quorum) or availability (accept writes, reconcile later). Choose before the partition, not during it. Financial data requires consistency — accept unavailability over divergence.

---

### 28.4 The Slow Memory Leak Found After 3 Weeks

- **What happens:** Go service memory grows 50 MB/week — not obvious on day-to-day monitoring — after 3 weeks: 150 MB over baseline — OOM kill — traced to goroutine leak from uncleaned HTTP client connections
- **Real pattern:** `http.Client` created with custom `Transport` inside a function called per-request. Transport creates connection pool. Connections not closed (no `defer resp.Body.Close()`). Each request: new transport, connections accumulate in background, never GC'd (transport referenced by goroutine). After 100K requests: 100K transport objects' connection pools, all holding goroutines.
- **Scale trigger:** Per-request `http.Client` creation, missing `resp.Body.Close()`, long-running services with gradual leaks
- **Symptoms:** Memory growth linear with request count (not time), periodic OOM at same memory threshold, goroutine count growing proportionally to request count
- **Solution:** One global `http.Client` and `Transport` per service, created at startup, reused for all requests. Always `defer resp.Body.Close()` — non-optional. Memory profiling with pprof: `go tool pprof http://service:6060/debug/pprof/heap`. Graph shows `http.Transport` objects accumulating. Enable continuous profiling in production (Pyroscope, Parca).
- **Lesson:** Go's `http.Client` is designed to be shared and reused — not created per request. Per-request client creation is a goroutine and connection leak. Always reuse a package-level client.

---

### 28.5 The Deployment That Took Down the Data Center

- **What happens:** Service update deployed — update has a bug where service calls `DELETE FROM orders WHERE status='completed'` instead of `UPDATE` — 50,000 completed orders deleted before deployment rolled back — no soft delete, no backup restore tested
- **Real pattern:** Typo in migration: `db.Exec("DELETE FROM orders WHERE status = ?", "completed")` instead of `UPDATE`. Deployed to production. Runs as part of startup migration. 5 seconds: 50,000 rows deleted. Monitoring: no immediate alert (row count not monitored). Discovered 30 minutes later when customer support reports missing orders. Restore from backup: 6-hour process. 6 hours of order history lost in restore gap.
- **Scale trigger:** Destructive DB operations in migrations, missing row count anomaly detection, untested restore process
- **Symptoms:** Critical data deleted, no immediate detection, 6-hour RTO from untested backup restore, data loss in restore gap
- **Solution:** Defense in depth for destructive operations: (1) Soft delete: `deleted_at` timestamp instead of hard delete — recoverable. (2) Migration dry-run in staging with production data volume first. (3) Row count anomaly detection: alert if any table loses > 5% of rows in 60 seconds. (4) Logical replication to hot standby: point-in-time recovery to minute before incident. (5) Code review gate for any migration containing DELETE/DROP.
- **Lesson:** Hard deletes are unrecoverable without backup. Soft deletes (deleted_at) make data recovery immediate. Monitor for sudden row count drops as a P0 alert. Every destructive operation in a migration needs a second reviewer.