# Microservices — Complete Study & Failure Cases (Volume 2)

> 12 Parts · 68 Cases — Advanced failure patterns covering service mesh, event streaming, multi-tenancy, database per service, async workflows, canary deployments, service contracts, and chaos engineering.

---

## Part 13 — Service Mesh Advanced Failures

### 13.1 Envoy Proxy Retry Amplification

- **What happens:** Istio/Envoy configured with 3 retries on 5xx — one slow upstream service causes each request to generate 3 downstream retries, amplifying load 3× during degradation
- **Real pattern:** `inventory-service` degraded, returning 503s. Envoy retries each failed request 3 times before giving up. 1000 req/sec incoming → 3000 req/sec hitting `inventory-service`. Service that was at 80% capacity is now at 240% — completely overwhelmed by retry traffic meant to help it recover.
- **Scale trigger:** Retry policy enabled globally in mesh, service degradation that produces 5xx responses
- **Symptoms:** Degraded service receives 3× normal traffic during degradation, recovery impossible, retry storms amplify failure
- **Solution:** Never retry non-idempotent requests (POST, PATCH, DELETE). Only retry idempotent safe operations (GET). Set retry budget: max 20% additional requests from retries. Use Envoy's `retry_on: gateway-error,connect-failure` not `5xx` (too broad). Combine with circuit breaker — stop retrying when circuit opens.
- **Lesson:** Mesh-level retries are invisible amplifiers. They help for transient network errors but amplify load-based failures. Scope retries narrowly to safe, idempotent operations only.

---

### 13.2 Sidecar Not Injected — Service Outside Mesh

- **What happens:** New service deployed without Istio sidecar label — bypasses all mesh policies (mTLS, rate limits, circuit breakers) without any indication something is wrong
- **Real pattern:** New engineer deploys `audit-service` without `istio-injection: enabled` namespace label or pod annotation. Service talks to all other services without mTLS (plaintext). mTLS-enforced services reject its requests. `audit-service` silently skips rate limiting. Mesh dashboards show no traffic from it.
- **Scale trigger:** New services added to K8s without process, multiple teams, fast deployment cadence
- **Symptoms:** `audit-service` gets TLS handshake errors connecting to strict-mTLS services, traffic not visible in Kiali/mesh dashboards, security policies bypassed
- **Solution:** Enforce injection via admission webhook: `MutatingAdmissionWebhook` that rejects pods missing sidecar. Or: `PeerAuthentication` in STRICT mode at namespace level rejects non-mTLS connections — uninjected services can't communicate. Treat missing sidecar as deployment failure, not a warning.
- **Lesson:** Service mesh security is only as strong as sidecar injection completeness. Enforce injection at admission — services that bypass the mesh bypass all mesh security policies.

---

### 13.3 Traffic Mirroring Overloads Production Database

- **What happens:** Canary testing uses Istio traffic mirroring (shadow traffic) — 100% of production requests mirrored to new service, new service writes to same production DB — database gets 2× write load
- **Real pattern:** `order-service v2` tested with mirrored traffic. v2 has a bug: every request does an unnecessary `INSERT INTO audit_log`. 1000 req/sec mirrored × unintended writes = 1000 extra DB writes/sec. DB write latency doubles. Production v1 impacted.
- **Scale trigger:** Traffic mirroring to service that shares production DB, or calls shared production services
- **Symptoms:** DB load doubles after mirroring enabled, production latency increases, v1 service impacted by v2 test
- **Solution:** Mirror to services with dedicated test databases or read-only replicas. Mirror only GET/read traffic (never POST/write) unless shadow service has fully isolated data layer. Set mirror percentage: `mirror_percent: 10` instead of 100%. Verify shadow service is stateless or uses isolated state before mirroring.
- **Lesson:** Traffic mirroring doesn't isolate side effects. Shadow services must be fully isolated from production state — otherwise shadow testing becomes shadow damage.

---

### 13.4 Service Mesh Observability Gap — Missing Metrics

- **What happens:** Istio generates metrics but services not annotated for Prometheus scraping — mesh telemetry collected, service-level business metrics missing — half the picture
- **Real pattern:** Istio tracks request count, latency, error rate between services. But `order-service` business metrics (orders/min, payment success rate, cart abandonment) not exposed. Incident: orders failing, Istio shows high error rate in `payment-service`. But which payment method? Which currency? What error code? Istio can't answer. Need service metrics.
- **Scale trigger:** Incident investigation requiring business context beyond mesh telemetry
- **Symptoms:** Istio shows where failures happen but not why, business context missing from mesh dashboards, RCA incomplete without service-level metrics
- **Solution:** Two-layer observability: mesh (infrastructure/network layer) + service (business/application layer). Service exposes `/metrics` endpoint with business counters (Prometheus `promauto` in Go). Annotate pods for scraping: `prometheus.io/scrape: "true"`. Mesh metrics answer "what" (which service failed), service metrics answer "why" (which operation, which customer segment).
- **Lesson:** Service mesh metrics are infrastructure metrics. Business metrics require application-level instrumentation. Both layers are required for complete observability.

---

### 13.5 Outlier Detection Misconfigured — Ejecting Healthy Hosts

- **What happens:** Istio outlier detection ejects healthy pods from load balancing because they handle slow requests (expected behavior) — ejected pods receive no traffic, remaining pods overloaded
- **Real pattern:** `report-service` pods legitimately take 3s for report generation. Outlier detection: `consecutiveErrors: 5, interval: 10s`. Pod handling 5 slow requests (no errors, just slow) not triggered. But `consecutiveGatewayErrors: 5` triggers on 503s from upstream. Upstream DB slow → 503s → pods ejected. Healthy pods removed from rotation. Remaining pods overloaded, cascade.
- **Scale trigger:** Services with variable-latency operations, upstream DB issues, misconfigured outlier detection thresholds
- **Symptoms:** Healthy pods removed from load balancing, traffic concentrated on fewer pods, cascade from outlier detection over-ejection
- **Solution:** Tune outlier detection per service: `maxEjectionPercent: 10` (never eject more than 10% of hosts at once), `baseEjectionTime: 30s` (re-admit quickly). Don't apply global outlier detection to all services — tune per DestinationRule based on service characteristics. Monitor ejection events as a key metric.
- **Lesson:** Outlier detection defaults are not universally applicable. Tune thresholds per service's expected latency profile. Over-eager ejection makes cascades worse, not better.

---

## Part 14 — Event Streaming Failures (Kafka/RabbitMQ Advanced)

### 14.1 Kafka Consumer Group Rebalance Storm

- **What happens:** Consumer group rebalances every 30 seconds — during rebalance, all consumers stop processing for 10–15 seconds — effective throughput drops 30–50%
- **Real pattern:** 20 Kafka consumers in a group. One consumer slow (GC pause). Heartbeat missed. Group coordinator triggers rebalance. All 20 consumers stop, renegotiate partition assignments, resume. 15 seconds of processing blackout every 30 seconds. Effective throughput: 50% of capacity.
- **Scale trigger:** Large consumer groups, GC pauses in JVM consumers, slow consumers causing heartbeat misses
- **Symptoms:** Periodic processing gaps visible in consumer lag metrics, throughput oscillates, offset commits delayed, lag spikes every N seconds
- **Solution:** Tune heartbeat and rebalance: `session.timeout.ms=45000`, `heartbeat.interval.ms=15000`, `max.poll.interval.ms=300000` (give consumer time to process before heartbeat miss). Use incremental cooperative rebalancing (`partition.assignment.strategy=CooperativeStickyAssignor`) — only reassigns partitions that need moving, others continue processing.
- **Lesson:** Default Kafka rebalance (eager) stops all consumers. Cooperative rebalancing minimizes disruption. Tune session timeout to be longer than your worst-case processing time.

---

### 14.2 Kafka Producer Acks=0 — Silent Message Loss

- **What happens:** Producer configured with `acks=0` for performance — messages sent but not confirmed — Kafka broker restart causes all in-flight messages to be lost permanently
- **Real pattern:** Order events published with `acks=0` (fire and forget). Kafka broker leader reelects during rolling upgrade. In-flight messages not replicated to new leader — gone. Orders placed but no fulfillment event. Silent data loss during routine maintenance.
- **Scale trigger:** Kafka maintenance, broker restarts, rolling upgrades, leader elections
- **Symptoms:** Orders placed but not fulfilled, consumer lag doesn't grow (messages truly lost, not delayed), impossible to detect without end-to-end order count reconciliation
- **Solution:** Always use `acks=all` (or `acks=-1`) for critical data: waits for all in-sync replicas to acknowledge. Set `min.insync.replicas=2` to require 2 replicas to confirm before producer ACK. Performance cost: 2–5ms additional latency. Business cost of `acks=0` data loss: incalculable. Use `acks=0` only for truly disposable telemetry.
- **Lesson:** `acks=0` is "please don't tell me if this message is lost." For any business-critical event, `acks=all` + `min.insync.replicas=2` is the minimum durability configuration.

---

### 14.3 Kafka Offset Commit Before Processing — Message Loss on Crash

- **What happens:** Consumer commits offset before processing message — consumer crashes between commit and processing — message marked as consumed, never actually processed
- **Real pattern:** Consumer: `consumer.commitSync()` → `processOrder(message)`. Crash between commit and process. On restart, starts from next offset. Order event permanently skipped. Customer order placed, no fulfillment, no error.
- **Scale trigger:** Any consumer crash, OOM kill, deployment restart
- **Symptoms:** Messages disappeared from queue (committed), not processed, order count in DB doesn't match event count in Kafka
- **Solution:** Process first, commit after: `processOrder(message)` → `consumer.commitSync()`. Exactly-once semantics: use Kafka transactions (`transactional.id`) to atomically process + commit. Or: idempotent processing so reprocessing (from pre-process crash restart) is safe. Default: disable auto-commit (`enable.auto.commit=false`), commit only after successful processing.
- **Lesson:** Commit offset only after successful processing, never before. Auto-commit is dangerous for critical workloads — it commits on a timer regardless of processing status.

---

### 14.4 Topic Partition Count — Can't Scale Consumers Beyond Partitions

- **What happens:** `orders` Kafka topic created with 3 partitions — team wants to scale to 20 consumer instances for throughput — only 3 instances receive messages, 17 sit idle
- **Real pattern:** Kafka: one partition = one consumer in a group at a time. 3 partitions → max 3 active consumers. Topic created with low partition count at launch ("we'll add more later"). Adding partitions later requires careful coordination and doesn't rebalance existing data.
- **Scale trigger:** Traffic growth requiring more consumer parallelism than initial partition count allows
- **Symptoms:** Consumer count grows but throughput doesn't, most consumer instances idle, lag grows despite adding consumers
- **Solution:** Plan partition count for maximum expected parallelism, not current. Rule: partitions = max expected concurrent consumers × 2 (headroom). Start with 12–24 partitions for business-critical topics. Adding partitions: possible but messages for a key may rebalance to different partition (breaks key-based ordering). Increasing partitions in Kafka is one-way and must be planned.
- **Lesson:** Partition count is a ceiling on consumer parallelism. Set it 2–3× higher than current needs at topic creation. Increasing partitions later is possible but operationally complex and disrupts key ordering.

---

### 14.5 RabbitMQ Unacked Messages — Channel Block

- **What happens:** Consumer fetches messages (basic_get/basic_consume) but never ACKs or NACKs — channel fills with unacked messages, RabbitMQ stops delivering new messages to that channel
- **Real pattern:** Go consumer: processes message, exception thrown before `ch.Ack()`, no defer for NACK on error. Message stays unacked indefinitely. RabbitMQ prefetch limit (e.g., `basic_qos(prefetch=10)`) reached after 10 unacked messages — channel blocked, no more deliveries.
- **Scale trigger:** Any consumer exception path that skips ACK, missing error handling, unhandled panics
- **Symptoms:** Consumer appears running but queue depth grows, no messages being processed, channel shows 10 unacked messages indefinitely
- **Solution:** Always defer ACK/NACK: `defer func() { if err != nil { msg.Nack(false, true) } else { msg.Ack(false) } }()`. Or use `autoAck: false` with explicit ACK after processing. Set `prefetch_count` to control max unacked messages per consumer. Monitor unacked message count as alert threshold.
- **Lesson:** Unacked messages block RabbitMQ channel delivery. Always ACK or NACK in all code paths — defer it at the top of the handler with error-aware logic.

---

### 14.6 Event Schema Registry — No Enforcement Allows Drift

- **What happens:** Schema registry exists but not enforced in CI — producers publish events with incompatible schemas, consumers silently receive wrong data structure, schema drift discovered weeks later
- **Real pattern:** Schema registry has `OrderCreated` schema v1. Developer adds `discount` field as `int` in code, schema registry still has it as `string`. No CI check. Events published with int. Consumers deserializing as string: JSON number → string coercion succeeds in some languages, fails in others. Silent inconsistency for 2 weeks until downstream bug found.
- **Scale trigger:** Large team, many producers, schema registry not integrated into deployment pipeline
- **Symptoms:** Silent type coercion bugs, schema drift discovered via downstream data bugs, inconsistency between what schema says and what's actually published
- **Solution:** Enforce schema compatibility in CI: `buf lint` for proto, `avro-schema-validator` for Avro, JSON Schema validation. Producer CI must validate against registry before merge. Deploy pipeline: `schema.register()` fails if incompatible — blocks deployment. Schema registry is useless if not enforced at publish time.
- **Lesson:** A schema registry that isn't enforced in CI/CD is documentation, not governance. Schema validation must block deployment when incompatible.

---

## Part 15 — Database Per Service Advanced Failures

### 15.1 Cross-Service Join — The Forbidden Query

- **What happens:** Business report requires joining `users` (user-service DB) with `orders` (order-service DB) — engineer writes direct DB connection to both databases from report service — bypassing service APIs, creating hidden coupling
- **Real pattern:** Report service: `SELECT u.name, o.total FROM users_db.users u JOIN orders_db.orders o ON u.id = o.user_id`. Two direct DB connections. Now report-service is implicitly coupled to both DB schemas. Any schema change in either DB breaks report service. Bypasses service-level caching, rate limiting, auth.
- **Scale trigger:** Business reporting needs, analytics queries, any operation requiring data from multiple service domains
- **Symptoms:** Schema changes in user-service break report-service (hidden coupling), report DB user has access to all DBs (security issue), report queries impact production DB performance
- **Solution:** Options: (1) API composition: report-service calls user-service API + order-service API, joins in application code (slower but correct). (2) CQRS read model: order-service publishes events, report DB subscribes and builds denormalized view with user+order data. (3) Data warehouse: ETL user+order data to analytics DB — never cross service DBs in production.
- **Lesson:** Cross-service DB joins recreate the shared database anti-pattern covertly. Data that needs joining belongs in the same service or in a dedicated read model/data warehouse.

---

### 15.2 Database Per Service — Connection Count Explosion

- **What happens:** 20 microservices each with their own Postgres — each service has 10-connection pool × 10 replicas = 100 connections per service × 20 services = 2000 connections total across all Postgres instances
- **Real pattern:** Each service's DB is a separate Postgres RDS instance. Minimum pool size 10 connections per pod. 10 pods per service × 10 connections = 100 connections per service DB. 20 services × 100 = 2000 total DB connections across the platform. Each Postgres instance using 100 connections × ~5 MB/connection = 500 MB for connections alone.
- **Scale trigger:** Scaling microservices horizontally, each service having its own dedicated DB instance with per-pod connection pools
- **Symptoms:** High Postgres memory usage dominated by idle connections, connection overhead on small DBs, hard to see at first but compounds with scale
- **Solution:** PgBouncer per service DB: service pods connect to local PgBouncer, which maintains small pool (5–10) to Postgres. 10 pods × PgBouncer → 5 Postgres connections instead of 100. Or: use RDS Proxy (AWS) as managed connection pooler. Per-service DB doesn't mean per-service connection overhead — pool at the DB level.
- **Lesson:** Database per service multiplies the connection management problem. Each service DB needs a connection pooler (PgBouncer) regardless of how small the service is.

---

### 15.3 Polyglot Persistence — Operational Complexity Explosion

- **What happens:** Each service uses the "best" database for its use case — 20 services use 8 different databases: Postgres, MySQL, MongoDB, Cassandra, DynamoDB, Neo4j, Redis, Elasticsearch — 8 different backup strategies, 8 different scaling runbooks, 8 different expertise requirements
- **Real pattern:** User-service: Postgres (relational). Product-service: MongoDB (document). Search-service: Elasticsearch. Recommendation-service: Neo4j (graph). Session-service: Redis. Analytics-service: Cassandra. On-call engineer at 3 AM: Cassandra node down. Nobody on the team has deep Cassandra expertise. 4-hour outage.
- **Scale trigger:** Conway's Law + "use the right tool" ethos without operational cost accounting
- **Symptoms:** Deep expertise required for each DB technology, difficult on-call rotation, backup/restore complexity, security patching multiplied, cost of expertise per DB
- **Solution:** Default to Postgres for everything — it handles relational, document (JSONB), full-text search (tsvector), time-series (TimescaleDB), graph (recursive CTEs). Deviate only when Postgres genuinely cannot handle the use case AND the operational cost is justified. Two databases max for 90% of organizations.
- **Lesson:** Polyglot persistence has a hidden operational tax: expertise, monitoring, backups, upgrades, security patches, and on-call knowledge multiplied by database count. Default to one DB, deviate deliberately.

---

### 15.4 Service DB Schema Exposed — Internal Becomes External Contract

- **What happens:** Other teams query service DB directly "just for now" — DB schema becomes a de facto external API contract, can never change without coordination
- **Real pattern:** `analytics-team` gets read access to `order-service` DB "temporarily" for a dashboard. 6 months later, 5 dashboards query `orders.items` table directly. `order-service` wants to rename `items` to `line_items` for clarity — breaks 5 dashboards. Schema refactoring requires cross-team coordination. "Temporary" is permanent.
- **Scale trigger:** Organizational pressure for fast analytics, read-only DB access granted "just this once," analytics/BI teams bypassing APIs
- **Symptoms:** Schema refactoring blocked by external consumers, service team can't evolve data model, accidental coupling via DB access
- **Solution:** No direct DB access outside the owning service — ever. Analytics: publish events to data warehouse (Redshift, BigQuery) via CDC. BI team queries warehouse, not production DB. Service owns its schema evolution. Enforce via: DB credentials not shared outside service team, network policy blocking DB port from non-service pods.
- **Lesson:** A DB directly accessible to external teams is a public API with no versioning, no deprecation, and no SLA. Internal DB = private implementation. Enforce this with credentials and network policy.

---

## Part 16 — Async Workflow & Saga Failures

### 16.1 Saga Timeout — Compensation Never Triggered

- **What happens:** Saga orchestrator sends `reserve-inventory` command, waits for response — `inventory-service` timeout, no response — saga orchestrator waits forever, saga stuck mid-execution, inventory reserved, payment never charged, order never created
- **Real pattern:** Saga timeout: 30 seconds for inventory response. `inventory-service` is slow (60 seconds). Saga orchestrator receives no response in 30 seconds. No timeout handling code. Saga instance stuck in `PENDING_INVENTORY` state forever. Inventory reserved but never released. Order in limbo.
- **Scale trigger:** Downstream service slowness, network issues, any saga step that can exceed the timeout
- **Symptoms:** Saga instances stuck in intermediate states forever, inventory reserved but never released, orders in limbo, saga state machine shows PENDING states accumulating
- **Solution:** Every saga step must have a timeout with explicit compensation: `if timeout: { compensate(step); fail(saga) }`. Implement saga timeout monitor: background process that finds sagas stuck > N minutes and triggers compensation. Saga states: STARTED, PENDING_X, COMPENSATING, FAILED, COMPLETED — never leave them unchecked.
- **Lesson:** Sagas without timeout handling leave distributed state permanently inconsistent. Every saga step needs a timeout and a compensation action. Implement a saga monitor to detect and handle stuck sagas.

---

### 16.2 Saga Compensation Failure — Partial Rollback

- **What happens:** Saga compensation (rollback) fails midway — payment was refunded but inventory reservation not released — compensation itself is partially complete, creating new inconsistency
- **Real pattern:** Order saga fails at step 3 (shipping). Compensation starts: refund payment (success) → release inventory (fails: inventory-service down). Compensation stuck. Payment refunded, inventory still reserved. Customer gets refund but product unavailable to others.
- **Scale trigger:** Compensating services also unavailable, network failures during compensation
- **Symptoms:** Inconsistent state after failed compensation, inventory locked, refunds issued but state not matching
- **Solution:** Compensating transactions must be retried with backoff until success — they cannot be abandoned. Store compensation state in saga log. Retry failed compensations indefinitely (with backoff). For compensation that truly cannot complete: human intervention queue with alert. Compensations must be idempotent (safe to retry multiple times).
- **Lesson:** Saga compensation can fail too. Compensation must be retried until success — it is not optional. Design compensating transactions to be idempotent and indefinitely retried.

---

### 16.3 Long-Running Saga — Lock Timeout

- **What happens:** Saga locks inventory record for duration of checkout flow (10 minutes if user is slow) — other users trying to buy same item blocked for 10 minutes
- **Real pattern:** Flash sale: 10,000 users start checkout for last unit simultaneously. First user's saga locks inventory row. Saga waits for user to complete payment form. 5 minutes later, user abandons. Lock held. 9,999 other users' inventory checks return "unavailable" for 5 minutes.
- **Scale trigger:** Long user-facing flows (checkout, booking), inventory/reservation systems, scarce resources
- **Symptoms:** Items appear out of stock during active checkout flows, lock contention under high demand, conversions drop during popular sales
- **Solution:** Soft reservation with TTL instead of DB lock: `UPDATE inventory SET reserved=reserved+1, reserved_until=NOW()+INTERVAL '10 minutes' WHERE product_id=? AND available > reserved`. Background job releases expired reservations. User has 10 minutes to complete checkout. No DB lock. Multiple concurrent soft reservations possible up to available count.
- **Lesson:** Long-running sagas must not hold DB locks. Use time-limited soft reservations instead of hard locks. Locks and slow humans don't mix.

---

### 16.4 Workflow Orchestrator Single Point of Failure

- **What happens:** Custom saga orchestrator service goes down — all in-flight sagas frozen, no new sagas can start, order processing halted
- **Real pattern:** Saga orchestrator: single-instance Node.js service managing all order sagas in memory. Service OOM killed (memory leak from accumulated saga state). All 500 in-flight orders frozen. `order-service` returns 503 (can't start saga). Full order processing outage until orchestrator restarted.
- **Scale trigger:** Single-instance orchestrator, in-memory saga state, any process crash
- **Symptoms:** All order processing halted, in-flight orders frozen, orchestrator restart required for recovery
- **Solution:** Durable saga state: persist every saga state transition to DB before acting. Orchestrator is stateless — can restart and resume from DB state. Multiple orchestrator instances: saga instances claimed via DB lock (one orchestrator processes each saga). Or use a workflow engine: Temporal, Conductor, AWS Step Functions — built for durable saga execution with automatic recovery.
- **Lesson:** Saga orchestrators must be stateless and durable. In-memory saga state + single instance = single point of failure for your entire transactional workflow.

---

### 16.5 Choreography Hell — Untraceable Event Flow

- **What happens:** Choreography-based saga (no central orchestrator) — 8 services each publishing/subscribing to events — understanding the order flow requires reading 8 codebases, debugging a failure requires correlating events across 8 queues
- **Real pattern:** Order flow: `order:created` → inventory reserves → `inventory:reserved` → payment charges → `payment:charged` → shipping schedules → `shipping:scheduled` → notification sends. One failure: which step failed? Check 8 queues, 8 logs. An event is missing — which service didn't publish it? Impossible to answer without searching all 8.
- **Scale trigger:** Choreography with many services, complex conditional flows, debugging in production
- **Symptoms:** MTTR for saga failures measured in hours, impossible to get a coherent view of one saga's state, debugging requires reading multiple codebases simultaneously
- **Solution:** Correlation ID + saga state store: every event carries `saga_id`. Central saga state table updated by each service participation (via event). At any point: `SELECT * FROM saga_states WHERE saga_id=?` shows complete flow state. Or switch to orchestration for complex flows: the orchestrator is the single source of truth for saga progress.
- **Lesson:** Choreography scales horizontally but fails observability. For flows with more than 4 steps or conditional branches, orchestration wins on debuggability. Always correlate events with a saga ID.

---

## Part 17 — Multi-Tenancy Failures

### 17.1 Tenant Data Isolation Failure — Cross-Tenant Data Leak

- **What happens:** Multi-tenant SaaS: `tenant_id` filter missing from one query — Tenant A's data returned to Tenant B's API request
- **Real pattern:** `SELECT * FROM orders WHERE status='pending'` — missing `AND tenant_id=?`. Returns all tenants' pending orders to the requesting tenant. PII and business data of all tenants exposed to one tenant. GDPR violation, critical security incident.
- **Scale trigger:** Any multi-tenant query, complex queries where `tenant_id` filter is easy to forget
- **Symptoms:** Critical data breach, wrong tenant sees others' data, impossible to detect without explicit testing of cross-tenant access
- **Solution:** Row-level security in Postgres: `ALTER TABLE orders ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON orders USING (tenant_id = current_setting('app.tenant_id')::uuid)`. DB enforces isolation — impossible to accidentally query cross-tenant. Application sets `SET app.tenant_id = ?` at query start. No query can bypass it. Test cross-tenant isolation explicitly in every integration test.
- **Lesson:** Application-level `tenant_id` filters are a single forgotten line away from a data breach. Database row-level security enforces isolation at the DB layer — the right place for a security boundary.

---

### 17.2 Noisy Tenant — One Tenant Impacts All Others

- **What happens:** Enterprise tenant runs heavy analytics query — saturates DB CPU — all other tenants experience degraded performance
- **Real pattern:** Tenant X: 1M records. Runs `SELECT COUNT(*) GROUP BY ...` on entire dataset, no index. Query takes 45 seconds, full table scan. DB CPU 100%. All other tenants' queries queue behind. SaaS SLA violated for 1000 tenants because of one.
- **Scale trigger:** Tenants with significantly different data volumes, shared DB without resource limits
- **Symptoms:** Periodic performance degradation correlated with one tenant's usage pattern, all-tenant impact from one-tenant query
- **Solution:** Per-tenant resource limits: Postgres `pg_stat_activity` + `pg_cancel_backend()` for runaway queries. Statement timeout per tenant: `SET statement_timeout = '30s'`. Query cost limits: `SET statement_timeout` per connection. Separate large tenants to dedicated DB instances (tenant tiering). Rate limit tenant API calls.
- **Lesson:** In a shared multi-tenant system, one heavy tenant can starve all others. Implement per-tenant resource limits. Large tenants should graduate to dedicated infrastructure.

---

### 17.3 Tenant Onboarding — Schema Migration for All Tenants

- **What happens:** Schema migration must run against 5000 tenant databases (schema-per-tenant model) — serial migration takes 8 hours, new feature delayed, operations team exhausted
- **Real pattern:** Schema-per-tenant: each tenant has their own schema (`tenant_123.orders`, `tenant_124.orders`). New column added. Migration must run 5000 times. Serial: 5000 × 100ms = 500 seconds (8+ minutes best case, hours in practice with real DDL). Can't deploy new feature until all tenants migrated.
- **Scale trigger:** Growing tenant count, schema-per-tenant model, any schema change
- **Symptoms:** Migration time grows linearly with tenant count, deploys blocked waiting for migration, operations bottleneck
- **Solution:** Parallel migrations: run migrations for N tenants concurrently (bounded parallelism — don't overwhelm DB). Zero-downtime migrations: expand-contract pattern (add nullable column, deploy, backfill, add constraint). For schema-per-tenant at scale: migrate in batches with rollback capability. Consider migrating to shared-schema with `tenant_id` column to eliminate per-tenant migration overhead.
- **Lesson:** Schema-per-tenant multiplies migration time by tenant count. At 1000+ tenants, serial migrations become an operational crisis. Design migration strategy before choosing schema isolation model.

---

### 17.4 Tenant Feature Flag Propagation Delay

- **What happens:** Feature enabled for specific tenant via feature flag — tenant's UI shows feature, but backend check fails because flag cached from 5 minutes ago
- **Real pattern:** Feature flag for tenant: `flag:tenant:456:new-checkout=true`. Cached in service memory for 5 minutes. Sales enables flag for demo with enterprise prospect. Prospect demos feature — backend check reads stale cache (`false`). Feature appears broken. Deal lost.
- **Scale trigger:** Feature flags with longer cache TTLs, time-sensitive flag changes (demos, incident response, A/B tests)
- **Symptoms:** Flag enabled but feature not working, stale flag state causes behavior mismatch, TTL-dependent "eventually works"
- **Solution:** Subscribe to flag changes via Redis pub/sub: flag update publishes `flag:changed:tenant:456:new-checkout`. Service subscribes, invalidates local cache immediately. Or: reduce TTL to 10 seconds for tenant-specific flags (business-critical). Or: use LaunchDarkly streaming SDK — pushes flag changes in real-time instead of polling.
- **Lesson:** Feature flag TTL determines how long a flag change takes to propagate. For tenant-facing flags used in sales/demos/incidents, TTL must be seconds, not minutes. Use push (streaming/pub-sub) instead of pull (polling) for time-sensitive flags.

---

## Part 18 — Canary & Progressive Delivery Failures

### 18.1 Canary Without Metrics — Flying Blind

- **What happens:** Canary deployment at 5% traffic — no metrics baseline defined before canary — team doesn't know if canary is good or bad, leaves it at 5% indefinitely "just in case"
- **Real pattern:** v2 deployed to 5% of traffic. No defined success criteria. Error rate for canary: 0.3% (up from 0.1% in stable). Is 3× error rate acceptable? Team doesn't know what baseline is. Canary sits at 5% for 3 weeks "monitoring it." Real bugs never caught because no defined threshold.
- **Scale trigger:** Canary deployment without pre-defined success/failure criteria
- **Symptoms:** Canary never promoted or rolled back — stuck indefinitely, regressions not caught (no threshold to trigger rollback), deployment pipeline incomplete
- **Solution:** Define canary success criteria before deploying: `error_rate < 0.15%`, `p99_latency < 500ms`, `business_metric_orders_per_min > 95% of baseline`. Automate: Flagger (K8s) or Argo Rollouts automatically promote/rollback based on metrics. Canary without automated metrics-based promotion is a manual process that doesn't scale.
- **Lesson:** A canary without success criteria is not a controlled experiment — it's just traffic splitting. Define what "good" looks like before you deploy.

---

### 18.2 Canary Hitting Inconsistent Data — Version Mismatch

- **What happens:** v2 service introduces new DB column — canary (v2) writes new column, stable (v1) reads same row and ignores/breaks on new column — data written by v2 is incompatible with v1 readers
- **Real pattern:** v2 adds `discount_applied` boolean column. v2 pods write it. v1 pods (95% of traffic) read the same rows — their struct doesn't have `discount_applied`. In Go: unknown JSON field ignored (fine). In Postgres direct mapping: query fails if column selected explicitly.
- **Scale trigger:** Any DB schema change during canary where v1 and v2 both read/write the same tables
- **Symptoms:** v1 pods throwing DB errors on rows written by v2, inconsistent behavior between old and new pods, bugs that depend on which version handled the request
- **Solution:** Expand-contract migrations for canary compatibility: (1) Migration: add `discount_applied` as nullable with no constraint (expand). (2) Deploy v2 canary (writes new column). (3) v1 reads column as nullable — ignores null values. (4) After full v2 rollout: add NOT NULL constraint (contract). DB schema must be compatible with both versions during canary window.
- **Lesson:** Canary deployments require DB schema backward compatibility. Schema must work with both old and new service versions simultaneously. Expand-contract is the pattern.

---

### 18.3 Blue-Green Deployment — Database Migration Timing

- **What happens:** Blue-green switch flipped — new (green) environment has run migration that dropped a column — blue environment (rolled back to) now fails because column it expects is gone
- **Real pattern:** Green runs `ALTER TABLE orders DROP COLUMN legacy_field`. Traffic switched to green. Bug found. Rollback to blue. Blue code does `SELECT ..., legacy_field FROM orders`. Column gone. Rollback fails. Zero-downtime blue-green rollback is now impossible.
- **Scale trigger:** Any destructive migration (DROP COLUMN, DROP TABLE, renamed column) run before confirming green is stable
- **Symptoms:** Rollback to blue fails, forced to keep green (even with bugs), blue-green loses its rollback guarantee
- **Solution:** Never run destructive migrations as part of green deployment. Destructive steps run only after blue is decommissioned (no longer capable of rollback). Order: (1) Add new column (non-destructive). (2) Deploy green with new column usage. (3) Monitor green for 24 hours. (4) Decommission blue. (5) Drop old column. Keep rollback window open by delaying destructive changes.
- **Lesson:** Destructive DB migrations and blue-green deployments are incompatible. Run additive migrations before green, destructive migrations after blue decommission. Otherwise blue-green's rollback guarantee is illusory.

---

### 18.4 Shadow Testing Mismatch — Production Behavior Not Reproducible

- **What happens:** Shadow service tested with production traffic copy — shadow service reads from production DB for user context — shadow requests modify production state (caches, audit logs, counters)
- **Real pattern:** Shadow `checkout-service-v2` receives mirrored requests. Reads user cart from production Redis (fine). Writes `checkout:started` event to production audit log (not fine). Increments `checkout_attempts` counter in production analytics (not fine). Shadow is not isolated — writes bleed into production.
- **Scale trigger:** Shadow services that aren't fully read-only, any shadow service that calls production downstream services
- **Symptoms:** Production audit logs show 2× checkout attempts, analytics counts inflated by shadow traffic, side effects from testing visible in production data
- **Solution:** Shadow environment must be fully isolated for writes: read-only DB replica for shadow reads, isolated message queues (not production), mocked downstream services for write operations. Shadow service should validate its logic without causing production side effects. Difference between shadow and production responses logged for analysis — not executed.
- **Lesson:** Shadow testing only works if shadow service is a read-only observer. Any write from shadow to shared production state invalidates both the test and the production data.

---

## Part 19 — Service Contract & Versioning Failures

### 19.1 API Versioning Ignored — Breaking Change to All Clients

- **What happens:** Service changes response field from `string` to `int` without versioning — all API consumers break simultaneously on deployment
- **Real pattern:** `GET /users/123` returns `{ "age": "32" }` (string). Changed to `{ "age": 32 }` (integer). 15 consumers parse `age` as string. 15 consumers break on deployment. Emergency rollback. 3-hour incident. Age field remains a string forever because changing it would repeat the incident.
- **Scale trigger:** Any breaking change to a widely-consumed API, many downstream consumers
- **Symptoms:** Mass downstream breakage on deploy, emergency rollback, breaking change baked in forever out of fear
- **Solution:** API versioning: `/v1/users/123` (current, unchanged) and `/v2/users/123` (new behavior). Maintain v1 for deprecation period (3–6 months). Communicate deprecation via `Sunset` header and documentation. Consumer migration at their own pace. Additive-only changes (new fields) don't require new version — breaking changes always do.
- **Lesson:** Breaking API changes without versioning require all consumers to update simultaneously — impossible to coordinate at scale. Versioning allows independent migration. Breaking changes must never happen without a new version.

---

### 19.2 Internal API Treated as Public Contract

- **What happens:** `/internal/admin/users` endpoint added for ops tooling — 6 months later, 3 external consumers calling it — "internal" is now a public contract that can never change
- **Real pattern:** Internal endpoint documented in internal wiki. Mobile app team uses it to avoid rate limits. Analytics team queries it for bulk exports. Support tool built on it. Now "internal" endpoint has 3 untracked consumers. Changing it requires finding and migrating all 3.
- **Scale trigger:** Internal endpoints more convenient than public API, developer culture of "just use the internal one," no technical enforcement
- **Symptoms:** Internal endpoints have undiscovered external consumers, refactoring blocked by surprise dependents, security controls bypassed
- **Solution:** Technical enforcement: internal endpoints require internal-only authentication (service token not available to external clients). Network policy blocks external → internal service port. API gateway doesn't expose internal paths externally. Document and audit endpoint consumers via access logs. Internal means inaccessible to external clients — enforce it.
- **Lesson:** "Internal" without technical enforcement becomes "public with poor documentation." Enforce internal API access via auth and network policy — documentation alone doesn't work.

---

### 19.3 Consumer-Driven Contract Testing Not Run on Provider Change

- **What happens:** Provider (user-service) changes response structure, contract tests exist but not run in provider's CI — contract broken, discovered at deployment integration
- **Real pattern:** Pact contracts defined by consumers. Provider CI pipeline: build → unit tests → deploy. Pact verification not in CI. `user-service` renames `email` to `email_address`. Contract says consumers expect `email`. Contract broken. Discovered when consumers deployed against new provider — production deploy failure.
- **Scale trigger:** Contract tests existing but not enforced in provider CI, any team that doesn't run provider verification
- **Symptoms:** Contract tests pass in consumer CI, fail at integration, discovered late (deployment time), same as having no contract tests
- **Solution:** Provider verification must run in provider's CI: `pact:verify` in `user-service` pipeline before merge. Pact Broker: provider fetches consumer contracts from broker, verifies against them. Fail fast in provider CI if any consumer contract broken — not at deployment. Bi-directional contract testing: consumer AND provider verify independently.
- **Lesson:** Contract tests only work if the provider runs verification in their own CI. A contract test only in consumer CI is a test that catches bugs after the provider already merged the breaking change.

---

### 19.4 Overly Strict Consumer Contract — Coupling Provider Flexibility

- **What happens:** Consumer contract specifies exact response structure including all optional fields — provider can never add new fields without breaking the consumer's contract
- **Real pattern:** Pact consumer contract: `{ "id": 123, "name": "Alice", "age": 32, "role": "user" }` — exact match. Provider adds `"preferences": {}` (additive). Consumer Pact test fails because response doesn't match exact expected structure. Provider can't evolve without updating all consumers.
- **Scale trigger:** Many consumers with strict contract definitions, provider that needs to evolve its API
- **Symptoms:** Provider evolution blocked by strict consumers, adding optional fields requires updating all consumer contracts, rapid consumer contract update coordination overhead
- **Solution:** Consumer contracts should be minimal: only assert on fields the consumer actually uses. If consumer only uses `id` and `name`, contract should only verify `id` and `name` — not the full response. Pact supports this via selective matchers. Tolerant reader pattern: consumers ignore unknown fields (parse flexibly). Strict contracts should only assert on semantics the consumer depends on.
- **Lesson:** Consumer contracts should express what the consumer needs, not what the provider happens to return. Overly strict contracts couple consumers to provider implementation details.

---

## Part 20 — Chaos Engineering & Resilience Testing

### 20.1 No Chaos Testing — Untested Failure Assumptions

- **What happens:** Team assumes circuit breakers, retries, and failover work as designed — first real production failure reveals circuit breaker misconfigured, retries not triggered, failover takes 10 minutes instead of 30 seconds
- **Real pattern:** Circuit breaker code deployed and unit tested. Never tested in staging with real network failure. Production: upstream service goes down. Circuit breaker doesn't open (threshold misconfigured: `consecutiveFailures: 100`, should be `5`). 100 failures accumulate (30 seconds). 30-second cascade before circuit opens. Was designed to fail in 5 seconds.
- **Scale trigger:** Resilience mechanisms untested under real failure conditions, configuration drift from intended values
- **Symptoms:** Resilience mechanisms fail when needed most, longer outage duration than designed for, configuration bugs discovered in production incidents
- **Solution:** Chaos engineering: intentionally inject failures in staging (and eventually production). Tools: Chaos Monkey (instance termination), Toxiproxy (network latency/partition injection), Gremlin, AWS Fault Injection Simulator. Test: kill a pod, inject 1s latency on a downstream call, drop 10% of packets. Verify: circuit breaker opens in < 10 seconds, fallback returns expected defaults, recovery happens automatically.
- **Lesson:** Untested resilience mechanisms are assumptions, not guarantees. Chaos engineering converts "we think this works" into "we've proven this works." Run chaos experiments before the chaos finds you.

---

### 20.2 Chaos Without Rollback — Breaking Production Intentionally

- **What happens:** Chaos experiment run in production without proper rollback plan — experiment causes unexpected cascade failure — experiment can't be stopped fast enough, production incident from the "test"
- **Real pattern:** Chaos experiment: kill 1 of 3 payment-service instances. Expected: load balances to remaining 2. Actual: remaining 2 can't handle load (under-provisioned for N-1 scenario), both OOM killed, no payment-service instances running. Chaos experiment became real outage.
- **Scale trigger:** Chaos experiments without blast radius limitation, insufficient capacity for N-1 scenarios
- **Symptoms:** Chaos experiment causes real production outage, experiment can't be cleanly stopped, incident response triggered by the test
- **Solution:** Chaos experiment prerequisites: (1) Verify baseline health before starting. (2) Define rollback: how to stop the experiment in < 30 seconds. (3) Start small: kill 1 instance in staging first, verify recovery, then try production. (4) Set blast radius limit: never experiment on more than 1 instance at a time. (5) Game days: planned chaos experiments with full team aware. (6) Abort criteria: if error rate exceeds X%, stop experiment immediately.
- **Lesson:** Chaos without a rollback plan is just breaking things. Chaos engineering requires: staging first, small blast radius, instant abort capability, team awareness, and predefined success/failure criteria.

---

### 20.3 Load Testing Skipped — Capacity Unknown

- **What happens:** Service launched without load testing — unknown maximum throughput — first traffic spike overwhelms service, no capacity data to make scaling decisions
- **Real pattern:** `order-service` launched. Max tested: 10 concurrent users in dev. Production day-1 traffic: 500 concurrent users. Service slows at 200, falls over at 350. No data on: what's the bottleneck (CPU/memory/DB/connections)? How many instances needed for 500 users? Autoscaler config: guessed.
- **Scale trigger:** Any service launch, any significant traffic growth event (marketing campaign, product launch)
- **Symptoms:** Unexpected capacity ceiling discovered during real traffic, no data to set autoscaler thresholds, over- or under-provisioned (both cost money)
- **Solution:** Load test every service before launch and after major changes. Tools: k6, Gatling, Artillery, Locust. Measure: throughput at breaking point, resource utilization at 50/75/90% of max, what fails first (CPU, memory, DB connections, downstream service). Set autoscaler triggers at 70% of measured max. Run load test in staging with production-like data volume.
- **Lesson:** Capacity is not discoverable from code review or unit tests. Load testing is the only way to know where your service breaks and what breaks first. Run it before customers teach you.

---

### 20.4 Disaster Recovery Never Tested — RTO/RPO Unknown

- **What happens:** DB backup running nightly — DR plan written — but restore never tested. Real disaster: backup corrupt (silent), restore takes 6 hours (estimated 30 minutes), 6 hours of data loss (thought it was 1 hour). RTO and RPO assumed, never measured.
- **Real pattern:** Postgres RDS automated backups: yes. Restore tested: never. Disaster event: RDS instance unrecoverable. Restore from snapshot: 6 hours (large DB, snapshot restore slower than expected). Backup from 11 PM, failure at 9 AM: 10 hours of data loss. Team discovers backup was healthy, but 10-hour RPO never acceptable — nobody knew.
- **Scale trigger:** "We have backups" without "we've tested restoring them"
- **Symptoms:** Restore takes far longer than assumed, backup period longer than acceptable RPO, restore process broken/unfamiliar to team during high-pressure incident
- **Solution:** DR drill quarterly: actually restore from backup to a test environment, measure restore time (actual RTO), verify data freshness (actual RPO). Automate restore testing: nightly restore to test environment, verify application starts with restored data. Document restore procedure step by step. Alert on backup failure. Measure RTO/RPO from drills, not estimates.
- **Lesson:** Untested backup is an assumption. Untested restore is a false guarantee. Test your DR quarterly. Your actual RTO and RPO come from drill measurements, not architecture diagrams.

---

### 20.5 Dependency on Third-Party Service — No Fallback

- **What happens:** Email provider (SendGrid) has 2-hour outage — `notification-service` has no fallback — all transactional emails (order confirmations, password resets) fail during outage
- **Real pattern:** `email.Send(to, subject, body)` calls SendGrid API. SendGrid down. Function returns error. No retry (transient?), no queue, no fallback provider, no graceful degradation. Order confirmation emails not sent for 2 hours. Support ticket volume triples.
- **Scale trigger:** Any critical third-party dependency, single provider for critical function
- **Symptoms:** Critical emails not delivered during provider outage, no indication to users that email is delayed, support volume spike
- **Solution:** Never be blocked by a single provider for critical functionality. Options: (1) Queue emails when provider down, retry when recovered (RabbitMQ + dead letter for failed sends). (2) Fallback provider: if SendGrid fails, try Mailgun/SES (circuit breaker pattern). (3) Graceful degradation: queue for delayed send, show "email confirmation coming shortly" in UI. Decouple send from request: always queue, background worker sends — user never waits on third-party.
- **Lesson:** Third-party services have their own SLAs that are lower than your internal SLA requirements. Design for their failure. Queue email sends — never make user response time dependent on a third-party email API call.