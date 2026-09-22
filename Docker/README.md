# Docker Production Failure Patterns

> **12 Parts * 60 Cases** -- A curated reference of real-world Docker failure patterns,
> scaling problems, and production lessons for backend engineers.

---

## Table of Contents

| Part | Topic | Cases |
|------|-------|-------|
| [Part 1](#part-1--image--build-failures) | Image & Build Failures | 1.1-1.5 |
| [Part 2](#part-2--container-runtime-failures) | Container Runtime Failures | 2.1-2.5 |
| [Part 3](#part-3--networking-failures) | Networking Failures | 3.1-3.5 |
| [Part 4](#part-4--volume--storage-failures) | Volume & Storage Failures | 4.1-4.3 |
| [Part 5](#part-5--docker-compose-failures) | Docker Compose Failures | 5.1-5.3 |
| [Part 6](#part-6--resource--performance-cases) | Resource & Performance Cases | 6.1-6.3 |
| [Part 7](#part-7--security-failure-cases) | Security Failure Cases | 7.1-7.2 |
| [Part 8](#part-8--scaling-study-cases) | Scaling Study Cases | 8.1-8.4 |
| [Part 9](#part-9--distributed-systems-study-cases) | Distributed Systems Cases | 9.1-9.5 |
| [Part 10](#part-10--cicd--registry-cases) | CI/CD & Registry Cases | 10.1-10.3 |
| [Part 11](#part-11--orchestration--swarm--kubernetes) | Orchestration (Swarm & K8s) | 11.1-11.3 |
| [Part 12](#part-12--production-patterns--real-cases) | Production Patterns & Real Cases | 12.1-12.5 |

---

## Quick Reference -- Top 10 Most Critical Lessons

| # | Lesson | Case |
|---|--------|------|
| 1 | Always use multi-stage builds -- never ship build tools to production | 1.1 |
| 2 | Pin base image versions with exact tags or SHA digest | 1.4 |
| 3 | Never run containers as root in production | 1.5 |
| 4 | Use exec form CMD -- PID 1 must receive and forward signals | 2.1 |
| 5 | Health checks must test real dependencies, not just process liveness | 2.3 |
| 6 | `localhost` inside a container is that container itself, never a sibling | 3.1 |
| 7 | All stateful data must live in named volumes, not container layers | 4.1 |
| 8 | `depends_on` controls order, not readiness -- combine with healthchecks | 5.1 |
| 9 | Set GOMEMLIMIT and use automaxprocs for every containerized Go service | 6.2, 6.3 |
| 10 | Use the Outbox Pattern for DB + message queue atomicity | 9.3 |

---

## Technology Coverage

- **Container Runtime:** Docker Engine, Docker Compose, Docker Swarm
- **Languages:** Go, Node.js
- **Databases:** PostgreSQL, Redis, MongoDB
- **Messaging:** RabbitMQ
- **Orchestration:** Docker Swarm, Kubernetes
- **Observability:** OpenTelemetry, Jaeger, Prometheus, Grafana
- **Security:** Docker Secrets, Vault, Sealed Secrets

---

## Case Format

Every case uses the same structured format:

```
- What happens:   The surface-level failure symptom
- Real pattern:   The exact code or config that causes it
- Scale trigger:  When/why this becomes critical
- Symptoms:       What you see in logs/metrics/behavior
- Solution:       The concrete fix with specific tools/config
- Lesson:         The durable principle to remember
```

---

## Part 1 -- Image & Build Failures

| Case | Name | TL;DR |
|------|------|-------|
| 1.1 | The Bloated Image Disaster | Multi-stage builds: compile in builder, ship only binary |
| 1.2 | Layer Cache Invalidation Storm | Copy dependency manifests before source files |
| 1.3 | The .dockerignore Omission | `.dockerignore` is mandatory -- treat it like `.gitignore` |
| 1.4 | The Mutable Base Image Trap | Pin images with exact version tags or SHA digests |
| 1.5 | Running as Root in Production | Add non-root user and `USER` directive in every Dockerfile |

---

## Part 2 -- Container Runtime Failures

| Case | Name | TL;DR |
|------|------|-------|
| 2.1 | The PID 1 Signal Trap | Use exec form CMD; add `tini` for proper signal handling |
| 2.2 | The Crash Loop from Missing ENV | Validate all env vars at startup with clear fatal errors |
| 2.3 | Health Check That Lies | `/healthz` must ping DB/Redis -- not just return 200 |
| 2.4 | Zombie Process Accumulation | Use `tini` or `dumb-init` as PID 1 to reap children |
| 2.5 | Timezone & Locale Mismatch | Embed tzdata; always store UTC, convert at display layer |

---

## Part 3 -- Networking Failures

| Case | Name | TL;DR |
|------|------|-------|
| 3.1 | localhost vs DNS | Use service names (Docker DNS), never `localhost` for inter-service |
| 3.2 | EXPOSE vs Published Port | `EXPOSE` is docs only; use `ports:` in Compose to publish |
| 3.3 | Network Namespace Isolation | Cross-stack needs explicit shared external networks |
| 3.4 | WebSocket Drops Behind Proxy | Set `Upgrade` + `Connection` headers in every proxy layer |
| 3.5 | Stale DNS Cache | Re-resolve DNS on connection failure -- IPs change on restart |

---

## Part 4 -- Volume & Storage Failures

| Case | Name | TL;DR |
|------|------|-------|
| 4.1 | Data Loss on Container Removal | Named volumes for all stateful services -- always |
| 4.2 | Bind Mount Permission Hell | Match UIDs or use Docker-managed volumes |
| 4.3 | Volume Fills Disk | Monitor disk, set log retention, alert at 70% not 100% |

---

## Part 5 -- Docker Compose Failures

| Case | Name | TL;DR |
|------|------|-------|
| 5.1 | depends_on Race Condition | Use `condition: service_healthy` + proper healthchecks |
| 5.2 | ENV Leakage Across Services | Scope env per service -- use secrets manager in production |
| 5.3 | Hot-Reload Not Working | Enable polling mode on Mac/Windows (inotify crosses VM boundary) |

---

## Part 6 -- Resource & Performance Cases

| Case | Name | TL;DR |
|------|------|-------|
| 6.1 | No Resource Limits | Always set `deploy.resources.limits` in Compose |
| 6.2 | Go GC Sees Host RAM | Set `GOMEMLIMIT=90%` of container limit (Go 1.19+) |
| 6.3 | GOMAXPROCS Misconfigured | Use `uber-go/automaxprocs` -- mandatory for Go containers |

---

## Part 7 -- Security Failure Cases

| Case | Name | TL;DR |
|------|------|-------|
| 7.1 | Secrets in ENV | Mount secrets as files; never bake credentials into ENV |
| 7.2 | Docker Socket in Container | Socket mount = root on host; use kaniko/podman instead |

---

## Part 8 -- Scaling Study Cases

| Case | Name | TL;DR |
|------|------|-------|
| 8.1 | No Session Affinity | Externalize all state -- Redis for sessions, S3 for files |
| 8.2 | Connection Pool Exhaustion | PgBouncer is not optional in multi-replica deployments |
| 8.3 | RabbitMQ Thundering Herd | Fanout = broadcast; use work queue for task distribution |
| 8.4 | Redis Hot Key | Add in-process TTL cache; randomize TTL to prevent stampede |

---

## Part 9 -- Distributed Systems Study Cases

| Case | Name | TL;DR |
|------|------|-------|
| 9.1 | Split Brain | Never write custom leader election -- use etcd/Redis SETNX |
| 9.2 | Cascading Failure | Circuit breakers + context timeouts on every outgoing call |
| 9.3 | Partial Write Problem | Outbox Pattern: write event and order in same DB transaction |
| 9.4 | Blind in Production | Propagate trace IDs; OpenTelemetry + Jaeger before multi-service |
| 9.5 | Retry Storm | Exponential backoff + jitter; combine with circuit breaker |

---

## Part 10 -- CI/CD & Registry Cases

| Case | Name | TL;DR |
|------|------|-------|
| 10.1 | Registry Rate Limiting | Run private registry cache; authenticate CI runners |
| 10.2 | Tag Overwrites Break Rollback | Tag with `git-SHA`; deploy specific tag, not `:latest` |
| 10.3 | arm64 vs amd64 Surprise | Use `buildx --platform`; CI must target `linux/amd64` |

---

## Part 11 -- Orchestration -- Swarm & Kubernetes

| Case | Name | TL;DR |
|------|------|-------|
| 11.1 | No Zero-Downtime Rolling Updates | Graceful shutdown + health checks + orchestrator config |
| 11.2 | Overlay Network Packet Loss | Lower VXLAN MTU to physical_MTU - 50 |
| 11.3 | K8s OOMKilled | Profile under load; set limits at 2x typical, not 1x idle |

---

## Part 12 -- Production Patterns & Real Cases

| Case | Name | TL;DR |
|------|------|-------|
| 12.1 | The Log Storm | Structured logging + INFO-only + Docker log rotation |
| 12.2 | MongoDB Oplog Full | Size oplog for bulk op window; monitor replication lag |
| 12.3 | Stale Config in Memory | Background refresh goroutine or Redis pub/sub for live config |
| 12.4 | Migration on Every Replica | Migrations = Init Container or separate job, never app startup |
| 12.5 | Metrics Without SLOs | Alert on SLO burn rate (latency + error rate), not CPU% |

---

## Always Do / Never Do

### Always Do

```
Multi-stage builds (1.1)
Pin base image versions (1.4)
.dockerignore present (1.3)
Non-root USER in Dockerfile (1.5)
exec form CMD (2.1)
Startup env validation (2.2)
Real health check endpoint (2.3)
tini/dumb-init as PID 1 if spawning children (2.4)
Named volumes for all stateful services (4.1)
service_healthy condition in depends_on (5.1)
Resource limits on every container (6.1)
GOMEMLIMIT set for Go apps (6.2)
automaxprocs imported for Go apps (6.3)
Secrets as files, not ENV (7.1)
Immutable image tags in CI (10.2)
buildx for CI image builds (10.3)
Graceful shutdown handlers (11.1)
Structured logging with levels (12.1)
Migrations as separate init step (12.4)
SLO-based alerting (12.5)
```

### Never Do

```
FROM image:latest in production Dockerfiles
COPY . . before dependency install
Running app processes as root
Using localhost for inter-container communication
EXPOSE as a substitute for port publishing
docker compose down -v in production
Storing passwords/keys in ENV vars
Mounting /var/run/docker.sock in containers
In-memory session state in horizontally scaled services
Running migrations in app startup code for multi-replica deploys
Retries without exponential backoff + jitter
Resource limits based on idle-state measurement
Alerts only on infrastructure metrics (CPU, RAM%)
```

---

## Related Tools & Patterns

| Problem | Tool / Pattern |
|---------|---------------|
| Multi-stage image builds | Docker Buildx |
| Go memory limit | GOMEMLIMIT, runtime/debug.SetMemoryLimit |
| Go CPU limit | uber-go/automaxprocs |
| PID 1 / signal handling | tini, dumb-init |
| Connection pooling | PgBouncer |
| Circuit breaker (Go) | sony/gobreaker, cenkalti/backoff |
| Outbox / CDC | Debezium, golang-migrate |
| Distributed tracing | OpenTelemetry, Jaeger, Tempo |
| Secrets management | Docker Secrets, HashiCorp Vault, AWS Secrets Manager |
| Rootless builds in CI | kaniko, podman, img |
| Registry mirror | ECR, GCR, self-hosted registry:2 |

---

*For full case details with real patterns and solutions, see [case_study.md](./case_study.md)*

*12 Parts * 60 Cases -- Docker, Go, Node.js, PostgreSQL, Redis, RabbitMQ, MongoDB, Docker Swarm, Kubernetes*
