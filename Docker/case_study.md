# Docker — Complete Study & Failure Cases

> 12 Parts · 60 Cases — Real-world failure patterns, scaling studies, distributed systems cases, and production lessons for backend engineers working with containers.

---

## Part 1 — Image & Build Failures

### 1.1 The Bloated Image Disaster

- **What happens:** Go or Node app image balloons to 1.4 GB because build tools, dev deps, and OS packages are all baked in
- **Real pattern:** `FROM ubuntu:22.04`, installs gcc, make, npm, then copies entire project — everything stays in the final layer
- **Scale trigger:** Works fine locally, costs real money in CI storage and pull time at team scale
- **Symptoms:** Pull takes 2–3 min, image push times out, deploy pipelines slower than code reviews
- **Solution:** Multi-stage builds: `FROM golang:1.22 AS builder` → compile binary → `FROM scratch` or `FROM gcr.io/distroless/static` for final stage. For Node.js: build stage → copy only `node_modules` + dist. Go binary goes from 1.4 GB to 8 MB
- **Lesson:** The build environment and the runtime environment are different things. Never let build tools ride into production.

---

### 1.2 Layer Cache Invalidation Storm

- **What happens:** Every build reinstalls all npm/Go dependencies even when only one source file changed
- **Real pattern:** `COPY . .` before `RUN npm install` — any file change busts the install cache
- **Scale trigger:** CI build goes from 40 sec to 8 min after project grows; adding a comment reruns full dep install
- **Symptoms:** No cache HIT lines in build output, 100% network traffic on every build, dev feedback loop destroyed
- **Solution:** Copy only dependency manifests first: `COPY go.mod go.sum ./` → `RUN go mod download` → `COPY . .`. For Node: `COPY package*.json ./` → `RUN npm ci` → `COPY . .`. Docker caches layers — lock files rarely change.
- **Lesson:** Think of Dockerfile as a pipeline — slow, rarely-changing steps first. Never copy source before installing deps.

---

### 1.3 The .dockerignore Omission

- **What happens:** Build context sent to daemon is 800 MB instead of 2 MB because `.git`, `node_modules`, and test data are included
- **Real pattern:** No `.dockerignore` file; `COPY . .` slurps the entire repo including `.git` history, mock data, and local DB dumps
- **Scale trigger:** `Sending build context to Docker daemon 847.3MB` — that line in your build output
- **Symptoms:** Build hangs on context transfer, secrets in `.env` or SSH keys leak into image layers
- **Solution:** Always ship a `.dockerignore`: `.git`, `node_modules`, `*.log`, `.env*`, `coverage/`, `tmp/`, test fixtures. Treat it like `.gitignore` — mandatory, not optional.
- **Lesson:** A missing `.dockerignore` is a security and performance bug. Secrets baked into layers are retrievable with `docker history`.

---

### 1.4 The Mutable Base Image Trap

- **What happens:** Using `:latest` tags causes builds to silently break when upstream images update
- **Real pattern:** `FROM node:latest` — Node 18 → Node 22 upgrade happens upstream, your code breaks on the next CI run
- **Scale trigger:** CI passes Monday, fails Friday with no code change — "works on my machine" is now "worked yesterday"
- **Symptoms:** Random breakage, non-reproducible builds, dependency API changes, security patches that break behavior
- **Solution:** Pin exact versions with digest: `FROM node:20.12.0-alpine3.19` or `FROM node@sha256:abc123`. Use Dependabot or Renovate to manage base image updates deliberately.
- **Lesson:** `:latest` is a moving target that breaks reproducibility. In production, every image reference must be immutable.

---

### 1.5 Running as Root in Production

- **What happens:** Application container runs as UID 0 (root), turning any RCE vulnerability into full host escape
- **Real pattern:** No `USER` directive in Dockerfile; default is root. Process inside container has CAP_SYS_ADMIN and can write to any mounted path
- **Scale trigger:** Container escape CVEs (like runc CVE-2019-5736) are only exploitable from root containers
- **Symptoms:** Security audits fail, compliance blocks deployment, exploited RCE leads to host compromise
- **Solution:** Add `RUN addgroup -S app && adduser -S app -G app` and `USER app` before CMD. For Go distroless use `FROM gcr.io/distroless/static:nonroot`. Set `--read-only` filesystem + tmpfs for writable dirs.
- **Lesson:** Least privilege is not optional. A containerized process with root has privileges that escape the container boundary.

---

## Part 2 — Container Runtime Failures

### 2.1 The PID 1 Signal Trap

- **What happens:** Container ignores SIGTERM on shutdown, hangs for 10 seconds until Docker force-kills it with SIGKILL
- **Real pattern:** `CMD ["npm", "start"]` — npm is PID 1 but doesn't forward signals to Node child process. `docker stop` sends SIGTERM to npm, Node never sees it
- **Scale trigger:** Rolling deploys stall, in-flight requests are killed mid-processing, database connections leak
- **Symptoms:** 10-second delay on every container stop, corrupted state from abrupt kills, lost RabbitMQ messages
- **Solution:** Use `CMD ["node", "server.js"]` directly (exec form, not shell form). For shell scripts use `exec`: `exec go run main.go`. Or add `tini` as init: `ENTRYPOINT ["/tini", "--"]`. Implement graceful shutdown handlers in app code.
- **Lesson:** PID 1 in a container is your responsibility. Shell form CMD spawns a shell that won't forward signals. Always use exec form.

---

### 2.2 The Crash Loop from Missing ENV

- **What happens:** Container starts, panics on missing DB_URL, exits with code 1, restarts, repeats — CrashLoopBackOff
- **Real pattern:** App reads `os.Getenv("DB_URL")` without default or validation at startup; empty string causes nil pointer panic in Go
- **Scale trigger:** New environment deployed without secret injection, or secret name typo in Compose/K8s manifest
- **Symptoms:** Container exits in under 1 second, restart loop saturates CPU, misleading "unhealthy" status hides real cause
- **Solution:** Validate all required env vars at startup before serving: fail fast with clear error message (`log.Fatal("DB_URL is required")`). Document all vars in `.env.example`. Use a config validator package (e.g., `envconfig` in Go).
- **Lesson:** Configuration errors should produce readable messages, not panics. Validate env at startup — crash loudly and clearly.

---

### 2.3 Health Check That Lies

- **What happens:** HEALTHCHECK passes but service is functionally dead — load balancer keeps sending traffic to a broken instance
- **Real pattern:** `HEALTHCHECK CMD curl -f http://localhost:8080/` returns 200 but DB connection pool is exhausted — the root path doesn't check dependencies
- **Scale trigger:** DB goes down, app serves cached 200 from root handler, health check never detects the failure
- **Symptoms:** Users see errors, metrics show spikes, but no containers are marked unhealthy — phantom healthy instances
- **Solution:** Implement a real `/healthz` endpoint that pings DB (`db.Ping()`), Redis, and critical dependencies. Return 503 if any fail. Separate `/readyz` (ready to serve) from `/livez` (alive, don't restart).
- **Lesson:** A health check that doesn't reflect the real health of the app is worse than none — it creates false confidence.

---

### 2.4 Zombie Process Accumulation

- **What happens:** Container memory grows indefinitely as zombie processes accumulate because PID 1 never reaps children
- **Real pattern:** App spawns child processes (cron jobs, shell scripts) but PID 1 doesn't call `wait()` — zombies pile up in the process table
- **Scale trigger:** Long-running containers, apps that exec shell commands, containers running multiple processes
- **Symptoms:** Memory grows slowly, `docker stats` shows inflating process count, eventual OOM kill
- **Solution:** Use `tini` or `dumb-init` as PID 1 — they handle signal forwarding and zombie reaping correctly. Add to image: `RUN apk add tini`, `ENTRYPOINT ["/sbin/tini", "--"]`.
- **Lesson:** In Unix, someone must reap child processes. In containers, that job falls to PID 1. Use a proper init unless your app handles it explicitly.

---

### 2.5 Timezone & Locale Mismatch

- **What happens:** Scheduled jobs run at wrong time, log timestamps are UTC while app logic expects local timezone — silent data corruption
- **Real pattern:** Distroless or Alpine image has no timezone data; `time.LoadLocation("Asia/Dhaka")` panics, or silently falls back to UTC
- **Scale trigger:** Cron triggers at wrong local hour, date-partitioned queries miss rows, reports show wrong day boundaries
- **Symptoms:** Subtle data bugs, cron timing drift, "it works on my Mac" because local machine has tz data, container doesn't
- **Solution:** For Go with distroless: embed tz data in binary (`import _ "time/tzdata"`) or install in Dockerfile: `RUN apk add tzdata` and set `ENV TZ=UTC`. Always store times as UTC in DB, convert at display layer only.
- **Lesson:** Minimal images have minimal system libraries. Timezone data is a system library. Always store UTC, handle TZ in application logic.

---

## Part 3 — Networking Failures

### 3.1 Service Discovery Confusion — localhost vs DNS

- **What happens:** App can't connect to Postgres even though both containers are running — using `localhost` instead of service name
- **Real pattern:** `DB_URL=postgres://localhost:5432/db` — inside container, localhost is the container itself, not the postgres container
- **Scale trigger:** Every first-time Docker Compose user; works on bare metal, fails immediately in containers
- **Symptoms:** `connection refused` on 127.0.0.1:5432, containers show as running, confusing to debug
- **Solution:** Use Docker DNS service discovery: `DB_URL=postgres://postgres:5432/db` where `postgres` is the Compose service name. Docker's embedded DNS resolves service names on the bridge network automatically.
- **Lesson:** In Docker networking, `localhost` is always the current container. Service-to-service communication uses DNS names, never localhost.

---

### 3.2 The Exposed vs Published Port Confusion

- **What happens:** Port 6379 is EXPOSE'd in Redis image but not reachable from the host; developers can't connect from local tools
- **Real pattern:** `EXPOSE 6379` in Dockerfile is documentation only — it doesn't publish to the host. Container-to-container works, host-to-container doesn't
- **Scale trigger:** Running Redis CLI from host, connecting to DB from TablePlus/DBeaver, debugging from host tools
- **Symptoms:** `Connection refused` from host, but `docker exec redis redis-cli ping` works fine
- **Solution:** In Compose use `ports: ["6379:6379"]` to publish to host. For internal-only services (DB in production), do NOT publish — use Docker network for service-to-service only. Publishing DB to host is a security risk in production.
- **Lesson:** `EXPOSE` ≠ publish. It's metadata. Publishing binds to host network interface and exposes the port to the outside world.

---

### 3.3 Network Namespace Isolation Surprise

- **What happens:** Two Compose stacks can't communicate even though both containers are "on Docker" — they're on isolated networks
- **Real pattern:** Stack A creates network `app_default`, Stack B creates `backend_default` — no cross-network connectivity by default
- **Scale trigger:** Microservices split across multiple Compose files, shared services like Redis used by multiple apps
- **Symptoms:** `No route to host`, service name not resolved across stacks despite both running on same Docker host
- **Solution:** Create a shared external network: `docker network create shared-net`. In each Compose file declare `networks: shared-net: external: true`. Attach shared services (Redis, RabbitMQ) to this network. Or use a single Compose project for related services.
- **Lesson:** Docker network isolation is per-Compose-project by default. Cross-stack communication requires explicit shared networks.

---

### 3.4 Socket.IO WebSocket Connection Drops Behind Proxy

- **What happens:** WebSocket connections dropped immediately when Nginx proxy is added in front of Socket.IO Node container
- **Real pattern:** Nginx default config doesn't set `Upgrade` and `Connection` headers — WebSocket upgrade handshake fails, falls back to long-polling which Nginx also mangles
- **Scale trigger:** Adding Nginx as reverse proxy, deploying behind AWS ALB without sticky sessions, multi-instance Socket.IO without Redis adapter
- **Symptoms:** Connections flash-reconnect constantly, events lost, users see disconnect/reconnect cycle every few seconds
- **Solution:** Add to Nginx: `proxy_http_version 1.1`, `proxy_set_header Upgrade $http_upgrade`, `proxy_set_header Connection "upgrade"`. For multiple Node instances: use Socket.IO Redis adapter — all nodes subscribe to shared Redis pub/sub channel.
- **Lesson:** HTTP proxies don't automatically handle WebSocket upgrades. Every proxy in the chain must be explicitly configured for WebSocket passthrough.

---

### 3.5 DNS Resolution TTL — Stale IP Cache

- **What happens:** After container restart, other containers still try to connect to the old IP — service discovery breaks for minutes
- **Real pattern:** Go's `net.DefaultResolver` caches DNS for the process lifetime; JVM caches indefinitely by default — old container IP cached after restart
- **Scale trigger:** Rolling restarts, container crashes and restarts with new IP on same Docker network
- **Symptoms:** Post-restart connection errors for 30–60 seconds, intermittent failures during deploys
- **Solution:** Re-resolve DNS on connection error (retry with fresh lookup). For Go: use `net.Resolver` with short TTL or resolve per-request. Use Docker Compose service names — Docker's internal DNS always returns the current container IP, so re-resolving is the fix.
- **Lesson:** In dynamic container environments, DNS is ephemeral. Never assume a resolved IP is stable. Re-resolve on connection failure.

---

## Part 4 — Volume & Storage Failures

### 4.1 Data Loss on Container Removal

- **What happens:** All PostgreSQL data wiped when container is removed — nobody set up volumes, data lived inside the container layer
- **Real pattern:** `docker run postgres` without `-v` flag — Postgres writes to `/var/lib/postgresql/data` inside the writable container layer which is destroyed on `docker rm`
- **Scale trigger:** `docker compose down` (removes containers), container crash + restart with fresh image, any `docker rm`
- **Symptoms:** Database starts empty after restart, all rows gone, migration re-runs on startup, complete data wipe
- **Solution:** Always mount a named volume for stateful services: `volumes: ["pgdata:/var/lib/postgresql/data"]`. Use `docker compose down` (keeps volumes) vs `docker compose down -v` (removes volumes — dangerous). Name volumes explicitly, not anonymous ones.
- **Lesson:** Containers are ephemeral. Anything you want to survive container replacement must live in a volume.

---

### 4.2 Bind Mount Permission Hell

- **What happens:** Container can't write to bind-mounted directory — `permission denied` because host UID doesn't match container UID
- **Real pattern:** Host file owned by UID 1000, container runs as UID 999 (postgres user) — container sees files owned by a different user
- **Scale trigger:** Development bind mounts, CI systems, running containers as non-root (correctly) on Linux hosts
- **Symptoms:** `EACCES permission denied` on writes, app crashes on startup, Postgres won't start because it can't write data dir
- **Solution:** Match UIDs: `RUN adduser --uid 1000 app`. Or use named Docker volumes (Docker manages permissions). For dev: `user: "${UID}:${GID}"` in Compose. For Postgres specifically: let Docker manage the volume, don't bind-mount data dir.
- **Lesson:** Linux UID/GID permissions cross the container boundary. Plan your user IDs or use Docker-managed volumes that handle this automatically.

---

### 4.3 Volume Fills Disk — Silent Death

- **What happens:** PostgreSQL or Redis volume fills the host disk — all containers on the host start failing with I/O errors
- **Real pattern:** No disk quota on volumes, Postgres WAL accumulates, Redis AOF grows unbounded — host `/var/lib/docker` fills up
- **Scale trigger:** Long-running production with WAL not being cleaned, Redis configured with `appendonly yes` but no rewrites, log files in volumes
- **Symptoms:** `No space left on device`, all containers on host fail simultaneously, Postgres goes read-only
- **Solution:** Monitor disk usage on Docker host (`docker system df`). Set `max-size` and `max-file` on log driver. Configure Postgres WAL archiving. Redis: enable `auto-aof-rewrite-percentage`. Alert at 70% disk, not 100%.
- **Lesson:** Volumes are files on the host. Unbounded growth kills the host. Always monitor and set retention policies for stateful data.

---

## Part 5 — Docker Compose Failures

### 5.1 The depends_on Race Condition

- **What happens:** App starts before Postgres is ready to accept connections — first migration or connection attempt fails
- **Real pattern:** `depends_on: postgres` only waits for the container to START, not for Postgres to be READY — Postgres takes 2–3 seconds after container start to accept connections
- **Scale trigger:** Every fresh `docker compose up`, CI environments, slow machines where Postgres init takes longer
- **Symptoms:** `connection refused` on first app start, migrations fail intermittently, app starts fine 60% of the time
- **Solution:** Use `depends_on: postgres: condition: service_healthy` with a proper healthcheck on postgres: `healthcheck: test: ["CMD-SHELL", "pg_isready -U postgres"] interval: 5s retries: 5`. Or implement retry logic in app startup (always good practice regardless).
- **Lesson:** `depends_on` controls start order, not readiness. A started container is not a ready container. Always combine with health checks.

---

### 5.2 Environment Variable Leakage Across Services

- **What happens:** All services inherit the same `.env` file — DB password for one service accidentally available in another
- **Real pattern:** Single `env_file: .env` on every service — `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `RABBITMQ_PASSWORD` all injected into every container
- **Scale trigger:** Security audit, compromised container can read credentials for all other services
- **Symptoms:** Blast radius of any container compromise is all credentials; principle of least privilege violated
- **Solution:** Scope env vars per service: only inject what the service actually needs. Use Docker Secrets for sensitive values in Swarm. In development, use separate `.env.app`, `.env.db` per service. In production use a secrets manager (Vault, AWS Secrets Manager).
- **Lesson:** Env vars are not scoped — they're visible to the entire process and all its children. Treat credential injection as need-to-know.

---

### 5.3 Compose Hot-Reload Not Working

- **What happens:** File changes not reflected in running container despite bind mount — developer rebuilds image manually for every change
- **Real pattern:** On Docker Desktop for Mac/Windows, inotify events don't propagate from host to container VM — file watchers (nodemon, Air for Go) don't trigger
- **Scale trigger:** Development workflow on Mac/Windows, watching files with `nodemon` or `air` inside container
- **Symptoms:** Watcher process running but changes ignored, polling mode uses 100% CPU as workaround
- **Solution:** Enable polling mode in watcher (`nodemon --legacy-watch`, Air `poll: true`). Or use Docker Desktop's new sync feature (`docker compose watch`). On Linux, inotify works correctly — no polling needed.
- **Lesson:** Docker Desktop on Mac/Windows runs a Linux VM — inotify events cross a VM boundary where they can be lost. Plan for polling in cross-platform dev setups.

---

## Part 6 — Resource & Performance Cases

### 6.1 No Resource Limits — Container Kills the Host

- **What happens:** One misbehaving container consumes all host memory — OOM killer starts killing other containers indiscriminately
- **Real pattern:** No `mem_limit` or `cpus` set — Go goroutine leak or Node memory leak in one service takes down Redis and Postgres on the same host
- **Scale trigger:** Memory leak under load, goroutine leak, traffic spike on shared-host deployment
- **Symptoms:** Host goes unresponsive, all services on same host crash, OOM in kernel logs, data corruption possible
- **Solution:** Always set limits in Compose: `deploy: resources: limits: memory: 512m cpus: "0.5"`. Set `mem_reservation` for soft limits. Monitor with `docker stats` or Prometheus cAdvisor. Container should fail fast in isolation, not take down neighbors.
- **Lesson:** Containers without resource limits are noisy neighbors. Resource isolation is the entire point of containerization — enforce it.

---

### 6.2 Go GC Thinks It Has the Whole Host RAM

- **What happens:** Go app allocated 128 MB memory limit but GC triggers at 512 MB because it reads host RAM, not container limit
- **Real pattern:** Go GC uses `GOGC=100` (double heap before collecting). It reads `/proc/meminfo` for total memory — sees host's 64 GB, not container's 128 MB limit. Exceeds limit, OOM killed.
- **Scale trigger:** Go 1.18 and earlier, containers with memory limits, any GC-based language (JVM same issue)
- **Symptoms:** Container OOM killed despite seemingly low workload, GC never triggers until limit exceeded, sudden restarts
- **Solution:** Go 1.19+: set `GOMEMLIMIT` env var to 90% of container limit: `GOMEMLIMIT=460MiB`. Or use `runtime/debug.SetMemoryLimit()`. For JVM: `-XX:+UseContainerSupport` (enabled by default in JDK 10+).
- **Lesson:** Runtime GCs don't automatically respect container memory limits. Explicitly tell the runtime how much memory it has.

---

### 6.3 GOMAXPROCS Misconfigured — CPU Thrashing

- **What happens:** Go app sees 64 CPUs on host, creates 64 OS threads, scheduled on 2 allowed CPUs — context switching overhead kills throughput
- **Real pattern:** `GOMAXPROCS` defaults to host CPU count, but container is limited to `cpus: "2"` — 64 goroutine schedulers competing for 2 CPU slots
- **Scale trigger:** CPU-limited containers on dense multi-core hosts, high-throughput Go services
- **Symptoms:** High CPU steal, p99 latency degraded, `runtime.NumCPU()` returns 64 but container only has 2
- **Solution:** Use `uber-go/automaxprocs` package — it reads cgroup CPU quota and sets GOMAXPROCS correctly. Or set manually: `runtime.GOMAXPROCS(2)`. Add as first import: `import _ "go.uber.org/automaxprocs"`.
- **Lesson:** GOMAXPROCS should match container CPU allocation, not host CPU count. `automaxprocs` is mandatory for containerized Go apps.

---

## Part 7 — Security Failure Cases

### 7.1 Secrets in ENV — Leaked via docker inspect

- **What happens:** Database passwords and API keys stored as ENV vars are visible in plaintext via `docker inspect` to any host user
- **Real pattern:** `ENV DB_PASSWORD=supersecret` in Dockerfile or `environment: DB_PASSWORD: xyz` in Compose — visible in image metadata and running container config
- **Scale trigger:** Any user with Docker socket access can run `docker inspect container_id` and read all env vars
- **Symptoms:** Credential leakage via CI logs, audit failures, attackers reading secrets from container metadata
- **Solution:** Use Docker Secrets (Swarm) or mount secrets as files: `/run/secrets/db_password`. Read from file in app, not env var. In K8s use Sealed Secrets or Vault Agent Injector. Never `ENV` secrets in Dockerfile — they bake into all layers.
- **Lesson:** ENV vars are not secret storage. They're visible to all processes in the container and to anyone with Docker daemon access.

---

### 7.2 Docker Socket Mounted in Container

- **What happens:** Mounting `/var/run/docker.sock` into a container gives that container full root access to the host
- **Real pattern:** `volumes: ["/var/run/docker.sock:/var/run/docker.sock"]` — container can now start privileged containers, mount host filesystem, escape to host
- **Scale trigger:** CI agents (Jenkins, Drone), auto-deployment tools, monitoring agents that need to inspect containers
- **Symptoms:** Any RCE in that container = full host compromise; security audit critical finding
- **Solution:** Use Dockerd-in-Docker alternatives: `kaniko` for image builds in CI (no daemon needed), `podman` rootless, `img`. If socket access required, use a Docker socket proxy (Tecnativa/docker-socket-proxy) that whitelists specific API calls only.
- **Lesson:** The Docker socket is the keys to the kingdom. Never mount it unless you accept that container = root on host.

---

## Part 8 — Scaling Study Cases

### 8.1 Horizontal Scale Without Session Affinity

- **What happens:** Scaling Go API to 5 replicas breaks authentication — in-memory JWT sessions work on 1 instance but not when requests load-balance across 5
- **Real pattern:** Session data or rate-limit counters stored in process memory — request 1 hits instance A, request 2 hits instance B which has no session state
- **Scale trigger:** `docker service scale api=5` or Compose with replicas > 1, any horizontal scaling
- **Symptoms:** Random auth failures, rate limiting ineffective, cache miss storms, users logged out randomly
- **Solution:** Externalize all state: JWT stored client-side (stateless) or in Redis, rate limit counters in Redis (use atomic INCR), uploaded file coordination via shared storage (S3/MinIO). Rule: if you can't scale to 10 replicas without state bugs, the state is in the wrong place.
- **Lesson:** A process that holds state cannot be scaled horizontally. Design for statelessness from day one — it's much harder to retrofit.

---

### 8.2 Database Connection Pool Exhaustion at Scale

- **What happens:** Scaling API from 2 to 20 replicas causes Postgres to hit max_connections (100) — all new connections refused
- **Real pattern:** Each Go container opens pool of 10 connections × 20 replicas = 200 connections. Postgres `max_connections=100`. Each new connection attempt fails: `too many connections`
- **Scale trigger:** Horizontal scaling past pool × max_connections / per_instance threshold
- **Symptoms:** `pq: sorry, too many clients already`, service degradation exactly when you scaled to handle more load
- **Solution:** Add PgBouncer as connection pooler between app and Postgres: apps connect to PgBouncer (thousands of connections), PgBouncer maintains small pool to Postgres (10–50). Set `pool_mode=transaction`. Formula: `max_conn / (replicas × pool_per_replica)` to plan capacity.
- **Lesson:** PostgreSQL connection limits don't scale with your app. PgBouncer is not optional in multi-replica deployments.

---

### 8.3 RabbitMQ Consumer Scale — Message Thundering Herd

- **What happens:** Scaling RabbitMQ consumer workers from 1 to 20 causes all workers to process same message — duplicate processing, data corruption
- **Real pattern:** Workers subscribe to fanout exchange instead of a shared queue — fanout delivers to ALL subscribers, work queue delivers to ONE. Architecture error, not a bug.
- **Scale trigger:** Scaling worker containers without understanding RabbitMQ exchange types
- **Symptoms:** Same order processed 20 times, duplicate emails sent, idempotency violations, data corruption
- **Solution:** Use direct or topic exchange with a single shared queue — RabbitMQ round-robins messages across competing consumers. Set `prefetch_count=1` so each worker takes one message at a time. Fanout is for broadcast (notifications), work queue for task distribution.
- **Lesson:** RabbitMQ exchange type determines delivery semantics. Work queues need competing consumers on a shared queue, not fanout to all.

---

### 8.4 Redis Hot Key Bottleneck

- **What happens:** Scaling API to 50 replicas but one Redis key ("trending_posts") is requested by every instance every 100ms — Redis becomes the bottleneck
- **Real pattern:** 50 replicas × 10 req/s each = 500 Redis reads/s on one key. Redis is single-threaded per command — hot key saturates the connection
- **Scale trigger:** Global leaderboards, trending content, shared configuration keys, feature flags read on every request
- **Symptoms:** Redis CPU at 100% despite small data, latency spike on all Redis operations (commands queue behind hot key)
- **Solution:** Local in-process cache with short TTL (1–5 sec): cache the Redis result in-memory per instance. Cache stampede protection: randomize TTL ± 10%, use staggered background refresh. For extreme scale: Redis Cluster with read replicas for hot keys.
- **Lesson:** Caches can have their own bottlenecks. A second cache layer (in-process) above Redis prevents hot key saturation.

---

## Part 9 — Distributed Systems Study Cases

### 9.1 Split Brain — Two Leaders Elected Simultaneously

- **What happens:** Network partition causes two containers to both believe they are the primary instance — both write to database, data diverges
- **Real pattern:** Custom leader election without distributed lock — network blip between 3 nodes causes node A and node C to each think the other is dead and both elect themselves primary
- **Scale trigger:** Network partition, container restart during leader transition, AWS AZ outage, flaky inter-service networking
- **Symptoms:** Duplicate records, conflicting writes, data inconsistency discovered hours later, impossible to reconcile without manual intervention
- **Solution:** Never implement custom leader election. Use proven tools: Redis SETNX with expiry for distributed lock, PostgreSQL advisory locks, etcd leader election. Design for idempotency — same operation twice yields same result. Prefer quorum writes.
- **Lesson:** Distributed consensus is an unsolved-in-practice problem. Reuse battle-tested implementations. Split-brain causes data corruption that's worse than downtime.

---

### 9.2 Cascading Failure — Missing Circuit Breaker

- **What happens:** Payment service slowdown causes notification service goroutines to pile up waiting, which exhausts Go connection pool, which takes down the entire API
- **Real pattern:** No timeout on outgoing HTTP calls, no circuit breaker — payment service at 5s p99 causes 500 goroutines to hang waiting, memory exhaustion, entire service down
- **Scale trigger:** Downstream service degradation, network slowness, database lock contention in dependency
- **Symptoms:** One slow downstream takes down unrelated endpoints on same service, goroutine count growing, cascading outage
- **Solution:** Implement circuit breaker pattern (Go: `sony/gobreaker`): after N failures, open circuit, return cached/default response immediately. Set context deadlines on all outgoing calls: `ctx, cancel := context.WithTimeout(ctx, 2*time.Second)`. Bulkhead pattern: separate goroutine pools per downstream.
- **Lesson:** In distributed systems, failure propagates. Circuit breakers and timeouts are not optional — they are the immune system of your service mesh.

---

### 9.3 Distributed Transaction — The Partial Write Problem

- **What happens:** Order creation writes to Postgres then publishes to RabbitMQ — if RabbitMQ publish fails, order exists in DB but no fulfillment event sent
- **Real pattern:** `INSERT order → commit → publish to queue` — two separate systems, no atomic operation across both. Postgres succeeds, RabbitMQ is down, order is ghost (charged but not fulfilled)
- **Scale trigger:** RabbitMQ restart, network blip between services, queue full, any failure between DB write and queue publish
- **Symptoms:** Orders charged but not delivered, missing fulfillment events, data inconsistency between systems
- **Solution:** Outbox Pattern: write event to `outbox` table in same Postgres transaction as order insert. Separate process (or CDC with Debezium) reads outbox and publishes to RabbitMQ with at-least-once delivery. Mark outbox row as published after confirm. Atomicity guaranteed by DB transaction.
- **Lesson:** You cannot atomically write to two different systems. The Outbox Pattern is the canonical solution — write-to-DB and message-publish must be atomic via the same DB transaction.

---

### 9.4 Service Mesh Without Observability — Blind in Production

- **What happens:** 5-service system has an intermittent 2% error rate — impossible to determine which service is failing without distributed tracing
- **Real pattern:** Logs are per-container and not correlated — request ID not propagated across service calls, can't follow a single request through the chain
- **Scale trigger:** Any multi-service debugging, intermittent failures, performance regressions in distributed calls
- **Symptoms:** Logs show errors but not which downstream call caused them, hours of manual log correlation, "works fine in staging"
- **Solution:** Propagate `X-Request-ID` / `X-Trace-ID` headers through all service calls. Use OpenTelemetry SDK in each service. Ship to Jaeger or Tempo. Every log line includes trace ID. Now you can see the entire request path in one view.
- **Lesson:** You cannot debug what you cannot observe. Distributed tracing is mandatory before going to multi-service production — not a nice-to-have.

---

### 9.5 Retry Storm — Making the Outage Worse

- **What happens:** Service B is slow, service A retries immediately with no backoff — A generates 10x more traffic than B can handle, making recovery impossible
- **Real pattern:** `for retries := 0; retries < 3; retries++ { call() }` — tight retry loop with no delay. 100 clients × 3 retries = 300 requests/s when B is struggling with 50/s
- **Scale trigger:** Any service degradation, database slowdown, downstream overload — your retries become a DDoS
- **Symptoms:** Service never recovers — traffic keeps it pinned, brief recovery attempts immediately crushed by retry wave
- **Solution:** Exponential backoff with jitter: `wait = base * 2^attempt + rand(0, base)`. Jitter prevents synchronized retry waves. Implement in Go with `cenkalti/backoff`. Combine with circuit breaker — stop retrying when circuit is open. Max retry budget per request.
- **Lesson:** Retries without backoff turn client-side resilience into an amplification attack. Jitter is what separates helpful retries from thundering herds.

---

## Part 10 — CI/CD & Registry Cases

### 10.1 Registry Rate Limiting — CI Pipeline Breaks at 9 AM

- **What happens:** 50 CI pipelines running simultaneously all pull `golang:1.22` from Docker Hub — rate limit hit, all pipelines fail
- **Real pattern:** Docker Hub free tier: 100 pulls/6hr from anonymous, 200 pulls/6hr for free accounts. Team of 20 devs all push at standup time triggers rate limit
- **Scale trigger:** No image caching, CI runners using anonymous Docker Hub access, many devs committing simultaneously
- **Symptoms:** `toomanyrequests: Too Many Requests.`, entire team blocked from deploying
- **Solution:** Run a private registry cache (ECR, GCR, or self-hosted with `registry:2`). Configure CI to pull base images through cache. Or use GitHub Container Registry (ghcr.io) — higher limits. Authenticate Docker in CI with org credentials for higher rate limits.
- **Lesson:** External registries are shared infrastructure with quotas. Operate your own mirror or cache for base images in any team environment.

---

### 10.2 Image Tag Overwrites Break Rollback

- **What happens:** CI tags every build as `:latest` — previous image overwritten, rollback requires a new deployment, 30 minutes to recover
- **Real pattern:** `docker build -t myapp:latest && docker push myapp:latest` — each push overwrites the previous :latest, no way to roll back to a specific version
- **Scale trigger:** Bad deploy needs rollback, hotfix required — but the old image is gone
- **Symptoms:** Can't roll back without rebuilding, MTTR doubles, incident duration extended by rebuild time
- **Solution:** Tag with immutable identifiers: `myapp:git-${SHA}` or `myapp:${BUILD_NUMBER}`. Keep `:latest` as alias but always deploy specific tag. Rollback = `docker service update --image myapp:git-abc123`. Retain last N images in registry with lifecycle policies.
- **Lesson:** Every production deployment should be rollback-able in under 60 seconds. That requires immutable image tags deployed with commit SHAs.

---

### 10.3 Multi-Platform Build Surprise — arm64 vs amd64

- **What happens:** Image built on Apple M2 Mac (arm64) deployed to AWS EC2 (amd64) — container fails to start with `exec format error`
- **Real pattern:** Default `docker build` produces image for builder's native architecture. Binary compiled for arm64 won't run on amd64 kernel
- **Scale trigger:** Dev on Apple Silicon, deploy to x86 cloud. Happens silently — push succeeds, deploy fails
- **Symptoms:** `standard_init_linux.go: exec user process caused: exec format error` on container start — cryptic without knowing the architecture mismatch
- **Solution:** Use Docker Buildx for multi-platform: `docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .`. CI always builds for target platform (linux/amd64). For Go: cross-compile with `GOOS=linux GOARCH=amd64` before COPY to keep it simple.
- **Lesson:** Container images are not portable across CPU architectures. Always build for the target platform in CI, regardless of developer hardware.

---

## Part 11 — Orchestration — Swarm & Kubernetes

### 11.1 Rolling Update Causes Request Failures — No Zero-Downtime

- **What happens:** Docker Swarm rolling update kills old containers while load balancer still sends traffic to them — 15 seconds of errors during deploy
- **Real pattern:** Swarm updates containers in batches but load balancer doesn't immediately deregister them. New container starts but Postgres migration not done yet. Old container gets SIGTERM, open connections dropped.
- **Scale trigger:** Every deploy to production Swarm without proper shutdown and readiness configuration
- **Symptoms:** 5xx errors in metrics during deploys, connection reset errors for in-flight requests, user-facing deploy windows
- **Solution:** Implement graceful shutdown: on SIGTERM, stop accepting new connections, finish in-flight requests (30s timeout), then exit. In Swarm: set `stop_grace_period: 30s`. Run migrations separately before deploy. Use `update_config: parallelism: 1 delay: 10s` with health checks so new container is verified before next is updated.
- **Lesson:** Zero-downtime deployments require: graceful shutdown in app code + health checks + correct orchestrator configuration. All three are required.

---

### 11.2 Swarm Overlay Network — Packet Loss Under Load

- **What happens:** Docker Swarm overlay network shows 2% packet loss under high throughput — intermittent request failures between services
- **Real pattern:** Overlay network uses VXLAN tunneling with default MTU of 1500 — but physical network MTU minus VXLAN overhead = 1450. Packets fragmented, some dropped at high throughput
- **Scale trigger:** High-throughput service-to-service calls (large payloads), multi-node Swarm on cloud VMs
- **Symptoms:** Intermittent connection resets, higher latency on large responses, packet loss only visible under load
- **Solution:** Lower overlay network MTU: create network with `--opt com.docker.network.driver.mtu=1450`. Or set in Docker daemon config. Rule: overlay MTU = physical MTU - 50 (VXLAN header overhead). Check with `ping -s 1400 -M do target`.
- **Lesson:** VXLAN encapsulation adds overhead to every packet. MTU mismatch causes fragmentation-driven packet loss that's nearly impossible to debug without knowing the pattern.

---

### 11.3 K8s OOMKilled — Limits Too Tight

- **What happens:** Node.js service killed every 2 hours by Kubernetes — `OOMKilled` exit code 137 — memory limit set too low for real workload
- **Real pattern:** Limit set at 256Mi based on idle measurement. Under load, Node.js V8 heap grows to 350Mi — K8s OOMKills immediately with no warning
- **Scale trigger:** Load testing, production traffic spike, memory leak combined with too-tight limit
- **Symptoms:** Container restarts every few hours, `kubectl describe pod` shows `OOMKilled`, no crash dump available
- **Solution:** Profile memory under realistic load first. Set `requests` at 80% of typical usage, `limits` at 2x requests as headroom. For Node: set `--max-old-space-size=200` to 75% of limit (256 * 0.75). Monitor actual usage with Prometheus over 7 days before finalizing limits.
- **Lesson:** Never set resource limits based on idle state. Profile under production load. Limits should be 2–3x typical usage, not 1.0x.

---

## Part 12 — Production Patterns & Real Cases

### 12.1 The Log Storm — Structured Logging Not Configured

- **What happens:** Under load, verbose unstructured logs fill disk at 500 MB/hour — log rotation not configured, eventually kills service
- **Real pattern:** `fmt.Println("Request:", req)` dumps entire request body including 10KB JSON payload. 500 req/s × 10KB = 5 MB/s of logs
- **Scale trigger:** Traffic spike, debug logging left enabled in production, request body logging without size guard
- **Symptoms:** Disk fills in hours, JSON log shipper overwhelmed, host I/O saturated — container performance degrades
- **Solution:** Structured logging with levels (zerolog/zap for Go, pino for Node). Production: INFO level only. Configure Docker log driver: `--log-opt max-size=100m --log-opt max-file=3`. Never log request bodies — log request ID, method, path, status code, latency only.
- **Lesson:** Logs are infrastructure. Uncontrolled log volume is a denial-of-service attack on your own storage. Structured logging + log levels + rotation are production requirements.

---

### 12.2 MongoDB Oplog Full — Replica Set Stalls

- **What happens:** MongoDB replica set secondary falls behind, oplog window closes — secondary must do full resync, hours of replication lag
- **Real pattern:** Oplog sized at default 5% of disk (512 MB). Bulk import of 100 GB overwrites entire oplog in hours. Secondary can't catch up, falls out of sync.
- **Scale trigger:** Large bulk operations, underpowered secondary (slow I/O), oplog size not tuned for workload
- **Symptoms:** Replication lag growing, secondary shows stale reads, eventual full resync needed — risk window for primary failure with no healthy secondary
- **Solution:** Size oplog for your bulk operation window: `mongod --oplogSize 51200` (50 GB). Monitor replication lag with `rs.printReplicationInfo()`. Batch bulk imports to respect oplog window. In containers: oplog lives in the data volume — size appropriately in VM/server planning.
- **Lesson:** MongoDB oplog is a ring buffer — if secondaries can't keep up, they fall off the edge and need full resync. Size oplog to cover your longest expected downtime.

---

### 12.3 Config Change Without Restart — Stale Config in Memory

- **What happens:** Feature flag updated in Redis but running containers still use old value — config read at startup, never refreshed
- **Real pattern:** `config := loadConfig()` called once at `func main()` — config loaded into memory, never re-read. Changing env vars or Redis config has no effect until restart.
- **Scale trigger:** Changing feature flags, rotating credentials, updating rate limits — any runtime config change
- **Symptoms:** Config change appears applied (set in Redis/env) but behavior doesn't change — requires container restart to take effect
- **Solution:** For feature flags: use a background goroutine to periodically re-read from Redis (e.g. every 30s). Use `sync.RWMutex` for safe concurrent reads. Or subscribe to Redis pub/sub for immediate push. SIGHUP handler for non-secret config reload: `signal.Notify(ch, syscall.SIGHUP)`.
- **Lesson:** Static config loaded at startup can't be changed without restart. Design dynamic config paths explicitly — don't let restarts be your config reload mechanism.

---

### 12.4 Migration Runs on Every Replica — Schema Conflict

- **What happens:** Scaling to 5 replicas causes DB migration to run 5 times simultaneously — table already exists error kills all 5 containers at startup
- **Real pattern:** `migrate.Up()` called in `main()` before HTTP server starts. 5 containers start simultaneously, all try to CREATE TABLE — 4 fail, rollback, containers exit.
- **Scale trigger:** Any multi-replica deployment that runs migrations at app startup
- **Symptoms:** All replicas crash on deploy, CrashLoopBackOff for entire service, only fixed by deploying with 1 replica first
- **Solution:** Separate migration from application startup entirely: run migration as a Kubernetes Init Container or a dedicated migration job before app deploy. Use advisory locks or migration lock table (golang-migrate does this). Migration = one-time ops task, not per-replica startup task.
- **Lesson:** Migrations and application replicas have different cardinality. Migrations run once; replicas run many. Never couple them in the same process startup.

---

### 12.5 Monitoring Blind Spot — Metrics Without SLOs

- **What happens:** Grafana dashboards show 50 metrics but no alerts fire during an incident that degrades users for 4 hours
- **Real pattern:** Metrics collected but no thresholds defined. Alert on CPU > 90% (infrastructure metric) but not on p99 latency > 2s (user-facing metric). Team checks dashboards manually, misses gradual degradation.
- **Scale trigger:** Gradual degradation (not sudden failure), business-hours-only monitoring, too many low-signal alerts that get ignored
- **Symptoms:** Users report issues before monitoring does, 4-hour MTTR because detection was manual
- **Solution:** Define SLOs first: "99% of requests under 500ms, error rate < 0.1%". Alert on SLO burn rate, not infra metrics. The Four Golden Signals: Latency, Traffic, Errors, Saturation. Alert on error rate and p99 latency — these directly correlate with user experience.
- **Lesson:** Metrics without SLOs are noise. Alert on symptoms (user-facing degradation), not causes (CPU usage). Define what "bad" looks like before an incident teaches you.