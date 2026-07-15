# Docker Secrets, Volumes, and Environment Variables — A Deep Dive

_The same senior engineer, same whiteboard, continuing where we left off._

---

## Part One — Docker Secrets: What the File Looks Like and How Docker Manages It

Let us start at the very beginning. You wrote this in your compose file:

```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

The first question is: what does that `.txt` file actually look like? The answer is almost embarrassingly simple. It is just the raw password, nothing else:

```
# ./secrets/postgres_password.txt

s3cur3P@ssw0rd!MyApp2024
```

That is the entire file. One line. No quotes around it, no `KEY=VALUE` format, no JSON. Just the raw secret value. Docker reads the bytes of this file and handles everything else. If you accidentally add a newline at the end (which most text editors do), some applications get confused because they read `s3cur3P@ssw0rd!MyApp2024\n` instead of `s3cur3P@ssw0rd!MyApp2024`. To be safe, always write the file without a trailing newline:

```bash
# The correct way to create a secret file — no trailing newline
printf 's3cur3P@ssw0rd!MyApp2024' > ./secrets/postgres_password.txt

# Verify it has no trailing newline
xxd ./secrets/postgres_password.txt | tail -1
# Should NOT end in "0a" (0a is the hex code for newline character)
```

Now, your `.gitignore` must contain the secrets directory. This is non-negotiable:

```gitignore
# .gitignore
secrets/
.env.secrets
```

### How Docker Physically Moves the Secret Into the Container

This is where it gets interesting. Most people assume Docker just copies the file somewhere inside the container. That is wrong. What actually happens is more clever and more secure than that.

When Docker starts a container that has secrets attached, it creates a special in-memory filesystem called `tmpfs` and mounts it at `/run/secrets/` inside the container. `tmpfs` is a filesystem that lives entirely in RAM — it is never written to disk, not even to swap if swap is disabled. Docker then writes the contents of your secret file into this RAM-backed location.

```
Your Host Machine Disk
┌───────────────────────────────────────────────────────┐
│  ./secrets/postgres_password.txt  ← sits on disk     │
│       "s3cur3P@ssw0rd!MyApp2024"                      │
└───────────────────────┬───────────────────────────────┘
                        │
                        │  Docker reads this at container start
                        │
                        ▼
         Container's RAM (tmpfs mount)
┌───────────────────────────────────────────────────────┐
│  /run/secrets/postgres_password                       │
│       "s3cur3P@ssw0rd!MyApp2024"                      │
│                                                       │
│  ← This directory lives in RAM only.                  │
│    It is never written to the container's disk.       │
│    When the container stops, it vanishes completely.  │
└───────────────────────────────────────────────────────┘
```

The file at `/run/secrets/postgres_password` is owned by `root` and has permissions `0400` — meaning only root can read it, and nobody can write to it or execute it. Your Go application, if it runs as a non-root user (which it should, using the `nonroot` user in our distroless image), reads this file using the file path.

### How Your Go Service Reads the Secret

In your Go code, you do not read the password from an environment variable. You read it from the file path. Here is what that looks like:

```go
// config/config.go

import (
    "os"
    "strings"
)

func loadSecret(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", fmt.Errorf("failed to read secret from %s: %w", path, err)
    }
    // TrimSpace removes any accidental trailing newlines
    return strings.TrimSpace(string(data)), nil
}

type Config struct {
    DBPassword string
}

func Load() (*Config, error) {
    dbPassword, err := loadSecret("/run/secrets/postgres_password")
    if err != nil {
        return nil, err
    }
    return &Config{
        DBPassword: dbPassword,
    }, nil
}
```

Postgres itself already supports this pattern natively through the `POSTGRES_PASSWORD_FILE` environment variable we set in our compose file:

```yaml
environment:
  POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

When Postgres starts, its entrypoint script reads that environment variable, opens the file path it points to, reads the password from it, and uses it to set up the database. You never write `POSTGRES_PASSWORD: mypassword` anywhere.

### Why This Is Safer Than Environment Variables

Here is the concrete reason, not just theory. When you set a password as an environment variable, it becomes visible in three dangerous places:

The first is `docker inspect`. Anyone with Docker access on the host can run `docker inspect myapp-postgres` and see every environment variable of every container in plain text. If your password is an env var, it shows up there.

The second is the process list. On Linux, the contents of environment variables for a running process are stored in `/proc/PID/environ`. Any process running as root on the host can read every environment variable of every running container.

The third is log leakage. Error messages from libraries and frameworks sometimes print the entire environment when they crash. If your database connection fails and your HTTP framework logs `dsn=postgres://user:mypassword@host/db`, that password is now in your log files, which might be sent to Grafana, stored in S3, or read by your monitoring team.

Docker Secrets avoid all three of these. The secret is in a file, accessed only by the process that needs it, stored only in RAM, and gone the moment the container stops.

---

## Part Two — Volumes: Where Data Lives, How to Back It Up, and How to Take a Database Backup

### Where Does the Data Actually Live?

When you define a named volume like this:

```yaml
volumes:
  postgres_data:
    driver: local
```

Docker creates a directory on your host machine to store the data. On Linux (which is where you deploy), the location is:

```
/var/lib/docker/volumes/myapp_postgres_data/_data/
```

The `myapp_` prefix comes from the `name: myapp` we set in our compose file. So the full path on your host machine's disk is:

```
Host Machine Filesystem
┌──────────────────────────────────────────────────────────────┐
│  /var/lib/docker/volumes/                                    │
│      myapp_postgres_data/                                    │
│          _data/                          ← Postgres files    │
│              pgdata/                                         │
│                  base/                   ← actual databases  │
│                  global/                 ← cluster-wide data │
│                  pg_wal/                 ← write-ahead log   │
│                  postgresql.conf         ← config            │
│                                                              │
│      myapp_redis_data/                                       │
│          _data/                                              │
│              dump.rdb                    ← Redis snapshot    │
│                                                              │
│      myapp_kafka_data/                                       │
│          _data/                          ← Kafka log files   │
└──────────────────────────────────────────────────────────────┘
```

This data lives on the host machine's disk, completely outside Docker's container layer. This is the critical point. When you run `docker compose down`, the containers are destroyed but this directory on the host is untouched. When you run `docker compose up` again, Docker starts a fresh container and mounts this same directory into it, so Postgres finds all its data exactly where it left off.

The lifecycle looks like this:

```
docker compose up
    │
    └──▶ Container starts
         │
         └──▶ /var/lib/docker/volumes/myapp_postgres_data/_data
              is mounted to /var/lib/postgresql/data inside container
              │
              Postgres reads data from here and starts normally ✅

docker compose down   ← containers are DELETED
    │
    └──▶ /var/lib/docker/volumes/myapp_postgres_data/_data
         STILL EXISTS on host disk ✅  ← data is safe

docker compose up again
    │
    └──▶ New container starts
         │
         └──▶ Same volume is mounted again
              Postgres finds all data exactly where it left it ✅
```

The only way to delete the volume data is to explicitly run:

```bash
docker compose down -v        # destroys all volumes — DATA IS GONE FOREVER
docker volume rm myapp_postgres_data   # removes one specific volume
```

This is why we never run `docker compose down -v` in production unless we genuinely want to wipe everything.

### How to Back Up the Volume Data

There are two approaches to backing up volume data: the filesystem approach (copy the raw files) and the database-aware approach (use Postgres's own backup tools). In almost every real situation, you want the database-aware approach for Postgres because raw file copies can be corrupted if Postgres is writing at the exact moment you copy.

**The Filesystem Approach (for services like Redis or Kafka where raw copy is acceptable):**

```bash
# Create a temporary container, mount the volume, and tar the contents to stdout
docker run --rm \
  -v myapp_redis_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar czf /backup/redis-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .

# This produces: ./backups/redis-backup-20240715-143022.tar.gz
```

What this command does: it spins up a tiny Alpine Linux container, mounts your Redis volume as read-only at `/source`, mounts your local `backups/` directory at `/backup`, runs `tar` to compress everything, then exits and is deleted (`--rm`). Your Postgres data is safely sitting in the compressed archive.

**To restore from this backup:**

```bash
# Stop the service first
docker compose stop redis

# Create a new empty volume (or use the existing one)
# Then extract the archive back into it
docker run --rm \
  -v myapp_redis_data:/target \
  -v $(pwd)/backups:/backup \
  alpine \
  tar xzf /backup/redis-backup-20240715-143022.tar.gz -C /target

# Start the service again
docker compose start redis
```

### How to Take a Proper Postgres Database Backup

For Postgres specifically, you must use `pg_dump` or `pg_dumpall`. These tools coordinate with Postgres to produce a consistent snapshot — they lock nothing and produce a backup that is guaranteed to be in a valid state, even if Postgres is actively writing data at the time.

```bash
# Method 1: pg_dump — backs up a single database into a SQL file
# This runs pg_dump INSIDE the running Postgres container
docker exec myapp-postgres \
  pg_dump \
  --username=appuser \
  --dbname=appdb \
  --format=custom \         # binary format, smaller and faster to restore
  --compress=9 \            # maximum compression
  --file=/tmp/backup.dump

# Copy the dump out of the container to your host
docker cp myapp-postgres:/tmp/backup.dump ./backups/postgres-$(date +%Y%m%d-%H%M%S).dump

# Clean up the temp file inside the container
docker exec myapp-postgres rm /tmp/backup.dump
```

Or, more elegantly, do it in one pipeline without touching the container's disk at all:

```bash
# One-liner: streams the dump directly from container to your host disk
docker exec myapp-postgres \
  pg_dump \
  --username=appuser \
  --dbname=appdb \
  --format=custom \
  --compress=9 \
  > ./backups/postgres-$(date +%Y%m%d-%H%M%S).dump
```

This streams the backup output from `pg_dump` directly through `docker exec` to your terminal, which redirects it to the file. The dump never touches the container's disk or the volume. It goes directly from Postgres's memory to your backup file.

**To restore a Postgres backup:**

```bash
# pg_restore works with the custom format dump
docker exec -i myapp-postgres \
  pg_restore \
  --username=appuser \
  --dbname=appdb \
  --clean \              # drop existing objects before recreating
  --if-exists \          # don't error if objects don't exist yet
  --no-owner \           # don't set ownership (useful when restoring to different user)
  < ./backups/postgres-20240715-143022.dump
```

### Automating Backups with a Scheduled Container

In a real production setup, you do not run backups manually. You add a dedicated backup service to your compose file that runs on a schedule:

```yaml
# Add this to docker-compose.yml
postgres-backup:
  image: postgres:16.3-alpine
  container_name: myapp-postgres-backup
  restart: unless-stopped
  secrets:
    - postgres_password
  environment:
    PGPASSWORD_FILE: /run/secrets/postgres_password
    PGHOST: postgres
    PGUSER: ${POSTGRES_USER}
    PGDATABASE: ${POSTGRES_DB}
    BACKUP_DIR: /backups
    BACKUP_RETENTION_DAYS: 7
  volumes:
    - ./backups:/backups
    - ./infra/scripts/backup.sh:/backup.sh:ro
  networks:
    - data_net
  depends_on:
    postgres:
      condition: service_healthy
  command: >
    sh -c "
      while true; do
        PGPASSWORD=$$(cat /run/secrets/postgres_password) \
        pg_dump -h postgres -U $$PGUSER -d $$PGDATABASE \
          --format=custom --compress=9 \
          > /backups/postgres-$$(date +%Y%m%d-%H%M%S).dump
        find /backups -name '*.dump' -mtime +$$BACKUP_RETENTION_DAYS -delete
        sleep 86400
      done
    "
```

This container runs forever, takes a backup every 24 hours (86400 seconds), and automatically deletes backups older than 7 days. The backups land in `./backups/` on your host machine, which you can then sync to an S3 bucket or any remote storage from your host's cron job.

---

## Part Three — How Environment Variables Work in Docker Compose

Now let us dissect this block from your compose file:

```yaml
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
```

There are actually three different things happening in this one block, and most engineers do not realize there is a difference between them. Let me separate them clearly.

### Type 1 — Hardcoded Values

```yaml
POSTGRES_HOST: postgres
KAFKA_BROKERS: kafka:9092
REDIS_HOST: redis
GO_ENV: production
```

These values are written directly in the compose file. They never change between environments. `POSTGRES_HOST: postgres` means the environment variable `POSTGRES_HOST` inside the container will have the value `postgres`. This is the Docker service name, which Docker's internal DNS resolves to the IP address of the Postgres container. Your Go code reads this:

```go
host := os.Getenv("POSTGRES_HOST")  // returns "postgres"
```

And when your Go code tries to connect to `postgres:5432`, Docker's internal DNS intercepts that hostname lookup and returns the Postgres container's IP address. This is how all inter-service communication works in Docker Compose.

```
Inside the services_net network:

user-service container
    │
    │  os.Getenv("POSTGRES_HOST") → "postgres"
    │  net.Dial("tcp", "postgres:5432")
    │
    ▼
Docker Internal DNS (runs at 127.0.0.11 inside every container)
    │
    │  "postgres" → 172.20.2.3 (Postgres container's IP)
    │
    ▼
postgres container at 172.20.2.3:5432 ✅
```

### Type 2 — Values Substituted From the `.env` File

```yaml
POSTGRES_USER: ${POSTGRES_USER}
POSTGRES_DB: ${POSTGRES_DB}
APP_VERSION: ${APP_VERSION}
```

The `${VARIABLE_NAME}` syntax is Docker Compose's variable substitution. When Docker Compose reads the compose file, it looks for a file called `.env` in the same directory. It loads every `KEY=VALUE` pair from that file, and then substitutes `${KEY}` placeholders in the compose file with those values before doing anything else.

So when Docker Compose sees `POSTGRES_USER: ${POSTGRES_USER}`, it looks into the `.env` file, finds `POSTGRES_USER=appuser`, and effectively rewrites the compose file as `POSTGRES_USER: appuser` before processing it further.

The substitution flow looks like this:

```
.env file on your host:
┌─────────────────────────────────┐
│ POSTGRES_USER=appuser           │
│ POSTGRES_DB=appdb               │
│ APP_VERSION=v1.4.2              │
└──────────────┬──────────────────┘
               │
               │  Docker Compose reads .env FIRST
               │
               ▼
docker-compose.yml (before substitution):         after substitution:
POSTGRES_USER: ${POSTGRES_USER}      ──────▶      POSTGRES_USER: appuser
POSTGRES_DB: ${POSTGRES_DB}          ──────▶      POSTGRES_DB: appdb
OTEL_SERVICE_VERSION: ${APP_VERSION} ──────▶      OTEL_SERVICE_VERSION: v1.4.2
               │
               │  Now the substituted values are
               │  set as env vars inside the container
               ▼
Container environment:
   POSTGRES_USER = "appuser"
   POSTGRES_DB   = "appdb"
   APP_VERSION   = "v1.4.2"
```

You can also override `.env` values from the shell. If your CI/CD pipeline exports `APP_VERSION=abc123git`, that shell variable takes priority over the `.env` file:

```bash
# Shell variable overrides .env
export APP_VERSION=abc123git
docker compose up -d
# Containers see APP_VERSION=abc123git, not whatever is in .env
```

The priority order from lowest to highest is:

```
Lowest priority  →  Highest priority

.env file < docker-compose.yml defaults < shell environment variables < --env-file flag
```

### Type 3 — The YAML Anchor Mechanism (`&`, `<<`, `*`)

The `x-go-service-env: &go-service-env` is not a Docker Compose feature at all. It is a YAML feature. YAML allows you to define a block of content once, give it a name (an anchor), and then paste it into multiple places in the same file. Docker Compose does not know or care that you used anchors — by the time Docker Compose reads the file, YAML has already resolved all anchors into their actual values.

Let us trace exactly what happens:

```yaml
# What you write:

x-go-service-env: &go-service-env          # 1. Define an anchor named "go-service-env"
  POSTGRES_HOST: postgres                   #    containing these key-value pairs
  KAFKA_BROKERS: kafka:9092

user-service:
  environment:
    <<: *go-service-env                     # 2. Merge-insert the anchor here
    OTEL_SERVICE_NAME: user-service         #    then add service-specific values

order-service:
  environment:
    <<: *go-service-env                     # 3. Merge-insert the same anchor here
    OTEL_SERVICE_NAME: order-service        #    then add different service-specific values
```

After YAML resolves the anchors, what Docker Compose actually sees is:

```yaml
# What Docker Compose actually processes (after YAML anchor resolution):

user-service:
  environment:
    POSTGRES_HOST: postgres          # ← came from anchor
    KAFKA_BROKERS: kafka:9092        # ← came from anchor
    OTEL_SERVICE_NAME: user-service  # ← service-specific override

order-service:
  environment:
    POSTGRES_HOST: postgres          # ← came from anchor
    KAFKA_BROKERS: kafka:9092        # ← came from anchor
    OTEL_SERVICE_NAME: order-service # ← service-specific override
```

The `<<:` is called a merge key. It says "merge all the key-value pairs from this anchor into the current mapping". If a key exists in both the anchor and the current block, the current block wins. This is why you can do `<<: *go-service-env` and then immediately write `OTEL_SERVICE_NAME: user-service` — the service-specific value overwrites the anchor's value for that key.

The `x-` prefix on `x-go-service-env` is a Docker Compose convention. Docker Compose ignores any top-level key that starts with `x-`. Without the `x-` prefix, Docker Compose would try to interpret `go-service-env` as a service name or some known compose directive and would throw an error.

### How All Three Types Work Together — The Complete Journey

Here is the complete end-to-end picture of how an environment variable like `POSTGRES_USER` makes it from your `.env` file to your running Go code:

```
Step 1: Developer creates .env file on host
┌────────────────────────────┐
│  POSTGRES_USER=appuser     │   ← sits on host disk
└──────────┬─────────────────┘
           │
           │ Step 2: Docker Compose reads .env before doing anything
           ▼
Step 3: Docker Compose resolves YAML anchors
┌────────────────────────────────────────────────────┐
│  x-go-service-env: &go-service-env                 │
│    POSTGRES_USER: ${POSTGRES_USER}                 │
│                    ↓ substituted from .env         │
│    POSTGRES_USER: appuser          ✅              │
└──────────────────────────────────┬─────────────────┘
                                   │
           Step 4: YAML anchor is merged into each service
                                   ▼
┌────────────────────────────────────────────────────┐
│  user-service:                                     │
│    environment:                                    │
│      POSTGRES_USER: appuser   ← final value        │
└──────────────────────────────┬─────────────────────┘
                               │
        Step 5: Docker starts the container and sets env vars
                               ▼
┌────────────────────────────────────────────────────┐
│  Running container                                  │
│  /proc/1/environ contains:                          │
│    POSTGRES_USER=appuser                            │
└──────────────────────────────┬─────────────────────┘
                               │
       Step 6: Your Go code reads the env var
                               ▼
┌────────────────────────────────────────────────────┐
│  cfg.DBUser = os.Getenv("POSTGRES_USER")           │
│  // cfg.DBUser is now "appuser"         ✅          │
└────────────────────────────────────────────────────┘
```

### A Note on What Should Be an Env Var vs What Should Be a Secret

Now that you understand both systems, here is the rule for deciding which one to use for each piece of configuration:

If the value is sensitive — a password, a private key, an API key, a signing secret — it goes in Docker Secrets, read from a file at `/run/secrets/`. It never touches an environment variable.

If the value is configuration that varies between environments but is not sensitive — a hostname, a port number, a feature flag, a timeout value, a database name — it goes in the `.env` file and enters the container as an environment variable.

```
Decision tree for any piece of configuration:

Is it sensitive?
(password, private key, token, secret)
         │
    YES ──┼──▶ Docker Secret → /run/secrets/name → read with os.ReadFile()
         │
    NO   ──┼──▶ Does it change between environments (dev/staging/prod)?
              │
         YES ──┼──▶ .env file → ${VARIABLE} in compose → os.Getenv()
              │
         NO   ──┼──▶ Hardcode it directly in compose file
```

So `POSTGRES_PASSWORD` is a Docker Secret. `POSTGRES_HOST` is hardcoded in the compose file because it is always `postgres` in every environment. `APP_VERSION` comes from `.env` because it changes with every deployment. That is the complete mental model.

---

## Quick Reference — The Three Systems Side by Side

```
┌────────────────┬──────────────────────┬──────────────────────┬───────────────────────┐
│                │  Docker Secrets      │  .env + ${VAR}       │  Hardcoded in compose  │
├────────────────┼──────────────────────┼──────────────────────┼───────────────────────┤
│ What goes here │  Passwords, keys,    │  Hostnames, ports,   │  Values that never    │
│                │  tokens, secrets     │  versions, DB names  │  change anywhere      │
├────────────────┼──────────────────────┼──────────────────────┼───────────────────────┤
│ Stored where   │  RAM (tmpfs), never  │  .env file on disk   │  docker-compose.yml   │
│                │  on container disk   │  (commit to git,     │  itself               │
│                │                      │  no secrets!)        │                       │
├────────────────┼──────────────────────┼──────────────────────┼───────────────────────┤
│ Read how       │  os.ReadFile(        │  os.Getenv(          │  os.Getenv(           │
│ in Go          │  "/run/secrets/name")│  "VAR_NAME")         │  "VAR_NAME")          │
├────────────────┼──────────────────────┼──────────────────────┼───────────────────────┤
│ Visible in     │  No — file only,     │  Yes — visible in    │  Yes — visible in     │
│ docker inspect │  not env vars        │  docker inspect      │  docker inspect       │
├────────────────┼──────────────────────┼──────────────────────┼───────────────────────┤
│ Example        │  postgres_password   │  POSTGRES_DB=appdb   │  POSTGRES_HOST:       │
│                │  redis_password      │  APP_VERSION=v1.4.2  │  postgres             │
└────────────────┴──────────────────────┴──────────────────────┴───────────────────────┘
```

This is the complete picture. Secrets live in RAM. Configuration lives in `.env`. Constants live in the compose file directly. Your Go code reads each one through the appropriate mechanism, and your system is both correct and secure.