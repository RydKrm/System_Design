# Database Design for Large-Scale Systems — Complete Topic List

> A focused curriculum on designing databases that handle millions of users, billions of rows, high concurrency, global distribution, and zero-downtime evolution. Every topic here is something you will actually face in production at scale.

---

## Part 1 — Foundation Thinking for Scale

### 1.1 The Scale Mindset

- Difference between designing for 1K users vs 1M vs 1B users
- Why designs that work at small scale break at large scale
- The "it depends" principle — every decision is a trade-off
- Scale axes — data volume, request volume, concurrency, geography
- Latency vs throughput — understanding the difference
- Tail latency — p50, p95, p99, p999 — why averages lie
- The "back-of-envelope estimation" skill — orders of magnitude thinking
- SLA, SLO, SLI definitions and how they drive design decisions
- Reading traffic patterns — spiky vs steady, read-heavy vs write-heavy
- Designing for the 80/20 rule — optimize the hot path

### 1.2 Requirements Analysis at Scale

- Functional requirements — what the system does
- Non-functional requirements — how well it does it
- Traffic estimation — DAU, MAU, requests per second calculation
- Storage estimation — bytes per record × rows per day × retention years
- Bandwidth estimation — inbound vs outbound data per second
- Memory estimation — what fits in cache vs what hits disk
- Identifying read/write ratio and what it implies for design
- Consistency requirements — strong, eventual, causal
- Availability requirements — 99.9% vs 99.99% vs 99.999% (nines of availability)
- Durability requirements — what data can never be lost
- Identifying the "hot path" — the 20% of queries that run 80% of the time
- Distinguishing OLTP patterns (point lookups) from OLAP patterns (scans + aggregation)

### 1.3 The CAP and PACELC Trade-offs

- CAP theorem — Consistency, Availability, Partition Tolerance
- Why you can only guarantee two of three in a distributed system
- CP systems — when to choose consistency over availability
- AP systems — when to choose availability over consistency
- PACELC — extending CAP with latency trade-offs (even without partition)
- Choosing the right consistency model for each data domain in your system
- Strong consistency — when it is non-negotiable (financial ledgers, inventory)
- Eventual consistency — when it is acceptable (social feed, notification count)
- Read-your-writes consistency — why it matters for user experience
- Monotonic reads — preventing time-travel bugs in distributed reads

---

## Part 2 — Data Modeling for Scale

### 2.1 Domain-Driven Design for Large Systems

- Bounded contexts — drawing boundaries around domains
- Aggregate design — consistency boundaries in the domain
- Why one aggregate = one transaction boundary
- Keeping aggregates small — why large aggregates cause lock contention
- Domain events vs state — event-first vs state-first modeling
- Context mapping — relationships between services and their databases
- Anti-corruption layers — translating between bounded contexts
- Shared kernel vs customer-supplier vs conformist patterns

### 2.2 Data Access Pattern–First Design

- Query-first design — model the schema around how you query, not how it looks
- Identifying the top 10–20 access patterns before writing a single table
- The read-path vs write-path distinction
- Denormalization driven by access patterns — the NoSQL way
- Over-fetching and under-fetching — designing schemas that serve queries exactly
- Hotspot columns — columns that are read on every query vs rarely
- Time-series access patterns — always query recent data first
- Range query patterns vs point lookup patterns — different index strategies
- Fan-out patterns — one write triggers many reads

### 2.3 Entity and Relationship Design at Scale

- Primary key strategy at scale — UUID v4 vs UUID v7 vs ULID vs snowflake ID
- Why sequential IDs (SERIAL/BIGSERIAL) cause B-Tree hotspots under high insert load
- Globally unique ID generation — Twitter Snowflake, Instagram ID, ULID
- Natural keys vs surrogate keys — when each wins at scale
- Composite keys for co-location in distributed databases
- Relationship modeling at scale — when to embed, when to reference, when to duplicate
- Many-to-many at scale — join table design and index strategy
- Polymorphic relationships at scale — STI vs MTI vs abstract table
- Versioned entities — storing history without blowing up table size
- Soft deletes at scale — partial index strategy, archive table pattern

### 2.4 Schema Evolution at Scale

- The cost of schema changes on a live table with 1B rows
- Zero-downtime migration — the expand-contract pattern
- Backward and forward compatibility in schema design
- Adding nullable columns — safe at scale
- Adding NOT NULL columns with a default — how to do it without locking
- Renaming a column — the dual-write approach
- Changing a data type — the shadow column strategy
- Dropping a column — the three-phase process
- Adding an index without locking — CREATE INDEX CONCURRENTLY
- Online schema change tools — pt-online-schema-change, gh-ost, pgd-online-schema-change

---

## Part 3 — Vertical and Horizontal Scaling

### 3.1 Vertical Scaling Limits

- What vertical scaling buys you and where its ceiling is
- CPU, RAM, disk I/O — which bottleneck you hit first and why
- The buffer pool / working set — keeping hot data in RAM
- NUMA architecture awareness — how CPU topology affects DB performance
- NVMe SSD vs HDD — the I/O revolution and what it changes
- When vertical scaling is no longer cost-effective

### 3.2 Read Scaling — Replication

- Primary-replica (leader-follower) architecture
- Asynchronous vs synchronous vs semi-synchronous replication
- Replication lag — causes, measurement, and acceptable thresholds
- Routing reads to replicas — which queries are safe to route
- Stale reads — when replication lag causes user-visible bugs
- Read-your-writes problem in replicated systems
- Replica promotion — how failover works, RPO, RTO
- Cascading replicas — replica of a replica for deep read scaling
- Multi-source replication — merging writes from multiple primaries
- Delayed replicas — intentional lag for disaster recovery

### 3.3 Write Scaling — Sharding

- Why replication alone cannot scale writes
- Sharding (horizontal partitioning) — the fundamental concept
- Shard key selection — the single most critical decision
    - High cardinality — enough distinct values to distribute evenly
    - Low correlation with time — avoid append-only hotspots
    - Matches the most common query pattern
    - Immutable — the shard key should never change
- Range-based sharding — pros, cons, hotspot risk
- Hash-based sharding — uniform distribution, loss of range queries
- Directory-based sharding — flexible routing via a lookup table
- Compound shard keys — combining two fields for better distribution
- Hotspot problem — what it is and how to detect it
- Hotspot mitigation — key salting, write sharding, time-bucketing
- Cross-shard queries — scatter-gather pattern and its cost
- Cross-shard transactions — why they are expensive and how to avoid them
- Resharding — splitting shards when you outgrow them
- Consistent hashing — minimizing data movement on resharding
- Shard maps and routing layers
- Sharding at the application level vs middleware level vs DB level

### 3.4 Table Partitioning (within a single node)

- Range partitioning — by date, by ID range
- List partitioning — by region, by tenant, by category
- Hash partitioning — uniform distribution for even access
- Composite partitioning — range then hash (sub-partitions)
- Partition pruning — how the planner skips irrelevant partitions
- Partition-wise joins and aggregates — performance benefits
- Rolling window partitions — dropping old partitions instead of DELETE
- Partition maintenance automation — adding future partitions proactively
- Local vs global indexes on partitioned tables
- Partitioning as a sharding alternative for moderate scale

### 3.5 The AKF Scale Cube

- X-axis scaling — horizontal cloning (replication)
- Y-axis scaling — functional decomposition (microservices / separate databases)
- Z-axis scaling — data partitioning (sharding by customer or data type)
- Combining all three axes for large-scale systems

---

## Part 4 — Caching Architecture

### 4.1 Caching Fundamentals

- Why caching exists — reducing database load, reducing latency
- Cache hit ratio — the metric that matters most
- Working set size — how much data must fit in cache for good hit ratio
- Cache warmup — cold start problem and strategies to mitigate it
- Cache stampede (thundering herd) — when cache expires and everyone hits the DB
- Probabilistic early expiration — preventing stampede
- Cache aside (lazy loading) pattern
- Write-through cache pattern
- Write-behind (write-back) cache pattern
- Read-through cache pattern
- Refresh-ahead (proactive expiration) pattern

### 4.2 Cache Invalidation

- Cache invalidation — the hardest problem in distributed systems
- TTL-based invalidation — simple but allows stale data
- Event-driven invalidation — listening to DB change events
- Versioned cache keys — busting the cache by changing the key
- Tag-based invalidation — invalidating groups of cache entries
- Cache-aside with version column — optimistic cache invalidation
- CDC-driven invalidation — Debezium → Kafka → cache invalidator
- Write-around pattern — when to skip the cache on writes

### 4.3 Distributed Cache Design

- Redis Cluster — sharding the cache itself
- Cache node failure — what happens to in-flight requests
- Consistent hashing for cache nodes
- Replication within the cache layer — Redis Sentinel and Cluster
- Multi-level caching — L1 in-process cache + L2 Redis + L3 DB
- Local in-process cache (e.g., sync.Map in Go) for ultra-hot data
- Cache size estimation — how much memory you need
- Eviction policies — LRU, LFU, TTL, random — choosing the right one
- The hotkey problem in Redis — one key receiving millions of requests
- Hotkey mitigation — local replication, key splitting, read replicas in Redis

### 4.4 What to Cache vs What Not to Cache

- Good cache candidates — expensive queries, user sessions, configuration
- Bad cache candidates — data that changes every second, highly personalized data
- User-specific vs shared cache entries
- Caching query results vs caching objects vs caching pages
- Partial result caching — caching expensive sub-computations

---

## Part 5 — Indexing at Scale

### 5.1 Index Design for High-Volume Tables

- Covering indexes — eliminating table heap access entirely
- Composite index column ordering — equality first, range last
- Index selectivity at scale — when an index stops being useful
- Partial indexes for large sparse tables — only index the hot rows
- Expression indexes for computed lookups
- Avoiding index bloat — the vacuum and rebuild cycle
- Index maintenance overhead — every index slows writes
- Choosing between fewer wide indexes vs more narrow indexes

### 5.2 Write-Heavy Table Index Strategy

- Minimizing indexes on write-heavy tables
- Delayed index creation — build indexes after bulk load
- BRIN indexes for append-only time-series tables
- Partitioned indexes — one index per partition vs global index
- Index fill factor — leaving room for updates to avoid page splits
- HOT updates (Heap-Only Tuple) in PostgreSQL — avoiding index churn

### 5.3 Query Planning at Scale

- Statistics accuracy — why ANALYZE frequency matters on large tables
- Histogram buckets and the planner's estimate errors at scale
- Table sample statistics — when full analyze is too slow
- Planner hints — when and how to guide the planner
- Prepared statement plan caching — generic vs custom plans
- Parallel query execution — when the planner parallelizes
- Partition pruning in the query plan — confirming it happens

---

## Part 6 — Distributed Database Architecture

### 6.1 Distributed SQL Databases

- What distributed SQL means — SQL semantics over distributed storage
- Google Spanner architecture — TrueTime, Paxos, globally distributed
- CockroachDB — Raft consensus, range-based partitioning, distributed SQL
- YugabyteDB — Raft-based, PostgreSQL wire protocol
- Citus — PostgreSQL sharding extension for horizontal scale
- Vitess — MySQL sharding middleware (used by YouTube, Slack)
- Trade-offs — distributed SQL vs application-level sharding
- Cross-row and cross-shard transactions in distributed SQL

### 6.2 Consensus and Replication Protocols

- Raft consensus — leader election, log replication, commitment
- Paxos — multi-Paxos for replicated state machines
- Viewstamped replication — alternative to Paxos
- Quorum writes and reads — W + R > N for strong consistency
- Quorum configuration — tuning N, W, R for consistency vs availability
- Epoch-based fencing — preventing split-brain after failover
- Lease-based leadership — time-limited locks for leader election

### 6.3 Distributed Transactions

- Why distributed transactions are expensive
- Two-Phase Commit (2PC) — protocol, coordinator failure, blocking problem
- Three-Phase Commit (3PC) — non-blocking alternative
- Saga pattern — long-running transactions without 2PC
    - Choreography-based saga — event-driven
    - Orchestration-based saga — central coordinator
    - Compensating transactions — the rollback equivalent
- Outbox pattern — atomically writing to DB and publishing an event
- Transactional inbox pattern — idempotent event consumption
- Idempotency keys — making non-idempotent operations safe to retry
- XA transactions — two-phase commit across heterogeneous databases
- Avoiding distributed transactions by redesigning the schema

### 6.4 Multi-Region Database Design

- Active-passive multi-region — one writable region
- Active-active multi-region — multiple writable regions
- Conflict resolution in active-active — last write wins, CRDTs, custom logic
- CRDTs (Conflict-free Replicated Data Types) — G-Counter, OR-Set, LWW-Register
- Global vs local indexes in multi-region
- Data residency and sovereignty requirements — GDPR, data localization laws
- Latency-optimized reads — routing reads to the nearest region
- Write latency in multi-region — synchronous vs asynchronous cross-region replication
- Geo-partitioning — placing data in the region where it is accessed most

---

## Part 7 — Polyglot Persistence

### 7.1 Why One Database Is Never Enough at Scale

- Different data has different access patterns
- Choosing the right tool for each domain
- The polyglot persistence principle
- Operational overhead of running multiple database technologies
- Organizational maturity required for polyglot persistence

### 7.2 Database Selection Framework

- OLTP workloads → PostgreSQL, MySQL, CockroachDB
- Document workloads → MongoDB, DynamoDB, Firestore
- Key-value / cache → Redis, DynamoDB, Memcached
- Column-family / time-series write scale → Cassandra, ScyllaDB
- Full-text search → Elasticsearch, OpenSearch, Typesense
- Graph relationships → Neo4j, Amazon Neptune, DGraph
- Time-series metrics → InfluxDB, TimescaleDB, Prometheus
- Analytics / OLAP → ClickHouse, BigQuery, Redshift, Snowflake, DuckDB
- Message stream (durable log) → Apache Kafka, Amazon Kinesis, Pulsar
- Object / blob storage → S3, GCS, Azure Blob (not a DB but part of the picture)

### 7.3 Data Ownership Boundaries

- One service owns one database — the microservices database pattern
- Shared database anti-pattern — why it causes coupling at scale
- Database per service — the independence trade-off
- How to handle queries that span multiple service databases
- API composition — aggregating data at the application layer
- CQRS — separating read and write models across databases
- Event-driven sync — replicating data across service boundaries via events

---

## Part 8 — CQRS and Event Sourcing

### 8.1 CQRS (Command Query Responsibility Segregation)

- What CQRS is — separating writes (commands) from reads (queries)
- Why CQRS exists — different scaling and modeling needs for reads vs writes
- Simple CQRS — separate read and write models in the same database
- Full CQRS — separate databases for read model and write model
- Read model denormalization — optimizing for the query, not the write
- Synchronizing write model to read model — sync, async, eventual
- CQRS + event sourcing — the natural pairing
- When CQRS is overkill — small teams and simple domains
- Complexity cost of CQRS — operational and cognitive overhead

### 8.2 Event Sourcing

- What event sourcing is — storing events, not current state
- Event store design — immutable, append-only, ordered per aggregate
- Rebuilding current state — replaying events
- Snapshots — checkpointing state to avoid full replay
- Event versioning — evolving event schemas without breaking consumers
- Idempotent event consumers — handling duplicate delivery safely
- Projections — read models built from event streams
- Temporal queries — "what was the state at time T?" — trivially answerable
- When event sourcing fits — financial systems, audit-heavy, undo/redo needed
- When event sourcing is overkill — simple CRUD domains

### 8.3 Change Data Capture (CDC)

- What CDC is — treating the database transaction log as an event stream
- Debezium — the most widely used CDC tool
- PostgreSQL CDC — logical replication + pgoutput plugin
- MySQL CDC — binlog consumer
- CDC use cases — cache invalidation, search index sync, read model sync, analytics
- At-least-once CDC delivery — handling duplicates in consumers
- Outbox pattern with CDC — transactional event publishing
- CDC latency — how fast events propagate from DB to consumers
- Schema changes and CDC — how they interact

---

## Part 9 — Write Patterns at Scale

### 9.1 Write Amplification and How to Reduce It

- What write amplification is — one logical write causing many physical writes
- Write amplification in B-Tree — page splits, index updates
- Write amplification in LSM-Tree — compaction
- Minimizing indexes on write-heavy tables
- Batch writes — grouping inserts for throughput
- Bulk loading — COPY command, bulk insert, bypassing indexes
- Upsert patterns — INSERT ON CONFLICT vs SELECT then INSERT
- Partial updates — UPDATE only changed columns, not the whole row

### 9.2 Queue-Based Write Patterns

- Absorbing write spikes with a message queue (Kafka, RabbitMQ)
- Write buffer pattern — buffering writes in Redis, flushing in batches
- Async writes — writing to queue first, persisting asynchronously
- Backpressure — what it is and how to implement it
- At-least-once delivery and idempotent inserts
- Exactly-once semantics — Kafka transactions + outbox pattern
- Ordering guarantees — when write order matters to the DB schema

### 9.3 Append-Only and Immutable Data Patterns

- Why append-only tables scale better than update-heavy tables
- Ledger pattern — every transaction is an insert, never an update
- Event log tables — INSERT only, read with aggregation
- Archival tables — moving old rows to a cold table
- Soft delete vs hard delete at scale — partial index for un-deleted rows
- Log-structured storage — why LSM-Trees naturally favor append workloads
- Time-based partitioning of append-only tables — drop old partitions instead of DELETE

### 9.4 Idempotency at Scale

- What idempotency means for database operations
- Idempotency keys — unique constraint on operation ID
- Natural idempotency — SELECT for existence before INSERT
- At-least-once delivery + idempotent consumers = effectively exactly-once
- Deduplication tables — storing processed event IDs
- Idempotent upsert — INSERT ON CONFLICT DO NOTHING / DO UPDATE
- TTL-based deduplication — expiring old idempotency records

---

## Part 10 — Read Patterns at Scale

### 10.1 Read Optimization Techniques

- Denormalized read tables — pre-joining data for fast reads
- Materialized views — pre-computing aggregates
- Incremental materialized view refresh vs full refresh
- Summary tables — pre-aggregated counters and totals
- Pre-computed columns — storing computed values alongside raw data
- Fanout on write — writing to every reader's feed at write time
- Fanout on read — computing the feed at read time
- The celebrity problem — why fanout-on-write breaks for high-follower accounts

### 10.2 Pagination at Scale

- OFFSET-based pagination — why it fails at large offsets (full table scan)
- Keyset pagination (cursor-based) — using the last row's key as the next cursor
- Time-based cursor pagination — using created_at + id as cursor
- Stable sort requirements for cursor pagination
- Infinite scroll — implementing cursor pagination for feeds
- Total count at scale — why COUNT(*) is expensive and how to approximate it
- HyperLogLog for approximate distinct counts — Redis PFADD/PFCOUNT
- Bounded result sets — always enforcing LIMIT even when callers don't

### 10.3 Aggregation at Scale

- Pre-aggregation — computing aggregates at write time, not read time
- Counter tables — dedicated rows for increment/decrement counters
- Redis atomic counters — INCR, INCRBY for real-time counts
- Approximate counting — trade-off between accuracy and performance
- Sliding window aggregation — time-range counts without full scans
- Rollup tables — summarizing fine-grained data into coarser buckets
- OLAP separation — moving heavy aggregation to a separate analytical database
- Columnar storage for analytics — ClickHouse, BigQuery, DuckDB
- Materialized aggregates with scheduled refresh

### 10.4 Search at Scale

- Full-text search in PostgreSQL — tsvector, GIN index, ts_rank
- When PostgreSQL full-text search breaks — 100M+ rows, complex ranking
- Elasticsearch / OpenSearch — inverted index, distributed search
- Typesense / Meilisearch — simpler search for moderate scale
- Dual-write pattern — keeping search index in sync with DB
- CDC-driven search index update — Debezium → Kafka → Elasticsearch
- Search relevance scoring — BM25, TF-IDF, field boosting
- Autocomplete at scale — trigram indexes, Redis Sorted Sets, Elasticsearch completion suggester

---

## Part 11 — Concurrency and Consistency at Scale

### 11.1 High-Concurrency Transaction Design

- Reducing lock contention — shorter transactions, fewer locks
- Row-level locking vs table-level locking — choosing the right scope
- SELECT FOR UPDATE vs SELECT FOR SHARE — when each applies
- SKIP LOCKED — implementing concurrent job queues without contention
- Optimistic locking at scale — version column, compare-and-swap
- Pessimistic locking at scale — when it deadlocks and how to avoid it
- Deadlock prevention — consistent lock ordering, timeout and retry
- Lock-free reads — MVCC and snapshot isolation

### 11.2 Isolation Level Selection at Scale

- Read Committed — the safe default for most OLTP workloads
- Repeatable Read — when you need consistency within a transaction
- Serializable — the strongest guarantee, highest overhead
- Serializable Snapshot Isolation (SSI) — PostgreSQL's serializable
- Snapshot isolation anomalies — write skew and how to prevent it
- Lost update detection and prevention
- Phantom read prevention

### 11.3 Distributed Locking

- Why in-process locks don't work across multiple service instances
- Redis distributed lock — SET NX PX pattern
- Redlock algorithm — multi-node Redis locking
- Problems with Redlock — clock skew, network partition edge cases
- Database-level advisory locks — pg_try_advisory_lock
- ZooKeeper / etcd for distributed coordination
- Fencing tokens — preventing stale lock holders from corrupting data

### 11.4 Consistency Patterns for Specific Problems

- Inventory reservation — preventing overselling
    - Optimistic locking with version check
    - Pessimistic lock on inventory row
    - Event-driven reservation with saga
- Bank transfer — atomicity across two accounts
    - Single-DB transaction (trivial)
    - Saga with compensating transactions (distributed)
    - Ledger pattern (credit + debit as separate rows, sum = balance)
- Unique username registration — preventing races
    - Unique constraint (best solution)
    - SELECT then INSERT (race condition — wrong)
    - INSERT ON CONFLICT (correct)
- Idempotent payment — charging once even with retries
    - Idempotency key + unique constraint
    - Status machine transitions with precondition checks

---

## Part 12 — Multi-Tenancy at Scale

### 12.1 Multi-Tenancy Models

- Shared schema, shared tables — tenant_id column on every table
- Shared schema, separate schemas — one PostgreSQL schema per tenant
- Separate databases per tenant — full isolation, high operational cost
- Hybrid — small tenants share, large tenants get dedicated
- Choosing a model based on isolation requirements and tenant count

### 12.2 Row-Level Security (RLS) for Multi-Tenancy

- PostgreSQL RLS — defining security policies on tables
- Automatic tenant filtering — no accidental cross-tenant data leaks
- Performance of RLS at scale — index on tenant_id is mandatory
- RLS policy design — USING clause vs WITH CHECK clause
- Bypassing RLS for admin operations — SET ROLE

### 12.3 Tenant Isolation Concerns

- Noisy neighbor problem — one tenant's workload affecting others
- Per-tenant query timeouts and resource limits
- Connection pooling per tenant vs shared pool
- Tenant-aware indexing — composite index (tenant_id, ...) for every query
- Data migration — moving a tenant from shared to dedicated
- Tenant onboarding automation — schema provisioning, seed data

### 12.4 Multi-Tenant Data Design Patterns

- Tenant configuration table — per-tenant feature flags and settings
- Tenant-specific schema overrides — custom fields per tenant
- Quotas and usage tracking per tenant
- Soft deletion of tenant data vs hard deletion (GDPR right to erasure)
- Cross-tenant analytics — aggregate queries across all tenants

---

## Part 13 — Time-Series and Append-Heavy Data

### 13.1 Time-Series Schema Design

- What makes time-series different — always inserting, rarely updating
- Wide vs narrow table design — one row per metric vs one column per metric
- Tag-based schema — labeling time-series for filtering
- Timestamp precision — microseconds vs milliseconds vs seconds
- Storing monotonically increasing data — BRIN index advantages
- Partitioning time-series by time range — daily, weekly, monthly partitions
- Chunk-based storage — TimescaleDB hypertables
- Compression of time-series data — delta encoding, Gorilla compression

### 13.2 Time-Series Query Patterns

- Latest value per series — the "last observation carried forward" query
- Downsampling — reducing resolution over time (1s → 1m → 1h → 1d)
- Rollup tables — pre-aggregated coarser buckets
- Continuous aggregates (TimescaleDB) — auto-maintained rollup views
- Sliding window functions for time-series
- Gap filling — interpolating missing time slots
- Rate queries — change per second from a counter
- Retention policies — automatically dropping data older than N days

### 13.3 High-Ingest Write Design

- Batching writes — buffering in Kafka before inserting
- Bulk COPY vs individual INSERTs — throughput comparison
- Disabling synchronous commit for non-critical time-series
- Unlogged tables for ephemeral metrics
- Write path architecture — agent → Kafka → consumer → DB
- Back-pressure when the DB can't keep up with ingest

---

## Part 14 — Observability and Capacity Planning

### 14.1 Database Metrics That Matter at Scale

- Query throughput — transactions per second (TPS), queries per second (QPS)
- Query latency — p50, p95, p99, p999 per query type
- Cache hit ratio — buffer pool hit ratio, Redis hit ratio
- Replication lag — seconds of delay on replicas
- Lock wait time and deadlock rate
- Connection pool saturation — active vs idle vs waiting connections
- Disk I/O — reads/writes per second, I/O wait percentage
- WAL generation rate — writes per second, checkpoint frequency
- Table and index bloat percentage
- Vacuum effectiveness — dead tuple ratio

### 14.2 Slow Query Analysis

- pg_stat_statements — aggregate statistics per query fingerprint
- Slow query log (MySQL/PostgreSQL) — catching individual slow queries
- EXPLAIN ANALYZE — understanding where time is spent
- Auto-EXPLAIN — logging plans for slow queries automatically
- Query fingerprinting — normalizing queries for aggregation
- Top-N slow queries — sorted by total time, not per-call time
- Regression detection — alerting when a query plan changes

### 14.3 Capacity Planning

- Storage growth projection — bytes/day × days/year × replication factor
- IOPS requirements — random reads/writes per second per workload type
- Working set estimation — what fraction of data is accessed frequently
- Memory sizing — working set must fit in buffer pool for performance
- Connection headroom — always plan for 2× peak connections
- Replication bandwidth — WAL bytes/second × number of replicas
- Shard capacity planning — when each shard will hit its limit
- When to add a read replica vs upgrade the primary vs shard

### 14.4 Load Testing Databases

- pgbench — PostgreSQL built-in benchmarking tool
- sysbench — MySQL and generic benchmarking
- k6, Locust, Gatling — application-level load tests with DB behind them
- Read-only benchmarks vs mixed read-write benchmarks
- Benchmarking under realistic data volume — not on empty tables
- Measuring the effect of a new index under load
- Simulating peak traffic — holiday spikes, viral events

---

## Part 15 — High Availability and Disaster Recovery

### 15.1 High Availability Architecture

- Single point of failure identification and elimination
- Primary + synchronous replica — zero data loss failover
- Primary + asynchronous replica — risk of data loss on failover
- Failover detection — health checks, heartbeats, timeout tuning
- Automatic failover — Patroni (PostgreSQL), Orchestrator (MySQL)
- Manual failover — controlled switchover during maintenance
- Split-brain detection — fencing tokens, STONITH, quorum
- Connection re-routing after failover — PgBouncer, ProxySQL, HAProxy
- Stateless application design — not storing DB connection state in app instances

### 15.2 Backup Strategy at Scale

- RTO (Recovery Time Objective) — how fast must you recover
- RPO (Recovery Point Objective) — how much data loss is acceptable
- Logical backup — pg_dump, mysqldump — slow on large databases
- Physical backup — pg_basebackup, xtrabackup — faster, database-level
- Continuous WAL archiving — enables point-in-time recovery
- Point-in-time recovery (PITR) — restore to any second in history
- Backup storage — S3 / GCS with versioning and lifecycle policies
- Backup frequency — full daily + continuous WAL streaming
- Backup encryption and key management
- Backup verification — automated restore tests in CI/CD
- Cross-region backup replication — surviving a region outage
- Restore drills — testing recovery under pressure before you need it

### 15.3 Disaster Recovery Scenarios

- Single node failure — replica promotion, automatic failover
- Data center outage — failover to standby region
- Accidental mass DELETE or DROP TABLE — PITR restore
- Corruption — physical backup + WAL replay to last clean state
- Ransomware / cloud account compromise — offline backup strategy
- Runbook documentation — step-by-step recovery instructions per scenario
- RTO and RPO validation — measuring actual recovery time in drills

---

## Part 16 — Security at Scale

### 16.1 Access Control at Scale

- Principle of least privilege — each service gets exactly the permissions it needs
- Service accounts — separate DB users per microservice
- Role-based access control (RBAC) — roles not individual grants
- Row-level security — mandatory for multi-tenant schemas
- Column-level permissions — hiding sensitive fields from certain roles
- Audit logging — recording who ran what and when (pgaudit, MySQL general log)
- Separation of duties — DBA vs developer vs application access

### 16.2 Encryption at Scale

- Encryption in transit — TLS/mTLS for all DB connections
- Encryption at rest — disk-level vs tablespace-level vs column-level
- Column-level encryption for PII — encrypt before storing, decrypt on read
- Key management — HashiCorp Vault, AWS KMS, GCP Cloud KMS
- Key rotation — rotating encryption keys without re-encrypting all data
- Envelope encryption — encrypting data keys with a master key

### 16.3 PII and Compliance

- Identifying PII in the schema — columns containing personal data
- Data classification schema — public, internal, confidential, restricted
- GDPR right to erasure — soft delete vs hard delete, anonymization
- Data masking — anonymizing data in non-production environments
- Data retention policies — automatically expiring old PII data
- Audit trail for PII access — logging every read of sensitive data
- Pseudonymization — replacing PII with a reversible token

### 16.4 SQL Injection and Application Security

- Parameterized queries — always; string concatenation never
- Prepared statements — database-level protection
- Stored procedures as a layer of indirection
- Application-level input validation before SQL
- Least privilege + SQL injection — limited blast radius if injection occurs
- WAF (Web Application Firewall) as an additional layer

---

## Part 17 — Schema Design Patterns for Large Systems

### 17.1 Temporal and Historical Data Patterns

- Bitemporal data — valid time (when it was true) vs transaction time (when it was recorded)
- Valid-time tables — tracking when a fact was true in the real world
- System-time tables — tracking when a fact was recorded in the DB
- History tables — keeping old versions on UPDATE/DELETE
- Temporal range types — daterange, tstzrange in PostgreSQL
- Overlap prevention — EXCLUDE USING gist for no-overlap constraints
- Audit trails — append-only log of every state transition

### 17.2 State Machine Patterns

- Representing state machines in the DB — status enum column
- Status transition table — allowed transitions as a lookup table
- Enforcing valid transitions — CHECK constraint or trigger
- Optimistic locking on status transitions — preventing race conditions
- Status + timestamp columns — recording when each transition happened
- Idempotent state transitions — applying the same event twice is safe

### 17.3 Counter and Rate Patterns

- Naive counter — single row update under high concurrency = bottleneck
- Sharded counters — N counter rows, SUM() to read — high write throughput
- Redis atomic counters — INCR/INCRBY for real-time, sync to DB async
- Approximate counting — HyperLogLog for unique counts at massive scale
- Time-bucketed counters — counts per minute/hour/day for rate queries
- Leaky bucket and token bucket in Redis for rate limiting

### 17.4 Hierarchical and Graph Data Patterns

- Adjacency list — simple, parent_id column — bad for deep tree queries
- Nested sets — fast subtree reads, slow writes — only for read-heavy trees
- Closure table — one row per ancestor-descendant pair — fast reads and writes
- Materialized path — path string like /root/parent/child — simple, works well at moderate depth
- Recursive CTEs for adjacency list traversal — flexible but not always fast
- ltree extension (PostgreSQL) — native materialized path with operators
- Graph databases vs relational for graph queries — when to reach for Neo4j

### 17.5 Inbox / Outbox Patterns

- Outbox table — atomically writing a DB record and a pending event in the same transaction
- Outbox poller — reading pending events and publishing to Kafka
- CDC-based outbox — Debezium reads the outbox table's WAL entries
- Inbox table — recording received events to deduplicate
- Idempotent inbox processing — UPSERT on event ID
- Cleanup of processed outbox and inbox rows — TTL-based archival

---

## Part 18 — Practical Large-Scale System Database Designs

### 18.1 Designing a Database for a Social Media Platform (1B users)

- User and profile schema
- Follow graph — adjacency list with sharding by follower
- Post and timeline schema
- Fanout-on-write vs fanout-on-read decision
- Like and comment counters — sharded counters + Redis
- Notification schema — polymorphic event model
- Search — Elasticsearch for user and post search
- Analytics — separate ClickHouse cluster
- Media — metadata in PostgreSQL, blobs in S3

### 18.2 Designing a Database for a Fintech / Payment System

- Account schema — no balance column, sum from ledger
- Double-entry ledger schema — debit and credit rows
- Transaction idempotency — idempotency key unique constraint
- Currency precision — NUMERIC(19,4), never FLOAT
- Fraud event schema — append-only, Kafka-backed
- Regulatory audit schema — immutable, cryptographically signed rows
- Multi-currency support — amount + currency_code + exchange_rate snapshot
- Reconciliation schema — comparing internal ledger with external bank records

### 18.3 Designing a Database for an E-Commerce Platform

- Product catalog — category hierarchy, attribute schema, variant matrix
- Inventory schema — per-warehouse, per-SKU, reservation model
- Cart schema — ephemeral in Redis, persistent in PostgreSQL
- Order schema — state machine, line items, address snapshot
- Payment record schema — immutable, idempotent
- Review and rating schema — aggregate cache + raw table
- Search — Elasticsearch product index synced via CDC
- Recommendation — event log → ML pipeline → precomputed results table

### 18.4 Designing a Database for a Ride-Sharing / Delivery Platform

- Driver and rider schema
- Real-time location — Redis Geo for active drivers, PostgreSQL for history
- Trip schema — state machine, geospatial route
- Fare schema — fare calculation snapshot at trip end
- Surge pricing schema — time-bucketed demand and supply aggregates
- Geofencing — PostGIS polygons for zones and service areas
- Dispatch queue — Redis Sorted Set for nearest driver selection
- Analytics — trip events streamed to ClickHouse

### 18.5 Designing a Database for a Multi-Tenant SaaS Platform

- Tenant schema — shared table with tenant_id, RLS enforcement
- Subscription and billing schema
- Feature flag schema — per-tenant feature toggles
- Usage quota schema — per-tenant resource consumption tracking
- Audit log schema — per-tenant operation history
- Tenant-specific configuration — JSONB for flexible per-tenant settings
- Data export and right-to-erasure implementation

---

## Learning Resources

### Books

|Book|Focus Area|
|---|---|
|_Designing Data-Intensive Applications_ — Martin Kleppmann|The bible of large-scale data systems|
|_System Design Interview Vol. 1 & 2_ — Alex Xu|25+ real system case studies with DB design|
|_Database Internals_ — Alex Petrov|How storage engines work under the hood|
|_High Performance MySQL_ (4th ed.) — Botros & Tinley|Scaling, replication, sharding in production|
|_Database Design for Mere Mortals_ — Michael Hernandez|The design process from blank page to schema|
|_Domain-Driven Design_ — Eric Evans|Modeling complex business domains|
|_The Data Model Resource Book Vol. 1 & 2_ — Len Silverston|Pre-built models for common domains|
|_Scalability Rules_ — Abbott & Fisher|AKF Scale Cube and practical scaling principles|
|_Patterns of Enterprise Application Architecture_ — Fowler|Repository, Unit of Work, Optimistic Lock|
|_SQL Antipatterns_ — Bill Karwin|What not to do and why|
|_Transaction Processing_ — Jim Gray & Andreas Reuter|Deep academic treatment of ACID and locks|
|_Distributed Systems_ (4th ed.) — Van Steen & Tanenbaum|CAP, consensus, clock theory|

### Free Online Resources

|Resource|URL|What It Covers|
|---|---|---|
|Use The Index, Luke|https://use-the-index-luke.com|Indexing and query tuning|
|The Internals of PostgreSQL|https://www.interdb.jp/pg|PostgreSQL storage and MVCC internals|
|CMU 15-445 Database Lectures|https://15445.courses.cs.cmu.edu|Storage, indexes, transactions (Andy Pavlo)|
|CMU 15-721 Advanced DB Lectures|https://15721.cs.cmu.edu|Distributed DB, OLAP, modern systems|
|High Scalability blog|http://highscalability.com|Real architecture case studies|
|Martin Fowler's blog|https://martinfowler.com|Patterns, CQRS, event sourcing|
|Hussein Nasser YouTube|https://www.youtube.com/@hnasr|Database engineering walkthroughs|
|ByteByteGo (Alex Xu)|https://bytebytego.com|System design with DB focus|
|Arpit Bhayani YouTube|https://www.youtube.com/@AsliEngineering|Deep-dive system design + DB|
|dbdiagram.io|https://dbdiagram.io|Schema design and ER diagram tool|
|Postgres Wiki|https://wiki.postgresql.org|Advanced PostgreSQL patterns|

### Practice Projects (ordered by complexity)

1. **Library System** — Simple relationships, state machine for borrowing
2. **E-Commerce Store** — Inventory reservation, order state machine, payments
3. **HR & Payroll System** — Hierarchy, roles, audit trail, payslip snapshots
4. **Ride-Sharing App** — Real-time geo, trip state machine, fare ledger
5. **Social Network** — Follow graph, feed fanout, counters at scale
6. **Banking Ledger** — Double-entry bookkeeping, idempotent transactions
7. **SaaS Multi-Tenant Platform** — RLS, quotas, per-tenant config
8. **Real-Time Analytics Dashboard** — CQRS, materialized views, ClickHouse
9. **Distributed Job Queue** — SKIP LOCKED, idempotency, retry logic
10. **Global Messaging Platform** — Sharding, multi-region, CDC, search

---

_Total topics in this curriculum: ~350 across 18 parts. Master Parts 1–6 before touching Parts 7–18. DDIA is mandatory reading throughout — read it in parallel with every part._