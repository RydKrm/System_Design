# Volume 2 — Database Failure Case Studies

> Continuing from Volume 1's 57 cases. Every case follows:
> **What happens → Real pattern → Scale trigger → Symptoms → Solution → Lesson**

---

## Part 10 — Sharding Failure Cases

### 10.1 The Wrong Shard Key That Cannot Be Changed
- **What happens:** System is sharded by `created_at` (timestamp) — all new writes go to the latest shard — that shard is always 100× busier than older shards while old shards sit idle — to fix it requires moving every row in the database
- **Real pattern:** Time-based sharding chosen because it was "natural" — common in early sharding decisions made under pressure
- **Scale trigger:** Immediately apparent under any write load — the newest shard is always the hot one
- **Symptoms:** One shard at 100% CPU/IO, all others near idle, write latency grows as the hot shard fills, old shards wasted
- **Solution:** Cannot be easily fixed — requires a full reshard to a hash-based key; prevent it by choosing a high-cardinality hash shard key from day one; use `user_id` or a UUID hash, never a timestamp
- **Lesson:** Shard key choice is irreversible without a full data migration — it is the single most consequential database design decision you will ever make

### 10.2 The Cross-Shard JOIN That Paralyzed the System
- **What happens:** After sharding `users` by `user_id` and `orders` by `order_id`, a new feature requires: "show me all users who placed an order in the last 7 days" — this query cannot be answered by any single shard — requires scatter-gather across all shards then merge in application code
- **Real pattern:** Every system that shards discovers cross-shard queries within weeks of going live
- **Scale trigger:** One cross-shard query per page load × millions of page loads = scatter-gather load multiplied across every shard
- **Symptoms:** Simple queries become 10–50× slower than expected, application layer complexity explodes, N shard queries for every user-facing request
- **Solution:** Collocate related data — shard both `users` and `orders` by `user_id` so user+order joins stay on one shard; maintain a denormalized read model in a separate DB for cross-shard queries; use Elasticsearch for cross-shard search
- **Lesson:** Design the shard key around your most common joins — a join that crosses shard boundaries costs N times as much as a local join

### 10.3 The Shard That Ran Out of Disk Mid-Traffic
- **What happens:** One shard receives disproportionate data (a few very active tenants) — disk fills up — PostgreSQL refuses writes — that shard's tenants cannot create any records — partial service outage
- **Real pattern:** Hash sharding distributes rows evenly but not data size — a few rows can be enormous (binary blobs, JSONB documents)
- **Scale trigger:** When data size per row varies significantly across rows
- **Symptoms:** Write errors only for users on the full shard, other users unaffected, confusing partial outage
- **Solution:** Shard by data size as well as row count; move large-data tenants to dedicated shards; implement capacity monitoring per shard with alerts at 70% and 85% disk; store blobs in object storage, not in the DB
- **Lesson:** Sharding distributes row count evenly, not data volume — monitor disk per shard independently

### 10.4 The Global Secondary Index That Became a Bottleneck
- **What happens:** To support a query pattern not aligned with the shard key (`SELECT * FROM orders WHERE email = ?` on a system sharded by `user_id`), a global secondary index is maintained across all shards — every insert must update this global index — the global index becomes a write bottleneck
- **Real pattern:** Any lookup by a field that is not the shard key — email, phone number, external reference ID
- **Scale trigger:** Write throughput is limited by the global index update rate
- **Symptoms:** Write latency climbs as write volume grows, global index node is always the hot spot
- **Solution:** Maintain a separate lookup table (`email → user_id`) as a thin mapping layer in a dedicated DB; use Elasticsearch for secondary index queries; design the application to always resolve to the shard key before querying the sharded DB
- **Lesson:** Global secondary indexes in sharded systems are write bottlenecks by nature — minimize them or replace with a thin lookup service

### 10.5 The Reshard That Caused Downtime for Every Tenant
- **What happens:** System needs to go from 8 shards to 32 shards — migrating data requires copying rows between shards while the system is live — dual-write is complex — team decides to take a maintenance window — 4 hours of complete downtime for all tenants
- **Real pattern:** Under-sharded system that needs to reshard as it grows
- **Scale trigger:** More data than planned for, sooner than planned for
- **Symptoms:** Planned maintenance window, all customers offline, potential SLA violations
- **Solution:** Over-shard from the start — start with 256 virtual shards even if you only have 4 physical nodes; when you need more physical nodes, re-assign virtual shards without moving data; consistent hashing minimizes data movement on node addition
- **Lesson:** Start with far more shards than you need — virtual shards that can be remapped cost nothing and save painful resharding later

### 10.6 The Distributed Transaction Deadlock Across Shards
- **What happens:** Two transactions on different shards each need to lock a row on the other's shard — cross-shard distributed deadlock — no single DB can detect it — both transactions wait forever until timeout
- **Real pattern:** Any cross-shard update that involves multiple shards in a single operation
- **Scale trigger:** Rare at low cross-shard operation rate, frequent when cross-shard operations are common
- **Symptoms:** Transactions timing out after the full timeout duration rather than fast deadlock detection, high lock wait time, cross-shard operations always slower than expected
- **Solution:** Avoid cross-shard transactions entirely — redesign so operations are intra-shard; when unavoidable, use Saga pattern instead of distributed 2PC; set aggressive timeouts on cross-shard operations
- **Lesson:** Deadlock detection does not work across shards — cross-shard deadlocks become timeouts, which are much worse for the user experience

---

## Part 11 — Connection Pooling and Proxy Failure Cases

### 11.1 The PgBouncer Statement Mode with Prepared Statements
- **What happens:** Application uses prepared statements (psycopg2 with `prepare=True`, pgx with named prepared statements) — PgBouncer is in statement mode — prepared statements are connection-specific — PgBouncer routes each statement to a different backend connection — the prepared statement is not found — `ERROR: prepared statement "s1" does not exist`
- **Real pattern:** Any application using prepared statements behind PgBouncer in statement or transaction mode
- **Scale trigger:** Happens on first prepared statement execution after pool switch
- **Symptoms:** Random `prepared statement not found` errors, errors appear non-deterministically (depends on which backend connection handles the request)
- **Solution:** Use PgBouncer in session mode if you need prepared statements; disable prepared statements in the application and use parameterized queries; use pgx's `QueryExec` mode which disables prepared statements automatically
- **Lesson:** PgBouncer transaction mode is incompatible with prepared statements — choose one or the other

### 11.2 The Connection Pool That Blocked on Health Check
- **What happens:** Connection pool runs a health check query (`SELECT 1`) on idle connections — DB is slow or overloaded — health check query takes 10 seconds — pool thread is blocked performing health check — no connections available for real queries — application hangs
- **Real pattern:** Health check queries without a separate timeout, pool validation on borrow
- **Scale trigger:** Only manifests when the DB is already under stress — makes a bad situation catastrophic
- **Symptoms:** Application stops serving requests despite DB being "up", pool has 0 available connections, all connections stuck on health check
- **Solution:** Set a separate, very short timeout (100ms) specifically for health check queries; use passive health checks (assume connection is good unless a query fails) rather than active ping; use PgBouncer which handles this at the proxy level
- **Lesson:** Health checks must have their own short timeout independent of regular query timeouts — otherwise health checks become the failure point during DB slowdowns

### 11.3 The Proxy That Cached a Stale Connection After Failover
- **What happens:** Primary DB fails over to replica — application connection pool still has connections pointing at the old primary's IP — those connections get `connection refused` — pool does not re-resolve DNS — application errors until connections are recycled
- **Real pattern:** Any application that caches DB connections across a failover event
- **Scale trigger:** Happens on every failover — frequency depends on your HA setup
- **Symptoms:** Application errors immediately after failover, errors stop as old connections are recycled and new ones open, partial functionality loss during transition
- **Solution:** Use DNS-based failover with a short TTL; set `connect_timeout` and `keepalives_idle` to detect dead connections quickly; use PgBouncer or ProxySQL as a proxy that handles re-routing on failover; set `db.SetConnMaxLifetime` to force connection recycling
- **Lesson:** Connection pools cache hostnames at connection time — failover requires either a proxy layer or aggressive connection recycling to re-resolve DNS

### 11.4 The Pool That Was Too Large for the DB
- **What happens:** Application pool is set to 100 connections per service instance × 20 service instances = 2,000 connections to one PostgreSQL — PostgreSQL defaults to 100 `max_connections` — 1,900 connections refused — chaos
- **Real pattern:** Each team sets their own pool size without a global connection budget
- **Scale trigger:** As the number of service instances scales, total connections scale too
- **Symptoms:** `FATAL: sorry, too many clients already`, services unable to connect, connection errors under load
- **Solution:** Central connection budget: `max_connections = sum of all pool sizes across all instances`; use PgBouncer to multiplex many application connections into fewer backend connections; set `max_connections` on PostgreSQL higher but accept the RAM cost
- **Lesson:** Connection budget must be managed at the system level, not per-service — every team's pool size is a system-wide resource claim

---

## Part 12 — MVCC and Vacuum Failure Cases

### 12.1 The Transaction ID Wraparound Emergency
- **What happens:** PostgreSQL uses 32-bit transaction IDs — they wrap around after ~2.1 billion transactions — without regular `VACUUM FREEZE`, PostgreSQL shuts down all writes to prevent data corruption, showing: `ERROR: database is not accepting commands to avoid wraparound data loss`
- **Real pattern:** High-write databases where autovacuum cannot keep up, or autovacuum is disabled
- **Scale trigger:** Approaches gradually over months — invisible until it's an emergency
- **Symptoms:** `pg_database.datfrozenxid` age approaches 2.1 billion, then PostgreSQL enters emergency mode — read-only until manually vacuumed
- **Solution:** Monitor `age(datfrozenxid)` for every database — alert at 500M, emergency at 1.5B; tune `autovacuum_freeze_max_age`; run manual `VACUUM FREEZE` proactively on old tables
- **Lesson:** Transaction ID wraparound is a uniquely PostgreSQL failure mode that shuts your database down — monitor it as a critical metric at all times

### 12.2 The Autovacuum vs Long Transaction Standoff
- **What happens:** An analytics query holds an open transaction for 6 hours — autovacuum cannot advance `xmin` past this transaction's snapshot — dead tuples from the last 6 hours cannot be reclaimed — table bloat accumulates — index bloat accumulates
- **Real pattern:** Mixed OLTP + OLAP on the same PostgreSQL instance — analytics transactions are long, OLTP generates constant dead tuples
- **Scale trigger:** One long transaction can block vacuum for its entire duration regardless of table size
- **Symptoms:** `pg_stat_user_tables.n_dead_tup` climbs during the long transaction, table size grows without new inserts, `pg_stat_activity` shows `idle in transaction` with old `xact_start`
- **Solution:** Route OLAP queries to a read replica; set `idle_in_transaction_session_timeout`; separate OLTP and OLAP workloads into different databases; use `statement_timeout` to kill runaway analytics queries
- **Lesson:** A single long-running transaction blocks vacuum for its entire duration — OLTP and OLAP must be separated at the architecture level

### 12.3 The Hot Table That Autovacuum Cannot Keep Up With
- **What happens:** A very high-write table (`events`, `sessions`, `clicks`) generates millions of dead tuples per hour — autovacuum runs but finishes one pass just as another is needed — bloat grows continuously — queries slow over time
- **Real pattern:** Event tracking tables, audit logs, session stores — any table with high update/delete churn
- **Scale trigger:** When write rate exceeds autovacuum's throughput
- **Symptoms:** `n_dead_tup` stays high despite autovacuum running, table size much larger than live data suggests, autovacuum always running on this one table
- **Solution:** Tune autovacuum specifically for high-write tables: `ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_cost_delay = 2)`; increase `autovacuum_max_workers`; use partitioning so autovacuum runs per partition
- **Lesson:** Autovacuum has a global throughput limit — high-write tables need per-table autovacuum tuning, not just default settings

### 12.4 The Bloated Table That Could Not Be Reclaimed Online
- **What happens:** A table has 90% dead tuples (from a bulk delete) — `VACUUM` reclaims the space logically but does not shrink the file on disk — `pg_total_relation_size` stays the same — disk is still full
- **Real pattern:** After a large DELETE or purge operation, the table size does not decrease
- **Scale trigger:** Depends on the size of the deleted data — a 500GB table after deleting 400GB of rows still occupies 500GB on disk
- **Solution:** `VACUUM FULL` (rewrites the table, takes exclusive lock — not suitable for production); `pg_repack` (rewrites online without exclusive lock); partition and DROP old partitions (instant, no vacuum needed)
- **Lesson:** `VACUUM` marks space as reusable but does not return it to the OS — only `VACUUM FULL` or `pg_repack` physically shrinks the table

### 12.5 The Bloat From UPDATE-Heavy Workflows
- **What happens:** Every `UPDATE` in PostgreSQL writes a new version of the row and marks the old version as dead — a table with 1M rows that is updated 100 times each becomes a 100M row physical file with 99% dead tuples
- **Real pattern:** Any table where rows are updated frequently — user profiles, order status, session data
- **Scale trigger:** Accumulates with every UPDATE — proportional to update frequency × row count
- **Symptoms:** Table size far exceeds logical data size, slow scans because dead tuples must be skipped, high I/O
- **Solution:** Use HOT updates (Heap-Only Tuple) — PostgreSQL can do HOT updates when the updated columns are not indexed and there is free space on the page (`fillfactor < 100`); set `fillfactor = 70` for frequently-updated tables to leave room for HOT updates
- **Lesson:** Every UPDATE in PostgreSQL is a delete + insert — high-update tables need aggressive vacuuming and `fillfactor` tuning to stay healthy

---

## Part 13 — JSON and Semi-Structured Data Failure Cases

### 13.1 The JSONB Column That Became a Query Graveyard
- **What happens:** All "flexible" attributes stored in a JSONB column — `WHERE data->>'status' = 'active' AND data->>'country' = 'BD'` — no GIN index on the JSONB column — every query is a full table scan through the JSON
- **Real pattern:** "Let's use JSONB for flexibility" without thinking about query patterns
- **Scale trigger:** Instant on large tables — JSONB without an index is always a seq scan
- **Symptoms:** Full sequential scans on JSON attribute queries, slow filtering on JSONB fields, EXPLAIN shows Seq Scan with Filter on JSON fields
- **Solution:** GIN index on the JSONB column for containment queries (`@>` operator); expression index on specific paths (`CREATE INDEX ON users ((data->>'status'))`); extract frequently-queried JSONB fields into proper typed columns
- **Lesson:** JSONB without a GIN index is a full table scan — every JSONB column used in WHERE needs an index

### 13.2 The JSONB Document That Grew Without Bound
- **What happens:** A JSONB column accumulates data over time — `metadata` JSONB starts at 100 bytes, grows to 500KB per row as the application appends to it — row size bloats — table bloats — queries that fetch the column are slow because of I/O
- **Real pattern:** Appending to a JSONB array column on every event, growing audit trails in JSONB
- **Scale trigger:** Grows with every append — tolerable early, catastrophic at scale
- **Symptoms:** Row size in `pg_stat_user_tables.n_live_tup` × average row size reveals huge average row, slow queries on the table even with indexes
- **Solution:** Never append to JSONB as a growing array — use a separate child table for growing lists; TOAST storage handles large JSONB but incurs extra I/O; cap JSONB document size at the application layer
- **Lesson:** JSONB is for semi-structured attributes, not for growing arrays — use a proper child table for one-to-many relationships

### 13.3 The MongoDB Document That Exceeded 16MB
- **What happens:** An array field within a MongoDB document grows without bound — MongoDB has a hard 16MB document size limit — write fails with `document too large` — the document that was working fine yesterday suddenly cannot be written to
- **Real pattern:** Embedding an unbounded array (comments, events, log entries) inside a parent document
- **Scale trigger:** Happens when the embedded array exceeds 16MB — often sudden after growing slowly for months
- **Symptoms:** `BSONObjectTooLarge` error on write, only for documents that have grown large, data loss if the application swallows the error
- **Solution:** Never embed unbounded arrays in MongoDB — use referencing (separate collection with `parent_id`) for any array that can grow without bound; enforce a maximum array size at the application layer before writing
- **Lesson:** Embedding is MongoDB's power and its trap — embed only when the child count is bounded and small

### 13.4 The Elasticsearch Dynamic Mapping Field Explosion
- **What happens:** Elasticsearch dynamic mapping creates a new indexed field for every new JSON key — a log pipeline sends logs with thousands of unique field names (request headers, user agents, dynamic keys) — the mapping grows to 50,000 fields — cluster runs out of JVM heap — nodes crash
- **Real pattern:** Unstructured log ingestion, multi-tenant data where each tenant has unique field names
- **Scale trigger:** Each unique field name adds memory overhead — grows unboundedly without mapping constraints
- **Symptoms:** Elasticsearch nodes running out of memory and crashing, `Limit of total fields [1000] in index exceeded` error, cluster instability
- **Solution:** Disable dynamic mapping (`"dynamic": "strict"`); pre-define the mapping before indexing; use `keyword` type for low-cardinality fields, `text` only for full-text search fields; use flattened type for dynamic key-value data
- **Lesson:** Elasticsearch's dynamic mapping is a convenience for development and a disaster for production — always define mappings explicitly

### 13.5 The Deep Nested JSONB Query Performance Cliff
- **What happens:** JSONB column has deeply nested structure — `data->'address'->'coordinates'->>'lat'` — each `->` operator requires parsing the entire JSONB blob — a five-level deep access is 5× as expensive as a one-level access — queries against nested fields are slow even with expression indexes
- **Real pattern:** Over-structured JSONB that mirrors complex object hierarchies from application code
- **Scale trigger:** Performance degrades with both nesting depth and result set size
- **Solution:** Flatten JSONB structures — prefer `data->>'lat'` over `data->'address'->'coordinates'->>'lat'`; extract frequently-queried nested fields into proper columns; store pre-flattened versions of deeply nested data
- **Lesson:** JSONB nesting depth has a performance cost — flatten your JSONB schemas for frequently-queried fields

---

## Part 14 — Time-Series and Append-Heavy Failure Cases

### 14.1 The Time-Series Table That Never Got Partitioned
- **What happens:** `events` table grows to 2 billion rows with no partitioning — a data retention job runs `DELETE FROM events WHERE created_at < NOW() - INTERVAL '90 days'` — deletes 500 million rows in a single operation — locks, bloat, and hours of autovacuum follow
- **Real pattern:** Any append-only time-series table without partitioning by time
- **Scale trigger:** Gets worse with every passing day as more data accumulates
- **Symptoms:** Data retention job runs for hours, causes massive I/O and vacuum load, table never truly shrinks
- **Solution:** Partition by time range from day one — `PARTITION BY RANGE (created_at)` with monthly or weekly partitions; drop old partitions with `DROP TABLE events_2023_01` — instant, no vacuum needed, no locks on other partitions
- **Lesson:** A time-series table without time-based partitioning is a retention and performance disaster waiting to happen — add partitioning before you have data, not after

### 14.2 The Write Tsunami on Midnight Partition Switch
- **What happens:** Partitioned time-series table switches to a new partition at midnight — all writes that were going to the old partition now go to the new one — the new partition has no cached pages, cold indexes, no autovacuum history — first 10 minutes after midnight are slow as the new partition warms up
- **Real pattern:** Any partitioned time-series system with high midnight traffic
- **Scale trigger:** Happens every time a partition switch occurs — daily for daily partitions, monthly for monthly
- **Symptoms:** Latency spike exactly at midnight (or whenever partitions roll over), first queries to the new partition are slow, B-Tree index pages need to be loaded fresh
- **Solution:** Pre-create partitions in advance; warm new partitions by writing a few rows ahead of time; switch partitions during lowest traffic hours; pre-warm index pages with a background read of the new partition
- **Lesson:** Partition switches are mini cold-start events — plan for them as scheduled latency spikes

### 14.3 The Forgotten Index on the Time Column
- **What happens:** Time-series table has all the right indexes on user_id, event_type etc. — but no index on `created_at` itself — `WHERE created_at > NOW() - INTERVAL '1 hour'` does a full sequential scan of the entire multi-billion row table
- **Real pattern:** Developers index the "business columns" and forget the time column that is always in the WHERE clause
- **Scale trigger:** Gets exponentially worse as the table grows
- **Solution:** Always index the timestamp column on a time-series table; for partitioned tables, partition pruning replaces the index for partition-aligned queries; BRIN index on the timestamp for large append-only tables (very small, very effective for sequential data)
- **Lesson:** The time column is the most commonly queried column in a time-series table — it must always be indexed or prunable

### 14.4 The High-Frequency Insert That Fragmented All Indexes
- **What happens:** 100,000 inserts per second to a time-series table with 8 indexes — each insert updates all 8 indexes — B-Tree pages split constantly — index fragmentation grows — read performance degrades as indexes become 3–4× their logical size
- **Real pattern:** High-ingest IoT, event tracking, financial tick data
- **Scale trigger:** Proportional to insert rate × number of indexes
- **Symptoms:** Index size much larger than data size, read latency increases over time, high write I/O
- **Solution:** Minimize indexes on high-write tables — only the essential ones; use BRIN indexes instead of B-Tree for sequentially-inserted data (BRIN is 1/1000th the size); batch inserts to reduce B-Tree split frequency; use columnar storage (TimescaleDB compression) for time-series data
- **Lesson:** Every index on a high-write table is a tax on every write — minimize indexes, use appropriate index types for the access pattern

---

## Part 15 — Multi-Tenancy Failure Cases

### 15.1 The Tenant Data Leak From Missing WHERE Clause
- **What happens:** A query that should filter by `tenant_id` is accidentally written without it — `SELECT * FROM orders` returns all tenants' orders — one tenant sees another tenant's data
- **Real pattern:** Shared-schema multi-tenancy where every query must include `WHERE tenant_id = ?` — easy to forget, catastrophic when forgotten
- **Scale trigger:** Happens on the first query missing the tenant filter — not a scale issue but a correctness issue
- **Symptoms:** Tenant reports seeing other tenants' data — security incident, potential regulatory violation
- **Solution:** Use PostgreSQL Row-Level Security (RLS) — enforce tenant filtering at the DB level so even a query without `WHERE tenant_id` is automatically filtered; never rely solely on application-level tenant filtering
- **Lesson:** Application-level tenant filtering is a disaster waiting to happen — enforce tenant isolation at the database level with RLS

### 15.2 The Noisy Neighbor Tenant Destroying Performance for All
- **What happens:** One tenant runs a huge report query — `SELECT * FROM orders WHERE tenant_id = 1 AND created_at BETWEEN ...` returns 50 million rows — saturates DB CPU and I/O — all other tenants experience degraded performance
- **Real pattern:** Shared-DB multi-tenancy with no per-tenant resource limits
- **Scale trigger:** One large tenant with an expensive operation is enough
- **Symptoms:** All tenants slow simultaneously, DB CPU spikes, identified as one tenant's query via `pg_stat_activity`
- **Solution:** Per-tenant query timeout (`SET statement_timeout`); connection limits per tenant; route large tenants to dedicated DB instances; separate OLAP (reports) from OLTP (transactions) per tenant; per-tenant resource groups (pgBouncer `pool_mode = statement`)
- **Lesson:** In shared multi-tenancy, one misbehaving tenant can ruin the experience for all others — resource isolation is mandatory, not optional

### 15.3 The Schema Migration That Locked Every Tenant Simultaneously
- **What happens:** Schema migration runs on the shared multi-tenant table — `ALTER TABLE orders ADD COLUMN discount NUMERIC` — locks the table for 5 minutes — all tenants are unable to write orders for 5 minutes simultaneously
- **Real pattern:** Shared-schema multi-tenancy where all tenants share the same tables
- **Scale trigger:** Any DDL on a shared table affects all tenants at once
- **Solution:** Online migration tools (pg_repack, gh-ost); add columns as nullable first (no rewrite in PostgreSQL 11+); schedule migrations during lowest global traffic window; consider schema-per-tenant for large enterprise tenants who have SLA requirements
- **Lesson:** Shared-schema multi-tenancy means a schema migration is a simultaneous event for all tenants — the blast radius is the entire customer base

### 15.4 The Tenant Whose Index Was Dominated by Other Tenants
- **What happens:** Index on `(tenant_id, created_at)` — one tenant has 98% of all rows — the index is effectively the one-tenant index — all other tenants' queries must scan through the dominant tenant's index entries to find their data
- **Real pattern:** Shared index in multi-tenant system with a large imbalance in tenant data size
- **Scale trigger:** As the dominant tenant grows, other tenants' queries slow proportionally
- **Solution:** Separate physical tables or schemas per large tenant; partial indexes per tenant for medium-sized tenants; shard by `tenant_id` when tenant data sizes diverge significantly
- **Lesson:** Shared indexes with unequal tenant data distribution are unfair to small tenants and inefficient for large ones

---

## Part 16 — Analytics and Reporting Failure Cases

### 16.1 The Analytics Query That Killed the Production OLTP Database
- **What happens:** A business analyst runs a report: `SELECT user_id, COUNT(*), SUM(amount) FROM orders GROUP BY user_id ORDER BY SUM(amount) DESC` on the production DB — scans 500M rows — saturates I/O — OLTP queries for real users timeout
- **Real pattern:** Any analytics query run against the primary OLTP database
- **Scale trigger:** One sufficiently large analytics query is enough to impact all other users
- **Symptoms:** All user-facing queries slow simultaneously, DB CPU and I/O maxed, the culprit query visible in `pg_stat_activity`
- **Solution:** Route all analytics to a read replica with `statement_timeout = '60s'`; move analytics to a dedicated OLAP system (ClickHouse, BigQuery); use CDC to keep the OLAP system near real-time; implement a query queue for analytics with a separate connection pool
- **Lesson:** Running analytics on your production OLTP database is a question of when it will cause an outage, not if

### 16.2 The Materialized View That Blocked During Refresh
- **What happens:** `REFRESH MATERIALIZED VIEW` takes an exclusive lock on the view — no reads from the view are possible during refresh — the refresh takes 20 minutes — the UI that depends on the view is broken for 20 minutes
- **Real pattern:** Any materialized view that takes significant time to refresh
- **Scale trigger:** Proportional to the amount of data the view aggregates
- **Symptoms:** UI shows errors or empty data during refresh window, `pg_stat_activity` shows lock wait on the matview
- **Solution:** `REFRESH MATERIALIZED VIEW CONCURRENTLY` — allows reads during refresh but requires a unique index on the view and takes longer; schedule refreshes during low-traffic windows; move to incremental refresh with event-driven updates
- **Lesson:** `REFRESH MATERIALIZED VIEW` without `CONCURRENTLY` is a read outage — always use CONCURRENTLY in production

### 16.3 The Dashboard That Ran 47 Queries per Page Load
- **What happens:** A dashboard page makes 47 separate DB queries to populate different widgets — total query time adds up to 8 seconds — database connection pool exhausted during peak dashboard usage
- **Real pattern:** Dashboard built incrementally where each widget was added as an independent query
- **Scale trigger:** Acceptable with 10 users, catastrophic with 1,000 simultaneous dashboard users
- **Symptoms:** Dashboard slow for all users during peak hours, connection pool exhausted, DB CPU high from many small queries
- **Solution:** Consolidate queries into fewer, broader queries; pre-aggregate dashboard metrics into a summary table updated periodically; cache dashboard query results in Redis with appropriate TTL; use a single API endpoint that returns all dashboard data
- **Lesson:** A dashboard with many small queries is indistinguishable from an N+1 query problem at the page level — aggregate at the data layer, not the UI layer

### 16.4 The Report That Selected Into a Temp Table and Forgot to DROP It
- **What happens:** An analytics query creates a temp table, fills it with data, queries it — the temp table is not dropped — the transaction is kept open — the temp table holds locks — the session eventually disconnects — but temp table persists until session ends — in a connection pool, the session never truly "ends"
- **Real pattern:** Analytics scripts using temp tables inside pooled connections
- **Scale trigger:** Accumulates as more reports are run — temp table space fills up
- **Symptoms:** `pg_temp` namespace growing, temp tables from old sessions still existing, disk space consumed by orphaned temp tables
- **Solution:** Always `DROP TABLE IF EXISTS temp_name` before creating; use `ON COMMIT DROP` for temp tables within transactions; use CTEs instead of temp tables where possible; don't use temp tables inside pooled connections
- **Lesson:** Temp tables in a connection pool outlive the "logical" session — always clean up explicitly

---

## Part 17 — Event Sourcing and Queue Failure Cases

### 17.1 The Event Store That Was Never Pruned
- **What happens:** Event sourcing stores every event forever — 3 years later the events table has 50 billion rows — replaying an aggregate's events to get current state requires reading 10,000 events per aggregate — every write requires reading thousands of events first
- **Real pattern:** Event sourcing implemented without a snapshotting strategy
- **Scale trigger:** Grows proportionally to write volume over time — becomes painful after 6–12 months
- **Symptoms:** Aggregate load time grows linearly with the age of the aggregate, write latency grows as the event count grows, disk consumed by historical events never needed after projection rebuild
- **Solution:** Snapshots — periodically checkpoint the current state of an aggregate so replay starts from the snapshot, not from event 0; archive old events to cold storage after they are no longer needed for replay; snapshot threshold (e.g., rebuild snapshot every 100 events)
- **Lesson:** Event sourcing without snapshots is O(events) for every aggregate load — implement snapshots from day one

### 17.2 The Projection That Got Out of Sync With No Way to Rebuild
- **What happens:** A bug in projection code processed some events incorrectly — the read model is wrong — the team wants to rebuild the projection from scratch — but the event store is missing events from a 3-month window due to a retention policy that deleted them
- **Real pattern:** Event sourcing with event retention policy that deletes events before projections are verified
- **Scale trigger:** Discovered when a rebuild is needed — too late
- **Solution:** Never delete events that have not been confirmed as processed by all projections; version your projections so you know which events have been successfully applied; keep events at minimum until all projections built from them have been archived
- **Lesson:** Events are the source of truth in event sourcing — deleting them before all projections are confirmed correct is permanent data loss

### 17.3 The Kafka Consumer That Committed Offsets Before Processing
- **What happens:** Consumer reads message → immediately commits offset → processes message → processing fails — the offset is already committed — the message is silently lost — at-least-once delivery becomes at-most-once
- **Real pattern:** Incorrect Kafka consumer implementation — offset committed before processing is confirmed
- **Scale trigger:** One failure event is enough to lose a message permanently
- **Symptoms:** Messages processed count is lower than messages produced count, silent data loss discovered only during reconciliation
- **Solution:** Commit offsets only after successful processing; use manual offset commit with explicit acknowledgment; implement idempotent consumers so re-processing is safe; monitor consumer lag and production/consumption rates
- **Lesson:** Offset commit order is not optional — commit after processing, never before

### 17.4 The Outbox Table That Was Never Cleaned Up
- **What happens:** Outbox pattern writes events to an `outbox` table for reliable publishing — the outbox publisher reads and publishes events then marks them as `processed` — but never deletes them — the outbox table grows to hundreds of millions of rows — the publisher scan gets slower and slower
- **Real pattern:** Outbox implementation without a cleanup/archival step
- **Scale trigger:** Grows with every event published — becomes a problem after weeks or months of high-volume operation
- **Symptoms:** Outbox publisher scan takes longer each day, `outbox` table is the largest in the DB, write latency on the outbox table increases due to bloat
- **Solution:** Delete or archive processed outbox rows after a retention window (e.g., delete `WHERE processed = true AND created_at < NOW() - INTERVAL '7 days'`) in a background job with batching; partition the outbox table by date to enable fast partition drops
- **Lesson:** The outbox table is a queue, not an archive — clean it up aggressively or it becomes a bottleneck

### 17.5 The RabbitMQ Queue That Grew to 10 Million Messages
- **What happens:** Consumer is deployed with a bug and crashes — the queue fills while the consumer is down — 10 million messages accumulate — consumer is fixed and redeployed — tries to process 10 million messages at once — overwhelms the downstream DB with write load — consumer crashes again — cycle repeats
- **Real pattern:** Any queue-based system where