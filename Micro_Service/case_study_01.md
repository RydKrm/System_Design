# Microservices — Complete Study & Failure Cases

> 12 Parts · 65 Cases — Real-world microservice failure patterns, distributed system study cases, inter-service communication failures, data consistency, deployment, and production lessons for backend engineers.

---

## Part 1 — Service Decomposition Failures

### 1.1 Premature Decomposition — Microservices Before Product-Market Fit

- **What happens:** Team splits monolith into 12 microservices on day one — feature velocity drops to near zero, 80% of engineering time spent on infra instead of product
- **Real pattern:** Startup with 3 engineers, 2 months in, splits into `user-service`, `auth-service`, `notification-service`, `billing-service`, `email-service`, `product-service`, `order-service`, `inventory-service`, `search-service`, `analytics-service`, `gateway-service`, `config-service`. Every feature touches 4 services, requires 4 PRs, 4 deployments, distributed debugging.
- **Scale trigger:** Engineering leadership imports patterns from Netflix/Amazon without importing Netflix/Amazon's scale
- **Symptoms:** Sprint velocity collapses, simple features take weeks, distributed debugging consumes senior engineer time, team morale drops
- **Solution:** Start with a well-structured monolith. Extract services only when: (a) a specific component needs independent scaling, (b) team size justifies Conway's Law decomposition (team per service), (c) the domain boundary is proven stable by production usage. Rule: extract when you feel the pain of NOT having a service, not before.
- **Lesson:** Microservices are an optimization for scale — organizational and technical. They are not an architecture style for small teams or early products. The cost is real and paid upfront.

---

### 1.2 Wrong Service Boundary — Chatty Services

- **What happens:** Services decomposed along technical layers (frontend-service, backend-service, db-service) instead of business domains — services call each other constantly for every operation
- **Real pattern:** `OrderService.createOrder()` calls `UserService.getUser()`, `InventoryService.checkStock()`, `PricingService.getPrice()`, `TaxService.calculateTax()`, `NotificationService.getPreferences()` — 5 synchronous network calls to complete one business operation. Any one of them slow = entire order creation slow.
- **Scale trigger:** High traffic amplifies the call fan-out — 1000 order requests/sec = 5000 downstream requests/sec across 5 services
- **Symptoms:** p99 latency is sum of all downstream latencies, partial failures cause full failures, distributed tracing shows massive fan-out on every request
- **Solution:** Design service boundaries around business capabilities (Domain-Driven Design bounded contexts), not technical layers. Each service should be able to complete its core operation with minimal synchronous calls to others. Denormalize data to reduce cross-service reads.
- **Lesson:** Service boundaries should minimize inter-service communication. If services are chatty, the boundary is wrong — either merge them or restructure the domain model.

---

### 1.3 Shared Database Anti-Pattern

- **What happens:** Five microservices all read and write to the same PostgreSQL database — schema change in one service breaks all others, defeating the purpose of microservices
- **Real pattern:** `user-service`, `order-service`, `notification-service` all have `import "shared-db-package"` pointing at the same Postgres. Schema migration adds `NOT NULL` column to `users` table without default — all services fail simultaneously. Independence illusion shattered.
- **Scale trigger:** Any schema change, any DB performance issue — shared DB creates single point of failure for all services
- **Symptoms:** Schema migrations require coordination across all teams, one service's bad query takes down all services, can't scale DB independently per service
- **Solution:** Database per service — each service owns its data, exposes it only via API. Data duplication is acceptable (even desirable) — sync via events. `order-service` stores its own copy of user name/email, updated via `user:updated` events from RabbitMQ. Services are now independently deployable.
- **Lesson:** A shared database is a distributed monolith. Independent deployability requires independent data stores. The pain of data duplication is smaller than the pain of shared schema coupling.

---

### 1.4 Service Granularity Too Fine — Nanoservices

- **What happens:** Services so small they have more infrastructure code than business logic — `get-user-by-email-service` is a Lambda that does one SQL query
- **Real pattern:** Each CRUD operation is a separate service/Lambda. `create-user-service`, `get-user-service`, `update-user-email-service`, `delete-user-service` — four deployments, four monitoring setups, four sets of DB connections for what should be one service with four methods.
- **Scale trigger:** Over-application of single responsibility principle at the wrong granularity
- **Symptoms:** Deployment overhead dominates development time, each "service" is 50 lines of business logic in 500 lines of boilerplate, operational complexity multiplied for no benefit
- **Solution:** Service granularity should be at the business capability level, not operation level. `user-service` handles all user-related operations. Within a service, use internal modules/packages for separation. Rule: a service should own a noun (users, orders, inventory), not a verb (create-user, get-order).
- **Lesson:** A service that is too small has higher operational cost than value. Granularity belongs at the business domain level — a service should be a capability, not a function call.

---

### 1.5 Circular Service Dependencies

- **What happens:** `user-service` calls `order-service` to get order count. `order-service` calls `user-service` to validate user. Circular dependency — deployment order matters, startup order matters, both can deadlock
- **Real pattern:** Service A depends on Service B for data. Service B depends on Service A for validation. During startup, A tries to call B (not up yet), fails. B tries to call A (not up yet), fails. Circular startup deadlock.
- **Scale trigger:** Poor domain modeling, services that share bidirectional responsibilities
- **Symptoms:** Services can't start independently, startup order dependency, change to A requires coordination with B and vice versa
- **Solution:** Break cycles by introducing events (async) or a third service. `user-service` publishes `user:created` event. `order-service` subscribes and caches user data locally — no runtime call to `user-service`. Or: extract the shared concern into a third service that both depend on (one direction only).
- **Lesson:** Circular service dependencies break independent deployability. Draw a dependency graph — it must be a DAG (directed acyclic graph), never cyclic.

---

## Part 2 — Inter-Service Communication Failures

### 2.1 Synchronous Chain — Cascading Latency

- **What happens:** Request chain: API Gateway → Service A → Service B → Service C → Service D — total latency is sum of all hops, p99 becomes catastrophic
- **Real pattern:** Gateway (10ms) → Order (20ms) → Inventory (30ms) → Pricing (25ms) → Tax (15ms). Average: 100ms. But p99 of each: 50ms each. p99 chain: 250ms. p999: each adds a tail — chain p999 approaches 1 second for a simple order creation.
- **Scale trigger:** Each hop adds latency variance. Chains of 4+ synchronous calls have multiplicative tail latency.
- **Symptoms:** p99 latency much worse than any individual service p99, latency grows with each service added to the chain
- **Solution:** Minimize synchronous chains. Use async (events/queues) for operations that don't require immediate response. Parallelize independent calls: call inventory + pricing + tax concurrently instead of sequentially (Go: goroutines + `errgroup`, Node: `Promise.all()`). Cache cross-service reads locally with short TTL.
- **Lesson:** Synchronous service chains multiply tail latency. Every hop in the chain adds to p99. Design to minimize chain depth and parallelize independent calls.

---

### 2.2 No Timeout on Downstream Calls — Thread Pool Starvation

- **What happens:** `payment-service` is slow (5s response), `order-service` has no timeout — all goroutines/threads stuck waiting for payment, order service completely unresponsive
- **Real pattern:** Go: `http.Get(paymentServiceURL)` with no context timeout. Payment service degrades. 500 goroutines all waiting for payment response. New requests queue up. Order service appears hung — healthcheck may still pass.
- **Scale trigger:** Any downstream service degradation, network partition, payment provider slowness
- **Symptoms:** Order service stops responding to all endpoints (not just payment), goroutine/thread count grows, memory leak as requests queue up
- **Solution:** Every outgoing call must have a context timeout: `ctx, cancel := context.WithTimeout(ctx, 2*time.Second); defer cancel(); resp, err := http.NewRequestWithContext(ctx, ...)`. Timeout must be shorter than caller's timeout. Define timeout budget per operation.
- **Lesson:** No timeout = indefinite goroutine block. Set aggressive timeouts (2–5s) on all downstream calls. A slow response is always worse than a fast failure.

---

### 2.3 Retry Without Idempotency — Double Processing

- **What happens:** `order-service` retries failed payment call — payment actually succeeded (response lost in network), order charged twice
- **Real pattern:** Payment request sent, network timeout. Order service retries. Payment provider processed first request (charged card), just response didn't arrive. Second request charges again. Customer charged twice, order created once.
- **Scale trigger:** Any retry logic on non-idempotent operations — payments, emails, inventory decrements, any side-effectful operation
- **Symptoms:** Duplicate charges, duplicate emails, double inventory decrements, customer support tickets about double billing
- **Solution:** Idempotency keys: generate UUID before request, send in header `Idempotency-Key: <uuid>`. Payment provider detects duplicate key, returns first response without reprocessing. Store key+response: retry returns cached result. For internal services: idempotency at DB level (`INSERT ... ON CONFLICT DO NOTHING`).
- **Lesson:** Retry + non-idempotent operation = guaranteed eventual duplicate. Every mutating operation must be idempotent before you can safely retry it.

---

### 2.4 Service Discovery Hardcoded URLs — Configuration Drift

- **What happens:** Service URLs hardcoded in config files — different URLs in dev/staging/production, wrong URL deployed to production, service calls wrong environment
- **Real pattern:** `PAYMENT_SERVICE_URL=http://payment-service:8080` in Docker Compose. Staging: `http://payment-staging.internal`. Production: `http://payment-prod.internal`. Wrong value in one environment's config = calls wrong service, data leaks between environments.
- **Scale trigger:** Multiple environments, manual config management, fast-growing service count
- **Symptoms:** Staging traffic hitting production services (billing!), production calling dev services (no auth), config inconsistencies discovered in incidents
- **Solution:** Service discovery instead of hardcoded URLs: Docker/Kubernetes DNS (`http://payment-service`), Consul, or environment-specific config injection via Kubernetes ConfigMaps/Secrets. Never hardcode environment-specific values in code — inject via environment variables managed per-environment.
- **Lesson:** Service URLs are environment-specific configuration, not code. Use service discovery or environment-variable injection. Hardcoded URLs are a deployment accident waiting to happen.

---

### 2.5 gRPC Proto Breaking Change — Silent Incompatibility

- **What happens:** `user-service` updates proto definition — removes a field, renames a field — `order-service` compiled against old proto still runs but silently gets zero values for removed fields
- **Real pattern:** Proto field `user.phone_number` (field 5) removed and replaced with `user.phone` (field 6). Old client reads field 5 — gets empty string. No error, no warning. Order service now sends SMS to empty phone number, fails silently.
- **Scale trigger:** Any proto schema change without backward compatibility verification
- **Symptoms:** Silent data loss, operations failing with no error (empty strings treated as valid), only discovered when side effects (SMS, email) don't happen
- **Solution:** Protobuf backward compatibility rules: never remove or reuse field numbers. Add new fields, deprecate old ones. Use `reserved` keyword for removed fields. Implement proto linting in CI (Buf CLI: `buf breaking`). Deploy consumers before producers on field additions. Keep `deprecated` fields for 2+ release cycles.
- **Lesson:** Proto field number is the wire contract. Never remove or reuse a field number. Backward compatibility in proto is a discipline, not automatic.

---

## Part 3 — Data Consistency Failures

### 3.1 Distributed Transaction Without Saga Pattern

- **What happens:** Order creation needs to: reserve inventory, charge payment, create order record — if payment fails after inventory reserved, inventory is stuck reserved forever
- **Real pattern:** `InventoryService.reserve()` succeeds. `PaymentService.charge()` fails. No compensation. Inventory reserved for an order that doesn't exist. Customer can't order (stock appears unavailable), inventory never released.
- **Scale trigger:** Any multi-service operation that needs all-or-nothing semantics
- **Symptoms:** Data inconsistency between services, "phantom" reservations consuming inventory, manual cleanup required
- **Solution:** Saga pattern — choreography or orchestration:
    - **Choreography:** Each service publishes success/failure event. `inventory:reserved` → payment charges. `payment:failed` → inventory releases. Events trigger compensating transactions.
    - **Orchestration:** Central saga orchestrator (a service or state machine) tracks steps, issues compensating commands on failure. Easier to reason about, single point of coordination.
- **Lesson:** Distributed transactions don't exist. The Saga pattern is the standard solution — design compensating transactions for every step before implementing the forward path.

---

### 3.2 Eventual Consistency Misunderstood — Stale Read Decisions

- **What happens:** Order service reads eventually consistent user credit limit — user's credit was just exceeded elsewhere, order service doesn't know yet, approves over-limit order
- **Real pattern:** Credit limit updated in `user-service`. Event published to RabbitMQ. `order-service`'s local copy not yet updated (50ms lag). Order approved using stale credit limit. User exceeds credit limit.
- **Scale trigger:** High update frequency on data used for business decisions, fast-moving financial data
- **Symptoms:** Business rule violations due to stale reads, financial exposure from consistency window, hard to reproduce (race condition)
- **Solution:** Classify data by consistency requirement. For financial decisions (credit limit, inventory for last unit): synchronous call to authoritative service at decision time, not cached copy. For display data (user name, profile photo): eventual consistency is fine. Design reads around business risk, not just performance.
- **Lesson:** Eventual consistency is not a uniform policy — it's a trade-off per data type. Business-critical decisions need strong consistency. Casual reads can be eventual. Classify explicitly.

---

### 3.3 Event Ordering Violation — Out-of-Order Processing

- **What happens:** `user:created` followed by `user:deleted` published to RabbitMQ — consumer processes `user:deleted` first (faster worker), then `user:created` — deleted user gets recreated
- **Real pattern:** High load, multiple consumers. `user:deleted` event (small payload, fast processing) overtakes `user:created` (larger payload, image processing). Consumer applies delete, then create. User who should be deleted is now active.
- **Scale trigger:** Multiple consumers, variable processing time per event type, any parallel event processing
- **Symptoms:** Data appears recreated after deletion, inconsistent state after event replay, hard to debug (order-dependent bugs)
- **Solution:** Use per-entity sequence numbers in events: `{ entityId: "user:123", seq: 42, event: "deleted" }`. Consumer tracks last processed seq per entity — rejects events with seq < last seen. Or: use Kafka with partition-key = entityId — guarantees order per entity within partition. Or: use optimistic locking in consumer with entity version.
- **Lesson:** Message queues don't guarantee order under parallel consumption. Design consumers to be order-tolerant, or enforce order via partitioning by entity ID.

---

### 3.4 Dual Write Inconsistency — DB and Event Out of Sync

- **What happens:** Service writes to DB then publishes event — DB write succeeds, event publish fails — downstream services never notified of the change
- **Real pattern:** `tx.Commit()` → `rabbitMQ.Publish("user:updated", event)` → publish times out. User updated in DB. No event published. `notification-service` never sends the confirmation email. User doesn't get their password reset email.
- **Scale trigger:** Any pattern of write-then-publish without atomicity guarantee
- **Symptoms:** Downstream services out of sync with source of truth, missing notifications, data divergence discovered hours or days later
- **Solution:** Outbox Pattern: write event to `outbox` table in the same DB transaction as the main write. Separate process (polling or CDC via Debezium/pglogical) reads outbox and publishes to RabbitMQ. Event is only published if DB write committed. Guaranteed at-least-once delivery.
- **Lesson:** DB write and message publish cannot be made atomic without the Outbox Pattern. Dual write always has a failure window. The Outbox Pattern is the standard fix.

---

### 3.5 Missing Idempotent Consumer — Duplicate Event Processing

- **What happens:** RabbitMQ redelivers event after consumer ACK is lost in transit — `send-welcome-email` handler runs twice, user receives two welcome emails
- **Real pattern:** Consumer processes `user:created` event, sends email, sends ACK. ACK lost (network blip). RabbitMQ thinks event unacknowledged, redelivers to another consumer. Second welcome email sent.
- **Scale trigger:** Any network instability, consumer restart during processing, RabbitMQ redelivery (at-least-once delivery is the guarantee)
- **Symptoms:** Duplicate emails, duplicate charges, duplicate records, user complaints about spam
- **Solution:** Idempotent consumers: track processed event IDs in Redis or DB: `processed_events(event_id PRIMARY KEY)`. Before processing: `INSERT INTO processed_events(event_id) VALUES(?) ON CONFLICT DO NOTHING` — if 0 rows inserted, skip (already processed). Or: business-level idempotency: `send_email WHERE NOT EXISTS (email already sent for this user:created event)`.
- **Lesson:** Message queues guarantee at-least-once delivery. Duplicate delivery is guaranteed to eventually happen. Every consumer must be idempotent.

---

## Part 4 — API Gateway Failures

### 4.1 API Gateway as Business Logic Host

- **What happens:** Business logic added to the API Gateway (route-level transformations, business rules, data aggregation) — gateway becomes a bottleneck and tight coupling point
- **Real pattern:** Gateway does: auth validation + rate limiting + request transformation + response aggregation + business rule enforcement + data enrichment. Change to any business rule requires gateway deployment. Gateway team becomes a bottleneck for every other team.
- **Scale trigger:** Convenience — gateway already touches every request, easy to add "one more thing"
- **Symptoms:** Gateway deployments needed for business logic changes, gateway codebase grows unmanageable, gateway team is permanently blocked by other teams' requests
- **Solution:** Gateway responsibility: routing, auth validation (not auth logic), rate limiting, SSL termination, request/response logging. Business logic lives in services. BFF (Backend for Frontend) pattern: separate BFF service per client type (mobile BFF, web BFF) handles aggregation — not the gateway.
- **Lesson:** API Gateway is infrastructure, not a service. Business logic in the gateway creates organizational and technical coupling. Gateway should be configuration-driven, not code-driven.

---

### 4.2 No Rate Limiting — Downstream Services Overloaded

- **What happens:** Single client (or attacker) floods API gateway — no rate limiting, request wave propagates to all downstream services, cascade failure
- **Real pattern:** Misconfigured client sends 10,000 requests/sec to `/api/orders`. Gateway forwards all. `order-service`, `inventory-service`, `payment-service` all receive 10K req/sec. All go down. Legitimate users can't place orders.
- **Scale trigger:** Any public API endpoint, misconfigured clients, DDoS attacks
- **Symptoms:** All downstream services overwhelmed simultaneously, legitimate users blocked, costs spike (serverless billing)
- **Solution:** Rate limiting at gateway: per-IP (`X-Forwarded-For`), per-API-key, per-user-ID. Use token bucket algorithm: burst allowance + sustained rate. Tools: Kong rate-limiting plugin, Nginx `limit_req_zone`, Envoy rate limit filter. Return `429 Too Many Requests` with `Retry-After` header. Different limits for different endpoints (read vs write).
- **Lesson:** Rate limiting is the first line of defense for every public API. It protects downstream services from both attackers and buggy clients. Implement before launch.

---

### 4.3 Auth Token Validation on Every Service — Repeated Work

- **What happens:** Every microservice validates JWT independently — same public key fetch, same signature verification, same claims parsing on every service for every request
- **Real pattern:** 8 services each call auth service to validate token: `authService.validate(token)`. 1000 requests/sec × 8 services = 8000 auth validations/sec. Auth service becomes a bottleneck and single point of failure for the entire system.
- **Scale trigger:** Growing number of services, high request rate
- **Symptoms:** Auth service under disproportionate load, auth service outage takes down all services, redundant computation across services
- **Solution:** Validate JWT at the gateway (signature + expiry check). Attach decoded claims to forwarded request headers: `X-User-ID: 123`, `X-User-Role: admin`. Downstream services trust gateway-set headers (internal network only), skip JWT validation. Auth service only needed for token issuance and revocation, not validation on every request.
- **Lesson:** JWT validation belongs at the gateway, once. Downstream services trust forwarded identity headers from the gateway — they don't re-validate the token.

---

### 4.4 Gateway Single Point of Failure

- **What happens:** API Gateway goes down — entire system inaccessible, all 20 microservices unreachable despite being healthy
- **Real pattern:** Single Nginx instance as gateway. Nginx OOM killed (misconfigured worker memory), all traffic drops. Every service behind it healthy but unreachable. Full outage.
- **Scale trigger:** Any hardware failure, OOM, deployment error, cert expiry on single gateway instance
- **Symptoms:** 100% traffic drop, all services healthy in monitoring, 503 from the edge
- **Solution:** Gateway high availability: multiple gateway instances behind a cloud load balancer (ALB, GCP LB). Minimum 2 instances across availability zones. Health checks on gateway instances. Auto-recovery via autoscaling group. Gateways are stateless (no session state) — safe to run multiple instances. Monitor gateway separately from services.
- **Lesson:** The API Gateway is the most critical single point of failure in a microservice system. It must be the most redundant component, not an afterthought.

---

## Part 5 — Event-Driven Architecture Failures

### 5.1 Dead Letter Queue Not Monitored — Silent Message Loss

- **What happens:** 10,000 messages failing processing (bad payload format) route to Dead Letter Queue — DLQ not monitored, messages sit there indefinitely, nobody knows 10K orders weren't processed
- **Real pattern:** `order:created` events published with wrong JSON schema (new field added without consumer update). Consumer throws deserialization error, requeues. After max retries, moves to DLQ. DLQ has no alert. Orders are lost. Customer support tickets start 2 hours later.
- **Scale trigger:** Any schema change without consumer coordination, any new failure mode in consumers
- **Symptoms:** Silent order loss, customer complaints hours after the event, DLQ count growing while nobody watches
- **Solution:** DLQ is not a garbage bin — it's an alert. Set alarm on DLQ depth > 0 (PagerDuty/OpsGenie). DLQ messages must be reviewed and replayed (with fix) or explicitly discarded. Build DLQ replay tooling: fix consumer, replay DLQ messages in order. Treat DLQ depth as a P1 metric.
- **Lesson:** An unmonitored DLQ is a silent data loss sink. Alert immediately on any DLQ message. DLQ depth > 0 is always an incident.

---

### 5.2 Event Schema Versioning — Breaking Consumer

- **What happens:** Producer adds required field to event, consumer deployed second — during the window, consumers receive events without the required field, crash, queue backs up
- **Real pattern:** `user:created` event gains required `email_verified` field. Producer deployed first. Consumer (not yet deployed) receives new event, fails JSON schema validation, requeues. Queue depth grows, consumers crash-loop, alert fires, engineers wake up at 3 AM.
- **Scale trigger:** Any event schema change, any producer-before-consumer deployment order
- **Symptoms:** Queue depth growing, consumers in crash loop, messages in DLQ, deployment-time outage
- **Solution:** Additive-only schema changes: never remove or rename fields. New required fields must have defaults in old consumers. Consumer-before-producer deployment order. Use schema registry (Confluent Schema Registry, AWS Glue Schema Registry) to enforce compatibility. Versioned event types: `user:created:v1` vs `user:created:v2`.
- **Lesson:** Event schemas are a contract between producer and all consumers. Changes must be backward compatible. Deploy consumers first (tolerant reader), then producers.

---

### 5.3 Poison Message — Consumer Stuck in Crash Loop

- **What happens:** One malformed message causes consumer to crash on every processing attempt — consumer restarts, re-fetches same message, crashes again. Queue processing halted for all messages.
- **Real pattern:** Order event with `order_id: null`. Consumer handler: `order.id.toString()` — null pointer panic. Consumer exits. RabbitMQ redelivers to new consumer instance. Crash. Redelivery. Crash. All other messages in the queue behind the poison message are blocked.
- **Scale trigger:** Any unexpected input format, any null/missing field not defensively handled
- **Symptoms:** Consumer restart loop (visible in Docker/K8s), queue processing halted, message stuck at front of queue, all subsequent messages blocked
- **Solution:** Defensive consumer code: validate all fields before processing, never assume shape of incoming data. Set max redelivery count (3–5): after max retries, move to DLQ automatically (`x-dead-letter-exchange` in RabbitMQ). DLQ alert triggers (see 5.1). Consumer continues processing other messages while poison message is isolated.
- **Lesson:** One bad message must not block an entire queue. Max redelivery + DLQ is the poison message pattern. Defensive deserialization is mandatory — external event data is untrusted input.

---

### 5.4 Event Sourcing Without Snapshot — Replay Performance

- **What happens:** Order aggregate rebuilt by replaying 50,000 events on every read — order detail page takes 15 seconds to load
- **Real pattern:** Event sourcing: `OrderCreated`, `ItemAdded` (×200), `PriceUpdated` (×100), `ShippingUpdated` (×50)... 50,000 events per order aggregate. Reading current order state requires replaying all events. No snapshot.
- **Scale trigger:** Long-lived aggregates with many events, high read traffic, any aggregate accessed frequently
- **Symptoms:** Read latency grows linearly with event count, old orders take longer to load than new ones, DB read load high on aggregate reconstruction
- **Solution:** Snapshots: after every N events (e.g., 100), save a snapshot of current aggregate state. On read: load latest snapshot + events since snapshot. Replay cost: snapshot deserialization + N events instead of all events. Store snapshots in separate table: `order_snapshots(order_id, version, state, created_at)`.
- **Lesson:** Event sourcing read performance degrades with aggregate age. Snapshots are mandatory for long-lived aggregates or aggregates with frequent reads. Design snapshotting strategy before event store grows large.

---

### 5.5 Queue Depth Growing — Consumer Can't Keep Up

- **What happens:** `order:created` queue depth grows from 0 to 100,000 during traffic spike — consumer processing rate 100/sec, production rate 1000/sec — queue grows by 900/sec
- **Real pattern:** Single consumer instance processing orders at 100/sec. Flash sale starts, 1000 orders/sec enqueued. Queue falls 15 minutes behind. Orders "placed" but not confirmed for 15+ minutes. Customers assume checkout broken, retry, double orders.
- **Scale trigger:** Traffic spikes, flash sales, viral events, seasonal peaks
- **Symptoms:** Queue depth monotonically growing, order confirmation delay proportional to queue depth, customers experiencing long confirmation delays
- **Solution:** Auto-scale consumers based on queue depth: KEDA (Kubernetes Event-Driven Autoscaling) scales pods based on RabbitMQ queue depth. Or: manual horizontal scaling `docker service scale order-consumer=20`. Pre-scale before known events (flash sales). Monitor queue depth and consumer lag as primary SLOs.
- **Lesson:** Queue depth is a leading indicator of consumer lag. Monitor it. Scale consumers before the queue falls behind, not after customers complain.

---

## Part 6 — Service Mesh & Network Failures

### 6.1 No Circuit Breaker — Cascade Failure

- **What happens:** `recommendation-service` is slow (DB index missing), all callers wait, callers' thread pools fill, entire platform goes down because of one slow non-critical service
- **Real pattern:** `product-service` calls `recommendation-service` for "similar products". Recommendations go slow (5s). `product-service` goroutines pile up waiting. `product-service` becomes slow. `api-gateway` waiting on `product-service`. Gateway thread pool fills. Platform down. All because of non-critical recommendation widget.
- **Scale trigger:** Any non-critical service in the synchronous call path, any downstream service degradation
- **Symptoms:** Cascading slowness, unrelated services becoming slow, platform-wide outage from one service's degradation
- **Solution:** Circuit breaker (Go: `sony/gobreaker`, `hystrix-go`): after 5 failures in 10 seconds, open circuit — return cached/default response immediately without calling downstream. After 30s, try one request (half-open) — if succeeds, close circuit. Product page shows "recommendations unavailable" instead of timing out. Non-critical service failure isolated.
- **Lesson:** Every synchronous call to a non-critical service needs a circuit breaker. Fail fast and degrade gracefully rather than propagating slowness across the system.

---

### 6.2 Service Mesh Sidecar Overhead — Latency Budget Consumed

- **What happens:** Adding Istio/Linkerd service mesh adds 10–15ms latency per hop — in a 5-service chain, mesh overhead (50–75ms) exceeds the latency budget for the entire operation
- **Real pattern:** Each Istio Envoy proxy adds ~7ms overhead (iptables redirect + proxy + TLS). 5-service chain: 5 × 7ms = 35ms overhead just from mesh. Service operations: 50ms total. With mesh: 85ms. SLA: 100ms. Tight.
- **Scale trigger:** Complex service topologies, strict latency SLAs, high call frequency
- **Symptoms:** Latency increases uniformly across all service calls after mesh deployment, overhead proportional to service chain length
- **Solution:** Measure mesh overhead before committing. Not every service needs a full service mesh. Direct service-to-service for latency-critical internal paths. Reserve mesh for cross-team services needing mTLS, observability, traffic management. Use eBPF-based mesh (Cilium) — lower overhead than sidecar proxy.
- **Lesson:** Service mesh has real latency overhead per hop. Measure the cost before mandating it. Not all service communication needs mesh features.

---

### 6.3 mTLS Not Enforced — Internal Traffic Unencrypted

- **What happens:** Microservices communicate over internal network without TLS — attacker with internal network access intercepts plaintext JWT tokens and DB passwords between services
- **Real pattern:** Services on same K8s cluster communicate over HTTP. `auth-service` sends user credentials to `session-service` in plaintext. Compromised pod in same namespace can sniff traffic with `tcpdump`.
- **Scale trigger:** Multi-tenant K8s clusters, compromised container in same namespace, insider threat
- **Symptoms:** Security audit finding, credential interception possible, compliance failure (PCI-DSS, SOC2 require encryption in transit)
- **Solution:** mTLS via service mesh (Istio, Linkerd) encrypts all pod-to-pod communication automatically. Or: manual TLS with cert management (cert-manager in K8s). Network policies (Kubernetes NetworkPolicy) to restrict which pods can talk to which. Zero-trust: encrypt and authenticate all service-to-service communication.
- **Lesson:** "Internal network" is not a trust boundary. Zero-trust networking encrypts and authenticates all service communication regardless of network position.

---

### 6.4 Load Balancer Not Aware of Service Health — Sending to Dead Instances

- **What happens:** Service instance is down but load balancer still sends 1/N traffic to it — 33% of requests fail if 1 of 3 instances is dead
- **Real pattern:** Instance 3 OOM killed. Load balancer health check interval: 30 seconds. For 30 seconds, load balancer continues sending traffic to dead instance. 33% of requests fail with connection refused.
- **Scale trigger:** Any instance failure, rolling deployment removing instances, OOM kills
- **Symptoms:** 30–50% error rate for 30 seconds after each instance death, customers see errors, correlated with instance failures
- **Solution:** Reduce health check interval: `healthcheck interval: 5s, timeout: 3s, unhealthy_threshold: 2` — detect failure in 10 seconds instead of 30. Passive health checking: remove instance from rotation immediately on connection error (Nginx `proxy_next_upstream error timeout`). K8s: readiness probe removes pod from service endpoints immediately on failure.
- **Lesson:** Health check interval is your failure detection latency. Tune it aggressively. Passive failure detection (removing on first error) is faster than polling.

---

## Part 7 — Deployment & Configuration Failures

### 7.1 Missing Feature Flags — Big Bang Deploy

- **What happens:** New feature deployed to all users simultaneously — bug in new feature affects 100% of users immediately, requires emergency rollback with downtime
- **Real pattern:** Order redesign feature deployed to production. Critical bug discovered: 10% of orders fail. 100% of users affected. Rollback requires redeployment (5 minutes downtime). 5 minutes × all users = significant revenue impact.
- **Scale trigger:** Any significant feature change, any database schema change, any behavioral change to core flows
- **Symptoms:** Full user impact on any bug, rollback is a deploy (slow), engineers afraid to deploy
- **Solution:** Feature flags: deploy code to production with feature disabled. Enable for 1% of users, monitor error rate. Roll to 10%, 50%, 100% over hours/days. On issue: disable flag (instant, no deploy). Tools: LaunchDarkly, Unleash (open source), simple Redis-backed flag service.
- **Lesson:** Code deploy and feature release are separate events. Feature flags decouple them. Gradual rollout with instant rollback changes "deploy = risk" to "deploy = routine".

---

### 7.2 ConfigMap Change Without Restart — Stale Config

- **What happens:** Kubernetes ConfigMap updated with new DB connection string — running pods don't reload config, continue connecting to old DB, new pods use new config — split behavior
- **Real pattern:** ConfigMap `database.url` updated from DB A to DB B. Existing pods: reading config from environment variable set at startup — still pointing to DB A. New pods started by autoscaler: point to DB B. 50% of requests go to wrong DB.
- **Scale trigger:** Any runtime config change in K8s ConfigMap/Secret that pods read as env vars at startup
- **Symptoms:** Inconsistent behavior between old and new pods, half the requests work, half fail, correlated with config change time
- **Solution:** ConfigMap changes that matter require pod restart: `kubectl rollout restart deployment/service-name`. Use config reloading sidecars (Reloader by Stakater) that auto-restart pods on ConfigMap change. Design services to support runtime config reload via SIGHUP for non-critical config. Document which config changes require restart.
- **Lesson:** Environment variable-based config is fixed at pod start. ConfigMap updates don't propagate to running pods. Know which config changes require a rollout restart.

---

### 7.3 Migration Deployed With Service — Schema Lock

- **What happens:** New service version runs migration on startup — migration takes 10 minutes (large table alter) — all N replicas try to migrate simultaneously, DB locks, service unavailable for 10 minutes
- **Real pattern:** `ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50)` in migration script run at startup. Orders table has 50M rows. Migration locks table for 8 minutes. All 5 replicas try simultaneously, contending on lock. Service startup loop, health checks fail, Kubernetes kills pods, new ones start, try migration again.
- **Scale trigger:** Large tables, ALTER TABLE without CONCURRENTLY (Postgres), migrations embedded in service startup
- **Symptoms:** Service won't start, DB table locked, Kubernetes crash loop during deployment, data briefly inaccessible
- **Solution:** Separate migrations from service startup: run as pre-deploy K8s Job or CI/CD step. Use `ALTER TABLE ... CONCURRENTLY` in Postgres for index creation on live tables (no lock). For large column adds: expand-contract pattern (add nullable column first, backfill, then add constraint). Never run long migrations at service startup.
- **Lesson:** Migrations and service deployments are separate operations with separate failure modes. Long-running migrations must run before the service deployment, not during it.

---

### 7.4 Environment Parity — "Works in Staging" Bug

- **What happens:** Bug only manifests in production — staging has 1 replica, production has 10. Race condition only appears at 10 replicas. Staging never reveals it.
- **Real pattern:** Distributed lock bug: works perfectly with 1 instance. With 10 instances, two acquire the lock simultaneously (wrong implementation). Only appears in production scale. Staging has single instance, different Redis config, different network latency — fundamentally different environment.
- **Scale trigger:** Any concurrency bug, race condition, resource contention — all invisible at 1-replica scale
- **Symptoms:** Production incidents from bugs that "never appeared in staging", engineers distrust staging environment, production becomes the real test environment
- **Solution:** Staging should mirror production: same replica count (or proportional), same Redis cluster (not single instance), same network topology. Chaos engineering in staging: kill instances, inject latency, partition networks. Load test staging before promoting to production. Treat staging environment drift as a risk to fix, not to accept.
- **Lesson:** Staging that doesn't resemble production at scale finds unit-level bugs, not system-level bugs. Concurrency bugs only appear at production concurrency.

---

## Part 8 — Observability Failures

### 8.1 No Distributed Tracing — Impossible to Debug

- **What happens:** User reports slow checkout — checkout touches 7 services — without tracing, engineer manually correlates logs from 7 separate log streams to find the slow hop. Takes 4 hours.
- **Real pattern:** Gateway log: request ID `abc123`, 3.2s total. Order service log: `abc123`, 200ms. Inventory log: no `abc123` (didn't propagate trace ID). Engineer can't trace the missing 3 seconds. Digs through all 7 service logs for the 30-minute window. Finds it was tax service after 4 hours.
- **Scale trigger:** Any system with 3+ services, any inter-service latency investigation
- **Symptoms:** MTTR for performance issues measured in hours, "we can't reproduce it" because logs aren't correlated, engineers spending investigation time on log correlation instead of fixing
- **Solution:** OpenTelemetry: instrument every service to propagate `trace-id` and `span-id` in headers (`traceparent`). Every log line includes trace ID. Ship to Jaeger, Tempo, or Honeycomb. Single trace view shows all 7 service spans for one request, latency breakdown per service, where time was spent.
- **Lesson:** Distributed tracing is not optional beyond 3 services. Without it, debugging inter-service issues is archaeology — sifting through disconnected log streams.

---

### 8.2 Logging Everything — Signal Buried in Noise

- **What happens:** Every service logs at DEBUG level in production — 10 services × 1000 req/s × 20 log lines/request = 200,000 log lines/sec. Real errors buried. Log storage costs $5K/month.
- **Real pattern:** INFO log for every request start/end, DEBUG log for every DB query, every cache hit/miss, every header. Error rate 0.1% = 200 error lines/sec buried in 200,000 total lines/sec. Alert fires, engineer searches logs, can't find error in noise.
- **Scale trigger:** Debug logging in production, high traffic, log verbosity not environment-specific
- **Symptoms:** Log storage costs scale with traffic (not with incidents), alert → root cause time long (noise), important errors missed
- **Solution:** Production log levels: ERROR (unexpected failures) + WARN (degraded but functioning) + INFO (significant business events: order created, user signed up). DEBUG/TRACE: local dev only. Sample high-frequency info logs (1 in 100 for routine requests). Use metrics (Prometheus) for rates and distributions, logs for discrete events.
- **Lesson:** Logs should be for discrete notable events, not a continuous stream of everything. Use metrics for rates and aggregates. Log verbosity in production is a cost and signal-to-noise problem.

---

### 8.3 Missing Business Metrics — Alert on Symptoms Not Causes

- **What happens:** Technical metrics all green (CPU, memory, latency, error rate normal) but revenue is 0 — payment integration silently broken, technically successful requests but payments not processed
- **Real pattern:** Payment provider returns 200 with `{ "status": "queued" }` — always has, even for failures. Service treats 200 as success. Error rate = 0%. But payments actually failing: `{ "status": "queued", "result": "declined" }`. Business metric: orders paid per minute = 0. Technical metrics: all green.
- **Scale trigger:** Integration with third-party services, any async workflow where technical success ≠ business success
- **Symptoms:** Technical monitoring gives false confidence, business impact discovered hours later via revenue report
- **Solution:** Business metrics alongside technical: orders placed/min, orders paid/min, orders fulfilled/min, revenue/hour. Alert on business metric anomalies: `orders_paid_per_minute < threshold` for 5 minutes = P1. Monitor the business outcome, not just the technical operation.
- **Lesson:** Technical metrics measure process health. Business metrics measure outcome health. Both are required. A technically healthy system that produces wrong business outcomes is broken.

---

### 8.4 Alert Fatigue — Noisy Alerts Ignored

- **What happens:** 200 alerts configured, average 50 fire per day, all sent to same Slack channel — engineers mute the channel, real P1 goes unnoticed for 2 hours
- **Real pattern:** Alert on CPU > 70% (fires constantly), memory > 80% (fires constantly), disk > 85% (fires daily), p95 latency > 500ms (fires under normal load spikes). Real incident: payment service down. Alert fires. Lost in the noise of 49 other alerts that day.
- **Scale trigger:** Growing microservice count × low-threshold alerts per service = alert explosion
- **Symptoms:** Engineers ignoring alerts ("it always fires"), real incidents discovered by users not alerts, alert Slack channel muted
- **Solution:** Alert on symptoms, not causes. Only alert on what requires immediate human action. Alert tiers: P1 (wake someone up) = error rate spike, business metric drop, total service unavailability. P2 (fix during business hours) = elevated latency, resource approaching limit. Remove alerts that don't require action. Target: < 5 actionable alerts per day per on-call engineer.
- **Lesson:** Alerts that don't require action train engineers to ignore alerts. Fewer, higher-quality alerts are safer than many low-quality ones. Alert on what requires human action, nothing else.

---

## Part 9 — Security Failures in Microservices

### 9.1 Trust Internal Services Implicitly — No Auth Between Services

- **What happens:** Services communicate over internal network with no authentication — compromised `frontend-service` calls `user-service` admin endpoint directly, extracts all user data
- **Real pattern:** `user-service` admin endpoint: `GET /internal/users/all` — no auth required because "it's internal". Attacker compromises `frontend-service`. From compromised pod, calls `http://user-service/internal/users/all`. Gets all user PII.
- **Scale trigger:** Any compromise of any internal service in the cluster, misconfigured network policy
- **Symptoms:** Data breach via lateral movement, internal endpoints exploited after initial compromise
- **Solution:** Zero-trust internal auth: service-to-service JWT with service identity, or mTLS (mutual TLS via Istio/Linkerd). Internal endpoints require `X-Service-Token` validated against a service registry. Kubernetes NetworkPolicy: only authorized services can reach internal ports. Never assume internal = trusted.
- **Lesson:** "Internal" is not a security boundary. Any compromised service in the mesh can reach any other service without auth. Zero-trust means authenticate all service-to-service calls.

---

### 9.2 Secrets in Environment Variables — Visible in K8s

- **What happens:** DB passwords in Kubernetes Deployment manifest environment variables — plaintext secrets committed to Git repo, visible in `kubectl describe pod`
- **Real pattern:** `env: - name: DB_PASSWORD value: "supersecret123"` in deployment YAML committed to Git. Anyone with repo access = DB password. Anyone with `kubectl describe pod` access = DB password. Rotation requires code change.
- **Scale trigger:** Growing team, multiple environments, secrets spread across many YAML files
- **Symptoms:** Secrets leaked in version control, credential sprawl, rotation painful (update every manifest)
- **Solution:** External secrets management: HashiCorp Vault (with Vault Agent injector), AWS Secrets Manager + External Secrets Operator, Sealed Secrets (encrypted in Git, decrypted in cluster). NEVER put secret values in Git. K8s Secrets are base64 encoded, not encrypted — use external secret store for real secrets. Rotate secrets without changing code.
- **Lesson:** Kubernetes Secrets are not secret by default — they're base64 encoded. Real secrets need an external secrets manager with encryption, access control, and audit logging.

---

### 9.3 Overly Permissive Service Accounts

- **What happens:** Every service runs with default K8s service account that has cluster-admin rights — compromised service can delete all deployments, read all secrets
- **Real pattern:** Default service account token mounted in every pod. No RBAC defined. Token has broad permissions (or inherits admin in misconfigured cluster). Compromised pod runs `kubectl delete deployment --all -n production`.
- **Scale trigger:** Default K8s configuration, any pod compromise
- **Symptoms:** Compromised pod can perform cluster-level operations, blast radius of compromise is entire cluster
- **Solution:** RBAC per service: each service has a dedicated ServiceAccount with only the permissions it needs. Most services need zero K8s API access — disable automounting: `automountServiceAccountToken: false`. For services that need API access: minimal RBAC Role with specific verbs on specific resources. Audit service account permissions quarterly.
- **Lesson:** Principle of least privilege applies to K8s service accounts. Default service accounts with broad permissions turn any pod compromise into cluster compromise.

---

## Part 10 — Testing Microservices Failures

### 10.1 No Contract Testing — Integration Surprises

- **What happens:** `order-service` and `user-service` developed independently — at integration time, field names don't match, API contracts broken, sprint blocked on integration bugs
- **Real pattern:** `user-service` returns `{ "id": 123, "full_name": "Alice" }`. `order-service` expects `{ "userId": 123, "name": "Alice" }`. Both services pass all their own tests. First integration test: complete failure. Sprint held back by integration debugging.
- **Scale trigger:** Multiple teams developing services independently, no shared API contract verification
- **Symptoms:** Integration bugs discovered late, sprint end integration testing is a blocker, "it works in isolation" repeated by every team
- **Solution:** Consumer-Driven Contract Testing with Pact: consumer (`order-service`) defines what it expects from provider (`user-service`). Pact broker validates provider meets all consumer contracts on every CI run. Break discovered immediately when provider changes response shape. No waiting until integration.
- **Lesson:** Unit tests don't test integrations. Contract tests (Pact) verify API contracts between services continuously — not just at integration time. This is the standard solution to independent team service development.

---

### 10.2 Testing in Production — No Pre-Production Environment

- **What happens:** No staging environment — every change tested in production, bugs found by real users, rollback is the test failure recovery strategy
- **Real pattern:** Small team, "staging is expensive". Every deployment goes straight to production. Bug in payment integration discovered by customer trying to checkout. Rollback. 15 minutes of payment downtime. Customer support tickets.
- **Scale trigger:** Cost pressure, fast-moving startup, "move fast" culture without "break things responsibly"
- **Symptoms:** Customers find bugs before engineers, deployment-correlated incidents, engineer fear of deploying
- **Solution:** Minimum viable pre-production: shadow environment (receives copy of production traffic, doesn't process payments), or staging with synthetic traffic. Feature flags + production canary (1% of users) if staging is genuinely impractical. The cost of staging is always less than the cost of production incidents with real users.
- **Lesson:** Testing in production is acceptable as a complement to staging, not a replacement. At minimum, run pre-production validation. Users are not your QA team.

---

### 10.3 E2E Tests Flaky — Not Trusted

- **What happens:** End-to-end test suite passes 60% of the time due to timing issues, network latency variance, and test environment instability — engineers merge PRs despite test failures
- **Real pattern:** E2E tests have `sleep(2000)` instead of proper waits. Timing-dependent assertions. Tests share state (order created in test A expected in test B). Flakiness rate: 40%. Engineers learn to ignore E2E failures. Real regression merged.
- **Scale trigger:** Growing test suite with poor test isolation, shared test state, timing-dependent assertions
- **Symptoms:** "It's probably a flake" becomes standard response to test failures, real bugs merged as "false failures", test suite takes 45 minutes for 40% reliability
- **Solution:** Fix flaky tests before adding new ones. Proper waits (retry until condition, not fixed sleep). Test isolation: each test creates and cleans up its own data. Parallel execution with independent data. Target: 99%+ pass rate or the test is disabled. Flaky test is worse than no test — it desensitizes the team to failures.
- **Lesson:** A 60% reliable test suite trains engineers to ignore failures. It is worse than no automated testing. Fix flakiness aggressively or delete the test.

---

## Part 11 — Resilience Patterns

### 11.1 Bulkhead Pattern Not Implemented — Resource Sharing

- **What happens:** Slow `report-generation` requests and fast `user-login` requests share the same goroutine/thread pool — reports fill the pool, logins time out
- **Real pattern:** Go HTTP server: 100 concurrent handler goroutines. 100 report requests come in (each takes 30s). Pool full. Login request arrives — queued indefinitely. Login times out. Users can't log in because reports are running.
- **Scale trigger:** Mixed workload with different latency profiles, expensive operations sharing resources with cheap ones
- **Symptoms:** High-latency operations blocking low-latency operations, unrelated endpoint degradation, login timeouts correlated with report generation load
- **Solution:** Bulkhead: separate resource pools per operation type. Dedicated goroutine pool (or worker queue with bounded workers) for reports: max 10 concurrent. Separate pool for user operations: max 1000 concurrent. Reports being slow only affects report pool — login unaffected. Implement with buffered channels as semaphores: `sem := make(chan struct{}, 10)`.
- **Lesson:** Shared thread/goroutine pools allow expensive operations to starve cheap ones. Bulkheads partition resources — failure or overload in one partition doesn't spread to others.

---

### 11.2 No Graceful Degradation — All-or-Nothing Service

- **What happens:** `recommendation-service` is down — instead of showing page without recommendations, `product-service` returns 503 for the entire product page
- **Real pattern:** `recommendations, err := recommendationClient.Get(productId)`. `if err != nil { return 503 }`. Non-critical widget failure returns 503 for the entire page. User can't view or buy the product because recommendations (that they didn't ask for) are unavailable.
- **Scale trigger:** Any dependent non-critical service going down, any circuit breaker opening
- **Symptoms:** Partial service outage of one non-critical service causes full page/feature unavailability, user impact disproportionate to actual failure
- **Solution:** Graceful degradation: `recommendations, err := recommendationClient.Get(productId); if err != nil { recommendations = defaultRecommendations }`. Classify dependencies: critical (can't serve page without it) vs non-critical (degrade gracefully). Return partial response with default values for failed non-critical dependencies. Circuit breaker returns cached/default response, not error.
- **Lesson:** Not all dependencies are equal. Design explicit graceful degradation for every non-critical dependency. The product page should work without recommendations.

---

### 11.3 Thundering Herd on Service Recovery

- **What happens:** Service comes back after 5-minute outage — all waiting requests immediately retry simultaneously — service immediately overwhelmed again and crashes
- **Real pattern:** Payment service down 5 minutes. 10,000 retrying clients, each with immediate retry. Service recovers, receives 10,000 simultaneous requests in first second (normal capacity: 500/sec). OOM, crashes again. Loop.
- **Scale trigger:** Service outage + many clients with immediate retry, popular service with high client count
- **Symptoms:** Service repeatedly crashes on recovery, never stabilizes, requires traffic shedding or rate limiting to recover
- **Solution:** Exponential backoff with jitter in all service clients (same as WebSocket — identical pattern). Add bulkhead on recovery: accept limited requests initially (circuit half-open), gradually increase. Implement request queuing with rate limit on recovery. Client-side: `retry_after` header in 503 response tells clients when to retry.
- **Lesson:** Recovery without rate limiting invites re-crash. Services need protection on the way up, not just at steady state. Backoff + jitter in all retry logic prevents thundering herd.

---

## Part 12 — Production Scaling Study Cases

### 12.1 Monolith to Microservices Migration — The Strangler Fig

- **What happens:** Team attempts to rewrite monolith as microservices in parallel — "big bang" migration runs over schedule by 18 months, monolith and microservices diverge, impossible to cut over
- **Real pattern:** Separate team rewrites `order-service` from scratch while monolith continues to evolve. Migration takes 18 months. In that time, monolith's order logic changed 200 times. New service is already out of date. Cutover fails — feature parity not achieved. Project cancelled.
- **Scale trigger:** Pressure to modernize, large monolith, "rewrite" instinct
- **Symptoms:** Parallel systems diverging, migration project perpetually behind schedule, business can't wait for migration, project abandoned
- **Solution:** Strangler Fig pattern: extract one service at a time, redirect traffic incrementally. Step 1: put gateway in front of monolith. Step 2: extract `user-service`, route user traffic to new service. Step 3: keep extracting. Monolith shrinks. No parallel rewrite. Production validated at each step. Takes longer per service, succeeds overall.
- **Lesson:** Never rewrite a monolith in parallel. The Strangler Fig pattern — extract incrementally, redirect traffic gradually — is the only migration strategy with a reliable success rate.

---

### 12.2 Service Proliferation — Governance Failure

- **What happens:** 3 years into microservices, 200 services exist — 60 are orphaned (no owner), 40 use deprecated libraries with known CVEs, 30 are duplicates of each other, nobody knows what half of them do
- **Real pattern:** No service creation governance. Any team can create a service. No retirement process. Abandoned services still receive traffic (undiscoverable). Security scan finds 40 services running Node.js 12 (EOL). Nobody knows who owns `legacy-transform-service`.
- **Scale trigger:** Fast-growing engineering org, no central registry, teams create services without decommissioning old ones
- **Symptoms:** Security debt accumulates in abandoned services, duplicate functionality built multiple times, on-call engineers don't know what half the services do, runbook doesn't exist for orphaned service that fails at 3 AM
- **Solution:** Service registry (not just Consul/K8s DNS — a human registry): every service has owner, purpose, SLA, creation date, dependencies. Service creation requires RFC/approval. Decommission process: deprecation notice → route traffic away → delete. Quarterly audit of service catalog. Automated CVE scanning for all services with alerting to owners.
- **Lesson:** Services accumulate like technical debt. Governance (registry, ownership, decommission process) is required. An ungoverned microservice ecosystem becomes a security and operational liability.

---

### 12.3 Multi-Region Active-Active — Data Sovereignty Conflict

- **What happens:** EU users' data written to US region (lower latency for the request), violating GDPR data residency requirements — $20M fine
- **Real pattern:** Global load balancer routes EU users to closest region (US East in some cases). Orders written to US DB. EU user's PII stored in USA. GDPR requires EU personal data stored in EU. Compliance violation discovered in audit.
- **Scale trigger:** Global user base, latency-optimized routing, data residency requirements
- **Symptoms:** GDPR violation, regulatory fine, forced data migration after the fact
- **Solution:** Geo-partition data: EU users' data stays in EU region, enforced at gateway layer (route by user's country → fixed region). Stateless services can be in any region. Stateful data (user PII) is region-pinned. Add compliance layer to data model: every user record has `data_residency_region`, enforced at write path.
- **Lesson:** Multi-region is not just a latency optimization — it's a data governance decision. Data residency requirements (GDPR, data localization laws) must be designed into routing and storage before writing the first byte of user data.

---

### 12.4 Cost Explosion — Microservices Without Cost Attribution

- **What happens:** Cloud bill triples after microservices migration — nobody knows which service is responsible for 60% of the compute cost, no cost per service visibility
- **Real pattern:** Monolith: one billing line item, clear cost. Microservices: 50 services, shared K8s cluster, shared databases, shared data transfer — impossible to attribute cost to service. `analytics-service` doing full table scans costs $50K/month — nobody knows until budget review.
- **Scale trigger:** Shared infrastructure without cost tagging, many services, cloud-native services (data transfer, managed DB)
- **Symptoms:** Overall cloud bill growing without clear cause, can't prioritize optimization, cost reduction unfocused
- **Solution:** Cost attribution per service: K8s namespace per service team + AWS cost allocation tags. Measure: compute (pod resource usage), storage (volume per service), data transfer (inter-service and external). Show each team their cost dashboard. Incentivize optimization by making costs visible. Use Kubecost or cloud-native cost management tools.
- **Lesson:** Microservices without cost attribution produce invisible cost sprawl. Each service team must see and own their cost. Visibility drives optimization — what you can't see, you can't optimize.

---

### 12.5 On-Call Nightmare — Incident Response at Scale

- **What happens:** P1 incident: checkout broken. On-call engineer alerted. 20 services potentially involved. No runbook. No clear ownership. 3 engineers paged. 45 minutes to identify root cause. Revenue loss disproportionate to actual issue severity.
- **Real pattern:** `payment-service` has uncaught exception on specific card BIN range. No specific alert for this. Generic "payment error rate high" alert fires. On-call digs through logs of 20 services. No distributed tracing. No runbook. Finds issue after 45 minutes. Simple fix: 2 minutes. MTTR: 47 minutes. 45 minutes is pure investigation overhead.
- **Scale trigger:** Growing service count without growing operational tooling and runbooks
- **Symptoms:** MTTR dominated by investigation time not fix time, multiple engineers paged for one incident, on-call burnout
- **Solution:** Runbook per service per failure mode. Tracing for instant root cause. Dashboards with pre-built investigation paths. Clear ownership: one team per service, one on-call per service. Symptom-based alerts that link to runbook. Post-incident reviews that produce runbook updates. Target: investigation time < 5 minutes for any known failure mode.
- **Lesson:** Operational excellence in microservices requires runbooks, tracing, ownership, and post-incident reviews. MTTR should decrease over time as failure modes are documented. Without this investment, microservices create on-call nightmares at scale.