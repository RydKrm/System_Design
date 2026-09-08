# Database Case Studies & Failure Cases — Complete Study List

> Real incidents, real architectures, and real trade-offs from the companies that built systems at the largest scales on earth. Every case here teaches something you cannot learn from a textbook alone. Study the failure cases as hard as the success cases — disasters are the best teachers.

---

## How to Study a Case

For every case, ask these six questions:

1. **What was the scale?** — Users, TPS, data volume, regions
2. **What broke or what problem needed solving?**
3. **What was the root cause?** — Schema, indexing, locking, replication, capacity
4. **What was the solution?** — Migration, re-architecture, new tool
5. **What trade-off was accepted?** — Consistency, availability, complexity, cost
6. **What would you do differently from day one?**

---

## Part 1 — Scaling Failure Case Studies

### 1.1 The N+1 Query Disaster

- **What happens:** Application issues one query to fetch N parent rows, then N separate queries for children — total N+1 database round trips
- **Real pattern:** Rails ActiveRecord default lazy loading on associations
- **Scale trigger:** Works fine at 100 rows, catastrophic at 10,000 rows
- **Symptoms:** DB CPU spikes, slow page loads, connection pool exhaustion
- **Solution:** Eager loading (JOIN or IN-clause subquery), DataLoader pattern (GraphQL), query batching
- **Lesson:** Never let the ORM decide how many queries to run

### 1.2 The OFFSET Pagination Collapse

- **What happens:** `SELECT * FROM posts ORDER BY created_at DESC OFFSET 900000 LIMIT 20` requires scanning and discarding 900,000 rows every time
- **Real pattern:** Any API using page=N pagination on a large table
- **Scale trigger:** Works fine on page 1–10, falls apart after page 1,000
- **Symptoms:** Queries that take milliseconds on page 1 take seconds on page 10,000
- **Solution:** Keyset (cursor) pagination — `WHERE id < :last_seen_id ORDER BY id DESC LIMIT 20`
- **Lesson:** OFFSET is O(offset) — it never gets better, only worse as the table grows

### 1.3 The COUNT(*) Bottleneck

- **What happens:** `SELECT COUNT(*) FROM orders WHERE status = 'pending'` does a full index scan on a 500M row table to return a single number
- **Real pattern:** Showing "1,432,891 results" on a search page
- **Scale trigger:** Fast on small tables, minutes on billion-row tables
- **Solution:** Pre-computed counter table, Redis INCR counter, HyperLogLog for approximation, or simply removing the count
- **Lesson:** Exact counts are expensive at scale — decide if you need exact or approximate

### 1.4 The Hot Row Bottleneck

- **What happens:** Every request in the system updates the same single row — a global counter, a shared seat map, a single inventory record
- **Real pattern:** `UPDATE seats SET available = available - 1 WHERE event_id = 1` under 10,000 concurrent users
- **Symptoms:** Lock wait timeouts, serialization failures, massive latency spike
- **Solution:** Sharded counters (N rows instead of 1, SUM to read), queue-based serialization, optimistic locking with retry, pre-allocation
- **Lesson:** Any single row updated by many concurrent writers is a bottleneck regardless of how fast the hardware is

### 1.5 The Missing Foreign Key Index

- **What happens:** `DELETE FROM users WHERE id = 123` causes a full sequential scan on the `orders` table to check referential integrity — because there is no index on `orders.user_id`
- **Real pattern:** Extremely common in production schemas — DBAs forget to index FK columns
- **Scale trigger:** Instant on small tables, minutes on multi-million row tables
- **Symptoms:** Slow DELETEs, lock escalation, cascading timeouts
- **Solution:** Index every foreign key column
- **Lesson:** Foreign keys without indexes are hidden performance bombs

### 1.6 The Unbounded IN Clause

- **What happens:** `SELECT * FROM products WHERE id IN (1, 2, 3, ..., 50000)` — the IN list grows without limit as the application passes more IDs
- **Real pattern:** Caching layers passing back large ID sets to the DB
- **Scale trigger:** 10 IDs is fine, 50,000 IDs crashes the query planner
- **Solution:** Temporary table + JOIN, batching into chunks of 500–1000, restructuring the query
- **Lesson:** Every variable-length list passed to the DB needs an upper bound

### 1.7 The Implicit Type Cast Index Kill

- **What happens:** Column `user_id` is `BIGINT`, but the application passes a string `'123'` — PostgreSQL cannot use the index because it must cast every row
- **Real pattern:** ORM sends wrong type, API accepts string and passes to query
- **Scale trigger:** Invisible on small tables, catastrophic on large ones — plan changes from Index Scan to Seq Scan silently
- **Symptoms:** Queries suddenly 100× slower after a code change that "doesn't touch the DB"
- **Solution:** Always use correct types in parameterized queries; use `pg_stat_statements` to detect plan regressions
- **Lesson:** Type mismatches silently kill indexes — EXPLAIN ANALYZE after every query change

### 1.8 The Vacuum Bloat Explosion (PostgreSQL)

- **What happens:** A long-running transaction prevents VACUUM from reclaiming dead tuples — table and index bloat grows until queries slow down dramatically
- **Real pattern:** Analytics job holds an open transaction for hours while OLTP writes accumulate dead rows
- **Scale trigger:** Happens faster on high-write tables
- **Symptoms:** Table size grows without new data, query plans change, disk fills up
- **Solution:** Tune autovacuum aggressiveness, kill long-running transactions, monitor `pg_stat_user_tables.n_dead_tup`, use `pg_repack` for live table rebuilding
- **Lesson:** In PostgreSQL, vacuum health is as important as index health

### 1.9 The Connection Pool Exhaustion

- **What happens:** Application spawns too many threads/goroutines, each opening a DB connection — PostgreSQL hits `max_connections`, new connections fail
- **Real pattern:** Go services without a connection pool limit, or services that open a connection per request
- **Scale trigger:** Works fine at 10 RPS, fails at 1,000 RPS
- **Solution:** PgBouncer in transaction mode, application-level pool (pgx pool, sqlx), pool sizing formula: `connections = (core_count * 2) + effective_spindle_count`
- **Lesson:** DB connections are not free — each one consumes 5–10MB of RAM on PostgreSQL

### 1.10 The Cascading Slow Query

- **What happens:** One slow query holds locks on rows — subsequent queries queue behind it — connection pool fills with waiting queries — application becomes unresponsive
- **Real pattern:** A missing index causes a 30-second query; 1,000 requests queue behind it before the first one finishes
- **Solution:** Statement timeout, lock timeout, query timeout at the application level; fast-path circuit breaker
- **Lesson:** One bad query can take down the entire application — always set timeouts

---

## Part 2 — Replication and High Availability Failures

### 2.1 The Replication Lag Read Anomaly

- **What happens:** User creates an account (write to primary), is immediately redirected to their dashboard (read from replica) — replica hasn't caught up — user sees "account not found"
- **Real pattern:** Any read-after-write on a replicated system
- **Scale trigger:** Happens more frequently as replica lag increases under write load
- **Solution:** Read-your-writes consistency — route reads for the creating user to the primary for a short window, or use session-level synchronous commit
- **Lesson:** Replication lag is not just a performance metric — it has user-visible correctness consequences

### 2.2 The Split-Brain Disaster

- **What happens:** Network partition causes both the primary and a replica to believe they are the leader — both accept writes — data diverges — when the partition heals, data must be reconciled or one side's writes are lost
- **Real pattern:** Poorly configured automatic failover in MySQL, Cassandra, or Redis without quorum
- **Solution:** Fencing tokens, STONITH (Shoot The Other Node In The Head), quorum-based election, epoch numbers to reject stale leaders
- **Lesson:** Automatic failover without fencing is worse than no failover — it can corrupt your data

### 2.3 The Replica Promotion Data Loss

- **What happens:** Primary crashes with 30 seconds of replication lag — replica is promoted — those 30 seconds of writes are gone — downstream systems already processed those events
- **Real pattern:** Async replication + aggressive automatic failover
- **Scale trigger:** Depends on write volume and acceptable RPO
- **Solution:** Semi-synchronous replication, synchronous replica for zero-data-loss failover, replication slots to track consumed WAL, Kafka as durable write-ahead log before PostgreSQL
- **Lesson:** Asynchronous replication + automatic failover = RPO > 0. Know your RPO and design for it.

### 2.4 The Replication Slot Disk Fill

- **What happens:** PostgreSQL replication slot holds WAL files until the consumer catches up — consumer is slow or offline for hours — WAL accumulates — disk fills — PostgreSQL crashes
- **Real pattern:** Debezium CDC consumer goes offline; logical replication slot holds everything
- **Solution:** `max_slot_wal_keep_size`, monitoring slot lag, dropping slots when consumers are offline, designing consumers to catch up quickly
- **Lesson:** Replication slots are a disk time-bomb if not monitored

### 2.5 The Failover that Made Things Worse

- **What happens:** Primary slows down under load — health check sees timeouts — failover is triggered — replica is promoted — now the new primary is also under the same load — another failover — ping-pong of promotions
- **Real pattern:** Health check threshold too aggressive, not distinguishing between slowness and failure
- **Solution:** Distinguish performance degradation from failure — only fail over for true unavailability; backoff on failover retries; human approval for cascading failures
- **Lesson:** Automated failover without careful thresholds causes more downtime than it prevents

### 2.6 The Logical Replication Schema Mismatch

- **What happens:** Schema change on the publisher (add a NOT NULL column) before the subscriber schema is updated — logical replication breaks silently or with errors
- **Real pattern:** Zero-downtime migration done incorrectly in a replicated system
- **Solution:** Expand-contract migration — add column as nullable on subscriber first, then make NOT NULL on publisher, then enforce on subscriber
- **Lesson:** In logical replication, schema changes must be applied in the right order — subscriber before publisher for additive changes

---

## Part 3 — Sharding Failure Case Studies

### 3.1 The Bad Shard Key (Hotspot)

- **What happens:** Sharding by `created_at` (time) means all new writes go to the latest shard — 95% of load hits one shard while others are idle
- **Real pattern:** Time-series data sharded by timestamp, user activity sharded by signup date
- **Solution:** Hash-based sharding, compound shard key with high-cardinality component, write sharding (adding a random suffix to the key)
- **Lesson:** Any monotonically increasing shard key creates a hot shard — it is the most common sharding mistake

### 3.2 The Celebrity (Whale) Problem

- **What happens:** A shard key based on `user_id` works for 99% of users — but one user (a celebrity with 100M followers) generates 1,000× the traffic of a normal user, overwhelming their shard
- **Real pattern:** Twitter's early sharding by user_id, Instagram's similar problem
- **Solution:** Special-case hot accounts (fanout-on-read instead of fanout-on-write), dedicated shards for celebrity accounts, application-level detection and rerouting
- **Lesson:** Data access is never uniform — always plan for outliers

### 3.3 The Cross-Shard JOIN

- **What happens:** After sharding `users` by `user_id` and `orders` by `order_id`, a query like `SELECT users.name, orders.total FROM users JOIN orders ON users.id = orders.user_id` now requires fetching data from two different shards and joining in the application
- **Real pattern:** Almost every real application eventually needs to query across sharding boundaries
- **Solution:** Collocate related data on the same shard (shard both users and orders by `user_id`), use denormalization to avoid the JOIN, use a separate analytics store for cross-shard queries
- **Lesson:** Choose the shard key that makes your most common JOINs local — cross-shard JOINs are expensive scatter-gather operations

### 3.4 The Reshard That Took Weeks

- **What happens:** Initial sharding into 4 shards was enough for year 1. Year 3, each shard is overloaded. Reshard to 16 shards requires moving 75% of all data while the system stays live.
- **Real pattern:** Airbnb, Shopify, and many others have gone through painful resharding
- **Solution:** Consistent hashing to minimize data movement, start with more shards than you need (over-shard early), virtual shards / logical shards that can be remapped without data movement
- **Lesson:** Resharding is extremely painful and disruptive — over-shard at the beginning; it costs almost nothing and saves years of pain

### 3.5 The Two-Phase Commit Across Shards

- **What happens:** A money transfer between two users on different shards requires a distributed transaction — 2PC is used — one shard goes down mid-commit — the transaction is stuck in an indeterminate state
- **Real pattern:** Any system that needs atomic operations across shards
- **Solution:** Design schema so most transactions are intra-shard; use Saga pattern for cross-shard workflows; use an event-driven outbox for eventual consistency
- **Lesson:** Cross-shard transactions require 2PC or Saga — 2PC is fragile, Saga is complex — the best solution is avoiding cross-shard transactions by design

---

## Part 4 — Real Company Architecture Case Studies

### 4.1 Instagram — From Single PostgreSQL to Sharded at Scale

- **Starting point:** Single PostgreSQL server, 2010
- **Problem:** 1M users in first month — single DB couldn't keep up
- **First scaling step:** Added read replicas for read traffic
- **Sharding decision:** Sharded by `user_id` — most queries are user-scoped
- **ID generation:** Custom Postgres function generating 64-bit IDs with shard embedded — globally unique without coordination
- **Key schema decisions:** Denormalized follower/following counts stored on user row (not computed), pre-generated feeds
- **Lesson learned:** Build ID generation that encodes the shard — saves routing complexity forever
- **Study:** Instagram Engineering Blog — "Sharding & IDs at Instagram"

### 4.2 Twitter — The Fanout Problem and Timeline Architecture

- **Problem:** When a user with 10M followers tweets, how do you deliver it to all 10M feeds?
- **First approach (fanout-on-write):** On every tweet, write to every follower's feed cache — works for normal users, breaks for celebrities
- **The celebrity exception:** Lady Gaga's tweet required 10M Redis writes — took too long
- **Solution:** Hybrid fanout — fanout-on-write for normal users, fanout-on-read for celebrity accounts (identify celebrity status at read time, merge in their recent tweets)
- **Database decisions:** Heavily Redis-dependent for timelines, MySQL for persistent storage, Manhattan (custom distributed DB) for tweet storage
- **Lesson learned:** One-size-fits-all fanout breaks at extremes — model outliers explicitly
- **Study:** Twitter Engineering Blog — "The Infrastructure Behind Twitter: Scale"

### 4.3 Uber — Schemaless (Document Store on MySQL)

- **Problem:** Frequent schema changes on a growing codebase — ALTER TABLE on large tables was too slow
- **Solution:** "Schemaless" — a document store built on top of MySQL
- **Design:** Rows contain a `body` BLOB column with serialized protobuf — schema is in the application, not the DB
- **Benefit:** Application-level schema evolution without DB migrations
- **Cost:** Loses relational guarantees, JOINs, and DB-level constraints — all enforced in application code
- **Later evolution:** Moved to more purpose-built stores per domain
- **Lesson learned:** Schemaless is a valid scaling tactic but moves complexity to the application — it is not free
- **Study:** Uber Engineering Blog — "Designing Schemaless, Uber Engineering's Scalable Datastore Using MySQL"

### 4.4 Airbnb — Data Migrations at Scale

- **Problem:** Migrating a column from VARCHAR to TEXT on a table with 500M rows — ALTER TABLE took 45 minutes and locked the table
- **Solution:** Online schema change with pt-online-schema-change — creates a shadow table, migrates data in batches, swaps atomically
- **Later problem:** pt-osc breaks foreign keys and triggers — moved to gh-ost (GitHub's Online Schema Transmogrifier)
- **Lesson learned:** At large scale, any ALTER TABLE must be treated as a production incident — always use an online migration tool
- **Study:** Airbnb Engineering Blog — "Online Schema Migrations at Scale"

### 4.5 Shopify — Multi-Tenant Sharding by Shop

- **Architecture:** Each shop (merchant) is a tenant — sharded by `shop_id`
- **Shard assignment:** Shops are assigned to pods — each pod is an independent MySQL cluster
- **Benefit:** Pod isolation — one shop's traffic or a schema change doesn't affect others
- **Schema migrations:** Run per-pod — can canary a migration on one pod before rolling to all
- **The pod concept:** Compute (Rails app), DB (MySQL primary+replicas), cache (Redis) all colocated per pod
- **Lesson learned:** Pod-based multi-tenant sharding gives both isolation and the ability to scale each dimension independently
- **Study:** Shopify Engineering Blog — "Shopify's Architecture to Handle the World's Biggest Flash Sales"

### 4.6 Discord — Switching from Cassandra to ScyllaDB to ClickHouse

- **Problem 1:** 100M+ messages in Cassandra — hot partitions, latency spikes, GC pauses from Java-based Cassandra
- **Solution 1:** Migrated to ScyllaDB (Cassandra-compatible, written in C++) — eliminated GC pauses, improved latency
- **Problem 2:** Message search and analytics on 4 trillion messages — Cassandra/ScyllaDB not suited for OLAP
- **Solution 2:** ClickHouse for message analytics — columnar storage, fast aggregations over billions of rows
- **Lesson learned:** The right database for OLTP writes is not the right database for OLAP reads — separate them
- **Study:** Discord Engineering Blog — "How Discord Stores Trillions of Messages"

### 4.7 Notion — Sharding Postgres by Workspace

- **Problem:** Single Postgres instance with millions of blocks (Notion's core data unit) — write throughput limit, long vacuum times, index bloat
- **Sharding decision:** Shard by `workspace_id` — all data for a workspace is colocated
- **Migration challenge:** Moving from one DB to N shards while staying live
- **Dual-write migration strategy:** Write to old DB and new sharded DB simultaneously, verify consistency, cut over reads, decommission old DB
- **Lesson learned:** Workspace-level sharding is the natural boundary for collaboration tools — all operations happen within one workspace
- **Study:** Notion Engineering Blog — "Sharding Postgres at Notion"

### 4.8 Figma — From Single Postgres to Horizontal Partitioning

- **Problem:** A single Postgres instance supporting millions of design files — disk and CPU exhaustion
- **Approach:** Vertical partitioning (splitting the DB by feature domain) before horizontal sharding
- **First split:** Separated the files database from the users database — reduced load on each
- **Second split:** Identified the largest tables and moved them to dedicated databases
- **Sharding:** Eventually sharded the files table by `file_id`
- **Lesson learned:** Vertical partitioning (splitting by domain) is often the right first step before horizontal sharding — simpler and buys significant headroom
- **Study:** Figma Engineering Blog — "How Figma's Multiplayer Technology Works"

### 4.9 Stack Overflow — Staying on SQL Server, Scaling Vertically

- **Approach:** Counter-narrative — Stack Overflow runs on a small number of very powerful SQL Server machines with careful query optimization
- **Scale:** 1.5 billion page views/month on a handful of servers
- **Key techniques:** Aggressive caching (Redis), query optimization, covering indexes, avoiding ORM-generated queries for hot paths
- **Philosophy:** Optimize the query before adding hardware; add hardware before re-architecting
- **Lesson learned:** Vertical scaling + expert query tuning can take you much further than most teams realize before sharding is necessary
- **Study:** "Stack Overflow: The Architecture" — Nick Craver's blog series

### 4.10 GitHub — Moving from MySQL to Vitess

- **Problem:** MySQL primary at GitHub handling millions of git operations — single-master write bottleneck
- **Solution:** Vitess — a sharding middleware for MySQL originally built at YouTube
- **What Vitess does:** Connection pooling, query routing, resharding, consistent backups, schema management
- **Migration:** Gradual — moved one table at a time behind Vitess without application changes
- **Lesson learned:** Middleware-based sharding lets you shard without rewriting the application — the trade-off is operational complexity
- **Study:** GitHub Engineering Blog — "Moving GitHub from MySQL to Vitess"

### 4.11 Pinterest — Time-Series Data at Scale with MySQL Sharding

- **Scale:** Billions of pins, hundreds of millions of users
- **Sharding design:** Sharded MySQL — shard key embedded in the ID (similar to Instagram)
- **ID format:** 64-bit ID = shard ID + type + local ID — can always route to the right shard by parsing the ID
- **Time-series problem:** Pin creation is time-series data — solved with hash sharding of users, not time-sharding of pins
- **Lesson learned:** Encode shard routing information in the ID itself — eliminates the need for a routing lookup table
- **Study:** Pinterest Engineering Blog — "Sharding Pinterest: How We Scaled Our MySQL Fleet"

### 4.12 LinkedIn — Espresso Document Store and Databus CDC

- **Problem:** LinkedIn's social graph and feed required both low-latency OLTP and change propagation to downstream systems
- **Solution 1:** Espresso — a document store built on MySQL, partitioned by member_id
- **Solution 2:** Databus — a CDC system that reads MySQL binlogs and publishes changes to consumers
- **Key innovation:** Databus predated Debezium and became the inspiration for many CDC systems
- **Lesson learned:** Change propagation via the DB transaction log (CDC) is more reliable than dual-writes from the application
- **Study:** LinkedIn Engineering Blog — "Espresso: LinkedIn's Operational Document Store"

### 4.13 Cloudflare — SQLite at the Edge (D1)

- **Problem:** Running distributed databases at 200+ edge locations globally with very low latency
- **Solution:** SQLite per edge node — no network round-trip to a central DB for reads
- **Write propagation:** Writes go to the primary, replicated to all edges asynchronously
- **Use case:** Read-heavy workloads where eventual consistency is acceptable
- **Lesson learned:** SQLite is not just for development — at the edge, its single-file, embedded nature is a feature
- **Study:** Cloudflare Blog — "D1: Our Distributed SQLite Database"

---

## Part 5 — Distributed Database Failure Cases

### 5.1 The Cassandra Tombstone Explosion

- **What happens:** Cassandra uses tombstones (deletion markers) instead of true deletes — over time, tombstones accumulate — compaction can't keep up — reads must scan through thousands of tombstones — latency degrades severely
- **Real pattern:** Time-series data with frequent deletes, TTL-expiring rows, soft-delete patterns
- **Trigger:** High-volume deletes or very high TTL churn rate
- **Symptoms:** Read timeouts, `TombstoneOverwhelmingException`, node pressure
- **Solution:** Avoid deletes where possible (use TTL instead), choose a compaction strategy (TWCS for time-series), set `gc_grace_seconds` correctly, monitor tombstone count per partition
- **Lesson:** In Cassandra, a delete is a write — designing for delete-heavy workloads requires completely different thinking than in SQL

### 5.2 The Cassandra Hot Partition

- **What happens:** One Cassandra partition receives vastly more reads/writes than others — that node becomes the bottleneck even though other nodes are idle
- **Real pattern:** Partition key based on `date` (all writes for today go to one partition), or `user_type` with a dominant category (90% of data has `type='free'`)
- **Solution:** Add a bucket or salt to the partition key, use time-window compaction strategy (TWCS), redesign partition key for higher cardinality
- **Lesson:** Cassandra partition design is the most important schema decision — a bad partition key makes the cluster unusable regardless of cluster size

### 5.3 The MongoDB Write Lock Contention (Pre-3.0)

- **What happens:** MongoDB prior to 3.0 used a database-level write lock — one write blocks all other writes to the same database — under concurrent write load, throughput collapses
- **Real pattern:** Historical MongoDB deployments, but pattern still relevant — any DB with coarse-grained locking
- **Solution:** MongoDB 3.0 introduced WiredTiger with document-level concurrency — upgrade and redesign write patterns
- **Lesson learned:** Understand the concurrency model of your database before committing to it

### 5.4 The DynamoDB Hot Key Throttling

- **What happens:** DynamoDB allocates read/write capacity units per partition — a single "hot" partition key exceeds its share of throughput — DynamoDB throttles requests to that partition even if aggregate throughput is within limits
- **Real pattern:** Leaderboard row, global config row, today's date as partition key
- **Solution:** Write sharding — append a random suffix (0–9) to the partition key, write to a random shard, read and SUM from all shards; use DAX (DynamoDB Accelerator) for hot reads
- **Lesson:** Distributed databases partition capacity too — a hot key can throttle you even when overall capacity is sufficient

### 5.5 The Elasticsearch Mapping Explosion

- **What happens:** Dynamic mapping in Elasticsearch automatically creates a new field for every new JSON key — a log ingestion pipeline sends logs with thousands of unique field names — the mapping grows to 50,000 fields — the cluster runs out of memory and crashes
- **Real pattern:** Unstructured log ingestion without strict schema, multi-tenant Elasticsearch where tenants define custom fields
- **Solution:** Disable dynamic mapping, use `index: false` for fields not needed for search, use nested objects with controlled mapping, pre-define the mapping before indexing
- **Lesson:** Elasticsearch's dynamic mapping is a trap for unstructured data — always define your mapping explicitly

### 5.6 The Redis Memory Eviction Cascade

- **What happens:** Redis fills up — eviction policy (allkeys-lru) starts evicting keys — evicted keys are cache misses — cache misses hit the DB — DB is overwhelmed — application slows down — more timeouts — cascading failure
- **Real pattern:** Underpowered Redis instance, sudden traffic spike, large key values without TTL
- **Solution:** Monitor Redis memory utilization with alerts at 70% and 85%, set TTL on all keys, size Redis for the working set plus 30% headroom, use Redis Cluster to scale memory horizontally
- **Lesson:** Redis running out of memory is not a Redis problem — it is a cache stampede waiting to happen at the DB layer

### 5.7 The Zookeeper Thundering Herd (Watch Storm)

- **What happens:** ZooKeeper is used for distributed coordination — all service instances register a watch on a znode — one event fires — all N instances simultaneously try to read the updated state — ZooKeeper is overwhelmed — coordination fails — distributed systems desynchronize
- **Real pattern:** Service discovery, leader election, distributed locks at scale
- **Solution:** Queue-based leader election (only the queue leader fires), exponential backoff on reconnect, reduce the number of watchers per znode
- **Lesson:** ZooKeeper is not designed for thousands of concurrent watchers — use Consul or etcd for service discovery at scale

---

## Part 6 — Consistency and Transaction Failure Cases

### 6.1 The Lost Update

- **What happens:** Two transactions read the same row, both compute a new value based on the old value, both write — one update is silently overwritten
- **Classic scenario:** `balance = 100`. Thread A reads 100, Thread B reads 100. Thread A writes 110. Thread B writes 90. Final balance is 90, but should be 90 + (110 - 100) + (90 - 100) = 90. Thread A's write is lost.
- **Real pattern:** Any read-modify-write operation under concurrent load
- **Solution:** `SELECT FOR UPDATE`, `UPDATE table SET val = val + delta` (atomic increment), optimistic locking with version column, database-level `check` constraint
- **Lesson:** Never read-compute-write under concurrency — always use atomic updates or locking

### 6.2 The Phantom Read Causing Double-Booking

- **What happens:** Two booking requests check availability at the same time — both see 1 seat available — both insert a booking — now the flight is overbooked
- **Real pattern:** Ticket booking, hotel reservation, inventory reservation, calendar scheduling
- **Solution:** Serializable isolation level, `SELECT ... FOR UPDATE` on the resource row, predicate locking, application-level distributed lock
- **Lesson:** Phantom reads are the hardest anomaly to prevent — Read Committed isolation is not enough for booking systems

### 6.3 The Write Skew in Doctor On-Call

- **Classic example (Martin Kleppmann's DDIA):** Hospital requires at least one doctor on call. Both doctors are on call. Doctor A checks: "is someone else on call?" — yes. Doctor B checks: "is someone else on call?" — yes. Both go off call. Now no doctors are on call.
- **Real pattern:** Any constraint that spans multiple rows — "at least one", "no more than N", "sum must be positive"
- **Solution:** Serializable isolation (Serializable Snapshot Isolation in PostgreSQL), explicit locks on the entire constraint domain (`SELECT FOR UPDATE` on all relevant rows), materialized conflict (introduce a lock row)
- **Lesson:** Snapshot isolation does NOT prevent write skew — only Serializable does

### 6.4 The Saga Partial Failure

- **What happens:** A saga orchestrates: (1) reserve inventory, (2) charge payment, (3) confirm order. Step 2 fails. Compensating transaction for step 1 (release inventory) also fails due to a network timeout. Inventory is reserved but not released and not confirmed.
- **Real pattern:** Any distributed multi-step workflow
- **Solution:** Idempotent compensating transactions with retry, saga state persisted to DB (not held in memory), dead letter queue for failed compensations, manual reconciliation process for stuck sagas
- **Lesson:** Compensating transactions can fail too — saga implementations must be bulletproof, not happy-path-only

### 6.5 The Deadlock Cascade

- **What happens:** Transaction A locks rows in order (1, 2). Transaction B locks rows in order (2, 1). A waits for B to release 2. B waits for A to release 1. Both wait forever — deadlock.
- **Real pattern:** Any application that acquires multiple locks without a consistent ordering
- **Scale trigger:** Occurs at low concurrency but becomes frequent under high load
- **Solution:** Always acquire locks in a consistent global order, use `SELECT FOR UPDATE OF specific_rows` in a deterministic order, use deadlock detection + retry, timeout aggressively
- **Lesson:** Deadlocks are always application bugs, not database bugs — the database detects and breaks them, but you must prevent them

### 6.6 The Distributed Transaction Memory Leak (2PC Coordinator Crash)

- **What happens:** A 2PC coordinator crashes after sending PREPARE but before sending COMMIT or ABORT — all participants are blocked, holding locks indefinitely — the system cannot make progress until the coordinator recovers
- **Real pattern:** Any system using 2PC for cross-shard or cross-service transactions
- **Solution:** Timeout + abort, external coordinator with durable state (not in-memory), participant timeout to force abort, Saga pattern to avoid 2PC entirely
- **Lesson:** 2PC is a blocking protocol — a coordinator crash can block your entire system. Avoid 2PC; prefer Saga.

---

## Part 7 — Data Loss and Corruption Incidents

### 7.1 The Accidental DROP TABLE in Production

- **What happened:** Developer runs `DROP TABLE users` against production (not staging) — 10 million user records gone
- **Famous instances:** GitLab's 2017 database incident — a DBA accidentally deleted the wrong PostgreSQL directory
- **Recovery options:** PITR (point-in-time recovery) from continuous WAL backup, logical backup restore, delayed replica (intentional lag replica as a safety net)
- **Prevention:** Role separation (developers cannot run DDL in production), `READ ONLY` connections for all non-DBA accounts, SQL review gates for destructive statements, delayed replica as a safety net
- **GitLab incident outcome:** Recovered 6 hours old backup — lost 6 hours of data — 18 hours of downtime
- **Lesson:** Always have a delayed replica (e.g., 24-hour lag) — it is your last line of defense against human error

### 7.2 The GitLab 2017 Database Incident — Full Post-Mortem

- **What happened:** DBA was removing data from a replication server — ran `rm -rf` on the wrong server — the production Postgres data directory was deleted
- **Recovery nightmare:** Automated backups were not working (misconfigured). WAL-E backups were 6 hours old. 5 different backup methods were tried — only the WAL-E backup worked.
- **Data lost:** ~300GB of data, 6 hours of database history, 5,000 projects, 5,000 comments
- **Timeline:** Incident at 17:20 UTC — service restored at 23:00 UTC — 5 hours 38 minutes of downtime
- **Lessons:** Test backups by actually restoring them. Monitor backup jobs. Never run destructive commands on production without verification. Use delayed replicas. Make recovery procedures automatic.
- **Study:** GitLab's public post-mortem — one of the most transparent incident reports ever published

### 7.3 The Partial Write Corruption (Torn Page)

- **What happens:** The database writes a 16KB page in multiple disk operations — power failure occurs mid-write — the page on disk contains half old data and half new data — the page is corrupt
- **Real pattern:** Consumer hardware without battery-backed write cache, improper power-off
- **Solution:** PostgreSQL's `full_page_writes = on` — writes full page image to WAL before first modification after a checkpoint — allows recovery from torn pages
- **Lesson:** `full_page_writes` is a correctness setting, not a performance one — never disable it on production

### 7.4 The Silent Data Corruption (Bit Rot)

- **What happens:** Disk silently flips bits in stored data without reporting an error — OS and database read the corrupted data and believe it is correct — checksums detect it only if they are enabled
- **Real pattern:** Aging storage, ZFS is specifically designed to prevent this — most filesystems are not
- **Solution:** Enable data checksums — PostgreSQL `initdb --data-checksums`, MySQL InnoDB checksum (on by default), ZFS with checksums for the filesystem, RAID with checksums
- **Lesson:** Silent corruption is more dangerous than detected corruption — always enable checksums

### 7.5 The Cascade Delete Disaster

- **What happened:** A poorly designed `ON DELETE CASCADE` foreign key — deleting one parent row cascades through multiple levels of child relationships — tens of thousands of rows are deleted in milliseconds without any warning
- **Real pattern:** `DELETE FROM companies WHERE id = 1` → cascades to departments → employees → payroll records → performance reviews → documents
- **Solution:** Disable `ON DELETE CASCADE` in production schemas, use soft deletes, validate the cascade chain before executing deletes, use explicit multi-step delete with confirmation
- **Lesson:** `ON DELETE CASCADE` is almost always wrong in a production business database — use soft deletes and explicit deletion workflows

---

## Part 8 — Migration and Schema Change Disasters

### 8.1 The Locking ALTER TABLE in Production

- **What happened:** Engineer runs `ALTER TABLE orders ADD COLUMN notes TEXT` on a 200 million row table — PostgreSQL takes a full table lock — all queries against the table queue — application timeout — site down for 12 minutes
- **Real pattern:** Any DDL that rewrites the table without an online-safe tool
- **Solution:** `CREATE INDEX CONCURRENTLY` for indexes, `ALTER TABLE ... ADD COLUMN` with a default is safe in PostgreSQL 11+ (stored as a catalog default, no rewrite), pg_repack or pgd-online-schema-change for other changes
- **Lesson:** Every schema change on a large table must be verified against the online-safe rules before execution — never run DDL in production during peak hours without an online migration plan

### 8.2 The ORM Auto-Migration in Production

- **What happened:** Development team uses GORM's `AutoMigrate()` — someone accidentally runs the service in production with a new model — AutoMigrate runs on startup — it adds columns, changes types, or drops columns silently
- **Real pattern:** Any ORM auto-migration feature enabled in production
- **Solution:** Never use auto-migration in production — use explicit, versioned, reviewed migration files (golang-migrate, Flyway, Liquibase, Atlas)
- **Lesson:** Schema migrations are production deployments — they need the same review, testing, and rollback plan as code deployments

### 8.3 The Migration That Couldn't Be Rolled Back

- **What happened:** A migration drops a column and removes it from the codebase — the deployment fails after the migration runs — rollback to the previous code version references the dropped column — the application crashes
- **Real pattern:** Any migration that drops something the previous version of the code still uses
- **Solution:** Expand-contract pattern — (1) deploy new code that doesn't use the column, (2) run migration to drop the column. Never drop a column in the same deployment that stops using it.
- **Lesson:** Schema changes and code changes must be decoupled — deploy code that is compatible with both old and new schema before migrating

### 8.4 The Long Migration That Locked All Writes

- **What happened:** Migration copies 500 million rows from one table format to another — holds a transaction for 2 hours — no other write can proceed — application is degraded for 2 hours
- **Real pattern:** Large data backfills inside a transaction
- **Solution:** Batch migrations — process 1,000–10,000 rows at a time, commit each batch, sleep briefly between batches (to allow other queries through), run during low-traffic hours
- **Lesson:** Never run a large data migration inside a single transaction — batch it with commits

---

## Part 9 — Caching Failure Case Studies

### 9.1 The Cache Stampede (Thundering Herd)

- **What happens:** A very popular cache key (the front page, a viral post) expires — thousands of concurrent requests simultaneously hit the DB to rebuild it — DB is overwhelmed — latency spikes — more timeouts — cascade failure
- **Real pattern:** Any shared cache key under high concurrent traffic
- **Solution:** Probabilistic early expiration (PER), mutex lock (only one request rebuilds, others wait), background refresh before expiration, staggered TTLs (add jitter to expiry times)
- **Lesson:** The most popular cached item expiring at a single instant is the most dangerous event for your database

### 9.2 The Cache Poisoning Bug

- **What happened:** A bug causes incorrect data to be written to the cache — the cache serves wrong data to all users — the bug is fixed in the DB — the cache continues serving stale poisoned data until TTL expires
- **Real pattern:** Any system where cache writes are not verified for correctness
- **Solution:** Cache versioning (version key allows instant invalidation of all entries), ability to manually flush the cache in production, canary testing for cache writes, monitoring for cache hit rate anomalies
- **Lesson:** A cache is not just a performance tool — it is a source of truth for your users. Invalid cached data is a correctness bug.

### 9.3 The Dog-Pile on Restart

- **What happens:** The cache server restarts (Redis reboot, deployment) — all cache entries are gone — every request hits the DB cold — DB cannot handle the full request load without the cache — site degrades or falls over
- **Real pattern:** Any system where the cache absorbs a significant fraction of reads
- **Solution:** Cache warming on startup (pre-populate cache before routing traffic), multiple cache nodes (rolling restart to avoid full cold start), read-through cache with circuit breaker to DB
- **Lesson:** Plan for cache cold start — it is a predictable disaster that can be engineered away

### 9.4 The Stale Cache Serving Wrong Permissions

- **What happened:** User's permissions are cached — admin revokes a permission — the cache continues serving the old permission — user retains access for the duration of the TTL (sometimes hours)
- **Real pattern:** Any security-sensitive data cached with a long TTL
- **Solution:** Short TTL for security-critical data (30 seconds max), event-driven cache invalidation on permission change, cache key includes a version token tied to the permission record's `updated_at`
- **Lesson:** TTL-based caching is dangerous for security-critical data — use event-driven invalidation

---

## Part 10 — Multi-Region and Global Database Case Studies

### 10.1 Google Spanner — Global Strong Consistency via TrueTime

- **What it solved:** Global databases at the time offered either strong consistency with high latency or low latency with eventual consistency
- **TrueTime innovation:** GPS and atomic clocks in every data center provide bounded clock uncertainty — Spanner waits out the uncertainty window before committing — enables globally consistent transactions
- **Trade-off accepted:** Commit latency includes the TrueTime uncertainty interval (typically 1–7ms)
- **Lesson:** Achieving global strong consistency requires either a centralized clock service or waiting out clock uncertainty — there is no free lunch
- **Study:** "Spanner: Google's Globally-Distributed Database" — OSDI 2012 paper

### 10.2 Amazon DynamoDB — Eventual Consistency by Default

- **Design philosophy:** Availability and partition tolerance over strong consistency
- **Eventual consistency default:** Reads may return stale data — strong consistency reads cost 2× the read capacity units
- **Use case fit:** Works perfectly for session stores, shopping carts, user preferences — dangerous for inventory, financial balances
- **DynamoDB Transactions:** Added later (2018) — support ACID transactions across multiple items — but expensive and limited to 25 items per transaction
- **Lesson:** Choose the right consistency level per operation — not all data has the same consistency requirements
- **Study:** Amazon DynamoDB developer guide — consistency models section

### 10.3 Facebook's TAO — Social Graph Caching at Scale

- **Problem:** Facebook's social graph is read 500× more than it is written — MySQL alone cannot handle the read load
- **Solution:** TAO (The Associations and Objects) — a distributed, eventually consistent caching layer on top of MySQL
- **Design:** Objects (nodes) and Associations (edges) as the primary data model — maps naturally to social graph
- **Consistency model:** Eventual — a like might not show immediately to all users worldwide, and that is acceptable
- **Scale:** Billions of queries per second across all data centers
- **Lesson:** For social data, eventual consistency across regions is the right trade-off — strong consistency would add unbearable latency
- **Study:** "TAO: Facebook's Distributed Data Store for the Social Graph" — USENIX ATC 2013

### 10.4 CockroachDB — Multi-Region Active-Active

- **Design:** Every node can accept both reads and writes — Raft consensus ensures consistency
- **Multi-region:** Data can be pinned to specific regions (for data residency), or replicated globally (for low-latency reads)
- **Trade-off:** Cross-region writes require cross-region Raft rounds — adds 50–300ms latency depending on regions
- **Super Regions:** Introduce a hierarchy — data stays within a geographic boundary even in a multi-region cluster
- **Lesson:** Active-active globally is technically achievable — but cross-region write latency is unavoidable physics — design to minimize cross-region writes
- **Study:** CockroachDB architecture documentation — Multi-Region Capabilities

### 10.5 The Active-Active Conflict Nightmare

- **What happens:** A system allows writes in both US-East and EU-West regions — a user updates their profile in both regions simultaneously (network partition) — when the partition heals, both writes must be reconciled — there is no right answer without application-specific merge logic
- **Real pattern:** Any active-active system without conflict resolution
- **Solution:** Last Write Wins (LWW) — simple but can silently discard data; Custom merge logic per entity type; CRDTs for data types that support them (counters, sets); Avoid active-active for entities where conflicts are unacceptable
- **Lesson:** Active-active is not free — you are trading write availability for conflict resolution complexity

---

## Part 11 — PostgreSQL-Specific Deep Case Studies

### 11.1 The Transaction ID Wraparound Emergency

- **What happens:** PostgreSQL uses 32-bit transaction IDs — they wrap around after ~2 billion transactions — if wraparound is not prevented by VACUUM, PostgreSQL will shut down to prevent data corruption
- **Famous incident:** Sentry experienced this in 2015 — forced emergency maintenance
- **Symptoms:** `pg_database.datfrozenxid` approaching the danger threshold, autovacuum cannot keep up
- **Solution:** Monitor `age(datfrozenxid)`, keep it below 1.5 billion, tune autovacuum to be more aggressive on high-write tables
- **Lesson:** Transaction ID wraparound is a uniquely PostgreSQL failure mode — monitor it or face forced downtime
- **Study:** Sentry Engineering Blog — "Transaction ID Wraparound in PostgreSQL"

### 11.2 The Autovacuum vs Long Transaction War

- **What happens:** A long-running OLAP query holds an open transaction — autovacuum cannot reclaim dead tuples behind the transaction's snapshot — bloat accumulates — eventually the table needs an emergency `VACUUM FREEZE`
- **Real pattern:** Mixed OLTP + OLAP workloads on the same PostgreSQL instance
- **Solution:** Separate OLAP queries to a read replica, set `idle_in_transaction_session_timeout`, use `statement_timeout`, move analytics to a dedicated OLAP system
- **Lesson:** Long transactions on a PostgreSQL OLTP server are toxic to vacuum health

### 11.3 The Prepared Statement Plan Cache Catastrophe

- **What happens:** A parameterized query is prepared — PostgreSQL generates a generic plan (not optimized for specific parameter values) — for skewed data distributions, the generic plan is catastrophic (e.g., choosing Seq Scan when an Index Scan would be 1000× faster)
- **Real pattern:** PgBouncer in session mode with prepared statements; ORM prepared statements
- **Solution:** Set `plan_cache_mode = force_custom_plan` for critical queries, use `EXECUTE` with non-prepared queries for queries with highly variable parameter distributions, monitor for plan regressions via `pg_stat_statements`
- **Lesson:** Prepared statement plan caching is a performance feature that can become a correctness problem for skewed data distributions

### 11.4 The Bloated Index That Broke Performance

- **What happens:** A table has high insert/update/delete churn — the B-Tree index pages fill with dead entries — the index is 3× its logical size — queries are slower because they must read more pages
- **Solution:** `REINDEX CONCURRENTLY` to rebuild without locking, tune `fill_factor` to leave room for updates, use `pgstattuple` to measure bloat, monitor bloat ratio regularly
- **Lesson:** Index bloat is invisible until it causes problems — monitor it proactively

---

## Part 12 — Event Sourcing and CQRS Case Studies

### 12.1 Event Store Projection Rebuild at Scale

- **What happens:** The read model (projection) has a bug — all projections must be rebuilt from the event stream — there are 10 billion events — the rebuild takes 72 hours — the system serves stale read data during rebuild
- **Real pattern:** Any event-sourced system with a large event store
- **Solution:** Snapshot-based replay (rebuild from the latest snapshot, not from event 0), parallel projection rebuilding, versioned projections (v1 and v2 run simultaneously during migration), blue-green projection deployment
- **Lesson:** Event sourcing requires a serious rebuild strategy from day one — the longer you wait to plan it, the more painful it becomes

### 12.2 The Event Schema Versioning Problem

- **What happens:** An event was defined as `OrderPlaced { orderId, customerId, amount }` — a year later, a new field `currency` is needed — old events don't have it — the projection that reads events must handle both versions
- **Real pattern:** Any event-sourced system that evolves over time (all of them)
- **Solution:** Upcasting (transform old events to new schema at read time), weak schema (use JSON with optional fields), event versioning (OrderPlacedV1, OrderPlacedV2), default values for new fields on old events
- **Lesson:** Events are immutable — you cannot change them after they are written — design for schema evolution from the start

### 12.3 The CQRS Eventual Consistency User Confusion

- **What happens:** User submits a form (command) — sees a confirmation page — navigates to the list view (query) — their new item is not there yet (read model hasn't updated) — user thinks the submission failed — submits again
- **Real pattern:** Any CQRS system with async read model synchronization
- **Solution:** Optimistic UI update (show the new item immediately regardless of the read model), read-your-writes consistency via write-through to the read model for the submitting user's session, acknowledgment message explaining eventual consistency
- **Lesson:** CQRS eventual consistency is invisible to engineers and confusing to users — design the UX explicitly around it

---

## Part 13 — Database Selection Mistakes

### 13.1 Using MongoDB When You Needed PostgreSQL

- **What happened:** Team chose MongoDB for flexibility — over time, the data became highly relational — JOINs were done in application code across many queries — N+1 pattern everywhere — performance degraded
- **Real pattern:** "We don't know our schema yet" leading to a document store choice that becomes regrettable
- **Lesson:** Document stores are not schema-free — they are schema-later. If your data has relationships, a relational database with a flexible JSONB column is often the better choice.

### 13.2 Using Redis as a Primary Database

- **What happened:** Team used Redis as the primary store for critical business data (no PostgreSQL at all) — Redis restarted without persistence configured — all data lost
- **Real pattern:** Startups treating Redis as a persistent database without understanding RDB/AOF
- **Lesson:** Redis is a cache and data structure server — if used as a primary store, persistence (AOF with fsync always) and replication are mandatory

### 13.3 Using Elasticsearch as a Primary Database

- **What happened:** Team stored all business records only in Elasticsearch (no SQL DB) — Elasticsearch's near-real-time indexing means a document is not immediately searchable — transactions are not supported — data loss occurred during index corruption
- **Real pattern:** Using a search engine as a system of record
- **Lesson:** Elasticsearch is a search index, not a database — always keep the source of truth in a transactional database and sync to Elasticsearch as a secondary index

### 13.4 Using a Message Queue as a Database

- **What happened:** Team stored all business state in RabbitMQ messages — consumer processed and re-queued to "update state" — messages got out of order — state became inconsistent — no ability to query current state without consuming the entire queue
- **Real pattern:** Treating a message queue as a stateful store
- **Lesson:** Message queues are for in-flight work, not stored state — use a database for state, a queue for work distribution

### 13.5 Premature Sharding

- **What happened:** Team sharded their database at launch (10K users) "to be ready for scale" — added enormous operational complexity — cross-shard queries were needed from day one because the domain wasn't understood yet — shard key was wrong — had to reshard 3 months later
- **Real pattern:** Over-engineering the data layer before understanding the access patterns
- **Lesson:** Don't shard until you need to — a well-tuned single-node PostgreSQL can handle tens of millions of rows and thousands of TPS. Shard when you hit a real limit, not an imagined one.

---

## Part 14 — Real Incident Post-Mortems to Study

|Company|Incident|What to Learn|
|---|---|---|
|GitLab (2017)|DBA accidentally deleted the production DB|Backup testing, delayed replicas, runbooks|
|GitHub (2012)|MySQL data inconsistency from split-brain|Split-brain prevention, fencing tokens|
|Amazon S3 (2017)|Typo in a command took down a large portion of S3|Blast radius limitation, runbook review|
|Cloudflare (2019)|Regex CPU exhaustion — not DB but lessons on cascading failure apply|Single point of failure, circuit breakers|
|Facebook (2021)|BGP misconfiguration took down all FB services including their DB access|Multi-provider access paths, out-of-band management|
|Sentry (2015)|PostgreSQL transaction ID wraparound|Monitor datfrozenxid, autovacuum tuning|
|Foursquare (2010)|MongoDB failed under load due to memory pressure|Understand working set vs RAM, MongoDB gotchas|
|Basecamp (2019)|MySQL query killed the DB due to missing index|Index all FK columns, query review|
|PagerDuty (2014)|Cascading DB failure from a single slow query|Statement timeouts, circuit breakers|
|DoorDash (2019)|Postgres connection exhaustion under load|PgBouncer, connection pool sizing|

---

## Part 15 — Academic Papers to Study

|Paper|What It Teaches|
|---|---|
|_Dynamo: Amazon's Highly Available Key-Value Store_ (2007)|Eventual consistency, vector clocks, consistent hashing, quorum|
|_Bigtable: A Distributed Storage System for Structured Data_ (2006)|Column-family model, SSTable, compaction, GFS integration|
|_Spanner: Google's Globally-Distributed Database_ (2012)|TrueTime, global consistency, Paxos across regions|
|_MapReduce: Simplified Data Processing on Large Clusters_ (2004)|Batch processing model, influence on OLAP DB design|
|_The Log: What every software engineer should know about real-time data_ — Jay Kreps|WAL as a universal primitive, Kafka's design philosophy|
|_CAP Twelve Years Later: How the "Rules" Have Changed_ — Eric Brewer (2012)|CAP nuance, PACELC, practical implications|
|_ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging_ (1992)|WAL theory, recovery algorithms used in PostgreSQL and MySQL|
|_Architecture of a Database System_ — Hellerstein, Stonebraker, Hamilton (2007)|Comprehensive overview of DBMS internals|
|_F1: A Distributed SQL Database That Scales_ — Google (2012)|Distributed SQL over Spanner|
|_Anna: A KVS for Any Scale_ (2018)|Lattice-based consistency, selective consistency per key|
|_Cassandra: A Decentralized Structured Storage System_ (2010)|Leaderless replication, consistent hashing, gossip protocol|
|_In Search of an Understandable Consensus Algorithm_ — Raft paper (2014)|Raft consensus — more readable than Paxos|

---

## Study Order Recommendation

```
Tier 1 — Start here (foundational failure patterns):
  Part 1 (N+1, OFFSET, hot row, connection exhaustion)
  Part 6 (lost update, phantom read, write skew, deadlock)
  Part 9 (cache stampede, poisoning, cold start)

Tier 2 — Core architecture (understand before designing any system):
  Part 4 (Instagram, Twitter, Discord, Notion, Stack Overflow)
  Part 3 (sharding failures — bad shard key, celebrity problem, reshard pain)
  Part 2 (replication lag, split-brain, data loss on failover)

Tier 3 — Advanced distributed systems:
  Part 5 (Cassandra tombstones, DynamoDB hot key, Elasticsearch mapping explosion)
  Part 10 (Spanner, DynamoDB, TAO, CockroachDB, active-active conflicts)
  Part 7 (data loss, corruption, GitLab incident)

Tier 4 — Specialized patterns:
  Part 8 (migration disasters)
  Part 11 (PostgreSQL-specific — transaction ID wraparound, autovacuum war)
  Part 12 (event sourcing and CQRS real problems)
  Part 13 (database selection mistakes)

Tier 5 — Primary sources:
  Part 14 (post-mortems — read the originals)
  Part 15 (academic papers — Dynamo, Spanner, Raft are mandatory)
```

---

_The most important mindset shift: every failure case here happened to a smart team with good intentions. The systems failed because of emergent behavior under scale that was not visible at design time. Study these cases not to feel superior to the teams that experienced them — study them so you can design your systems to fail gracefully when the same thing happens to you._