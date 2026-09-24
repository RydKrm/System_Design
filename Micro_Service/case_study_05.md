# Microservices — Complete Study & Failure Cases (Volume 5)

> 12 Parts · 66 Cases — Master-level patterns covering gRPC internals, service mesh edge cases, polyglot pitfalls, zero-trust security, event-driven anti-patterns, infrastructure-as-code failures, database replication edge cases, developer experience failures, compliance engineering, and the hardest real-world war stories.

---

## Part 37 — gRPC Internals & Failures

### 37.1 gRPC Keep-Alive Misconfigured — Silent Connection Death

- **What happens:** gRPC connection established through load balancer — LB idle timeout (60s) kills connection — client thinks connection is alive — next call hangs indefinitely waiting on dead connection
- **Real pattern:** AWS NLB idle timeout: 350 seconds. gRPC client: no keep-alive configured. Connection idle for 5 minutes between calls. NLB silently closes TCP connection at 350s. Client's gRPC channel: still shows READY state (doesn't know TCP is closed). Next RPC call: blocks indefinitely (or until per-call deadline).
- **Scale trigger:** Any load balancer with idle timeout shorter than gRPC call interval, batch processing with gaps between calls
- **Symptoms:** gRPC calls hang mysteriously after idle periods, no error until per-call deadline fires, channel shows READY but calls block
- **Solution:** Configure gRPC keep-alive on client: `grpc.WithKeepaliveParams(keepalive.ClientParameters{ Time: 30 * time.Second, Timeout: 10 * time.Second, PermitWithoutStream: true })`. Client sends HTTP/2 PING every 30s. If no response in 10s: reconnect. Keep-alive interval must be shorter than load balancer idle timeout. Also configure server-side keep-alive to avoid rejecting pings.
- **Lesson:** gRPC connections through load balancers need application-level keep-alive. TCP keep-alive is too slow (2 hours default). gRPC PING frames at 30s keep the connection alive and detect death within 10 seconds.

---

### 37.2 gRPC Load Balancing — All Traffic to One Backend

- **What happens:** gRPC client connects to backend cluster — gRPC long-lived HTTP/2 connection — all RPC calls go to one backend for the lifetime of the connection — other backends idle
- **Real pattern:** Client creates one gRPC connection to `grpc-service:50051` (DNS resolves to 5 pods). HTTP/2 multiplexes all RPCs over one TCP connection. One pod handles 100% of traffic. Four pods idle. No load balancing — connection-level, not request-level.
- **Scale trigger:** gRPC client with single connection, K8s service DNS resolving to multiple pod IPs, any gRPC deployment with more than one backend
- **Symptoms:** One pod at 100% CPU/memory, others idle, adding pods doesn't improve throughput, metrics show extreme traffic imbalance
- **Solution:** gRPC client-side load balancing: resolve all backend IPs and distribute RPCs across connections. In Go: `grpc.Dial("dns:///grpc-service:50051", grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`))`. Or use a gRPC-aware proxy: Envoy (understands HTTP/2 streams, load-balances per-RPC). Standard K8s service (TCP LB) load-balances per-connection, not per-RPC — useless for gRPC.
- **Lesson:** Standard TCP load balancers load-balance gRPC at connection level (one pod gets all calls). gRPC needs client-side load balancing (round-robin DNS) or a gRPC-aware proxy (Envoy) to distribute at the RPC level.

---

### 37.3 Streaming gRPC — Goroutine Leak on Cancelled Stream

- **What happens:** Server-side streaming gRPC: client cancels stream mid-way — server goroutine processing the stream not notified — server continues processing and sending into cancelled stream indefinitely
- **Real pattern:** Server streams 10,000 records to client. Client disconnects at record 500 (user navigates away). Server goroutine: continues fetching records 501–10,000 from DB, tries to send on cancelled stream. `stream.Send()` returns error — but server code doesn't check: `for _, record := range records { stream.Send(record) }`. 9,500 unnecessary DB queries and goroutine blocked for full duration.
- **Scale trigger:** Long server-side streams, clients that disconnect frequently (mobile, browser navigation), stream processing without cancellation checks
- **Symptoms:** Goroutine count growing with cancelled stream events, DB load from completed-but-unnecessary queries, memory growing with open streams
- **Solution:** Check stream context on every iteration: `for _, record := range records { select { case <-stream.Context().Done(): return stream.Context().Err() default: } if err := stream.Send(record); err != nil { return err } }`. Context cancellation propagates from client disconnect. Exit immediately on cancellation.
- **Lesson:** gRPC stream context carries client cancellation. Check `stream.Context().Done()` on every iteration of a streaming loop. Unchecked cancellation leaks goroutines and wastes DB resources.

---

### 37.4 Protobuf Any — Type Safety Lost, Deserialization Bomb

- **What happens:** `google.protobuf.Any` used for flexible event payloads — consumer doesn't know what type is inside — tries all known types until one works — wrong type silently deserializes (partial match)
- **Real pattern:** Event: `Any { type_url: "orders.OrderCreated", value: <binary> }`. Consumer iterates registered types, tries each. `notification.EmailRequest` has overlapping field numbers with `OrderCreated` — deserializes partially without error. Consumer sends email with garbled data from wrong type deserialization. No error thrown.
- **Scale trigger:** `Any` used for polymorphic events, many registered types, overlapping proto field numbers across types
- **Symptoms:** Silent data corruption in event consumers, wrong handler processing event, garbled output from mismatched deserialization
- **Solution:** Avoid `google.protobuf.Any` for event systems. Prefer: (1) Oneof field in a wrapper message: `oneof event { OrderCreated order_created = 1; PaymentProcessed payment_processed = 2; }` — type safe, exhaustive match possible. (2) Separate topics per event type — consumer only receives known type. Reserve `Any` for truly dynamic use cases with strict type URL checking: always verify `TypeUrl` before unmarshaling.
- **Lesson:** `google.protobuf.Any` trades type safety for flexibility. In event systems, the flexibility creates silent misrouting. Use `oneof` or topic-per-type for type-safe event routing.

---

### 37.5 gRPC Deadline Propagation — Client Deadline Ignored by Server

- **What happens:** Client sets 2-second deadline on RPC — server receives call, starts long processing — client's deadline fires at 2s, client gets DeadlineExceeded — server continues processing for 30 more seconds
- **Real pattern:** Client: `ctx, cancel := context.WithTimeout(ctx, 2*time.Second)`. Server handler: `func (s *Server) ProcessOrder(ctx context.Context, req *pb.OrderRequest) (*pb.OrderResponse, error) { result := s.db.DoExpensiveQuery() // 30 seconds, doesn't check ctx return result, nil }`. Client gets error at 2s. Server: runs full 30s. DB: does full 30s of work. Wasted.
- **Scale trigger:** Any server handler that doesn't propagate context to DB/downstream calls, long server-side processing
- **Symptoms:** Server continues work after client deadline, wasted server resources processing abandoned requests, DB queries completing for requests client already gave up on
- **Solution:** Propagate context to all downstream calls: `s.db.QueryContext(ctx, query)`, `httpClient.Do(req.WithContext(ctx))`, `grpcClient.Method(ctx, req)`. DB and HTTP clients respect context cancellation — stop work when client deadline fires. Check `ctx.Err()` in loops. Server goroutine time = min(client deadline, server processing time).
- **Lesson:** gRPC propagates client deadlines via context. Server handlers must pass context to all downstream calls — otherwise server continues working for abandoned requests. `QueryContext` not `Query` everywhere.

---

## Part 38 — Polyglot Microservice Pitfalls

### 38.1 Date/Time Serialization Mismatch — Go vs Node.js

- **What happens:** Go service serializes timestamp as `1705334400` (Unix epoch int). Node.js consumer parses as milliseconds (JavaScript default) — gets year 1970 + 19 days instead of 2024
- **Real pattern:** Go: `json.Marshal(time.Now().Unix())` → `1705334400`. Node.js: `new Date(1705334400)` → January 20, 1970 (treats as milliseconds). Go used seconds, JS expected milliseconds. Order timestamps: all showing 1970. Report: all January 1970 data. Silent — no parse error.
- **Scale trigger:** Polyglot services, integer timestamp serialization without explicit unit documentation
- **Symptoms:** Wrong dates in consumers, timestamps 1000× smaller than expected, year 1970 appearing in date fields, only in cross-language integrations
- **Solution:** Always use ISO 8601 strings for timestamps in JSON APIs: `"2024-01-15T16:00:00Z"` — unambiguous across all languages. If integer: document and standardize on milliseconds (JS ecosystem standard). In Go: `time.Time` marshals to RFC3339 string by default — use the default, don't marshal to Unix int. Proto: use `google.protobuf.Timestamp` (seconds + nanos fields, well-defined).
- **Lesson:** Integer timestamps without explicit units are cross-language bugs waiting to happen. Use ISO 8601 strings in JSON or `google.protobuf.Timestamp` in proto. Never serialize raw Unix seconds in a polyglot system.

---

### 38.2 Null vs Empty vs Missing — JSON Serialization Divergence

- **What happens:** Go omits zero-value fields in JSON (`omitempty`), Node.js sends `null` for absent fields, Python sends `""` — consumers receiving from any source get different shapes for "no value"
- **Real pattern:** `discount_code` absent: Go sends `{}` (field omitted), Node sends `{"discount_code": null}`, Python sends `{"discount_code": ""}`. Go consumer: `if event.DiscountCode != "" { apply() }` — works for Go and Python, fails for null (null unmarshal → empty string in Go, ok). But another consumer: `if event.discount_code !== undefined` vs `!== null` vs `!== ""` — different logic for each source.
- **Scale trigger:** Polyglot producers for same event type, JSON serialization defaults differing per language
- **Symptoms:** Consumer behaves differently depending on which service produced the event, missing field bugs only in cross-language integrations, optional field handling inconsistent
- **Solution:** Explicit API contract for optional fields: define whether absent means "use default" or "null" or "empty." Document in proto/OpenAPI: `optional string discount_code = 1`. Use proto wrappers for nullable primitives: `google.protobuf.StringValue`. For JSON: establish org convention — prefer explicit `null` over omission. Consumers: handle all three cases (null, missing, empty) for optional fields.
- **Lesson:** Optional field representation differs per language's JSON defaults. Establish an org-wide convention and enforce it via schema validation. Consumers should defensively handle null, missing, and empty as equivalent for optional string fields.

---

### 38.3 Error Code Translation — HTTP to gRPC to RabbitMQ

- **What happens:** Payment service returns gRPC `RESOURCE_EXHAUSTED` — order service translates to HTTP 500 — API gateway returns 500 to client — client retries (500 = server error) — payment service overloaded further
- **Real pattern:** gRPC `RESOURCE_EXHAUSTED` = "I'm overloaded, back off." HTTP equivalent: `429 Too Many Requests` with `Retry-After`. Order service: maps all non-OK gRPC codes to HTTP 500. Client: retries on 500 immediately (retry on server error). Overload amplified by retries. Correct mapping: `RESOURCE_EXHAUSTED` → 429, `UNAVAILABLE` → 503, `NOT_FOUND` → 404.
- **Scale trigger:** Mixed protocol services (gRPC internal, HTTP external), error code translation layers
- **Symptoms:** Clients retrying non-retryable errors, clients not retrying retryable errors, overload amplified by incorrect status code mapping
- **Solution:** Maintain explicit error code translation table: gRPC `RESOURCE_EXHAUSTED` → HTTP 429, gRPC `UNAVAILABLE` → HTTP 503, gRPC `DEADLINE_EXCEEDED` → HTTP 504, gRPC `NOT_FOUND` → HTTP 404, gRPC `PERMISSION_DENIED` → HTTP 403. Map with retry semantics preserved. Document in API gateway translation layer.
- **Lesson:** Error codes carry retry semantics. Wrong translation loses that signal: `RESOURCE_EXHAUSTED` → 500 triggers client retry; → 429 triggers client backoff. Get the translation table right — it affects system-wide retry behavior.

---

### 38.4 Integer Overflow — Language Boundary

- **What happens:** Go service generates order ID as `int64` (max 9.2 × 10¹⁸) — JavaScript frontend receives via JSON — JS `number` type loses precision above 2⁵³ — order ID silently corrupted
- **Real pattern:** Order ID: `9007199254740993` (larger than `Number.MAX_SAFE_INTEGER` = 9007199254740991). JSON: `{"order_id": 9007199254740993}`. JavaScript `JSON.parse()`: `9007199254740992` (last digit wrong — precision lost). Order lookup fails. Customer's order ID doesn't resolve.
- **Scale trigger:** Large int64 IDs (Twitter snowflake, sequential past 2⁵³), JavaScript frontend consumers, JSON serialization
- **Symptoms:** Order lookups failing for large IDs, ID mismatch between backend and frontend, bug only appears after system has been running long enough for IDs to exceed 2⁵³
- **Solution:** Serialize large int64 as strings in JSON: `{"order_id": "9007199254740993"}`. Use string IDs in API contracts for all ID fields. Or: use UUIDs (strings, no precision issue). In Go: `json:"order_id,string"` struct tag. Document in OpenAPI: `type: string, format: int64`. Frontend: treat all IDs as strings, never as numbers.
- **Lesson:** JavaScript numbers lose precision above 2⁵³. Any int64 that could exceed this must be serialized as a string in JSON. This is a well-known issue (Twitter uses string IDs for this reason) — add it to API design standards.

---

### 38.5 Charset Encoding — UTF-8 vs Latin-1 at Service Boundary

- **What happens:** Legacy PHP service encodes strings in Latin-1 — Go service receives, stores in Postgres UTF-8 — `é`, `ü`, `ñ` corrupted — customers' names stored incorrectly
- **Real pattern:** PHP service: internal encoding Latin-1. Customer name: `José`. JSON output: `{"name": "Jos\xe9"}` (Latin-1 byte). Go consumer: reads raw bytes, stores in Postgres UTF-8 column. Postgres: invalid UTF-8 sequence — either rejects or stores `Jos?`. Customer's name corrupted in all downstream systems.
- **Scale trigger:** Legacy services in polyglot system, internationalized data, any non-ASCII content at language boundaries
- **Symptoms:** Non-ASCII characters corrupted in DB, `?` or replacement characters in customer data, bug only with international names/addresses
- **Solution:** Normalize to UTF-8 at the boundary: in Go, detect encoding and convert: `golang.org/x/text/encoding/charmap.ISO8859_1.NewDecoder().String(input)` → UTF-8. Or: fix the source (PHP) to output UTF-8. Add encoding validation in ingestion layer: reject non-UTF-8 with clear error. UTF-8 is the only acceptable encoding for new services.
- **Lesson:** Encoding mismatch at service boundaries silently corrupts international data. Always specify and enforce UTF-8. Legacy services emitting non-UTF-8 need explicit conversion at the boundary, not after the damage is done.

---

## Part 39 — Zero-Trust Security Advanced

### 39.1 East-West Attack — Compromised Service Pivots Internally

- **What happens:** `frontend-service` compromised via XSS-to-RCE — attacker uses it as jump host to call internal APIs (`payment-service`, `user-service`) that are open to any internal traffic
- **Real pattern:** No NetworkPolicy. `frontend-service` pod: compromised. Attacker: `curl http://payment-service/internal/refund -d '{"amount": 10000}'` — succeeds. No auth on internal refund endpoint (assumed internal = trusted). Attacker initiates $10K refund. Full financial impact from a frontend compromise.
- **Scale trigger:** No K8s NetworkPolicy, no internal auth, flat internal network
- **Symptoms:** Internal APIs called from unexpected sources, financial operations from frontend IPs, lateral movement from low-privilege service
- **Solution:** K8s NetworkPolicy: `payment-service` only accepts traffic from `order-service` and `billing-service` — not `frontend-service`. Internal API auth: even internal calls require service identity token. Defense in depth: NetworkPolicy (network layer) + mTLS (transport layer) + service auth (application layer). Any single layer bypass doesn't grant access.
- **Lesson:** East-west attacks use a compromised low-privilege service to reach high-privilege services. NetworkPolicy, mTLS, and internal auth are independent layers — any bypass of one must still face the others.

---

### 39.2 Secrets Rotation Breaking Live Services

- **What happens:** DB password rotated in Vault — services reading password from Vault at startup — live services still using old password cached in memory — Vault invalidates old password — all live services start failing DB connections
- **Real pattern:** Services: read `DB_PASSWORD` from Vault on startup, store in memory. Vault: password rotated, old credential invalidated immediately. 20 running service pods: all have old password in memory. All DB connections start failing. Rotating secrets caused the outage.
- **Scale trigger:** Secret rotation without graceful handoff, services caching secrets in memory without refresh
- **Symptoms:** All services fail DB connections simultaneously after rotation, outage caused by security operation, rotation required service restart to recover
- **Solution:** Graceful secret rotation: (1) Vault lease renewal: service renews lease before expiry, gets new credential before old is invalidated. (2) Dual-active window: old password valid for 15 minutes after new one issued — gives services time to refresh. (3) Vault Agent sidecar: watches for lease expiry, writes new credential to file, service watches file for updates — no restart needed. (4) Short TTL + auto-renew: credential valid for 1 hour, renewed at 30 minutes.
- **Lesson:** Secret rotation that invalidates immediately causes outages. Rotation requires a dual-active window (both old and new credentials valid) long enough for all services to refresh. Secret rotation is a zero-downtime operation — design it that way.

---

### 39.3 JWT Algorithm Confusion — `alg: none` Attack

- **What happens:** Service validates JWT but accepts `alg: none` — attacker strips signature, sets `alg: none`, crafts any claims — accepted as valid token
- **Real pattern:** JWT library: `jwt.Parse(token, func(token *jwt.Token) (interface{}, error) { return publicKey, nil })`. Library: if `alg: none`, no signature required. Attacker: creates token `{"alg":"none","typ":"JWT"}.{"sub":"admin","role":"superuser"}.` (empty signature). Service: accepts it. Attacker has admin access.
- **Scale trigger:** JWT libraries that support `alg: none`, any misconfigured JWT validation
- **Symptoms:** Auth bypass, admin impersonation, any user can craft valid tokens
- **Solution:** Explicitly specify allowed algorithms: `jwt.ParseWithClaims(token, claims, keyFunc, jwt.WithValidMethods([]string{"RS256"}))`. Never allow `none`. Reject tokens where `alg` doesn't match expected. Use a well-maintained JWT library with sane defaults. Audit JWT validation code — this is a known CVE pattern (CVE-2022-21449 "Psychic Signatures," multiple JWT library vulnerabilities).
- **Lesson:** JWT libraries that support `alg: none` allow authentication bypass. Always explicitly allowlist valid algorithms. This is a known attack vector with a trivial exploit — validate algorithm before trusting any JWT.

---

### 39.4 Overly Permissive CORS — API Open to Any Origin

- **What happens:** `Access-Control-Allow-Origin: *` set on authenticated API endpoints — malicious website can make authenticated requests to your API on behalf of logged-in users (CSRF via CORS)
- **Real pattern:** `cors.AllowAllOrigins()` applied globally in Go middleware. Authenticated endpoint: `GET /api/user/data`. Malicious site: `fetch('https://yourapi.com/api/user/data', {credentials: 'include'})`. Browser: CORS headers allow it. Browser sends auth cookies. User's data returned to malicious site.
- **Scale trigger:** CORS misconfiguration, wildcard origin on authenticated endpoints
- **Symptoms:** Cross-origin data exfiltration possible, CSRF vulnerability via CORS, security audit critical finding
- **Solution:** Never use `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` — browsers block this combination for security. For authenticated APIs: explicit origin allowlist. `Access-Control-Allow-Origin: *` only for truly public, unauthenticated APIs (public CDN assets, public data endpoints). Validate `Origin` header against allowlist on server side.
- **Lesson:** Wildcard CORS on authenticated endpoints enables cross-origin data theft. CORS headers are a browser security mechanism — misconfiguration disables that mechanism. Explicit origin allowlist is mandatory for authenticated endpoints.

---

### 39.5 Audit Log Tampering — Logs Stored Where Attackers Can Modify

- **What happens:** Audit logs stored in same DB as application data — attacker who compromises application DB can delete or modify their audit trail — compliance audit passes but evidence of breach deleted
- **Real pattern:** `audit_log` table in same Postgres instance as `orders`, `users`. Attacker gains DB write access (SQL injection in another table). Deletes rows from `audit_log` covering their activity window. Forensics: audit log gap. Can't prove what attacker did. PCI-DSS compliance: requires tamper-evident logs — violation.
- **Scale trigger:** Audit logs in mutable application database, same credentials for app data and audit logs
- **Symptoms:** Audit log gaps that correlate with security incidents, compliance audit failure, inability to reconstruct attack timeline
- **Solution:** Immutable audit logs: write-only destination (append-only S3 bucket with Object Lock, AWS CloudTrail, dedicated write-only log service). Application credentials: write-only to audit log endpoint — cannot read or delete. Cryptographic chaining: each log entry includes hash of previous entry — tampering detectable. Ship to SIEM (Splunk, Elastic SIEM) immediately — even if DB is compromised, logs already shipped.
- **Lesson:** Audit logs stored where attackers can modify them are not audit logs — they're delete-able evidence. Audit logs must be written to append-only, tamper-evident storage with credentials that can only write, never delete.

---

## Part 40 — Event-Driven Anti-Patterns

### 40.1 Event Sourcing Misapplied — Using It for All Data

- **What happens:** Team adopts event sourcing for entire system including ephemeral data (user sessions, real-time positions) — event store grows 1 TB/day — querying current state requires replaying billions of events
- **Real pattern:** Event sourcing: `SessionStarted`, `SessionUpdated` (every activity), `SessionEnded`. 1M users × 100 activity events/session = 100M events/day. 1 year: 36 billion events. Querying "is user 123 currently logged in?": replay all events for user 123. Performance: unusable without snapshots that themselves become expensive.
- **Scale trigger:** Applying event sourcing to high-frequency, ephemeral, or non-queryable data
- **Symptoms:** Event store growing unmanageably, current-state queries require expensive replay, snapshots add complexity proportional to event volume
- **Solution:** Event sourcing is appropriate for: audit-required business entities (orders, financial transactions), aggregates needing temporal queries ("what was the order state on Tuesday?"). Not appropriate for: sessions (Redis TTL), real-time positions (current value only), logs (use log storage), metrics (use time-series DB). Apply event sourcing surgically to domains that benefit from it — not as a default architecture.
- **Lesson:** Event sourcing trades query simplicity for temporal completeness. It's powerful for business entities requiring audit trails. It's overkill (and expensive) for ephemeral or high-frequency data. Choose per aggregate, not per system.

---

### 40.2 Choreography Ownership Gap — Nobody Owns the Business Process

- **What happens:** Order-to-fulfillment process choreographed across 6 services — when the process breaks, no single service or team owns debugging it — everyone points at each other
- **Real pattern:** Order fails to fulfill. `order-service` team: "we published `order:created` successfully." `inventory-service` team: "we consumed it and published `inventory:reserved`." `payment-service` team: "we never received `inventory:reserved`." Gap between inventory and payment — nobody knows which queue the event is in or which service dropped it. 3 teams, 3 hours, no resolution.
- **Scale trigger:** Pure choreography across many services, no single source of truth for process state
- **Symptoms:** Business process failures with no clear owner, cross-team blame, hours to find where in the chain the failure occurred
- **Solution:** Process ownership: designate one service as the process coordinator even in choreography. Or switch to orchestration for complex business processes: one service (saga orchestrator) tracks all steps, knows current state, alerts on stalls. Business process health dashboard: "orders in each state" — instantly visible when step X has an accumulating backlog.
- **Lesson:** Business process choreography without a coordinator creates ownership vacuums. Someone must own the business process end-to-end — either designate a coordinator service or switch to orchestration for processes that matter.

---

### 40.3 Event Flooding — High-Frequency Events Burying Business Events

- **What happens:** Technical events (heartbeat, metrics, status) published to same topic as business events — business events lost in noise, consumer lag grows from processing useless events
- **Real pattern:** `events` topic: `heartbeat` (1000/sec), `metrics:pod:cpu` (500/sec), `order:created` (10/sec), `payment:processed` (8/sec). Consumer: processes all events. 1,498 useless events per 18 business events. Consumer spends 99% of time on non-business events. Business event processing lag: proportional to heartbeat rate.
- **Scale trigger:** Mixed event type topics, high-frequency technical events, consumers processing all event types equally
- **Symptoms:** Consumer lag growing from high-frequency non-business events, business event processing delayed, topic storage dominated by non-business events
- **Solution:** Separate topics by category and frequency: `heartbeat` topic (high frequency, technical), `metrics` topic (high frequency, technical), `business.orders` topic (low frequency, high importance). Consumers subscribe to relevant topics only. Topic naming convention enforces separation. Business event consumers never touch technical event topics.
- **Lesson:** Mixing high-frequency technical events with low-frequency business events in one topic makes the business events second-class. Separate topics by category and frequency — consumers should only process what they care about.

---

### 40.4 Consumer Group Misconfiguration — Wrong Isolation

- **What happens:** Two services share same Kafka consumer group ID — both compete for same partitions — each gets 50% of events — both process incomplete data, both wrong
- **Real pattern:** `notification-service` consumer group: `events-consumer`. `analytics-service` consumer group: accidentally also `events-consumer` (copy-paste from config). Kafka: one consumer group, one offset tracking. `notification-service` gets partitions 0–5. `analytics-service` gets partitions 6–11. Each processes 50% of events. Notifications missing for 50% of orders. Analytics missing 50% of data.
- **Scale trigger:** Copy-paste config errors, shared configuration templates, multiple services using same consumer group name
- **Symptoms:** Both services processing partial data, no single service processes all events, inconsistent behavior that appears random
- **Solution:** Consumer group ID must be unique per consuming application: `notification-service-prod`, `analytics-service-prod`. Convention: `{service-name}-{environment}`. Enforce in CI: lint consumer group IDs against registry of known services. Alert on unexpected consumer group joining a topic (new consumer group = potential misconfiguration).
- **Lesson:** Shared consumer group IDs split the event stream between unexpected co-consumers. Consumer group IDs are identity — they must be globally unique per consuming application. Validate them the same way you validate service names.

---

### 40.5 Saga Compensation Out of Order — Compensating Completed Steps Twice

- **What happens:** Saga compensation triggered twice (retry logic) — `refund` compensation runs twice — customer refunded double the amount
- **Real pattern:** Saga step 3 fails. Compensation starts. Compensation message to payment-service: `refund:order:456`. Network timeout — compensation publisher didn't receive ACK. Retries: sends `refund:order:456` again. Payment service: not idempotent. Processes both. Customer refunded twice.
- **Scale trigger:** Compensation retry logic, non-idempotent compensation handlers, any retry-able compensation message
- **Symptoms:** Double refunds, duplicate compensation actions, customers receiving multiple notifications of the same compensation
- **Solution:** Compensation actions must be idempotent: payment-service refund handler: `INSERT INTO refunds(saga_id, order_id, amount) ON CONFLICT (saga_id) DO NOTHING` — if already refunded for this saga, skip. Saga ID is the idempotency key for compensation. Same rule as forward saga steps: every operation must be safely retryable.
- **Lesson:** Saga compensation is retried just like forward steps — all compensating actions must be idempotent. The saga ID is the idempotency key for every step, both forward and backward.

---

## Part 41 — Infrastructure-as-Code Failures

### 41.1 Terraform State File Corruption — Infrastructure Out of Sync

- **What happens:** Two engineers run `terraform apply` simultaneously — both modify state file — state corruption — Terraform thinks resources exist that don't, and vice versa
- **Real pattern:** Engineer A: `terraform apply` running (RDS instance creation, 5 minutes). Engineer B: `terraform apply` starts (different change). Both read same state file at start. Both write modified state at end. Last writer wins — B's state overwrites A's. Terraform state: shows A's RDS instance wasn't created (wasn't in B's state). Next apply: tries to create it again. Conflict.
- **Scale trigger:** Multiple engineers, no state locking, shared Terraform state
- **Symptoms:** "Resource already exists" errors on apply, state drift between actual and Terraform-known state, infrastructure created twice
- **Solution:** Remote state with locking: S3 backend + DynamoDB lock table. `terraform init -backend-config=...` with S3 + DynamoDB config. DynamoDB: `LockID` attribute — only one `apply` holds lock at a time. Second `apply` waits or fails with lock error. Never run Terraform against local state in shared environments.
- **Lesson:** Concurrent Terraform applies without state locking corrupt state and create infrastructure drift. Remote state with DynamoDB locking is mandatory for any shared environment. Local state files are for learning only.

---

### 41.2 Terraform Destroy in Production — Wrong Workspace

- **What happens:** Engineer runs `terraform destroy` thinking they're in staging workspace — actually in production workspace — entire production infrastructure destroyed
- **Real pattern:** `terraform workspace list`: `staging (selected)`, `production`. Engineer: runs `terraform destroy`. Confirms. Actually: Terraform's workspace display was misread — production was selected. RDS, EKS cluster, Redis, entire stack: destroyed. Recovery: 6-hour restore from backup (if it exists).
- **Scale trigger:** Multiple workspaces, similar workspace names, any environment where `destroy` is a valid command
- **Symptoms:** Complete infrastructure loss, data loss (if no backup), multi-hour recovery, career-defining incident
- **Solution:** Production workspace protections: (1) Require `CONFIRM_DESTROY=true` env var for production destroy. (2) Production Terraform: read-only for all humans, write-only via CI/CD pipeline. (3) Workspace name in prompt: `PS1="[TF: $(terraform workspace show)] "` — workspace always visible. (4) Sentinel policy: block destroy on production workspace. (5) S3 bucket versioning + deletion protection for state file.
- **Lesson:** `terraform destroy` on production is an irrecoverable command. Production infrastructure changes should only run via CI/CD pipeline with mandatory review, never from a developer's terminal. Human error + unrestricted production access = risk of this incident.

---

### 41.3 Hardcoded AMI IDs — Stale Base Images in Production

- **What happens:** Terraform hardcodes `ami-0abc123` (Ubuntu 20.04 from 2021) — three years later: AMI is stale, has 200 known CVEs, new instances launched from vulnerable base image
- **Real pattern:** `ami = "ami-0abc123"` in `main.tf`. This AMI: patched as of 2021. 2024: 200+ CVEs in unpatched packages. New autoscaling instances: launched from this AMI. Security scan: all new instances flagged critical. But AMI is hardcoded — requires Terraform change to update.
- **Scale trigger:** Long-lived infrastructure configs without AMI refresh policy, security compliance requirements
- **Symptoms:** New instances launched with old unpatched AMIs, CVE scanner flags all new instances, compliance violation for unpatched base images
- **Solution:** Dynamic AMI lookup: `data "aws_ami" "ubuntu" { most_recent = true owners = ["099720109477"] filter { name = "name" values = ["ubuntu/images/hvm-ssd/ubuntu-22.04-*"] } }`. Always gets latest patched AMI at apply time. Or: build custom AMIs with Packer on a schedule, reference by tag (`Name: ubuntu-22.04-hardened-YYYYMMDD`). Update AMI as part of regular infrastructure maintenance cadence.
- **Lesson:** Hardcoded AMI IDs drift from security reality over time. Use dynamic AMI lookups or a scheduled AMI build pipeline. Infrastructure should track security patches automatically, not require manual config updates.

---

### 41.4 Missing Depends_on — Resource Created Before Dependency Ready

- **What happens:** K8s deployment Terraform resource created before namespace exists — Terraform creates in wrong order — deployment fails, Terraform reports success (partial)
- **Real pattern:** `resource "kubernetes_deployment" "api" { metadata { namespace = "production" } }` and `resource "kubernetes_namespace" "production" {}`. Terraform: parallelizes independent resources. Deployment created before namespace — K8s: `namespace "production" not found`. Terraform: marks deployment as failed but namespace as succeeded. State: partially applied.
- **Scale trigger:** Any Terraform resource with implicit dependencies not expressed with `depends_on`
- **Symptoms:** Resource creation fails with "dependency not found", Terraform state partially applied, re-apply needed to converge
- **Solution:** Explicit `depends_on`: `resource "kubernetes_deployment" "api" { depends_on = [kubernetes_namespace.production] }`. Or use Terraform data sources that create implicit dependency. Terraform graph: `terraform graph | dot -Tsvg > graph.svg` — visualize dependency graph, find missing edges. Module outputs create implicit dependencies: use outputs to chain modules.
- **Lesson:** Terraform parallelizes independent resources. Implicit dependencies that aren't expressed in config lead to race conditions during apply. Always declare explicit `depends_on` for non-obvious dependencies.

---

### 41.5 IaC Drift — Manual Change Overwritten by Next Apply

- **What happens:** Engineer manually adds security group rule in AWS console for emergency — next `terraform apply` removes it — security group reverts to Terraform state — emergency fix lost
- **Real pattern:** Production incident: need port 5432 open to analytics subnet (not in Terraform). Engineer: adds rule in AWS console. Incident resolved. Next morning: teammate runs `terraform apply` — security group drift detected — applies Terraform state — removes the manual rule — analytics access breaks again.
- **Scale trigger:** Manual changes to Terraform-managed resources, any emergency "console fix," team running applies without checking drift
- **Symptoms:** Manual emergency fixes silently reverted, recurring incidents from Terraform overwriting console changes, state drift from untracked changes
- **Solution:** `terraform plan` before every `terraform apply` — always review what will be deleted. Drift detection: `terraform plan` in CI on schedule, alert on unexpected diffs. Workflow: manual emergency fix + immediate Terraform codification (add to `.tf` file and commit). Never apply without plan review. Use `terraform import` to bring manually created resources into state.
- **Lesson:** Terraform is the source of truth for managed resources. Any manual change is temporary until codified in Terraform. Teams must `plan` before `apply` and treat unexpected deletions as a reason to pause and investigate.

---

## Part 42 — Database Replication Edge Cases

### 42.1 Replication Lag Spike Under Load — Read Replica Unusable

- **What happens:** Heavy write load causes replication lag to grow to 10 minutes — read replica serving 10-minute stale data — users seeing old orders, old inventory counts
- **Real pattern:** Flash sale: 5000 writes/sec to Postgres primary. Replication: streaming replication applies WAL to replica. Replica I/O bottleneck: can't keep up with WAL volume. Lag: grows 1 second per second of heavy write load. After 10 minutes of flash sale: replica is 10 minutes behind. `latest_order` queries on replica: returns orders from 10 minutes ago. Customers seeing "order not found" immediately after placing.
- **Scale trigger:** Write-heavy workloads, read replica on slower storage, I/O bottleneck on replica
- **Symptoms:** Replication lag metric growing during write peaks, user-facing stale reads increasing, "just placed order but can't see it"
- **Solution:** Monitor replication lag as P1 metric: `SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))`. Alert at > 30 seconds. When lag exceeds threshold: route all reads to primary (temporary), not replica. Fix: replica on equal or better storage than primary (often the lag cause is replica on HDD, primary on NVMe).
- **Lesson:** Replication lag is not a fixed value — it grows under write load. Monitor it continuously. Route reads to primary when lag exceeds acceptable staleness threshold — better to load primary than serve stale data.

---

### 42.2 Cascading Replication — Replica of Replica Delay

- **What happens:** Replica chain: Primary → Replica 1 → Replica 2 (replica of replica for reporting). Primary → Replica 1: 2s lag. Replica 1 → Replica 2: additional 3s lag. Reporting queries on Replica 2: 5-second-old data. Report shows wrong totals.
- **Real pattern:** Architecture: primary for writes, Replica 1 for app reads, Replica 2 for analytics (avoid impacting app replica). Replica 2 replicates from Replica 1 — inherits Replica 1's lag plus adds its own. Total lag: additive. During write peak: Replica 1 lag 10s, Replica 2 lag 20s. Analytics: 20 seconds stale.
- **Scale trigger:** Chained replication for read scale or isolation, lag compounds at each hop
- **Symptoms:** Analytics data older than expected, lag proportional to chain length, reports showing inconsistency with near-real-time data
- **Solution:** Replicate all replicas from primary: Replica 1 and Replica 2 both stream from primary — lag is independent, not additive. Cascaded replication saves primary I/O but adds lag at each hop. For analytics: accept the lag and show data freshness timestamp explicitly. Or: use dedicated analytics pipeline (CDC → data warehouse) with known lag SLA.
- **Lesson:** Cascaded replication compounds lag at each hop. Replicate from primary for minimum lag. Cascaded replication is a tradeoff: reduced primary I/O vs increased replica lag — make the tradeoff explicit.

---

### 42.3 Replication Slot Bloat — Primary Disk Full

- **What happens:** Replication slot created for CDC (Debezium) — CDC consumer goes down for 3 days — replication slot accumulates WAL for 3 days — primary disk fills — Postgres goes read-only
- **Real pattern:** Debezium replication slot: `debezium_slot` on Postgres primary. Debezium consumer pod: OOM killed, nobody notices. Slot: holds all WAL since last consumed LSN. 3 days × 50 GB WAL/day = 150 GB accumulated. Primary data disk: 200 GB. Full. Postgres: read-only mode. Service: writes fail. Full production outage from a CDC consumer going down.
- **Scale trigger:** Replication slots without consumer, any CDC consumer downtime, high WAL generation rate
- **Symptoms:** Postgres disk fills despite no data growth, `pg_replication_slots` shows unconsumed slot with large lag, primary goes read-only
- **Solution:** Monitor replication slot lag: `SELECT slot_name, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes FROM pg_replication_slots`. Alert at > 10 GB lag. Set `max_slot_wal_keep_size = 10GB` (Postgres 13+): auto-drops slot if it falls too far behind (consumer must rebuild, but disk doesn't fill). Never leave replication slots without active consumers.
- **Lesson:** Replication slots accumulate WAL indefinitely when consumers are absent. Monitor slot lag. Set `max_slot_wal_keep_size` as a circuit breaker. A dead CDC consumer that's not noticed for 3 days can fill your primary disk and take down production.

---

### 42.4 Read-Your-Writes on Replica — Session Consistency

- **What happens:** User creates a post, immediately reads the post list — read goes to replica (lag 500ms) — post not visible — user thinks create failed — creates again — duplicate post
- **Real pattern:** Write: `POST /posts` → primary (success). Read: `GET /posts` → replica (replica 500ms behind). Post not in replica yet. Response: empty list or old list. User: "it didn't save." Creates again. Duplicate created. User: confused by two identical posts.
- **Scale trigger:** Primary-replica setup with read routing, any operation where user reads immediately after writing
- **Symptoms:** User-perceived data loss after writes, duplicates from confused retries, "ghost writes" that appear and disappear
- **Solution:** Read-your-own-writes consistency: after write, record timestamp. For next N seconds (replication lag buffer), route reads for this session to primary. Implementation: write timestamp to session (`last_write_at = now()`). Read router: `if now() - last_write_at < 1s: primary else: replica`. Or: sticky session routing — all requests in a session go to same node (session consistency).
- **Lesson:** Read-your-own-writes is not automatic with replicas. Implement session-level write timestamp tracking. Route reads to primary for a short window after writes — this is the standard pattern for UX consistency with eventual consistency infrastructure.

---

### 42.5 Point-in-Time Recovery — Restore to Wrong LSN

- **What happens:** Accidental data deletion at 14:23 — team initiates PITR to 14:22 — restore takes 45 minutes — realize: deleted at 14:23:15, restored to 14:22:00 — one minute of legitimate data also lost
- **Real pattern:** `DELETE FROM orders WHERE status='cancelled'` — also deleted 1 minute of non-cancelled orders (bug in WHERE clause). PITR target: 14:22. Restore: 45 minutes. Result: 14:22 state recovered — correct cancelled orders deleted, but also lost all orders created between 14:22 and 14:23 (1 minute of real orders). Customers' orders from that minute: gone.
- **Scale trigger:** PITR to approximate timestamp, high-transaction-rate systems, uncertainty about exact incident time
- **Symptoms:** Recovery introduces new data loss (orders created between incident and restore point), customers whose orders were placed in restore gap report missing orders
- **Solution:** Restore to exact LSN, not timestamp: find the LSN just before the bad statement: `SELECT lsn FROM pg_logical_emit_message(...)` or use `pg_waldump` to find the exact transaction. Restore: `recovery_target_lsn = '0/15000000'`. Exact LSN recovery includes all transactions before the bad one and excludes the bad one. Log recovery: `SELECT * FROM pg_stat_activity` immediately when incident detected — note the exact time and transaction ID.
- **Lesson:** PITR to timestamp loses all transactions after the restore point. Find and restore to the exact LSN of the transaction before the bad operation. LSN precision = no collateral data loss. Always know how to identify the LSN of a bad transaction.

---

## Part 43 — Developer Experience Failures

### 43.1 Local Dev Environment Diverges From Production — "Works on My Machine"

- **What happens:** Developer runs app locally with SQLite, production uses PostgreSQL — local tests pass, production fails on Postgres-specific behavior (ILIKE, window functions, JSON operators)
- **Real pattern:** Local: SQLite (easy to set up, no Docker needed). Production: PostgreSQL. Developer adds: `WHERE name ILIKE '%smith%'`. SQLite: `ILIKE` not supported → query fails in production. Local tests: all green (SQLite doesn't error — different behavior). PR merged. Production deploy: 500 errors on search endpoint.
- **Scale trigger:** Developer convenience overriding production parity, any DB mismatch between local and production
- **Symptoms:** Code that passes all local tests fails in production, DB-specific syntax errors only in production, "works on my machine" repeated constantly
- **Solution:** Local dev uses same DB as production — always. Docker Compose: `postgres:15` for local dev. `make dev` starts Postgres, Migrations, App — one command. Developer convenience is built around production parity, not against it. CI also uses Postgres. Test: `go test -tags integration ./...` against Postgres in CI. SQLite is not a substitute for Postgres in any environment.
- **Lesson:** Local development DB must match production DB. The only acceptable divergence is data volume. Any behavioral difference between local and production DB causes production bugs that only appear after merge.

---

### 43.2 Slow Local Build — Developer Productivity Tax

- **What happens:** Docker build takes 8 minutes locally — developer rebuilds on every change — 8 builds/day × 8 minutes = 64 minutes/day waiting for builds per developer
- **Real pattern:** Dockerfile: copies source, runs `go build` (3 min), runs tests (5 min) — in production Dockerfile. Developer: changes one line, rebuilds. 8 minutes. Changes another line: 8 minutes. No layer caching (see Docker volume 1, case 1.2). 10-person team: 10 × 64 min = 10+ hours/day of developer time lost to builds.
- **Scale trigger:** Non-optimized Dockerfiles, full rebuild on any change, no dev-specific Dockerfile
- **Symptoms:** Low code iteration velocity, developer frustration, slow feedback loop, team using workarounds (local binary without Docker)
- **Solution:** Separate dev and production Dockerfiles: dev Dockerfile uses air/nodemon for hot reload, mounts source as volume — no rebuild needed. Production Dockerfile: optimized multi-stage build (see Docker Vol 1). Dev inner loop: code change → hot reload in 1s (not rebuild in 8 min). Production build: slow is acceptable (CI runs it, not developer). `docker compose watch` for file sync.
- **Lesson:** Developer inner loop speed is a productivity multiplier. Optimize for iteration speed in dev (hot reload, volume mounts), optimize for size/security in production. Different Dockerfiles for different purposes.

---

### 43.3 Integration Test Requiring Full Stack — Too Slow to Run

- **What happens:** Integration tests require: Postgres, Redis, RabbitMQ, 3 dependent services all running — test suite takes 15 minutes to start up before first test runs — developers skip running tests
- **Real pattern:** `docker compose up` in CI: 4 minutes. Service warm-up: 3 minutes. Tests run: 8 minutes. Total: 15 minutes. Developer laptop: `docker compose up` crashes half the time (memory). Developers: don't run integration tests locally. PR merged without local integration test. CI catches issues but 15-minute feedback loop.
- **Scale trigger:** Integration tests with many real dependencies, slow container startup, underpowered developer hardware
- **Symptoms:** Tests rarely run locally, slow CI feedback loop, integration bugs caught only in CI (not locally), developers avoid running the test suite
- **Solution:** Test isolation strategies: (1) Contract tests (Pact) instead of full integration tests for inter-service contracts. (2) In-process test doubles (testcontainers-go) for DB/Redis — start a real Postgres in Docker inside the test, teardown after. Fast and isolated. (3) Split test suites: unit (< 30s), integration (< 3 min), e2e (< 15 min). Run unit always, integration on pre-push hook, e2e in CI only.
- **Lesson:** Integration tests that take 15 minutes to start won't be run locally. Test suites that aren't run locally don't catch bugs locally. Optimize test startup to < 30 seconds for developer inner loop. Use testcontainers for isolated, fast, real dependency tests.

---

### 43.4 No Local Service Mocking — Requires Network Access to Dev

- **What happens:** Local development requires VPN + access to dev cloud environment for all service calls — developer on airplane: can't work. VPN down: entire team blocked
- **Real pattern:** Local app calls: `http://user-service-dev.internal:8080` (cloud dev environment). No local mock. No local service. Developer without VPN: all service calls fail. Works if VPN connected to dev cloud. 20 developers × any downtime of dev cloud = entire team blocked.
- **Scale trigger:** Microservices with many dependencies, no local mocking strategy, dev environment in cloud
- **Symptoms:** Developers blocked when VPN/cloud unavailable, slow local development (network latency to dev cloud), "works only in CI" bugs from untested local flows
- **Solution:** Local development service mocking: (1) WireMock / mock-service containers in `docker-compose.dev.yml`. (2) Contract test stubs — Pact generates mock servers from contracts. (3) In-process fake implementations for development: `UserServiceFake` implementing `UserService` interface with in-memory data. Developer: `USE_FAKES=true go run main.go` — all services mocked locally.
- **Lesson:** Local development must work offline. Dependency on cloud dev environment for basic development tasks creates a single point of failure for the entire team. Local mocks or fake implementations enable offline, fast development.

---

### 43.5 Observability Unavailable Locally — Can't Debug Locally

- **What happens:** Distributed tracing, structured logs, and metrics only available in cloud environment — developer can't see traces from local service calls — debugging requires deploying to cloud
- **Real pattern:** Jaeger: only in cloud. Structured logs: ship to Cloudwatch (only in cloud). Developer: makes change, tries to debug. Local logs: unstructured `fmt.Println`. No trace. No metrics. To see structured logs or traces: must deploy to dev environment. Deploy: 10 minutes. Feedback loop: 10 minutes per iteration for observability.
- **Scale trigger:** Observability infrastructure only deployed in cloud, local dev skips instrumentation
- **Symptoms:** Developers unable to observe local service behavior, debugging by print statements instead of structured logs/traces, deploy-to-see workflow for any non-trivial debugging
- **Solution:** Local observability stack in `docker-compose.dev.yml`: Jaeger (all-in-one container, port 16686), Prometheus (scrapes local service), Grafana (pre-loaded dashboards). Service: OpenTelemetry auto-instrumented — traces to local Jaeger when `JAEGER_ENDPOINT=http://localhost:14268` set. Developer: runs query, opens Jaeger, sees full trace locally. Same observability as production — different destination.
- **Lesson:** Developers should observe their local service the same way they observe production. Local Jaeger + Prometheus + Grafana containers make observability available offline. Observability that only exists in cloud creates a deploy-to-debug workflow.

---

## Part 44 — Compliance Engineering Failures

### 44.1 PII in Logs — GDPR Violation at Scale

- **What happens:** Request logging includes full request body — body contains email, name, phone, IP address — logs shipped to third-party logging service — GDPR violation: PII in third-party system without DPA
- **Real pattern:** `log.Info("Request received", "body", req.Body)`. Body: `{"email": "alice@example.com", "name": "Alice Smith", "phone": "+1234567890"}`. Log shipped to Datadog (US servers). GDPR: EU personal data sent to US without Standard Contractual Clauses or explicit consent. Logs retained 90 days. Discovery: audit. Fine: up to 4% annual revenue.
- **Scale trigger:** Full request body logging, any personal data in logs, third-party log storage
- **Symptoms:** PII in log search results, legal audit finding, potential regulatory fine
- **Solution:** Structured logging with explicit field allowlist: log only safe fields (request ID, method, path, status code, latency, user ID). Never log request/response bodies unless stripped of PII. PII detection in CI: `detect-secrets` or custom regex scan on log format strings. For debugging: use request ID to retrieve specific user data from DB when needed — don't log it proactively.
- **Lesson:** Logs are often the largest PII leak vector. Never log request bodies containing user data. Structured logging with explicit safe field lists is the only compliant approach. Treat log fields with the same care as DB columns.

---

### 44.2 Right to Erasure — Data Not Deleted From All Stores

- **What happens:** User requests GDPR data deletion — service deletes from primary DB — but data remains in: read replicas, backups, Elasticsearch, data warehouse, event log, analytics DB, CDN cache
- **Real pattern:** `DELETE FROM users WHERE id = 123`. Primary: deleted. Replica: deleted (replication). Backups: user data in 30 days of backups. Elasticsearch: user indexed by `user_service`. Kafka: events contain user PII. Data warehouse: ETL'd user data. CDN: user profile image cached. 6 stores still have user data 30 days after "deletion."
- **Scale trigger:** Multi-store data architecture (almost all production systems), backup retention policies, event streams containing PII
- **Symptoms:** GDPR Article 17 violation, data subject complaint, regulator audit finding
- **Solution:** Data deletion map: document every store where user data lands. Deletion workflow: (1) Primary DB delete. (2) Cache invalidation. (3) Elasticsearch document delete by user ID. (4) Event stream: publish `user.deleted` event, consumers delete their copies. (5) Data warehouse: scheduled deletion job. (6) Backups: accept that backups are retained, but document "user data may remain in backups for X days." Pseudonymization at ingest: replace PII with user ID hash in event streams — deletion becomes hash deletion.
- **Lesson:** GDPR deletion is not a single DB DELETE. Map every store that holds user PII and implement deletion for each. Event streams with PII are a particularly hard deletion problem — pseudonymization at ingest is the scalable solution.

---

### 44.3 Consent Not Recorded — Can't Prove Lawful Basis

- **What happens:** Marketing emails sent to users — regulator asks for proof of consent for each recipient — no consent timestamp or version stored — cannot prove lawful basis — fine issued
- **Real pattern:** User signup: checkbox "I agree to marketing emails." User consented. But: system stores only `marketing_opt_in: true`. Not stored: when they consented, which version of the consent form they saw, which IP they were on, which specific processing was consented to. Regulator: "prove this user consented to THIS use of their email." Can't.
- **Scale trigger:** Any consent-based marketing, any GDPR-regulated processing, any user data use requiring consent
- **Symptoms:** Unable to demonstrate lawful basis per GDPR Article 7, regulatory investigation, potential fine
- **Solution:** Consent receipt: store all of: `user_id`, `consent_type` (marketing_email), `consent_version` (v2.3 — links to specific consent wording), `timestamp`, `ip_address`, `channel` (web_signup). Immutable: consent records never updated, only new records added (consent version changes → new record). Query: "was user 123 consented for marketing_email at time T using consent_v2.3?" → provable.
- **Lesson:** Consent must be recorded with enough detail to prove lawful basis under GDPR Article 7. Boolean flags aren't consent records — timestamps, versions, and context are required. Build consent infrastructure before you need to prove it to a regulator.

---

### 44.4 Encryption at Rest Not Enforced — Unencrypted RDS Volume

- **What happens:** RDS instance launched without encryption — HIPAA compliance requires encryption at rest — discovered in security audit — encryption requires snapshot + restore (hours of downtime or data migration)
- **Real pattern:** Terraform: `aws_db_instance { storage_encrypted = false }` (default). Application runs 18 months. Security audit: RDS not encrypted. HIPAA: § 164.312(a)(2)(iv) requires encryption of ePHI at rest. Remediation: snapshot unencrypted DB → create encrypted copy → restore application → hours of downtime or parallel migration.
- **Scale trigger:** Initial infrastructure choices without compliance requirements enforced, default values not audited
- **Symptoms:** Compliance violation discovered late, expensive remediation (downtime or migration), audit finding requiring executive sign-off
- **Solution:** Enforce encryption at Terraform policy level (Sentinel/OPA): deny any `aws_db_instance` without `storage_encrypted = true`. Checkov, tfsec, or Snyk IaC scanning in CI: flag unencrypted resources before apply. Encryption defaults: set at AWS account level (default encryption for EBS, RDS, S3). Compliance requirements codified as IaC policies — enforced automatically, not discovered in audits.
- **Lesson:** Compliance requirements (encryption, audit logging, access controls) must be codified as IaC policies enforced in CI. Discovering compliance gaps in an audit is expensive. Catching them at Terraform plan time is a config change.

---

### 44.5 API Keys Without Expiry — Credential Sprawl

- **What happens:** API keys issued to partners never expire — ex-employee's test key still valid 3 years later — key used in a data breach — no record of who the key was issued to
- **Real pattern:** API key issued: `sk_live_abc123xyz`. Stored in partner's config. Partner: changes vendor. Key: forgotten in old config. Old config: left in open GitHub repo. Key discovered: scraped. Used to exfiltrate user data. Response: which partner had this key? When was it issued? What data did it access? No records.
- **Scale trigger:** Long-lived API keys, no rotation policy, no audit trail, partner turnover
- **Symptoms:** API key misuse discovered late, unable to attribute key to specific partner, no audit trail of key usage, breach notification required with unknown scope
- **Solution:** API keys: (1) Short expiry (90 days max, auto-expire). (2) Partner/purpose tied to key in DB: `api_keys(key_hash, partner_id, purpose, created_at, expires_at, last_used_at)`. (3) Alert on key approaching expiry (reminder to rotate). (4) Access log per key: every API call logged with key_id. (5) Immediate revocation capability. (6) OAuth 2.0 client credentials flow instead of static API keys — standard, has token refresh built in.
- **Lesson:** Static API keys without expiry are permanent credentials. They get forgotten, leaked, and reused. Enforce expiry, tie keys to identifiable entities, log all usage, and build revocation into your day-one workflow.