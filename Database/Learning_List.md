## 🏗 Phase 1 — Foundations

### 🔧 How Databases Work Internally
- What a Database Actually Is [[Theory/1.1.How_Database_works#What is a Database?]]
- The Role of the Database Engine [[Theory/1.1.How_Database_works#The Database Engine]]
- How Data is Stored on Disk [[Theory/1.1.How_Database_works#How Data is Stored on Disk]]
- Buffer Pool / Buffer Cache [[Theory/1.1.How_Database_works#Buffer Pool]]
- How a Database Boots and Shuts Down [[Theory/1.1.How_Database_works#Startup and Shutdown]]
- Write-Ahead Log (WAL) [[Theory/1.2.Database_crash_and_recovery#Write-Ahead Log (WAL)]]
- Crash Recovery Fundamentals [[Theory/1.2.Database_crash_and_recovery]]
- Checkpointing [[Theory/1.2.Database_crash_and_recovery#Checkpointing]]

### 🗂 Data Models
- Relational Model [[Theory/1.3.Database_model#Relational Model]]
- Document Model [[Theory/1.3.Database_model#Document Model]]
- Key-Value Model [[Theory/1.3.Database_model#Key-Value Model]]
- Column-Family Model [[Theory/1.3.Database_model#Column-Family Model]]
- Graph Model [[Theory/1.3.Database_model#Graph Model]]
- Time-Series Model [[Theory/1.3.Database_model#Time-Series Model]]
- Search / Inverted Index Model [[Theory/1.3.Database_model#Search and Inverted Index Model]]
- When to Pick Which Model [[Theory/1.3.Database_model#Choosing the Right Model]]

### 🔗 The Relational Model Deep Dive
- Relations, Tuples, Attributes [[Theory/1.4.Relational_Model#Relations Tuples and Attributes]]
- NULL Semantics and Three-Valued Logic [[Theory/1.4.Relational_Model#NULL Semantics]]
- Primary Keys, Candidate Keys, Surrogate vs Natural Keys [[Theory/1.4.Relational_Model#Keys]]
- Foreign Keys and Referential Integrity [[Theory/1.4.Relational_Model#Foreign Keys]]
- Constraints — CHECK, UNIQUE, NOT NULL, DEFAULT [[Theory/1.4.Relational_Model#Constraints]]
- Sequences and Auto-Increment [[Theory/1.4.Relational_Model#Sequences]]

---

## 💾 Phase 2 — SQL Mastery

### 📝 SQL Fundamentals
- DDL — CREATE, ALTER, DROP, TRUNCATE [[Theory/2.1.sql_fundamental#DDL]]
- DML — INSERT, UPDATE, DELETE, MERGE/UPSERT [[Theory/2.1.sql_fundamental#DML]]
- DQL — SELECT and Full Clause Order [[Theory/2.1.sql_fundamental#DQL]]
- TCL — BEGIN, COMMIT, ROLLBACK, SAVEPOINT [[Theory/2.1.sql_fundamental#TCL]]

### 🔍 Querying
- WHERE, ORDER BY, LIMIT/OFFSET [[Theory/2.2Querying#WHERE ORDER BY LIMIT]]
- DISTINCT [[Theory/2.2Querying#DISTINCT]]
- Aliases — Column and Table [[Theory/2.2Querying#Aliases]]
- CASE Expressions [[Theory/2.2Querying#CASE Expressions]]
- NULL Handling — IS NULL, COALESCE, NULLIF [[Theory/2.2Querying#NULL Handling]]

### 🔀 Joins
- INNER JOIN [[Theory/2.3.Joins#INNER JOIN]]
- LEFT / RIGHT OUTER JOIN [[Theory/2.3.Joins#OUTER JOIN]]
- FULL OUTER JOIN [[Theory/2.3.Joins#FULL OUTER JOIN]]
- CROSS JOIN [[Theory/2.3.Joins#CROSS JOIN]]
- SELF JOIN [[Theory/2.3.Joins#SELF JOIN]]
- LATERAL JOIN [[Theory/2.3.Joins#LATERAL JOIN]]
- Join Algorithms — Nested Loop, Hash Join, Merge Join [[Theory/2.4.joining_algorithm]]
- How the Planner Picks a Join Strategy [[Theory/2.5.Joining_plan]]

### 📊 Aggregation
- GROUP BY and HAVING [[Theory/2.6.Aggregation#GROUP BY and HAVING]]
- COUNT, SUM, AVG, MIN, MAX [[Theory/2.6.Aggregation#Aggregate Functions]]
- FILTER Clause on Aggregates [[Theory/2.6.Aggregation#FILTER Clause]]
- DISTINCT Inside Aggregates [[Theory/2.6.Aggregation#DISTINCT in Aggregates]]

### 🔁 Subqueries
- Scalar Subqueries [[Theory/2.7.Subqueries#Scalar Subqueries]]
- Correlated Subqueries [[Theory/2.7.Subqueries#Correlated Subqueries]]
- EXISTS / NOT EXISTS [[Theory/2.7.Subqueries#EXISTS]]
- ANY / ALL / IN / NOT IN [[Theory/2.7.Subqueries#ANY ALL IN]]

### 🪢 Common Table Expressions (CTEs)
- Non-Recursive CTEs [[Theory/2.8.CommonTableExpressions(CTEs)#Non-Recursive CTEs]]
- Recursive CTEs — Trees, Graphs, Sequences [[Theory/2.8.CommonTableExpressions(CTEs)#Recursive CTEs]]
- Materialized vs Non-Materialized CTEs [[Theory/2.8.CommonTableExpressions(CTEs)#Materialized CTEs]]

### 🪟 Window Functions
- OVER Clause — PARTITION BY, ORDER BY, FRAME [[Theory/2.9.Windows_Functions#OVER Clause]]
- Ranking — ROW_NUMBER, RANK, DENSE_RANK, NTILE [[Theory/2.9.Windows_Functions#Ranking Functions]]
- Offset — LAG, LEAD, FIRST_VALUE, LAST_VALUE [[Theory/2.9.Windows_Functions#Offset Functions]]
- Aggregates as Window Functions [[Theory/2.9.Windows_Functions#Aggregate Window Functions]]
- Frame Specifications — ROWS vs RANGE vs GROUPS [[Theory/2.9.Windows_Functions#Frame Specifications]]

### ⚡ Advanced SQL
- UNION, INTERSECT, EXCEPT [[Theory/2.10.Advance_query#Set Operations]]
- PIVOT and UNPIVOT [[Theory/2.10.Advance_query#PIVOT UNPIVOT]]
- GROUPING SETS, ROLLUP, CUBE [[Theory/2.10.Advance_query#Grouping Sets]]
- JSON Functions and Operators [[Theory/2.10.Advance_query#JSON Functions]]
- Upsert Patterns — INSERT ... ON CONFLICT [[Theory/2.10.Advance_query#Upsert Patterns]]

---

## 🎨 Phase 3 — Database Design

### 🧩 Entity-Relationship (ER) Modeling
- Entities, Attributes, Relationships [[Theory/3.1.Entity-Relationship(ER)Modeling#Entities and Attributes]]
- Cardinality — One-to-One, One-to-Many, Many-to-Many [[Theory/3.1.Entity-Relationship(ER)Modeling#Cardinality]]
- Weak Entities [[Theory/3.1.Entity-Relationship(ER)Modeling#Weak Entities]]
- ER Diagrams — Chen Notation, Crow's Foot [[Theory/3.1.Entity-Relationship(ER)Modeling#ER Diagrams]]
- Converting ER to Relational Schema [[Theory/3.1.Entity-Relationship(ER)Modeling#ER to Schema]]

### 🧮 Normalization
- Functional Dependencies [[Theory/3.2.1.Normalization#Functional Dependencies]]
- 1NF — Atomic Values, No Repeating Groups [[Theory/3.2.1.Normalization#1NF]]
- 2NF — No Partial Dependencies [[Theory/3.2.1.Normalization#2NF]]
- 3NF — No Transitive Dependencies [[Theory/3.2.1.Normalization#3NF]]
- BCNF — Boyce-Codd Normal Form [[Theory/3.2.1.Normalization#BCNF]]
- 4NF and 5NF [[Theory/3.2.2.Normalization_from3nf]]
- When to Stop Normalizing [[Theory/3.2.2.Normalization_from3nf#Pragmatic Trade-offs]]

### 🔄 Denormalization
- Why and When to Denormalize [[Theory/3.3.Denormalization#Why Denormalize]]
- Redundant Columns for Read Performance [[Theory/3.3.Denormalization#Redundant Columns]]
- Pre-Aggregated Summary Tables [[Theory/3.3.Denormalization#Summary Tables]]
- Trade-offs — Write Amplification vs Read Speed [[Theory/3.3.Denormalization#Trade-offs]]

### 🏛 Schema Design Patterns
- Lookup / Reference Tables [[Theory/3.4.1.schema_design_pattern#Lookup Tables]]
- Audit / History Tables (Temporal Data) [[Theory/3.4.1.schema_design_pattern#Audit Tables]]
- Soft Delete Patterns [[Theory/3.4.1.schema_design_pattern#Soft Delete]]
- Polymorphic Associations [[Theory/3.4.1.schema_design_pattern#Polymorphic Associations]]
- Entity-Attribute-Value (EAV) — and Why to Avoid It [[Theory/3.4.1.schema_design_pattern#EAV Pattern]]
- Multi-Tenancy Patterns [[Theory/3.4.2.schema_design_pattern#Multi-Tenancy]]
- Hierarchical Data — Adjacency List, Nested Sets, Closure Table [[Theory/3.4.2.schema_design_pattern#Hierarchical Data]]
- Time-Series Schema Design [[Theory/3.4.2.schema_design_pattern#Time-Series Schema]]
- Event Sourcing Schema [[Theory/3.4.2.schema_design_pattern#Event Sourcing]]

---

## 📇 Phase 4 — Indexing

### 🌲 Index Internals
- B-Tree Structure — Pages, Branching Factor, Height [[Theory/4.1.Index#B-Tree Structure]]
- How a B-Tree Lookup, Insert, and Delete Works [[Theory/4.1.Index#B-Tree Operations]]
- Index Selectivity and Cardinality [[Theory/4.1.Index#Selectivity and Cardinality]]

### 🗂 Index Types
- B-Tree Index (Default) [[Theory/4.2.1.index_type#B-Tree Index]]
- Hash Index [[Theory/4.2.1.index_type#Hash Index]]
- GiST (Generalized Search Tree) [[Theory/4.2.1.index_type#GiST]]
- GIN (Generalized Inverted Index) [[Theory/4.2.1.index_type#GIN]]
- BRIN (Block Range Index) [[Theory/4.2.1.index_type#BRIN]]
- Full-Text Index [[Theory/4.2.2.index_type#Full-Text Index]]
- Spatial Index (R-Tree) [[Theory/4.2.2.index_type#Spatial Index]]
- Clustered vs Non-Clustered Index [[Theory/4.2.2.index_type#Clustered vs Non-Clustered]]

### 🎯 Index Strategies
- Single-Column Index [[Theory/4.3.1.index_stratage#Single-Column Index]]
- Composite (Multi-Column) Index and Column Order [[Theory/4.3.1.index_stratage#Composite Index]]
- Covering Index (Index-Only Scans) [[Theory/4.3.1.index_stratage#Covering Index]]
- Partial Index (Filtered Index) [[Theory/4.3.1.index_stratage#Partial Index]]
- Expression / Functional Index [[Theory/4.3.1.index_stratage#Functional Index]]
- Unique Index [[Theory/4.3.2.index_sratage#Unique Index]]
- Index on Foreign Keys [[Theory/4.3.2.index_sratage#Foreign Key Index]]

### ⚠ Index Pitfalls
- Over-Indexing — Write Overhead [[Theory/4.4.index_pitfall#Over-Indexing]]
- Index Bloat [[Theory/4.4.index_pitfall#Index Bloat]]
- Index Invalidation — Implicit Type Casts [[Theory/4.4.index_pitfall#Index Invalidation]]
- Dead Tuples and VACUUM [[Theory/4.4.index_pitfall#Dead Tuples and VACUUM]]
- When the Planner Ignores Your Index [[Theory/4.4.index_pitfall#Planner Ignoring Index]]

### 🔬 Query Execution Plans
- EXPLAIN and EXPLAIN ANALYZE [[Theory/4.5.QueryExecutionPlans#EXPLAIN]]
- Seq Scan vs Index Scan vs Index Only Scan vs Bitmap Scan [[Theory/4.5.QueryExecutionPlans#Scan Types]]
- Cost Model — seq_page_cost, random_page_cost [[Theory/4.5.QueryExecutionPlans#Cost Model]]
- Statistics — pg_statistic, ANALYZE [[Theory/4.5.QueryExecutionPlans#Statistics]]

---

## 🔐 Phase 5 — Transactions and Concurrency

### ⚛ ACID Properties
- Atomicity — All or Nothing [[Theory/5.1.ACID_Properties#Atomicity]]
- Consistency — Invariants Preserved [[Theory/5.1.ACID_Properties#Consistency]]
- Isolation — Concurrent Transactions [[Theory/5.1.ACID_Properties#Isolation]]
- Durability — Committed Data Survives Crashes [[Theory/5.1.ACID_Properties#Durability]]

### 🏔 Isolation Levels
- Read Uncommitted [[Theory/5.2.Isolation_Levels#Read Uncommitted]]
- Read Committed [[Theory/5.2.Isolation_Levels#Read Committed]]
- Repeatable Read [[Theory/5.2.Isolation_Levels#Repeatable Read]]
- Serializable [[Theory/5.2.Isolation_Levels#Serializable]]
- Phenomena — Dirty Read, Non-Repeatable Read, Phantom Read, Write Skew [[Theory/5.2.Isolation_Levels#Concurrency Phenomena]]

### 🔒 Locking
- Shared Lock vs Exclusive Lock [[Theory/5.3.Locking#Shared vs Exclusive]]
- Row-Level vs Table-Level vs Page-Level Locking [[Theory/5.3.Locking#Lock Granularity]]
- Advisory Locks [[Theory/5.3.Locking#Advisory Locks]]
- Deadlock — Detection and Prevention [[Theory/5.3.Locking#Deadlock]]
- Lock Wait Timeouts [[Theory/5.3.Locking#Lock Timeouts]]

### 🌀 MVCC (Multi-Version Concurrency Control)
- How MVCC Avoids Read Locks [[Theory/5.4.(Multi-VersionConcurrencyControl)#How MVCC Works]]
- Version Chains and Visibility Rules [[Theory/5.4.(Multi-VersionConcurrencyControl)#Version Chains]]
- Dead Tuples and Vacuum in PostgreSQL [[Theory/5.4.(Multi-VersionConcurrencyControl)#Dead Tuples]]
- MVCC in MySQL (InnoDB Undo Logs) [[Theory/5.4.(Multi-VersionConcurrencyControl)#MySQL MVCC]]

### ⚖ Optimistic vs Pessimistic Concurrency
- Optimistic — Version Columns, Compare-and-Swap [[Theory/5.5.OptimisticvsPessimistic#Optimistic Concurrency]]
- Pessimistic — SELECT FOR UPDATE, SELECT FOR SHARE [[Theory/5.5.OptimisticvsPessimistic#Pessimistic Concurrency]]
- SKIP LOCKED — Job Queue Pattern [[Theory/5.5.OptimisticvsPessimistic#SKIP LOCKED]]

### 🌐 Distributed Transactions
- Two-Phase Commit (2PC) [[Theory/5.6.DistributedTransactions#Two-Phase Commit]]
- Three-Phase Commit (3PC) [[Theory/5.6.DistributedTransactions#Three-Phase Commit]]
- Saga Pattern — Choreography and Orchestration [[Theory/5.6.DistributedTransactions#Saga Pattern]]
- XA Transactions [[Theory/5.6.DistributedTransactions#XA Transactions]]

---

## ⚡ Phase 6 — Performance Tuning

### 🚀 Query Optimization
- Rewriting Queries for the Planner [[Theory/6.1.QueryOptimization#Query Rewriting]]
- Avoiding N+1 Patterns [[Theory/6.1.QueryOptimization#N+1 Problem]]
- Pagination — OFFSET vs Keyset (Cursor-Based) [[Theory/6.1.QueryOptimization#Pagination]]
- Batch Inserts and Bulk Operations [[Theory/6.1.QueryOptimization#Bulk Operations]]

### 🔌 Connection Management
- Connection Overhead [[Theory/6.2.ConnectionManagement#Connection Overhead]]
- Connection Pooling — PgBouncer, HikariCP [[Theory/6.2.ConnectionManagement#Connection Pooling]]
- Pool Sizing — The Formula [[Theory/6.2.ConnectionManagement#Pool Sizing]]
- Prepared Statements [[Theory/6.2.ConnectionManagement#Prepared Statements]]

### 🧠 Storage and Memory Tuning
- shared_buffers, work_mem, effective_cache_size (PostgreSQL) [[Theory/6.3.StorageandMemoryTuning#PostgreSQL Memory]]
- innodb_buffer_pool_size (MySQL) [[Theory/6.3.StorageandMemoryTuning#MySQL Memory]]
- Checkpoint Tuning [[Theory/6.3.StorageandMemoryTuning#Checkpoint Tuning]]
- WAL Configuration [[Theory/6.3.StorageandMemoryTuning#WAL Configuration]]
- Autovacuum Tuning [[Theory/6.3.StorageandMemoryTuning#Autovacuum]]

### 🏗 Schema-Level Performance
- Data Type Choices — Using the Smallest Correct Type [[Theory/6.4.Schema-LevelPerformance#Data Types]]
- Partitioning as a Performance Tool [[Theory/6.4.Schema-LevelPerformance#Partitioning]]
- Bloat Management [[Theory/6.4.Schema-LevelPerformance#Bloat Management]]

### 📏 Benchmarking
- pgbench, sysbench, HammerDB [[Theory/6.5.Benchmarking#Benchmark Tools]]
- What to Measure — Throughput, Latency, p95/p99 [[Theory/6.5.Benchmarking#Metrics]]
- Profiling Slow Queries — pg_stat_statements, Slow Query Log [[Theory/6.5.Benchmarking#Profiling]]

---

## 🔄 Phase 7 — Replication and High Availability

### 📡 Replication Fundamentals
- Why Replicate — Durability, Read Scaling, HA [[Theory/7.1ReplicationFundamentals#Why Replicate]]
- Synchronous vs Asynchronous Replication [[Theory/7.1ReplicationFundamentals#Sync vs Async]]
- RPO and RTO — Recovery Objectives [[Theory/7.1ReplicationFundamentals#RPO and RTO]]

### 🐘 PostgreSQL Replication
- Streaming Replication (WAL Shipping) [[Theory/7.2.PostgreSQLReplication#Streaming Replication]]
- Logical Replication [[Theory/7.2.PostgreSQLReplication#Logical Replication]]
- Replication Slots [[Theory/7.2.PostgreSQLReplication#Replication Slots]]
- Cascading Replicas [[Theory/7.2.PostgreSQLReplication#Cascading Replicas]]

---

## 🗃 Phase 8 — Partitioning and Sharding

### ✂ Table Partitioning
- Range Partitioning [[Theory/8.1.TablePartitioning#Range Partitioning]]
- List Partitioning [[Theory/8.1.TablePartitioning#List Partitioning]]
- Hash Partitioning [[Theory/8.1.TablePartitioning#Hash Partitioning]]
- Composite Partitioning [[Theory/8.1.TablePartitioning#Composite Partitioning]]
- Partition Pruning [[Theory/8.1.TablePartitioning#Partition Pruning]]
- Partition Maintenance — Adding, Detaching, Dropping [[Theory/8.1.TablePartitioning#Partition Maintenance]]

### 🔀 Sharding
- What Sharding Is and Why It Exists [[Theory/8.2.Sharding#What is Sharding]]
- Shard Key Selection — The Most Critical Decision [[Theory/8.2.Sharding#Shard Key Selection]]
- Range-Based Sharding [[Theory/8.2.Sharding#Range-Based Sharding]]
- Hash-Based Sharding [[Theory/8.2.Sharding#Hash-Based Sharding]]
- Directory-Based Sharding [[Theory/8.2.Sharding#Directory-Based Sharding]]
- Hotspot Problem [[Theory/8.2.Sharding#Hotspot Problem]]
- Cross-Shard Queries and Distributed Joins [[Theory/8.2.Sharding#Cross-Shard Queries]]
- Resharding and Rebalancing [[Theory/8.2.Sharding#Resharding]]

---

## 🌐 Phase 9 — Distributed Systems Concepts

### 📐 CAP Theorem
- Consistency, Availability, Partition Tolerance [[Theory/9.1.CAP Theoram#CAP Overview]]
- CP vs AP Systems [[Theory/9.2.CPvsAPvsNOT_CA#CP Systems]]
- Why "CA" Doesn't Exist in a Distributed Network [[Theory/9.2.CPvsAPvsNOT_CA#No CA Systems]]
- PACELC Model (Extension of CAP) [[Theory/9.2.CPvsAPvsNOT_CA#PACELC]]

### ⚡ Consistency Models
- Strong Consistency [[Theory/9.3.Consistency_Model#Strong Consistency]]
- Sequential Consistency [[Theory/9.3.Consistency_Model#Sequential Consistency]]
- Causal Consistency [[Theory/9.3.Consistency_Model#Causal Consistency]]
- Eventual Consistency [[Theory/9.3.Consistency_Model#Eventual Consistency]]
- Read-Your-Writes, Monotonic Reads [[Theory/9.3.Consistency_Model#Monotonic Reads]]

### 🗳 Consensus Algorithms
- Paxos — Basic and Multi-Paxos [[Theory/9.4.ConsensusAlgorithms#Paxos]]
- Raft — Leader Election, Log Replication, Safety [[Theory/9.4.ConsensusAlgorithms#Raft]]
- Zookeeper's ZAB Protocol [[Theory/9.4.ConsensusAlgorithms#ZAB Protocol]]

### ⏱ Distributed Clocks and Ordering
- Wall Clock vs Logical Clock [[Theory/9.5.DistributedClocksandOrdering#Logical Clocks]]
- Lamport Timestamps [[Theory/9.5.DistributedClocksandOrdering#Lamport Timestamps]]
- Vector Clocks [[Theory/9.5.DistributedClocksandOrdering#Vector Clocks]]
- TrueTime (Google Spanner) [[Theory/9.5.DistributedClocksandOrdering#TrueTime]]
- Hybrid Logical Clocks (HLC) [[Theory/9.5.DistributedClocksandOrdering#Hybrid Logical Clocks]]

### 💽 Distributed Storage Internals
- LSM Tree (Log-Structured Merge-Tree) — RocksDB, LevelDB, Cassandra [[Theory/9.6.Distributed_Storage_Internals#LSM Tree]]
- SSTable and MemTable [[Theory/9.6.Distributed_Storage_Internals#SSTable and MemTable]]
- Bloom Filters [[Theory/9.6.Distributed_Storage_Internals#Bloom Filters]]
- Compaction — Size-Tiered vs Leveled [[Theory/9.6.Distributed_Storage_Internals#Compaction]]
- Write Amplification and Read Amplification Trade-offs [[Theory/9.6.Distributed_Storage_Internals#Amplification Trade-offs]]

---

## 🔐 Phase 10 — Security

### 🛡 Authentication and Authorization
- Database Users, Roles, and Privileges [[Theory/10.1.Authentication_and_Authorization#Users and Roles]]
- GRANT and REVOKE [[Theory/10.1.Authentication_and_Authorization#GRANT and REVOKE]]
- Role-Based Access Control (RBAC) [[Theory/10.1.Authentication_and_Authorization#RBAC]]
- Row-Level Security (RLS) — PostgreSQL [[Theory/10.1.Authentication_and_Authorization#Row-Level Security]]
- Column-Level Permissions [[Theory/10.1.Authentication_and_Authorization#Column-Level Permissions]]

### 🗓 Auditing and Compliance
- Audit Logging — Who Ran What, When [[Theory/10.2.Database Auditing_and_Compliance#Audit Logging]]
- pgaudit (PostgreSQL), General Query Log (MySQL) [[Theory/10.2.Database Auditing_and_Compliance#Audit Tools]]
- GDPR and Data Privacy Considerations [[Theory/10.2.Database Auditing_and_Compliance#GDPR]]
- Data Masking and Anonymization [[Theory/10.2.Database Auditing_and_Compliance#Data Masking]]

### 💉 SQL Injection Prevention
- Parameterized Queries and Prepared Statements [[Theory/10.3.SQL_Injection_Prevention#Parameterized Queries]]
- ORM-Level Protection [[Theory/10.3.SQL_Injection_Prevention#ORM Protection]]
- Stored Procedures as a Defense Layer [[Theory/10.3.SQL_Injection_Prevention#Stored Procedures Defense]]
- Input Validation [[Theory/10.3.SQL_Injection_Prevention#Input Validation]]

### 🔑 Database Encryption
- Encryption in Transit — TLS/SSL [[Theory/10.4.Database_Encryption#Encryption in Transit]]
- Encryption at Rest [[Theory/10.4.Database_Encryption#Encryption at Rest]]
- Column-Level Encryption [[Theory/10.4.Database_Encryption#Column-Level Encryption]]
- Key Management [[Theory/10.4.Database_Encryption#Key Management]]

---

## 📊 Phase 11 — Observability and Operations

### 📈 Monitoring
- Key Metrics — QPS, TPS, Latency, Cache Hit Ratio [[Theory/11.1.Monitoring#Key Metrics]]
- pg_stat_activity, pg_stat_statements, pg_stat_user_tables [[Theory/11.1.Monitoring#PostgreSQL Stats]]
- Prometheus Exporters — postgres_exporter, mysqld_exporter [[Theory/11.1.Monitoring#Prometheus Exporters]]
- Grafana Dashboards [[Theory/11.1.Monitoring#Grafana]]

### 📋 Logging
- Slow Query Log [[Theory/11.2.Logging#Slow Query Log]]
- Error Log [[Theory/11.2.Logging#Error Log]]
- Deadlock Logging [[Theory/11.2.Logging#Deadlock Logging]]
- Log Shipping to Centralized Systems (ELK, Loki) [[Theory/11.2.Logging#Centralized Logging]]

---

## 🧪 Phase 12 — Advanced and Specialized Topics

### 🗺 Query Planning Deep Dive
- Planner Statistics and Histograms [[Theory/12.1.Query_Planning#Planner Statistics]]
- Join Ordering and Dynamic Programming [[Theory/12.1.Query_Planning#Join Ordering]]
- Parallel Query Execution [[Theory/12.1.Query_Planning#Parallel Query]]
- JIT Compilation (PostgreSQL) [[Theory/12.1.Query_Planning#JIT Compilation]]

### 🔧 Stored Procedures and Functions
- PL/pgSQL Fundamentals [[Theory/12.2.StoredProceduresandFunctions#PL/pgSQL]]
- Functions vs Procedures [[Theory/12.2.StoredProceduresandFunctions#Functions vs Procedures]]
- Triggers — BEFORE, AFTER, INSTEAD OF [[Theory/12.2.StoredProceduresandFunctions#Triggers]]
- Trigger Use Cases and Anti-Patterns [[Theory/12.2.StoredProceduresandFunctions#Trigger Anti-Patterns]]

### 🔠 Full-Text Search in SQL
- tsvector and tsquery (PostgreSQL) [[Theory/12.3Full-Text_Search_in_SQL#tsvector and tsquery]]
- Text Search Configurations and Dictionaries [[Theory/12.3Full-Text_Search_in_SQL#Text Search Config]]
- Ranking — ts_rank, ts_rank_cd [[Theory/12.3Full-Text_Search_in_SQL#Ranking]]
- GIN Indexes for Full-Text [[Theory/12.3Full-Text_Search_in_SQL#GIN for Full-Text]]
- When to Reach for Elasticsearch Instead [[Theory/12.3Full-Text_Search_in_SQL#When to Use Elasticsearch]]

### 🗺 Geospatial
- PostGIS Extension [[Theory/12.4.Geospatial#PostGIS]]
- Geometry vs Geography Types [[Theory/12.4.Geospatial#Geometry vs Geography]]
- Spatial Indexes — GiST, BRIN for Spatial [[Theory/12.4.Geospatial#Spatial Indexes]]
- Common Spatial Queries — Within Radius, Nearest Neighbor [[Theory/12.4.Geospatial#Spatial Queries]]

### 🌊 Streaming and Real-Time
- Change Data Capture (CDC) — Debezium, pgoutput [[Theory/12.5.Streaming_and_Real-Time#CDC]]
- Outbox Pattern [[Theory/12.5.Streaming_and_Real-Time#Outbox Pattern]]
- Transactional Outbox with Kafka [[Theory/12.5.Streaming_and_Real-Time#Transactional Outbox]]
- Materialized Views for Real-Time Dashboards [[Theory/12.5.Streaming_and_Real-Time#Materialized Views]]

---

## 🏗 Phase 13 — System Design with Databases

### 🎯 Database Selection
- Choosing Between SQL and NoSQL [[Theory/13.1.Database_Selection#SQL vs NoSQL]]
- Polyglot Persistence [[Theory/13.1.Database_Selection#Polyglot Persistence]]
- Read-Heavy vs Write-Heavy Workloads [[Theory/13.1.Database_Selection#Read vs Write Workloads]]
- Consistency Requirements [[Theory/13.1.Database_Selection#Consistency Requirements]]

### 🏎 Caching Architecture
- Cache-Aside Pattern [[Theory/13.2.CachingArchitecture#Cache-Aside]]
- Write-Through and Write-Behind [[Theory/13.2.CachingArchitecture#Write-Through and Write-Behind]]
- Read-Through Cache [[Theory/13.2.CachingArchitecture#Read-Through]]
- Cache Invalidation Strategies [[Theory/13.2.CachingArchitecture#Cache Invalidation]]
- Redis as L2 Cache in Front of PostgreSQL [[Theory/13.2.CachingArchitecture#Redis as L2 Cache]]

### 🧩 Common System Design Patterns (Part 1)
- URL Shortener — Hash Storage, Redirect Counters [[Theory/13.3.1.Common_system_design_pattern#URL Shortener]]
- Rate Limiter — Redis Sliding Window, Token Bucket [[Theory/13.3.1.Common_system_design_pattern#Rate Limiter]]
- Notification System — Fan-Out on Write vs Fan-Out on Read [[Theory/13.3.1.Common_system_design_pattern#Notification System]]
- Leaderboard — Sorted Sets in Redis + Sync to PostgreSQL [[Theory/13.3.1.Common_system_design_pattern#Leaderboard]]

### 🧩 Common System Design Patterns (Part 2)
- Job / Task Queue — SKIP LOCKED in PostgreSQL or Redis Streams [[Theory/13.3.2.Common_system_design_pattern#Job Queue]]
- Session Store — Redis with TTL [[Theory/13.3.2.Common_system_design_pattern#Session Store]]
- Search — Elasticsearch + PostgreSQL Dual Write [[Theory/13.3.2.Common_system_design_pattern#Search Pattern]]
- Audit Log — Append-Only Table + Kafka [[Theory/13.3.2.Common_system_design_pattern#Audit Log Pattern]]

### 🧩 Common System Design Patterns (Part 3)
- Advanced Design Patterns [[Theory/13.3.3.Common_system_design_pattern]]

---

## 📖 Reference and Case Studies

### 🏆 Case Studies and Failure Cases
- Real-World Database Failures and Lessons [[Theory/Database_case_studies_and_failure_cases]]

### 🧑‍💼 Architect Knowledge Base
- Database Knowledge for Becoming an Architect [[Theory/database_knowledge_for_become_architect]]

### 📚 Further Reading
- Learning List with Books [[Theory/learning_list_with_books]]
- Learning List for Large Scale Projects [[Theory/learning_list_of_design_lagre_scale_project]]

---

## 🐬 MySQL Deep Dive

### 🔄 Transactions (MySQL)
- MySQL Transactions In-Depth [[MySQL/Theory/01.Transection]]

### 💾 Storage (MySQL)
- MySQL Storage Engines [[MySQL/Theory/02.Storage]]

### 📇 Index (MySQL)
- MySQL Indexing In-Depth [[MySQL/Theory/03.index]]

### 🌲 Database Tree Structures (MySQL)
- B-Tree and Data Structures in MySQL [[MySQL/Theory/04.Database_Tree]]

### ✂ Partitioning (MySQL)
- MySQL Table Partitioning [[MySQL/Theory/05.Partition]]

### 🔒 Locking (MySQL)
- MySQL Locking Mechanisms [[MySQL/Theory/06.Locking]]

### 🌀 Concurrency Issues (MySQL)
- MySQL Concurrency Problems and Solutions [[MySQL/Theory/07.Concurrency_Issues]]

### 🖱 Cursors (MySQL)
- MySQL Cursors [[MySQL/Theory/08.Cursors]]

### 📡 Database Replica (MySQL)
- MySQL Replication In-Depth [[MySQL/Theory/09.Database_Replica]]

### 👁 Database Views (MySQL)
- MySQL Views [[MySQL/Theory/10.Database_View]]
