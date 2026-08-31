# Database Mastery Curriculum — Zero to Expert (with Books & Chapters)

---

## Key Books Referenced Throughout This Curriculum

|Abbrev|Full Title|Author(s)|
|---|---|---|
|**DDIA**|_Designing Data-Intensive Applications_|Martin Kleppmann|
|**PGUA**|_PostgreSQL: Up and Running_ (3rd ed.)|Regina Obe & Leo Hsu|
|**PGIA**|_The Art of PostgreSQL_|Dimitri Fontaine|
|**HPMY**|_High Performance MySQL_ (4th ed.)|Silvia Botros & Jeremy Tinley|
|**DBCI**|_Database Internals_|Alex Petrov|
|**USAR**|_Use The Index, Luke_|Markus Winand (free online)|
|**SQLA**|_SQL Antipatterns_|Bill Karwin|
|**LSQL**|_Learning SQL_ (3rd ed.)|Alan Beaulieu|
|**ASQL**|_SQL Cookbook_ (2nd ed.)|Anthony Molinaro & Robert de Graaf|
|**MGDB**|_MongoDB: The Definitive Guide_ (3rd ed.)|Shannon Bradshaw et al.|
|**RDIS**|_Redis in Action_|Josiah Carlson|
|**CASS**|_Cassandra: The Definitive Guide_ (3rd ed.)|Jeff Carpenter & Eben Hewitt|
|**KAFK**|_Kafka: The Definitive Guide_ (2nd ed.)|Gwen Shapira et al.|
|**SRCH**|_Elasticsearch: The Definitive Guide_|Clinton Gormley & Zachary Tong|
|**DSYS**|_Distributed Systems_ (4th ed.)|Maarten Van Steen & Andrew Tanenbaum|
|**TRXN**|_Transaction Processing: Concepts and Techniques_|Jim Gray & Andreas Reuter|
|**DBMS**|_Database System Concepts_ (7th ed.)|Silberschatz, Korth & Sudarshan|
|**SDID**|_System Design Interview – An Insider's Guide_ Vol. 1 & 2|Alex Xu|
|**DDDG**|_Domain-Driven Design_|Eric Evans|
|**PRST**|_Patterns of Enterprise Application Architecture_|Martin Fowler|
|**DBDG**|_Database Design for Mere Mortals_ (4th ed.)|Michael J. Hernandez|
|**SCLD**|_Scalability Rules_ (2nd ed.)|Martin L. Abbott & Michael T. Fisher|
|**CLDD**|_Clean Architecture_|Robert C. Martin|
|**DMCB**|_The Data Model Resource Book_ Vol. 1 & 2|Len Silverston|

---

## Phase 1 — Foundations

### 1.1 How Databases Work Internally

- What a database actually is (vs a file, vs a spreadsheet) — **DDIA Ch. 1** / **DBMS Ch. 1**
- The role of the database engine — **DBCI Ch. 1**
- How data is stored on disk (heap files, pages, blocks) — **DDIA Ch. 3** / **DBCI Ch. 2**
- Buffer pool / buffer cache — why RAM matters — **DBMS Ch. 10** / **HPMY Ch. 8**
- How a database boots and shuts down — **DBCI Ch. 2**
- Write-Ahead Log (WAL) — crash recovery fundamentals — **DDIA Ch. 3** / **DBCI Ch. 5**
- Checkpointing — **DBMS Ch. 19** / **DBCI Ch. 5**

### 1.2 Data Models

- Relational model — **DDIA Ch. 2** / **DBMS Ch. 2**
- Document model (JSON/BSON) — **DDIA Ch. 2**
- Key-Value model — **DDIA Ch. 2** / **RDIS Ch. 1**
- Column-Family model (wide-column) — **DDIA Ch. 2** / **CASS Ch. 4**
- Graph model (nodes, edges, properties) — **DDIA Ch. 2**
- Time-Series model — **DDIA Ch. 3**
- Search / Inverted index model — **SRCH Ch. 1**
- When to pick which model — **DDIA Ch. 2**

### 1.3 The Relational Model Deep Dive

- Relations, tuples, attributes — **DBMS Ch. 2** / **LSQL Ch. 1**
- Domains and data types — **LSQL Ch. 2** / **PGUA Ch. 4**
- NULL semantics and three-valued logic — **SQLA Ch. 6** / **LSQL Ch. 4**
- Primary keys, candidate keys, surrogate vs natural keys — **SQLA Ch. 1** / **DBMS Ch. 2**
- Foreign keys and referential integrity — **LSQL Ch. 5** / **DBMS Ch. 4**
- Constraints — CHECK, UNIQUE, NOT NULL, DEFAULT — **LSQL Ch. 13**
- Sequences and auto-increment — **PGUA Ch. 4**

---

## Phase 2 — SQL Mastery

### 2.1 SQL Fundamentals

- DDL — CREATE, ALTER, DROP, TRUNCATE — **LSQL Ch. 2** / **DBMS Ch. 3**
- DML — INSERT, UPDATE, DELETE, MERGE/UPSERT — **LSQL Ch. 9** / **ASQL Ch. 1**
- DQL — SELECT and its full clause order — **LSQL Ch. 3**
- TCL — BEGIN, COMMIT, ROLLBACK, SAVEPOINT — **LSQL Ch. 12** / **DBMS Ch. 17**

### 2.2 Querying

- WHERE, ORDER BY, LIMIT/OFFSET — **LSQL Ch. 4**
- DISTINCT — **LSQL Ch. 3**
- Aliases (column and table) — **LSQL Ch. 3**
- Arithmetic and string expressions — **LSQL Ch. 7**
- CASE expressions — **LSQL Ch. 11** / **ASQL Ch. 1**
- NULL handling — IS NULL, COALESCE, NULLIF — **SQLA Ch. 6** / **LSQL Ch. 11**

### 2.3 Joins

- INNER JOIN — **LSQL Ch. 5**
- LEFT / RIGHT OUTER JOIN — **LSQL Ch. 5**
- FULL OUTER JOIN — **LSQL Ch. 5** / **ASQL Ch. 3**
- CROSS JOIN — **LSQL Ch. 5**
- SELF JOIN — **LSQL Ch. 5** / **ASQL Ch. 3**
- LATERAL JOIN — **ASQL Ch. 3** / **PGIA Ch. 8**
- Join algorithms — Nested Loop, Hash Join, Merge Join — **DBMS Ch. 12** / **USAR Ch. 3**
- How the planner picks a join strategy — **USAR Ch. 3** / **PGUA Ch. 7**

### 2.4 Aggregation

- GROUP BY and HAVING — **LSQL Ch. 8**
- COUNT, SUM, AVG, MIN, MAX — **LSQL Ch. 8**
- FILTER clause on aggregates — **PGIA Ch. 5**
- DISTINCT inside aggregates — **ASQL Ch. 5**

### 2.5 Subqueries

- Scalar subqueries — **LSQL Ch. 9**
- Row subqueries — **LSQL Ch. 9**
- Table subqueries (derived tables) — **LSQL Ch. 9**
- Correlated subqueries — **LSQL Ch. 9** / **ASQL Ch. 2**
- EXISTS / NOT EXISTS — **LSQL Ch. 9** / **ASQL Ch. 2**
- ANY / ALL / IN / NOT IN — **LSQL Ch. 9**

### 2.6 Common Table Expressions (CTEs)

- Non-recursive CTEs — **ASQL Ch. 14** / **PGIA Ch. 6**
- Recursive CTEs (trees, graphs, sequences) — **ASQL Ch. 14** / **PGIA Ch. 6**
- Materialized vs non-materialized CTEs — **PGIA Ch. 6**

### 2.7 Window Functions

- OVER clause — PARTITION BY, ORDER BY, FRAME — **ASQL Ch. 11** / **PGIA Ch. 7**
- Ranking — ROW_NUMBER, RANK, DENSE_RANK, NTILE — **ASQL Ch. 11** / **LSQL Ch. 16**
- Offset — LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE — **ASQL Ch. 11** / **PGIA Ch. 7**
- Aggregates as window functions — **ASQL Ch. 11**
- Frame specifications — ROWS vs RANGE vs GROUPS — **PGIA Ch. 7** / **ASQL Ch. 11**

### 2.8 Advanced SQL

- UNION, INTERSECT, EXCEPT — **LSQL Ch. 6** / **ASQL Ch. 4**
- PIVOT and UNPIVOT — **ASQL Ch. 12**
- Grouping sets — GROUPING SETS, ROLLUP, CUBE — **ASQL Ch. 11** / **PGIA Ch. 5**
- JSON functions and operators — **PGUA Ch. 5** / **PGIA Ch. 9**
- Full-text search in SQL — **PGUA Ch. 11**
- Upsert patterns — INSERT ... ON CONFLICT — **PGIA Ch. 9**
- RETURNING clause (PostgreSQL) — **PGUA Ch. 5**

---

## Phase 3 — Database Design

### 3.1 Entity-Relationship (ER) Modeling

- Entities, attributes, relationships — **DBMS Ch. 6**
- Cardinality — one-to-one, one-to-many, many-to-many — **DBMS Ch. 6**
- Weak entities — **DBMS Ch. 6**
- ER diagrams — Chen notation, Crow's Foot — **DBMS Ch. 6**
- Converting ER to relational schema — **DBMS Ch. 7**

### 3.2 Normalization

- Functional dependencies — **DBMS Ch. 8**
- 1NF — atomic values, no repeating groups — **DBMS Ch. 8** / **SQLA Ch. 2**
- 2NF — no partial dependencies — **DBMS Ch. 8**
- 3NF — no transitive dependencies — **DBMS Ch. 8**
- BCNF — Boyce-Codd Normal Form — **DBMS Ch. 8**
- 4NF — multi-valued dependencies — **DBMS Ch. 8**
- 5NF — join dependencies — **DBMS Ch. 8**
- When to stop normalizing — **SQLA Ch. 2** / **DDIA Ch. 2**

### 3.3 Denormalization

- Why and when to denormalize — **DDIA Ch. 2** / **HPMY Ch. 4**
- Redundant columns for read performance — **HPMY Ch. 4**
- Pre-aggregated summary tables — **HPMY Ch. 4**
- JSON columns for semi-structured data — **PGUA Ch. 5**
- Trade-offs — write amplification vs read speed — **DDIA Ch. 3**

### 3.4 Schema Design Patterns

- Lookup / reference tables — **SQLA Ch. 5**
- Audit / history tables (temporal data) — **SQLA Ch. 8** / **PGIA Ch. 10**
- Soft delete patterns — **SQLA Ch. 4**
- Polymorphic associations — **SQLA Ch. 3**
- Entity-Attribute-Value (EAV) — and why to avoid it — **SQLA Ch. 6**
- Multi-tenancy patterns — **PGUA Ch. 14** / **DDIA Ch. 2**
- Hierarchical data — Adjacency List, Nested Sets, Closure Table, Materialized Path — **SQLA Ch. 4**
- Time-series schema design — **DDIA Ch. 3**
- Event sourcing schema — **DDIA Ch. 11**

---

## Phase 4 — Indexing

### 4.1 Index Internals

- B-Tree structure — pages, branching factor, height — **USAR Ch. 1** / **DBCI Ch. 4**
- How a B-Tree lookup, insert, and delete works — **DBCI Ch. 4** / **DBMS Ch. 11**
- Page splits and tree rebalancing — **DBCI Ch. 4**
- Index selectivity and cardinality — **USAR Ch. 2** / **HPMY Ch. 5**

### 4.2 Index Types

- B-Tree index (default) — **USAR Ch. 1** / **PGUA Ch. 7**
- Hash index — **USAR Ch. 8** / **DBCI Ch. 6**
- GiST (Generalized Search Tree) — **PGUA Ch. 11**
- GIN (Generalized Inverted Index) — **PGUA Ch. 11** / **PGIA Ch. 12**
- BRIN (Block Range Index) — **PGUA Ch. 7**
- Bitmap index — **DBMS Ch. 11** / **PGUA Ch. 7**
- Full-text index — **PGUA Ch. 11**
- Spatial index (R-Tree) — **PGUA Ch. 11**
- Clustered vs non-clustered index — **USAR Ch. 5** / **HPMY Ch. 5**

### 4.3 Index Strategies

- Single-column index — **USAR Ch. 2**
- Composite (multi-column) index and column order — **USAR Ch. 2** / **HPMY Ch. 5**
- Covering index (index-only scans) — **USAR Ch. 5** / **HPMY Ch. 5**
- Partial index (filtered index) — **USAR Ch. 8** / **PGUA Ch. 7**
- Expression / functional index — **USAR Ch. 7** / **PGUA Ch. 7**
- Unique index — **USAR Ch. 2**
- Index on foreign keys — **USAR Ch. 3**

### 4.4 Index Pitfalls

- Over-indexing — write overhead — **USAR Ch. 2** / **SQLA Ch. 13**
- Index bloat — **PGUA Ch. 8**
- Index invalidation — implicit type casts, function on column — **USAR Ch. 7**
- Dead tuples and VACUUM (PostgreSQL) — **PGUA Ch. 8**
- When the planner ignores your index — **USAR Ch. 6** / **PGUA Ch. 7**

### 4.5 Query Execution Plans

- EXPLAIN and EXPLAIN ANALYZE — **USAR Ch. 3** / **PGUA Ch. 7**
- Seq Scan vs Index Scan vs Index Only Scan vs Bitmap Scan — **PGUA Ch. 7** / **PGIA Ch. 4**
- Cost model — seq_page_cost, random_page_cost — **PGUA Ch. 7**
- Statistics — pg_statistic, ANALYZE — **PGUA Ch. 8** / **HPMY Ch. 7**
- Planner hints and forcing plans — **HPMY Ch. 7** / **PGUA Ch. 7**

---

## Phase 5 — Transactions and Concurrency

### 5.1 ACID Properties

- Atomicity — all or nothing — **DDIA Ch. 7** / **DBMS Ch. 17**
- Consistency — invariants preserved — **DDIA Ch. 7** / **TRXN Ch. 1**
- Isolation — concurrent transactions don't interfere — **DDIA Ch. 7** / **TRXN Ch. 1**
- Durability — committed data survives crashes — **DDIA Ch. 7** / **TRXN Ch. 1**

### 5.2 Isolation Levels

- Read Uncommitted — **DDIA Ch. 7** / **DBMS Ch. 17**
- Read Committed — **DDIA Ch. 7** / **HPMY Ch. 6**
- Repeatable Read — **DDIA Ch. 7** / **HPMY Ch. 6**
- Serializable — **DDIA Ch. 7** / **DBMS Ch. 17**
- Phenomena — dirty read, non-repeatable read, phantom read, write skew, lost update — **DDIA Ch. 7** / **TRXN Ch. 3**

### 5.3 Locking

- Shared (read) lock vs Exclusive (write) lock — **DBMS Ch. 18** / **HPMY Ch. 6**
- Row-level vs table-level vs page-level locking — **HPMY Ch. 6** / **PGUA Ch. 9**
- Advisory locks — **PGUA Ch. 9**
- Deadlock — detection and prevention — **DBMS Ch. 18** / **DDIA Ch. 7**
- Lock wait timeouts — **HPMY Ch. 6**
- Lock escalation — **TRXN Ch. 8**

### 5.4 MVCC (Multi-Version Concurrency Control)

- How MVCC avoids read locks — **DDIA Ch. 7** / **PGUA Ch. 9**
- Version chains and visibility rules — **HPMY Ch. 6** / **PGUA Ch. 9**
- Transaction IDs and snapshots — **PGUA Ch. 9**
- Dead tuples and vacuum in PostgreSQL — **PGUA Ch. 8**
- MVCC in MySQL (InnoDB undo logs) — **HPMY Ch. 6**

### 5.5 Optimistic vs Pessimistic Concurrency Control

- Optimistic — version columns, compare-and-swap — **DDIA Ch. 7** / **TRXN Ch. 7**
- Pessimistic — SELECT FOR UPDATE, SELECT FOR SHARE — **PGUA Ch. 9** / **HPMY Ch. 6**
- SKIP LOCKED — job queue pattern — **PGIA Ch. 11**
- NOWAIT — **PGUA Ch. 9**

### 5.6 Distributed Transactions

- Two-Phase Commit (2PC) — **DDIA Ch. 9** / **TRXN Ch. 12**
- Three-Phase Commit (3PC) — **TRXN Ch. 12** / **DSYS Ch. 8**
- Saga pattern — choreography and orchestration — **DDIA Ch. 9**
- XA transactions — **HPMY Ch. 11** / **TRXN Ch. 12**

---

## Phase 6 — Performance Tuning

### 6.1 Query Optimization

- Rewriting queries for the planner — **USAR Ch. 6** / **PGIA Ch. 4**
- Avoiding N+1 patterns — **SQLA Ch. 9** / **HPMY Ch. 4**
- Pagination — OFFSET vs keyset (cursor-based) — **USAR Ch. 6** / **PGIA Ch. 11**
- Batch inserts and bulk operations — **HPMY Ch. 4**
- Avoiding unnecessary ORDER BY — **USAR Ch. 6**
- Short-circuit evaluation — **PGIA Ch. 4**

### 6.2 Connection Management

- Connection overhead — **HPMY Ch. 3** / **PGUA Ch. 9**
- Connection pooling — PgBouncer, HikariCP, pgx pool — **PGUA Ch. 9** / **HPMY Ch. 11**
- Pool sizing — the formula — **HPMY Ch. 11**
- Prepared statements — **HPMY Ch. 4** / **LSQL Ch. 15**

### 6.3 Storage and Memory Tuning

- shared_buffers, work_mem, effective_cache_size — **PGUA Ch. 10**
- innodb_buffer_pool_size — **HPMY Ch. 8**
- Checkpoint tuning — **PGUA Ch. 10** / **HPMY Ch. 8**
- WAL configuration — **PGUA Ch. 10**
- Autovacuum tuning — **PGUA Ch. 8**

### 6.4 Schema-Level Performance

- Data type choices — **HPMY Ch. 4** / **PGUA Ch. 4**
- Partitioning as a performance tool — **HPMY Ch. 7** / **PGUA Ch. 12**
- Table statistics and ANALYZE frequency — **PGUA Ch. 8**
- Bloat management — **PGUA Ch. 8**

### 6.5 Benchmarking

- pgbench, sysbench, HammerDB — **PGUA Ch. 10** / **HPMY Ch. 3**
- What to measure — throughput, latency, p95/p99 percentiles — **HPMY Ch. 3**
- Profiling slow queries — pg_stat_statements, slow query log — **PGUA Ch. 10** / **HPMY Ch. 3**
- EXPLAIN buffers and timing — **PGUA Ch. 7** / **PGIA Ch. 4**

---

## Phase 7 — Replication and High Availability

### 7.1 Replication Fundamentals

- Why replicate — durability, read scaling, HA — **DDIA Ch. 5**
- Synchronous vs asynchronous replication — **DDIA Ch. 5** / **HPMY Ch. 9**
- RPO and RTO — **HPMY Ch. 10** / **DDIA Ch. 5**

### 7.2 PostgreSQL Replication

- Streaming replication (WAL shipping) — **PGUA Ch. 12**
- Logical replication — **PGUA Ch. 12**
- Replication slots — **PGUA Ch. 12**
- Cascading replicas — **PGUA Ch. 12**
- Standby and hot standby — **PGUA Ch. 12**

### 7.3 MySQL Replication

- Binary log (binlog) replication — **HPMY Ch. 9**
- Row-based vs statement-based vs mixed replication — **HPMY Ch. 9**
- GTID replication — **HPMY Ch. 9**
- Semi-synchronous replication — **HPMY Ch. 9**
- Group Replication — **HPMY Ch. 9**

### 7.4 Failover and Switchover

- Patroni (PostgreSQL HA) — **PGUA Ch. 12**
- Orchestrator (MySQL HA) — **HPMY Ch. 9**
- Split-brain problem and quorum — **DDIA Ch. 8** / **HPMY Ch. 9**

### 7.5 Backup and Recovery

- Logical backup — pg_dump, mysqldump — **PGUA Ch. 11** / **HPMY Ch. 10**
- Physical backup — pg_basebackup, xtrabackup — **PGUA Ch. 11** / **HPMY Ch. 10**
- Point-in-time recovery (PITR) — **PGUA Ch. 11** / **HPMY Ch. 10**
- Continuous archiving (WAL archiving) — **PGUA Ch. 11**
- Backup verification and restore drills — **HPMY Ch. 10**

---

## Phase 8 — Partitioning and Sharding

### 8.1 Table Partitioning

- Range partitioning — **PGUA Ch. 12** / **HPMY Ch. 7**
- List partitioning — **PGUA Ch. 12** / **HPMY Ch. 7**
- Hash partitioning — **PGUA Ch. 12** / **HPMY Ch. 7**
- Composite partitioning — **HPMY Ch. 7**
- Partition pruning — **PGUA Ch. 12** / **HPMY Ch. 7**
- Partition maintenance — adding, detaching, dropping — **PGUA Ch. 12**

### 8.2 Sharding

- What sharding is and why it exists — **DDIA Ch. 6**
- Shard key selection — the most critical decision — **DDIA Ch. 6** / **MGDB Ch. 14**
- Range-based sharding — **DDIA Ch. 6**
- Hash-based sharding — **DDIA Ch. 6** / **MGDB Ch. 14**
- Directory-based sharding — **DDIA Ch. 6**
- Hotspot problem — **DDIA Ch. 6**
- Cross-shard queries and distributed joins — **DDIA Ch. 6**
- Resharding and rebalancing — **DDIA Ch. 6**

### 8.3 Distributed SQL Databases

- CockroachDB — consensus replication, distributed SQL — **DDIA Ch. 9**
- Citus — PostgreSQL sharding extension — **PGUA Ch. 13**

---

## Phase 9 — NoSQL Databases

### 9.1 Document Databases — MongoDB

- Documents, collections, databases — **MGDB Ch. 2**
- BSON and data types — **MGDB Ch. 2**
- CRUD operations — **MGDB Ch. 3, 4**
- Aggregation pipeline — $match, $group, $project, $lookup, $unwind — **MGDB Ch. 7**
- Indexing in MongoDB — single, compound, multikey, text, geospatial, TTL — **MGDB Ch. 5**
- Schema design — embedding vs referencing — **MGDB Ch. 8**
- Transactions in MongoDB (multi-document) — **MGDB Ch. 8**
- Change streams — **MGDB Ch. 10**
- Replica sets and sharding — **MGDB Ch. 11, 12, 14**

### 9.2 Key-Value Stores — Redis

- Data structures — String, List, Hash, Set, Sorted Set, Stream — **RDIS Ch. 1, 3**
- Persistence — RDB snapshots and AOF — **RDIS Ch. 4**
- Expiry and eviction policies — **RDIS Ch. 4**
- Pub/Sub — **RDIS Ch. 3**
- Redis Streams — **RDIS Ch. 3** (+ Redis official docs)
- Lua scripting — **RDIS Ch. 4**
- Transactions — MULTI/EXEC/DISCARD — **RDIS Ch. 4**
- Redis Cluster and sentinel — **RDIS Ch. 10**
- Use cases — caching, session store, rate limiting, leaderboards, message queue — **RDIS Ch. 2, 5, 6**

### 9.3 Column-Family Stores — Apache Cassandra

- Wide-column model — **CASS Ch. 4**
- Partition key, clustering key, compound primary key — **CASS Ch. 4**
- CQL — **CASS Ch. 5**
- Consistency levels — ONE, QUORUM, ALL — **CASS Ch. 6**
- Tunable consistency (CAP trade-offs) — **CASS Ch. 6**
- Compaction strategies — **CASS Ch. 7**
- Tombstones and anti-patterns — **CASS Ch. 7**

### 9.4 Message Queues as Data Stores — Apache Kafka

- Topics, partitions, offsets — **KAFK Ch. 1, 2**
- Producers and consumers — **KAFK Ch. 3, 4**
- Consumer groups — **KAFK Ch. 4**
- Retention and log compaction — **KAFK Ch. 5**
- At-most-once, at-least-once, exactly-once semantics — **KAFK Ch. 8**
- Kafka Streams and KSQL — **KAFK Ch. 11, 12**
- Kafka as the source of truth (event sourcing) — **DDIA Ch. 11** / **KAFK Ch. 6**

### 9.5 Search Engines — Elasticsearch

- Inverted index — **SRCH Ch. 1** / **DBCI Ch. 7**
- Documents, indices, shards, replicas — **SRCH Ch. 1**
- Mapping and analyzers — **SRCH Ch. 2**
- Query DSL — match, term, bool, range, wildcard, fuzzy — **SRCH Ch. 4**
- Aggregations — **SRCH Ch. 7**
- Relevance scoring — TF-IDF, BM25 — **SRCH Ch. 5**
- Index lifecycle management — **SRCH Ch. 10**

### 9.6 Graph Databases — Neo4j / DGraph

- Nodes, relationships, properties, labels — **DDIA Ch. 2**
- Cypher query language — **DDIA Ch. 2** (+ Neo4j official docs)
- Graph algorithms — shortest path, PageRank, community detection — **DSYS Ch. 6**
- When graph beats relational — **DDIA Ch. 2**

### 9.7 Time-Series Databases — InfluxDB / TimescaleDB

- What makes time-series special — **DDIA Ch. 3**
- Downsampling and rollups — **DDIA Ch. 3**
- Retention policies — InfluxDB docs
- Continuous aggregates (TimescaleDB) — TimescaleDB docs
- Hypertables — TimescaleDB docs

---

## Phase 10 — Distributed Systems Concepts

### 10.1 CAP Theorem

- Consistency, Availability, Partition Tolerance — **DDIA Ch. 9** / **DSYS Ch. 8**
- CP vs AP systems — **DDIA Ch. 9** / **CASS Ch. 6**
- Why "CA" doesn't exist in a distributed network — **DDIA Ch. 9**
- PACELC model — **DDIA Ch. 9**

### 10.2 Consistency Models

- Strong consistency — **DDIA Ch. 9** / **DSYS Ch. 7**
- Sequential consistency — **DSYS Ch. 7**
- Causal consistency — **DDIA Ch. 9** / **DSYS Ch. 7**
- Eventual consistency — **DDIA Ch. 5** / **DSYS Ch. 7**
- Read-your-writes, monotonic reads, monotonic writes — **DDIA Ch. 5**

### 10.3 Consensus Algorithms

- Paxos — basic and multi-Paxos — **DDIA Ch. 9** / **DSYS Ch. 8**
- Raft — leader election, log replication, safety — **DDIA Ch. 9** / **DBCI Ch. 14**
- Zookeeper's ZAB protocol — **KAFK Ch. 2** / **DSYS Ch. 8**

### 10.4 Distributed Clocks and Ordering

- Wall clock vs logical clock — **DDIA Ch. 8** / **DSYS Ch. 6**
- Lamport timestamps — **DDIA Ch. 8** / **DSYS Ch. 6**
- Vector clocks — **DDIA Ch. 8** / **DSYS Ch. 6**
- TrueTime (Google Spanner) — **DDIA Ch. 9**
- Hybrid Logical Clocks (HLC) — **DDIA Ch. 9**

### 10.5 Distributed Storage Internals

- LSM Tree (Log-Structured Merge-Tree) — **DDIA Ch. 3** / **DBCI Ch. 7**
- SSTable and MemTable — **DDIA Ch. 3** / **DBCI Ch. 7**
- Bloom filters — **DDIA Ch. 3** / **DBCI Ch. 7**
- Compaction — size-tiered vs leveled — **DBCI Ch. 7**
- Write amplification and read amplification trade-offs — **DDIA Ch. 3** / **DBCI Ch. 7**

---

## Phase 11 — Security

### 11.1 Authentication and Authorization

- Database users, roles, and privileges — **PGUA Ch. 17** / **HPMY Ch. 15**
- GRANT and REVOKE — **LSQL Ch. 14** / **PGUA Ch. 17**
- Role-based access control (RBAC) — **PGUA Ch. 17** / **HPMY Ch. 15**
- Row-level security (RLS) — **PGUA Ch. 17** / **PGIA Ch. 13**
- Column-level permissions — **PGUA Ch. 17**

### 11.2 Encryption

- Encryption in transit — TLS/SSL — **PGUA Ch. 17** / **HPMY Ch. 15**
- Encryption at rest — **HPMY Ch. 15** / **PGUA Ch. 17**
- Column-level encryption — **HPMY Ch. 15**
- Key management — **HPMY Ch. 15**

### 11.3 Auditing and Compliance

- Audit logging — **PGUA Ch. 17** / **HPMY Ch. 15**
- pgaudit (PostgreSQL), general query log (MySQL) — **PGUA Ch. 17** / **HPMY Ch. 15**
- GDPR and data privacy considerations — **DDIA Ch. 12**
- Data masking and anonymization — **HPMY Ch. 15**
- PII handling in schemas — **DDIA Ch. 12**

### 11.4 SQL Injection Prevention

- Parameterized queries and prepared statements — **SQLA Ch. 14** / **LSQL Ch. 15**
- ORM-level protection — **SQLA Ch. 14**
- Stored procedures as a defense layer — **SQLA Ch. 14**
- Input validation — **SQLA Ch. 14**

---

## Phase 12 — Observability and Operations

### 12.1 Monitoring

- Key metrics — QPS, TPS, latency, cache hit ratio, replication lag — **HPMY Ch. 3** / **PGUA Ch. 10**
- pg_stat_activity, pg_stat_statements, pg_stat_user_tables — **PGUA Ch. 10**
- INFORMATION_SCHEMA and system catalog queries — **PGUA Ch. 10** / **LSQL Ch. 15**
- Prometheus exporters — **HPMY Ch. 3**
- Grafana dashboards — **HPMY Ch. 3**

### 12.2 Logging

- Slow query log — **HPMY Ch. 3** / **PGUA Ch. 10**
- Error log — **HPMY Ch. 3** / **PGUA Ch. 10**
- Deadlock logging — **HPMY Ch. 6** / **PGUA Ch. 9**
- Log shipping to centralized systems — **KAFK Ch. 6**

### 12.3 Maintenance Operations

- VACUUM and ANALYZE in PostgreSQL — **PGUA Ch. 8**
- Table bloat and index bloat detection — **PGUA Ch. 8**
- Online schema changes — pg_repack, pt-online-schema-change — **HPMY Ch. 13** / **PGUA Ch. 8**
- Zero-downtime migrations strategy — **HPMY Ch. 13**

---

## Phase 13 — Migrations and Versioning

### 13.1 Schema Migration Fundamentals

- Forward and rollback migrations — **HPMY Ch. 13**
- Migration as code — **HPMY Ch. 13**
- Idempotent migrations — **HPMY Ch. 13**

### 13.2 Migration Tools

- Flyway — Flyway official docs
- Liquibase — Liquibase official docs
- golang-migrate — golang-migrate GitHub docs
- Atlas — Atlas official docs
- Prisma Migrate — Prisma official docs

### 13.3 Zero-Downtime Migration Patterns

- Expand-Contract pattern (parallel columns) — **HPMY Ch. 13**
- Shadow tables — **HPMY Ch. 13**
- Dual-write strategy — **DDIA Ch. 11**
- Blue-green database deployments — **HPMY Ch. 13**
- Online index builds — **PGUA Ch. 8** / **HPMY Ch. 13**

---

## Phase 14 — ORM and Query Builders

### 14.1 ORM Concepts

- Active Record vs Data Mapper pattern — **SQLA Ch. 9**
- N+1 problem and eager loading — **SQLA Ch. 9** / **HPMY Ch. 4**
- Lazy loading vs eager loading — **SQLA Ch. 9**
- Unit of Work pattern — GORM docs / **SQLA Ch. 9**
- Identity Map — **SQLA Ch. 9**

### 14.2 Go-Specific Tools

- database/sql — the standard library — Go official docs
- sqlx — scanning and named queries — sqlx GitHub docs
- GORM — full ORM — GORM official docs
- sqlc — generate type-safe Go from SQL — sqlc official docs
- Bun — ORM with raw SQL support — Bun official docs
- pgx — PostgreSQL native driver — pgx GitHub docs

### 14.3 ORM Anti-Patterns

- Leaky abstractions hiding bad SQL — **SQLA Ch. 9** / **USAR Ch. 6**
- Over-fetching columns — **SQLA Ch. 9**
- Ignoring transactions in ORM code — **SQLA Ch. 9**
- Schema migration via ORM in production — **HPMY Ch. 13**

---

## Phase 15 — Advanced and Specialized Topics

### 15.1 Query Planning Deep Dive

- Planner statistics and histograms — **PGUA Ch. 7** / **HPMY Ch. 7**
- Join ordering and dynamic programming — **DBMS Ch. 12**
- Genetic Query Optimizer (GEQO) — **PGUA Ch. 7**
- Parallel query execution — **PGUA Ch. 10** / **HPMY Ch. 7**
- JIT compilation (PostgreSQL) — **PGUA Ch. 10**

### 15.2 Stored Procedures and Functions

- PL/pgSQL fundamentals — **PGUA Ch. 6** / **PGIA Ch. 14**
- Functions vs procedures — **PGUA Ch. 6**
- Triggers — BEFORE, AFTER, INSTEAD OF — **LSQL Ch. 14** / **PGUA Ch. 6**
- Trigger use cases and anti-patterns — **SQLA Ch. 10**

### 15.3 Full-Text Search in SQL

- tsvector and tsquery (PostgreSQL) — **PGUA Ch. 11** / **PGIA Ch. 12**
- Text search configurations and dictionaries — **PGUA Ch. 11**
- Ranking — ts_rank, ts_rank_cd — **PGUA Ch. 11**
- GIN indexes for full-text — **PGUA Ch. 11**
- When to reach for Elasticsearch instead — **SRCH Ch. 1**

### 15.4 Geospatial

- PostGIS extension — **PGUA Ch. 11**
- Geometry vs Geography types — **PGUA Ch. 11**
- Spatial indexes — GiST, BRIN for spatial — **PGUA Ch. 11**
- Common spatial queries — within radius, bounding box, nearest neighbor — **PGUA Ch. 11**

### 15.5 HTAP — Hybrid Transactional/Analytical Processing

- OLTP vs OLAP workloads — **DDIA Ch. 3**
- Columnar storage — why it matters for analytics — **DDIA Ch. 3** / **DBCI Ch. 14**
- Column compression — dictionary encoding, RLE, delta encoding — **DDIA Ch. 3**

### 15.6 NewSQL and Modern Databases

- CockroachDB, YugabyteDB, PlanetScale — **DDIA Ch. 9**
- Neon — serverless PostgreSQL — Neon official docs
- Supabase architecture — Supabase official docs

### 15.7 Streaming and Real-Time

- Change Data Capture (CDC) — Debezium, pgoutput — **DDIA Ch. 11** / **KAFK Ch. 6**
- Outbox pattern — **DDIA Ch. 11**
- Transactional outbox with Kafka — **KAFK Ch. 6** / **DDIA Ch. 11**
- Materialized views for real-time dashboards — **DDIA Ch. 11** / **PGUA Ch. 5**

### 15.8 Multi-Model Databases

- PostgreSQL as a multi-model database — **PGUA Ch. 5, 11** / **PGIA Ch. 9**
- FerretDB (MongoDB wire protocol on PostgreSQL) — FerretDB official docs
- SurrealDB — SurrealDB official docs

---

## Phase 16 — System Design with Databases

### 16.1 Database Selection

- Choosing between SQL and NoSQL — **DDIA Ch. 2**
- Polyglot persistence — **DDIA Ch. 2**
- Read-heavy vs write-heavy workloads — **DDIA Ch. 3**
- Consistency requirements — **DDIA Ch. 9**

### 16.2 Caching Architecture

- Cache-aside pattern — **RDIS Ch. 2** / **DDIA Ch. 11**
- Write-through and write-behind — **RDIS Ch. 2** / **DDIA Ch. 11**
- Read-through cache — **RDIS Ch. 2**
- Cache invalidation strategies — **RDIS Ch. 5**
- Redis as L2 cache in front of PostgreSQL — **RDIS Ch. 2, 5**

### 16.3 Common System Design Patterns

- URL shortener — hash storage, redirect counters — **RDIS Ch. 5**
- Rate limiter — Redis sliding window, token bucket — **RDIS Ch. 6**
- Notification system — fan-out on write vs fan-out on read — **DDIA Ch. 11**
- Leaderboard — sorted sets in Redis + periodic sync to PostgreSQL — **RDIS Ch. 5**
- Job/task queue — SKIP LOCKED in PostgreSQL or Redis Streams — **PGIA Ch. 11** / **RDIS Ch. 3**
- Session store — Redis with TTL — **RDIS Ch. 2**
- Search — Elasticsearch + PostgreSQL dual write — **SRCH Ch. 1** / **DDIA Ch. 11**
- Audit log — append-only table + Kafka — **DDIA Ch. 11** / **KAFK Ch. 6**

### 16.4 Capacity Planning

- Estimating storage growth — **DDIA Ch. 1** / **HPMY Ch. 3**
- IOPS requirements — **HPMY Ch. 8** / **DDIA Ch. 1**
- Memory sizing for working set — **HPMY Ch. 8** / **PGUA Ch. 10**
- Read replica scaling model — **DDIA Ch. 5** / **HPMY Ch. 9**

---

## Phase 17 — How to Design a Database for Any System

> This phase teaches the **repeatable process** — the mental framework you apply every time you sit down to design a database from scratch, regardless of the domain (e-commerce, HR, social media, fintech, logistics, SaaS).

### 17.1 Requirements Gathering — Before You Touch a Schema

- Functional requirements — what the system must store and retrieve — **DBDG Ch. 2** / **SDID Vol.1 Ch. 1**
- Non-functional requirements — scale, latency SLAs, consistency guarantees — **SDID Vol.1 Ch. 1** / **DDIA Ch. 1**
- Read/write ratio estimation — **SDID Vol.1 Ch. 2** / **SCLD Ch. 3**
- Data volume estimation — rows/day, growth rate, retention period — **SDID Vol.1 Ch. 2** / **DDIA Ch. 1**
- Query pattern analysis — what queries will run most often — **DDIA Ch. 3** / **HPMY Ch. 4**
- Identifying hot paths vs cold paths — **DDIA Ch. 1** / **SCLD Ch. 5**
- Stakeholder interviews and domain glossary — **DDDG Ch. 1, 2** / **DBDG Ch. 2**

### 17.2 Domain Modeling — Understanding the Business

- Identifying entities and their boundaries — **DDDG Ch. 2** / **DBDG Ch. 3**
- Bounded contexts — where one model ends and another begins — **DDDG Ch. 2, 3**
- Ubiquitous language — naming that matches the business — **DDDG Ch. 1** / **CLDD Ch. 7**
- Aggregates — consistency boundaries in the domain — **DDDG Ch. 6**
- Value objects vs entities — **DDDG Ch. 5** / **PRST Ch. 12**
- Domain events — what happened vs what is — **DDDG Ch. 8** / **DDIA Ch. 11**
- Context mapping — relationships between bounded contexts — **DDDG Ch. 3**

### 17.3 Conceptual Design — The Big Picture

- Building the Entity-Relationship (ER) diagram — **DBMS Ch. 6** / **DBDG Ch. 4, 5**
- Identifying all entities in the domain — **DBDG Ch. 4**
- Defining relationships and cardinality — **DBDG Ch. 5**
- Identifying weak entities and dependent objects — **DBMS Ch. 6** / **DBDG Ch. 4**
- Validating the ER model with stakeholders — **DBDG Ch. 6**
- Tools — dbdiagram.io, draw.io, Lucidchart, ERDPlus

### 17.4 Logical Design — Translating to a Schema

- Converting ER diagram to relational tables — **DBMS Ch. 7** / **DBDG Ch. 7**
- Choosing primary keys — surrogate vs natural — **SQLA Ch. 1** / **DBDG Ch. 7**
- Defining foreign keys and join paths — **DBDG Ch. 8** / **LSQL Ch. 5**
- Applying normalization (1NF → 3NF → BCNF) — **DBMS Ch. 8** / **DBDG Ch. 9, 10**
- Deciding where to stop normalizing — **SQLA Ch. 2** / **HPMY Ch. 4**
- Assigning data types — smallest correct type — **HPMY Ch. 4** / **PGUA Ch. 4**
- Defining all constraints upfront — **LSQL Ch. 13** / **DBDG Ch. 11**
- Documenting the schema with comments and a data dictionary — **DBDG Ch. 12**

### 17.5 Physical Design — Optimizing for the Engine

- Choosing the right database engine(s) — **DDIA Ch. 2** / **SDID Vol.1 Ch. 1**
- Index planning — which columns, which type, covering vs partial — **USAR Ch. 2** / **HPMY Ch. 5**
- Partition strategy — when and how to partition — **PGUA Ch. 12** / **HPMY Ch. 7**
- Storage layout — tablespaces, file groups — **PGUA Ch. 10** / **HPMY Ch. 8**
- Connection pooling and concurrency planning — **PGUA Ch. 9** / **HPMY Ch. 11**
- Identifying tables that need MVCC tuning or aggressive vacuuming — **PGUA Ch. 8**

### 17.6 Scalability Design

- Estimating when a single node will not be enough — **DDIA Ch. 1** / **SCLD Ch. 3**
- Vertical scaling limits and the move to horizontal — **DDIA Ch. 6** / **SCLD Ch. 5**
- Read replica strategy — which queries go to replicas — **DDIA Ch. 5** / **HPMY Ch. 9**
- Caching layer placement — what to cache, TTL decisions — **RDIS Ch. 2** / **SDID Vol.1 Ch. 4**
- Sharding planning — shard key selection, hotspot avoidance — **DDIA Ch. 6** / **SDID Vol.2 Ch. 3**
- Polyglot persistence — which data store owns which domain — **DDIA Ch. 2** / **SDID Vol.1 Ch. 1**
- The AKF Scale Cube — x-axis (cloning), y-axis (decomposition), z-axis (partitioning) — **SCLD Ch. 2**

### 17.7 Designing for Real Systems — Case Studies

#### 17.7.1 E-Commerce Platform

- Product catalog — hierarchical categories, attributes, variants — **DMCB Vol.1 Ch. 4** / **SQLA Ch. 6**
- Inventory and stock management — **SDID Vol.1 Ch. 6** / **DMCB Vol.1 Ch. 5**
- Orders, line items, and order state machine — **PRST Ch. 12** / **DDDG Ch. 6**
- Payments and idempotency keys — **DDIA Ch. 11** / **SDID Vol.1 Ch. 13**
- Cart — ephemeral (Redis) vs persistent (PostgreSQL) — **RDIS Ch. 2** / **SDID Vol.1 Ch. 6**
- Recommendations — event log → analytics DB — **DDIA Ch. 11**

#### 17.7.2 Social Media / Feed System

- Users, profiles, follows (graph-like relations) — **DDIA Ch. 2** / **SDID Vol.1 Ch. 10**
- Posts, comments, likes — write-heavy tables — **SDID Vol.1 Ch. 10** / **HPMY Ch. 4**
- Fan-out on write vs fan-out on read for feed — **DDIA Ch. 11** / **SDID Vol.1 Ch. 10**
- Notification schema — polymorphic events — **SQLA Ch. 3** / **SDID Vol.1 Ch. 10**
- Media metadata — decoupling blob storage from relational — **SDID Vol.1 Ch. 10**
- Counters at scale — approximate counts with Redis HyperLogLog — **RDIS Ch. 1**

#### 17.7.3 HR / Payroll System (your HR360 domain)

- Employee lifecycle — hire, transfer, terminate, rehire — **DMCB Vol.1 Ch. 3**
- Organizational hierarchy — department, team, reporting line — **SQLA Ch. 4** / **DMCB Vol.1 Ch. 3**
- Role and permission schema — RBAC, row-level policies — **PGUA Ch. 17** / **PGIA Ch. 13**
- Payroll runs — audit-safe, immutable pay records — **SQLA Ch. 8** / **PGIA Ch. 10**
- Leave and attendance — time-range data, overlap detection — **PGIA Ch. 10** / **ASQL Ch. 13**
- Payslip generation — snapshotting rates at the time of pay run — **DDIA Ch. 11** / **SQLA Ch. 8**
- Audit trail — append-only ledger pattern — **DDIA Ch. 11** / **SQLA Ch. 8**

#### 17.7.4 Ride-Sharing / Logistics Platform

- Driver and rider profiles — **SDID Vol.2 Ch. 1** / **DMCB Vol.2 Ch. 6**
- Real-time location — PostGIS or Redis Geo — **PGUA Ch. 11** / **RDIS Ch. 1**
- Trip lifecycle — state machine in the DB — **DDDG Ch. 6** / **SDID Vol.2 Ch. 1**
- Fare calculation and pricing history — **DMCB Vol.2 Ch. 6**
- Geofencing — spatial queries for zones — **PGUA Ch. 11**
- ETA estimation — event-driven updates — **DDIA Ch. 11** / **KAFK Ch. 6**

#### 17.7.5 FinTech / Banking System

- Account and balance — never UPDATE balance, use ledger — **DDIA Ch. 11** / **PRST Ch. 11**
- Double-entry bookkeeping schema — **DMCB Vol.2 Ch. 1** / **PGIA Ch. 11**
- Transactions and idempotency — **DDIA Ch. 11** / **SDID Vol.2 Ch. 7**
- Currency and decimal precision — **PGUA Ch. 4** / **SQLA Ch. 11**
- Fraud detection events — append-only event stream — **KAFK Ch. 6** / **DDIA Ch. 11**
- Regulatory audit schema — immutable, timestamped — **SQLA Ch. 8** / **DDIA Ch. 11**

#### 17.7.6 SaaS Multi-Tenant Platform

- Tenant isolation strategies — shared schema, row-level, separate schemas — **PGUA Ch. 14** / **DDIA Ch. 2**
- Row-level security (RLS) for tenant isolation — **PGUA Ch. 17** / **PGIA Ch. 13**
- Subscription and billing schema — **DMCB Vol.2 Ch. 2** / **PRST Ch. 12**
- Feature flags per tenant — **SDID Vol.1 Ch. 1**
- Per-tenant quotas and usage tracking — **RDIS Ch. 6** / **SDID Vol.1 Ch. 4**
- Cross-tenant analytics — separate analytical schema — **DDIA Ch. 3**

#### 17.7.7 URL Shortener

- URL mapping table — hash, original, created_at, hits — **SDID Vol.1 Ch. 7** / **RDIS Ch. 5**
- Click analytics — append-only event table — **DDIA Ch. 11** / **SDID Vol.1 Ch. 7**
- Redis as primary read layer — **RDIS Ch. 2** / **SDID Vol.1 Ch. 7**
- Expiry and soft-delete — **SQLA Ch. 4** / **SDID Vol.1 Ch. 7**

#### 17.7.8 Chat / Messaging System

- Users and conversations schema — **SDID Vol.1 Ch. 11**
- Message table — sender, conversation_id, created_at, content — **SDID Vol.1 Ch. 11** / **KAFK Ch. 1**
- Delivered / read receipts — **SDID Vol.1 Ch. 11**
- Fan-out delivery — Kafka topics per user or per conversation — **KAFK Ch. 4** / **SDID Vol.1 Ch. 11**
- Media attachments — metadata in DB, blob in object store — **SDID Vol.1 Ch. 11**
- Message search — Elasticsearch integration — **SRCH Ch. 4** / **SDID Vol.1 Ch. 11**

#### 17.7.9 Rate Limiter Service

- Token bucket and sliding window log schemas — **SDID Vol.1 Ch. 4** / **RDIS Ch. 6**
- Fixed window counter — Redis INCR with TTL — **RDIS Ch. 6**
- Sliding window log — timestamped entries in Sorted Set — **RDIS Ch. 6**
- Distributed rate limiting — single vs multiple nodes — **SDID Vol.1 Ch. 4**

#### 17.7.10 Search Autocomplete / Typeahead

- Trie storage in Redis Sorted Sets — **RDIS Ch. 1** / **SDID Vol.1 Ch. 12**
- Prefix table in PostgreSQL — GIN index on trigrams — **PGUA Ch. 11** / **PGIA Ch. 12**
- Popularity scores and decay — **SDID Vol.1 Ch. 12**
- Offline vs real-time frequency aggregation — **DDIA Ch. 11** / **SDID Vol.1 Ch. 12**

### 17.8 The Database Design Process — Step by Step

- Step 1: Write down the functional requirements in plain English — **DBDG Ch. 2**
- Step 2: List all the nouns → candidate entities — **DBDG Ch. 3** / **DDDG Ch. 2**
- Step 3: List all the verbs → candidate relationships and events — **DDDG Ch. 8** / **DBDG Ch. 5**
- Step 4: Draw the ER diagram — **DBMS Ch. 6** / **DBDG Ch. 4**
- Step 5: Normalize to 3NF, then deliberately decide where to denormalize — **DBMS Ch. 8** / **SQLA Ch. 2**
- Step 6: Map out the top 10 queries and design indexes for them — **USAR Ch. 2** / **HPMY Ch. 5**
- Step 7: Estimate data volume and decide on partitioning/sharding — **DDIA Ch. 6** / **SDID Vol.1 Ch. 2**
- Step 8: Pick the right store(s) — SQL, document, cache, search, stream — **DDIA Ch. 2** / **SDID Vol.1 Ch. 1**
- Step 9: Plan for migrations from day one — **HPMY Ch. 13** / **DDIA Ch. 4**
- Step 10: Document everything — data dictionary, ER diagram, ADRs — **DBDG Ch. 12**

### 17.9 Common Real-World Design Mistakes

- Designing for today's scale, not tomorrow's — **SCLD Ch. 1** / **DDIA Ch. 1**
- Using EAV instead of proper schema — **SQLA Ch. 6**
- Storing money as FLOAT — **SQLA Ch. 11** / **PGUA Ch. 4**
- Overusing NULLs — **SQLA Ch. 6** / **LSQL Ch. 4**
- Missing indexes on foreign keys — **USAR Ch. 3**
- Not planning for soft deletes and audit trails — **SQLA Ch. 4, 8**
- God table anti-pattern — one table for everything — **SQLA Ch. 6**
- Ignoring timezone handling — storing local time instead of UTC — **SQLA Ch. 12** / **PGUA Ch. 4**
- Not versioning the schema from day one — **HPMY Ch. 13**
- Premature sharding — **DDIA Ch. 6** / **SCLD Ch. 3**

### 17.10 Data Dictionary and Documentation

- Writing a data dictionary — tables, columns, types, constraints, business meaning — **DBDG Ch. 12**
- Architecture Decision Records (ADRs) for schema decisions — **CLDD Ch. 15**
- Diagramming tools — dbdiagram.io, pgModeler, DBeaver ER, DrawSQL
- Keeping documentation in sync with migrations — **HPMY Ch. 13**
- README-driven database design — documenting intent alongside code

---

## Phase 17 — Study Material Summary

### Books for Phase 17 (ordered by priority)

|Priority|Book|Why It Matters for Design|
|---|---|---|
|⭐⭐⭐⭐⭐|_Database Design for Mere Mortals_ — **DBDG**|The most complete step-by-step design process book. Read Ch. 2–12 cover to cover.|
|⭐⭐⭐⭐⭐|_System Design Interview Vol. 1 & 2_ — **SDID**|25+ real system case studies, each with a database design chapter. Hands-on and practical.|
|⭐⭐⭐⭐|_Designing Data-Intensive Applications_ — **DDIA**|The "why" behind every design decision. Ch. 1–3 and Ch. 11 are essential.|
|⭐⭐⭐⭐|_Domain-Driven Design_ — **DDDG**|Teaches you how to model the business domain before touching a schema. Ch. 1–3, 5–6, 8.|
|⭐⭐⭐|_The Data Model Resource Book Vol. 1 & 2_ — **DMCB**|500+ pre-built data models for common domains. A cheat-sheet for real systems.|
|⭐⭐⭐|_SQL Antipatterns_ — **SQLA**|Teaches what NOT to do. Read alongside design (Ch. 1–6, 8, 10–14).|
|⭐⭐⭐|_Patterns of Enterprise Application Architecture_ — **PRST**|Repository, Unit of Work, Identity Map, Optimistic Lock. Ch. 9–18.|
|⭐⭐|_Scalability Rules_ — **SCLD**|How design decisions change at scale. Ch. 1–5.|
|⭐⭐|_Clean Architecture_ — **CLDD**|Boundaries, dependencies, and keeping the database as a detail. Ch. 5–7, 15.|
|⭐|_Database System Concepts_ — **DBMS**|Academic foundation for ER and normalization theory. Ch. 6–8 only.|

### Free Online Resources for Phase 17

- **dbdiagram.io** — https://dbdiagram.io — browser-based ER diagram and schema tool; supports DBML export to SQL
- **DrawSQL** — https://drawsql.app — visual schema designer with community templates for common systems
- **Vertabelo Academy — Database Design course** — https://vertabelo.com/blog/database-design
- **CMU 15-445 Database Systems — Andy Pavlo lectures** — https://15445.courses.cs.cmu.edu — Lectures 1–4 cover design foundations
- **Hussein Nasser YouTube — Database Engineering** — https://www.youtube.com/@hnasr — real-world schema and design walkthroughs
- **Arpit Bhayani YouTube** — https://www.youtube.com/@AsliEngineering — system design with database deep-dives
- **bytebytego.com** — Alex Xu's newsletter and YouTube (companion to SDID books)
- **pgmodeler.io** — open-source PostgreSQL data modeler with ER diagrams

### Practice Projects for Phase 17

Work through these in order — each one adds a new design challenge:

1. **Library Management System** — Simple CRUD, relationships, borrowing state machine
2. **E-Commerce Store** — Products with variants, orders, inventory, payments
3. **HR & Payroll System** — Organizational hierarchy, roles, payroll runs, audit trail _(your HR360 domain — design it from scratch and compare)_
4. **Social Network** — Follows, feed, notifications, polymorphic likes
5. **Ride-Sharing App** — Real-time location, trip states, fare ledger
6. **Banking Ledger** — Double-entry bookkeeping, immutable transactions, balance queries
7. **SaaS Platform** — Multi-tenancy, subscriptions, per-tenant feature flags
8. **Real-Time Chat** — Messages, delivery receipts, search, media metadata
9. **Analytics Dashboard** — OLTP source + OLAP read model, materialized views, aggregations

---

## Recommended Reading Order

```
1.  Learning SQL (LSQL)                    — SQL grammar foundation
2.  Use The Index, Luke (USAR)             — free online; read alongside SQL study
3.  SQL Antipatterns (SQLA)               — pitfalls to avoid from day one
4.  Database Design for Mere Mortals (DBDG)— the design process, start to finish ← NEW
5.  Domain-Driven Design (DDDG)           — how to model business domains ← NEW
6.  PostgreSQL: Up and Running (PGUA)     — your primary database, deeply
7.  The Art of PostgreSQL (PGIA)          — graduate-level PostgreSQL
8.  High Performance MySQL (HPMY)         — second relational database
9.  Database Internals (DBCI)             — how engines actually work
10. Designing Data-Intensive Apps (DDIA)  — the capstone book; read twice
11. System Design Interview Vol. 1 (SDID) — case studies with DB design ← NEW
12. System Design Interview Vol. 2 (SDID) — more case studies ← NEW
13. SQL Cookbook (ASQL)                   — reference for advanced SQL patterns
14. Transaction Processing (TRXN)         — academic depth on ACID and locking
15. Patterns of Enterprise App. Arch (PRST)— repository and data patterns ← NEW
16. The Data Model Resource Book (DMCB)   — pre-built models for real domains ← NEW
17. Redis in Action (RDIS)                — matches your existing Redis usage
18. MongoDB: The Definitive Guide (MGDB)  — document model deep dive
19. Kafka: The Definitive Guide (KAFK)    — matches your existing Kafka usage
20. Cassandra: The Definitive Guide (CASS)
21. Elasticsearch: The Definitive Guide (SRCH)
22. Scalability Rules (SCLD)              — design decisions at scale ← NEW
23. Clean Architecture (CLDD)             — database as a detail ← NEW
24. Distributed Systems (DSYS)            — theoretical capstone
25. Database System Concepts (DBMS)       — academic reference; dip in per phase
```

---

## Supplementary Free Resources

```
1. Learning SQL (LSQL)                  — SQL grammar foundation
2. Use The Index, Luke (USAR)           — free online; read alongside SQL study
3. SQL Antipatterns (SQLA)              — pitfalls to avoid from day one
4. PostgreSQL: Up and Running (PGUA)    — your primary database, deeply
5. The Art of PostgreSQL (PGIA)         — graduate-level PostgreSQL
6. High Performance MySQL (HPMY)        — second relational database
7. Database Internals (DBCI)            — how engines actually work
8. Designing Data-Intensive Apps (DDIA) — the capstone book; read twice
9. SQL Cookbook (ASQL)                  — reference for advanced SQL patterns
10. Transaction Processing (TRXN)       — academic depth on ACID and locking
11. Redis in Action (RDIS)              — matches your existing Redis usage
12. MongoDB: The Definitive Guide (MGDB)— document model deep dive
13. Kafka: The Definitive Guide (KAFK)  — matches your existing Kafka usage
14. Cassandra: The Definitive Guide (CASS)
15. Elasticsearch: The Definitive Guide (SRCH)
16. Distributed Systems (DSYS)          — theoretical capstone
17. Database System Concepts (DBMS)     — academic reference; dip in per phase
```

---

## Supplementary Free Resources

- **Use The Index, Luke** — https://use-the-index-luke.com (Phases 4–6)
- **PostgreSQL official documentation** — https://www.postgresql.org/docs (all PostgreSQL phases)
- **The Internals of PostgreSQL** — https://www.interdb.jp/pg (deep internals supplement)
- **Martin Kleppmann's blog** — https://martin.kleppmann.com (distributed systems)
- **CMU Database Group YouTube** — Andy Pavlo's lectures (Phases 1, 4, 5, 10)
- **Raft visualization** — https://raft.github.io (Phase 10.3)
- **dbdiagram.io** — https://dbdiagram.io (Phase 17 — schema design tool)
- **DrawSQL** — https://drawsql.app (Phase 17 — visual ER diagrams with templates)
- **Hussein Nasser YouTube** — https://www.youtube.com/@hnasr (Phase 17 — real-world DB design)
- **Arpit Bhayani YouTube** — https://www.youtube.com/@AsliEngineering (Phase 17 — system design + DB)
- **bytebytego.com** — https://bytebytego.com (Phase 17 — companion to SDID books)
- **Vertabelo DB Design Blog** — https://vertabelo.com/blog/database-design (Phase 17 — design articles)

---

_Total: 25 books + official docs for tooling-specific topics. DDIA, DBDG, and USAR are the three most important purchases if you had to prioritize._