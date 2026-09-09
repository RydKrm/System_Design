# Scaling Failure Cases — Complete List

> Every failure case follows the same structure: **What happens → Real pattern → Scale trigger → Symptoms → Solution → Lesson** Study each one as if it will happen to your system — because it will.

---

## Part 1 — Query Failure Cases

### 1.1 The N+1 Query Disaster

- **What happens:** Application fetches N parent rows, then runs 1 query per row to fetch children — total N+1 round trips to the database
- **Real pattern:** `SELECT * FROM orders` returns 500 orders, then `SELECT * FROM items WHERE order_id = ?` runs 500 times in a loop
- **Scale trigger:** Works fine at 10 rows, catastrophic at 10,000 rows — latency grows linearly with result size
- **Symptoms:** DB CPU spikes on simple page loads, connection pool saturation, slow response times that worsen as data grows
- **Solution:** Eager loading with JOIN or IN-clause batch query, DataLoader pattern for GraphQL, `sqlx.Select` with proper joins in Go
- **Lesson:** Never let the ORM or application code decide how many queries to run based on result size — always bound it

### 1.2 The OFFSET Pagination Collapse

- **What happens:** `SELECT * FROM posts ORDER BY created_at DESC OFFSET 900000 LIMIT 20` must scan and discard 900,000 rows to return 20
- **Real pattern:** Any REST API with `?page=N&limit=20` on a large table
- **Scale trigger:** Page 1 returns in 2ms, page 10,000 takes 8 seconds — the deeper the page, the worse it gets
- **Symptoms:** Complaints about slow "later pages", DB CPU spikes on pagination queries, timeouts on deep pages
- **Solution:** Keyset (cursor) pagination — `WHERE id < :last_seen_id ORDER BY id DESC LIMIT 20` — O(log N) regardless of depth
- **Lesson:** OFFSET is O(offset) and gets worse as your table grows — it is a pagination time bomb

### 1.3 The COUNT(*) Bottleneck

- **What happens:** `SELECT COUNT(*) FROM orders WHERE status = 'active'` scans every matching row to return a single number
- **Real pattern:** "Showing 4,382,001 results" on a search page — computed on every request
- **Scale trigger:** Instant on 10K rows, 30 seconds on 1B rows — gets worse as the table grows
- **Symptoms:** High DB CPU, slow search pages, timeouts on count queries during peak traffic
- **Solution:** Pre-computed counter table updated on INSERT/DELETE, Redis INCR counter synced to DB, approximate count with HyperLogLog, or simply remove the exact count from the UI
- **Lesson:** Exact counts are always expensive at scale — decide if you actually need exact, or if "about 4 million" is good enough

### 1.4 The Unbounded Result Set

- **What happens:** `SELECT * FROM events WHERE user_id = 1` returns 50 million rows — the application loads all of them into memory
- **Real pattern:** Reports, exports, or analytics queries without a LIMIT clause
- **Scale trigger:** Returns fast with 100 rows, kills the server and the app with 10 million rows
- **Symptoms:** Application server OOM (Out Of Memory) crash, DB CPU and I/O maxed out, query runs for minutes
- **Solution:** Always enforce LIMIT on every query — even internal ones; stream large results with server-side cursors; paginate exports in batches
- **Lesson:** Every query that touches user-generated data must have a LIMIT — data volume is unbounded and will eventually break you

### 1.5 The Implicit Type Cast Index Kill

- **What happens:** Column `user_id` is `BIGINT`, query passes a string `'123'` — the DB must cast every row before comparing — index is bypassed entirely
- **Real pattern:** ORM sends wrong parameter type, JavaScript passes `"123"` instead of `123`, API query string parsed as string not integer
- **Scale trigger:** Invisible on small tables, catastrophic on large ones — query plan silently changes from Index Scan to Seq Scan
- **Symptoms:** Query suddenly 100× slower after a "harmless" code change, no index scan visible in EXPLAIN ANALYZE
- **Solution:** Always match parameter types to column types in parameterized queries; run EXPLAIN ANALYZE after every query change; pg_stat_statements to catch plan regressions
- **Lesson:** Type mismatches silently kill indexes — the query still returns correct results but takes 1000× longer

### 1.6 The Wildcard Leading LIKE Killer

- **What happens:** `SELECT * FROM products WHERE name LIKE '%keyboard%'` cannot use a B-Tree index — must scan every row
- **Real pattern:** Search boxes, autocomplete, name lookups — anywhere a user can type free text
- **Scale trigger:** Fast on 1,000 products, unusable on 10 million products
- **Symptoms:** Search pages timing out, full sequential scans on large tables, DB CPU spike on every search
- **Solution:** Full-text search (tsvector + GIN index in PostgreSQL), trigram index (pg_trgm extension with GIN/GiST), Elasticsearch for serious search requirements — never leading wildcard on a B-Tree index
- **Lesson:** A leading wildcard (`%keyword`) prevents index usage entirely — it is one of the most common and overlooked performance anti-patterns

### 1.7 The SELECT * Over-Fetch

- **What happens:** `SELECT * FROM users` fetches 80 columns including large TEXT fields, JSONB blobs, and binary data — only 3 columns are actually used
- **Real pattern:** ORM default behavior, copy-pasted queries, "I'll just grab everything for safety"
- **Scale trigger:** Worsens with table width and result size — a 10KB average row × 100K rows = 1GB transferred unnecessarily
- **Symptoms:** High network bandwidth between app and DB, slow queries that EXPLAIN shows as fast (time is in transfer, not execution), memory pressure on application server
- **Solution:** Always specify column list — `SELECT id, name, email FROM users`; ORM `defer` / `only` to exclude large columns; use projections in query builders
- **Lesson:** `SELECT *` is a development convenience and a production anti-pattern — you pay to move every byte from disk to DB to app to user

### 1.8 The Unbounded IN Clause

- **What happens:** `SELECT * FROM products WHERE id IN (1, 2, 3, ..., 50000)` — IN list grows without bound as the application passes more IDs
- **Real pattern:** Caching layer passes back large ID sets, microservice passes IDs from one service to another
- **Scale trigger:** 10 IDs is fine, 50,000 IDs crashes the query planner or creates a query string larger than the max allowed
- **Symptoms:** Query planner OOM, connection timeout, parameter binding errors, extreme query parse time
- **Solution:** Use a temporary table + JOIN for large ID sets; batch into chunks of 500–1000; restructure the query to avoid passing IDs at all; use a subquery instead
- **Lesson:** Every variable-length list passed to the DB needs an enforced upper bound — treat unbounded lists as a security risk as much as a performance risk

### 1.9 The Function in WHERE Clause Index Bypass

- **What happens:** `SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15'` — the `DATE()` function is applied to every row, preventing index use on `created_at`
- **Real pattern:** Date truncation, string functions, mathematical operations applied to indexed columns in WHERE clauses
- **Scale trigger:** Full table scan on every query — devastating as the table grows
- **Symptoms:** Seq Scan in EXPLAIN even though the column is indexed, high read IOPS for simple date queries
- **Solution:** Rewrite to avoid function on column: `WHERE created_at >= '2024-01-15' AND created_at < '2024-01-16'`; or use a generated/expression index on `DATE(created_at)`
- **Lesson:** Any function applied to a column in WHERE destroys the index — always filter on the raw column value

### 1.10 The OR Condition Index Breakdown

- **What happens:** `SELECT * FROM users WHERE email = 'a@b.com' OR phone = '555-1234'` — OR across two separately indexed columns cannot use both indexes simultaneously (in most DBs)
- **Real pattern:** Multi-field identity lookup — "find user by email or by phone or by username"
- **Scale trigger:** Works on small tables, full scan on large ones
- **Symptoms:** Seq Scan in EXPLAIN despite both columns being indexed
- **Solution:** Rewrite as `UNION ALL` of two separate queries each using its own index; or add a covering index on both columns; or use a normalized lookup table with a single `value` column + `type` column
- **Lesson:** OR across different columns is one of the hardest patterns to index — always check the execution plan

### 1.11 The Missing Composite Index Column Order

- **What happens:** Index exists on `(user_id, status, created_at)` but query is `WHERE status = 'active' AND created_at > '2024-01-01'` — skips `user_id`, the leading column — index is partially or fully unusable
- **Real pattern:** Index created for one query, different query uses a different leading column
- **Scale trigger:** Index exists but is bypassed — query runs as if there is no index
- **Symptoms:** EXPLAIN shows Seq Scan or Bitmap Scan despite an index that "should" cover the query
- **Solution:** Design composite index columns in order of: equality conditions first, range conditions last, in order of selectivity — create a separate index if the query pattern is fundamentally different
- **Lesson:** A composite index is only useful if the query uses the leading column(s) — index design is query-specific

### 1.12 The ORDER BY Non-Index Column Sort Spill

- **What happens:** `SELECT * FROM events ORDER BY score DESC LIMIT 100` — `score` is not indexed — DB sorts the entire table in memory, or worse, spills to disk when the sort exceeds `work_mem`
- **Real pattern:** Leaderboards, ranked feeds, any query with ORDER BY on a computed or low-selectivity column
- **Scale trigger:** Fast on 10,000 rows, minutes on 100 million rows when it spills to disk
- **Symptoms:** `Sort Method: external merge Disk: 2048kB` in EXPLAIN ANALYZE, high disk I/O during query, slow but not obviously broken
- **Solution:** Index the ORDER BY column; increase `work_mem` for sort-heavy workloads; pre-sort into a materialized view; use Redis Sorted Set for real-time rankings
- **Lesson:** Every ORDER BY without a supporting index is a hidden sort operation — at scale, it becomes a disk sort

### 1.13 The Cartesian Product Accident

- **What happens:** `SELECT * FROM products, categories` — missing JOIN condition creates a Cartesian product — 10,000 products × 500 categories = 5,000,000 rows returned
- **Real pattern:** Copy-paste error, missing WHERE clause in multi-table query, old-style implicit join syntax
- **Scale trigger:** Instantly catastrophic at any meaningful scale — result size is multiplicative
- **Symptoms:** Query runs indefinitely, DB CPU at 100%, application waits forever or times out, massive result set
- **Solution:** Always use explicit JOIN syntax; add a query timeout as a safety net; use a query linter (SQLFluff) in CI to catch missing join conditions
- **Lesson:** A missing JOIN condition is one of the most destructive query bugs — it is silent, the query is syntactically valid, and it returns "results" that are completely wrong

### 1.14 The Correlated Subquery Per Row

- **What happens:** `SELECT u.name, (SELECT COUNT(*) FROM orders WHERE orders.user_id = u.id) FROM users` — the subquery executes once for every row in `users`
- **Real pattern:** Column-level subqueries in SELECT clause, per-row aggregation without GROUP BY
- **Scale trigger:** 1 outer query + N inner queries — same class as N+1 but in SQL itself
- **Symptoms:** Query takes 30 seconds instead of milliseconds, EXPLAIN shows "Nested Loop" with millions of iterations
- **Solution:** Rewrite as a JOIN with GROUP BY: `SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id, u.name`; or use a window function
- **Lesson:** A subquery in the SELECT clause that references the outer row runs once per outer row — rewrite as a JOIN every time

### 1.15 The DISTINCT Performance Trap

- **What happens:** `SELECT DISTINCT user_id FROM events WHERE created_at > NOW() - INTERVAL '30 days'` — DISTINCT requires sorting or hashing the entire result set to deduplicate
- **Real pattern:** De-duplicating large result sets, "give me all unique X that did Y"
- **Scale trigger:** Tolerable on small result sets, expensive on millions of rows
- **Symptoms:** High memory usage, sort spills to disk, query slower than expected for what looks like a simple query
- **Solution:** Use `EXISTS` subquery instead when checking "did this user do X": `SELECT id FROM users WHERE EXISTS (SELECT 1 FROM events WHERE events.user_id = users.id AND ...)`; or pre-aggregate with a materialized view; ensure the column has an index for index-only scan deduplication
- **Lesson:** DISTINCT is deceptively expensive — it always requires a full-result sort or hash — think of it as a GROUP BY with no aggregate

### 1.16 The Deep Recursive CTE Stack Overflow

- **What happens:** A recursive CTE traverses a hierarchy — the data has a cycle (A → B → A) or is extremely deep (10,000 levels) — the recursion runs forever or exhausts memory
- **Real pattern:** Organizational hierarchy, category trees, bill of materials, social graph traversal
- **Scale trigger:** Works on clean hierarchical data, breaks on cyclic data or deeply nested structures
- **Symptoms:** Query runs indefinitely, DB OOM, or query returns after minutes with wrong results
- **Solution:** Add cycle detection — PostgreSQL `CYCLE` clause or manual `WHERE id != ANY(path)` guard; set `work_mem` appropriately; add recursion depth limit; validate data for cycles before running recursive queries
- **Lesson:** Recursive CTEs on user-generated hierarchical data must always have cycle protection — users will create cycles

---

## Part 2 — Index Failure Cases

### 2.1 The Missing Foreign Key Index

- **What happens:** `DELETE FROM users WHERE id = 123` triggers a full sequential scan on `orders` table to check referential integrity — because `orders.user_id` has no index
- **Real pattern:** Developer creates FK constraint but forgets to create the index — PostgreSQL does NOT auto-create indexes on FK columns (unlike MySQL InnoDB)
- **Scale trigger:** Instant for small tables, minutes for multi-million row child tables
- **Symptoms:** Slow DELETE and UPDATE operations on parent tables, lock escalation, cascading timeouts on parent-table writes
- **Solution:** Index every foreign key column — always, without exception; use a linter (Squawk, pganalyze) to enforce this in CI
- **Lesson:** In PostgreSQL, a foreign key without an index is a hidden performance bomb on every delete and update of the parent table

### 2.2 The Index That Never Gets Used

- **What happens:** An index exists on a column but the query planner never chooses it — uses a sequential scan instead
- **Real causes:**
    - Low selectivity — `WHERE is_active = true` on a table where 98% of rows have `is_active = true`
    - Stale statistics — `ANALYZE` hasn't run, planner thinks the table is tiny
    - Implicit type cast preventing index use
    - Small table — sequential scan is cheaper than index scan below ~1000 rows
    - `random_page_cost` set too high, making the planner undervalue random I/O (NVMe SSDs need lower value)
- **Symptoms:** Seq Scan in EXPLAIN despite an index existing, index never shows up in `pg_stat_user_indexes.idx_scan`
- **Solution:** Run `ANALYZE` to update statistics; check index selectivity; adjust `random_page_cost` for SSD storage; use partial index for low-selectivity columns
- **Lesson:** Creating an index does not guarantee it will be used — always verify with EXPLAIN ANALYZE

### 2.3 The Index Bloat Explosion

- **What happens:** A high-churn table (many inserts + updates + deletes) accumulates dead entries in B-Tree index pages — the index grows 3–5× its logical size — queries slow because more pages must be read
- **Real pattern:** Order status update tables, event log tables with frequent writes, any table with high update rate
- **Scale trigger:** Grows slowly but continuously — invisible until query performance degrades over weeks or months
- **Symptoms:** Index size in `pg_stat_user_indexes` far exceeds table size, slower queries over time with no schema change, high read IOPS
- **Solution:** `REINDEX CONCURRENTLY` to rebuild without locking; tune `fillfactor` to leave room for updates; monitor bloat ratio with `pgstattuple`; schedule regular reindex during low-traffic windows
- **Lesson:** Index bloat is invisible without monitoring — it silently degrades performance over months until it becomes a crisis

### 2.4 The Over-Indexed Write Table

- **What happens:** A high-write table has 15 indexes "for flexibility" — every INSERT must update all 15 indexes — write throughput collapses
- **Real pattern:** Developers add indexes reactively for every new query — nobody removes the unused ones
- **Scale trigger:** Each additional index adds overhead to every write — tolerable at low write rates, catastrophic at high write rates
- **Symptoms:** High write latency, DB WAL generation much higher than expected, `pg_stat_user_indexes` showing many indexes with zero `idx_scan`
- **Solution:** Audit indexes with `pg_stat_user_indexes` — drop any with `idx_scan = 0` after a representative time window; establish an index review process before adding new ones
- **Lesson:** Every index is a tax on every write — indexes exist to serve specific queries, not as insurance for possible future queries

### 2.5 The Partial Index That Doesn't Match the Query

- **What happens:** Partial index created as `CREATE INDEX ON orders (user_id) WHERE status = 'active'` — query is `SELECT * FROM orders WHERE user_id = 1 AND status = 'active' OR status = 'pending'` — the OR breaks partial index eligibility
- **Real pattern:** Partial indexes built for one query pattern used in a slightly different context
- **Scale trigger:** Index exists, query matches "close enough" in developer's mind, but planner doesn't use it
- **Symptoms:** Expected index scan becomes seq scan, partial index has zero scans in stats
- **Solution:** Ensure the query's WHERE clause is a superset of the partial index's WHERE clause — test with EXPLAIN ANALYZE; create multiple partial indexes for multiple query patterns
- **Lesson:** Partial indexes are exact — the query's WHERE must logically imply the index's WHERE for the planner to use it

### 2.6 The Index on a Low-Cardinality Boolean Column

- **What happens:** Index created on `is_deleted BOOLEAN` — table has 10M rows, 9.9M have `is_deleted = false`, 100K have `is_deleted = true` — index on `false` is useless (too many rows), index on `true` is fine
- **Real pattern:** Soft-delete pattern, any boolean flag used in WHERE
- **Scale trigger:** The index is created, the query runs, the planner ignores the index for the common value
- **Solution:** Use a partial index: `CREATE INDEX ON users (id) WHERE is_deleted = false` — only indexes the rows the queries actually need; dramatically smaller and actually useful
- **Lesson:** A full index on a boolean column is almost always wrong — use a partial index scoped to the minority value

### 2.7 The Write-Time Index Rebuild Lock

- **What happens:** `CREATE INDEX ON orders (customer_id)` — without `CONCURRENTLY` — takes a full AccessExclusiveLock on the table — all reads and writes are blocked for the duration (minutes to hours on a large table)
- **Real pattern:** DBA creates an index in production without the CONCURRENTLY option
- **Scale trigger:** Instant production outage on any table larger than a few hundred thousand rows
- **Symptoms:** All queries against the table queue and timeout, application becomes unresponsive, connection pool fills up
- **Solution:** Always use `CREATE INDEX CONCURRENTLY` in production — takes longer but never blocks; verify in staging first; schedule during lowest traffic window with a rollback plan
- **Lesson:** Every index creation on a production table must use CONCURRENTLY — this is non-negotiable

---

## Part 3 — Connection and Resource Failure Cases

### 3.1 The Connection Pool Exhaustion

- **What happens:** Application opens a new DB connection per goroutine/thread/request — PostgreSQL hits `max_connections` (default 100) — new connections fail with "too many clients"
- **Real pattern:** Go services without a pool limit (`sql.DB` with unlimited `SetMaxOpenConns`), serverless functions each opening their own connection
- **Scale trigger:** Works fine at 10 RPS, fails at 1,000 RPS when concurrent connections exceed the DB limit
- **Symptoms:** `FATAL: sorry, too many clients already`, connection timeouts, application errors spike, DB appears healthy but app cannot connect
- **Solution:** PgBouncer in transaction mode as a connection proxy; `db.SetMaxOpenConns(25)` in Go's `database/sql`; RDS Proxy for serverless; pool size formula: `(num_cores * 2) + num_spindles`
- **Lesson:** DB connections are not free — each PostgreSQL connection costs 5–10MB RAM and a process slot — treat them as a scarce resource

### 3.2 The Idle Connection Leak

- **What happens:** Application opens connections and never returns them to the pool — connections sit idle, holding DB resources — pool fills with idle connections, new requests wait forever
- **Real pattern:** Forgotten `defer db.Close()`, connection not returned after error path, ORM connection leak in error handler
- **Scale trigger:** Slow leak — starts with occasional latency spikes, progresses to full pool starvation over hours
- **Symptoms:** `pg_stat_activity` shows many connections in `idle` or `idle in transaction` state, connection wait time grows, application latency climbs slowly then crashes
- **Solution:** `db.SetConnMaxLifetime(5 * time.Minute)`, `db.SetConnMaxIdleTime(1 * time.Minute)`, `SET idle_in_transaction_session_timeout = '30s'` in PostgreSQL config; monitor `pg_stat_activity` counts
- **Lesson:** Connection leaks are slow-motion disasters — set maximum lifetimes and idle timeouts to self-heal leaked connections

### 3.3 The Long-Running Transaction Lock Escalation

- **What happens:** A transaction runs for 10 minutes (analytics, batch job, slow API call) — it holds row locks — other transactions queue behind it — connection pool fills with waiting connections — application stops responding
- **Real pattern:** Analytics query inside a transaction, slow external API call inside a transaction, forgetting to commit after a write
- **Scale trigger:** Happens at any scale — one slow transaction is enough to cascade
- **Symptoms:** `pg_stat_activity` shows `idle in transaction` with old `xact_start`, lock waits pile up, application latency spikes across all endpoints
- **Solution:** `SET statement_timeout = '30s'`, `SET idle_in_transaction_session_timeout = '60s'`; keep transactions short — open late, close early; never call external APIs inside a DB transaction
- **Lesson:** A transaction is a lock — the longer it runs, the more it blocks — every transaction must complete in milliseconds, not minutes

### 3.4 The Cascading Slow Query Timeout Storm

- **What happens:** One slow query (missing index) takes 30 seconds — 1,000 requests arrive in those 30 seconds, all queuing behind it — connection pool fills — application times out on every request — site goes down
- **Real pattern:** A new query without an index deployed to production, or a query plan change (planner regression)
- **Scale trigger:** Happens instantly when the slow query pattern is hit frequently enough
- **Symptoms:** All response times spike simultaneously, connection pool wait time maxes out, DB CPU may not be high (IO bound)
- **Solution:** `statement_timeout` kills slow queries before they cascade; circuit breaker at application level; query plan monitoring to detect regressions; feature flags to disable the broken query path
- **Lesson:** One missing index can take down an entire application — statement timeouts are mandatory, not optional

### 3.5 The Serverless Connection Explosion

- **What happens:** AWS Lambda or Cloud Run functions each open their own DB connection — 1,000 concurrent function invocations = 1,000 DB connections — PostgreSQL connection limit exceeded
- **Real pattern:** Any serverless architecture connecting directly to PostgreSQL or MySQL
- **Scale trigger:** Each new invocation needs a connection — scales to DB exhaustion instantly under load
- **Symptoms:** Connection limit errors at moderate scale, function invocations fail with DB connection errors, DB RAM exhausted by connection overhead
- **Solution:** RDS Proxy (AWS), Cloud SQL Auth Proxy (GCP), PgBouncer, or HTTP-based serverless DB drivers (Neon serverless driver, PlanetScale HTTP driver) — never connect directly from serverless to a traditional DB
- **Lesson:** Serverless and traditional connection-based databases are architecturally incompatible — you need a proxy layer between them

### 3.6 The Work_mem Sort Spill Cascade

- **What happens:** Many concurrent queries each require a sort or hash operation — each claims `work_mem` (default 4MB in PostgreSQL) — total memory usage = active_queries × sort_operations × work_mem — DB server OOM kills the process
- **Real pattern:** Workloads with many concurrent ORDER BY, GROUP BY, or hash join queries after increasing `work_mem` for analytics
- **Scale trigger:** `work_mem = 4MB` × 500 concurrent sort operations = 2GB — easy to exceed available RAM
- **Symptoms:** Postgres process killed by OOM killer, DB restart, connections lost, data loss risk if in mid-transaction
- **Solution:** Set `work_mem` conservatively globally; use `SET work_mem = '256MB'` only for specific analytics sessions; use `max_connections × work_mem × sort_factor < total_RAM / 2` as a safety formula
- **Lesson:** `work_mem` is per-operation, not per-connection — multiplied by concurrency, it can exhaust all available RAM

### 3.7 The Shared Buffers Under-Allocation

- **What happens:** PostgreSQL's `shared_buffers` is left at the default 128MB — working set is 50GB — every query that accesses data not in the tiny buffer pool goes to disk — I/O is the bottleneck
- **Real pattern:** Default PostgreSQL installation on a 64GB RAM server — shared_buffers at 128MB (0.2% of available RAM)
- **Scale trigger:** At small data sizes, everything fits in the OS page cache anyway — degradation only visible at larger data volumes
- **Symptoms:** High disk read IOPS, slow queries even on indexed columns, buffer hit ratio below 95% in `pg_stat_bgwriter`
- **Solution:** Set `shared_buffers` to 25% of total RAM as a baseline; `effective_cache_size` to 75% of total RAM; use PGTune to generate a baseline configuration; monitor `pg_stat_bgwriter.buffers_clean` ratio
- **Lesson:** A default PostgreSQL installation is configured for compatibility, not performance — every production deployment needs tuning

---

## Part 4 — Write and Concurrency Failure Cases

### 4.1 The Hot Row Bottleneck

- **What happens:** Every transaction updates the same single row — a global counter, a shared seat map, a single inventory record — row-level locking serializes all updates through one bottleneck
- **Real pattern:** `UPDATE seats SET available = available - 1 WHERE event_id = 1` under 10,000 concurrent users
- **Scale trigger:** Any concurrent write rate above a few hundred TPS on the same row
- **Symptoms:** Lock wait timeouts, serialization failures, latency spikes proportional to concurrency, DB CPU low but throughput terrible
- **Solution:** Sharded counters (N rows instead of 1, SUM to read), Redis INCR for real-time counts, queue-based serialization, optimistic locking with retry
- **Lesson:** A single row updated by many concurrent writers is a serialization bottleneck regardless of hardware — it is a design problem, not a hardware problem

### 4.2 The Deadlock Cascade

- **What happens:** Transaction A locks rows in order (1, 2). Transaction B locks rows in order (2, 1). A waits for B to release row 2. B waits for A to release row 1. Both wait forever — deadlock detected and one is rolled back.
- **Real pattern:** Any code that acquires locks on multiple rows without a consistent global order — payment transfers, inventory reservations, multi-item cart checkout
- **Scale trigger:** Rare at low concurrency, frequent at high concurrency — deadlock rate grows with transaction volume
- **Symptoms:** `ERROR: deadlock detected` in application logs, random transaction failures, retries causing further deadlocks
- **Solution:** Always acquire locks in a consistent global order (lowest ID first); use `SELECT FOR UPDATE OF row ORDER BY id` to enforce ordering; set `deadlock_timeout` and `lock_timeout`; implement retry with exponential backoff
- **Lesson:** Deadlocks are always application logic bugs — the DB detects and breaks them, but you must prevent the circular dependency

### 4.3 The Lost Update Under Concurrency

- **What happens:** Two transactions read `balance = 100`, both add 50, both write `balance = 150` — the net result should be 200 but is 150 — one update is silently lost
- **Real pattern:** Any read-compute-write pattern under concurrent load — balance updates, inventory decrements, vote counts, like counts
- **Scale trigger:** Zero chance at 1 concurrent user, near-certain at 1,000 concurrent users on the same row
- **Symptoms:** Data inconsistency that appears randomly, counts that don't add up, balances that are wrong — notoriously hard to reproduce in testing
- **Solution:** `UPDATE accounts SET balance = balance + 50` (atomic increment, never read-then-write); `SELECT FOR UPDATE` before reading; optimistic locking with version column; use serializable isolation
- **Lesson:** Read-modify-write is never safe under concurrency without locking or atomic operations — never read a value, compute a new value, then write it back

### 4.4 The Phantom Read Double-Booking

- **What happens:** Two booking requests simultaneously check `SELECT COUNT(*) FROM bookings WHERE seat_id = 1` — both see 0 bookings — both insert a booking — seat is now double-booked
- **Real pattern:** Ticket booking, hotel reservation, appointment scheduling, inventory reservation
- **Scale trigger:** Requires two concurrent requests hitting the same resource — happens under any real traffic
- **Symptoms:** Oversold seats, double-booked rooms, inventory going negative — discovered by angry customers, not monitoring
- **Solution:** `SELECT FOR UPDATE` on the resource row before checking availability; `SERIALIZABLE` isolation level; unique constraint on (seat_id, booking_date) to enforce DB-level exclusivity; check-and-set with version column
- **Lesson:** Read Committed isolation is not enough for booking systems — two concurrent readers both see "available" and both book

### 4.5 The Write Skew on a Multi-Row Constraint

- **What happens:** Rule: "at least one doctor must be on call." Both doctors check "is someone else on call?" — both see yes — both go off call — nobody is on call. Neither transaction violated any rule it could see; together they did.
- **Real pattern:** Any constraint that spans multiple rows — "at least N", "no more than N active", "sum must remain positive"
- **Scale trigger:** Requires concurrent transactions — the more concurrency, the more likely
- **Symptoms:** Business rule violated — only discovered after the fact, often causing real-world harm
- **Solution:** Serializable isolation (Serializable Snapshot Isolation in PostgreSQL); explicitly lock all relevant rows with `SELECT FOR UPDATE`; materialize the constraint into a single lockable row; redesign to make the constraint enforced by a single row
- **Lesson:** Snapshot isolation does NOT prevent write skew — only Serializable or explicit locking does — most ORMs default to Read Committed which is even weaker

### 4.6 The Bulk Delete Lock Explosion

- **What happens:** `DELETE FROM events WHERE created_at < NOW() - INTERVAL '1 year'` — 500 million rows to delete — takes an exclusive lock on every row — active queries queue and timeout — application goes down for hours
- **Real pattern:** Data retention cleanup jobs, soft-delete purge jobs, log rotation
- **Scale trigger:** Works fine for small deletes, catastrophic for large ones
- **Symptoms:** Application timeouts, lock wait timeouts, DB CPU and I/O maxed for the duration, table may be unusable during deletion
- **Solution:** Batch deletes — `DELETE FROM events WHERE id IN (SELECT id FROM events WHERE created_at < NOW() - INTERVAL '1 year' LIMIT 1000)` in a loop with sleep between batches; use partition dropping instead (`DROP TABLE events_2023` instantly, no row-by-row deletion); archive to cold storage before deleting
- **Lesson:** Never delete millions of rows in a single transaction — always batch with commits and sleep to give other queries a chance

### 4.7 The Transaction Too Large to Rollback

- **What happens:** A batch job runs inside a single transaction — modifies 100 million rows — fails at row 99 million — rollback must undo 99 million row changes — rollback takes longer than the original job — DB is stalled for hours
- **Real pattern:** Data migration scripts, bulk update jobs, backfills
- **Scale trigger:** Large transactions are fine at small scale, catastrophic to roll back at scale
- **Symptoms:** Rollback running for hours, DB appears frozen, WAL disk fills up during rollback, monitoring shows the transaction getting older not younger
- **Solution:** Break into small transactions of 1,000–10,000 rows each; use an idempotent design so partial completion is safe to resume; keep a progress marker table so the job can resume from where it stopped
- **Lesson:** A transaction's rollback cost equals its commit cost — if you cannot afford to roll back 100M row changes, do not put them in one transaction

### 4.8 The Optimistic Lock Retry Storm

- **What happens:** Optimistic locking with a version column — under high concurrency, most transactions find the version has changed, fail, and retry — retries collide with each other — retry rate grows faster than success rate — system makes no progress (livelock)
- **Real pattern:** High-contention rows with optimistic locking, e-commerce flash sales with inventory decrement
- **Scale trigger:** Works well at low concurrency, breaks down above a threshold of concurrent writers on the same row
- **Symptoms:** High retry rate in logs, CPU spent on retries that keep failing, transaction success rate low despite DB appearing available
- **Solution:** Switch to pessimistic locking (`SELECT FOR UPDATE`) for truly high-contention rows; use a queue to serialize access; add exponential backoff + jitter to retries; shard the hot resource
- **Lesson:** Optimistic locking assumes low contention — on high-contention rows, it amplifies the problem rather than solving it

---

## Part 5 — Schema and Data Model Failure Cases

### 5.1 The EAV (Entity-Attribute-Value) Trap

- **What happens:** Schema uses three columns `(entity_id, attribute_name, attribute_value)` to store "flexible" data — querying "all users where age > 30 AND city = 'Dhaka'" requires multiple self-joins or a complex pivot — query is unreadable, unindexable, and slow
- **Real pattern:** "We don't know the schema yet" systems, custom field systems built wrong
- **Scale trigger:** Two attributes = one join, ten attributes = ten joins — complexity and performance degrade exponentially
- **Symptoms:** Queries requiring 15 self-joins for simple multi-attribute lookups, query times in seconds for simple filters, unindexable attribute values
- **Solution:** Use JSONB column in PostgreSQL for flexible attributes (indexable with GIN); normalize known attributes into proper columns; use a document database if truly schemaless data is required
- **Lesson:** EAV is a well-documented anti-pattern — it moves schema complexity from the DB to the query, where it cannot be optimized

### 5.2 The God Table

- **What happens:** One massive table stores everything — users, companies, products, orders — distinguished by a `type` column — 200 columns, most NULL for any given row type
- **Real pattern:** "Flexible" schemas, over-abstraction, "one table to rule them all" designs
- **Scale trigger:** Table grows as fast as all combined entity types — bloated with NULLs, impossible to index properly
- **Symptoms:** Massive table with 90% NULL values in most columns, generic queries that ignore type perform full scans, schema changes affect all entity types
- **Solution:** Single Table Inheritance for truly shared behavior with limited divergence; proper separate tables for entities with different shapes and access patterns
- **Lesson:** A NULL-heavy wide table is a sign that multiple entities are being forced into one schema — separate them

### 5.3 The Polymorphic Association Without an Index

- **What happens:** `comments` table has `commentable_type VARCHAR` and `commentable_id BIGINT` to reference any entity — index exists on `commentable_id` alone — query `WHERE commentable_type = 'Post' AND commentable_id = 1` is slow because the index doesn't include `type`
- **Real pattern:** Rails polymorphic associations, generic comment/like/notification systems
- **Scale trigger:** Works fine on small comment tables, slow on millions of comments across many entity types
- **Solution:** Composite index on `(commentable_type, commentable_id)`; or use separate normalized tables per entity type; or use PostgreSQL table inheritance
- **Lesson:** Polymorphic associations always need a composite index that includes the type column — never just the ID

### 5.4 The Storing Money as FLOAT Disaster

- **What happens:** `price FLOAT` stores `0.1 + 0.2 = 0.30000000000000004` — financial calculations accumulate rounding errors — invoices show wrong totals — tax calculations are off by fractions of a cent
- **Real pattern:** Copied from application code where floats are used for display, any "quick" schema that doesn't think about precision
- **Scale trigger:** Errors are small but accumulate — invisible at low transaction volume, material at high volume or when summed
- **Symptoms:** Audit totals that don't match, penny rounding errors in tax calculations, floating-point artifacts in financial reports
- **Solution:** Always use `NUMERIC(19,4)` or `DECIMAL(19,4)` for money — exact precision, no floating point; store amounts in the smallest currency unit (cents/pence as INTEGER)
- **Lesson:** Floating-point is fundamentally incompatible with financial arithmetic — there are no exceptions

### 5.5 The Storing Timestamps Without Timezone

- **What happens:** `created_at TIMESTAMP` (without timezone) stores local server time — server moves to a new timezone, or operates in UTC but displays in local time — all historical timestamps are off by the UTC offset
- **Real pattern:** Any application storing time without timezone awareness
- **Scale trigger:** Invisible until server timezone changes, DST kicks in, or users in multiple timezones compare data
- **Symptoms:** Events appearing at wrong times for users in different timezones, "missing" hour during DST fallback, duplicated hour during DST spring forward
- **Solution:** Always use `TIMESTAMPTZ` (timestamp with time zone) in PostgreSQL — store in UTC, display in user's local timezone at the application layer
- **Lesson:** Every timestamp in the database must be UTC — timezone conversion is a display concern, not a storage concern

### 5.6 The Unconstrained String Length

- **What happens:** `name VARCHAR` with no length limit — users or attackers submit a 10MB string as their "name" — DB accepts it — the row is bloated — the table grows unexpectedly — indexes on the column become huge
- **Real pattern:** Schema designed without thinking about input validation at the DB level
- **Scale trigger:** One malicious or buggy input can cause immediate storage and performance impact
- **Solution:** Always define sensible maximum lengths (`name VARCHAR(255)`); add CHECK constraints for minimum lengths; enforce at application layer too but never rely solely on app validation
- **Lesson:** The DB is the last line of defense — always define constraints at the schema level, not just in application code

### 5.7 The Missing Soft Delete Index

- **What happens:** Soft delete pattern uses `deleted_at TIMESTAMP NULL` — query `WHERE deleted_at IS NULL` on a 100M row table has no index — full table scan every time
- **Real pattern:** Any soft-delete system without a partial index
- **Scale trigger:** Works until the table gets large — then every query that filters out deleted rows is a full scan
- **Solution:** Partial index: `CREATE INDEX ON users (id) WHERE deleted_at IS NULL` — only indexes active rows, small, fast; alternatively, `CREATE INDEX ON users (deleted_at) WHERE deleted_at IS NULL` is paradoxical — use a boolean `is_deleted` with a partial index instead
- **Lesson:** Soft delete without a partial index is a full-table-scan-on-every-query pattern in disguise

### 5.8 The Nullable Column with False NULL Semantics

- **What happens:** `discount NUMERIC NULL` where NULL means "no discount" and 0 means "0% discount" and -1 means "suspended" — three different semantic meanings hidden in one nullable column
- **Real pattern:** Overloading NULL to mean multiple different things, status packed into a numeric column
- **Scale trigger:** Works until the codebase grows and different developers interpret NULL differently — produces incorrect queries and data bugs
- **Symptoms:** `WHERE discount IS NULL` accidentally includes suspended users, bugs that only appear in edge cases, impossible to write a correct query without reading all the comments
- **Solution:** Use separate columns for separate concepts; use a proper ENUM or lookup table for status; never use NULL as a magic value with semantic meaning beyond "unknown" or "not applicable"
- **Lesson:** NULL means "unknown" or "not applicable" — using it as a sentinel value for other states produces bugs that are invisible in testing

---

## Part 6 — Replication and Consistency Failure Cases

### 6.1 The Replication Lag Read Anomaly

- **What happens:** User creates an account (write → primary), is immediately redirected to dashboard (read → replica) — replica hasn't synced yet — user sees "account not found"
- **Real pattern:** Any read-after-write on a replicated system with reads routed to replicas
- **Scale trigger:** Worse under high write load when replication lag increases
- **Symptoms:** "I just created X and now I can't see it", inconsistent UX for users who just performed a write
- **Solution:** Read-your-writes consistency — route reads to primary for a short window after a write from the same session; session-level `synchronous_commit`; sticky routing per user for a TTL after writes
- **Lesson:** Replication lag is not just a performance metric — it has direct user-visible correctness consequences

### 6.2 The Split-Brain Dual Write

- **What happens:** Network partition causes both primary and replica to believe they are the leader — both accept writes — data diverges — when partition heals, two inconsistent versions of truth must be reconciled
- **Real pattern:** Automatic failover without fencing, poorly configured MySQL Master-Master, Redis without sentinel quorum
- **Scale trigger:** Triggered by a network partition — can happen at any scale
- **Symptoms:** Duplicate records, conflicting updates, data that is "different" depending on which node you query
- **Solution:** Fencing tokens, STONITH, quorum-based leader election, epoch numbers to reject stale leader writes; prefer CP over AP for systems where data integrity is critical
- **Lesson:** Automatic failover without fencing is worse than manual failover — it can corrupt data in ways that are difficult to detect and expensive to repair

### 6.3 The Replica Divergence Silent Corruption

- **What happens:** A DML statement behaves differently on primary vs replica due to non-determinism — `NOW()`, `RANDOM()`, `UUID()` in statement-based replication — replica silently has different data than primary
- **Real pattern:** MySQL statement-based replication with non-deterministic functions
- **Scale trigger:** Accumulates silently over time — discovered during failover when replica data is wrong
- **Solution:** Use row-based replication (not statement-based); avoid non-deterministic functions in DML; periodic replica consistency checks with pt-table-checksum
- **Lesson:** Statement-based replication is a trap for non-deterministic SQL — always verify replica data matches primary with a checksum tool

### 6.4 The Replication Slot Disk Fill

- **What happens:** A PostgreSQL logical replication slot holds WAL files until the consumer (Debezium, read replica) catches up — consumer goes offline for hours — WAL accumulates — disk fills — PostgreSQL shuts down to prevent data loss
- **Real pattern:** CDC pipeline (Debezium) with a replication slot, read replicas on slow networks
- **Scale trigger:** WAL generation rate × offline duration = disk consumption — a busy system fills disk fast
- **Symptoms:** Disk usage grows without new data being inserted, PostgreSQL shutdown with "no space left on device", replication slot shows large lag
- **Solution:** Set `max_slot_wal_keep_size`; monitor slot lag in bytes and alert at 50% disk; drop slots when consumers are offline for more than a threshold; design CDC consumers for fast recovery
- **Lesson:** Replication slots are a disk time bomb — monitor slot lag as aggressively as you monitor free disk space

### 6.5 The Failover That Promoted an Outdated Replica

- **What happens:** Primary crashes, automatic failover promotes the most "available" replica — but that replica is 2 minutes behind due to async replication — 2 minutes of committed writes are permanently lost — downstream systems already processed those writes
- **Real pattern:** Async replication + aggressive automatic failover without lag check
- **Scale trigger:** Depends on write volume — 2 minutes of lag on a busy system = thousands of lost rows
- **Symptoms:** Missing records after failover, downstream systems out of sync with primary, customers report lost orders or transactions
- **Solution:** Semi-synchronous replication ensures at least one replica is current; promote only replicas below a maximum lag threshold; use Patroni with `maximum_lag_on_failover` configuration
- **Lesson:** Faster failover ≠ better failover — promoting a lagging replica trades availability for data loss; know your acceptable RPO before configuring failover

---

## Part 7 — Caching Failure Cases

### 7.1 The Cache Stampede (Thundering Herd)

- **What happens:** A popular cache key (homepage, viral post) expires — thousands of concurrent requests simultaneously find a cache miss — all simultaneously query the DB to rebuild the cache — DB is overwhelmed
- **Real pattern:** Any high-traffic cache key with a fixed TTL
- **Scale trigger:** The more popular the key, the more concurrent misses on expiry
- **Symptoms:** Periodic latency spikes every N minutes (the TTL interval), DB CPU spike coinciding with cache miss, recovery after the key is rebuilt
- **Solution:** Probabilistic early expiration (PER); mutex lock (only one rebuilds, rest wait or serve stale); background refresh before expiry; add random jitter to TTLs to desynchronize expiry
- **Lesson:** A fixed TTL on a popular key is a scheduled DB attack — always add jitter or use probabilistic early expiration

### 7.2 The Cache Penetration Attack

- **What happens:** Attacker sends requests for keys that do not exist in cache AND do not exist in DB — every request misses cache, hits DB, finds nothing, returns nothing — DB is overwhelmed by queries that always return empty
- **Real pattern:** Scraping, fuzzing, malicious enumeration of IDs that don't exist
- **Scale trigger:** A single attacker with a script can overwhelm a DB that handles real traffic fine
- **Symptoms:** DB CPU spike from queries that return empty, cache hit rate drops to near zero for the attacked key space
- **Solution:** Cache negative results (cache the "not found" response with a short TTL); Bloom filter to check existence before hitting DB; rate limiting per IP per endpoint; `null` sentinel value in cache
- **Lesson:** Cache penetration turns your cache into a pass-through — always cache negative results with a short TTL

### 7.3 The Cache Avalanche

- **What happens:** Many cache keys expire at exactly the same time (same TTL set at the same batch load time) — mass cache miss — entire load hits the DB simultaneously — DB overloaded
- **Real pattern:** Batch cache population where all keys get the same TTL, scheduled cache warming that expires together
- **Scale trigger:** The more keys expire together, the worse the avalanche
- **Symptoms:** Periodic complete application slowdown at the TTL interval, DB CPU spike, log shows mass cache misses at the same timestamp
- **Solution:** Add random jitter to TTLs during batch population (`base_ttl + random(0, base_ttl * 0.2)`); use different TTLs for different data categories; pre-warm cache before expiry with a background job
- **Lesson:** Synchronized cache expiry is a scheduled outage — always desynchronize TTLs with jitter

### 7.4 The Stale Permission Cache

- **What happens:** User's permissions are cached with a 1-hour TTL — admin revokes a critical permission — user retains access for up to 1 hour — security incident
- **Real pattern:** Any security-critical data cached with a long TTL
- **Scale trigger:** Happens on the first permission change while the old cache is live
- **Symptoms:** User can access resources after permission revoked, security audit failure, compliance violation
- **Solution:** Short TTL for security-critical data (30–60 seconds max); event-driven invalidation on permission change (publish event → invalidate cache key); use version token in cache key tied to `permissions.updated_at`
- **Lesson:** Caching security data with long TTLs is a security vulnerability, not just a staleness issue

### 7.5 The Redis Memory Eviction Cascade

- **What happens:** Redis fills to capacity — eviction policy (allkeys-lru) starts silently evicting keys — evicted keys become cache misses — DB is hit for every evicted key — DB overwhelmed — application slows — cascade failure
- **Real pattern:** Underpowered Redis instance, sudden traffic spike, data growth without cache capacity review
- **Scale trigger:** Once Redis exceeds its maxmemory limit, eviction begins — cascade happens gradually then suddenly
- **Symptoms:** Redis `evicted_keys` counter climbs, DB query rate increases, cache hit rate drops, application latency grows
- **Solution:** Monitor Redis memory at 70% (warn) and 85% (page); set TTL on all keys so natural expiry manages memory; size Redis for working set + 30% headroom; Redis Cluster for horizontal memory scaling
- **Lesson:** Redis running out of memory silently evicts your most-used data — the DB flood that follows is the first visible symptom

---

## Part 8 — Backup and Recovery Failure Cases

### 8.1 The Backup That Was Never Tested

- **What happens:** Backups have been running successfully for months — a restore is needed — the restore fails because the backup files are corrupted, the restore procedure was never documented, or the restored DB is missing key configuration
- **Real pattern:** Every organization that has "automated backups" but has never practiced a restore
- **Scale trigger:** Discovered only when you need the backup most — after a production disaster
- **Solution:** Automated restore tests in CI/CD — restore the backup to a test environment weekly; verify row counts and data integrity; time the restore and ensure it meets your RTO
- **Lesson:** A backup you have never restored is not a backup — it is a hope. Test restores on a schedule, not on demand.

### 8.2 The Backup That Excluded the Most Important Data

- **What happens:** Logical backup (`pg_dump`) excludes certain tables for "performance" — those tables contain the most critical data — disaster happens — restore is missing the excluded tables
- **Real pattern:** Partial backups configured for speed without understanding criticality
- **Solution:** Full backups for critical data; separate backup tiers for different criticality; backup inventory that documents what is and is not covered; test restores verify completeness
- **Lesson:** A partial backup is only useful if you know exactly what it excludes and have a plan for recovering the rest

### 8.3 The PITR That Was Never Configured

- **What happens:** Accidental mass delete occurs — team goes to restore to 5 minutes before the incident — discovers that WAL archiving was never configured — only the last nightly backup is available — 23 hours of data is lost
- **Real pattern:** Teams who configure snapshot backups but not continuous WAL archiving
- **Scale trigger:** Discovered during the disaster — no warning
- **Solution:** Configure WAL archiving from day one (WAL-E, pgBackRest, Barman); verify the archive is receiving files regularly; practice PITR restore quarterly
- **Lesson:** A daily backup gives you RPO of 24 hours — if that is unacceptable, you need WAL archiving for PITR

### 8.4 The Cascading Delete That Wasn't Caught Until Backup Retention Expired

- **What happens:** An accidental `ON DELETE CASCADE` silently deletes thousands of rows — nobody notices for 35 days — backup retention is 30 days — the oldest backup already has the corrupted state — no clean backup exists
- **Real pattern:** Silent data corruption or deletion with long discovery delay
- **Solution:** Keep at least one backup longer than your maximum detection delay (90-day retention for monthly billing cycles); delayed replica (24-hour lag) as a recovery option for recent incidents; data anomaly alerts (sudden drop in row count)
- **Lesson:** Backup retention must exceed your realistic incident detection time — not just your operational comfort zone

---

## Part 9 — Migration Failure Cases

### 9.1 The Locking ALTER TABLE Production Outage

- **What happens:** `ALTER TABLE orders ADD COLUMN notes TEXT NOT NULL DEFAULT ''` — PostgreSQL rewrites the entire table — takes AccessExclusiveLock — blocks all reads and writes for 20 minutes
- **Real pattern:** Schema change run directly in production without an online migration tool
- **Scale trigger:** Instant production outage on any table > a few million rows
- **Symptoms:** Application completely unresponsive for the migration duration, connection pool fills with waiting queries, timeout cascade
- **Solution:** `ALTER TABLE ... ADD COLUMN` with a volatile default requires a table rewrite in PostgreSQL < 11; PostgreSQL 11+ stores the default without rewrite for non-volatile defaults; use `pg_repack` or add column as NULLABLE first, backfill, then add constraint
- **Lesson:** Every DDL on a large production table requires a migration plan — never run ALTER TABLE in production without verifying it is online-safe

### 9.2 The ORM AutoMigrate in Production

- **What happens:** GORM `AutoMigrate()` or Django `migrate` is run against production on startup — it adds columns, changes types, or worse, drops columns silently — no review, no backup, no rollback plan
- **Real pattern:** Development-style migration tooling accidentally left enabled in production
- **Scale trigger:** First production deployment with auto-migrate enabled
- **Solution:** Disable auto-migration in production completely; use explicit versioned migration files reviewed as code (golang-migrate, Flyway, Atlas); deploy migrations separately from code deploys with explicit approval
- **Lesson:** Schema changes are production deployments — they require the same rigor as code: review, testing, staging validation, rollback plan

### 9.3 The Migration Rollback That Dropped Columns the Old Code Still Used

- **What happens:** Migration removes a column that the previous code version still references — deployment fails — rollback to old code — old code tries to use the dropped column — application crashes on startup
- **Real pattern:** Schema change and code change deployed together, without thinking about rollback compatibility
- **Scale trigger:** First failed deployment with this pattern
- **Solution:** Expand-contract: (1) deploy new code that doesn't use the column yet, (2) verify old code is gone, (3) then run migration to drop the column — always decouple schema changes from code deploys
- **Lesson:** Your schema must be compatible with both the current and the previous version of your code during every deployment window

### 9.4 The Long Backfill That Locked All Writes

- **What happens:** Migration adds a new column and backfills it in a single transaction — `UPDATE users SET tier = 'free' WHERE tier IS NULL` on 200M rows — single transaction holds locks for 2 hours — no writes can proceed
- **Real pattern:** Data backfills written as a single UPDATE inside a migration file
- **Scale trigger:** Any backfill of more than a few hundred thousand rows in a single transaction
- **Solution:** Batch the backfill — 1,000–10,000 rows per transaction with commits; use a background job outside the migration framework; add the column as nullable first (no rewrite), backfill in background, add NOT NULL constraint after
- **Lesson:** Any migration that touches every row in a large table must be batched — a single transaction is always wrong for large backfills

---

## Summary Reference Table

| #    | Failure Case                         | Root Cause                              | Category    |
| ---- | ------------------------------------ | --------------------------------------- | ----------- |
| 1.1  | N+1 Query Disaster                   | Too many round trips                    | Query       |
| 1.2  | OFFSET Pagination Collapse           | O(offset) scan                          | Query       |
| 1.3  | COUNT(*) Bottleneck                  | Full scan for a number                  | Query       |
| 1.4  | Unbounded Result Set                 | No LIMIT clause                         | Query       |
| 1.5  | Implicit Type Cast Index Kill        | Type mismatch                           | Query       |
| 1.6  | Wildcard Leading LIKE                | No index on %keyword%                   | Query       |
| 1.7  | SELECT * Over-Fetch                  | Fetching unused columns                 | Query       |
| 1.8  | Unbounded IN Clause                  | List grows without bound                | Query       |
| 1.9  | Function in WHERE Clause             | Function prevents index use             | Query       |
| 1.10 | OR Condition Index Breakdown         | OR across separate indexes              | Query       |
| 1.11 | Missing Composite Index Order        | Wrong leading column                    | Query       |
| 1.12 | ORDER BY Sort Spill                  | Sort without index                      | Query       |
| 1.13 | Cartesian Product Accident           | Missing JOIN condition                  | Query       |
| 1.14 | Correlated Subquery Per Row          | N subqueries in SELECT                  | Query       |
| 1.15 | DISTINCT Performance Trap            | Full result deduplication               | Query       |
| 1.16 | Recursive CTE Stack Overflow         | Cyclic data, no guard                   | Query       |
| 2.1  | Missing Foreign Key Index            | No index on FK column                   | Index       |
| 2.2  | Index That Never Gets Used           | Low selectivity / stale stats           | Index       |
| 2.3  | Index Bloat Explosion                | Dead entries accumulate                 | Index       |
| 2.4  | Over-Indexed Write Table             | Too many indexes on writes              | Index       |
| 2.5  | Partial Index Mismatch               | Query doesn't match partial             | Index       |
| 2.6  | Index on Low-Cardinality Boolean     | Boolean has 2 values                    | Index       |
| 2.7  | Write-Time Index Rebuild Lock        | CREATE INDEX without CONCURRENTLY       | Index       |
| 3.1  | Connection Pool Exhaustion           | Too many connections                    | Connection  |
| 3.2  | Idle Connection Leak                 | Connections never returned              | Connection  |
| 3.3  | Long Transaction Lock Escalation     | Transaction held too long               | Connection  |
| 3.4  | Cascading Slow Query Timeout         | One slow query blocks all               | Connection  |
| 3.5  | Serverless Connection Explosion      | Lambda × connections                    | Connection  |
| 3.6  | Work_mem Sort Spill Cascade          | Memory × concurrency                    | Connection  |
| 3.7  | Shared Buffers Under-Allocation      | Default 128MB on 64GB RAM               | Connection  |
| 4.1  | Hot Row Bottleneck                   | All writes to one row                   | Write       |
| 4.2  | Deadlock Cascade                     | Circular lock dependency                | Write       |
| 4.3  | Lost Update Under Concurrency        | Read-compute-write race                 | Write       |
| 4.4  | Phantom Read Double-Booking          | Two concurrent reservations             | Write       |
| 4.5  | Write Skew on Multi-Row Constraint   | Both see constraint satisfied           | Write       |
| 4.6  | Bulk Delete Lock Explosion           | Millions of rows in one DELETE          | Write       |
| 4.7  | Transaction Too Large to Rollback    | 100M row rollback stalls DB             | Write       |
| 4.8  | Optimistic Lock Retry Storm          | High contention + retries = livelock    | Write       |
| 5.1  | EAV Trap                             | Entity-Attribute-Value schema           | Schema      |
| 5.2  | God Table                            | One table for all entity types          | Schema      |
| 5.3  | Polymorphic Association No Index     | Missing type in composite index         | Schema      |
| 5.4  | Money Stored as FLOAT                | Floating-point rounding errors          | Schema      |
| 5.5  | Timestamps Without Timezone          | Local time in DB                        | Schema      |
| 5.6  | Unconstrained String Length          | No VARCHAR limit                        | Schema      |
| 5.7  | Missing Soft Delete Index            | IS NULL without partial index           | Schema      |
| 5.8  | Nullable Column False NULL Semantics | NULL used as magic value                | Schema      |
| 6.1  | Replication Lag Read Anomaly         | Read-after-write on replica             | Replication |
| 6.2  | Split-Brain Dual Write               | Both nodes think they're primary        | Replication |
| 6.3  | Replica Divergence Silent Corruption | Non-deterministic statement replication | Replication |
| 6.4  | Replication Slot Disk Fill           | WAL held for offline consumer           | Replication |
| 6.5  | Failover Promoted Outdated Replica   | Async lag + fast failover = data loss   | Replication |
| 7.1  | Cache Stampede                       | Popular key expires under load          | Cache       |
| 7.2  | Cache Penetration Attack             | Non-existent keys hit DB                | Cache       |
| 7.3  | Cache Avalanche                      | Mass simultaneous expiry                | Cache       |
| 7.4  | Stale Permission Cache               | Security data with long TTL             | Cache       |
| 7.5  | Redis Memory Eviction Cascade        | Redis full → eviction → DB flood        | Cache       |
| 8.1  | Backup Never Tested                  | Restore fails when needed               | Backup      |
| 8.2  | Backup Excluded Critical Data        | Partial backup gap                      | Backup      |
| 8.3  | PITR Never Configured                | 24h RPO when 5min needed                | Backup      |
| 8.4  | Silent Delete Beyond Retention       | Corruption older than backup window     | Backup      |
| 9.1  | Locking ALTER TABLE Outage           | DDL without CONCURRENTLY                | Migration   |
| 9.2  | ORM AutoMigrate in Production        | Dev tooling in prod                     | Migration   |
| 9.3  | Migration Rollback Dropped Column    | Schema/code not decoupled               | Migration   |
| 9.4  | Long Backfill Locked All Writes      | Single-transaction UPDATE of millions   | Migration   |

---

_Total: 57 failure cases across 9 categories. The most dangerous ones are the silent failures — type cast index kills, replica divergence, stale permission caches, and silent deletes. They cause no immediate error; they just quietly make your system wrong until the consequences become impossible to ignore._