# Managing Environment Variables in Docker and Docker Compose — The Complete Guide

_The same senior engineer. Same whiteboard. But today we need to fix a very common misconception first._

---

## The Misconception We Need to Clear Up First

Before anything else, I need to explain something that trips up almost every developer who is new to Docker. When you said "the `.env` file should not be added to Docker, it must be added at build time", I think you mean something very specific — and it is worth making that precise before we write a single line of YAML.

There are two completely separate phases in Docker's world, and environment variables mean completely different things in each one.

**Build time** is when Docker executes your `Dockerfile` and creates an image. At this point, no container is running yet. Docker is reading your source code, compiling your Go binary, and baking the result into a reusable image layer. Build-time variables are called `ARG` in Dockerfile language. They exist only during the image creation process. Once the image is built, they are gone — they do not live inside the running container.

**Runtime** is when Docker takes your built image and actually starts a container from it. This is when your Go binary executes, connects to Postgres, and serves HTTP requests. Runtime variables are called `ENV` in Dockerfile language, and they are passed via `environment:` in your compose file. These are what your Go code reads with `os.Getenv()`.

```
BUILD TIME                           RUNTIME
──────────────────────────────────   ──────────────────────────────────
docker build -f Dockerfile .         docker run / docker compose up
       │                                    │
       │  Dockerfile executes               │  Your Go binary executes
       │  Go binary is compiled             │  Postgres is connected
       │  Image layers are created          │  HTTP server starts
       │                                    │
       │  ARG variables exist here          │  ENV variables exist here
       │  They are GONE after build         │  os.Getenv() reads these
       ▼                                    ▼
  myapp/user-service:v1.4.2            Running container
  (an image file, stored in            (a live process, consuming RAM)
   Docker's image cache)
```

Now here is the rule you are asking about. The `.env` file is a **runtime** thing — Docker Compose reads it and injects its values into running containers. Your Go binary reads those values while it is running. That is correct and that is fine.

What you absolutely must not do is `COPY .env .` inside your Dockerfile. If you do that, the `.env` file — with your database passwords, API keys, and secrets — gets baked permanently into the image. Anyone who pulls your image can run `docker run --rm myapp/service cat .env` and read every secret. This is how companies get breached. The `.env` file never goes inside the image.

Now that this is clear, let us cover every mechanism Docker gives you, from build time all the way to runtime.

---

## Part One — Build Time: ARG in the Dockerfile

`ARG` is a Dockerfile instruction that declares a variable that can be passed in at `docker build` time. It exists only during the build process. By the time the image is created and you run a container from it, the `ARG` value is no longer accessible to your application.

Here is what a proper Dockerfile for your Go service looks like with `ARG`:

```dockerfile
# ── STAGE 1: BUILD ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

# ARG declares a build-time variable.
# The value after = is the default — used when no --build-arg is passed.
ARG APP_VERSION=dev
ARG BUILD_TIME
ARG GIT_COMMIT

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

# We use the ARG values here, injected into the Go binary via ldflags.
# -X main.version injects the value of APP_VERSION into the main.version variable.
# This is the correct way to pass build-time info into a Go binary.
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w \
      -X main.version=${APP_VERSION} \
      -X main.buildTime=${BUILD_TIME} \
      -X main.gitCommit=${GIT_COMMIT}" \
    -o /build/service \
    ./cmd/main.go

# ── STAGE 2: PRODUCTION IMAGE ─────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS production

USER nonroot:nonroot

COPY --from=builder --chown=nonroot:nonroot /build/service /app/service

# ENV sets a runtime environment variable with a default value.
# This CAN be overridden when you start the container.
ENV GO_ENV=production

EXPOSE 8080

ENTRYPOINT ["/app/service"]
```

And in your Go binary, you expose these injected values like this:

```go
// cmd/main.go

package main

// These variables are injected at build time via -ldflags -X.
// They are baked into the binary itself, not read from environment.
var (
    version   = "unknown"
    buildTime = "unknown"
    gitCommit = "unknown"
)

func main() {
    // You can log these at startup so you always know exactly
    // which version of the binary is running.
    log.Printf("starting service version=%s build=%s commit=%s",
        version, buildTime, gitCommit)

    // Runtime configuration comes from environment variables
    cfg := config.Load()
    // ...
}
```

### Passing ARG Values at Build Time

You pass `ARG` values using `--build-arg` when you run `docker build`:

```bash
docker build \
  --build-arg APP_VERSION=v1.4.2 \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  --target production \
  -t myapp/user-service:v1.4.2 \
  ./services/user-service
```

In Docker Compose, you pass build args in the `build:` block:

```yaml
user-service:
  build:
    context: ./services/user-service
    dockerfile: Dockerfile
    target: production
    args:
      APP_VERSION: ${APP_VERSION}        # comes from .env file
      BUILD_TIME: ${BUILD_TIME}          # set by your CI/CD pipeline
      GIT_COMMIT: ${GIT_COMMIT}          # set by your CI/CD pipeline
```

### The Critical Security Rule About ARG

There is one trap with `ARG` that catches even experienced engineers. If you declare an `ARG` and then set an `ENV` from it, the value becomes visible in the image's layer history:

```dockerfile
# DANGEROUS — APP_SECRET is visible in docker history
ARG APP_SECRET
ENV APP_SECRET=${APP_SECRET}
```

Anyone can run `docker history myapp/service --no-trunc` and see the value. Never pass secrets as `ARG`. The rule is simple:

```
Build-time ARG is for:          Build-time ARG is NOT for:
──────────────────────────────  ────────────────────────────
Version numbers                 Passwords
Git commit hashes               API keys
Build timestamps                Database credentials
Feature flags for compilation   Private tokens
```

```
ARG lifecycle:

docker build --build-arg APP_VERSION=v1.4.2
       │
       │  ARG APP_VERSION=v1.4.2 is available here
       │  go build -ldflags="-X main.version=v1.4.2"
       │
       ▼
Image is created (myapp/service:v1.4.2)
       │
       │  ARG value is GONE. It is not in the image.
       │  The value "v1.4.2" is burned into the binary itself via ldflags.
       │
       ▼
docker run myapp/service
       │
       │  os.Getenv("APP_VERSION") → ""  (empty, ARG is gone)
       │  version variable in Go   → "v1.4.2"  (baked into binary ✅)
```

---

## Part Two — Runtime: ENV in the Dockerfile

`ENV` in a Dockerfile sets a variable that persists into the running container. It becomes a default value that can be overridden when starting the container. Think of it as a fallback — if nobody tells the container what the value should be, it uses this default.

```dockerfile
# These are default runtime values baked into the image.
# They CAN be overridden by docker compose environment: block.
ENV GO_ENV=production
ENV LOG_LEVEL=info
ENV HTTP_PORT=8080
ENV GRPC_PORT=50051
```

Your Go code reads these exactly like any other environment variable:

```go
port := os.Getenv("HTTP_PORT")   // returns "8080" unless overridden
```

When you run the container and pass an `environment:` value in compose or a `-e` flag to `docker run`, the compose/run value wins over the Dockerfile `ENV` default:

```
Priority (lowest to highest):

ENV in Dockerfile (default)
    │
    └──▶ overridden by environment: in docker-compose.yml
                │
                └──▶ overridden by shell export before docker compose up
                            │
                            └──▶ overridden by --env-file flag
```

---

## Part Three — The .env File and How Docker Compose Reads It

The `.env` file is a Docker Compose concept. It is not a Docker (Dockerfile) concept. Docker Compose reads it automatically from the same directory where you run `docker compose up`, before it processes the compose YAML file.

Here is the complete picture of what goes in `.env` and what absolutely must not:

```
.env file — SAFE to commit to Git (no secrets here):
┌─────────────────────────────────────────────────────┐
│ # Infrastructure versions                           │
│ POSTGRES_VERSION=16.3-alpine                        │
│ REDIS_VERSION=7.2-alpine                            │
│ KAFKA_VERSION=7.6.1                                 │
│                                                     │
│ # Application config                                │
│ POSTGRES_USER=appuser                               │
│ POSTGRES_DB=appdb                                   │
│ POSTGRES_PORT=5432                                  │
│                                                     │
│ # Ports                                             │
│ REDIS_PORT=6379                                     │
│ GATEWAY_PORT=8080                                   │
│ GRAFANA_PORT=3000                                   │
│ OTEL_GRPC_PORT=4317                                 │
│                                                     │
│ # Deployment info — overridden by CI/CD             │
│ APP_VERSION=latest                                  │
└─────────────────────────────────────────────────────┘

.env.secrets — NEVER commit to Git:
┌─────────────────────────────────────────────────────┐
│ POSTGRES_PASSWORD=s3cur3P@ssword!                   │
│ REDIS_PASSWORD=r3disPwd!                            │
│ GRAFANA_ADMIN_PASSWORD=gr@fanaPwd!                  │
│ JWT_SECRET=super-long-random-jwt-secret-key         │
└─────────────────────────────────────────────────────┘
```

And your `.gitignore` must have:

```gitignore
# .gitignore
.env.secrets
secrets/
*.dump
backups/
```

### How Docker Compose Substitutes Variables

When you write `${POSTGRES_USER}` in your compose file, Docker Compose performs substitution at the moment you run any `docker compose` command. The substitution happens in memory — Docker Compose never modifies your actual compose file.

```yaml
# What you write in docker-compose.yml:
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  APP_VERSION: ${APP_VERSION:-latest}    # :- means "use 'latest' if unset"
  LOG_LEVEL: ${LOG_LEVEL:-info}          # :- is the default-value operator

# What Docker Compose sends to the container (after reading .env):
# POSTGRES_USER=appuser
# APP_VERSION=v1.4.2
# LOG_LEVEL=info
```

The `:-` operator is very useful. It means "use the value from the environment or .env file, but if it is not set at all, fall back to this default". This prevents Docker Compose from crashing when a variable is missing.

---

## Part Four — The Complete Environment Variable System for Your Project

Here is how to structure the entire environment variable system for your 12-service project. This is what production looks like.

### File Structure

```
project-root/
│
├── .env                    ← non-secret config, committed to Git
├── .env.secrets            ← secret values, NEVER committed to Git
├── .env.example            ← template showing required variables, committed to Git
├── .gitignore              ← excludes .env.secrets and secrets/
│
├── secrets/                ← Docker secret files, NEVER committed to Git
│   ├── postgres_password.txt
│   ├── redis_password.txt
│   └── jwt_secret.txt
│
├── docker-compose.yml      ← infrastructure layer
├── docker-compose.services.yml  ← application services layer
│
└── services/
    └── user-service/
        ├── Dockerfile
        └── cmd/
            └── main.go
```

### The `.env.example` File — Always Commit This

This file is what you commit to Git. It shows every variable that is required, with example (non-sensitive) values. When a new developer joins the team, they copy this file to `.env` and fill in the real values:

```bash
# .env.example
# Copy this file to .env and fill in your values.
# NEVER put real passwords or secrets in .env.example.

# ── Infrastructure Versions ───────────────────────────
POSTGRES_VERSION=16.3-alpine
REDIS_VERSION=7.2-alpine
KAFKA_VERSION=7.6.1
ZOOKEEPER_VERSION=7.6.1
GRAFANA_VERSION=10.4.2
OTEL_COLLECTOR_VERSION=0.100.0

# ── Application ───────────────────────────────────────
APP_VERSION=latest
GO_ENV=development

# ── Postgres ──────────────────────────────────────────
POSTGRES_USER=appuser
POSTGRES_DB=appdb
POSTGRES_PORT=5432
# POSTGRES_PASSWORD goes in secrets/postgres_password.txt — not here

# ── Redis ─────────────────────────────────────────────
REDIS_PORT=6379
# REDIS_PASSWORD goes in secrets/redis_password.txt — not here

# ── Ports ─────────────────────────────────────────────
GATEWAY_PORT=8080
GRAFANA_PORT=3000
OTEL_GRPC_PORT=4317
OTEL_HTTP_PORT=4318
KAFKA_EXTERNAL_PORT=29092
```

### The Complete Dockerfile With Proper ARG and ENV Separation

```dockerfile
# ── STAGE 1: BUILD ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

# ── Build-time ARGs ──────────────────────────────────────────────────────────
# These are passed in at build time and baked into the binary.
# They are NOT available at runtime unless explicitly re-declared as ENV.
ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w \
      -X main.version=${APP_VERSION} \
      -X main.gitCommit=${GIT_COMMIT} \
      -X main.buildTime=${BUILD_TIME}" \
    -o /build/service \
    ./cmd/main.go

# Download grpc health probe binary
RUN wget -qO /build/grpc-health-probe \
    https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.28/grpc_health_probe-linux-amd64 \
    && chmod +x /build/grpc-health-probe

# ── STAGE 2: PRODUCTION IMAGE ─────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS production

USER nonroot:nonroot

COPY --from=builder --chown=nonroot:nonroot /build/service /app/service
COPY --from=builder --chown=nonroot:nonroot /build/grpc-health-probe /app/grpc-health-probe

# ── Runtime ENV defaults ──────────────────────────────────────────────────────
# These are defaults. Docker Compose environment: block overrides them.
# Only put non-sensitive defaults here.
# NEVER write passwords or secrets here.
ENV GO_ENV=production \
    LOG_LEVEL=info \
    HTTP_PORT=8080 \
    GRPC_PORT=50051 \
    READ_TIMEOUT=30s \
    WRITE_TIMEOUT=30s \
    SHUTDOWN_TIMEOUT=10s

EXPOSE 8080 50051

ENTRYPOINT ["/app/service"]
```

### The Complete docker-compose.yml With Proper Environment Variable Handling

```yaml
name: myapp

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

# ── Reusable base environment for all Go services ─────────────────────────────
# Hardcoded values: things that are always the same (Docker service names, ports)
# ${VAR} values: things that come from .env file
x-go-service-env: &go-service-env
  # ── Hardcoded: Docker DNS names — always the same inside the Docker network
  POSTGRES_HOST: postgres
  KAFKA_BROKERS: kafka:9092
  REDIS_HOST: redis
  OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
  OTEL_EXPORTER_OTLP_PROTOCOL: grpc

  # ── From .env: things that vary between environments
  POSTGRES_PORT: ${POSTGRES_PORT}
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_DB: ${POSTGRES_DB}
  REDIS_PORT: ${REDIS_PORT}
  APP_VERSION: ${APP_VERSION}
  GO_ENV: ${GO_ENV:-production}
  LOG_LEVEL: ${LOG_LEVEL:-info}

  # ── Paths where secrets are mounted — hardcoded, always the same
  POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
  REDIS_PASSWORD_FILE: /run/secrets/redis_password

services:
  postgres:
    image: postgres:${POSTGRES_VERSION}
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      PGDATA: /var/lib/postgresql/data/pgdata
    # ... rest of postgres config

  user-service:
    image: myapp/user-service:${APP_VERSION}
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
      target: production
      args:
        # These go into the binary at build time via ldflags
        APP_VERSION: ${APP_VERSION}
        GIT_COMMIT: ${GIT_COMMIT:-unknown}
        BUILD_TIME: ${BUILD_TIME:-unknown}
    environment:
      # Merge the shared base environment
      <<: *go-service-env
      # Then add service-specific values
      OTEL_SERVICE_NAME: user-service
      GRPC_PORT: 50051
    secrets:
      - postgres_password
      - redis_password
      - jwt_secret
```

### How Your Go Config Package Reads All of This

Here is the config package that ties everything together. This is what a production-grade config loader looks like:

```go
// internal/config/config.go

package config

import (
    "fmt"
    "os"
    "strings"
    "time"
)

type Config struct {
    // App info — baked into binary at build time, read from package-level vars
    // These are NOT from environment variables
    Version   string
    GitCommit string
    BuildTime string

    // Server config — from ENV defaults in Dockerfile, overridable via compose
    GoEnv           string
    LogLevel        string
    HTTPPort        string
    GRPCPort        string
    ReadTimeout     time.Duration
    WriteTimeout    time.Duration
    ShutdownTimeout time.Duration

    // Database config — host/port/user/db from env, password from secret file
    DBHost     string
    DBPort     string
    DBUser     string
    DBName     string
    DBPassword string  // read from /run/secrets/postgres_password

    // Redis config
    RedisHost     string
    RedisPort     string
    RedisPassword string  // read from /run/secrets/redis_password

    // Kafka
    KafkaBrokers []string

    // Observability
    OTELEndpoint string
    ServiceName  string
}

// Load reads all configuration from environment variables and secret files.
// It returns an error if any required value is missing.
func Load(version, gitCommit, buildTime string) (*Config, error) {
    cfg := &Config{
        // Build-time values passed in from main.go package-level vars
        Version:   version,
        GitCommit: gitCommit,
        BuildTime: buildTime,

        // Runtime values from environment (set by Dockerfile ENV or compose)
        GoEnv:       getEnv("GO_ENV", "production"),
        LogLevel:    getEnv("LOG_LEVEL", "info"),
        HTTPPort:    getEnv("HTTP_PORT", "8080"),
        GRPCPort:    getEnv("GRPC_PORT", "50051"),
        ServiceName: getEnv("OTEL_SERVICE_NAME", "unknown-service"),

        // Infrastructure addresses — always Docker service names inside compose
        DBHost:       getEnv("POSTGRES_HOST", "localhost"),
        DBPort:       getEnv("POSTGRES_PORT", "5432"),
        DBUser:       getEnv("POSTGRES_USER", ""),
        DBName:       getEnv("POSTGRES_DB", ""),
        RedisHost:    getEnv("REDIS_HOST", "localhost"),
        RedisPort:    getEnv("REDIS_PORT", "6379"),
        OTELEndpoint: getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
        KafkaBrokers: strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
    }

    // Parse durations
    var err error
    cfg.ReadTimeout, err = time.ParseDuration(getEnv("READ_TIMEOUT", "30s"))
    if err != nil {
        return nil, fmt.Errorf("invalid READ_TIMEOUT: %w", err)
    }

    cfg.WriteTimeout, err = time.ParseDuration(getEnv("WRITE_TIMEOUT", "30s"))
    if err != nil {
        return nil, fmt.Errorf("invalid WRITE_TIMEOUT: %w", err)
    }

    cfg.ShutdownTimeout, err = time.ParseDuration(getEnv("SHUTDOWN_TIMEOUT", "10s"))
    if err != nil {
        return nil, fmt.Errorf("invalid SHUTDOWN_TIMEOUT: %w", err)
    }

    // Load secrets from files — not from environment variables
    cfg.DBPassword, err = readSecret(
        getEnv("POSTGRES_PASSWORD_FILE", "/run/secrets/postgres_password"),
    )
    if err != nil {
        return nil, fmt.Errorf("postgres password: %w", err)
    }

    cfg.RedisPassword, err = readSecret(
        getEnv("REDIS_PASSWORD_FILE", "/run/secrets/redis_password"),
    )
    if err != nil {
        return nil, fmt.Errorf("redis password: %w", err)
    }

    // Validate required fields
    if cfg.DBUser == "" {
        return nil, fmt.Errorf("POSTGRES_USER is required")
    }
    if cfg.DBName == "" {
        return nil, fmt.Errorf("POSTGRES_DB is required")
    }

    return cfg, nil
}

// getEnv reads an environment variable and returns a default if not set.
func getEnv(key, defaultValue string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return defaultValue
}

// readSecret reads a secret from a file path (Docker Secrets mount at /run/secrets/).
// Returns an empty string if the file does not exist (for optional secrets).
func readSecret(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        if os.IsNotExist(err) {
            return "", nil  // optional secret — not present is OK
        }
        return "", fmt.Errorf("reading secret from %s: %w", path, err)
    }
    return strings.TrimSpace(string(data)), nil
}
```

---

## Part Five — How CI/CD Injects Build-Time Variables

In your CI/CD pipeline (GitHub Actions example), here is how the build-time and runtime variables are separated cleanly:

```yaml
# .github/workflows/deploy.yml

name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set build metadata
        run: |
          echo "GIT_COMMIT=$(git rev-parse --short HEAD)" >> $GITHUB_ENV
          echo "BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_ENV
          echo "APP_VERSION=v$(cat VERSION)-${GITHUB_SHA::8}" >> $GITHUB_ENV

      - name: Build Docker image
        run: |
          docker build \
            --target production \
            --build-arg APP_VERSION=${{ env.APP_VERSION }} \
            --build-arg GIT_COMMIT=${{ env.GIT_COMMIT }} \
            --build-arg BUILD_TIME=${{ env.BUILD_TIME }} \
            -t myapp/user-service:${{ env.APP_VERSION }} \
            -t myapp/user-service:latest \
            ./services/user-service

      - name: Push to registry
        run: docker push myapp/user-service:${{ env.APP_VERSION }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        env:
          # These come from GitHub Secrets — never hardcoded in the workflow
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          APP_VERSION: ${{ env.APP_VERSION }}
        run: |
          ssh deploy@$SERVER_HOST "
            export APP_VERSION=${APP_VERSION}
            docker compose -f docker-compose.yml -f docker-compose.services.yml pull
            docker compose -f docker-compose.yml -f docker-compose.services.yml \
              up -d --no-deps user-service order-service
          "
```

---

## Part Six — The Complete Mental Map

Here is the full picture, all in one place:

```
SOURCE OF TRUTH → HOW IT TRAVELS → WHERE IT LANDS → HOW GO READS IT
─────────────────────────────────────────────────────────────────────────

1. BUILD-TIME (version info, git commit)

  CI/CD pipeline
  │  export GIT_COMMIT=$(git rev-parse HEAD)
  │
  ▼
  docker build --build-arg GIT_COMMIT=$GIT_COMMIT
  │
  ▼
  Dockerfile: ARG GIT_COMMIT
              go build -ldflags="-X main.gitCommit=${GIT_COMMIT}"
  │
  ▼
  Binary: main.gitCommit = "abc1234"    (baked in, permanent)
  │
  ▼
  Go: var gitCommit = "unknown"  →  overwritten to "abc1234" at link time
      log.Printf("commit=%s", gitCommit)

─────────────────────────────────────────────────────────────────────────

2. RUNTIME NON-SECRET CONFIG (ports, hostnames, db name)

  .env file on host
  │  POSTGRES_USER=appuser
  │  APP_VERSION=v1.4.2
  │
  ▼
  docker-compose.yml: environment:
                        POSTGRES_USER: ${POSTGRES_USER}  ← substituted
  │
  ▼
  Container environment variables
  │  POSTGRES_USER=appuser
  │
  ▼
  Go: os.Getenv("POSTGRES_USER")  →  "appuser"

─────────────────────────────────────────────────────────────────────────

3. RUNTIME SECRETS (passwords, keys, tokens)

  ./secrets/postgres_password.txt  (on host disk, not in Git)
  │  "s3cur3P@ssw0rd!"
  │
  ▼
  docker-compose.yml: secrets:
                        postgres_password:
                          file: ./secrets/postgres_password.txt
  │
  ▼
  Docker mounts file at /run/secrets/postgres_password (tmpfs, RAM only)
  │
  ▼
  Go: os.ReadFile("/run/secrets/postgres_password")  →  "s3cur3P@ssw0rd!"

─────────────────────────────────────────────────────────────────────────

4. DOCKERFILE ENV DEFAULTS (fallback values)

  Dockerfile: ENV HTTP_PORT=8080
  │
  ▼
  Container has HTTP_PORT=8080 by default
  │
  ▼  (overridden if compose sets a different value)
  Go: os.Getenv("HTTP_PORT")  →  "8080"
```

---

## The Golden Rules — Print This and Put It on Your Wall

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  RULE 1: Never COPY .env into a Dockerfile. Ever.                   │
│                                                                     │
│  RULE 2: ARG is for build-time only (versions, git info).           │
│          ENV is for runtime (ports, log level, hostnames).          │
│          Secrets are for passwords and keys (Docker Secrets).       │
│                                                                     │
│  RULE 3: .env file has zero secrets. Only config.                   │
│          Secrets live in ./secrets/*.txt and are in .gitignore.     │
│                                                                     │
│  RULE 4: .env.example is always committed to Git.                   │
│          It is the contract that tells your team                    │
│          what variables the system needs.                           │
│                                                                     │
│  RULE 5: In Go, read secrets with os.ReadFile() from file path.     │
│          Read config with os.Getenv(). Never mix them up.           │
│                                                                     │
│  RULE 6: Never pass a password as --build-arg.                      │
│          It shows up in docker history forever.                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

This is the complete system. Build-time variables go through `ARG` and `ldflags` into the binary. Runtime config goes through `.env` and `environment:` in compose. Secrets go through Docker Secrets and are read from files. These three channels never cross.