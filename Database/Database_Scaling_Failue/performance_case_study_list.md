# Database Performance Improvement Case Studies — Complete List

> Every case follows the same structure: **Situation → Problem → Investigation → Solution → Result → Lesson** These are real patterns from real production systems — the numbers are realistic based on documented improvements in engineering blogs and post-mortems.

---

## How to Study a Performance Case

For every case, extract these five answers:

1. **How was the problem discovered?** — Alert, user complaint, routine audit?
2. **What tool revealed the root cause?** — EXPLAIN ANALYZE, pg_stat_statements, slow query log?
3. **What was the single biggest lever?** — Index, query rewrite, schema change, architecture?
4. **What was the before/after?** — Always quantify the improvement
5. **What would have prevented it?** — Process, tooling, convention, code review?

---

## Part 1 — Index Optimization Case Studies

### 1.1 Adding One Index: 45 Seconds → 2 Milliseconds

- **Situation:** E-commerce platform, `orders` table with 80 million rows
- **Problem:** Order history page takes 45 seconds to load for any user
- **Investigation:** `EXPLAIN ANALYZE` on `SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at DESC LIMIT 20` shows `Seq Scan on orders (cost=0.00..2,400,000)` — scanning all 80M rows
- **Root cause:** No index on `user_id` column — every order history page scan the entire table
- **Solution:** `CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id, created_at DESC)`
- **Result:** 45,000ms → 2ms — 22,500× improvement — done without downtime using CONCURRENTLY
- **Lesson:** A single missing index on a foreign key column is enough to bring an entire feature to its knees

### 1.2 Covering Index Eliminates Table Heap Access: 800ms → 5ms

- **Situation:** SaaS dashboard showing "active subscriptions per plan" — runs on every dashboard page load
- **Problem:** Query takes 800ms — slows every user's dashboard
- **Query:** `SELECT plan_id, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY plan_id`
- **Investigation:** EXPLAIN shows `Index Scan on idx_subscriptions_status` followed by `Heap Fetch` for every matching row — fetching `plan_id` from the heap even though it is in the WHERE
- **Root cause:** Index on `(status)` only — `plan_id` not in index so heap must be accessed for every row
- **Solution:** Replace index with covering index: `CREATE INDEX ON subscriptions (status, plan_id) WHERE status = 'active'` — `plan_id` is now in the index, heap access eliminated
- **Result:** 800ms → 5ms — Index Only Scan, zero heap fetches — 160× improvement
- **Lesson:** A covering index eliminates heap access entirely — include all columns the query needs in the index

### 1.3 Partial Index Shrinks Index 95%, Query 200× Faster

- **Situation:** Task management app, `tasks` table with 50 million rows — 98% are `status = 'completed'`
- **Problem:** `SELECT * FROM tasks WHERE user_id = 1 AND status = 'pending'` takes 2 seconds
- **Investigation:** Full index on `(user_id, status)` — index is 8GB — only 2% of rows are `pending` but the index covers all 50M rows
- **Root cause:** The index is enormous because it includes completed tasks that will never be queried
- **Solution:** Partial index: `CREATE INDEX ON tasks (user_id) WHERE status = 'pending'` — only indexes the 1M pending tasks
- **Result:** Index size 8GB → 400MB (95% smaller), query 2,000ms → 10ms — 200× improvement — index fits in buffer cache where the full index could not
- **Lesson:** A partial index on the minority condition is smaller, faster, and fits in RAM — the planner prefers it over a full index for matching queries

### 1.4 Expression Index on Function: 12 Seconds → 8ms

- **Situation:** User authentication system — login by email
- **Problem:** `SELECT * FROM users WHERE LOWER(email) = LOWER('User@Example.com')` takes 12 seconds
- **Investigation:** Index exists on `email` but query applies `LOWER()` — LOWER() on the column prevents index use — full sequential scan
- **Root cause:** Function applied to the indexed column — the index stores the original value but the query compares a transformed value
- **Solution:** Expression index: `CREATE INDEX ON users (LOWER(email))` — stores the pre-computed lowercase value; rewrite query to `WHERE LOWER(email) = 'user@example.com'`
- **Result:** 12,000ms → 8ms — 1,500× improvement — sequential scan replaced by index scan
- **Lesson:** If you always apply a function to a column in WHERE, index the expression, not the column

### 1.5 Composite Index Column Reorder: 3 Seconds → 15ms

- **Situation:** Logistics platform, `shipments` table — 200 million rows
- **Problem:** `SELECT * FROM shipments WHERE status = 'in_transit' AND warehouse_id = 5 AND created_at > NOW() - INTERVAL '7 days'` takes 3 seconds
- **Investigation:** Index exists on `(created_at, status, warehouse_id)` — planner uses it but selectivity is low — `created_at` range returns 40M rows before applying other filters
- **Root cause:** Index column order — range condition (`created_at`) is first, blocking efficient filtering — equality conditions (`status`, `warehouse_id`) should come first
- **Solution:** Create new index: `CREATE INDEX ON shipments (warehouse_id, status, created_at)` — equality columns first, range column last — drop old index
- **Result:** 3,000ms → 15ms — 200× improvement — same data, same hardware, just column order changed
- **Lesson:** Composite index rule: equality conditions first, range conditions last — column order matters as much as which columns are included

### 1.6 BRIN Index on Time-Series: 4GB Index → 128KB, Same Performance

- **Situation:** IoT platform — `sensor_readings` table with 5 billion rows, 200GB of data — data is always inserted in timestamp order
- **Problem:** B-Tree index on `recorded_at` is 4GB — takes minutes to create — consumes significant RAM in buffer cache
- **Investigation:** B-Tree is appropriate for random-access data but `sensor_readings` is always inserted sequentially by time — B-Tree's random-access benefits are wasted here
- **Root cause:** Wrong index type for the access pattern — B-Tree for sequentially-appended data
- **Solution:** Replace B-Tree with BRIN (Block Range Index): `CREATE INDEX ON sensor_readings USING BRIN (recorded_at)` — stores min/max per disk block, works perfectly for sequential data
- **Result:** Index size 4GB → 128KB (31,000× smaller), index creation time hours → seconds, query performance equivalent — the BRIN covers the same time-range queries just as well
- **Lesson:** BRIN is purpose-built for sequentially-appended data — for time-series tables, it is almost always the right choice over B-Tree for timestamp columns

### 1.7 Index on JSON Field Eliminates Full Table Scan: 25 Seconds → 30ms

- **Situation:** Product catalog — `products` table with 5 million rows — metadata stored in JSONB column
- **Problem:** `SELECT * FROM products WHERE metadata->>'brand' = 'Nike'` takes 25 seconds
- **Investigation:** EXPLAIN shows `Seq Scan on products` with `Filter: ((metadata ->> 'brand') = 'Nike')` — every row parsed and compared
- **Root cause:** No index on the JSONB path — every query must parse and scan all 5M JSONB documents
- **Solution 1 (Expression Index):** `CREATE INDEX ON products ((metadata->>'brand'))` — indexes the specific path
- **Solution 2 (GIN Index):** `CREATE INDEX ON products USING GIN (metadata)` — indexes all paths, better if many different JSON fields are queried
- **Result:** 25,000ms → 30ms for Solution 1 (833× improvement), 25,000ms → 45ms for Solution 2 (556× improvement) — Solution 1 wins for single-field queries
- **Lesson:** A GIN index covers all JSONB paths; an expression index covers one path faster — choose based on how many different JSON fields appear in WHERE clauses

### 1.8 Removing Unused Indexes Doubled Write Throughput

- **Situation:** High-frequency trading platform — `trades` table receives 50,000 inserts/second
- **Problem:** Write latency growing over time — 50,000 inserts/second target cannot be sustained above 30,000/second
- **Investigation:** `pg_stat_user_indexes` shows 14 indexes on the `trades` table — 9 have `idx_scan = 0` over the last 30 days — 9 indexes are never used but updated on every insert
- **Root cause:** Over-indexed table — each of the 14 indexes must be updated on every insert regardless of whether any query uses it
- **Solution:** Drop all 9 unused indexes after verifying across a 60-day window — keep only 5 that are actually used
- **Result:** Write throughput 30,000/second → 58,000/second — nearly 2× improvement — same hardware, just fewer indexes to maintain on write
- **Lesson:** Unused indexes are a write tax — audit `pg_stat_user_indexes.idx_scan` regularly and drop indexes that haven't been used in 30+ days

---

## Part 2 — Query Rewrite Case Studies

### 2.1 Subquery to JOIN: 18 Seconds → 40ms

- **Situation:** HR system — employee report query
- **Problem:** `SELECT * FROM employees WHERE department_id IN (SELECT id FROM departments WHERE region = 'Asia')` takes 18 seconds
- **Investigation:** EXPLAIN shows the subquery is executed as a correlated subquery — re-evaluated for every employee row — 500,000 employees × subquery execution = catastrophic
- **Root cause:** IN with subquery is sometimes executed as a nested loop — the planner did not optimize it to a hash join
- **Solution:** Rewrite to explicit JOIN: `SELECT e.* FROM employees e JOIN departments d ON e.department_id = d.id WHERE d.region = 'Asia'` — planner now uses Hash Join with departments result
- **Result:** 18,000ms → 40ms — 450× improvement — same result, different query shape
- **Lesson:** `IN (subquery)` and `JOIN` are logically equivalent but the planner may execute them very differently — when IN is slow, try rewriting as JOIN

### 2.2 Cursor Pagination Replaces OFFSET: 8 Seconds → 3ms

- **Situation:** Social media feed — infinite scroll using OFFSET pagination
- **Problem:** Users who scroll deep have feeds loading in 8+ seconds
- **Query:** `SELECT * FROM posts ORDER BY created_at DESC OFFSET 50000 LIMIT 20` — must scan and discard 50,000 rows
- **Investigation:** EXPLAIN shows `Rows Removed by Filter: 50000` on every deep page
- **Solution:** Keyset pagination: `SELECT * FROM posts WHERE created_at < :last_seen_ts AND id < :last_seen_id ORDER BY created_at DESC, id DESC LIMIT 20` — uses index directly, skips nothing
- **Result:** 8,000ms → 3ms for deep pages — 2,666× improvement — and performance is constant regardless of how deep the user scrolls
- **Lesson:** Cursor pagination has constant time regardless of depth — OFFSET pagination degrades linearly with depth

### 2.3 EXISTS Replaces COUNT: 4 Seconds → 1ms

- **Situation:** Authorization check — "does this user have any admin role?"
- **Problem:** `SELECT COUNT(*) FROM user_roles WHERE user_id = 1 AND role = 'admin' > 0` takes 4 seconds
- **Investigation:** COUNT(*) scans all matching rows and counts them — even if the answer is found on the first row, the scan continues
- **Root cause:** COUNT(*) must see all matching rows — it cannot stop early
- **Solution:** `SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = 1 AND role = 'admin')` — EXISTS stops on the first matching row
- **Result:** 4,000ms → 1ms — EXISTS short-circuits immediately on first match
- **Lesson:** For existence checks, EXISTS is always faster than COUNT > 0 — it stops at the first matching row

### 2.4 Window Function Replaces Correlated Subquery: 2 Minutes → 800ms

- **Situation:** Analytics report — "for each order, show the customer's total lifetime value up to that order date"
- **Problem:** Query runs for 2 minutes, sometimes times out
- **Original query:** Correlated subquery in SELECT: `SELECT o.id, (SELECT SUM(amount) FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.created_at <= o.created_at) FROM orders o`
- **Investigation:** For each of 10M orders, the correlated subquery runs once — 10M subquery executions
- **Solution:** Window function: `SELECT id, SUM(amount) OVER (PARTITION BY customer_id ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM orders`
- **Result:** 120,000ms → 800ms — 150× improvement — one pass over the data instead of N passes
- **Lesson:** Any correlated subquery that aggregates over a partition can be replaced with a window function — one pass instead of N passes

### 2.5 CTE Materialization Forces Efficient Plan: 45 Seconds → 200ms

- **Situation:** Complex analytics query using multiple CTEs
- **Problem:** A query with 5 nested CTEs takes 45 seconds — the planner is choosing a bad join order
- **Investigation:** EXPLAIN ANALYZE shows the planner is inlining CTEs and choosing a catastrophic nested loop join — CTE inlining allows the planner to "see inside" the CTE and choose a bad plan
- **Root cause:** PostgreSQL 12+ inlines CTEs by default — the planner reorders joins in ways that hurt performance
- **Solution:** Force CTE materialization: `WITH my_cte AS MATERIALIZED (SELECT ...)` — prevents the planner from inlining and forces it to execute the CTE first, then join the result
- **Result:** 45,000ms → 200ms — 225× improvement — the CTE result is now a concrete intermediate table the planner must join, not an expression it can reorganize
- **Lesson:** CTE materialization is a planning fence — use `MATERIALIZED` when you know a CTE produces a good intermediate result that the planner should not reorganize

### 2.6 Batching Replaces Per-Row Updates: 3 Hours → 4 Minutes

- **Situation:** Data migration — update a `tier` column on 50 million user rows
- **Problem:** Application code iterates users one by one: `for user in users: db.execute("UPDATE users SET tier = ? WHERE id = ?", tier, user.id)` — 3 hours to complete
- **Investigation:** 50 million individual UPDATE statements — each with a round trip — network latency dominates
- **Solution 1 (Bulk SQL):** `UPDATE users SET tier = CASE WHEN spend > 1000 THEN 'gold' ELSE 'silver' END` — single statement
- **Solution 2 (Batched with COPY):** Load new values to a temp table via `COPY`, then `UPDATE users SET tier = t.tier FROM temp_tiers t WHERE users.id = t.id`
- **Result:** 3 hours → 4 minutes — 45× improvement — fewer round trips, DB does the work in bulk
- **Lesson:** Per-row updates from application code have network round-trip overhead per row — always batch updates into set-based SQL operations

### 2.7 Avoiding DISTINCT With Proper JOIN: 12 Seconds → 50ms

- **Situation:** Reporting query — "list all customers who placed at least one order"
- **Problem:** `SELECT DISTINCT c.id, c.name FROM customers c JOIN orders o ON c.id = o.customer_id` takes 12 seconds — DISTINCT must deduplicate the huge join result
- **Investigation:** The join produces millions of rows (one per order per customer), then DISTINCT deduplicates — massive intermediate result set
- **Root cause:** JOIN + DISTINCT is an expensive way to express "customer exists in orders"
- **Solution:** `SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` — EXISTS short-circuits, no join, no deduplication
- **Result:** 12,000ms → 50ms — 240× improvement — EXISTS checks per customer instead of joining and deduplicating
- **Lesson:** JOIN + DISTINCT is almost always replaceable with EXISTS — EXISTS avoids producing the intermediate join result entirely

### 2.8 Rewriting OR to UNION ALL: 20 Seconds → 100ms

- **Situation:** Search feature — find products by name OR by barcode
- **Problem:** `SELECT * FROM products WHERE name ILIKE '%keyboard%' OR barcode = '123456789'` takes 20 seconds
- **Investigation:** EXPLAIN shows OR forces a Seq Scan — the planner cannot use the `barcode` index and the `name` GIN index simultaneously with OR
- **Root cause:** OR across different indexes prevents the planner from using both indexes in one scan
- **Solution:** Rewrite as UNION ALL: `SELECT * FROM products WHERE barcode = '123456789' UNION ALL SELECT * FROM products WHERE name ILIKE '%keyboard%' AND barcode != '123456789'`
- **Result:** 20,000ms → 100ms — each branch uses its own index — 200× improvement
- **Lesson:** OR across different indexed columns prevents the planner from using both indexes — UNION ALL lets each branch use its own index

### 2.9 Pre-Aggregated Summary Table Replaces Runtime Aggregation: 45 Seconds → 2ms

- **Situation:** Dashboard showing "total revenue per day for the last 365 days"
- **Problem:** `SELECT DATE(created_at), SUM(amount) FROM orders WHERE created_at > NOW() - INTERVAL '1 year' GROUP BY DATE(created_at)` takes 45 seconds — scanning 500M orders
- **Investigation:** 500 million rows scanned and summed on every dashboard load — CPU and I/O intensive
- **Solution:** Pre-aggregated summary table updated by a trigger or daily job: `revenue_daily (date, total_amount, order_count)` — 365 rows instead of 500M
- **Result:** 45,000ms → 2ms — 22,500× improvement — the dashboard now reads 365 rows instead of 500M
- **Lesson:** When a query aggregates an enormous table and the result is small (days, regions, categories), pre-aggregate into a summary table — the dashboard does not need to re-derive the answer on every page load

### 2.10 Push Filters Into Subquery: 3 Minutes → 8 Seconds

- **Situation:** Analytics platform — complex report with multiple joins
- **Problem:** Report query joins several large tables then filters the result — takes 3 minutes
- **Original query:** `SELECT ... FROM (SELECT * FROM orders JOIN order_items ...) sub WHERE sub.created_at > '2024-01-01'`
- **Investigation:** The subquery returns 500M rows, then the outer WHERE filters — filter happens after the huge join
- **Root cause:** Filter is applied too late — the planner processes an enormous intermediate result before filtering
- **Solution:** Push the filter into the subquery: `SELECT ... FROM (SELECT * FROM orders JOIN order_items ... WHERE orders.created_at > '2024-01-01') sub`
- **Result:** 3 minutes → 8 seconds — 22× improvement — filter reduces the join input from 500M to 10M rows
- **Lesson:** Apply filters as early as possible — inside subqueries, not outside them — reduce the data before joining, not after

---

## Part 3 — Schema Design Improvement Case Studies

### 3.1 Normalizing a Denormalized Table: 10× Write Performance Improvement

- **Situation:** Logging system storing full JSON event documents in a single TEXT column with duplicate data
- **Problem:** Storage growing 5× faster than event volume — same user/product data repeated in every event row — 80% of each row is redundant data
- **Investigation:** Each event row contains `user_name`, `user_email`, `user_tier`, `product_name`, `product_price` — all duplicated from the `users` and `products` tables
- **Solution:** Normalize — store only `user_id` and `product_id` in the events table, JOIN to get names/emails at query time
- **Result:** Table size reduced 80%, write throughput improved 3× (fewer bytes per insert), index sizes reduced proportionally — query performance slightly slower due to JOINs but acceptable for the use case
- **Lesson:** Denormalized wide rows waste storage, slow writes, and bloat indexes — normalize when write performance matters more than read simplicity

### 3.2 Partitioning an Old Table: Retention Job 6 Hours → 3 Seconds

- **Situation:** Audit log table — 2 billion rows — 90-day retention policy
- **Problem:** Nightly retention job `DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days'` runs for 6 hours, causes massive I/O and vacuum load
- **Solution:** Migrate to monthly range partitioning — `PARTITION BY RANGE (created_at)` with one partition per month — retention job changed to `DROP TABLE audit_log_2023_10` (drops the whole partition)
- **Migration:** New partitioned table created → data migrated in batches → application pointed to new table → old table dropped
- **Result:** Retention job 6 hours → 3 seconds — partition DROP is instantaneous — no rows deleted, no vacuum needed, no I/O spike
- **Lesson:** Dropping a partition is the fastest possible data deletion — if you have time-based retention, partition by time from day one

### 3.3 Adding a Status Column Eliminates Expensive JOIN: 2 Seconds → 10ms

- **Situation:** Notification system — display unread notification count in the header on every page load
- **Problem:** `SELECT COUNT(*) FROM notifications n LEFT JOIN reads r ON n.id = r.notification_id WHERE r.id IS NULL AND n.user_id = 1` takes 2 seconds
- **Investigation:** Anti-join pattern — finding rows in `notifications` that don't exist in `reads` — requires joining two large tables and finding the gaps
- **Solution:** Add `is_read BOOLEAN DEFAULT FALSE NOT NULL` column to `notifications` — update it on read — query becomes `SELECT COUNT(*) FROM notifications WHERE user_id = 1 AND is_read = FALSE`
- **Index:** Partial index `CREATE INDEX ON notifications (user_id) WHERE is_read = FALSE`
- **Result:** 2,000ms → 10ms — 200× improvement — the complex anti-join replaced by a simple indexed filter
- **Lesson:** A denormalized status column often eliminates an expensive anti-join — the write cost of maintaining the column is worth the read benefit

### 3.4 Using NUMERIC Instead of VARCHAR for Sortable IDs: Sort Performance 10×

- **Situation:** Invoice system — invoice numbers stored as VARCHAR (`INV-000001`, `INV-000002`)
- **Problem:** `ORDER BY invoice_number` returns wrong order — string sort puts `INV-10` before `INV-9` — requires `ORDER BY CAST(REPLACE(invoice_number, 'INV-', '') AS INTEGER)` — cannot use index
- **Solution:** Store the numeric portion separately as `invoice_sequence INTEGER` — keep `invoice_number` as a generated/computed display column — sort and index on the integer
- **Result:** Sort queries 10× faster — index usable for ordering — correct sort order without casting
- **Lesson:** Never store sortable numeric sequences as strings — store the number as a number and format it at display time

### 3.5 Replacing EAV with JSONB: Query Time 30 Seconds → 200ms

- **Situation:** Product catalog — custom attributes stored in EAV pattern — `(product_id, attr_name, attr_value)` table — 3 tables join needed to get all attributes
- **Problem:** "Find all products where color = 'red' AND size = 'L' AND material = 'cotton'" requires 3 self-joins on the EAV table — 30 seconds
- **Solution:** Migrate to JSONB column on the `products` table — `attributes JSONB` stores `{"color": "red", "size": "L", "material": "cotton"}` — add GIN index
- **Result:** 30,000ms → 200ms using GIN containment query `WHERE attributes @> '{"color": "red", "size": "L"}'` — 150× improvement — also dramatically simplified query code
- **Lesson:** EAV is almost always replaceable with JSONB — JSONB with a GIN index is faster than EAV with self-joins and simpler to query

### 3.6 Storing Aggregates on the Row: Real-Time Counter Query 500ms → 0.1ms

- **Situation:** Blog platform — displaying comment count, like count, share count on every post card
- **Problem:** `SELECT COUNT(*) FROM comments WHERE post_id = ?`, `SELECT COUNT(*) FROM likes WHERE post_id = ?` — two expensive count queries per post card × 20 posts per page = 40 count queries per page load
- **Solution:** Add `comment_count INT DEFAULT 0`, `like_count INT DEFAULT 0` to `posts` table — maintained by triggers or application-level increment on INSERT
- **Result:** 40 count queries (500ms total) → 0 count queries (counts already in the post row) — counts fetched as part of the `SELECT * FROM posts` query at no extra cost
- **Lesson:** Storing aggregate counts on the parent row is a classic denormalization win — the write overhead of maintaining the counter is negligible compared to the read savings

---

## Part 4 — Caching Improvement Case Studies

### 4.1 Redis Cache Layer: DB Load Reduced 95%, Latency 200ms → 2ms

- **Situation:** News website — top 100 articles are read 10,000 times per second
- **Problem:** Database CPU at 95%, article page load 200ms, DB cannot scale further without expensive hardware upgrade
- **Investigation:** `pg_stat_statements` shows the top-10 queries are all `SELECT * FROM articles WHERE id = ?` for the same 100 article IDs — same 100 rows being fetched millions of times
- **Solution:** Cache article rows in Redis with 5-minute TTL — check cache before querying DB — invalidate cache on article update
- **Result:** DB CPU 95% → 5% (cache handles 95% of reads), article page 200ms → 2ms, DB query rate 10,000/sec → 500/sec
- **Lesson:** A small number of rows read extremely frequently is the best caching candidate — the cache hit rate approaches 100% and the DB savings are proportional

### 4.2 Materialized View Refresh: Report 8 Minutes → Instant

- **Situation:** Financial reporting — monthly P&L report across 500 million transaction rows
- **Problem:** Monthly report query takes 8 minutes — CFO cannot get answers quickly during board meetings
- **Solution:** Materialized view updated nightly: `REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_pnl` — runs at 2 AM in 12 minutes — during the day, report reads from the materialized view (pre-computed)
- **Result:** Report query 8 minutes → instant (reads from pre-computed view) — nightly refresh is 12 minutes but happens offline
- **Trade-off accepted:** Report data is up to 24 hours stale — acceptable for monthly reporting
- **Lesson:** If a query is expensive and the result does not need to be real-time, a materialized view moves the cost to a scheduled refresh and makes the user-facing query instant

### 4.3 Application-Level Query Result Cache: API Response 1.2 Seconds → 8ms

- **Situation:** Configuration API — returns system configuration read by every service on every request
- **Problem:** 500 microservices each making 10 requests/second to the config API — 5,000 DB queries/second for data that changes once per hour
- **Solution:** Cache the full query result in Redis with a 5-minute TTL — the config API reads from cache, refreshes from DB on miss or TTL expiry
- **Result:** DB query rate 5,000/second → 1/5-minutes, API response 1,200ms → 8ms — the DB barely sees config queries anymore
- **Lesson:** Configuration and reference data that rarely changes is the easiest caching win — cache it aggressively with a long TTL

### 4.4 Connection Pool as a Cache: 50ms Connection Overhead Eliminated

- **Situation:** Serverless function — each invocation opens a new DB connection — the connection establishment takes 50ms — function runs in 10ms — 80% of time is connection setup
- **Problem:** Total function latency 60ms, 83% of which is connection overhead — cold start makes latency unpredictable
- **Solution:** PgBouncer in transaction mode — functions connect to PgBouncer (fast, local) — PgBouncer maintains a pool of pre-established backend connections to PostgreSQL — no 50ms connection setup
- **Result:** Function latency 60ms → 12ms — connection overhead 50ms → 2ms — also enabled higher concurrency without exceeding DB connection limits
- **Lesson:** A connection pool is a cache for established DB connections — the cost of opening a new connection is significant and should only happen once per pool lifecycle

### 4.5 Read-Through Cache Absorbs Traffic Spike: 0% Downtime During 100× Traffic Spike

- **Situation:** E-commerce platform — Black Friday sale event — 100× normal traffic expected
- **Problem:** Normal traffic: 1,000 req/sec — Black Friday: 100,000 req/sec — DB cannot handle 100× query load — previous year saw a 45-minute outage
- **Solution:** Pre-warm Redis cache for all product pages, category pages, and user sessions 30 minutes before the sale — circuit breaker serves cached product pages even if DB is slow
- **Result:** DB query rate during the sale: 3,000 req/sec (cache handling 97%) — zero downtime — the sale ran on cache; the DB handled only writes and cache misses
- **Lesson:** Pre-warming the cache before a known traffic spike converts a potential outage into a non-event

---

## Part 5 — Architecture-Level Improvement Case Studies

### 5.1 Read Replica Reduces Primary Load: Primary CPU 95% → 20%

- **Situation:** Travel booking platform — all reads and writes on one PostgreSQL primary — peak hours cause CPU saturation
- **Problem:** Primary DB at 95% CPU — user-facing queries slow — cannot add more capacity to the primary without major hardware change
- **Investigation:** `pg_stat_statements` shows 80% of queries are reads (search, listing, detail pages) — only 20% are writes (bookings, updates)
- **Solution:** Add 3 read replicas — route all search and listing queries to replicas via PgBouncer — only writes and transactionally critical reads go to primary
- **Result:** Primary CPU 95% → 20% — read replica CPU at ~60% each — system can now handle 4× the read load with no primary upgrade
- **Lesson:** In read-heavy systems, read replicas are the first scaling lever — a single primary can serve many read replicas at low cost

### 5.2 CQRS Split Reduces Write Contention: Throughput 5× Improvement

- **Situation:** Order management system — orders table is read for display AND written to for state updates — read and write patterns are competing for locks
- **Problem:** During peak hours, read queries for order history and write queries for order status updates cause lock contention — throughput plateau at 500 TPS
- **Solution:** CQRS — write model: normalized orders table (OLTP) — read model: denormalized `order_summary` table updated asynchronously via triggers — reads go to `order_summary`, writes go to `orders`
- **Result:** Write throughput 500 TPS → 2,500 TPS — reads no longer compete with writes for locks — the read model can be indexed differently from the write model
- **Lesson:** Read and write workloads often compete for the same resources — separating them with CQRS allows each to be optimized independently

### 5.3 Vertical Partitioning Isolates a Hot Table: System-Wide Latency Improved 3×

- **Situation:** Monolithic DB — user sessions table (updated on every request) sits in the same DB as orders, products, and everything else
- **Problem:** The sessions table generates enormous WAL volume — checkpoint pressure affects all queries — I/O bound by session writes even for unrelated tables
- **Solution:** Move sessions to Redis — sessions are ephemeral and don't need ACID — PostgreSQL no longer handles session I/O
- **Result:** DB WAL generation rate reduced 70%, checkpoint pressure eliminated, overall DB query latency improved 3× for all unrelated queries — and Redis handles sessions 100× faster than PostgreSQL did
- **Lesson:** Identifying and moving the hottest table to a more appropriate store can improve performance for everything else in the DB

### 5.4 Table Sharding by User ID: Write Throughput 10× Improvement

- **Situation:** Social platform — single `posts` table with 50 billion rows — write throughput maxed out on the single primary
- **Problem:** Single primary cannot sustain 100,000 posts/second write rate — hardware at maximum, no more vertical scaling room
- **Solution:** Shard `posts` table by `user_id` % 16 across 16 PostgreSQL primaries — each shard handles ~6,000 writes/second — routing layer at application level
- **Result:** Write throughput 10,000/second → 100,000/second — linear scaling with shard count — each shard also independently backed up and replicated
- **Lesson:** When a single node's write capacity is exhausted, horizontal sharding is the only path — the key is choosing a shard key (user_id) that aligns with the most common query pattern

### 5.5 Moving from Row Store to Column Store: Analytics Query 4 Hours → 8 Seconds

- **Situation:** E-commerce analytics — revenue report running on PostgreSQL
- **Problem:** `SELECT product_id, SUM(revenue), AVG(margin) FROM sales GROUP BY product_id` on 10 billion rows takes 4 hours — runs at end of day, results are stale by the time they arrive
- **Solution:** Migrate analytics workload to ClickHouse — same data loaded via CDC from PostgreSQL — ClickHouse stores data in columnar format with compression
- **Result:** 4 hours → 8 seconds — 1,800× improvement — ClickHouse reads only the `product_id`, `revenue`, and `margin` columns instead of all columns; columnar compression reduces data read by 10×
- **Lesson:** Column stores are not incrementally better than row stores for analytics — they are orders of magnitude better; the right tool produces results that seem impossible on the wrong tool

### 5.6 CDC-Based Read Model Synchronization: Report Freshness 24 Hours → 30 Seconds

- **Situation:** Inventory management — nightly batch ETL populates the reporting database from the operational database
- **Problem:** Inventory reports are always 24 hours stale — warehouse staff making decisions based on yesterday's data — leading to stockouts and overstock
- **Solution:** Replace nightly batch ETL with CDC pipeline: Debezium captures every INSERT/UPDATE/DELETE from PostgreSQL → Kafka → consumer updates the reporting database in near real-time
- **Result:** Report freshness 24 hours → 30 seconds — warehouse staff now make decisions based on current data — stockout incidents reduced 60%
- **Lesson:** Batch ETL introduces staleness proportional to the batch interval — CDC makes the reporting database a near-real-time replica with minimal operational overhead

### 5.7 Connection Pooling with PgBouncer: Throughput 3× Improvement

- **Situation:** High-traffic web application — each web server instance opens 100 connections to PostgreSQL — 20 web servers = 2,000 connections — PostgreSQL struggling with connection overhead
- **Problem:** PostgreSQL spending significant CPU on connection management rather than query execution — connection count approaching `max_connections` — latency growing
- **Solution:** Deploy PgBouncer between web servers and PostgreSQL — web servers connect to PgBouncer (2,000 connections) — PgBouncer maintains 50 connections to PostgreSQL — 40:1 multiplexing
- **Result:** PostgreSQL active connections 2,000 → 50, query throughput 3× improvement (CPU freed from connection management), latency reduced 40%
- **Lesson:** PostgreSQL connection management consumes CPU that should be used for query execution — PgBouncer multiplexing is free throughput

### 5.8 Async Write Queue Absorbs Write Spikes: P99 Latency 8 Seconds → 50ms

- **Situation:** Analytics event tracking — every user action writes an event to the DB — flash sale causes 100× write spike
- **Problem:** During flash sales, 100,000 event writes/second overwhelm the DB — write latency P99 spikes to 8 seconds — users experience slow UI
- **Solution:** Write events to Redis list (sub-millisecond, fire-and-forget) — background worker drains Redis and batch-inserts to PostgreSQL at a controlled rate
- **Result:** User-facing write latency 8,000ms P99 → 50ms (writing to Redis is fast) — DB write load smoothed to a constant 5,000/second instead of spiky 100,000/second
- **Trade-off:** Events may be delayed by up to 30 seconds before appearing in the DB
- **Lesson:** Decoupling write acceptance from write persistence with a queue absorbs spikes and protects the DB — the user doesn't need to wait for the DB to confirm an analytics event

---

## Part 6 — PostgreSQL-Specific Improvement Case Studies

### 6.1 Tuning shared_buffers: Query Performance 40% Improvement Across the Board

- **Situation:** PostgreSQL on a 64GB RAM server — default configuration installed by package manager
- **Problem:** `shared_buffers = 128MB` (the default) on a 64GB server — only 0.2% of RAM available as DB cache — most queries cause disk reads
- **Investigation:** Buffer hit ratio from `pg_stat_bgwriter`: `(buffers_hit / (buffers_hit + buffers_read)) = 72%` — 28% of reads going to disk — should be above 99% for OLTP
- **Solution:** Set `shared_buffers = 16GB` (25% of RAM), `effective_cache_size = 48GB` (75% of RAM), `work_mem = 64MB` — run `PGTune` for full configuration
- **Result:** Buffer hit ratio 72% → 99.2%, average query time reduced 40% across all queries — no code change, no schema change, no hardware change
- **Lesson:** A default PostgreSQL installation is configured for a 1GB server — always tune for your actual hardware before concluding you need more hardware

### 6.2 Autovacuum Tuning: Table Bloat Eliminated, Queries 2× Faster

- **Situation:** High-traffic `orders` table — 10 million rows — constantly updated as order status changes
- **Problem:** Table size 50GB but logical data is 8GB — 42GB of dead tuple bloat — queries scanning the table must read through dead tuples
- **Investigation:** `SELECT n_dead_tup, n_live_tup FROM pg_stat_user_tables WHERE relname = 'orders'` shows 35M dead tuples vs 10M live — autovacuum cannot keep up with the update rate
- **Solution:** Per-table autovacuum tuning: `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_cost_delay = 2ms, autovacuum_vacuum_cost_limit = 400)` — autovacuum runs more aggressively on this specific table
- **Result:** Dead tuples reduced from 35M to under 500K within 24 hours — table size 50GB → 9GB — query performance 2× better across all queries touching the table
- **Lesson:** Default autovacuum settings are conservative — high-write tables need per-table tuning to stay healthy

### 6.3 Parallel Query: Analytical Query 8 Minutes → 90 Seconds

- **Situation:** PostgreSQL 13 on an 8-core server — large analytical query over a 200M row table
- **Problem:** `SELECT region, SUM(revenue) FROM sales GROUP BY region` takes 8 minutes — CPU shows only 1 of 8 cores busy during query
- **Investigation:** `EXPLAIN` shows `Workers Planned: 0` — parallel query not being used
- **Root cause:** `max_parallel_workers_per_gather = 0` (parallel query disabled) — had been disabled during an old incident and never re-enabled
- **Solution:** `SET max_parallel_workers_per_gather = 4` — enable parallel query for this workload
- **Result:** 8 minutes → 90 seconds — 5.3× improvement — 4 workers now contribute to the sequential scan and aggregation — CPU utilization goes from 12% to 62%
- **Lesson:** PostgreSQL parallel query can provide near-linear speedup for full table scans and aggregations — always check if it is enabled and verify execution plans show workers being used

### 6.4 WAL Tuning for Bulk Loads: Import 6 Hours → 45 Minutes

- **Situation:** Monthly data import — loading 2 billion rows from external data source into PostgreSQL
- **Problem:** Monthly import takes 6 hours — blocking the data team for too long
- **Investigation:** Import is WAL-bound — every insert generates WAL — WAL is fsynced to disk — the import rate is limited by fsync throughput
- **Solution:**
    1. `SET synchronous_commit = off` — don't wait for WAL fsync per transaction (risk: lose last 200ms of data if server crashes, acceptable for an import)
    2. Use `COPY` instead of individual INSERTs — COPY generates less WAL per row
    3. Drop indexes before import, rebuild after — inserting into an unindexed table is much faster
    4. Set `wal_level = minimal` for the import session
- **Result:** 6 hours → 45 minutes — 8× improvement — same data volume, same hardware
- **Lesson:** Bulk loads have different optimal settings from OLTP — temporarily relaxing durability guarantees and removing indexes dramatically improves import speed

### 6.5 pg_stat_statements Investigation: Identified 3 Queries Consuming 80% of DB Resources

- **Situation:** Production PostgreSQL — DB CPU at 70% during peak hours — cause unknown
- **Problem:** The team assumes the DB is just "busy" — considering expensive hardware upgrade
- **Investigation:** Enable `pg_stat_statements` — query `SELECT query, total_exec_time, calls, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10`
- **Finding:** 3 queries consuming 80% of total DB CPU time:
    1. An N+1 query called 5 million times/day with no result caching
    2. A report query without a covering index running every 5 minutes
    3. A pagination query using OFFSET 100,000 on every "load more" click
- **Solution:** Fix all 3 queries (cache the N+1 result, add covering index, convert to keyset pagination)
- **Result:** DB CPU 70% → 15% — $3,000/month hardware upgrade avoided — zero architecture change, zero additional servers
- **Lesson:** `pg_stat_statements` almost always reveals that a tiny number of queries consume the vast majority of DB resources — fix those queries before buying hardware

### 6.6 Fillfactor Tuning: HOT Updates Reduce Index Writes 80%

- **Situation:** User profile table — 5 million users — `last_seen_at` and `status` updated on every login
- **Problem:** Write WAL generation far exceeds expectations — each `UPDATE` is generating WAL for multiple index updates
- **Investigation:** PostgreSQL cannot use HOT (Heap-Only Tuple) updates because pages are 100% full — each update must find a new page and update all indexes
- **Root cause:** Default `fillfactor = 100` means pages are completely full — no room on the same page for the new row version — HOT updates impossible
- **Solution:** `ALTER TABLE users SET (fillfactor = 70)` and `VACUUM FULL users` to apply — 30% of each page left empty for in-place HOT updates
- **Result:** Index write amplification reduced 80% — WAL generation for this table reduced 65% — write throughput 2× improvement
- **Lesson:** For frequently-updated tables, reducing `fillfactor` enables HOT updates which skip index maintenance entirely — the storage overhead (larger table) is worth the write performance gain

---

## Part 7 — Real Company Performance Improvement Case Studies

### 7.1 Slack — Migrating Channels from MySQL to Vitess: 10× Write Capacity

- **Situation:** Slack's `channels` table outgrowing MySQL single primary — write capacity limit reached
- **Problem:** Single MySQL primary could not sustain the write rate from Slack's growing user base
- **Solution:** Migrated to Vitess (MySQL sharding layer) — sharded by workspace ID — Vitess handles connection pooling, query routing, resharding
- **Result:** Write capacity 10× improvement — horizontal scaling now possible without application-level sharding code
- **Key technique:** Moved to Vitess gradually — one table at a time — no big-bang migration
- **Lesson:** Sharding middleware (Vitess) allows horizontal MySQL scaling without rewriting application query logic — the trade-off is operational complexity

### 7.2 Shopify — Moving from MySQL to CockroachDB for Global Inventory

- **Situation:** Flash sales creating global inventory conflicts — `available_quantity` updated simultaneously from multiple regions
- **Problem:** Customers overselling inventory during peak flash sales — writes from US-East and EU-West conflicting on the same inventory rows
- **Solution:** Migrated inventory table to CockroachDB — globally distributed with serializable isolation — cross-region transactions guaranteed correct
- **Result:** Oversell incidents eliminated — inventory accuracy 99.99% during flash sales — acceptable trade-off: slightly higher write latency due to cross-region consensus
- **Lesson:** For data requiring global strong consistency, a distributed SQL database's write latency overhead is worth the correctness guarantee

### 7.3 GitHub — Query Optimization Reduced MySQL Load 66%

- **Situation:** GitHub's primary MySQL cluster at high CPU utilization during peak hours
- **Problem:** Specific GitHub repository page queries were too slow and resource-intensive
- **Investigation:** Identified through slow query log and MySQL performance schema — a small set of queries disproportionately consuming resources
- **Solution:** Added targeted indexes, rewrote N+1 patterns, added a Redis cache layer for repository metadata
- **Result:** MySQL CPU reduced 66%, page load times improved 3×, hardware upgrade deferred by 2 years
- **Lesson:** Query optimization with targeted indexes yields multiplicative returns — the effort of finding and fixing the top 3 slow queries often outweighs months of infrastructure work

### 7.4 Uber — Switching from PostgreSQL to MySQL for Trip Data

- **Situation:** Uber's PostgreSQL architecture for trip data — storage replication and write bottlenecks
- **Problem:** PostgreSQL's WAL-based replication was creating bottlenecks at Uber's write volume — table bloat from MVCC was difficult to manage at scale — index structure was causing performance issues with their access patterns
- **Solution:** Migrated from PostgreSQL to MySQL (InnoDB) — MySQL's index-organized (clustered) primary key tables matched Uber's access patterns better
- **Result:** Write performance improved significantly — replication lag reduced — storage efficiency improved
- **Controversial aspect:** This migration was controversial in the PostgreSQL community — many of Uber's stated issues were configuration/usage problems, not fundamental PostgreSQL limitations
- **Lesson:** Database selection must match access patterns — but also ensure you have exhausted configuration and usage optimization before migrating platforms

### 7.5 Notion — Adding a Single Compound Index: 10-Second Queries → 100ms

- **Situation:** Notion's block system — every content element is a "block" with a `space_id`, `parent_id`, and `type`
- **Problem:** Loading a Notion page requires fetching all blocks for a given parent — slow page loads for large documents
- **Investigation:** Query `SELECT * FROM blocks WHERE space_id = ? AND parent_id = ?` — index on `space_id` alone — doesn't filter on `parent_id` at index level
- **Solution:** Compound index `(space_id, parent_id)` — both filter conditions now handled at index level — also a covering index adding `type` and `content` columns
- **Result:** Page load queries 10,000ms → 100ms — 100× improvement — one index addition fixed the most critical user-facing performance issue
- **Lesson:** A compound index that matches your exact query pattern is often the single highest-leverage change you can make

### 7.6 Discord — Message Storage: PostgreSQL → Cassandra → ScyllaDB

- **Situation:** Discord's message history — starting on PostgreSQL, moving as scale grew
- **Phase 1 (PostgreSQL):** Single server with read replicas — worked up to ~100M messages
- **Phase 2 (Cassandra):** Migrated to Cassandra for horizontal write scaling — partition key `(channel_id, bucket)` for time-bucketed message storage — allowed horizontal scaling
- **Phase 3 (ScyllaDB):** Cassandra JVM GC pauses causing latency spikes — migrated to ScyllaDB (Cassandra-compatible, C++ implementation, no GC)
- **Result at each phase:**
    - PostgreSQL → Cassandra: write throughput 10× improvement
    - Cassandra → ScyllaDB: P99 latency reduced 50%, GC pause latency eliminated
- **Lesson:** Migration is iterative — each phase solved the current bottleneck and revealed the next one — there was no single "right" database, only the right database for the current scale

### 7.7 Stack Overflow — Index Rebuilding Reduced Query Time 99.9%

- **Situation:** Stack Overflow's SQL Server deployment — posts and votes tables
- **Problem:** A specific query for fetching related questions took 400ms — unacceptable for a site serving millions of requests/day
- **Investigation:** Index fragmentation — the B-Tree index on the `posts` table was 95% fragmented after months of inserts and updates — logical reads far higher than necessary
- **Solution:** Scheduled index rebuild during low-traffic hours — `ALTER INDEX REBUILD` — restored index to optimal structure
- **Result:** Query time 400ms → 0.4ms — 1,000× improvement — index fragmentation was masking the true capability of the hardware
- **Lesson:** Index fragmentation degrades performance silently over time — schedule regular index rebuilds (or reorganizes for less fragmentation) as routine maintenance

### 7.8 Dropbox — Schemaless to MySQL: Query Performance 5×

- **Situation:** Dropbox used a schemaless key-value store (built on top of MySQL) for user metadata
- **Problem:** The abstraction layer added overhead — complex queries required multiple key-value lookups that could be a single relational query — performance and developer productivity suffering
- **Solution:** Migrated user metadata from schemaless to a properly normalized MySQL schema with appropriate indexes and foreign keys
- **Result:** Query performance 5× improvement — developer productivity improved (SQL is easier than key-value composition) — storage reduced 30% (no more serialization overhead)
- **Lesson:** Schemaless abstractions trade relational power for perceived flexibility — when the data is actually relational, a proper schema with indexes outperforms a schemaless layer

---

## Part 8 — Monitoring-Driven Improvement Case Studies

### 8.1 pg_stat_statements Revealed $50,000/Month Savings

- **Situation:** Large SaaS platform — AWS RDS PostgreSQL — monthly bill $80,000
- **Problem:** Engineering team assumed costs were driven by data volume and user growth
- **Investigation:** Enabled `pg_stat_statements` — found 5 queries consuming 70% of DB CPU:
    - Count query running every 3 seconds with no caching: 28,800 times/day
    - Full table scan for a report that ran hourly: 720 times/day with 2-minute runtime
    - An N+1 pattern in the user dashboard: 2M calls/day for 50,000 users
    - A sorting query without an index running on every API call
    - A session lookup table scan on every authenticated request
- **Solution:** Fixed all 5 queries (cache, index, batch, rewrite) over 3 weeks
- **Result:** DB CPU reduced 70%, RDS instance right-sized from db.r5.4xlarge to db.r5.xlarge — $50,000/month savings — same query volume, 70% less resource consumption
- **Lesson:** Database costs are almost always dominated by a small number of inefficient queries — `pg_stat_statements` reveals them in minutes

### 8.2 EXPLAIN ANALYZE Caught a Planner Regression Before Production

- **Situation:** CI/CD pipeline — new EXPLAIN ANALYZE check added for all new queries
- **Discovery:** A new query in a feature branch: `SELECT * FROM orders WHERE customer_id = ? AND status = ?` — EXPLAIN ANALYZE shows `Seq Scan` despite an index on `(customer_id, status)` existing
- **Root cause:** The new query passes `customer_id` as a string but the column is `BIGINT` — type mismatch prevents index use — would have caused a production Seq Scan on 500M rows
- **Solution:** Fixed the type before merging — one-line fix in the ORM parameter binding
- **Prevention value:** If this had reached production, it would have caused a sequential scan on every order lookup — potential 30-second query times for all customers
- **Lesson:** EXPLAIN ANALYZE in CI prevents performance regressions from reaching production — the cost of checking is seconds; the cost of missing is an outage

### 8.3 Replication Lag Monitoring Prevented Data Loss

- **Situation:** PostgreSQL primary + async replica — replica used for reporting
- **Alert fired:** Replication lag alert at 30 seconds lag threshold
- **Investigation:** A long-running vacuum on the primary was holding an old transaction ID — preventing WAL from being applied on the replica efficiently
- **Action taken:** Killed the long vacuum, replica caught up in 90 seconds
- **Prevented:** If the primary had failed during those 30 seconds of lag, the replica promotion would have lost 30 seconds of order data
- **Lesson:** Replication lag monitoring is not optional — it is the early warning system for potential data loss on failover

### 8.4 Lock Wait Monitoring Found Overnight Batch Conflict

- **Situation:** E-commerce platform — daytime performance fine — random slow periods at 2 AM
- **Investigation:** `pg_stat_activity` + `pg_locks` monitoring showed lock waits at 2 AM — the nightly inventory reconciliation batch and a scheduled report were both running and competing for locks on the `inventory` table
- **Solution:** Stagger the schedules — inventory reconciliation at 1 AM, report at 3 AM
- **Result:** 2 AM latency spikes eliminated — both jobs run faster because they no longer wait for each other's locks
- **Lesson:** Lock contention is not always from user traffic — scheduled jobs compete for the same locks and should be explicitly scheduled to avoid conflicts

---

## Summary Reference Table

|#|Case|Improvement|Technique|
|---|---|---|---|
|1.1|Missing index on user_id|22,500×|Add composite index|
|1.2|Covering index eliminates heap fetch|160×|Covering index|
|1.3|Partial index on minority condition|200× + 95% smaller|Partial index|
|1.4|Expression index on LOWER()|1,500×|Expression index|
|1.5|Composite index column reorder|200×|Correct column ordering|
|1.6|BRIN replaces B-Tree on sequential data|Same speed, 31,000× smaller|BRIN index|
|1.7|GIN index on JSONB field|833×|GIN index|
|1.8|Remove unused indexes|2× write throughput|Index audit and drop|
|2.1|Subquery to JOIN|450×|Query rewrite|
|2.2|Cursor replaces OFFSET|2,666×|Keyset pagination|
|2.3|EXISTS replaces COUNT|4,000×|EXISTS short-circuit|
|2.4|Window function replaces correlated subquery|150×|Window function|
|2.5|CTE materialization forces good plan|225×|MATERIALIZED CTE|
|2.6|Batching replaces per-row updates|45×|Bulk SQL|
|2.7|EXISTS replaces JOIN + DISTINCT|240×|EXISTS pattern|
|2.8|UNION ALL replaces OR|200×|UNION ALL split|
|2.9|Pre-aggregated summary table|22,500×|Materialized aggregation|
|2.10|Push filter into subquery|22×|Predicate pushdown|
|3.1|Normalize wide denormalized table|3× write throughput|Normalization|
|3.2|Partition + DROP replaces DELETE|7,200×|Partition pruning|
|3.3|Status column eliminates anti-join|200×|Denormalized flag|
|3.4|NUMERIC replaces VARCHAR for IDs|10× sort|Correct data type|
|3.5|JSONB replaces EAV|150×|Schema redesign|
|3.6|Aggregate stored on parent row|~5,000×|Denormalized counter|
|4.1|Redis cache layer|100× + 95% DB load reduction|Cache aside|
|4.2|Materialized view|Instant (vs 8 min)|Materialized view|
|4.3|Query result cache|150×|Application cache|
|4.4|Connection pool|5× connection overhead reduction|PgBouncer|
|4.5|Cache pre-warm for spike|0% downtime on 100× spike|Cache warming|
|5.1|Read replicas|4× read capacity|Replication|
|5.2|CQRS write/read split|5× write throughput|CQRS|
|5.3|Move sessions to Redis|3× overall latency|Vertical partitioning|
|5.4|Shard by user_id|10× write throughput|Horizontal sharding|
|5.5|Row store to column store|1,800× analytics|ClickHouse migration|
|5.6|CDC replaces batch ETL|24 hours → 30 seconds freshness|CDC|
|5.7|PgBouncer connection pooling|3× query throughput|Connection pooling|
|5.8|Async write queue|P99 8,000ms → 50ms|Queue buffering|
|6.1|shared_buffers tuning|40% across the board|Memory configuration|
|6.2|Autovacuum tuning|2× + 83% size reduction|Autovacuum|
|6.3|Enable parallel query|5.3×|Parallel execution|
|6.4|WAL tuning for bulk load|8× import speed|WAL configuration|
|6.5|pg_stat_statements audit|70% CPU reduction|Query profiling|
|6.6|Fillfactor for HOT updates|2× write throughput|Fillfactor tuning|
|7.1|Slack: Vitess sharding|10× write capacity|Vitess sharding|
|7.2|Shopify: CockroachDB global|Oversell eliminated|Distributed SQL|
|7.3|GitHub: Index + cache|66% DB load reduction|Index + cache|
|7.6|Discord: Cassandra → ScyllaDB|50% P99 latency reduction|DB migration|
|7.7|Stack Overflow: Index rebuild|1,000×|Index maintenance|
|7.8|Dropbox: Schemaless → MySQL|5× query performance|Schema design|

---

_The pattern is always the same: investigate first with the right tools (EXPLAIN ANALYZE, pg_stat_statements, pg_stat_activity), find the bottleneck, apply the smallest change that fixes it, measure the result. The biggest improvements almost always come from the simplest changes — a missing index, a wrong query pattern, a default configuration not tuned for the hardware. Buy hardware last, optimize queries first._