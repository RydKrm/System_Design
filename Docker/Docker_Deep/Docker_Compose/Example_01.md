# Production Grade Docker Compose — A Complete Guide for Your Microservices Project

_Written the way a senior engineer explains it to a new intern on day one._

---

## Part One — What Does "Production Grade" Actually Mean?

Before we touch a single line of Docker Compose, you need to understand what separates a production grade setup from something you write just to make things run locally. When you are learning, you write a compose file that just works — containers start, ports are exposed, and you call it done. Production is a completely different mindset.

In production, your system needs to survive failures. A container must restart if it crashes. A database must not lose its data when you bring the stack down. A secret like a database password must not be written as plain text in a file that gets committed to Git. Your services must not be able to talk to each other unless they are supposed to. If one service is consuming 100% CPU, it must not be allowed to starve every other service on the machine. When something goes wrong at 2 AM, you must be able to look at logs and understand exactly what happened.

A production grade Docker Compose file is designed with all of these things in mind from the very beginning, not as an afterthought.

---

## Part Two — The Best Practices You Must Follow

### Always Pin Your Image Versions

When you write `image: postgres`, Docker pulls whatever the latest version of PostgreSQL happens to be on that day. If you deploy on Monday and your colleague deploys on Friday, you might be running different versions of Postgres without knowing it. The solution is to always write the exact version, like `image: postgres:16.3-alpine`. The `alpine` tag means you are using a minimal Linux distribution, which makes your image smaller and reduces the attack surface for security vulnerabilities.

```
BAD  → image: postgres
GOOD → image: postgres:16.3-alpine
```

### Never Put Secrets in Plain Text

This is the mistake that gets companies breached. If you write `POSTGRES_PASSWORD: mysecretpassword` in your compose file and commit it to GitHub, that password is now public forever, even if you delete the file later — Git history remembers everything. The right approach is to use Docker Secrets or environment variable files that are added to `.gitignore`. In our compose file, we will use a `.env` file for configuration and Docker Secrets for sensitive credentials.

### Resource Limits Are Not Optional

Every service in your compose file must have a memory limit and a CPU limit. Without them, a single misbehaving service can consume all available memory on your host machine, causing every other service to be killed by the Linux OOM (Out of Memory) killer. You set limits using the `deploy.resources` block, which tells Docker the maximum resources a container is allowed to use, and the reservation, which is the minimum guaranteed to it.

```
Imagine your server has 8 GB of RAM

Without limits:
┌────────────────────────────────────┐
│  Service A  →  uses 7 GB 😱        │
│  Service B  →  gets killed         │
│  Service C  →  gets killed         │
└────────────────────────────────────┘

With limits:
┌────────────────────────────────────┐
│  Service A  →  limit: 512MB  ✅    │
│  Service B  →  limit: 512MB  ✅    │
│  Service C  →  limit: 256MB  ✅    │
└────────────────────────────────────┘
```

### Health Checks Tell Docker When a Service is Ready

A container being "started" and a container being "ready" are two very different things. When Postgres starts, it takes a few seconds to initialize its data directory and begin accepting connections. If your Go service tries to connect during that window, it will fail. Health checks solve this by letting Docker know when a container is genuinely ready to serve traffic. You define a command that Docker runs periodically inside the container, and only when that command succeeds does Docker consider the container healthy.

### Restart Policies Keep Your System Alive

In production, things crash. A service might run out of memory, encounter a bug, or lose its connection to a dependency. The `restart: unless-stopped` policy tells Docker to automatically restart a container whenever it exits for any reason, unless you explicitly stopped it yourself. This is the minimum baseline for any service you care about.

### Networks Isolate Your Services

By default, if you put everything in one Docker network, every container can talk to every other container. That means your frontend service could technically connect directly to your Postgres database, bypassing your API. In a production system, you create multiple networks and assign each service only to the networks it genuinely needs. Your database should only be reachable from the services that query it — nothing else.

```
INSECURE (default - everyone talks to everyone):
┌─────────────────────────────────────────┐
│  gateway ←──→ user-service              │
│      ↕             ↕                    │
│  postgres ←──→ kafka  ←──→ redis        │
└─────────────────────────────────────────┘

SECURE (network segmentation):
┌──────────────┐    ┌─────────────────────┐
│  frontend-net│    │  backend-net        │
│  gateway     │───▶│  user-service       │
└──────────────┘    │  order-service      │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │  data-net           │
                    │  postgres           │
                    │  redis              │
                    │  kafka              │
                    └─────────────────────┘
```

### Named Volumes Persist Your Data

When a container is removed and recreated, all data inside it is lost. Named volumes live outside the container lifecycle — they exist on your host machine and survive container restarts, updates, and removals. Every stateful service (Postgres, Redis, Kafka) must use a named volume.

### Structured Logging With Limits

By default, Docker logs grow forever and will eventually fill your disk. You configure the `logging` driver with a maximum file size and a maximum number of rotated log files. For production, the `json-file` driver with size limits is a solid baseline, and it integrates perfectly with the OpenTelemetry collector you are already using.

### Dependency Ordering With `depends_on` and Conditions

`depends_on` with `condition: service_healthy` tells Docker Compose not to start a service until its dependency has passed its health check. This is the correct way to handle startup ordering in a distributed system.

---

## Part Three — How to Structure This Specific Project

Your project has 12 microservices plus an API gateway. On top of that, you have infrastructure services: PostgreSQL, Kafka (with Zookeeper), Redis, Grafana, and the OpenTelemetry collector. Trying to put all of this in a single `docker-compose.yml` file would create a 600-line monster that nobody can read or maintain.

The professional way to handle this is to split the compose configuration across multiple files and use Docker Compose's override mechanism to merge them together. Here is the structure we will use:

```
project-root/
│
├── docker-compose.yml          ← infrastructure services only
│                                 (postgres, kafka, redis, grafana, otel)
│
├── docker-compose.services.yml ← all 12 microservices + gateway
│
├── docker-compose.override.yml ← local dev overrides (volume mounts, debug ports)
│                                 (this file is NOT committed to Git)
│
├── .env                        ← non-secret configuration (port numbers, image tags)
│                               ← this IS committed to Git (no secrets here)
│
├── .env.secrets                ← secret credentials
│                               ← this is NEVER committed to Git
│
└── secrets/                    ← Docker secret files
    ├── postgres_password.txt
    └── redis_password.txt
```

You run the full stack with:

```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d
```

The reason we separate infrastructure from services is practical. When you are working on the `order-service`, you might want to restart just the infrastructure layer and keep all services fresh. Separation makes that easy and clean.

For each of your 12 Go services, you will have a `Dockerfile` in its own directory using a multi-stage build. The first stage compiles the Go binary with CGO disabled for a fully static binary, and the second stage copies only that binary into a `scratch` or `distroless` image, producing a final image of around 10–15 MB instead of hundreds of megabytes.

---

## Part Four — The Docker Compose Files

### `.env` — Environment Configuration

```env
# Image versions — change these to upgrade
POSTGRES_VERSION=16.3-alpine
REDIS_VERSION=7.2-alpine
KAFKA_VERSION=7.6.1
ZOOKEEPER_VERSION=7.6.1
GRAFANA_VERSION=10.4.2
OTEL_COLLECTOR_VERSION=0.100.0

# Postgres config
POSTGRES_USER=appuser
POSTGRES_DB=appdb
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Kafka
KAFKA_BROKER_PORT=9092
KAFKA_EXTERNAL_PORT=29092

# Grafana
GRAFANA_PORT=3000

# OTEL
OTEL_GRPC_PORT=4317
OTEL_HTTP_PORT=4318

# API Gateway
GATEWAY_PORT=8080

# Service image tag — set this in your CI/CD pipeline
APP_VERSION=latest
```

---

### `docker-compose.yml` — Infrastructure Layer

```yaml
# docker-compose.yml
# ─────────────────────────────────────────────────────────────────────────────
# INFRASTRUCTURE LAYER
# This file defines all the external systems your microservices depend on.
# Postgres, Kafka, Zookeeper, Redis, Grafana, OpenTelemetry Collector.
# ─────────────────────────────────────────────────────────────────────────────

name: myapp

# ─── SECRETS ─────────────────────────────────────────────────────────────────
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  redis_password:
    file: ./secrets/redis_password.txt

# ─── NAMED VOLUMES ───────────────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  kafka_data:
    driver: local
  zookeeper_data:
    driver: local
  zookeeper_log:
    driver: local
  grafana_data:
    driver: local
  otel_data:
    driver: local

# ─── NETWORKS ────────────────────────────────────────────────────────────────
networks:
  gateway_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24

  services_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.1.0/24

  data_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.2.0/24

  observability_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.3.0/24

# ─── REUSABLE CONFIG ANCHORS ─────────────────────────────────────────────────
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "50m"
    max-file: "5"
    tag: "{{.Name}}"

x-restart-policy: &restart-policy
  restart: unless-stopped

x-resource-defaults: &resource-defaults
  deploy:
    resources:
      limits:
        cpus: "0.50"
        memory: 512M
      reservations:
        cpus: "0.10"
        memory: 128M

# ─── SERVICES ─────────────────────────────────────────────────────────────────
services:

  # ── POSTGRESQL ──────────────────────────────────────────────────────────────
  postgres:
    image: postgres:${POSTGRES_VERSION}
    container_name: myapp-postgres
    <<: *restart-policy
    secrets:
      - postgres_password
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init:/docker-entrypoint-initdb.d:ro
    networks:
      - data_net
    ports:
      - "127.0.0.1:${POSTGRES_PORT}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "1.00"
          memory: 1G
        reservations:
          cpus: "0.25"
          memory: 256M
    logging: *default-logging
    shm_size: 256mb

  # ── ZOOKEEPER ───────────────────────────────────────────────────────────────
  zookeeper:
    image: confluentinc/cp-zookeeper:${ZOOKEEPER_VERSION}
    container_name: myapp-zookeeper
    <<: *restart-policy
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_SYNC_LIMIT: 2
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
      - zookeeper_log:/var/lib/zookeeper/log
    networks:
      - data_net
    healthcheck:
      test: ["CMD-SHELL", "echo ruok | nc localhost 2181 | grep -q imok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 512M
        reservations:
          cpus: "0.10"
          memory: 128M
    logging: *default-logging

  # ── KAFKA ───────────────────────────────────────────────────────────────────
  kafka:
    image: confluentinc/cp-kafka:${KAFKA_VERSION}
    container_name: myapp-kafka
    <<: *restart-policy
    depends_on:
      zookeeper:
        condition: service_healthy
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:${KAFKA_EXTERNAL_PORT}
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
      KAFKA_LOG_RETENTION_CHECK_INTERVAL_MS: 300000
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_JVM_PERFORMANCE_OPTS: "-XX:+UseG1GC -XX:MaxGCPauseMillis=20"
      KAFKA_HEAP_OPTS: "-Xmx512M -Xms256M"
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - data_net
    ports:
      - "127.0.0.1:${KAFKA_EXTERNAL_PORT}:29092"
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 45s
    deploy:
      resources:
        limits:
          cpus: "1.00"
          memory: 1G
        reservations:
          cpus: "0.25"
          memory: 256M
    logging: *default-logging

  # ── REDIS ───────────────────────────────────────────────────────────────────
  redis:
    image: redis:${REDIS_VERSION}
    container_name: myapp-redis
    <<: *restart-policy
    secrets:
      - redis_password
    command: >
      sh -c "redis-server
      --requirepass $$(cat /run/secrets/redis_password)
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1
      --loglevel notice"
    volumes:
      - redis_data:/data
    networks:
      - data_net
    ports:
      - "127.0.0.1:${REDIS_PORT}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 384M
        reservations:
          cpus: "0.05"
          memory: 64M
    logging: *default-logging

  # ── OPENTELEMETRY COLLECTOR ─────────────────────────────────────────────────
  otel-collector:
    image: otel/opentelemetry-collector-contrib:${OTEL_COLLECTOR_VERSION}
    container_name: myapp-otel-collector
    <<: *restart-policy
    command: ["--config=/etc/otel/config.yaml"]
    volumes:
      - ./infra/otel/config.yaml:/etc/otel/config.yaml:ro
      - otel_data:/var/lib/otelcol
    networks:
      - services_net
      - observability_net
    ports:
      - "127.0.0.1:${OTEL_GRPC_PORT}:4317"
      - "127.0.0.1:${OTEL_HTTP_PORT}:4318"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:13133/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.05"
          memory: 64M
    logging: *default-logging

  # ── PROMETHEUS ──────────────────────────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.52.0
    container_name: myapp-prometheus
    <<: *restart-policy
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - observability_net
    ports:
      - "127.0.0.1:9090:9090"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 512M
        reservations:
          cpus: "0.10"
          memory: 128M
    logging: *default-logging

  # ── GRAFANA ─────────────────────────────────────────────────────────────────
  grafana:
    image: grafana/grafana:${GRAFANA_VERSION}
    container_name: myapp-grafana
    <<: *restart-policy
    depends_on:
      prometheus:
        condition: service_healthy
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD__FILE: /run/secrets/redis_password
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_ANALYTICS_REPORTING_ENABLED: "false"
      GF_SERVER_ROOT_URL: "http://localhost:${GRAFANA_PORT}"
      GF_INSTALL_PLUGINS: "grafana-clock-panel,grafana-simple-json-datasource"
    secrets:
      - redis_password
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infra/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./infra/grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - observability_net
    ports:
      - "127.0.0.1:${GRAFANA_PORT}:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.10"
          memory: 64M
    logging: *default-logging
```

---

### `docker-compose.services.yml` — Application Services Layer

```yaml
# docker-compose.services.yml
# ─────────────────────────────────────────────────────────────────────────────
# APPLICATION SERVICES LAYER
# All 12 microservices + the API Gateway.
# Each service is a compiled Go binary running in a minimal container.
# ─────────────────────────────────────────────────────────────────────────────

# ─── REUSABLE ANCHORS ────────────────────────────────────────────────────────
x-service-defaults: &service-defaults
  restart: unless-stopped
  networks:
    - services_net
    - observability_net
  logging:
    driver: json-file
    options:
      max-size: "20m"
      max-file: "3"
      tag: "{{.Name}}"
  deploy:
    resources:
      limits:
        cpus: "0.50"
        memory: 256M
      reservations:
        cpus: "0.05"
        memory: 64M

x-go-service-env: &go-service-env
  POSTGRES_HOST: postgres
  POSTGRES_PORT: 5432
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_DB: ${POSTGRES_DB}
  KAFKA_BROKERS: kafka:9092
  REDIS_HOST: redis
  REDIS_PORT: 6379
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  OTEL_EXPORTER_OTLP_PROTOCOL: grpc
  OTEL_SERVICE_VERSION: ${APP_VERSION}
  GO_ENV: production

services:

  # ── API GATEWAY ──────────────────────────────────────────────────────────────
  api-gateway:
    image: myapp/api-gateway:${APP_VERSION}
    container_name: myapp-api-gateway
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
      target: production
      cache_from:
        - myapp/api-gateway:latest
    <<: *service-defaults
    networks:
      - gateway_net
      - services_net
      - observability_net
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: api-gateway
      GATEWAY_PORT: 8080
    secrets:
      - postgres_password
      - redis_password
    ports:
      - "${GATEWAY_PORT}:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── USER SERVICE ─────────────────────────────────────────────────────────────
  user-service:
    image: myapp/user-service:${APP_VERSION}
    container_name: myapp-user-service
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: user-service
      GRPC_PORT: 50051
    secrets:
      - postgres_password
      - redis_password
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50051"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── ORDER SERVICE ─────────────────────────────────────────────────────────────
  order-service:
    image: myapp/order-service:${APP_VERSION}
    container_name: myapp-order-service
    build:
      context: ./services/order-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: order-service
      GRPC_PORT: 50052
    secrets:
      - postgres_password
      - redis_password
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50052"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── PRODUCT SERVICE ───────────────────────────────────────────────────────────
  product-service:
    image: myapp/product-service:${APP_VERSION}
    container_name: myapp-product-service
    build:
      context: ./services/product-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: product-service
      GRPC_PORT: 50053
    secrets:
      - postgres_password
      - redis_password
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50053"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── PAYMENT SERVICE ───────────────────────────────────────────────────────────
  payment-service:
    image: myapp/payment-service:${APP_VERSION}
    container_name: myapp-payment-service
    build:
      context: ./services/payment-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: payment-service
      GRPC_PORT: 50054
    secrets:
      - postgres_password
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50054"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── INVENTORY SERVICE ─────────────────────────────────────────────────────────
  inventory-service:
    image: myapp/inventory-service:${APP_VERSION}
    container_name: myapp-inventory-service
    build:
      context: ./services/inventory-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: inventory-service
      GRPC_PORT: 50055
    secrets:
      - postgres_password
      - redis_password
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50055"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── NOTIFICATION SERVICE ──────────────────────────────────────────────────────
  notification-service:
    image: myapp/notification-service:${APP_VERSION}
    container_name: myapp-notification-service
    build:
      context: ./services/notification-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: notification-service
    depends_on:
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── AUTH SERVICE ──────────────────────────────────────────────────────────────
  auth-service:
    image: myapp/auth-service:${APP_VERSION}
    container_name: myapp-auth-service
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: auth-service
      GRPC_PORT: 50056
    secrets:
      - postgres_password
      - redis_password
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50056"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── SEARCH SERVICE ────────────────────────────────────────────────────────────
  search-service:
    image: myapp/search-service:${APP_VERSION}
    container_name: myapp-search-service
    build:
      context: ./services/search-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: search-service
      GRPC_PORT: 50057
    secrets:
      - redis_password
    depends_on:
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50057"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── ANALYTICS SERVICE ─────────────────────────────────────────────────────────
  analytics-service:
    image: myapp/analytics-service:${APP_VERSION}
    container_name: myapp-analytics-service
    build:
      context: ./services/analytics-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: analytics-service
    secrets:
      - postgres_password
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── REPORT SERVICE ────────────────────────────────────────────────────────────
  report-service:
    image: myapp/report-service:${APP_VERSION}
    container_name: myapp-report-service
    build:
      context: ./services/report-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: report-service
      GRPC_PORT: 50058
    secrets:
      - postgres_password
    depends_on:
      postgres:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50058"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── WEBSOCKET SERVICE ─────────────────────────────────────────────────────────
  websocket-service:
    image: myapp/websocket-service:${APP_VERSION}
    container_name: myapp-websocket-service
    build:
      context: ./services/websocket-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    networks:
      - gateway_net
      - services_net
      - observability_net
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: websocket-service
      WS_PORT: 8081
    secrets:
      - redis_password
    depends_on:
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8081/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── FILE SERVICE ──────────────────────────────────────────────────────────────
  file-service:
    image: myapp/file-service:${APP_VERSION}
    container_name: myapp-file-service
    build:
      context: ./services/file-service
      dockerfile: Dockerfile
      target: production
    <<: *service-defaults
    environment:
      <<: *go-service-env
      OTEL_SERVICE_NAME: file-service
      GRPC_PORT: 50059
    secrets:
      - postgres_password
    volumes:
      - ./data/uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      otel-collector:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/app/grpc-health-probe", "-addr=:50059"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
```

---

### The Go Service `Dockerfile` (same pattern for all 12 services)

```dockerfile
# ── STAGE 1: BUILD ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Copy dependency files first — Docker caches this layer separately.
# If your code changes but go.mod doesn't, Docker skips the download step.
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Now copy source and build the binary.
# CGO_ENABLED=0 → pure Go, no C dependencies → fully static binary
# GOOS=linux → cross-compile for Linux even if you build on Mac
# -trimpath → removes local file paths from the binary (security)
# -ldflags → strips debug info (smaller binary) and injects version
COPY . .
ARG APP_VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X main.version=${APP_VERSION}" \
    -o /build/service \
    ./cmd/main.go

	# ── STAGE 2: PRODUCTION IMAGE ─────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS production

# Run as non-root user — distroless provides uid 65532 (nonroot)
USER nonroot:nonroot

# Copy ONLY the compiled binary from the builder stage.
# No Go toolchain, no source code, no shell, no package manager.
COPY --from=builder --chown=nonroot:nonroot /build/service /app/service

# Copy the gRPC health probe binary (downloaded during CI or baked into builder)
COPY --from=builder --chown=nonroot:nonroot /build/grpc-health-probe /app/grpc-health-probe

EXPOSE 50051

ENTRYPOINT ["/app/service"]
```

---

## Part Five — Line by Line Explanation

Now we are going to walk through the entire compose file and explain every single line. Do not skip this section. Understanding _why_ every line exists is what separates an engineer who can maintain a system from one who can only copy-paste.

### The `name` field

```yaml
name: myapp
```

This gives your entire Docker Compose project a name. Without this, Docker Compose uses the directory name as the project name. If two engineers clone the repo into differently named folders, their project names differ, and commands like `docker compose ps` show different things. Naming it explicitly makes behavior consistent everywhere.

### The `secrets` block

```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

This is one of the most important blocks in the entire file. Docker Secrets work by mounting a file at `/run/secrets/secret_name` inside the container. The application reads the password from that file path, not from an environment variable. Why does this matter? Environment variables are visible in `docker inspect`, in process listings (`/proc/PID/environ`), and often get leaked into error messages and logs. A file at `/run/secrets/` is mounted in a `tmpfs` (RAM-backed, never written to disk) and is only accessible to the process that needs it. You must create the `./secrets/` directory and add it to `.gitignore`.

### The `volumes` block

```yaml
volumes:
  postgres_data:
    driver: local
```

Named volumes are defined here at the top level and then referenced inside each service. When you define them here, Docker manages their lifecycle independently of any container. You can do `docker compose down` and your Postgres data survives because the volume still exists. You have to explicitly run `docker compose down -v` to delete volumes. This is intentional — it protects you from accidentally wiping your database. The `driver: local` means Docker stores the volume on the host machine's filesystem using its default storage backend.

### The `networks` block with subnets

```yaml
networks:
  data_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.2.0/24
```

Every network gets its own subnet. The `bridge` driver creates an isolated virtual network on your Docker host. The `ipam` (IP Address Management) config with an explicit subnet prevents Docker from randomly assigning subnets on every machine, which would make firewall rules unreliable. With explicit subnets, `172.20.2.0/24` will always be your data network, and you can write firewall rules that depend on it.

```
Your Host Machine
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  bridge: gateway_net   172.20.0.0/24                    │
│  ┌──────────────┐                                       │
│  │ api-gateway  │                                       │
│  └──────┬───────┘                                       │
│         │                                               │
│  bridge: services_net  172.20.1.0/24                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │user-svc   │  │order-svc  │  │auth-svc   │  ...       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │
│        │              │              │                  │
│  bridge: data_net     172.20.2.0/24                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ postgres │  │  kafka   │  │  redis   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

### YAML Anchors (`x-` prefix and `&`, `<<`, `*`)

```yaml
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "50m"
    max-file: "5"

# used like this:
some-service:
  logging: *default-logging
```

YAML anchors are the compose file's version of copy-paste, but better. The `&default-logging` defines an anchor. The `*default-logging` inserts it wherever you use it. The `<<:` syntax is a merge key — it merges all keys from the referenced anchor into the current block. When you need to change the log size limit across all 13 services, you change it in one place. This is the DRY principle applied to infrastructure.

### The `healthcheck` block in detail

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Each field here has a precise meaning. `test` is the command Docker runs inside the container to check if it is healthy. `CMD-SHELL` means run the command through the shell (so environment variables work). `interval` is how often Docker runs the check. `timeout` is how long Docker waits for the command before declaring it failed. `retries` is how many consecutive failures before Docker marks the container as unhealthy. `start_period` is the grace period — for the first 30 seconds, a failing health check does not count against the retry limit, giving the service time to initialize.

```
Timeline for a service starting up:

t=0s  Container starts
      │
t=30s start_period ends — health checks now count
      │
t=40s 1st check → FAIL  (1/5 retries used)
      │
t=50s 2nd check → FAIL  (2/5 retries used)
      │
t=60s 3rd check → PASS  → container is now "healthy" ✅
      │
      Dependent services are now allowed to start
```

### The `deploy.resources` block

```yaml
deploy:
  resources:
    limits:
      cpus: "1.00"
      memory: 1G
    reservations:
      cpus: "0.25"
      memory: 256M
```

`limits` is a hard ceiling. The container is absolutely not allowed to exceed these values. If a process tries to allocate more memory than the limit, it gets killed with an OOM error. `reservations` is a soft guarantee. Docker will ensure that at least this much CPU and memory is available to this container before scheduling it. Think of it as the difference between a maximum speed limit and a minimum guaranteed lane width on a highway. Postgres gets more generous limits because it is your most critical stateful service.

### Port binding with `127.0.0.1:`

```yaml
ports:
  - "127.0.0.1:${POSTGRES_PORT}:5432"
```

This is a security detail most junior engineers miss. If you write `5432:5432`, Docker binds to `0.0.0.0:5432`, meaning any network interface on your host can reach Postgres — including the public internet if your firewall has a gap. By prefixing with `127.0.0.1:`, you bind only to localhost. The only way to reach this port is from the same machine. Your services communicate with Postgres through the Docker network (no port binding needed), and you access it from your laptop for debugging via the localhost binding. The API gateway is the only service bound to `0.0.0.0` intentionally, because it needs to accept external traffic.

### `PGDATA` environment variable

```yaml
environment:
  PGDATA: /var/lib/postgresql/data/pgdata
```

This is a subtle but important Postgres-specific setting. By default, Postgres stores data directly at `/var/lib/postgresql/data`. If you mount a named volume there, Postgres sometimes has trouble with the directory not being empty (Docker creates a lost+found directory in new volumes on some filesystems). By setting `PGDATA` to a subdirectory, you avoid this class of initialization errors entirely.

### `shm_size` for Postgres

```yaml
shm_size: 256mb
```

PostgreSQL uses shared memory extensively for its buffer pool and process coordination. Docker containers by default have only 64MB of shared memory (`/dev/shm`). Under heavy query load, Postgres will crash with cryptic errors about not being able to allocate shared memory. Setting `shm_size` to 256MB prevents this. If you see Postgres behaving erratically under load, this is often the culprit.

### Kafka's dual-listener configuration

```yaml
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT
KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:29092
KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
```

This is the most confusing part of the Kafka setup, so let us spend a moment on it. Kafka needs two listeners because it serves two different audiences. Your Go microservices, running inside Docker, connect to Kafka using the service name `kafka:9092` — this is the `INTERNAL` listener. But when you run a Kafka tool from your laptop (outside Docker), `kafka:9092` does not resolve because that hostname only exists inside Docker's network. So Kafka also listens on `localhost:29092` — the `EXTERNAL` listener. When a client connects, Kafka tells it "come back to this address for the actual data". That address is the `ADVERTISED_LISTENER`. Without this split configuration, either your services or your developer tools will fail to connect.

```
Inside Docker:
  go-service → connects to kafka:9092 (INTERNAL listener)
  Kafka responds: "reconnect to kafka:9092" ✅

Outside Docker (your laptop):
  kafka-console-consumer → connects to localhost:29092 (EXTERNAL listener)
  Kafka responds: "reconnect to localhost:29092" ✅
```

### Redis `command` with secret injection

```yaml
command: >
  sh -c "redis-server
  --requirepass $$(cat /run/secrets/redis_password)
  --maxmemory 256mb
  --maxmemory-policy allkeys-lru
  --save 60 1"
```

Redis does not natively support Docker Secrets, so we use a shell trick. The `$$(...)` syntax — double dollar sign — tells Docker Compose to pass through a literal `$(...)` to the shell, which then executes `cat /run/secrets/redis_password` at runtime to read the password from the secret file. The `--maxmemory-policy allkeys-lru` is critical: it tells Redis to evict the least recently used keys when memory is full, rather than crashing or refusing writes. The `--save 60 1` means "write to disk if at least 1 key changed in the last 60 seconds", giving you a reasonable balance of durability and performance.

### The `depends_on` with `condition`

```yaml
depends_on:
  postgres:
    condition: service_healthy
  kafka:
    condition: service_healthy
```

Without `condition: service_healthy`, `depends_on` only waits for the container to start — not for it to be ready. With `service_healthy`, Docker Compose waits until the dependency has passed its health check before starting this service. This is the correct way to handle the classic "my service tried to connect to the database before it was ready" problem. The entire startup chain is ordered correctly.

```
Startup order for order-service:

zookeeper starts
    │
    └── zookeeper becomes healthy
            │
            └── kafka starts
                    │
                    └── kafka becomes healthy
                            │
postgres starts ────────────┤
    │                       │
    └── postgres becomes    │
        healthy             │
            │               │
            └───────────────┴─── order-service starts ✅
```

### The `x-go-service-env` anchor

```yaml
x-go-service-env: &go-service-env
  POSTGRES_HOST: postgres
  KAFKA_BROKERS: kafka:9092
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  OTEL_EXPORTER_OTLP_PROTOCOL: grpc
```

Every Go service gets this same base environment. Notice that `POSTGRES_HOST` is `postgres` — this is the service name from the compose file, which Docker's internal DNS resolves to the Postgres container's IP address. No hardcoded IP addresses, no external DNS. This is how Docker networking is supposed to be used. The `OTEL_EXPORTER_OTLP_ENDPOINT` tells every service where to send its traces and metrics — your OpenTelemetry collector, which then forwards them to Prometheus and Grafana.

### The multi-stage build in the Dockerfile

```
STAGE 1 (builder):                  STAGE 2 (production):
┌────────────────────────┐          ┌────────────────────────┐
│ golang:1.22-alpine     │          │ distroless/static      │
│ ~300 MB                │          │ ~2 MB                  │
│                        │          │                        │
│ go.mod + go.sum        │  COPY    │                        │
│ source code            │ ──────▶  │ /app/service (binary)  │
│ compiled binary        │  binary  │ /app/grpc-health-probe │
│ Go toolchain           │  only    │                        │
│ git, make, etc         │          │ NO shell               │
│                        │          │ NO package manager     │
└────────────────────────┘          │ NO source code         │
                                    │ NO Go toolchain        │
  Final image size:                 └────────────────────────┘
  ~12 MB instead of ~300 MB
```

The `distroless` base image from Google contains literally nothing except the minimum required to run a statically linked binary and SSL certificates. There is no shell, no `ls`, no `cat`. If an attacker somehow gets code execution inside your container, they have almost nothing to work with. This is defense in depth at the container level.

---

## Part Six — How to Use This in CI/CD

Your CI/CD pipeline (GitHub Actions, GitLab CI, or similar) should follow this flow:

```
Push to main branch
        │
        ▼
[CI: Test]
  go test ./...
  golangci-lint run
        │
        ▼
[CI: Build & Tag Images]
  docker build --target production \
    --build-arg APP_VERSION=$GIT_SHA \
    -t myapp/user-service:$GIT_SHA \
    -t myapp/user-service:latest \
    ./services/user-service
        │
        ▼
[CI: Push to Registry]
  docker push myapp/user-service:$GIT_SHA
  docker push myapp/user-service:latest
        │
        ▼
[CD: Deploy]
  ssh into server
  export APP_VERSION=$GIT_SHA
  docker compose -f docker-compose.yml \
    -f docker-compose.services.yml \
    pull
  docker compose -f docker-compose.yml \
    -f docker-compose.services.yml \
    up -d --no-deps \
    user-service order-service ...
```

The `--no-deps` flag tells Compose to restart only the listed services, not their dependencies. This means you can deploy a new version of `user-service` without restarting Postgres. The `pull` before `up` ensures the server fetches the new image before trying to run it.

---

## The Complete Architecture at a Glance

```
                         ┌───────────────--──┐
                         │   CLIENT / BROWSER│
                         └────────┬─────--───┘
                                  │  HTTP / WebSocket
                                  ▼
                    ┌─────────────────────────┐
                    │      api-gateway        │  :8080
                    │   (gateway_net)         │
                    └──────────┬──────────────┘
                               │  gRPC (services_net)
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                     ▼
   ┌────────────┐      ┌─────────-───┐       ┌─────────────┐
   │user-service│      │order-service│       │auth-service │
   └─────┬──────┘      └──────┬───-──┘       └──────┬──────┘
         │                    │                     │
         │    (data_net)      │                     │
         └──────────┬─────────┘─────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│postgres │   │  kafka  │   │  redis  │
└─────────┘   └─────────┘   └─────────┘
     │               │
     └──────┬────────┘
            │  (observability_net)
            ▼
   ┌─────────────────┐
   │  otel-collector │
   └────────┬────────┘
            │
     ┌──────┴───────┐
     ▼              ▼
┌──────────┐  ┌─────────┐
│prometheus│  │ grafana │
└──────────┘  └─────────┘
```

This is your production system. Every piece of infrastructure has a health check. Every secret is protected. Every service has resource limits. Every network is isolated. Every piece of data is persisted in a named volume. And when something goes wrong, OpenTelemetry traces tell you exactly which service failed, on which request, and why.