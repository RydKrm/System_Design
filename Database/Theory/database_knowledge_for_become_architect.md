# Database Knowledge for Software Architects

> Everything a software architect must know about databases —
> not just how to use them, but how to evaluate, decide, govern,
> and lead database strategy across an entire organization and system landscape.

---

## The Architect's Lens

An engineer asks: *"How do I make this query faster?"*

An architect asks: *"Should this query exist at all, and is this the right database for this data?"*

The architect's database knowledge operates at four levels simultaneously:

- **Strategic** — Which databases do we use and why?
- **Structural** — How do our systems connect through data?
- **Operational** — How do we keep this running safely at scale?
- **Evolutionary** — How do we change it without breaking everything?

---

## Part 1 — Database Selection and Evaluation

### 1.1 The Database Selection Framework

- Mapping workload types to database categories — OLTP, OLAP, HTAP, search, graph, time-series, stream
- Defining non-negotiable requirements before evaluating any product
- Consistency model required (strong, eventual, causal)
- Availability SLA (99.9%, 99.99%, 99.999%)
- Durability guarantee (RPO — acceptable data loss window)
- Recovery target (RTO — acceptable downtime window)
- Data volume now and in 3 years
- Read/write ratio and request rate
- Query patterns — point lookups, range scans, aggregations, full-text, graph traversal
- Geographic distribution requirements — single region, multi-region, global
- Compliance requirements — data residency, GDPR, SOC2, HIPAA, PCI-DSS
- Evaluating databases on correctness first, performance second
- TCO (Total Cost of Ownership) — license, hosting, operations, team learning curve
- Vendor lock-in risk assessment — open-source vs proprietary, migration path exists?
- Community maturity, documentation quality, enterprise support availability
- Operational complexity — who will run this in production?

### 1.2 Database Category Mastery

- **Relational (OLTP)** — PostgreSQL, MySQL, SQL Server, Oracle — when relational wins
- **Distributed SQL** — CockroachDB, YugabyteDB, Spanner, PlanetScale — when horizontal SQL is needed
- **Document** — MongoDB, DynamoDB, Firestore, Couchbase — when schema flexibility wins
- **Key-Value** — Redis, DynamoDB, etcd, Memcached — cache, session, config, coordination
- **Column-Family** — Cassandra, ScyllaDB, HBase — write-heavy, time-series, wide-row
- **Time-Series** — InfluxDB, TimescaleDB, Prometheus, QuestDB — metrics and events
- **Search** — Elasticsearch, OpenSearch, Typesense, Meilisearch — when you need ranked search
- **Graph** — Neo4j, Amazon Neptune, DGraph, TigerGraph — when relationships are the query
- **OLAP / Data Warehouse** — ClickHouse, BigQuery, Snowflake, Redshift, DuckDB — analytics at scale
- **Streaming** — Apache Kafka, Pulsar, Kinesis — durable, ordered event logs
- **Object Storage** — S3, GCS, Azure Blob — not a DB, but part of every data architecture
- **NewSQL** — TiDB, CockroachDB — HTAP, ACID at scale
- Understanding when a single database covers multiple needs vs when polyglot persistence is required

### 1.3 Build vs Buy vs Managed

- Self-hosted open-source — full control, full operational burden
- Managed cloud service (RDS, Cloud SQL, Atlas, Aiven) — reduced ops, vendor dependency
- Serverless database (Neon, PlanetScale, Turso) — zero ops, cold start risk, cost model change
- The architect's trade-off matrix: control vs cost vs operational burden vs scalability ceiling
- When managed services are not acceptable (regulated industries, data sovereignty)
- Evaluating managed vs self-hosted for each database in the stack separately

### 1.4 Evaluating a New Database Before Adopting

- Proof of Concept (PoC) criteria — what must it prove before we commit?
- Benchmarking under realistic load — not vendor benchmarks, your own workload
- Failure mode testing — what happens when a node dies, disk fills, network partitions?
- Operational runbook exists before adoption — day 2 operations plan
- Team skill gap assessment — who knows this technology, what is the learning cost?
- Escape hatch planning — if this fails, how do we get our data out?
- The "regret minimization" test — what is the cost of choosing wrong?

---

## Part 2 — Architectural Patterns and Data Strategy

### 2.1 Data Architecture Patterns

- Monolithic database — one DB for everything — when it is correct and when it becomes a problem
- Database per service — microservices data isolation — independence vs cross-service query complexity
- Shared database — multiple services sharing one DB — coupling, convenience, and the trade-off
- CQRS — Command Query Responsibility Segregation — separating write model from read model
- Event sourcing — storing events, not state — immutability and time travel as first-class features
- Outbox pattern — atomically publishing events with DB writes
- Saga pattern — long-running distributed transactions without 2PC
- API composition — assembling data from multiple service databases at the API layer
- Backends for Frontends (BFF) — per-client read model aggregation

### 2.2 Polyglot Persistence Architecture

- Mapping each domain's data to its natural storage type
- Defining ownership boundaries — one service, one database, one team
- Data synchronization strategies between stores — CDC, dual-write, event-driven
- Consistency guarantees across polyglot boundaries — what is possible, what is not
- Operational complexity of running 5+ different database technologies
- When polyglot is premature — start simple, split when proven necessary
- The polyglot persistence organization — who owns each database?

### 2.3 Domain-Driven Design and Database Architecture

- Bounded context mapping — how service boundaries map to database boundaries
- Aggregate design — consistency boundary = transaction boundary = schema boundary
- Shared kernel vs anti-corruption layer at the data level
- Context maps and their database implications — customer-supplier, conformist, partnership
- Strategic DDD — which bounded contexts get their own database?
- Tactical DDD in the schema — aggregate tables, entity tables, value object columns
- Domain events as the integration contract between bounded contexts

### 2.4 Data Mesh Architecture

- The data mesh principles — domain ownership, data as a product, self-serve infrastructure, federated governance
- Each domain team owns their own analytical data product
- Data contracts — versioned, schema-enforced interfaces between domains
- Data product catalog — discoverability of datasets across the organization
- Federated computational governance — org-wide standards, team-level autonomy
- How data mesh changes the architect's role — platform enablement vs central control
- Data mesh vs data lake vs data warehouse — when each makes sense

### 2.5 Lambda and Kappa Architecture (Stream Processing)

- Lambda architecture — batch layer + speed layer + serving layer
- Kappa architecture — single streaming layer replaces both batch and speed
- Where the database fits — serving layer is always a database, what kind?
- Materialized views as the output of a stream processing pipeline
- Stream-table duality — a table is a stream at a point in time, a stream is a table changelog
- When Lambda is over-engineered — most systems do not need it
- Kappa with Kafka Streams or Flink — real-time aggregation into a serving store

### 2.6 Read Model and Write Model Separation

- Why write models and read models have fundamentally different requirements
- Write model: normalized, transactionally correct, consistency-optimized
- Read model: denormalized, query-optimized, eventual consistency acceptable
- Synchronizing write to read model — synchronous (transactional), asynchronous (CDC/event)
- Projection rebuilding strategy — when the read model needs to be rebuilt from scratch
- Multiple read models from one write model — each consumer gets the shape it needs
- Versioned projections — running v1 and v2 simultaneously during migration

---

## Part 3 — Data Modeling Decisions at the Architectural Level

### 3.1 Schema Ownership and Governance

- Who owns the schema? — the team that owns the data, not a central DBA team
- Schema as code — migration files in version control, reviewed like application code
- Schema review process — who approves schema changes? criteria for approval?
- Schema conventions — naming standards, data type standards, column conventions (created_at, updated_at, deleted_at, version)
- Deprecation process — how do you retire a column or table safely across all consumers?
- Schema documentation standards — data dictionary, ER diagram, ADRs for key decisions
- Schema registry for events — Confluent Schema Registry, AWS Glue, Protobuf definitions

### 3.2 The Canonical Data Model

- What is a canonical data model — the shared definition of core entities across systems
- Customer master data — what is a "customer" and who owns the authoritative definition?
- Master Data Management (MDM) — resolving conflicts between systems about the same entity
- Golden record — the single authoritative version of a business entity
- Data lineage — knowing where every field came from and how it was transformed
- When to enforce a canonical model vs when to let each system own its own model
- The integration data model vs the operational data model — they are different

### 3.3 Data Contracts Between Services

- What a data contract is — schema + semantics + SLA for data produced by one service, consumed by another
- Schema evolution rules — backward compatibility, forward compatibility, full compatibility
- Breaking vs non-breaking changes — what each service can and cannot do unilaterally
- Consumer-Driven Contract Testing — consumers define what they need, producers verify they provide it
- Pact framework for contract testing
- Event schema versioning — how to evolve event schemas without breaking consumers
- The architect's role in data contract governance

### 3.4 Normalization vs Denormalization Decisions

- The architect's decision framework: normalize for writes, denormalize for reads
- When denormalization is a schema decision vs a caching decision vs a materialized view decision
- The cost of normalization at scale — JOIN performance under billions of rows
- The cost of denormalization — write amplification, consistency complexity
- JSON/JSONB columns as controlled denormalization — flexible schema within a typed row
- When to pre-compute vs when to compute at query time — a function of read frequency and write cost
- Snapshot columns — storing point-in-time copies of related data (price at time of order)

---

## Part 4 — Scalability Architecture Decisions

### 4.1 The Scaling Decision Framework

- Identifying the actual bottleneck before scaling — is it the DB, the network, the application, or the query?
- Vertical scaling ceiling — when you have hit the biggest machine available
- Read scaling — replication, caching, read replicas, CDN for static data
- Write scaling — sharding, partitioning, CQRS, queue-based write buffering
- The AKF Scale Cube — X (clone), Y (decompose by function), Z (partition by data)
- Scaling the database vs scaling the application — they require different approaches
- When NOT to scale the database — fix the query first; add an index; add a cache

### 4.2 Sharding Architecture Decisions

- Sharding strategy selection — range, hash, directory, geographic — and the trade-offs
- Shard key selection criteria — cardinality, query alignment, immutability, write distribution
- Shard count strategy — over-shard at the start to avoid painful resharding later
- Virtual shards / logical shards — remapping without data movement
- Routing layer design — application-level routing vs middleware (Vitess, Citus, ProxySQL)
- Cross-shard query patterns — when they are acceptable and when they must be eliminated by design
- Shard rebalancing strategy — consistent hashing vs directory-based
- The architect's decision: shard now vs shard later — cost of each choice

### 4.3 Caching Architecture Decisions

- Cache tier placement — in-process (L1), distributed cache (L2), database (L3)
- Cache invalidation strategy — the hardest problem and the architect's responsibility to solve it
- Cache consistency model — TTL-based (simple, stale risk) vs event-driven (complex, consistent)
- What to cache and what never to cache — an architectural policy decision
- Cache topology — single node, Sentinel (HA), Cluster (horizontal scale)
- Cache failure mode — what happens when Redis is down? degrade gracefully or fail hard?
- Cache penetration, avalanche, stampede — architectural mitigations for each
- CDN as a database cache for read-heavy static or semi-static data

### 4.4 Connection Architecture

- Connection pooling topology — where does the pool live? application-side vs proxy-side (PgBouncer)
- PgBouncer modes — session, transaction, statement — and which is correct for your workload
- Connection count budget — how many connections can the DB handle, how many does each service need?
- Serverless connection problem — Lambda / Cloud Run connections cannot pool traditionally → use RDS Proxy, pgBouncer, or Neon's serverless driver
- Service mesh and sidecar — can the mesh manage DB connection pooling?
- Connection overhead at scale — each PostgreSQL connection costs 5–10MB RAM

### 4.5 Multi-Region Data Architecture

- Active-passive vs active-active — the fundamental multi-region choice
- What data can be eventually consistent across regions and what cannot
- Write routing — all writes to one region (active-passive) vs any region (active-active)
- Read routing — route to nearest region, consistency implications
- Data residency requirements — GDPR, country-specific data laws
- Global vs regional vs local data — three tiers in a multi-region schema
- Conflict resolution policy for active-active — LWW, CRDT, custom merge, avoid conflict by design
- Latency implications of synchronous cross-region writes — speed of light is not negotiable

---

## Part 5 — Distributed Systems Foundations for Architects

### 5.1 Consistency Models — Architect-Level Decision Making

- Strong consistency — linearizability — the gold standard and its cost
- Sequential consistency — preserves order within a process
- Causal consistency — causes precede effects across processes
- Eventual consistency — all replicas converge, time window is unspecified
- Read-your-writes, monotonic reads, monotonic writes — session-level guarantees
- Mapping business requirements to consistency models — not all data needs the same level
- The consistency budget — which domains get strong, which get eventual, and why

### 5.2 Consensus and Coordination

- Raft consensus — the algorithm powering CockroachDB, etcd, TiKV, Consul
- Paxos — the theoretical foundation; Multi-Paxos in practice
- Quorum — W + R > N for strong consistency in a replicated system
- Leader election and its failure modes — split-brain, stale leader, fencing tokens
- Distributed locks — when you need them, when they are wrong (Redlock controversy)
- etcd and ZooKeeper as coordination primitives — use cases, limitations, operational burden
- The architect's rule: avoid distributed coordination wherever possible — it is expensive and fragile

### 5.3 The CAP and PACELC Theorem Applied

- Making real technology choices with CAP — not "which two do you pick" but "what is your partition strategy?"
- PACELC — Partition: Availability vs Consistency. Else: Latency vs Consistency — a more useful model
- Categorizing every database in your stack by its CAP/PACELC position
- What "AP" means in practice — what can go wrong, what the user sees
- What "CP" means in practice — when the system becomes unavailable during partition
- Building a CP system from AP components — how to layer stronger guarantees on top

### 5.4 Clock and Time in Distributed Systems

- Why wall clocks cannot be trusted in distributed systems — NTP drift, leap seconds
- Logical clocks — Lamport timestamps, vector clocks — ordering events without wall time
- Hybrid Logical Clocks (HLC) — combining physical and logical time
- TrueTime (Google Spanner) — GPS + atomic clocks + uncertainty bounds
- The architect's rule: never use wall clock time for ordering events across services
- Using monotonically increasing sequence numbers from the DB as ordering primitives

### 5.5 Failure Modes and Fault Tolerance

- The eight fallacies of distributed computing — every architect must know these
- Partial failure — the most common distributed system problem
- Network partition handling — what does each service do when it cannot reach the DB?
- Timeouts — every DB call must have a timeout; what happens when it fires?
- Retry strategies — exponential backoff, jitter, idempotency requirement
- Circuit breaker pattern — preventing cascade failure from a slow or unavailable DB
- Bulkhead pattern — isolating DB connection pools per service to prevent starvation
- Fallback strategies — serve stale data, serve defaults, gracefully degrade

---

## Part 6 — Data Pipeline and Analytics Architecture

### 6.1 OLTP vs OLAP Separation

- Why you cannot run analytics on your production OLTP database
- Read replicas for analytics — the first step, works for moderate analytical load
- The ETL pipeline — Extract from OLTP, Transform, Load into a warehouse
- The ELT pipeline — Extract, Load raw, Transform in the warehouse (modern approach)
- CDC-based streaming pipeline — near-real-time OLAP without ETL batch jobs
- Lambda architecture — batch + streaming — when to use and when it is over-engineering
- Kappa architecture — streaming only — simpler when batch is not needed

### 6.2 Data Warehouse Architecture

- Star schema — fact tables + dimension tables — the fundamental OLAP schema pattern
- Snowflake schema — normalized dimensions — trade-off vs star schema
- Slowly Changing Dimensions (SCD) — Type 1 (overwrite), Type 2 (new row), Type 3 (old/new column)
- Fact table design — granularity decisions, additive vs semi-additive vs non-additive facts
- Columnar storage — why column stores are orders of magnitude faster for analytics
- Data warehouse products — BigQuery, Snowflake, Redshift, ClickHouse — positioning and trade-offs
- Data lakehouse — combining data lake flexibility with warehouse query performance (Delta Lake, Iceberg, Hudi)

### 6.3 The Modern Data Stack

- Ingestion — Fivetran, Airbyte, Debezium, Kafka Connect
- Storage — S3/GCS as the universal layer, Parquet/ORC as columnar formats
- Compute — dbt for SQL-based transformation, Spark for large-scale ETL
- Serving — data warehouse (BigQuery, Snowflake) or OLAP engine (ClickHouse, Druid)
- Orchestration — Airflow, Dagster, Prefect
- Metrics layer — dbt Metrics, Cube, LookML
- The architect's role — designing the pipeline, defining ownership, ensuring data quality

### 6.4 Data Governance and Quality

- Data quality dimensions — accuracy, completeness, consistency, timeliness, uniqueness, validity
- Data lineage — tracking the origin and transformation of every field
- Data catalog — discoverability of datasets, documentation, ownership
- Data quality monitoring — Great Expectations, dbt tests, custom assertions
- Schema registry — enforcing schema compatibility for events and pipelines
- Data retention policies — what data to keep, for how long, where
- The right to erasure (GDPR) in a data pipeline — deletion is hard when data is copied everywhere

---

## Part 7 — Security Architecture

### 7.1 Defense in Depth for Databases

- Network isolation — databases never exposed to the public internet, VPC-only
- Bastion host / jump server — the only path to the DB from outside
- mTLS for service-to-DB connections — mutual authentication
- Secrets management — HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager — never hardcoded credentials
- Dynamic secrets — Vault generates a new DB credential per service instance, short-lived
- Credential rotation — rotating DB passwords without downtime
- Audit logging — every DDL and high-privilege DML operation logged
- Database activity monitoring (DAM) — real-time alerting on anomalous queries

### 7.2 Data Classification and Access Control

- Data classification policy — public, internal, confidential, restricted, top secret
- Mapping classification levels to access controls, encryption requirements, retention policies
- Principle of least privilege — each service gets exactly the permissions it needs and nothing more
- Service accounts — one DB user per service, not shared credentials
- Role-based access control (RBAC) — roles not individual grants
- Row-level security (RLS) — enforced in the DB, not the application (trust the enforcer closest to the data)
- Column-level security — masking or restricting access to PII columns per role
- Break-glass access — emergency admin access with automatic audit notification

### 7.3 Encryption Architecture

- Encryption in transit — TLS 1.2 minimum, TLS 1.3 preferred for all DB connections
- Encryption at rest — disk-level (LUKS, cloud-native), tablespace-level, or column-level
- Column-level encryption for PII — encrypt before insert, decrypt on read
- Envelope encryption — data encryption keys (DEK) encrypted by a key encryption key (KEK)
- Key management system — HSM (Hardware Security Module) for KEK, KMS for DEK
- Key rotation without re-encrypting all data — the envelope encryption advantage
- Tokenization vs encryption — replacing PII with a non-sensitive token for low-trust environments

### 7.4 Compliance and Regulatory Architecture

- GDPR — data minimization, right of access, right to erasure, consent tracking, breach notification
- HIPAA — PHI isolation, audit logging, encryption, business associate agreements for managed services
- PCI-DSS — cardholder data environment (CDE) isolation, tokenization, audit trails
- SOC 2 — availability, security, confidentiality controls for databases
- Data sovereignty — data must not leave a specific geographic region — affects multi-region design
- Compliance as an architectural constraint — designing for compliance from day one vs retrofitting

---

## Part 8 — Operational Architecture

### 8.1 High Availability Architecture

- HA tiers — 99.9% (8.7h/yr downtime), 99.99% (52m/yr), 99.999% (5m/yr) — cost of each
- Single-node failure protection — primary + synchronous replica + automatic failover
- Data center failure protection — multi-AZ deployment
- Region failure protection — multi-region active-passive or active-active
- Failure domain isolation — do not put primary and replica in the same rack/AZ/region
- Failover time budget — how long does failover take? Does it meet your RTO?
- Testing HA — regular chaos engineering, scheduled failover drills
- Designing applications for failover — connection retry logic, read/write split awareness

### 8.2 Disaster Recovery Architecture

- RPO definition — how much data loss is acceptable? defines backup frequency and replication type
- RTO definition — how fast must you recover? defines failover automation and runbook complexity
- Backup strategy — logical + physical + continuous WAL archiving — each covers different failure modes
- Multi-region backup storage — backups stored in a different region than primary data
- Backup encryption — backups must be as secure as the live data
- Backup verification — automated restore tests in CI/CD — if you do not test restores, you do not have backups
- Runbooks — documented, tested, step-by-step recovery procedures per disaster scenario
- DR drills — scheduled practice of actual recovery procedures under realistic pressure

### 8.3 Observability Architecture for Databases

- The three pillars — metrics, logs, traces — applied to the database layer
- Key database metrics — TPS, QPS, latency percentiles (p50/p95/p99/p999), cache hit ratio, replication lag, lock wait time, connection saturation, bloat ratio
- Alerting thresholds — what to page on vs what to log for later review
- Slow query log — capturing and analyzing queries above a threshold
- pg_stat_statements / Performance Schema — aggregate query statistics
- Distributed tracing — correlating an API request to the DB queries it generated (OpenTelemetry)
- Database dashboards — Grafana + postgres_exporter / mysqld_exporter
- Anomaly detection — alerting when query patterns change (plan regression, new slow queries)
- Capacity forecasting — projecting when current DB will hit its limits

### 8.4 Schema Migration Operations

- Migration as a production deployment — same rigor as code: review, test, rollback plan
- Online vs offline migrations — always prefer online for tables > 10M rows
- Online migration tools — pg_repack, pgd-online-schema-change, gh-ost, pt-osc
- Migration sequencing with code deploys — schema changes and code changes must be decoupled
- The expand-contract pattern — the safe way to rename, change types, or restructure
- Blue-green schema migration — run two schema versions simultaneously during migration
- Migration testing — test every migration on a production-size data clone before running in prod
- Rollback plan for every migration — what is the undo operation if something goes wrong?

### 8.5 Database DevOps and CI/CD

- Schema migrations in the CI/CD pipeline — migrations run before code deploys
- Database branching — Neon, PlanetScale branching, or schema-per-PR patterns
- Test database strategy — separate DB per developer, per CI run, or shared with data isolation
- Synthetic test data generation — realistic volume without PII
- Production data cloning — anonymized production data for staging environments
- Database linting — SQLFluff, Squawk, pganalyze for catching schema anti-patterns before merge
- Query review gates — EXPLAIN ANALYZE checks for new queries in CI

---

## Part 9 — Cost Architecture

### 9.1 Database Cost Drivers

- Compute — CPU and RAM for the DB instance
- Storage — disk size × replication factor × backup retention
- I/O — IOPS-based pricing (EBS, cloud databases) — the hidden cost driver
- Data transfer — egress costs for data leaving the region or cloud
- License cost — Oracle, SQL Server enterprise — can dominate everything else
- Operational cost — DBA time, on-call burden, tooling
- Cloud database pricing models — instance-based (RDS), serverless (Aurora Serverless, Neon), DTU-based (Azure)

### 9.2 Cost Optimization at Architecture Level

- Right-sizing — not over-provisioning for peak when average load is 20% of peak
- Reserved instances vs on-demand — commit to 1–3 years for 40–60% discount
- Read replica vs caching — a Redis cache at $50/month vs a read replica at $500/month
- Tiered storage — hot data on SSD, warm data on HDD, cold data on S3/Glacier
- Data lifecycle management — automatically moving old data to cheaper storage
- Query cost optimization — a 10× faster query uses 10× less compute
- Compression — columnar compression in ClickHouse/BigQuery can reduce storage 10×
- Archive tables — moving historical data to cold storage before it inflates backup costs

### 9.3 Cost Monitoring and Chargeback

- Per-service database cost attribution — which service is responsible for which DB cost?
- Query cost attribution — which team's queries are using the most resources?
- Cost anomaly alerting — detect sudden spikes in DB costs before the bill arrives
- Database cost forecasting — projecting DB costs 6–12 months ahead based on growth

---

## Part 10 — Architecture Decision Records for Databases

### 10.1 The Database ADR Framework

Every significant database decision should have an ADR with:

- **Context** — what is the problem, what are the constraints?
- **Decision** — what was chosen?
- **Alternatives considered** — what else was evaluated and why was it rejected?
- **Consequences** — what does this decision enable and constrain?
- **Review trigger** — what circumstances would cause us to revisit this decision?

### 10.2 Key Decisions That Must Be Documented as ADRs

- Primary database selection for each service
- Sharding strategy and shard key choice
- Consistency model chosen for each bounded context
- Caching strategy and invalidation approach
- Replication topology and failover strategy
- Data retention and archival policy
- Multi-tenancy model
- Cross-service data access pattern (API, event, read model)
- Migration tooling and process
- Backup and disaster recovery approach
- PII classification and encryption policy
- Polyglot persistence decisions — why each store was added

### 10.3 Architecture Review Process for Database Changes

- When a database change requires architecture review — not all changes need ADRs
- Criteria for escalating a schema change to architecture review: affects multiple services, introduces a new database technology, changes a shard key, changes consistency guarantees, handles new PII category
- Architecture review board composition for data decisions
- Database RFC process — proposal, review, decision, implementation, retrospective

---

## Part 11 — Communication and Leadership

### 11.1 Communicating Database Trade-offs to Non-Technical Stakeholders

- Translating eventual consistency into business risk language — *"a user might see stale data for up to 5 seconds"*
- Translating RPO into business language — *"if the datacenter burns down, we lose up to 1 hour of orders"*
- Translating downtime risk — *"this change has a 30-minute maintenance window"*
- Making the cost of technical debt visible — *"that missing index is costing us $3,000/month in extra compute"*
- Building the business case for architectural investment — reliability, scalability, compliance
- The *"it depends"* answer — teaching stakeholders that database decisions are context-dependent

### 11.2 Building a Database Engineering Culture

- Defining and enforcing schema conventions across teams
- Code review culture for SQL and migrations — SQL is code, treat it as such
- Query performance culture — every new query gets an EXPLAIN ANALYZE before merge
- Incident review culture — every DB incident has a blameless post-mortem
- Knowledge sharing — internal tech talks, runbooks, decision documentation
- Developer database skills — raising the floor across the engineering organization
- Database champions — embedding DB knowledge in each team rather than centralizing it

### 11.3 The Architect's Anti-Patterns to Avoid

- Choosing the newest database because it is interesting — not because it solves your problem
- Sharding prematurely before understanding the access patterns
- Designing for the scale you hope to achieve, not the scale you need today
- Letting individual services choose their own databases without governance
- Treating the database as a black box — architects must understand what is inside
- Centralizing all schema changes through a DBA bottleneck — decentralize with standards
- Not testing backups — *"we have backups"* and *"we can recover from backups"* are different claims
- Adding a new database technology without a team trained to operate it
- Ignoring the human cost — databases have operational burden that falls on real people

---

## Part 12 — Architect-Level System Design Scenarios

### 12.1 Designing a Global Payment System

- Consistency requirement — strong consistency for financial transactions (no eventual consistency for money)
- Write model — double-entry ledger, immutable append-only, idempotent
- Multi-region — primary region for writes, replicas in each region for reads
- Compliance — PCI-DSS zones, data residency, audit trail requirements
- Database choice — PostgreSQL or CockroachDB (if global active-active writes needed)
- Analytical pipeline — ledger events → Kafka → ClickHouse for reconciliation and reporting

### 12.2 Designing a Multi-Tenant SaaS Data Architecture

- Tenant isolation model — row-level (RLS) vs schema-per-tenant vs DB-per-tenant
- Shard key — tenant ID as the natural shard key
- Noisy neighbor mitigation — per-tenant resource quotas, dedicated DB for high-tier tenants
- Database selection — PostgreSQL with RLS for SMB tenants, dedicated clusters for enterprise
- Compliance — GDPR right to erasure, SOC 2, data residency per tenant

### 12.3 Designing a Real-Time Analytics Platform

- OLTP source — PostgreSQL / MySQL for transactional writes
- CDC pipeline — Debezium → Kafka → ClickHouse
- Serving layer — ClickHouse for sub-second analytical queries
- Caching — Redis for dashboard query results (TTL-based)
- Schema — star schema in ClickHouse, denormalized for query speed
- Data retention — hot in ClickHouse, cold in S3 (Parquet), archived after 2 years

### 12.4 Designing a Social Graph at Scale

- Graph storage options — PostgreSQL recursive CTE (small scale), adjacency list with Redis cache (medium scale), Neo4j or graph-native DB (large scale, complex traversals)
- Follower/following — bidirectional adjacency table, indexed both ways
- Feed generation — fanout-on-write (pre-compute) vs fanout-on-read (compute at query time) — architect decides based on read/write ratio and celebrity account handling
- Notification — event stream → Kafka → notification service → Redis for real-time, PostgreSQL for history

### 12.5 Designing a Healthcare Data Platform (HIPAA)

- PHI (Protected Health Information) isolation — separate VPC, separate DB instances, strict network ACLs
- Encryption — column-level encryption for all PHI fields, KMS-managed keys
- Audit trail — every read of PHI logged with user, timestamp, purpose
- Access control — RBAC with minimum necessary access, break-glass for emergencies
- Backup — encrypted, geo-replicated, tested monthly with restore drills
- De-identification pipeline — anonymized data for analytics, research, and testing

---

## Part 13 — Emerging Patterns Architects Must Track

### 13.1 AI/ML and Vector Databases

- Vector embeddings — representing text, images, code as high-dimensional vectors
- Vector similarity search — finding nearest neighbors in vector space
- pgvector — vector search in PostgreSQL — when it is enough
- Pinecone, Weaviate, Qdrant, Milvus — dedicated vector databases — when to switch
- The Retrieval-Augmented Generation (RAG) pattern — vector DB + LLM
- Hybrid search — combining vector similarity with keyword search (BM25 + ANN)
- Indexing strategies — HNSW, IVFFlat — trade-off between build time, memory, and recall

### 13.2 Serverless Databases

- Connection model — HTTP-based (not persistent TCP) for serverless environments
- Neon — serverless PostgreSQL with branching, scale-to-zero
- PlanetScale — serverless MySQL with schema change workflows, no FK enforcement
- Turso — SQLite at the edge (LibSQL fork)
- D1 (Cloudflare) — SQLite embedded in the edge worker
- Fauna, Upstash — serverless alternatives with different consistency models
- The architect's question: does serverless cold start latency meet your SLA?

### 13.3 Database Branching and Developer Experience

- Database branching — a copy of the schema and data for each feature branch / PR
- Neon branching — copy-on-write branching in seconds, not hours
- PlanetScale branches — schema migration as a branch + merge workflow
- Implications for the development lifecycle — every dev gets a production-like DB environment
- Testing against realistic data volume without copying production PII

### 13.4 The AI-Assisted Database

- Natural language to SQL — text-to-SQL for non-technical users querying data
- AI-assisted query optimization — automated EXPLAIN analysis and index suggestions
- Anomaly detection with ML — detecting query plan regressions, unusual access patterns
- AI-assisted schema design — generating schemas from requirements (emergent, not yet reliable)
- The architect's perspective — AI assists human decisions, does not replace architectural judgment

### 13.5 Multi-Model Databases

- PostgreSQL as a multi-model platform — relational + JSON + full-text + geospatial + vector (pgvector) + graph (recursive CTE)
- SurrealDB — relational + document + graph in one database
- FerretDB — MongoDB wire protocol over PostgreSQL
- The architect's trade-off — one flexible DB vs purpose-built specialized DBs — operational simplicity vs optimization ceiling

---

## The Architect's Database Knowledge Checklist

### FOUNDATION (must know before claiming to be an architect)

- [ ] Can select the right database for any given workload from first principles
- [ ] Can explain CAP theorem and PACELC with concrete examples
- [ ] Understands ACID, isolation levels, and their practical implications
- [ ] Can design a schema for any business domain from requirements
- [ ] Knows when and how to shard, partition, and replicate
- [ ] Can read and interpret an EXPLAIN ANALYZE plan
- [ ] Understands CDC, outbox pattern, and event-driven data sync
- [ ] Has designed and overseen a zero-downtime schema migration

### ADVANCED (separates a senior architect from a mid-level one)

- [ ] Can design a multi-region data architecture with explicit consistency trade-offs
- [ ] Can build a caching architecture with correct invalidation strategy
- [ ] Has designed for GDPR / HIPAA / PCI-DSS compliance at the data layer
- [ ] Can size and cost a database infrastructure from traffic and volume estimates
- [ ] Has designed a CQRS / event sourcing system and understands its failure modes
- [ ] Can lead a database technology evaluation from PoC to production decision
- [ ] Has defined and enforced data governance standards across multiple teams
- [ ] Can articulate every trade-off to a non-technical executive audience

### LEADERSHIP (what distinguishes an architect from a strong engineer)

- [ ] Has