# Database Mastery Curriculum — Zero to Expert

---

## Phase 1 — Foundations

### 1.1 How Databases Work Internally

- What a database actually is (vs a file, vs a spreadsheet)
- The role of the database engine
- How data is stored on disk (heap files, pages, blocks)
- Buffer pool / buffer cache — why RAM matters
- How a database boots and shuts down
- Write-Ahead Log (WAL) — crash recovery fundamentals
- Checkpointing

### 1.2 Data Models

- Relational model (tables, rows, columns, keys)
- Document model (JSON/BSON)
- Key-Value model
- Column-Family model (wide-column)
- Graph model (nodes, edges, properties)
- Time-Series model
- Search / Inverted index model
- When to pick which model

### 1.3 The Relational Model Deep Dive

- Relations, tuples, attributes
- Domains and data types
- NULL semantics and three-valued logic
- Primary keys, candidate keys, surrogate vs natural keys
- Foreign keys and referential integrity
- Constraints — CHECK, UNIQUE, NOT NULL, DEFAULT
- Sequences and auto-increment

---

## Phase 2 — SQL Mastery

### 2.1 SQL Fundamentals

- DDL — CREATE, ALTER, DROP, TRUNCATE
- DML — INSERT, UPDATE, DELETE, MERGE/UPSERT
- DQL — SELECT and its full clause order
- TCL — BEGIN, COMMIT, ROLLBACK, SAVEPOINT

### 2.2 Querying

- WHERE, ORDER BY, LIMIT/OFFSET
- DISTINCT
- Aliases (column and table)
- Arithmetic and string expressions
- CASE expressions
- NULL handling — IS NULL, COALESCE, NULLIF

### 2.3 Joins

- INNER JOIN
- LEFT / RIGHT OUTER JOIN
- FULL OUTER JOIN
- CROSS JOIN
- SELF JOIN
- LATERAL JOIN
- Join algorithms — Nested Loop, Hash Join, Merge Join
- How the planner picks a join strategy

### 2.4 Aggregation

- GROUP BY and HAVING
- COUNT, SUM, AVG, MIN, MAX
- FILTER clause on aggregates
- DISTINCT inside aggregates

### 2.5 Subqueries

- Scalar subqueries
- Row subqueries
- Table subqueries (derived tables)
- Correlated subqueries
- EXISTS / NOT EXISTS
- ANY / ALL / IN / NOT IN

### 2.6 Common Table Expressions (CTEs)

- Non-recursive CTEs
- Recursive CTEs (trees, graphs, sequences)
- Materialized vs non-materialized CTEs

### 2.7 Window Functions

- OVER clause — PARTITION BY, ORDER BY, FRAME
- Ranking — ROW_NUMBER, RANK, DENSE_RANK, NTILE
- Offset — LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE
- Aggregates as window functions — SUM, AVG, COUNT over a window
- Frame specifications — ROWS vs RANGE vs GROUPS

### 2.8 Advanced SQL

- UNION, INTERSECT, EXCEPT
- PIVOT and UNPIVOT
- Grouping sets — GROUPING SETS, ROLLUP, CUBE
- JSON functions and operators
- Full-text search in SQL
- Upsert patterns — INSERT ... ON CONFLICT
- RETURNING clause (PostgreSQL)

---

## Phase 3 — Database Design

### 3.1 Entity-Relationship (ER) Modeling

- Entities, attributes, relationships
- Cardinality — one-to-one, one-to-many, many-to-many
- Weak entities
- ER diagrams — Chen notation, Crow's Foot
- Converting ER to relational schema

### 3.2 Normalization

- Functional dependencies
- 1NF — atomic values, no repeating groups
- 2NF — no partial dependencies
- 3NF — no transitive dependencies
- BCNF — Boyce-Codd Normal Form
- 4NF — multi-valued dependencies
- 5NF — join dependencies
- When to stop normalizing (pragmatic trade-offs)

### 3.3 Denormalization

- Why and when to denormalize
- Redundant columns for read performance
- Pre-aggregated summary tables
- JSON columns for semi-structured data
- Trade-offs — write amplification vs read speed

### 3.4 Schema Design Patterns

- Lookup / reference tables
- Audit / history tables (temporal data)
- Soft delete patterns
- Polymorphic associations
- Entity-Attribute-Value (EAV) — and why to avoid it
- Multi-tenancy patterns — shared schema, row-level, separate schemas
- Hierarchical data — Adjacency List, Nested Sets, Closure Table, Materialized Path
- Time-series schema design
- Event sourcing schema

---

## Phase 4 — Indexing

### 4.1 Index Internals

- B-Tree structure — pages, branching factor, height
- How a B-Tree lookup, insert, and delete works
- Page splits and tree rebalancing
- Index selectivity and cardinality

### 4.2 Index Types

- B-Tree index (default)
- Hash index
- GiST (Generalized Search Tree)
- GIN (Generalized Inverted Index) — for full-text, arrays, JSON
- BRIN (Block Range Index) — for large append-only tables
- Bitmap index
- Full-text index
- Spatial index (R-Tree)
- Clustered vs non-clustered index

### 4.3 Index Strategies

- Single-column index
- Composite (multi-column) index and column order
- Covering index (index-only scans)
- Partial index (filtered index)
- Expression / functional index
- Unique index
- Index on foreign keys

### 4.4 Index Pitfalls

- Over-indexing — write overhead
- Index bloat
- Index invalidation — implicit type casts, function on column
- Dead tuples and VACUUM (PostgreSQL)
- When the planner ignores your index

### 4.5 Query Execution Plans

- EXPLAIN and EXPLAIN ANALYZE
- Seq Scan vs Index Scan vs Index Only Scan vs Bitmap Scan
- Cost model — seq_page_cost, random_page_cost
- Statistics — pg_statistic, ANALYZE
- Planner hints and forcing plans

---

## Phase 5 — Transactions and Concurrency

### 5.1 ACID Properties

- Atomicity — all or nothing
- Consistency — invariants preserved
- Isolation — concurrent transactions don't interfere
- Durability — committed data survives crashes

### 5.2 Isolation Levels

- Read Uncommitted
- Read Committed
- Repeatable Read
- Serializable
- Phenomena — dirty read, non-repeatable read, phantom read, write skew, lost update

### 5.3 Locking

- Shared (read) lock vs Exclusive (write) lock
- Row-level vs table-level vs page-level locking
- Advisory locks
- Deadlock — detection and prevention
- Lock wait timeouts
- Lock escalation

### 5.4 MVCC (Multi-Version Concurrency Control)

- How MVCC avoids read locks
- Version chains and visibility rules
- Transaction IDs and snapshots
- Dead tuples and vacuum in PostgreSQL
- MVCC in MySQL (InnoDB undo logs)

### 5.5 Optimistic vs Pessimistic Concurrency Control

- Optimistic — version columns, compare-and-swap
- Pessimistic — SELECT FOR UPDATE, SELECT FOR SHARE
- SKIP LOCKED — job queue pattern
- NOWAIT

### 5.6 Distributed Transactions
- Two-Phase Commit (2PC)
- Three-Phase Commit (3PC)
- Saga pattern — choreography and orchestration
- XA transactions

---

## Phase 6 — Performance Tuning

### 6.1 Query Optimization

- Rewriting queries for the planner
- Avoiding N+1 patterns
- Pagination — OFFSET vs keyset (cursor-based) pagination
- Batch inserts and bulk operations
- Avoiding unnecessary ORDER BY
- Short-circuit evaluation

### 6.2 Connection Management

- Connection overhead
- Connection pooling — PgBouncer, HikariCP, pgx pool
- Pool sizing — the formula
- Prepared statements

### 6.3 Storage and Memory Tuning

- shared_buffers, work_mem, effective_cache_size (PostgreSQL)
- innodb_buffer_pool_size (MySQL)
- Checkpoint tuning
- WAL configuration
- Autovacuum tuning

### 6.4 Schema-Level Performance

- Data type choices — using the smallest correct type
- Partitioning as a performance tool
- Table statistics and ANALYZE frequency
- Bloat management

### 6.5 Benchmarking

- pgbench, sysbench, HammerDB
- What to measure — throughput, latency, p95/p99 percentiles
- Profiling slow queries — pg_stat_statements, slow query log
- EXPLAIN buffers and timing

---

## Phase 7 — Replication and High Availability

### 7.1 Replication Fundamentals

- Why replicate — durability, read scaling, HA
- Synchronous vs asynchronous replication
- RPO and RTO — recovery objectives

### 7.2 PostgreSQL Replication

- Streaming replication (WAL shipping)
- Logical replication
- Replication slots
- Cascading replicas
- Standby and hot standby

### 7.3 MySQL Replication

- Binary log (binlog) replication
- Row-based vs statement-based vs mixed replication
- GTID replication
- Semi-synchronous replication
- Group Replication

### 7.4 Failover and Switchover

- Patroni (PostgreSQL HA)
- Orchestrator (MySQL HA)
- PgBouncer with HA
- Read replica routing
- Split-brain problem and quorum

### 7.5 Backup and Recovery

- Logical backup — pg_dump, mysqldump
- Physical backup — pg_basebackup, xtrabackup
- Point-in-time recovery (PITR)
- Continuous archiving (WAL archiving)
- Backup verification and restore drills

---

## Phase 8 — Partitioning and Sharding

### 8.1 Table Partitioning

- Range partitioning
- List partitioning
- Hash partitioning
- Composite partitioning
- Partition pruning
- Partition maintenance — adding, detaching, dropping

### 8.2 Sharding

- What sharding is and why it exists
- Shard key selection — the most critical decision
- Range-based sharding
- Hash-based sharding
- Directory-based sharding
- Hotspot problem
- Cross-shard queries and distributed joins
- Resharding and rebalancing

### 8.3 Distributed SQL Databases

- CockroachDB — consensus replication, distributed SQL
- YugabyteDB — Raft-based distribution
- Citus — PostgreSQL sharding extension
- Vitess — MySQL sharding layer

---

## Phase 9 — NoSQL Databases

### 9.1 Document Databases — MongoDB

- Documents, collections, databases
- BSON and data types
- CRUD operations
- Aggregation pipeline — $match, $group, $project, $lookup, $unwind
- Indexing in MongoDB — single, compound, multikey, text, geospatial, TTL
- Schema design — embedding vs referencing
- Transactions in MongoDB (multi-document)
- Change streams
- Replica sets and sharding

### 9.2 Key-Value Stores — Redis

- Data structures — String, List, Hash, Set, Sorted Set, Stream, HyperLogLog, Bitmap, Geospatial
- Persistence — RDB snapshots and AOF
- Expiry and eviction policies
- Pub/Sub
- Redis Streams
- Lua scripting
- Transactions — MULTI/EXEC/DISCARD
- Redis Cluster and sentinel
- Use cases — caching, session store, rate limiting, leaderboards, message queue

### 9.3 Column-Family Stores — Apache Cassandra

- Wide-column model
- Partition key, clustering key, compound primary key
- CQL
- Consistency levels — ONE, QUORUM, ALL
- Tunable consistency (CAP trade-offs)
- Compaction strategies
- Tombstones and anti-patterns
- Time-series with Cassandra

### 9.4 Message Queues as Data Stores — Apache Kafka

- Topics, partitions, offsets
- Producers and consumers
- Consumer groups
- Retention and log compaction
- At-most-once, at-least-once, exactly-once semantics
- Kafka Streams and KSQL
- Kafka as the source of truth (event sourcing)

### 9.5 Search Engines — Elasticsearch / OpenSearch

- Inverted index
- Documents, indices, shards, replicas
- Mapping and analyzers
- Query DSL — match, term, bool, range, wildcard, fuzzy
- Aggregations
- Relevance scoring — TF-IDF, BM25
- Index lifecycle management

### 9.6 Graph Databases — Neo4j / DGraph

- Nodes, relationships, properties, labels
- Cypher query language
- Graph algorithms — shortest path, PageRank, community detection
- When graph beats relational for connected data

### 9.7 Time-Series Databases — InfluxDB / TimescaleDB

- What makes time-series special
- Downsampling and rollups
- Retention policies
- Continuous aggregates (TimescaleDB)
- Hypertables

---

## Phase 10 — Distributed Systems Concepts

### 10.1 CAP Theorem

- Consistency, Availability, Partition Tolerance
- CP vs AP systems
- Why "CA" doesn't exist in a distributed network
- PACELC model (extension of CAP)

### 10.2 Consistency Models
- Strong consistency
- Sequential consistency
- Causal consistency
- Eventual consistency
- Read-your-writes, monotonic reads, monotonic writes

### 10.3 Consensus Algorithms
- Paxos — basic and multi-Paxos
- Raft — leader election, log replication, safety
- Viewstamped Replication
- Zookeeper's ZAB protocol

### 10.4 Distributed Clocks and Ordering
- Wall clock vs logical clock
- Lamport timestamps
- Vector clocks
- TrueTime (Google Spanner)
- Hybrid Logical Clocks (HLC)

### 10.5 Distributed Storage Internals

- LSM Tree (Log-Structured Merge-Tree) — RocksDB, LevelDB, Cassandra
- SSTable and MemTable
- Bloom filters
- Compaction — size-tiered vs leveled
- Write amplification and read amplification trade-offs

---

## Phase 11 — Security

### 11.1 Authentication and Authorization

- Database users, roles, and privileges
- GRANT and REVOKE
- Role-based access control (RBAC)
- Row-level security (RLS) — PostgreSQL
- Column-level permissions

### 11.2 Encryption

- Encryption in transit — TLS/SSL for connections
- Encryption at rest — tablespace encryption, disk-level encryption
- Column-level encryption
- Key management

### 11.3 Auditing and Compliance

- Audit logging — who ran what, when
- pgaudit (PostgreSQL), general query log (MySQL)
- GDPR and data privacy considerations
- Data masking and anonymization
- PII handling in schemas

### 11.4 SQL Injection Prevention

- Parameterized queries and prepared statements
- ORM-level protection
- Stored procedures as a defense layer
- Input validation

---

## Phase 12 — Observability and Operations

### 12.1 Monitoring

- Key metrics — QPS, TPS, latency percentiles, cache hit ratio, replication lag, lock wait time, connection count
- pg_stat_activity, pg_stat_statements, pg_stat_user_tables
- INFORMATION_SCHEMA and system catalog queries
- Prometheus exporters — postgres_exporter, mysqld_exporter
- Grafana dashboards

### 12.2 Logging

- Slow query log
- Error log
- Deadlock logging
- Log shipping to centralized systems (ELK, Loki)

### 12.3 Maintenance Operations

- VACUUM and ANALYZE in PostgreSQL
- Table bloat and index bloat detection
- Online schema changes — pg_repack, pt-online-schema-change, gh-ost
- Zero-downtime migrations strategy

---

## Phase 13 — Migrations and Versioning

### 13.1 Schema Migration Fundamentals

- Forward and rollback migrations
- Migration as code
- Idempotent migrations

### 13.2 Migration Tools

- Flyway
- Liquibase
- golang-migrate
- Atlas
- Prisma Migrate

### 13.3 Zero-Downtime Migration Patterns

- Expand-Contract pattern (parallel columns)
- Shadow tables
- Dual-write strategy
- Blue-green database deployments
- Online index builds

---

## Phase 14 — ORM and Query Builders

### 14.1 ORM Concepts

- Active Record vs Data Mapper pattern
- N+1 problem and eager loading
- Lazy loading vs eager loading
- Unit of Work pattern
- Identity Map

### 14.2 Go-Specific Tools

- database/sql — the standard library
- sqlx — scanning and named queries
- GORM — full ORM
- sqlc — generate type-safe Go from SQL
- Bun — ORM with raw SQL support
- pgx — PostgreSQL native driver

### 14.3 ORM Anti-Patterns

- Leaky abstractions hiding bad SQL
- Over-fetching columns
- Ignoring transactions in ORM code
- Schema migration via ORM in production

---

## Phase 15 — Advanced and Specialized Topics

### 15.1 Query Planning Deep Dive

- Planner statistics and histograms
- Join ordering and dynamic programming
- Genetic Query Optimizer (GEQO)
- Parallel query execution
- JIT compilation (PostgreSQL)

### 15.2 Stored Procedures and Functions

- PL/pgSQL fundamentals
- Functions vs procedures
- Triggers — BEFORE, AFTER, INSTEAD OF
- Trigger use cases and anti-patterns

### 15.3 Full-Text Search in SQL

- tsvector and tsquery (PostgreSQL)
- Text search configurations and dictionaries
- Ranking — ts_rank, ts_rank_cd
- GIN indexes for full-text
- When to reach for Elasticsearch instead

### 15.4 Geospatial

- PostGIS extension
- Geometry vs Geography types
- Spatial indexes — GiST, BRIN for spatial
- Common spatial queries — within radius, bounding box, nearest neighbor

### 15.5 HTAP — Hybrid Transactional/Analytical Processing

- OLTP vs OLAP workloads
- Columnar storage — why it matters for analytics
- PostgreSQL with columnar extensions (Citus, Hydra)
- TiDB, SingleStore

### 15.6 NewSQL and Modern Databases

- CockroachDB, YugabyteDB, PlanetScale
- Neon — serverless PostgreSQL
- Supabase architecture
- PolarDB, Aurora

### 15.7 Streaming and Real-Time

- Change Data Capture (CDC) — Debezium, pgoutput
- Outbox pattern
- Transactional outbox with Kafka
- Materialized views for real-time dashboards

### 15.8 Multi-Model Databases

- PostgreSQL as a multi-model database (JSON, full-text, spatial, graph with recursive CTEs)
- FerretDB (MongoDB wire protocol on PostgreSQL)
- SurrealDB

---

## Phase 16 — System Design with Databases

### 16.1 Database Selection

- Choosing between SQL and NoSQL
- Polyglot persistence
- Read-heavy vs write-heavy workloads
- Consistency requirements

### 16.2 Caching Architecture

- Cache-aside pattern
- Write-through and write-behind
- Read-through cache
- Cache invalidation strategies
- Redis as L2 cache in front of PostgreSQL

### 16.3 Common System Design Patterns

- URL shortener — hash storage, redirect counters
- Rate limiter — Redis sliding window, token bucket
- Notification system — fan-out on write vs fan-out on read
- Leaderboard — sorted sets in Redis + periodic sync to PostgreSQL
- Job/task queue — SKIP LOCKED in PostgreSQL or Redis Streams
- Session store — Redis with TTL
- Search — Elasticsearch + PostgreSQL dual write
- Audit log — append-only table + Kafka

### 16.4 Capacity Planning

- Estimating storage growth
- IOPS requirements
- Memory sizing for working set
- Read replica scaling model

---

## Recommended Learning Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
    → Phase 6 → Phase 7 → Phase 8 → Phase 9
    → Phase 10 → Phase 11 → Phase 12 → Phase 13
    → Phase 14 → Phase 15 → Phase 16
```

Go deep on PostgreSQL first — it is the richest teaching database.  
Once Phase 1–8 are solid, branch into NoSQL (Phase 9) in parallel with distributed theory (Phase 10).

---

_Total topic count: ~300 discrete topics across 16 phases._