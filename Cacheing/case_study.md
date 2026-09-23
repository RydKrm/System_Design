# Caching — Complete Study & Failure Cases

> 10 Parts · 55 Cases — Real-world caching failure patterns, scaling studies, distributed cache cases, and production lessons for backend engineers working with Redis, in-process caches, CDN, and database query caches.

---

## Part 1 — Cache Fundamentals Failures

### 1.1 Caching Without Understanding the Access Pattern

- **What happens:** Cache is added to every endpoint regardless of whether data is actually read more than once — memory wasted, complexity added, no performance gain
- **Real pattern:** `SETEX user:123 3600 <data>` on every GET, but each user only hits their own endpoint once per session — 0% cache hit rate, 100% overhead
- **Scale trigger:** Cache size grows, memory fills, but response time doesn't improve — cache is a net negative
- **Symptoms:** Redis memory climbing, hit rate < 10% in metrics, latency unchanged, unnecessary serialization CPU cost
- **Solution:** Before adding cache, measure read/write ratio and access frequency. Cache is only useful when: (a) same data read many times before it changes, or (b) computation is expensive. Profile first with `MONITOR` in Redis or application-level hit/miss counters.
- **Lesson:** Caching is an optimization, not a default. Add it after you prove the access pattern justifies it — not before.

---

### 1.2 Wrong Cache Granularity

- **What happens:** Caching entire user object (5 KB) when only `user.name` is needed — over-fetching from cache, deserializing unnecessary data on every request
- **Real pattern:** `GET user:123` returns full user JSON including address, preferences, payment methods — endpoint only needs display name and avatar
- **Scale trigger:** 10,000 requests/sec × 5 KB deserialization = significant CPU burn for zero benefit
- **Symptoms:** High serialization CPU, large cache memory footprint per key, cache evicts faster than expected
- **Solution:** Cache at the right granularity: `user:123:name`, `user:123:avatar` as separate keys, or cache the computed view model (`user:123:profile_card`) that matches what the endpoint actually returns. Redis Hashes (`HGET user:123 name`) give field-level access without deserializing the full object.
- **Lesson:** Cache what you return, not what you have. Over-caching wastes memory and CPU on deserialization just as much as over-fetching from the DB.

---

### 1.3 Cache Key Collision

- **What happens:** Two different data types produce the same cache key — user with ID 42 returns product data from cache
- **Real pattern:** `cache.Set(strconv.Itoa(id), data)` — both `User{ID: 42}` and `Product{ID: 42}` write to key `"42"` — whoever writes last wins, other reads garbage
- **Scale trigger:** Adding a second entity type to a cache that was built for one; IDs that overlap between types
- **Symptoms:** Intermittent data corruption, wrong data type returned, JSON unmarshal errors, subtle incorrect UI data
- **Solution:** Always namespace cache keys: `user:42`, `product:42`, `session:42`. For complex keys use consistent hashing of inputs: `fmt.Sprintf("user:%d:orders:page:%d", userID, page)`. Document key schema like a DB schema.
- **Lesson:** Cache keys are a global namespace. Treat them like database table names — namespacing is mandatory from day one.

---

### 1.4 Caching Mutable Data Without Invalidation Strategy

- **What happens:** User updates their email, but cached profile returns old email for the next hour — stale data served to user
- **Real pattern:** `SETEX user:123 3600 <profile>` set on first read, never invalidated on write. User changes email at minute 1, sees old email until minute 60.
- **Scale trigger:** Any write operation on cached data; higher write frequency = longer average staleness window
- **Symptoms:** User sees their own stale data after update, support tickets ("I changed it but it still shows the old value"), data integrity issues
- **Solution:** Cache-aside with write-through invalidation: on write, `DEL user:123` immediately after successful DB write. Or use write-through: update cache and DB together. Choose TTL based on acceptable staleness, not convenience.
- **Lesson:** Every cached key needs an invalidation strategy defined before you write the cache SET. If you haven't defined invalidation, you haven't finished the cache design.

---

### 1.5 Using Cache as Primary Storage

- **What happens:** Application writes only to Redis, treating it as the database — Redis restart or eviction causes permanent data loss
- **Real pattern:** User session stores form progress in Redis with no DB backup. Redis evicts under memory pressure (LRU policy), in-progress form data gone forever.
- **Scale trigger:** Redis memory limit hit under load, unexpected Redis restart, Redis cluster failover with data loss
- **Symptoms:** Users lose work unexpectedly, intermittent data disappearance, no way to recover lost data
- **Solution:** Redis is a cache (or message broker), not a database. Durable data lives in Postgres/MongoDB. Redis holds derived/computed data that can be reconstructed. If Redis data loss is unacceptable, you need persistence config (`RDB` + `AOF`) and a backup strategy — or use a real database.
- **Lesson:** Cache and storage are different things with different durability guarantees. If losing it is unacceptable, it's not cache data.

---

## Part 2 — Cache Invalidation Failures

### 2.1 The Classic — Cache Invalidation Is Hard

- **What happens:** Product price updated in DB, cache not invalidated — thousands of users see wrong price for 10 minutes, orders placed at wrong price
- **Real pattern:** Price update goes through `ProductService.UpdatePrice()` which writes to Postgres. `ProductCacheService` is a separate component — nobody called `cache.Delete("product:456")`. Cache TTL is 10 minutes.
- **Scale trigger:** Multiple services writing to DB, cache invalidation scattered across codebase, microservices where writer and cache owner are different services
- **Symptoms:** Price/inventory discrepancies, customer complaints, financial reconciliation issues, "eventual consistency" becoming "eventual correctness"
- **Solution:** Invalidation strategies by use case: (1) TTL-only for low-stakes read-heavy data, (2) write-through invalidation for user-facing mutable data, (3) event-driven invalidation via RabbitMQ/Redis pub/sub for cross-service cache, (4) versioned cache keys: `product:456:v{updated_at}` — stale keys become unreachable automatically.
- **Lesson:** Cache invalidation is the hardest problem in caching. Design the invalidation strategy before the caching strategy. If you can't invalidate it reliably, don't cache it.

---

### 2.2 Partial Invalidation — Cache Inconsistency

- **What happens:** Order list cache invalidated but order count cache not — UI shows 0 orders but "5 total orders" in the badge
- **Real pattern:** `DEL orders:user:123` on order creation, but `orders:user:123:count` key not deleted — two caches for the same conceptual data go out of sync
- **Scale trigger:** Data cached in multiple representations (list, count, summary, aggregate) — invalidating one but not all
- **Symptoms:** UI shows inconsistent numbers, "ghost" counts, data that partially updates, hard-to-reproduce bugs
- **Solution:** Group related cache keys with a tag/prefix and invalidate atomically: `DEL orders:user:123:*` (scan + delete). Or use cache tags (not native Redis — requires an index). Best pattern: a single cache key version token: `v:{user_id}:orders:{version}` — increment version on write, all old keys become stale automatically.
- **Lesson:** Related data cached in multiple keys must be invalidated as a unit. Track all cache keys that represent the same underlying data.

---

### 2.3 Race Condition — Stale Write Wins

- **What happens:** Cache updated with stale value because two concurrent writes race — the slower write (older data) completes last and overwrites newer data
- **Real pattern:** Request A reads DB (value=100), Request B reads DB (value=200, newer), Request B writes cache (200), Request A writes cache (100) — cache now has stale 100
- **Scale trigger:** High concurrency, any write pattern where DB read and cache write are not atomic
- **Symptoms:** Intermittent stale data, impossible to reproduce in testing, only manifests under concurrent load
- **Solution:** Use Redis `SET key value XX` (only set if exists) or optimistic locking with version number. Best approach: don't write cache on write path — delete it. Next read populates from DB (cache-aside). Deletion is idempotent and avoids the race; writing is not.
- **Lesson:** Never write cache on the write path if you can avoid it. Delete the key instead — the next read will repopulate from the authoritative source.

---

### 2.4 Distributed Invalidation Lag — Microservices

- **What happens:** Service A updates user data, publishes invalidation event to RabbitMQ. Service B processes event 2 seconds later. Requests hitting Service B in those 2 seconds get stale cache.
- **Real pattern:** Event-driven cache invalidation has inherent lag. During high queue depth, lag grows to 30+ seconds — long enough for user to see their own stale data.
- **Scale trigger:** RabbitMQ queue backlog during traffic spike, slow consumers, cross-datacenter replication lag
- **Symptoms:** Stale reads after updates, inconsistency window proportional to queue depth, worse during peak traffic (when you most need correctness)
- **Solution:** For user's own data: bypass cache for 5 seconds after their write using a "write flag" in Redis: `SETEX user:123:recently_written 5 1` — if flag exists, skip cache. For other users: accept eventual consistency with short TTL. Read-your-own-writes consistency is achievable; global instant consistency is not.
- **Lesson:** Distributed invalidation has a consistency window. Design the system around acceptable staleness — and give the writing user read-your-own-writes consistency as a minimum.

---

## Part 3 — Cache Stampede & Thundering Herd

### 3.1 Cache Stampede on Cold Start

- **What happens:** Cache is empty (cold start or after flush), 10,000 concurrent requests all hit DB simultaneously — DB overwhelmed, cascade failure
- **Real pattern:** `cache.Get(key)` → miss → `db.Query()`. Under load, all 10,000 in-flight requests get a miss and all issue the same DB query at the same time. DB gets 10,000× normal query load.
- **Scale trigger:** Cache restart, cache flush, first deploy, traffic spike hitting uncached endpoints
- **Symptoms:** DB CPU spikes to 100% on cache miss event, timeout cascade, services down immediately after cache restart
- **Solution:** (1) Mutex/single-flight: only one goroutine queries DB for a given key, others wait for result — Go's `singleflight` package. (2) Probabilistic early expiration: re-compute cache before it expires (randomized). (3) Stagger cache warming: pre-populate before traffic hits. (4) Background refresh: serve stale while refreshing asynchronously.
- **Lesson:** Cache miss under high concurrency is a DB DDoS. Implement request coalescing (singleflight) for any high-traffic cache key.

---

### 3.2 TTL Expiry Synchronized Stampede

- **What happens:** All cache keys for a batch of products set at the same time with the same TTL — they all expire simultaneously every hour, causing hourly DB spikes
- **Real pattern:** Product catalog loaded at midnight, all 10,000 keys get `SETEX product:N 3600`. At 1 AM, all expire simultaneously — hourly traffic spike hits DB cold
- **Scale trigger:** Bulk cache population (cache warming scripts), any operation that sets many keys with identical TTL
- **Symptoms:** Regular, predictable DB spikes every N seconds/minutes exactly matching cache TTL, load pattern looks like a sawtooth wave
- **Solution:** Add jitter to TTL: `TTL = base_ttl + rand(0, base_ttl * 0.1)`. 3600 seconds becomes 3600–3960 seconds randomly distributed. Expiry is now spread over 6 minutes instead of instant.
- **Lesson:** Synchronized TTLs create synchronized stampedes. Always add jitter — even ±10% distributes load enough to prevent the spike.

---

### 3.3 Thundering Herd on Cache Flush / Invalidation Event

- **What happens:** Admin flushes cache (FLUSHDB) to fix stale data issue — immediately takes down production because 100K requests hit DB cold
- **Real pattern:** `redis-cli FLUSHDB` → instant cache empty → all in-flight requests find misses → DB receives 100× normal load → DB falls over
- **Scale trigger:** Manual cache flush, cache key pattern delete (wildcard DEL), mass invalidation after data migration
- **Symptoms:** Production outage triggered by the "fix" itself, DB overwhelmed within seconds of flush, requires traffic throttling to recover
- **Solution:** Never flush production cache without a warmup plan. Use key versioning instead of flush: increment a global version key (`cache:version`), all old keys become orphaned and expire naturally. Gradual invalidation: delete keys in batches with sleep between batches. Pre-warm before cutting over.
- **Lesson:** Cache flush = planned outage. Never flush without a traffic reduction or pre-warming plan. Key versioning makes flush unnecessary.

---

## Part 4 — Redis Specific Failures

### 4.1 Redis KEYS Command in Production

- **What happens:** `KEYS user:*` called in production to find all user cache keys — Redis blocks all other commands for 2 seconds, entire application hangs
- **Real pattern:** Developer adds admin endpoint: `redis.Keys("session:*")` to count active sessions. Redis is single-threaded — KEYS scans all 1M keys sequentially, blocking every other command
- **Scale trigger:** Redis with > 100K keys, any production traffic during the KEYS scan
- **Symptoms:** Entire application freezes for 1–5 seconds, all Redis operations timeout, cascading failures in all services sharing Redis
- **Solution:** Never use `KEYS` in production. Use `SCAN` with cursor (non-blocking, iterates in small batches): `SCAN 0 MATCH session:* COUNT 100`. For counting, maintain a separate counter key. For membership, use Redis Sets.
- **Lesson:** `KEYS` is a blocking full scan. It is banned from production Redis. `SCAN` is the non-blocking alternative — use it always.

---

### 4.2 Redis Single-Threaded Bottleneck — Large Value Operations

- **What happens:** One request stores a 5 MB JSON blob in Redis — serialization blocks Redis event loop for 50ms, all other commands queue behind it
- **Real pattern:** `SET report:weekly <5MB JSON>` — Redis serializes 5 MB synchronously. At 20 such requests/sec, Redis is blocked 1 full second per second — 100% CPU, all other commands experience 50ms+ latency
- **Scale trigger:** Caching large objects (reports, paginated lists, search results), high frequency of large value operations
- **Symptoms:** p99 latency spikes across ALL keys (not just large ones), Redis CPU maxed, seemingly unrelated commands slow
- **Solution:** Never store values > 100 KB in Redis. Compress large values before storing (gzip, zstd). Split large objects into smaller chunks. For large reports: store in S3/MinIO, cache only the S3 URL in Redis. Set `proto-max-bulk-len` limit to reject oversized values.
- **Lesson:** Redis is single-threaded. One large value operation blocks everything. Keep values small — if it doesn't fit in 100 KB, reconsider caching it.

---

### 4.3 No Redis Eviction Policy — OOM Crash

- **What happens:** Redis memory fills up, no eviction policy set — Redis returns OOM errors on all writes, application crashes
- **Real pattern:** Default Redis config has `maxmemory-policy noeviction` — when maxmemory is hit, all write commands return `OOM command not allowed when used memory > 'maxmemory'`
- **Scale trigger:** Cache grows beyond `maxmemory` limit, memory leak in application writing to Redis
- **Symptoms:** `OOM command not allowed` errors, application unable to write to cache, cascading failures as cache-dependent code paths break
- **Solution:** Set appropriate eviction policy in `redis.conf`: `maxmemory-policy allkeys-lru` for general cache (evict least recently used). `volatile-lru` if only keys with TTL should be evicted. Always set `maxmemory` explicitly. Monitor memory with `INFO memory` and alert at 80%.
- **Lesson:** Redis without an eviction policy is a time bomb. Always configure `maxmemory` and `maxmemory-policy` — treat it as mandatory configuration, not optional.

---

### 4.4 Connection Pool Exhaustion — Redis Edition

- **What happens:** Go service opens a new Redis connection per request instead of using a pool — 10,000 concurrent requests = 10,000 Redis connections, Redis rejects new ones
- **Real pattern:** `redis.NewClient(opts)` called inside request handler instead of at startup. Each client opens its own TCP connection. Redis default `maxclients=10000` hit under traffic spike.
- **Scale trigger:** Any traffic spike, each request creating its own connection, connection not properly returned to pool
- **Symptoms:** `ERR max number of clients reached`, latency spikes from TCP handshake overhead on every request, connection leak growing over time
- **Solution:** Initialize one `redis.Client` (or `redis.ClusterClient`) at startup — it manages a connection pool internally. Set `PoolSize` to `GOMAXPROCS * 10`. Use `redis.NewClient` once, inject it via dependency injection, reuse everywhere.
- **Lesson:** Redis connection setup is expensive. One pool per process, not one connection per request. This is the same lesson as the Postgres connection pool — same root cause, same fix.

---

### 4.5 Redis Pub/Sub Lost Messages — No Persistence

- **What happens:** Using Redis pub/sub for critical notifications — subscriber disconnects for 5 seconds, all messages published during that window are permanently lost
- **Real pattern:** Socket.IO Redis adapter uses pub/sub to broadcast events across nodes. Node restarts → misses all events during restart → users miss real-time updates
- **Scale trigger:** Any subscriber downtime, rolling deploys, Redis failover, any connection interruption
- **Symptoms:** Missed real-time events, users see incomplete data, events delivered to some users but not others
- **Solution:** Redis pub/sub has no persistence or delivery guarantee. For reliable messaging use: Redis Streams (persistent, consumer groups, replay), RabbitMQ (acknowledgments, dead letter), or Kafka. For Socket.IO: accept that pub/sub missed messages are expected — clients should re-fetch state on reconnect, not rely on event stream completeness.
- **Lesson:** Redis pub/sub is fire-and-forget. If the subscriber isn't connected, the message is gone. Never use pub/sub for data that must be delivered reliably.

---

## Part 5 — Cache Consistency Failures

### 5.1 Read-Your-Own-Writes Violation

- **What happens:** User posts a comment, refreshes the page — comment not visible because read hits cache that was set before the write
- **Real pattern:** Write goes to Postgres (primary), invalidates cache. Read immediately after hits read replica (replication lag 200ms) → cache miss → reads from replica → replica doesn't have the new row yet → caches the stale state
- **Scale trigger:** Read replicas with replication lag + aggressive caching, any write followed immediately by a read
- **Symptoms:** User's own actions appear to not work until cache expires, "ghost writes" — user writes, sees no change
- **Solution:** For the writing user: route their next N reads to primary for 1 second after write (sticky routing). Or: write a "user recently wrote" flag to Redis after write, check flag on read to bypass cache and force primary read. For other users: eventual consistency is acceptable.
- **Lesson:** Read-your-own-writes is a consistency guarantee users implicitly expect. It requires explicit design — it doesn't come free with any cache or replica setup.

---

### 5.2 Double-Write Inconsistency — Cache and DB Out of Sync

- **What happens:** Application writes to cache first, then DB write fails — cache has new value, DB has old value, they're permanently inconsistent
- **Real pattern:** Write-through pattern implemented incorrectly: `cache.Set(key, newVal)` → `db.Update()` (fails) → cache has new data, DB has old data, no rollback for cache
- **Scale trigger:** Any DB failure after cache write succeeds; network partition between app and DB
- **Symptoms:** Cache serves different data than DB, inconsistency permanent until TTL expires, reads return "future" data that was never persisted
- **Solution:** DB is the source of truth — always write DB first. Only update/invalidate cache after DB write confirms success: `db.Update()` (success) → `cache.Del(key)`. Never write to cache if DB write failed. Cache-aside (lazy loading) + delete on write is the safest pattern.
- **Lesson:** Write DB first, always. Cache is a derived view of DB state, not co-equal storage. If DB write fails, the cache write must not happen or must be rolled back.

---

### 5.3 Phantom Cache — Caching Negative Results Wrongly

- **What happens:** `GET /users/999` returns 404 (user not found), not cached — same query hits DB on every request for a non-existent user. Attackers probe millions of non-existent IDs.
- **Real pattern:** Cache-aside only caches hits: `if user != nil { cache.Set(...) }`. Cache misses for non-existent IDs always hit DB. 1000 req/s for non-existent IDs = 1000 DB queries/s.
- **Scale trigger:** Enumeration attacks, user-generated content with guessable IDs, deleted resources still being requested
- **Symptoms:** DB CPU high on endpoints that should be fast, DoS via non-existent ID enumeration, full table scans on negative lookups
- **Solution:** Cache negative results too: `cache.Set("user:999", "NOT_FOUND", 60)` with shorter TTL. Check for sentinel value on cache hit: if `"NOT_FOUND"` → return 404 without DB query. This is "negative caching" — standard practice for lookup endpoints.
- **Lesson:** Not caching negative results makes your cache ineffective for the exact case it needs to protect against — enumeration and missing resource lookups.

---

## Part 6 — In-Process / Application Cache Failures

### 6.1 In-Process Cache Not Bounded — Memory Leak

- **What happens:** Go `sync.Map` or plain `map` used as in-process cache with no eviction — cache grows indefinitely until OOM
- **Real pattern:** `var cache = sync.Map{}` storing API responses. Each unique URL becomes a key. After a week, 5M unique URLs stored = 2 GB memory, OOM kill.
- **Scale trigger:** Any unique-key workload (user IDs, URLs, request parameters), long-running services without restart
- **Symptoms:** Memory grows monotonically, GC pressure increasing, eventual OOM kill, no obvious leak in code
- **Solution:** Use an LRU cache with bounded size: `golang.org/x/tools/container/intsets` or `github.com/hashicorp/golang-lru`. Set explicit `MaxEntries`. For Node.js: `lru-cache` package with `max` option. Never use an unbounded map as a cache.
- **Lesson:** Any in-process cache without a size bound is a memory leak. Always set a maximum entry count and use LRU eviction.

---

### 6.2 In-Process Cache Not Thread-Safe

- **What happens:** Concurrent reads and writes to plain Go `map` cause data race — random panics under concurrent load, data corruption
- **Real pattern:** `var cache = map[string]interface{}{}` accessed from multiple goroutines without mutex. Go's data race detector fires: `concurrent map read and map write`. In production without detector: silent corruption or panic.
- **Scale trigger:** Any concurrent request handling (every HTTP server), multiple goroutines accessing shared map
- **Symptoms:** Intermittent panics with `concurrent map read and write`, incorrect data returned, only manifests under load
- **Solution:** Use `sync.Map` for simple concurrent caches, or wrap `map` with `sync.RWMutex`: read lock for gets, write lock for sets. Better: use a proven cache library that handles concurrency internally (ristretto, golang-lru). Enable `-race` flag in tests to catch this at development time.
- **Lesson:** Go maps are not concurrent-safe. Every in-process cache must use proper synchronization — this is not optional.

---

### 6.3 Cache Not Shared Across Goroutines — Defeating the Purpose

- **What happens:** In-process cache initialized inside request handler — each request gets its own empty cache, 0% hit rate, same computation repeated every request
- **Real pattern:** `func handleRequest(w, r) { cache := lru.New(100); ... }` — cache created and destroyed per request. Cache never accumulates hits because it's scoped to one request.
- **Scale trigger:** Misunderstanding of Go's goroutine/scope model, developer added cache "for performance" but sees no improvement
- **Symptoms:** Cache hit rate = 0%, memory allocated and GC'd every request, no performance improvement
- **Solution:** Initialize cache at package/service level, pass as dependency: `type Service struct { cache *lru.Cache }` initialized once in `main()`. The cache must outlive individual requests to accumulate hits.
- **Lesson:** Cache scope must be wider than request scope. A per-request cache is just expensive map initialization with no benefit.

---

### 6.4 Stale In-Process Cache After Deploy

- **What happens:** New code deployed with bug fix — but in-process cache serves old (bugged) computed values until TTL expires or service restarts
- **Real pattern:** Computed report cached in memory for 1 hour. Bug fix deployed. New pods start but old pods still serve from stale in-process cache. 50% of requests get fixed data, 50% get bugged data depending on which pod they hit.
- **Scale trigger:** Rolling deploys, in-process caches with long TTLs, any data cached in process memory
- **Symptoms:** Inconsistent behavior across requests, A/B-like split where some users see old behavior, takes hours to fully resolve
- **Solution:** Short TTLs for in-process caches (< 60 seconds). Or: version the cache with a build hash key — new deploy = new key = cold cache. Or: use external cache (Redis) so all pods share the same cache state and invalidation is global.
- **Lesson:** In-process caches are per-instance. Rolling deploys mean mixed cache states across instances. Prefer short TTLs or external caches for anything that matters.

---

## Part 7 — CDN & HTTP Cache Failures

### 7.1 Cache-Control Headers Missing — No CDN Caching

- **What happens:** CDN (CloudFront, Cloudflare) not caching API responses even though they're configured to cache — every request passes through to origin
- **Real pattern:** API returns JSON without `Cache-Control` header. CDN default behavior: don't cache responses without explicit cache directives. 100% origin pass-through despite CDN in place.
- **Scale trigger:** High-traffic public API, read-heavy endpoints with no cache headers, CDN configured but not effectively used
- **Symptoms:** Origin server load unchanged after CDN deployment, CDN shows 0% cache hit rate, latency same as without CDN
- **Solution:** Add `Cache-Control: public, max-age=300` for public cacheable responses. `Cache-Control: private, no-store` for user-specific data (prevents CDN caching personal data). `Vary: Accept-Encoding` if serving compressed responses. Use `ETag` for conditional requests.
- **Lesson:** CDNs are passive — they only cache what you tell them to. Every API endpoint needs an explicit Cache-Control strategy.

---

### 7.2 Cache-Control Too Aggressive — Stale Content Served for Hours

- **What happens:** `Cache-Control: max-age=86400` set on product pages — product goes out of stock, CDN serves "In Stock" for 24 hours to users
- **Real pattern:** Long TTL set for performance. Product inventory changes, price changes, content updates — CDN serves stale version until TTL expires. No CDN purge mechanism implemented.
- **Scale trigger:** Any content that changes faster than the CDN TTL, e-commerce, news, live data
- **Symptoms:** Users see outdated prices/inventory, support tickets for "wrong price shown", no way to fix without waiting for TTL
- **Solution:** Use `s-maxage` for CDN TTL, `max-age` for browser cache: `Cache-Control: public, s-maxage=3600, max-age=60`. Implement CDN purge on content update (CloudFront invalidation API, Cloudflare Cache Purge API). Or: use `stale-while-revalidate=60` to serve stale while refreshing in background.
- **Lesson:** Cache TTL is a contract. Set it to the maximum acceptable staleness, not the maximum possible. Implement purge capability before setting long TTLs.

---

### 7.3 Caching User-Specific Data in CDN

- **What happens:** User A's private dashboard cached by CDN, User B requests same URL pattern and receives User A's data
- **Real pattern:** `GET /api/dashboard` returns user-specific data. No `Cache-Control: private` header. CDN caches first response, serves it to all subsequent requests for the same URL. Data leak.
- **Scale trigger:** Any authenticated endpoint without proper cache headers, CDN deployed in front of API without header audit
- **Symptoms:** Users see other users' data (critical privacy breach), GDPR violation, security incident
- **Solution:** Any endpoint returning user-specific data must include `Cache-Control: private, no-store`. Audit ALL API endpoints for cache headers before enabling CDN. Use `Vary: Authorization` to scope cache by auth token (careful — this can create cache pollution). Separate public and private API paths at the CDN layer.
- **Lesson:** CDN caching of user-specific data is a data breach. `Cache-Control: private` is not optional — it's a security requirement for any personalized response.

---

### 7.4 Query String Variations Bypass CDN Cache

- **What happens:** CDN has 100% miss rate because marketing adds UTM parameters to every URL — `?utm_source=email&utm_campaign=june` creates unique cache keys
- **Real pattern:** `GET /products?utm_source=email` and `GET /products?utm_source=google` are treated as different URLs by CDN — both miss cache, both hit origin, despite returning identical content
- **Scale trigger:** UTM parameters, A/B test parameters, analytics tracking parameters added to URLs
- **Symptoms:** CDN hit rate drops to near 0% after marketing campaigns start, origin load unexpectedly high during campaigns
- **Solution:** Configure CDN to ignore specific query parameters: CloudFront "Cache Based on Selected Request Headers/Query Strings" — whitelist only parameters that affect content (`page`, `sort`), strip tracking params (`utm_*`, `fbclid`, `gclid`). Or normalize query string order before cache key generation.
- **Lesson:** Every query string variation is a unique cache key. Strip tracking parameters at the CDN layer — they never affect content but destroy cache efficiency.

---

## Part 8 — Database Query Cache Failures

### 8.1 N+1 Queries Caching the Wrong Thing

- **What happens:** N+1 query problem "solved" by caching each individual sub-query result — 500 cache lookups instead of 500 DB queries, but still 500 roundtrips to Redis
- **Real pattern:** `for order in orders { cache.Get("items:" + order.id) }` — caches each item lookup individually. Redis roundtrip is 1ms × 500 = 500ms total. Same latency as the DB queries it replaced.
- **Scale trigger:** Any N+1 pattern "fixed" with per-item caching, lists with hundreds of items
- **Symptoms:** Latency unchanged after adding cache, Redis call count = N on every list request, cache hit rate high but response time still slow
- **Solution:** Cache at the right level: cache the entire list result (`"orders:user:123:with_items"`), not individual items. If individual item caching is needed, use Redis pipeline/MGET to batch all lookups into one network roundtrip: `MGET items:1 items:2 items:3 ... items:500`.
- **Lesson:** Caching individual items in a loop trades DB roundtrips for Redis roundtrips. Cache the aggregate result or batch the lookups.

---

### 8.2 PostgreSQL Query Cache Misuse

- **What happens:** Developer expects Postgres to cache query results — same query runs multiple times expecting instant return, but Postgres is slow every time
- **Real pattern:** Postgres has no query result cache (unlike MySQL). `pg_stat_statements` shows high execution count for identical queries — developer thought results were cached after first run
- **Scale trigger:** Repeated identical queries expecting Postgres's non-existent query cache
- **Symptoms:** Same query takes same time on every execution, no speedup on repeated calls, confusion about why Redis is needed
- **Solution:** Postgres caches data pages in shared_buffers (buffer cache) and relies on OS page cache — not query results. Add application-level caching (Redis) for expensive repeated queries. Use `EXPLAIN ANALYZE` to understand actual query cost. Increase `shared_buffers` to 25% of RAM for better page cache hit rate.
- **Lesson:** PostgreSQL has no query result cache. Page/buffer cache is different — it caches data pages, not query results. Application-level caching is your result cache layer.

---

### 8.3 Caching Paginated Results Without Accounting for Data Changes

- **What happens:** Page 1 of user list cached for 5 minutes. New user added. Pages shift — page 1 cache now shows different users than page 2 cache expects. Users appear on two pages or no page.
- **Real pattern:** `SETEX users:page:1 300 <first_10_users>` — page 1 is users 1–10 in DB. New user inserted with ID that sorts between user 3 and 4. Now DB page 1 is users 1–3, new user, 4–9. Cache shows users 1–10. Page 2 cache starts from user 11 but DB page 2 now starts from user 10. User 10 appears on no page.
- **Scale trigger:** Any write to paginated data while page caches are active, cursor-based vs offset pagination
- **Symptoms:** Missing items, duplicate items across pages, inconsistent total counts, pagination bugs
- **Solution:** Don't cache offset-based pagination results in high-write environments. Use cursor-based pagination (keyset pagination) — more stable under writes. Or: accept slightly stale pagination and use short TTL (30s). Or: cache the query result set once, paginate from the cache (only works for small result sets).
- **Lesson:** Offset-based pagination and caching conflict when data changes. Design for this explicitly — either stable cursors, short TTLs, or accept inconsistency.

---

## Part 9 — Scaling Cache Study Cases

### 9.1 Single Redis Instance Becomes Bottleneck

- **What happens:** Redis handles 50K commands/sec fine, but at 100K commands/sec becomes the throughput ceiling for the entire application
- **Real pattern:** All services share one Redis instance. As application scales horizontally (more API pods), Redis stays at one node. Redis single-threaded command processing maxes out at ~100K simple commands/sec.
- **Scale trigger:** Horizontal scaling of application tier without scaling cache tier, traffic growth past Redis single-instance limits
- **Symptoms:** Redis CPU at 100%, command latency rising, application throughput capped despite more API pods
- **Solution:** Redis Cluster: shard data across 6+ nodes (3 primary + 3 replica) — each shard handles subset of key space, total throughput multiplies. Or: add read replicas and route read commands to replicas. Or: reduce Redis pressure with in-process L1 cache (cache in app memory, Redis as L2).
- **Lesson:** Redis single-instance is not infinitely scalable. Plan for cluster before you need it — migrating under pressure is painful.

---

### 9.2 Cache Layer Increases Latency — Wrong Tool for the Job

- **What happens:** Adding Redis cache to a query that takes 2ms makes it slower — Redis roundtrip is 1ms, serialization is 2ms, total 3ms vs original 2ms
- **Real pattern:** Developer caches all DB queries by default. Simple indexed lookup: `SELECT * FROM users WHERE id = ?` takes 1ms (indexed primary key). Redis: 0.5ms network + 0.3ms deserialization = 0.8ms. No improvement, added complexity.
- **Scale trigger:** Adding cache everywhere without profiling, treating cache as always faster
- **Symptoms:** Latency unchanged or worse after cache addition, cache hit rate high but latency doesn't improve
- **Solution:** Measure before adding cache. Cache adds value when: DB query > 10ms, OR high concurrency causes DB contention, OR computation is expensive. Simple PK lookups on indexed tables rarely need caching. Profile: `EXPLAIN ANALYZE` in Postgres, `--slowlog` in Redis.
- **Lesson:** Cache adds latency (network + serialization). It only pays off when it replaces something slower. Measure before you cache.

---

### 9.3 Cache Hit Rate Collapse Under New Traffic Pattern

- **What happens:** Cache hit rate drops from 95% to 20% when users start a new usage pattern — product recommendation feature causes long-tail key access
- **Real pattern:** Cache sized for 10K hot products, hit rate 95%. New "related products" feature exposes long tail — now 500K unique product pages accessed. Cache evicts hot keys to make room for long-tail keys. Hot key cache miss rate rises, DB load spikes.
- **Scale trigger:** Feature launch changing access pattern, user behavior shift, A/B test exposing new content
- **Symptoms:** Cache hit rate drops suddenly with no code change, DB load increases proportionally, usually correlates with feature release
- **Solution:** Monitor cache hit rate continuously — it's a key health metric. Separate caches for hot vs long-tail data (different Redis databases or TTL policies). Increase cache size to accommodate new access pattern. Use `allkeys-lfu` (Least Frequently Used) eviction to protect truly hot keys from eviction by long-tail burst.
- **Lesson:** Cache hit rate is an SLO. Monitor it. When access patterns change (feature launch, campaign), verify cache efficiency hasn't collapsed.

---

### 9.4 Multi-Region Cache Consistency

- **What happens:** User updates profile in US region, reads profile in EU region — EU Redis cache serves stale data because invalidation didn't cross region boundary
- **Real pattern:** Each region has its own Redis. Write in US invalidates US Redis. EU Redis has no knowledge of the invalidation — EU users see stale profile data for hours
- **Scale trigger:** Multi-region deployment with region-local caches, global users, writes in any region
- **Symptoms:** Inconsistency depends on which region the user hits, stale data visible across regions, can't reproduce locally
- **Solution:** Short TTLs for cross-region caches (acceptable staleness). Global invalidation via message bus (RabbitMQ or Kafka with multi-region replication) — write in any region publishes invalidation event, all regions consume and delete key. Or: pin users to their home region (geo-routing) — writes and reads always hit same region's cache.
- **Lesson:** Cache invalidation across regions requires explicit cross-region messaging. Region-local caches with writes in any region = multi-region staleness by design.

---

## Part 10 — Production Cache Patterns

### 10.1 Cache Warming — Cold Start Production Failure

- **What happens:** New service instance starts with empty cache — first 5 minutes of traffic all hits DB, latency 10× normal, DB overwhelmed
- **Real pattern:** Autoscaler adds new pods under traffic spike. New pods have cold cache. They serve the same traffic spike that triggered scaling but with DB-level latency. Spike gets worse.
- **Scale trigger:** Autoscaling events, new region deployment, cache restart, service restart
- **Symptoms:** Latency spike immediately after scaling up (opposite of expected), DB load increases when you add more app instances
- **Solution:** Cache warming strategies: (1) Lazy warming with request coalescing (singleflight) — first request warms, rest wait. (2) Background pre-warming: on startup, populate top-N keys from DB before accepting traffic. (3) Read-through with gradual traffic ramp: new instances get 1% of traffic, warm up over 60 seconds, then full traffic. (4) Shared external cache (Redis) — new instances immediately benefit from existing cache.
- **Lesson:** Design cache warming as part of your scaling strategy. New instances with cold cache under load make scaling events worse, not better.

---

### 10.2 Monitoring Cache — Metrics That Actually Matter

- **What happens:** Cache is added, hit rate never monitored — silent degradation over weeks as data patterns shift, cache becomes ineffective
- **Real pattern:** Redis deployed, application performing well at launch. 6 months later: hit rate 20% (was 90%), DB load 3× original, nobody noticed because no alert
- **Scale trigger:** No cache monitoring, no hit rate alerts, gradual degradation invisible without metrics
- **Symptoms:** Slow performance degradation over weeks, correlates with data growth and access pattern shift, no acute incident to trigger investigation
- **Solution:** Instrument these metrics: (1) Cache hit rate per key pattern (not just global), (2) Cache miss latency vs hit latency (prove cache is helping), (3) Eviction rate (evictions rising = cache too small), (4) Memory usage vs limit, (5) Command latency p50/p99. Alert on hit rate drop > 10% sustained over 5 minutes.
- **Lesson:** Unmonitored cache is unmanaged cache. Hit rate, eviction rate, and memory pressure are your core cache health metrics — alert on them.

---

### 10.3 Cache Serialization Format Mismatch After Deploy

- **What happens:** Go struct fields renamed in new deploy — old cached JSON has `"user_name"`, new code expects `"username"` — deserialization silently returns zero-value, bugs in production
- **Real pattern:** `type User struct { UserName string }` → `type User struct { Username string }`. Old cache key has `{"user_name": "alice"}`. New code deserializes: `user.Username = ""`. No error, no panic, just silent empty string.
- **Scale trigger:** Any struct rename, field type change, serialization format migration during rolling deploy
- **Symptoms:** Silent empty/zero values in deserialized structs, partial data, bugs that appear during deploy and self-resolve after cache TTL expires
- **Solution:** Version your cache keys with schema version: `user:v2:123`. New code writes `v2`, old code still reads `v1`. After TTL, all `v1` keys expire. Or: use forward-compatible serialization (protobuf with field numbers, not names). Or: add explicit version field in cached JSON and handle migration.
- **Lesson:** Cache survives deploys but your structs change. Version your cache schema or use forward-compatible serialization formats.

---

### 10.4 Distributed Lock via Redis — Wrong Implementation

- **What happens:** Redis-based distributed lock implemented incorrectly — two processes both acquire the "lock" simultaneously, both run the "exclusive" operation, data corruption
- **Real pattern:** `SET lock:job 1` without `NX` (only if not exists) — two processes both succeed on SET, both believe they hold the lock. Or: SET with NX but without expiry — process crashes holding lock, no other process can acquire it forever.
- **Scale trigger:** Any distributed locking for scheduled jobs, payment processing, inventory reservation, any "run once" operation
- **Symptoms:** Duplicate job execution, double charges, race conditions in "exclusive" operations, deadlocked lock that requires manual Redis key deletion
- **Solution:** Use `SET key value NX EX 30` (atomic: set only if not exists, with expiry). Use a unique value per lock holder and verify on unlock: `GET → compare → DEL` (or use Lua script for atomicity). Better: use a proven library: `redislock` in Go. Or use Postgres advisory locks for simpler scenarios.
- **Lesson:** Distributed locking is subtle. `SET NX EX` is the minimum viable Redis lock. Never implement without NX (only if not exists) and EX (expiry for crash safety).

---

### 10.5 Cache Stampede on Expensive Computation — The Real Cost

- **What happens:** Machine learning recommendation model takes 3 seconds to compute per user. Cache expires for 10,000 users at once. 10,000 × 3 sec = 8+ hours of compute queued simultaneously. Service unresponsive for minutes.
- **Real pattern:** TTL-based expiry with no stampede protection. All 10,000 cached ML results were computed in the same batch job — they all expire at the same time. Stampede triggers 10,000 concurrent 3-second computations.
- **Scale trigger:** Expensive computations (ML models, complex aggregations, report generation) with synchronized TTLs
- **Symptoms:** Service unresponsive for minutes at regular intervals matching cache TTL, compute resource spike, external ML service rate limited or overloaded
- **Solution:** Probabilistic early expiration (XFetch algorithm): each cache read has a random chance of triggering early refresh proportional to remaining TTL — spreads recomputation over time instead of at expiry. Or: background refresh with stale-while-revalidate — serve stale, refresh asynchronously. Separate TTL jitter (different expiry per user based on hash of user ID).
- **Lesson:** Expensive computation + synchronized TTL = guaranteed stampede. The cost of the computation determines the severity. Design stampede prevention proportional to computation cost.