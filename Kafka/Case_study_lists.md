# Kafka Complete Case Studies — All Volumes Combined

> 85+ case studies across all Kafka domains.
> Every case follows: **Situation → Problem → Root Cause → Solution → Result → Lesson**
> Parts start from 01, cases start from 00.

---

## How to Study a Kafka Case

For every case, extract these six answers:

1. **What was the scale?** — Topics, partitions, producers, consumers, message rate
2. **What broke or what needed improving?**
3. **What was the root cause?** — Partition design, consumer lag, replication, configuration
4. **What was the solution?** — Rebalance, tuning, redesign, tooling
5. **What trade-off was accepted?** — Throughput vs latency, ordering vs parallelism
6. **What would you have done differently from day one?**

---

## Part 01 — Producer Failure Cases

### Case 00 — The Producer That Silently Dropped Messages

- **Situation:** Payment notification system — producer sends a message per transaction
- **Problem:** 0.3% of payment notifications never reached consumers — customers not notified — discovered 3 weeks later during a support audit
- **Root cause:** `acks=0` (fire-and-forget) configured — broker never acknowledged receipt — network blips silently dropped messages with no retry
- **Symptoms:** Message count mismatch between producer and consumer metrics, no errors in producer logs
- **Solution:** `acks=all`, `retries=Integer.MAX_VALUE`, `enable.idempotence=true` — ensures at-least-once delivery with no duplicates
- **Result:** Zero silent message loss
- **Lesson:** `acks=0` means "send and forget forever" — never use it for anything that matters; `acks=all` with idempotence is the safe default for all production producers

---

### Case 01 — The Producer Buffer That Caused Out-of-Memory

- **Situation:** High-throughput event tracking — producer sends 500,000 events/second
- **Problem:** Producer service crashed with OOM every few hours during traffic spikes
- **Root cause:** `buffer.memory=32MB` (default) — when the broker was slow, producer buffer filled — `max.block.ms=60000` caused threads to block 60 seconds — multiple blocked threads exhausted JVM heap
- **Symptoms:** OOM crash preceded by `BufferExhaustedException`, happens during Kafka broker GC pauses
- **Solution:** Increase `buffer.memory=256MB`; reduce `max.block.ms=5000` (fail fast); implement upstream backpressure when buffer is full
- **Result:** No more OOM crashes — producer applies backpressure rather than accumulating blocked threads
- **Lesson:** `max.block.ms` controls how long your application thread blocks when buffer is full — fail fast and apply backpressure instead of allowing thread accumulation

---

### Case 02 — The Duplicate Messages From Retry Without Idempotence

- **Situation:** Order processing system — Kafka producer sends an order event
- **Problem:** During broker leader re-election, some order events were processed twice — duplicate orders created in the database
- **Root cause:** `retries=3`, `acks=1` — broker received and wrote message but crashed before sending ACK — producer retried — new leader already had the message — written again
- **Symptoms:** Duplicate records in orders DB, consumer metrics showed higher count than producer sent count
- **Solution:** `enable.idempotence=true` — Kafka assigns each message a sequence number — broker deduplicates retries automatically; combine with `acks=all`, `max.in.flight.requests.per.connection=5`
- **Result:** Zero duplicates even during broker restarts and leader elections
- **Lesson:** Retries without idempotence cause duplicates — `enable.idempotence=true` is free and should always be enabled

---

### Case 03 — The Large Message That Blocked the Entire Topic

- **Situation:** Document processing pipeline — producers send document content as messages
- **Problem:** One producer sent a 15MB PDF — broker rejected it — rejection caused producer's entire send buffer to block — all subsequent messages delayed 30 seconds
- **Root cause:** `message.max.bytes=1048576` (1MB default) — 15MB message exceeded limit — error propagated incorrectly in producer's error handling
- **Symptoms:** 30-second latency spike on all messages from that producer, `RecordTooLargeException` in logs
- **Solution:** Never send large payloads in Kafka — store file in S3/object storage and send only the reference (S3 key) in the message — claim-check pattern; enforce message size limits at application layer before producing
- **Result:** Maximum message size never exceeds 10KB — no more size-related blocks
- **Lesson:** Kafka is not designed for large payloads — keep messages under 1MB, ideally under 100KB; for large files, use claim-check pattern

---

### Case 04 — The Producer That Held Open Transactions Forever

- **Situation:** Exactly-once processing pipeline using Kafka transactions
- **Problem:** Occasionally a transaction was opened but never committed or aborted — consumers reading with `isolation.level=read_committed` saw no new messages in those partitions
- **Root cause:** `transaction.timeout.ms=60000ms` — producer crashed mid-transaction — restarted without aborting the previous transaction first — new producer blocked by the zombie transaction
- **Symptoms:** Consumer lag growing with no apparent cause, `read_committed` consumers receiving no messages despite producer sending them
- **Solution:** `transaction.timeout.ms=30000ms`; always call `abortTransaction()` in error handlers before restarting; alert on open transactions older than 2× expected transaction duration
- **Result:** Zombie transactions auto-expire in 30 seconds — consumers unblock within 30 seconds of a producer crash
- **Lesson:** Kafka transactions require careful lifecycle management — a zombie transaction silently blocks all `read_committed` consumers on those partitions until it expires

---

### Case 05 — The Batch Size That Throttled Throughput

- **Situation:** Log aggregation — 10,000 log events/second per producer instance
- **Problem:** Producer throughput limited to 500 events/second despite broker having plenty of capacity
- **Root cause:** `batch.size=16384` (16KB default) — with ~200-byte messages, batch fills only 80 messages — `linger.ms=0` (default) sends immediately without waiting — network overhead dominated
- **Symptoms:** Low throughput despite healthy broker, high request rate (many small batches), high serialization CPU overhead
- **Solution:** `batch.size=524288` (512KB), `linger.ms=5` (wait 5ms to accumulate), `compression.type=lz4`
- **Result:** Throughput 500 events/second → 45,000 events/second — 90× improvement — same hardware
- **Lesson:** Default `linger.ms=0` is optimized for latency not throughput — for high-volume producers, `linger.ms=5-20ms` with large `batch.size` and compression dramatically improves throughput

---

### Case 06 — The Delivery Callback That Was Never Checked

- **Situation:** High-throughput event tracking — asynchronous producer with delivery callbacks
- **Problem:** 0.5% of events silently lost — discovered in a monthly audit comparing produced vs consumed counts
- **Root cause:**

```go
producer.Produce(&kafka.Message{...}, nil) // nil delivery channel — delivery report ignored
```

Passing `nil` discards delivery reports — errors never surfaced.

- **Symptoms:** Message count mismatch monthly, no errors in producer logs, discovered only in audit
- **Solution:** Background goroutine consuming all delivery reports:

```go
go func() {
    for e := range producer.Events() {
        if m, ok := e.(*kafka.Message); ok {
            if m.TopicPartition.Error != nil {
                metrics.Counter("kafka_produce_error").Inc()
                alertOrRetry(m)
            }
        }
    }
}()
```

- **Result:** Every delivery failure surfaced — 0.5% loss revealed as broker overload — fixed with producer retries
- **Lesson:** Passing `nil` as delivery channel is "fire and forget forever" — always consume delivery reports; background goroutine adds negligible overhead

---

### Case 07 — The Producer That Sent in the Wrong Serialization Format

- **Situation:** Multi-team platform — new Go team added a producer to an existing topic consumed by Java services
- **Problem:** Java consumers throwing deserialization exceptions — Kafka topic poisoned
- **Root cause:** Go producer sent raw JSON bytes — Java consumer expected Avro with Schema Registry magic header `[0x00][schema_id_4_bytes]` — Go produced `{` (0x7B) instead of `0x00`
- **Symptoms:** `SerializationException` on every message from the new Go producer, topic unusable for Java consumers
- **Solution:** Use Confluent Schema Registry Avro serializer in Go:

```go
serializer, _ := avrov2.NewSerializer(srClient, serde.ValueSerde, avrov2.NewSerializerConfig())
payload, _ := serializer.Serialize(topic, &event) // adds magic byte + schema ID
```

- **Result:** Go producer messages correctly deserialized by Java consumers
- **Lesson:** A Kafka topic is a serialization contract — all producers must use the same format; Schema Registry makes this enforceable at infrastructure level

---

### Case 08 — The Producer Pool That Created Too Many Connections

- **Situation:** Go HTTP service — creating a new Kafka producer per request
- **Problem:** Under load, service had 10,000 TCP connections to Kafka brokers — brokers overwhelmed — produce latency 5ms → 500ms
- **Root cause:**

```go
func handleRequest(...) {
    p, _ := kafka.NewProducer(&kafka.ConfigMap{...}) // new producer per request
    defer p.Close()
}
```

Each `kafka.NewProducer()` creates TCP connections to all brokers — 10,000 requests × 3 brokers = 30,000 connections.

- **Symptoms:** Broker connection table exhausted, produce latency growing, broker CPU high from connection management
- **Solution:**

```go
var producer *kafka.Producer // created once at startup, shared across all goroutines

func init() {
    producer, _ = kafka.NewProducer(&kafka.ConfigMap{...})
}
```

- **Result:** Connections reduced 30,000 → 3 (one per broker) — latency returned to 5ms
- **Lesson:** Kafka producers are goroutine-safe — create one at startup and share it; never create a producer per request

---

### Case 09 — The Transactional ID Reuse After a Crash

- **Situation:** Exactly-once payment event producer — transactional Kafka producer
- **Problem:** After producer crash and restart, new instance got fenced: `ProducerFencedException: Producer attempted to use a transactional id which is already in use`
- **Root cause:** `InitTransactions()` not called or failed on restart — the broker still saw the old producer epoch as active — fencing mechanism triggered
- **Solution:**

```go
producer := createProducer("payment-producer-{pod-name}") // unique per instance
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
if err := producer.InitTransactions(ctx); err != nil {
    log.Fatal("failed to init transactions", err) // must succeed before proceeding
}
```

- **Result:** Clean producer restart — old transaction fenced — new producer takes over
- **Lesson:** `InitTransactions()` is mandatory before any transaction and must complete successfully; use unique transactional IDs per deployment instance

---

## Part 02 — Consumer Failure Cases

### Case 10 — The Consumer Lag That Never Recovered

- **Situation:** Order fulfillment pipeline — consumer processes orders and calls external shipping API
- **Problem:** Consumer fell 2 million messages behind during Black Friday — spent 4 days trying to catch up — backlog never cleared
- **Root cause:** `max.poll.records=500` — consumer polls 500 records, calls shipping API 500 times sequentially — at 1 second per API call: 500 records takes ~500 seconds — new messages accumulate faster than consumed
- **Symptoms:** Consumer lag metric growing every hour, fulfillment delays reported by customers, session timeout rebalances during slow processing
- **Solution:** Parallel processing within consumer — process batch concurrently with thread pool; increase `max.poll.records=50` and reduce processing time; scale horizontally; decouple Kafka consumption from external API calls using local queue
- **Result:** Consumer lag cleared in 6 hours — sustained throughput 10× higher
- **Lesson:** Consumer throughput must always exceed producer throughput plus catch-up rate — design for burst capacity, not steady-state

---

### Case 11 — The Rebalance Storm That Halted Processing 45 Minutes

- **Situation:** High-throughput analytics consumer group — 50 consumers, 200 partitions
- **Problem:** Any consumer restart triggered full rebalance — 45 minutes of effective downtime in one day
- **Root cause:** Eager rebalancing (default) — when any consumer joins or leaves, ALL partitions revoked from ALL consumers — during revocation period, no consumer processes any message
- **Symptoms:** Consumer lag spikes every consumer restart, processing stops completely during rebalance
- **Solution:** `partition.assignment.strategy=CooperativeStickyAssignor` — only partitions that need to move are reassigned — consumers that retain partitions continue processing
- **Result:** Rebalance impact from 5–10 minutes full stop → 5–10 seconds partial reassignment — 95% of partitions unaffected during rebalance
- **Lesson:** Eager rebalancing is a full stop-the-world event — use `CooperativeStickyAssignor` for any consumer group with more than a handful of consumers

---

### Case 12 — The Offset Committed Before Processing (Silent Data Loss)

- **Situation:** Fraud detection pipeline — consumer reads transactions and writes alerts to database
- **Problem:** 0.1% of fraud alerts silently missed — transactions processed as legitimate when they should have been flagged
- **Root cause:** `enable.auto.commit=true` — Kafka auto-commits every 5 seconds — if consumer crashes between auto-commit and actually processing records, those records are never processed again
- **Symptoms:** Gap in fraud alert IDs, transaction IDs missing from alerts table, no error logs
- **Solution:** `enable.auto.commit=false` — commit offsets manually only after successful processing and database write
- **Result:** Zero silent message loss — each message processed and saved before offset committed
- **Lesson:** Auto-commit is at-most-once delivery — if consumer crashes after commit but before processing, data is permanently lost; manual commit after processing gives at-least-once delivery

---

### Case 13 — The Poison Pill Message That Stopped the Pipeline

- **Situation:** User event processing — consumers deserialize JSON events and update user profiles
- **Problem:** One malformed message caused deserialization exception — consumer retried indefinitely — entire partition stopped processing — all subsequent messages stuck behind the poison pill
- **Root cause:** No dead letter queue — consumer had no way to skip an unprocessable message
- **Symptoms:** Consumer lag growing on one partition only, deserialization exceptions looping in logs, other partitions processing normally
- **Solution:** Dead Letter Queue — catch deserialization exceptions, publish raw bytes to `topic-name.DLQ` topic, commit offset of failed message, continue processing:

```go
if err := deserialize(record); err != nil {
    sendToDLQ(record, err)
    consumer.CommitOffset(record) // advance past the bad message
    continue
}
```

- **Result:** Poison pill messages routed to DLQ within milliseconds — partition continues processing
- **Lesson:** Every Kafka consumer must have a DLQ strategy — a single unprocessable message should never stop an entire partition

---

### Case 14 — The Consumer Group That Reprocessed 30 Days of Messages

- **Situation:** ETL pipeline — consumer group processes events and writes to data warehouse
- **Problem:** Bug discovered — data in warehouse incorrect for last 30 days — required reprocessing all messages
- **Root cause (of reprocessing challenge):** `auto.offset.reset=latest` — no way to reprocess without manual offset reset — and the reset procedure was not documented
- **Solution:**

```bash
kafka-consumer-groups.sh \
  --bootstrap-server broker:9092 \
  --reset-offsets --to-datetime 2024-01-01T00:00:00.000 \
  --group etl-consumer --topic events --execute
```

Pause downstream warehouse writes during reprocessing to avoid double-writes; ensure consumers are idempotent so reprocessing is safe.

- **Result:** Successfully reprocessed 30 days of data in 4 hours
- **Lesson:** Design for offset reset from day one — keep long retention (7–30 days), document the reset procedure, ensure consumers are idempotent so reprocessing is safe

---

### Case 15 — The Consumer That Timed Out During Heavy Processing

- **Situation:** Image processing pipeline — consumer downloads from S3, resizes, uploads results
- **Problem:** Consumers frequently dropped out of the group and triggered rebalances — a rebalance every 5 minutes
- **Root cause:** `session.timeout.ms=10000ms` — S3 download + resize + upload took 15–20 seconds — consumer did not call `poll()` during processing — broker assumed consumer was dead
- **Symptoms:** Rebalance logs every few minutes, messages processed multiple times
- **Solution:** `max.poll.interval.ms=300000ms` (5 minutes) — time allowed between polls before consumer considered dead; process asynchronously so `poll()` continues; or reduce `max.poll.records=1`
- **Result:** No more rebalances during normal processing
- **Lesson:** `max.poll.interval.ms` must be greater than your worst-case processing time per batch

---

### Case 16 — The Consumer That Read the Same Message 10,000 Times

- **Situation:** Notification delivery system — consumer sends push notifications from Kafka events
- **Problem:** One message delivered to 10,000 users instead of one — sent 10,000 times
- **Root cause:** Consumer code called `consumer.seek()` to a previously processed offset on startup (broken "resume" feature) — combined with `enable.auto.commit=true` — continuously re-read and re-processed the same offset window
- **Symptoms:** Notification delivery count far exceeded message count, specific users spammed
- **Solution:** Remove incorrect seek logic; implement idempotent consumer:

```go
// Before sending, check if already processed:
if redis.SetNX(ctx, "notif:"+messageID, 1, 24*time.Hour) {
    sendNotification(record) // only executes if key was newly set
}
```

- **Result:** Idempotent processing prevents duplicates even if offset is re-read
- **Lesson:** Always implement idempotent consumers — Kafka delivers at-least-once; your consumer WILL receive the same message more than once; design for it

---

### Case 17 — The Slow Consumer That Triggered Log Segment Deletion

- **Situation:** Compliance archival system — consumer reads all events and archives to cold storage
- **Problem:** Archival consumer fell behind 10 days during storage outage — when recovered, Kafka had deleted log segments it needed — 10 days of compliance data permanently lost from Kafka
- **Root cause:** `log.retention.hours=168` (7 days default) — consumer was behind by more than 7 days — Kafka deleted old segments without knowing consumer still needed them
- **Solution:** Extend `log.retention.hours=720` (30 days) for compliance topics; monitor consumer lag against retention window — alert when lag exceeds 50% of retention; consumer should dual-write to S3 as it goes rather than relying on Kafka retention
- **Result:** Retention extended to 30 days — consumer must catch up within 30 days or alert fires at 15 days lag
- **Lesson:** Kafka retention is not a consumer guarantee — if a consumer falls behind longer than the retention window, those messages are permanently gone

---

### Case 18 — The New Group Name That Caused 6 Months Reprocessing

- **Situation:** Analytics pipeline — consumer group renamed during deployment (added `-v2` suffix)
- **Problem:** New consumer group had no committed offsets — `auto.offset.reset=earliest` — consumer started from the very first message — 6 months of data reprocessed — 180 million duplicate inserts corrupted data warehouse
- **Root cause:** New consumer group name = no prior committed offset = `auto.offset.reset` applies
- **Solution:** Never rename a consumer group without explicitly setting starting offset:

```bash
kafka-consumer-groups.sh --group analytics-consumer-v2 \
  --topic user-events --reset-offsets --to-latest --execute
```

Treat consumer group renames as breaking changes requiring offset initialization.

- **Result:** Zero reprocessing incidents after adding explicit offset reset to deployment checklist
- **Lesson:** A new consumer group name has no committed offsets — treat renames as destructive operations requiring explicit offset management

---

### Case 19 — The Offset Commit 30 Seconds Behind Reality

- **Situation:** Payment event consumer — `enable.auto.commit=true`, `auto.commit.interval.ms=30000`
- **Problem:** Consumer crash replayed last 30 seconds of payment events — duplicate payment notifications sent to customers
- **Root cause:** Auto-commit interval of 30 seconds means up to 30 seconds of processed-but-not-committed messages — on crash, those messages redelivered
- **Solution:** `enable.auto.commit=false` with manual commit after processing; add idempotency via Redis:

```go
if redis.SetNX(ctx, "payment-notif:"+paymentID, 1, 24*time.Hour) {
    sendNotification(paymentID)
}
consumer.CommitSync()
```

- **Result:** Duplicate notification window reduced to near-zero
- **Lesson:** `auto.commit.interval.ms` defines your duplication window on crash — for sensitive operations, use manual commit; combine with idempotency for true safety

---

### Case 20 — The Ghost Consumer Groups Polluting Monitoring

- **Situation:** Development team — 15 consumer groups created over 3 months, 12 abandoned
- **Problem:** Lag metrics dashboard noisy — abandoned groups accumulating lag — real issues hidden in noise — alert fatigue
- **Root cause:** Kafka retains consumer group offsets permanently unless explicitly deleted — abandoned groups never cleaned up
- **Solution:**

```bash
kafka-consumer-groups.sh --bootstrap-server broker:9092 \
  --group test-consumer-v1 --delete
```

Naming convention: `{env}-{service}-{purpose}` — dev groups with `dev-` prefix for batch deletion; automate cleanup of groups with `member.count=0` and `lag>0` older than N days.

- **Result:** Consumer group list cleaned up — monitoring dashboard meaningful — real issues visible
- **Lesson:** Consumer group offsets are permanent unless explicitly deleted — establish a lifecycle policy; clean up development consumer groups regularly

---

### Case 21 — The Consumer Lag Measured Incorrectly

- **Situation:** SLA-driven pipeline — alerting on consumer lag > 10,000 messages
- **Problem:** Alert never fired even when pipeline was visibly delayed — messages took 5 minutes to appear downstream
- **Root cause:** Lag measured as `end_offset - committed_offset` — consumer committed offsets before processing (auto-commit) — the gap between committed offset and actual processing completion was not captured — showed "lag=0" while messages sat in an in-memory queue
- **Solution:** Instrument real processing lag:

```go
kafkaTimestamp := record.Timestamp
processingComplete := time.Now()
metrics.Histogram("processing_lag_seconds", processingComplete.Sub(kafkaTimestamp).Seconds())
```

Alert on `processing_lag_seconds` P99 > 30 seconds — not just on committed offset lag.

- **Result:** True end-to-end latency visible — SLA alerts fire based on actual business impact
- **Lesson:** Committed offset lag measures how far behind the consumer is in reading — not how long processing takes; instrument end-to-end latency from message timestamp to downstream write completion

---

### Case 22 — The Seek-Based Retry That Caused Infinite Loop

- **Situation:** Error recovery mechanism — consumer seeks backward to reprocess failed messages
- **Problem:** A processing bug caused one message to fail — recovery logic seeked backward — same message failed again — seek backward — infinite loop — consumer never advanced
- **Root cause:** No retry limit — a permanently failing message causes infinite reprocess loop
- **Solution:** Bounded retries with DLQ:

```go
retryCount := map[int64]int{}
if err := process(record); err != nil {
    retryCount[record.Offset]++
    if retryCount[record.Offset] >= 3 {
        sendToDLQ(record, err)
        delete(retryCount, record.Offset)
        consumer.CommitOffset(record) // advance past failed message
    } else {
        time.Sleep(backoff(retryCount[record.Offset]))
        consumer.Seek(record.TopicPartition, record.Offset)
    }
}
```

- **Result:** Failed messages retried 3 times then routed to DLQ — partition always advances
- **Lesson:** Any seek-based retry without a retry limit creates an infinite loop for permanently failing messages; always bound retries and route to DLQ

---

## Part 03 — Broker and Cluster Failure Cases

### Case 23 — The Under-Replicated Partitions That Caused Data Loss

- **Situation:** Financial transaction log — 3 brokers, replication factor 3
- **Problem:** One broker GC-paused → fell out of ISR → `min.insync.replicas=1` allowed writes to continue with 1 replica → broker disk failed → data lost — topic now had only 2 replicas with a gap
- **Root cause:** `min.insync.replicas=1` effectively provides no replication protection — one replica is enough for writes to succeed
- **Solution:** For critical topics: `replication.factor=3`, `min.insync.replicas=2`, producer `acks=all` — writes only succeed if at least 2 replicas are in sync — single broker failure cannot cause data loss
- **Result:** Any single broker failure now safe — data written with acks=all and min.insync.replicas=2 is on at least 2 brokers
- **Lesson:** `min.insync.replicas=1` defeats replication — always set it to `replication.factor - 1` for critical topics (RF=3 → min.insync=2)

---

### Case 24 — The Unclean Leader Election That Corrupted a Topic

- **Situation:** IoT sensor pipeline — 5 broker cluster — 3 brokers went down simultaneously
- **Problem:** With `unclean.leader.election.enable=true` — out-of-sync replica elected as leader — stale data became authoritative — when original brokers recovered, newer data was overwritten — corruption
- **Root cause:** Unclean leader election allows any replica to become leader even if behind — trades availability for correctness
- **Solution:** `unclean.leader.election.enable=false` for all critical topics — partition becomes unavailable rather than electing a stale leader — accept temporary unavailability over permanent data corruption
- **Result:** No more unclean elections — partition unavailable (recoverable) instead of corrupted (irrecoverable)
- **Lesson:** `unclean.leader.election=true` is a correctness hazard — choose unavailability over corruption for critical topics

---

### Case 25 — The Partition Count That Could Not Scale Down

- **Situation:** User activity topic — started with 12 partitions
- **Problem:** After 6 months, 12 partitions were excessive — wanted to reduce to 6 — Kafka does not support reducing partition count
- **Root cause:** Partition count is a one-way door — you can add partitions but never remove them
- **Solution:** Accept the partition count and add more consumers (scale to 12 consumers) — or create a new topic with the correct partition count and use MirrorMaker to migrate; going forward: partition count = max expected consumer parallelism based on 2-year growth estimate
- **Lesson:** Partition count is permanent — you can add but never remove — set it to the maximum consumer parallelism you will ever need

---

### Case 26 — The Broker Disk That Filled From Compaction Failure

- **Situation:** User profile change log — compacted topic — broker disk filled unexpectedly
- **Problem:** Compacted topic was 400GB despite containing only 10 million user profiles (should be ~5GB) — log compaction was failing silently
- **Root cause:** `log.cleaner.min.cleanable.ratio` and `log.cleaner.min.compaction.lag.ms` misconfigured — cleaner not running on this topic — old dirty log segments accumulated without compaction
- **Symptoms:** Disk usage growing without new data volume, log cleaner thread errors in broker logs
- **Solution:** Fix compaction config: `log.cleaner.min.cleanable.ratio=0.1`; monitor log cleaner thread health; `kafka-log-dirs.sh` to check dirty ratio per partition
- **Result:** Compaction ran and reduced topic from 400GB to 4.8GB within 24 hours
- **Lesson:** Log compaction is a background process that can fail silently — monitor the dirty ratio and log cleaner thread health as critical metrics

---

### Case 27 — The Controller Bottleneck at 500 Topics

- **Situation:** Large Kafka cluster — 500 topics, 10,000 partitions, 20 brokers
- **Problem:** Kafka cluster became slow and unresponsive — metadata updates took seconds — producer and consumer connection time grew
- **Root cause:** Single Kafka controller (pre-KRaft) bottlenecked — 10,000 partitions means 10,000 partition state objects managed by one JVM — ZooKeeper coordination causing latency
- **Symptoms:** Long controller election times, slow metadata propagation, brokers frequently seeing controller as unavailable
- **Solution:** Reduce partition count by consolidating low-throughput topics; migrate to KRaft mode (Kafka without ZooKeeper); increase `controller.socket.timeout.ms`
- **Result:** After consolidation to 3,000 partitions and KRaft migration — cluster responsive again
- **Lesson:** Each partition has overhead on the controller — 10,000 partitions per cluster is a reasonable upper bound for older Kafka; KRaft mode scales significantly higher

---

### Case 28 — The Kafka Cluster Split-Brain Across Two Data Centers

- **Situation:** Multi-datacenter Kafka — 3 brokers in DC1, 3 in DC2, ZooKeeper quorum across both
- **Problem:** Network partition — both sides reached quorum — both elected a controller — both accepted writes — data diverged — when partition healed, two sides had divergent partition leadership
- **Root cause:** ZooKeeper quorum split evenly across two DCs — allowed both sides to reach quorum independently (3-3 split)
- **Solution:** Never split ZooKeeper quorum evenly across two DCs — use a third DC for the tiebreaker node (3-2-2 across 3 DCs); use MirrorMaker 2 for active-passive cross-DC replication instead of stretching a single cluster
- **Lesson:** A Kafka cluster stretched across two DCs without a tiebreaker is a split-brain waiting to happen — use active-passive replication between DCs instead

---

### Case 29 — The Replication Slot Disk Fill

- **Situation:** PostgreSQL logical replication slot for Debezium CDC — Kafka consumer
- **Problem:** Debezium CDC consumer went offline — replication slot held WAL files — disk filled — PostgreSQL crashed — `No space left on device`
- **Root cause:** PostgreSQL replication slots hold WAL files until the consumer catches up — offline consumer = unbounded WAL accumulation
- **Symptoms:** Disk usage growing without new inserts, PostgreSQL shutdown, Debezium connection errors
- **Solution:** Set `max_slot_wal_keep_size`; monitor slot lag in bytes and alert at 50% disk; drop slots when consumers are offline for more than a threshold; design CDC consumers for fast recovery
- **Result:** Replication slot lag monitored in real time — preventive action taken before disk fills
- **Lesson:** Replication slots are a disk time bomb — monitor slot lag as aggressively as free disk space

---

## Part 04 — Partition Design Failure Cases

### Case 30 — The Key That Created a Hot Partition

- **Situation:** E-commerce order events — partitioned by `seller_id`
- **Problem:** One major retailer generates 40% of all order events — one partition receives 40× the messages — one consumer handles it alone while others are idle
- **Root cause:** Skewed key distribution — `seller_id` has very unequal data distribution in practice
- **Symptoms:** One consumer at 100% CPU, others near idle, consumer lag only on the hot partition
- **Solution:** Composite key: `seller_id + bucket` where bucket = `random(0, N)` — spreads one seller across N partitions; or `null` key (round-robin) if ordering per seller not required
- **Result:** Load distributed across all partitions — consumer CPU balanced — throughput N× higher
- **Lesson:** Partition key cardinality and distribution must be analyzed before choosing a key — a key with one dominant value creates a hot partition that defeats partitioning

---

### Case 31 — The Single-Partition Topic That Could Not Scale

- **Situation:** Order status update topic — single partition for "simplicity"
- **Problem:** Order processing throughput limited to 15,000 messages/second — cannot scale beyond one consumer
- **Root cause:** One partition = one consumer = no parallelism — ordering guaranteed but at the cost of all horizontal scaling
- **Solution:** Increase to 60 partitions — partition by `order_id` to maintain per-order ordering; add 60 consumer instances
- **Caveat:** Adding partitions changes partition assignment for existing keys — transition requires careful handling
- **Result:** Throughput 15,000 → 120,000 messages/second — 8× improvement
- **Lesson:** Single-partition topics are serialization points — if throughput matters, partition early and partition by a key that distributes load evenly while preserving the ordering you actually need

---

### Case 32 — The Too-Many-Partitions That Caused Producer Latency

- **Situation:** Analytics platform — created a topic with 10,000 partitions "for future scale"
- **Problem:** Producer P99 latency increased from 5ms to 2,000ms — brokers sluggish
- **Root cause:** 10,000 partitions × 3 replicas = 30,000 log files — OS cannot efficiently cache them; each producer maintains connections to leader broker for each partition — memory and connection overhead
- **Symptoms:** Producer memory errors, broker I/O high without high throughput, metadata response latency high
- **Solution:** Reduce to 120 partitions — formula: `partitions = max(desired_throughput / throughput_per_partition, desired_consumer_parallelism)` — for most systems, 12–240 partitions per topic
- **Result:** Producer latency returned to 5ms P99 — broker I/O normalized
- **Lesson:** More partitions is not always better — each partition has overhead on producers, brokers, consumers; choose based on throughput and parallelism needs, not "just in case"

---

### Case 33 — The Ordering Violation From Multiple Producers

- **Situation:** Payment state machine — events must be ordered: `INITIATED → PROCESSING → COMPLETED`
- **Problem:** Payment state transitions occasionally received out of order by consumers
- **Root cause:** Two separate producer instances producing with same `payment_id` key — `max.in.flight.requests.per.connection > 1` without idempotence — two producers can interleave messages even with the same key
- **Solution:** Single producer per entity responsible for all state transitions; or `enable.idempotence=true` with `max.in.flight.requests.per.connection=5` — preserves ordering even with retries
- **Result:** Strict ordering guaranteed
- **Lesson:** Ordering in Kafka is guaranteed within a partition for a single producer — multiple producers on the same key do NOT guarantee ordering; use one producer per entity or transactions

---

### Case 34 — The Partition Key That Violated Ordering (Int vs String)

- **Situation:** Order processing — events partitioned by `order_id` — two services producing to same topic
- **Problem:** Events for the same order occasionally received out of order — Service A sent key as integer, Service B sent key as string
- **Root cause:** `key=12345` (int) and `key="12345"` (string) hash to DIFFERENT partitions — the two events for the same order ended up on different partitions — ordering not guaranteed across partitions
- **Solution:** Enforce key serialization contract for all producers — document: "Keys on `order-events` MUST be string representation of order_id" — enforce via Schema Registry key schema validation
- **Result:** Consistent key serialization → same partition for same order → ordering guaranteed
- **Lesson:** Ordering by key only works if all producers use identical key serialization — enforce key format as part of the topic contract

---

### Case 35 — The Compacted Topic Queried Like a Database

- **Situation:** User preference service — compacted topic as key-value store
- **Problem:** New service needed "get current preference for user 123456" — developer consumed from beginning scanning for the key — took 45 minutes to find the record
- **Root cause:** Log compaction retains latest value per key — but reading a specific key requires reading through the entire topic — Kafka has no index on keys within a topic
- **Solution:** Use Redis as the serving layer — consumer reads compacted topic from beginning to build initial Redis state — on each new event: update Redis — readers query Redis O(1) — not Kafka
- **Result:** Key lookup 45 minutes → 1ms
- **Lesson:** A compacted Kafka topic is NOT a key-value database — it has no random access capability; always pair a compacted topic with a serving store (Redis, RocksDB) built from the compacted log

---

## Part 05 — Performance Improvement Case Studies

### Case 36 — Compression: Throughput 3×, Storage 70% Reduction

- **Situation:** Log aggregation — 50GB/hour of log events sent to Kafka
- **Problem:** Network bandwidth between producers and brokers saturated — 10Gbps link at 95% — throughput limit reached
- **Investigation:** Messages are UTF-8 JSON — highly compressible — but `compression.type=none` configured
- **Solution:** `compression.type=lz4` on producer — LZ4 chosen for best balance of compression ratio and CPU cost
- **Result:** 50GB/hour → 15GB/hour (70% storage reduction), network utilization 95% → 28%, throughput 3× because bottleneck was network bandwidth not broker CPU
- **Lesson:** JSON is highly compressible — lz4 is the best default; zstd gives better ratio at slightly higher CPU cost; snappy is between the two

---

### Case 37 — Batch Tuning: Producer Throughput 12× Improvement

- **Situation:** Metrics collection — 1 million metric data points/second — each ~50 bytes
- **Problem:** Producer throughput maxed at 80,000 messages/second — broker CPU at 95% from request overhead
- **Root cause:** `batch.size=16384` with 50-byte messages = 327 messages per batch — `linger.ms=0` = sending 1 message per batch effectively — enormous request overhead
- **Solution:** `batch.size=1048576` (1MB), `linger.ms=20ms` — batches accumulate 20,000 messages — `compression.type=lz4`
- **Result:** Throughput 80,000 → 980,000 messages/second — broker CPU 95% → 18% — 12× improvement
- **Lesson:** For high-volume small messages, batch tuning is the single biggest lever — reduces produce requests by orders of magnitude

---

### Case 38 — Consumer Parallelism: Throughput 8× Improvement

- **Situation:** Image resize pipeline — 1 consumer instance, 32 partitions
- **Problem:** Consumer lag growing — 1 consumer instance cannot keep up with 32 partitions
- **Root cause:** 32 partitions but only 1 consumer — all 32 partitions assigned to 1 consumer — single-threaded bottleneck
- **Solution:** Scale consumer group to 32 instances — one consumer per partition — each handles exactly one partition with dedicated resources
- **Result:** Throughput 8× improvement — from 4 cores on 1 instance to 32 instances × 4 cores = 128 cores total
- **Lesson:** Consumer parallelism is bounded by partition count — always have at least as many partitions as maximum expected consumer instances

---

### Case 39 — Switching from JSON to Avro: Throughput 4×, Storage 60% Reduction

- **Situation:** Event streaming platform — 100,000 events/second with JSON serialization
- **Problem:** Serialization/deserialization CPU consuming 40% of consumer CPU — JSON schema validation at every consumer — redundant field names repeated in every message
- **Solution:** Migrate to Apache Avro with Schema Registry — schemas stored centrally — messages contain only schema ID (4 bytes) + binary data — no field names in message body
- **Result:** Message size 2,400 bytes → 800 bytes (67% reduction), consumer CPU for deserialization reduced 60%, throughput 4× on same hardware
- **Lesson:** JSON is human-readable but expensive — Avro/Protobuf binary serialization can reduce message size 3–10× and deserialization CPU 5–10×

---

### Case 40 — Fetch Size Tuning: Consumer Throughput 5× Improvement

- **Situation:** Large event replay — consumer reading historical events from Kafka
- **Problem:** Consumer throughput only 10MB/second despite broker having 50MB/partition/second available
- **Root cause:** `fetch.min.bytes=1` — broker sends response as soon as any data is available — very small fetches — high request overhead
- **Solution:** `fetch.min.bytes=1048576` (1MB), `max.partition.fetch.bytes=10485760` (10MB), `fetch.max.wait.ms=500`
- **Result:** Consumer throughput 10MB/second → 52MB/second — 5× improvement — broker request count reduced 10×
- **Lesson:** Consumer fetch settings are as important as producer batch settings — larger fetch size dramatically reduces request overhead for replay and catch-up

---

### Case 41 — Topic Compaction Reduces Storage 95%

- **Situation:** User preference service — `cleanup.policy=delete` retaining 6 months of change history — 500GB
- **Problem:** Bootstrapping a new consumer required reading 6 months of history — 4 hours just to build current state
- **Solution:** Migrate to `cleanup.policy=compact` — retains only latest message per key — history older than latest compacted away
- **Result:** 500GB → 24GB (95% reduction) — new consumer bootstrap time 4 hours → 12 minutes
- **Lesson:** For state-tracking topics, log compaction should always be enabled — it reduces storage proportionally to key count, not event rate

---

### Case 42 — Rack-Aware Replica Placement: Cross-DC Bandwidth 60% Reduction

- **Situation:** Kafka cluster across 3 AZs — replication factor 3 — high cross-AZ bandwidth bills
- **Problem:** Cross-AZ bandwidth bills $40,000/month on AWS
- **Root cause:** Default replica placement without AZ awareness — replicas placed suboptimally — excessive cross-AZ replication traffic
- **Solution:** Configure `broker.rack` with each broker's AZ — Kafka uses rack-aware replica placement — ensures one replica per AZ — minimizes cross-AZ replication hops
- **Result:** Cross-AZ bandwidth reduced 60% — $40,000/month → $16,000/month
- **Lesson:** Rack-aware replica placement reduces cross-AZ bandwidth costs in cloud deployments — always configure `broker.rack` in multi-AZ deployments

---

### Case 43 — Tiered Storage: Broker Disk Requirement 80% Reduction

- **Situation:** Compliance log retention — 365 days required — 100TB of Kafka storage — $500,000/year
- **Problem:** 100TB of local broker SSD extremely expensive — most data cold (rarely read) but must be accessible
- **Solution:** Kafka Tiered Storage — recent data on broker local disk (hot tier, last 7 days) — older data automatically offloaded to S3 (cold tier, up to 365 days) — consumers transparently read from either tier
- **Result:** Local broker disk 100TB → 7TB (7 days hot data) — storage cost $500,000/year → $85,000/year (80% reduction) — compliance maintained
- **Lesson:** Tiered storage decouples retention from broker disk — keep data as long as compliance requires without paying broker SSD prices for cold data

---

## Part 06 — Real Company Architecture Case Studies

### Case 44 — LinkedIn: The Birthplace of Kafka (Log Aggregation at Scale)

- **Situation:** LinkedIn 2011 — needed to move activity data from services to Hadoop for analytics
- **Problem:** Existing solutions too slow (batch ETL), too lossy (UDP metrics), or couldn't handle volume
- **Solution:** Built Kafka internally — publish-subscribe log with persistent, distributed, fault-tolerant storage — partition by member_id for activity data
- **Scale achieved:** 1 trillion messages/day
- **Lesson:** Kafka was designed for this exact use case — durable, high-throughput, real-time activity data pipeline — the canonical Kafka use case

---

### Case 45 — Uber: Real-Time Surge Pricing via Kafka

- **Situation:** Uber surge pricing — must compute supply/demand balance per geofenced zone in real time
- **Kafka design:** Driver location events → `driver-location` topic, rider requests → `rider-request` topic — consumed by Flink stream processing — Flink aggregates per geofence zone — surge multiplier written to serving store
- **Scale:** 500M location events/day, 5ms P99 end-to-end latency from GPS update to price update
- **Key decision:** Partitioned by `geofence_zone_id` — all events for one zone go to one partition — Flink processor has complete local view of supply and demand for that zone
- **Lesson:** Partition by the entity you need to aggregate (zone_id, not driver_id) — co-locate all events for the aggregation unit on the same partition

---

### Case 46 — Netflix: Keystone Pipeline (700 Billion Events Per Day)

- **Situation:** Netflix — every play, pause, seek, buffer event from every device must be processed
- **Scale:** 700B events/day — 8M events/second at peak
- **Kafka architecture:** Producer SDK in every Netflix client app → regional Kafka clusters → MirrorMaker 2 replication to central cluster → 100+ consumer applications
- **Key problem solved:** At 8M events/second, a single cluster cannot handle all producers — regional clusters absorb local write traffic — central cluster is the single source of truth for analytics
- **Lesson:** At extreme scale, hierarchical Kafka cluster topology (regional → central) is necessary — local producers write locally, replication aggregates to the center

---

### Case 47 — Airbnb: Kafka as the Backbone of Their Data Platform

- **Situation:** Airbnb — connecting 100+ data producers with 50+ data consumers
- **Problem before Kafka:** Point-to-point pipelines — N producers × M consumers = N×M pipelines to maintain
- **Solution:** Kafka as central data bus — producers publish once, consumers subscribe independently — topic per business entity with Avro schema
- **Result:** N×M pipelines replaced with N+M connections to Kafka — adding a new consumer requires no changes to producers
- **Lesson:** Kafka as data mesh hub eliminates the N×M integration problem — the operational investment pays dividends across every data integration need

---

### Case 48 — Robinhood: Order Execution With Exactly-Once Semantics

- **Situation:** Stock trading — order events must be processed exactly once — double processing = double trade execution = regulatory violation
- **Solution:**
  1. `enable.idempotence=true`, `transactional.id=order-producer-{instance-id}`
  2. `isolation.level=read_committed` on consumers
  3. Consume-transform-produce inside a Kafka transaction
  4. Database unique constraint on `(order_id, event_type)` as final guard
- **Result:** Exactly-once processing — duplicate order executions reduced to zero
- **Lesson:** Exactly-once in Kafka requires: idempotent producer + transactions + idempotent consumers; the database unique constraint is the final safety net

---

### Case 49 — Walmart: Real-Time Inventory Across 4,700 Stores

- **Situation:** Every item scan at every register is an inventory event — 1 billion events/day
- **Kafka design:** Store POS → edge Kafka clusters → MirrorMaker 2 → central Kafka → Kafka Streams aggregates per SKU per store → Redis for online storefront
- **Key design:** Partitioned by `store_id + sku_id` composite key — all events for one SKU in one store go to one partition — Kafka Streams processor maintains accurate running count
- **Result:** Online inventory accuracy "batch updated hourly" → "updated within 5 seconds of a sale"
- **Lesson:** Composite partition keys (store_id + sku_id) enable accurate stateful aggregation — stream processor sees all events for its scope without cross-partition coordination

---

### Case 50 — Stripe: Payment Event Bus

- **Situation:** Every payment, refund, dispute, webhook delivery is a Kafka event
- **Architecture decisions:**
  - `acks=all` + `min.insync.replicas=2` + `replication.factor=3` on all financial topics
  - Per-payment-id partitioning — all events for one payment on one partition
  - Consumer idempotency via database unique constraint
  - DLQ for every consumer
  - Separate Kafka clusters per criticality tier — payment cluster (highest SLA) vs analytics cluster (lower SLA)
- **Lesson:** Financial Kafka deployments must treat every configuration decision as a data integrity decision; over-engineer for correctness, not for cost

---

### Case 51 — Discord: Kafka for Presence and Real-Time Features

- **Situation:** Tracking which friends are "online" across millions of concurrent users — millions of presence changes/second
- **Kafka design:** Presence change events → `user-presence` topic partitioned by `user_id` — Kafka Streams reads presence events and computes friend fan-out using KTable of social graph — output to individual user notification topics
- **Scale:** 500M presence events/day, sub-second propagation to friends
- **Lesson:** Kafka Streams with KTables (changelog topics as state) enables join operations between event streams and state tables — presence events joined against friend graph to compute fan-out targets

---

### Case 52 — Pinterest: Kafka at 800 Billion Messages Per Day

- **Situation:** Pinterest data pipeline — user activity, ad impressions, recommendations
- **Scale:** 800B messages/day, 2,000+ topics, 500+ brokers
- **Key challenges solved:**
  1. **Topic proliferation:** API-enforced naming convention, automatic ACL assignment, monitoring auto-provisioning
  2. **Consumer lag at scale:** Unified dashboard with SLA-based alerting per consumer group
  3. **Tiered storage:** Compliance with 1-year retention at 85% cost reduction
  4. **Cross-region replication:** MirrorMaker 2 with custom lag monitoring and automated failover
- **Lesson:** At 500+ brokers, Kafka operations require custom tooling built on the Kafka Admin API — built-in tools do not scale to this operational complexity

---

## Part 07 — Kafka Streams Failure Cases

### Case 53 — The Stateful Operation That Ran Out of Memory

- **Situation:** Kafka Streams — windowed aggregation of user events: "count events per user in the last 1 hour"
- **Problem:** Application crashed with OOM after 3 days — heap exhausted by state store
- **Root cause:** Windowed state store retained state for every user who had ever produced an event — millions of users — state growing without bound — old windows not properly expired
- **Solution:** Configure `TimeWindows.of(Duration.ofHours(1)).grace(Duration.ofMinutes(5))` — windows older than 1 hour + grace period automatically cleaned up; use disk-backed RocksDB state store (default) so state spills to disk
- **Result:** Memory usage stabilized — state store bounded by active window count × state size
- **Lesson:** Windowed aggregations accumulate state — always configure window retention and grace period; state stores default to disk-backed (RocksDB) — never try to keep all state in memory

---

### Case 54 — The Stream-Table Join That Stalled at Startup

- **Situation:** Kafka Streams — joining orders stream with KTable of user profiles
- **Problem:** Application slow to start — initial records dropped — join only correct after 10 minutes
- **Root cause:** KTable bootstrap — on startup, Streams application must restore KTable by reading entire changelog topic — until fully bootstrapped, stream-table joins may return null
- **Solution:** `num.standby.replicas=1` — second instance pre-loads KTable so failover/restart doesn't cause full bootstrap delay; for small tables: Global KTable (loaded by all instances)
- **Result:** Restart recovery time reduced from 10 minutes to 30 seconds
- **Lesson:** KTable restoration time is proportional to changelog topic size — plan for restart latency and use standby replicas for stateful Kafka Streams applications

---

### Case 55 — The Exactly-Once That Caused a Performance Cliff

- **Situation:** Order processing Kafka Streams with `processing.guarantee=exactly_once_v2`
- **Problem:** Throughput dropped from 50,000 records/second to 8,000 records/second — 84% reduction
- **Root cause:** EOS requires transactions — each processing batch wrapped in transaction — transaction commits add latency proportional to output partitions × replication factor
- **Solution:** Reduce transaction overhead: reduce output topics per transaction; increase `commit.interval.ms=1000ms` to batch more records per transaction; use `exactly_once_v2` (Kafka 3.0+ default) which is more efficient
- **Result:** With tuning: 8,000 → 35,000 records/second — EOS overhead reduced from 84% to 30%
- **Lesson:** Exactly-once processing has real throughput cost — typically 20–40% overhead for well-tuned configurations; tune `commit.interval.ms` to balance throughput and latency

---

### Case 56 — The Stream Join That Produced No Output

- **Situation:** Kafka Streams — joining orders stream with customer profile stream
- **Problem:** Joined stream produced zero output despite both input topics having messages
- **Root cause:** Stream-stream join requires both streams to have messages within the join window — customer events timestamped from 6 months ago — orders had current timestamps — 5-minute join window — 6 months apart — no match
- **Solution:** Use stream-table join instead:

```java
KTable<String, Customer> customerTable = builder.table("customer-profiles");
ordersStream.join(customerTable, (order, customer) -> enrich(order, customer))
```

Stream-table join always uses latest table value — no timestamp matching required.

- **Result:** Join produces output for all orders
- **Lesson:** Stream-stream join requires temporal proximity — for reference data (customers, products, config), use a KTable which always provides the latest value regardless of timestamp

---

### Case 57 — The Aggregation That Produced Wrong Results After Changelog Restore

- **Situation:** Real-time sales aggregation — hourly sales counts per product
- **Problem:** After Streams restart, hourly sales counts wrong — some products showed 0 sales for current hour
- **Root cause:** State restored from changelog — but changelog had 2-minute lag — restored state was 2 minutes stale — Streams began aggregating from stale baseline — counts incorrect for the gap
- **Solution:** Health check blocks traffic until state restoration complete — `KafkaStreams.State.RUNNING` before accepting requests; `num.standby.replicas=1` reduces restoration from minutes to seconds
- **Result:** Traffic not routed until state fully restored — correct counts from first query
- **Lesson:** Never route traffic to a Streams instance still restoring state; use health checks that verify `KafkaStreams.State.RUNNING`

---

### Case 58 — The Windowed Store That Emitted Results Too Early

- **Situation:** Kafka Streams — computing hourly revenue totals
- **Problem:** Revenue totals emitted before the hour was complete — downstream consumers saw partial results
- **Root cause:** `toStream()` after windowed aggregation emits on EVERY UPDATE to the window — not just when it closes
- **Solution:**

```java
.aggregate(...)
.suppress(Suppressed.untilWindowCloses(Suppressed.BufferConfig.unbounded()))
.toStream() // emits ONCE per window when it closes
```

- **Result:** Downstream consumers only receive final window results — revenue totals correct
- **Lesson:** Windowed aggregations emit on every update by default — use `suppress()` to hold results until window closes; the most common Kafka Streams misunderstanding for analytics

---

### Case 59 — The RocksDB State Store That Grew Without Bound

- **Situation:** Kafka Streams — session window aggregation — session timeout 30 minutes
- **Problem:** RocksDB state store on each stream task grew without bound — after 30 days, 100GB of state per task
- **Root cause:** Session windows without maximum session duration — low-frequency users with occasional events spread over months never closed their session — state accumulates one entry per session indefinitely
- **Solution:** Add hard maximum session duration — `SessionWindows.ofInactivityGapWithNoGrace(Duration.ofMinutes(30))` with maximum session duration; periodically clean orphaned state; monitor RocksDB disk usage per task
- **Result:** State store size stabilized at 2GB per task
- **Lesson:** Session window state grows with number of unique active users — set maximum session durations and monitor state store size as a critical metric

---

## Part 08 — MirrorMaker and Multi-Region Failure Cases

### Case 60 — The MirrorMaker 1 That Lost Messages During Failover

- **Situation:** Active-passive multi-region — MirrorMaker 1 replicating from US-East to EU-West
- **Problem:** During US-East outage, EU-West was 15 minutes behind — 15 minutes of messages permanently lost — no visibility into replication lag before the failover
- **Root cause:** MirrorMaker 1 has no concept of replication lag monitoring, offset translation, or consumer group offset mirroring
- **Solution:** Migrate to MirrorMaker 2 — provides: lag monitoring per topic per partition, consumer group offset translation, heartbeat topics for connectivity verification; alert on MM2 replication lag > 30 seconds
- **Result:** MM2 replication lag monitored in real time — failover shows exactly how much data may be at risk — consumer groups resume from correct offset on DR cluster
- **Lesson:** MirrorMaker 1 is obsolete — MirrorMaker 2 is the correct tool; monitor replication lag as your RPO for Kafka failover

---

### Case 61 — The Offset Mismatch After Cross-Region Failover

- **Situation:** MM2 replicating US-East to EU-West — failover to EU-West executed
- **Problem:** Consumer groups resumed on EU-West but from wrong offsets — some reprocessed thousands of messages, others skipped thousands
- **Root cause:** Kafka offsets are cluster-specific — offset 5,000 in US-East is not the same message as offset 5,000 in EU-West — consumer groups must use MM2's offset translation
- **Solution:** `sync.group.offsets.enabled=true` in MM2 — continuously syncs consumer group offsets from primary to DR cluster, translating to DR cluster's offset space
- **Result:** Consumer groups resume within 5 seconds of failover at exactly the right position
- **Lesson:** Cross-region Kafka failover without offset translation is always incorrect — MM2's offset sync is the only correct approach; test failover with offset verification

---

### Case 62 — The Active-Active Kafka Setup With Message Cycles

- **Situation:** Active-active Kafka — producers write to both US-East and EU-West — MM2 replicating between clusters
- **Problem:** Messages cycling infinitely — a message produced in US-East mirrored to EU-West — the mirror mirrored back to US-East — infinite loop — storage filled up
- **Root cause:** MM2 uses topic renaming to prevent cycles — but team configured MM2 to mirror all topics including already-mirrored ones
- **Solution:** Configure MM2 topic exclusion patterns: `topics.exclude=.*\..*` — any topic with a dot in the name (indicating it is a mirror) excluded from further mirroring; use MM2's built-in provenance header to detect cycled messages
- **Lesson:** Active-active Kafka with MM2 requires careful topic exclusion configuration — MM2's cycle detection only works if you correctly exclude mirror topics from re-replication

---

### Case 63 — The Geo-Replication Latency That Violated SLA

- **Situation:** Global financial platform — trade events from Tokyo must be visible in London within 500ms
- **Problem:** MM2 replication Tokyo → London had P99 latency of 1,200ms — SLA violated
- **Root cause:** `refresh.topics.interval.seconds=600` — new partitions not discovered for 10 minutes — `fetch.min.bytes=1` causing many small fetch requests each with 200ms RTT (Tokyo → London)
- **Solution:** `refresh.topics.interval.seconds=30`; `fetch.min.bytes=65536`; `producer.compression.type=lz4`; dedicated high-bandwidth link between data centers
- **Result:** P99 replication latency 1,200ms → 380ms — SLA met
- **Lesson:** Cross-region Kafka replication latency is bounded by network RTT × number of fetch round trips — reduce round trips by increasing fetch batch size

---

## Part 09 — Kafka Connect Failure Cases

### Case 64 — The JDBC Source Connector That Caused Full Table Scans

- **Situation:** MySQL → Kafka using Kafka Connect JDBC Source — syncing 50M row orders table
- **Problem:** Every poll cycle did a full table scan — MySQL CPU at 100% — killing the production database
- **Root cause:** `mode=bulk` — reads entire table on every poll — no incrementing column tracking
- **Solution:** `mode=incrementing` with `incrementing.column.name=id` — tracks highest ID seen, only fetches new rows; or `mode=timestamp+incrementing` for tables with updates
- **Result:** Full table scan every 5 minutes → incremental query reading only new rows — MySQL CPU returned to baseline
- **Lesson:** JDBC connector `bulk` mode is almost never correct for production tables — always use `incrementing` or `timestamp+incrementing`

---

### Case 65 — The Sink Connector That Lost Messages on Restart

- **Situation:** Kafka Connect Elasticsearch Sink — indexing events into Elasticsearch
- **Problem:** After Connect worker restart, ~2,000 messages not indexed — no errors visible
- **Root cause:** `errors.tolerance=all` — errors logged but messages silently skipped — a schema evolution introduced a new field — Elasticsearch mapping didn't support it — every message with the new field silently dropped
- **Solution:** `errors.tolerance=none` for production sinks; enable DLQ: `errors.deadletterqueue.topic.name=elasticsearch-sink-dlq`; monitor DLQ message count as critical alert
- **Result:** Every failed message surfaced — DLQ treated as urgently as an outage alert
- **Lesson:** `errors.tolerance=all` in Kafka Connect is silent data loss — never use without a monitored DLQ

---

### Case 66 — The Debezium Connector That Missed Schema Changes

- **Situation:** PostgreSQL → Kafka CDC using Debezium
- **Problem:** After ALTER TABLE adding new column, Debezium continued publishing events — new column absent from Kafka messages for 3 hours
- **Root cause:** Debezium had cached the old schema — schema cache not invalidated when ALTER TABLE occurred
- **Solution:** `schema.refresh.mode=columns_diff_exclude_unchanged_toast`; monitor schema change events in Debezium output
- **Result:** Schema changes detected and propagated within 1 minute of ALTER TABLE
- **Lesson:** Debezium schema caching can cause a window where schema changes are not reflected — configure schema refresh mode and monitor the schema change topic

---

### Case 67 — The Debezium Connector That Missed Deletes

- **Situation:** PostgreSQL → Kafka CDC — syncing user data to Elasticsearch search index
- **Problem:** Users who deleted their accounts still appeared in search results
- **Root cause:** `REPLICA IDENTITY DEFAULT` — only includes primary key in WAL for DELETE — no column values — Elasticsearch sink received tombstone (key=user_id, value=null) but wasn't configured to handle deletes
- **Solution:**

```sql
ALTER TABLE users REPLICA IDENTITY FULL;
```

Configure Elasticsearch sink: `behavior.on.null.values=delete`

- **Result:** Account deletions propagate to Elasticsearch — deleted users removed from search within seconds
- **Lesson:** `REPLICA IDENTITY DEFAULT` causes Debezium to emit tombstones for deletes with no column data — configure `REPLICA IDENTITY FULL` for tables where sinks need column data on delete

---

### Case 68 — The Connect Worker OOM From One Heavy Connector

- **Situation:** Kafka Connect cluster — 10 connectors on 3 workers — one JDBC sink with large batch size
- **Problem:** One worker crashed with OOM — all connectors redistributed to remaining 2 workers — those OOM'd too — cascading failure — all 10 connectors offline
- **Root cause:** `batch.size=10000` on JDBC sink — 10,000 rows × 5KB per row = 50MB per batch — multiple tasks × multiple connectors — heap exhausted
- **Solution:** Reduce `batch.size` to 100–500 for large-row connectors; increase worker heap `-Xmx8g`; run memory-intensive connectors on dedicated workers; monitor worker heap and alert at 80%
- **Result:** After heap increase and batch size reduction — no more OOM
- **Lesson:** One memory-hungry connector can kill all connectors on a worker — monitor heap per worker and isolate high-memory connectors

---

### Case 69 — The SMT That Silently Transformed Data Incorrectly

- **Situation:** Kafka Connect with SMT chain routing messages to topics based on region field
- **Problem:** Some messages routed to wrong topic — US customer appeared in EU topic — data residency violation
- **Root cause:** SMT execution order matters — one SMT removed the region field before the routing SMT read it — routing SMT saw null and defaulted to a fallback topic
- **Solution:** Test SMT chains in isolation; add logging SMT to print intermediate message state during development; document SMT chain order explicitly
- **Lesson:** SMT chains execute in order — a bug in one SMT silently affects all subsequent SMTs; treat SMT chains as code — write tests for them

---

## Part 10 — Kafka Security Failure Cases

### Case 70 — The Kafka Cluster Exposed to the Public Internet

- **Situation:** Startup Kafka cluster — AWS EC2 — security group with port 9092 open to `0.0.0.0/0`
- **Problem:** Within 48 hours of launch, cluster producing millions of spam messages from unknown producers — data exfiltration occurring
- **Root cause:** Kafka has no authentication by default — public internet exposure with no auth = anyone can read/write
- **Solution:** Security group: allow port 9092/9093 only from VPC CIDR; enable SASL/SCRAM or mTLS; enable TLS encryption; ACLs on all topics; Kafka on private subnet with no internet gateway route
- **Lesson:** An unsecured Kafka cluster on the public internet will be found and exploited within hours — enabling security is not optional

---

### Case 71 — The Super User Used in Application Code

- **Situation:** Kafka cluster with `super.users=User:admin` — admin credentials used for all producers/consumers
- **Problem:** Test producer accidentally configured with admin credentials — published malformed messages to 50 production topics — admin bypasses all ACLs — no blast radius containment
- **Solution:** Remove all application code from using super users; create dedicated service accounts with minimal permissions:

```bash
kafka-acls --add --allow-principal User:payment-service \
  --operation Write --topic payment-events
```

Reserve super users for break-glass emergency access only; audit and alert on any super user activity in production.

- **Lesson:** Super users bypass all ACLs — break-glass emergency accounts only, not credentials for application code

---

### Case 72 — The TLS Certificate That Expired During Peak Traffic

- **Situation:** Kafka cluster with TLS encryption — certificate with 1-year validity
- **Problem:** TLS certificate expired during Black Friday — all producers and consumers failing with SSL handshake errors — 45 minutes of complete Kafka unavailability
- **Root cause:** Certificate expiry not monitored — no alert configured for certificate expiry
- **Solution:** Alert 90 days, 30 days, and 7 days before expiry; automate certificate rotation using cert-manager in Kubernetes; document the certificate rotation runbook
- **Lesson:** TLS certificate expiry is a scheduled outage if not monitored — automate rotation to eliminate the human failure point

---

### Case 73 — The SASL Credential Rotation That Broke All Connections

- **Situation:** Kafka cluster with SASL/SCRAM — simultaneous credential rotation for all service accounts
- **Problem:** All producers and consumers immediately failed authentication — 2 hours to update all client configurations and redeploy
- **Root cause:** Simultaneous credential rotation — all old credentials invalidated while clients still held old credentials
- **Solution:** Rolling credential rotation:
  1. Add new credential alongside the old one (SCRAM supports multiple per user)
  2. Update clients to use new credential and redeploy
  3. Remove old credential after all clients updated
- **Result:** Zero-downtime credential rotation
- **Lesson:** Credential rotation requires a transition period where both old and new credentials are valid — never rotate credentials for all clients simultaneously

---

### Case 74 — The ACL That Allowed Read on `__consumer_offsets`

- **Situation:** Multi-tenant Kafka — service account accidentally granted read on `__consumer_offsets`
- **Problem:** Team B could see Team A's consumer group offsets — information disclosure — which topics consumed and how far behind
- **Root cause:** `__consumer_offsets` exposes consumer group metadata for all groups — read access reveals sensitive operational data
- **Solution:**

```bash
kafka-acls --remove --allow-principal User:team-b-service \
  --operation Read --topic '__consumer_offsets'
```

Review all ACLs on internal topics quarterly.

- **Lesson:** Internal Kafka topics (`__consumer_offsets`, `__transaction_state`) contain sensitive metadata — never grant external service accounts access

---

### Case 75 — The Kerberos Ticket That Expired Mid-Job

- **Situation:** Kafka cluster with Kerberos (GSSAPI) authentication — long-running Kafka Streams job
- **Problem:** Job ran successfully for 10 hours then failed with authentication errors — exactly at Kerberos ticket lifetime (10 hours default)
- **Solution:**

```properties
sasl.kerberos.min.time.before.relogin=60000
sasl.kerberos.ticket.renew.window.factor=0.8
sasl.kerberos.ticket.renew.jitter=0.05
```

Or switch to SCRAM or mTLS authentication which doesn't have ticket expiry issues.

- **Result:** Kerberos tickets auto-renewed — long-running jobs never hit authentication expiry
- **Lesson:** Kerberos tickets expire — any Kafka job longer than the ticket lifetime must configure auto-renewal

---

## Part 11 — Kafka Monitoring Failure Cases

### Case 76 — The Alert That Fired for Dead Consumer Groups

- **Situation:** Consumer lag alert: `kafka_consumer_group_lag > 10000` — fired constantly for abandoned groups
- **Problem:** Alert fatigue — real alerts ignored because abandoned groups with no consumers triggered the same alert
- **Solution:**

```promql
kafka_consumer_group_lag > 10000 AND kafka_consumer_group_members > 0
```

Separate alert for stopped pipelines: `kafka_consumer_group_members == 0 AND kafka_consumer_group_lag > 0`

- **Result:** Alert fatigue eliminated — only active consumer groups with real lag trigger the alert
- **Lesson:** Consumer lag alerts must be conditioned on the group being active — a group with lag but no members is a stopped pipeline, not a slow one; separate the two alerts

---

### Case 77 — The ISR Shrinkage That Was Not Alerted

- **Situation:** 3-broker cluster — broker 3 had network issue — fell out of ISR for 2 hours — nobody noticed
- **Problem:** During those 2 hours, cluster ran with only 2 in-sync replicas — one more broker failure would have caused data loss
- **Solution:** Critical alerts for ISR health:

```promql
kafka_cluster_partition_under_replicated_partition > 0  # page immediately
kafka_controller_kafkacontroller_offlinepartitionscount > 0  # critical
```

Under-replicated partitions should page immediately — every minute in this state is a risk of data loss.

- **Lesson:** Under-replicated partitions are the most critical Kafka health signal — they indicate you are one broker failure away from data loss; alert with the highest urgency

---

### Case 78 — The Producer Metric That Hid a Serialization Problem

- **Situation:** Producer sending Avro messages — `record-send-rate` healthy — no errors visible
- **Problem:** Consumer failing to deserialize messages — but producer metrics showed no errors
- **Root cause:** Producer successfully sent valid byte arrays — the serialization bug (wrong schema version) was application-level — Kafka metrics only measure Kafka-level delivery success
- **Solution:** Monitor at multiple levels: Kafka metrics + application serialization metrics + consumer deserialization error count + Schema Registry API error rate
- **Lesson:** Kafka metrics measure Kafka-level delivery — cannot detect application-level serialization bugs; instrument serialization success/failure rates separately

---

### Case 79 — The `predict_linear()` That Prevented a Disk Crisis

- **Situation:** Kafka broker with 2TB disk — good monitoring practice
- **Implementation:**

```promql
predict_linear(kafka_log_log_size[6h], 48*3600) > disk_total_bytes
```

Alert fired — disk predicted to fill in 36 hours — team had time to identify the fast-growing topic, set appropriate retention, free disk space within 24 hours.

- **Result:** Prevented what would have been a broker crash and cluster outage
- **Lesson:** `predict_linear()` on disk usage gives advance warning before a crisis — alert when disk predicted to fill within 48 hours — always enough time to take action

---

### Case 80 — The Consumer Lag Alert That Fired Too Late

- **Situation:** Payment processing pipeline — SLA: payments processed within 10 seconds
- **Problem:** Consumer bug caused processing to slow — lag grew from 0 to 500,000 messages over 2 hours — by the time operations noticed, payments delayed 35 minutes — SLA violation
- **Root cause:** Consumer lag alert set at 1,000,000 messages (too late) and checked every 5 minutes (too infrequent)
- **Solution:** Multi-tier lag alerting:
  - **Warning:** lag > 1,000 for 2 consecutive minutes
  - **Critical:** lag > 10,000 (page immediately)
  - **Rate of change:** if growing at > 100 messages/second for 30 seconds
- **Result:** Next consumer slowdown detected in 3 minutes — operators notified before SLA breach
- **Lesson:** Consumer lag alerting must be proportional to your SLA — a payment system needs alerts at small lag values; alert on rate of change, not just absolute lag

---

## Part 12 — franz-go (Go Kafka Client) Specific Cases

### Case 81 — The franz-go Consumer That Did Not Handle Rebalances

- **Situation:** Go Kafka consumer using franz-go — consumer group with multiple instances
- **Problem:** After rebalance, some messages processed twice — duplicate records in database
- **Root cause:** Auto-commit in franz-go commits on an interval — rebalance between processing and auto-commit caused redelivery to the new owner
- **Solution:**

```go
client, _ := kgo.NewClient(
    kgo.DisableAutoCommit(),
    kgo.OnPartitionsRevoked(func(ctx context.Context, client *kgo.Client, revoked map[string][]int32) {
        client.CommitUncommittedOffsets(ctx) // commit before partitions revoked
    }),
)

for {
    fetches := client.PollFetches(ctx)
    fetches.EachRecord(func(r *kgo.Record) {
        if err := process(r); err != nil {
            sendToDLQ(r, err)
        }
        client.MarkCommitRecords(r)
    })
    client.CommitUncommittedOffsets(ctx)
}
```

- **Result:** Zero duplicate processing during rebalances
- **Lesson:** In franz-go, `OnPartitionsRevoked` is the hook to commit offsets before losing partition ownership — the key to at-least-once processing correctness with manual commits

---

### Case 82 — The franz-go Producer That Exhausted Record Buffers

- **Situation:** Go producer using franz-go — high-throughput event streaming
- **Problem:** Under spike traffic, produce calls began blocking — service latency spiked — `context deadline exceeded`
- **Root cause:** `MaxBufferedRecords=1000` (default) — under 50,000 records/second spike: buffer fills in 20ms — produce calls block
- **Solution:**

```go
client, _ := kgo.NewClient(
    kgo.MaxBufferedRecords(100_000),
    kgo.MaxBufferedBytes(100<<20),           // 100MB byte limit as safety
    kgo.RecordDeliveryTimeout(30*time.Second),
    kgo.ProducerLinger(5*time.Millisecond),
)
```

- **Result:** Buffer handles 10× spike traffic — no blocking during normal traffic spikes
- **Lesson:** `MaxBufferedRecords` in franz-go controls producer backpressure — set based on maximum acceptable in-flight messages; combine with `MaxBufferedBytes` to prevent memory exhaustion

---

### Case 83 — The franz-go GroupTransactSession Misuse

- **Situation:** Exactly-once consume-process-produce pipeline in Go using franz-go
- **Problem:** Despite using `GroupTransactSession`, duplicates still appeared in output topic
- **Root cause:**

```go
sess := client.GroupTransactSession()
fetches.EachRecord(func(r *kgo.Record) {
    result := transform(r)
    producer.ProduceSync(ctx, result, nil) // BUG: separate producer outside transaction
})
```

`GroupTransactSession` manages a transactional producer internally — calling separate `producer.ProduceSync()` bypasses the transaction.

- **Solution:**

```go
sess := client.GroupTransactSession()
fetches.EachRecord(func(r *kgo.Record) {
    result := transform(r)
    sess.TryProduce(ctx, result, nil) // use sess, not separate producer
})
committed, err := sess.End(true) // atomically commit consumption + production
```

- **Result:** All production through transactional session — exactly-once guaranteed
- **Lesson:** `GroupTransactSession` in franz-go manages both consumption and production in one transaction — all `Produce` calls must go through `sess.TryProduce()`, never a separate producer instance

---

### Case 84 — The franz-go Static Group Member for Kubernetes

- **Situation:** Kubernetes-hosted consumer group — 20 pods, each a consumer
- **Problem:** Rolling deployments took 45 minutes — each pod restart triggered a full rebalance
- **Root cause:** Default dynamic group membership — every pod restart = leave group → rebalance → rejoin → rebalance again
- **Solution:**

```go
client, _ := kgo.NewClient(
    kgo.ConsumerGroup("order-processor"),
    kgo.InstanceID("consumer-pod-"+podName), // static group membership
)
```

Static member that disconnects is not immediately considered "left" — broker waits `session.timeout.ms` before rebalancing — new pod rejoins with same ID and reclaims partitions.

- **Result:** Rolling deployment time 45 minutes → 4 minutes
- **Lesson:** Static group membership is mandatory for Kubernetes consumer deployments with rolling restarts — without it, every deployment is a rebalance storm

---

## Master Summary Table — All 85 Cases

| Case | Title | Part | Key Lesson |
|:----:|-------|:----:|------------|
| 00 | Silent message drop with acks=0 | 01 | Never use acks=0; use acks=all + idempotence |
| 01 | Producer OOM from blocked buffer | 01 | max.block.ms should fail fast, not block forever |
| 02 | Duplicate messages from retry | 01 | enable.idempotence=true always |
| 03 | Large message blocked entire topic | 01 | Kafka is not for large payloads; use claim-check |
| 04 | Zombie transaction stalled consumers | 01 | Short transaction.timeout.ms; always abort on crash |
| 05 | Small batch.size throttled throughput | 01 | linger.ms + large batch.size for throughput |
| 06 | Delivery callback never checked | 01 | Always consume delivery reports; never pass nil channel |
| 07 | Wrong serialization format poisoned topic | 01 | Serialization format is a topic contract |
| 08 | New producer per request = 30,000 connections | 01 | One producer at startup, shared across all goroutines |
| 09 | Transactional ID reuse after crash | 01 | InitTransactions() mandatory; unique ID per instance |
| 10 | Consumer lag never recovered | 02 | Consumer throughput must exceed producer + catch-up |
| 11 | Rebalance storm halted processing | 02 | CooperativeStickyAssignor for large consumer groups |
| 12 | Auto-commit before processing = data loss | 02 | enable.auto.commit=false; commit after processing |
| 13 | Poison pill stopped entire partition | 02 | Dead Letter Queue for every consumer |
| 14 | Consumer group reprocessed 30 days | 02 | Long retention + idempotent consumers; document reset |
| 15 | Consumer timed out during processing | 02 | max.poll.interval.ms > worst-case processing time |
| 16 | Same message processed 10,000× | 02 | Idempotent consumers are mandatory, not optional |
| 17 | Slow consumer lost messages to retention | 02 | Retention must exceed max acceptable consumer lag |
| 18 | New group name caused 6 months reprocess | 02 | Consumer group rename = explicit offset reset required |
| 19 | 30s auto-commit caused duplicate notifications | 02 | Reduce auto-commit interval or use manual commit |
| 20 | Ghost consumer groups polluted monitoring | 02 | Lifecycle policy for consumer groups; delete abandoned |
| 21 | Committed offset lag hid real delay | 02 | Measure end-to-end latency, not just offset lag |
| 22 | Seek-based retry caused infinite loop | 02 | Bound retries; always route to DLQ after max retries |
| 23 | Under-replicated partitions caused data loss | 03 | min.insync.replicas=RF-1; acks=all |
| 24 | Unclean leader election corrupted topic | 03 | unclean.leader.election=false for critical topics |
| 25 | Partition count couldn't scale down | 03 | Partitions are permanent; plan for max parallelism |
| 26 | Log compaction failure filled disk | 03 | Monitor log cleaner thread and dirty ratio |
| 27 | Controller bottleneck at 500 topics | 03 | Reduce partition count; migrate to KRaft |
| 28 | Cluster split-brain across 2 DCs | 03 | Never split quorum evenly; use 3rd DC tiebreaker |
| 29 | Replication slot disk fill | 03 | Monitor slot lag aggressively; set max_slot_wal_keep_size |
| 30 | Hot partition from skewed key | 04 | Analyze key cardinality before choosing partition key |
| 31 | Single partition couldn't scale | 04 | One partition = one consumer = no parallelism |
| 32 | Too many partitions caused latency | 04 | More partitions has real overhead; don't over-partition |
| 33 | Ordering violation from multiple producers | 04 | Multiple producers on same key don't guarantee order |
| 34 | Int vs String key broke ordering | 04 | Enforce key serialization contract for all producers |
| 35 | Compacted topic queried like a database | 04 | Compacted topic + Redis serving layer |
| 36 | No compression saturated network | 05 | lz4 compression is almost always worth enabling |
| 37 | Default batch.size throttled small messages | 05 | Large batch.size + linger.ms for small-message throughput |
| 38 | 1 consumer on 32 partitions | 05 | Consumer count must match partition count |
| 39 | JSON serialization bottleneck | 05 | Avro/Protobuf for high-throughput pipelines |
| 40 | Default fetch.min.bytes limited replay | 05 | Tune fetch sizes for replay and catch-up workloads |
| 41 | Delete policy stored full history needlessly | 05 | Compact policy for state topics |
| 42 | Random replica placement caused cross-DC cost | 05 | broker.rack for cost and availability |
| 43 | Long retention required expensive broker disk | 05 | Tiered storage for retention beyond 7 days |
| 44 | LinkedIn origin — log aggregation | 06 | Kafka's canonical use case |
| 45 | Uber surge pricing via Kafka+Flink | 06 | Partition by aggregation unit (zone_id) |
| 46 | Netflix 700B events/day | 06 | Regional clusters + central aggregation |
| 47 | Airbnb N×M pipeline problem | 06 | Kafka hub eliminates N×M to N+M |
| 48 | Robinhood exactly-once orders | 06 | Transactions + idempotent DB writes for EOS |
| 49 | Walmart real-time inventory | 06 | Composite partition key for stateful aggregation |
| 50 | Stripe payment event bus | 06 | Financial Kafka: over-engineer for correctness |
| 51 | Discord presence at scale | 06 | KTables for stateful stream-table joins |
| 52 | Pinterest 800B messages/day | 06 | Custom tooling mandatory at 500+ brokers |
| 53 | Stateful streams OOM | 07 | Configure window retention; RocksDB is disk-backed |
| 54 | KTable stall at startup | 07 | Standby replicas reduce KTable restore time |
| 55 | EOS caused 84% throughput drop | 07 | Exactly-once has cost; tune commit.interval.ms |
| 56 | Stream-stream join produced no output | 07 | Use KTable for reference data; stream for time-correlated |
| 57 | Wrong counts after changelog restore | 07 | Health check blocks traffic until state=RUNNING |
| 58 | Window emitted partial results | 07 | suppress() to emit only final window results |
| 59 | RocksDB grew without bound | 07 | Set maximum session duration; monitor state store size |
| 60 | MirrorMaker 1 lost messages on failover | 08 | Use MM2; monitor replication lag as RPO |
| 61 | Offset mismatch after cross-region failover | 08 | MM2 offset sync is mandatory for correct failover |
| 62 | Active-active created message cycles | 08 | Topic exclusion patterns prevent MM2 cycles |
| 63 | Geo-replication latency violated SLA | 08 | Increase fetch batch size to reduce cross-region RTTs |
| 64 | JDBC connector did full table scans | 09 | Use incrementing mode, never bulk mode in production |
| 65 | Sink connector silently dropped messages | 09 | errors.tolerance=none + DLQ for all sinks |
| 66 | Debezium missed schema changes | 09 | Configure schema refresh mode |
| 67 | Debezium missed deletes | 09 | REPLICA IDENTITY FULL; handle tombstones in sinks |
| 68 | Connect worker OOM from one connector | 09 | Monitor worker heap; isolate high-memory connectors |
| 69 | SMT chain transformed data incorrectly | 09 | Test SMT chains; log intermediate state |
| 70 | Kafka exposed to public internet | 10 | Never expose Kafka publicly; VPC-only + authentication |
| 71 | Super user credentials used in app code | 10 | Super users for break-glass only; minimal ACLs |
| 72 | TLS certificate expired during peak | 10 | Monitor cert expiry 90/30/7 days; automate rotation |
| 73 | Simultaneous SASL rotation broke everything | 10 | Rolling credential rotation with transition overlap |
| 74 | ACL granted read on __consumer_offsets | 10 | Never grant external access to internal Kafka topics |
| 75 | Kerberos ticket expired mid-job | 10 | Configure auto-renewal for long-running jobs |
| 76 | Lag alert fired for dead consumer groups | 11 | Alert: lag>N AND members>0 |
| 77 | ISR shrinkage not alerted | 11 | Under-replicated partitions: highest urgency alert |
| 78 | Producer metrics hid serialization bug | 11 | Instrument serialization errors separately |
| 79 | predict_linear() prevented disk crisis | 11 | predict_linear() for 48-hour early warning |
| 80 | Lag alert fired too late for payment SLA | 11 | Alert on lag rate of change, not just absolute lag |
| 81 | franz-go rebalance caused duplicates | 12 | OnPartitionsRevoked: commit before partitions revoked |
| 82 | franz-go buffer too small for spike | 12 | MaxBufferedRecords sized for peak, not average |
| 83 | GroupTransactSession mixed with separate producer | 12 | All produces must go through sess.TryProduce() for EOS |
| 84 | franz-go no static group membership in K8s | 12 | InstanceID() eliminates deploy rebalances |

---

## The Ten Commandments of Kafka Production

*Distilled from all 85 case studies:*

1. **`acks=all` + `enable.idempotence=true` + `min.insync.replicas=2`** — correctness is non-negotiable
2. **Dead Letter Queue on every consumer** — one bad message must never stop an entire partition
3. **`CooperativeStickyAssignor`** for any consumer group larger than 3 consumers
4. **Monitor consumer group member count AND lag AND output throughput** — lag alone is insufficient
5. **Kafka exactly-once is Kafka-to-Kafka only** — external systems need idempotent writes
6. **Partition key selection is the most consequential and irreversible Kafka design decision**
7. **Under-replicated partitions are the most critical health signal** — page immediately
8. **One Kafka producer per service at startup, shared across all goroutines** — never per request
9. **Consumer group renames are destructive** — always follow with an explicit offset reset
10. **In franz-go: `OnPartitionsRevoked` must commit offsets** — it is the rebalance safety valve

---

*Total: 85 Kafka case studies across 12 parts.*
