# Docker Images & Containers Interview Guide - Part 3

## Advanced Topics: Security, Performance, Troubleshooting & Real-World Scenarios

## Table of Contents

1. [Security Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#security)
2. [Performance Optimization Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#performance)
3. [Advanced Troubleshooting](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#troubleshooting)
4. [Real-World Production Scenarios](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#production-scenarios)
5. [Docker Compose with Images & Containers](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#compose)
6. [Registry & Distribution Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#registry)
7. [Advanced Image Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#advanced-images)
8. [Container Internals Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#container-internals)
9. [Best Practices & Patterns](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#best-practices)
10. [Challenging Scenario Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#challenging-scenarios)

---

## Security Questions {#security}

### Q20: How do you scan Docker images for vulnerabilities?

**Short Answer:** Use tools like Docker Scout, Trivy, or Snyk to scan images for known vulnerabilities (CVEs).

**Complete Explanation:**

```bash
# Method 1: Docker Scout (Built-in)
$ docker scout quickview myapp:latest
    ✓ Provenance: Image built in CI
    ✓ No base image update available

  Vulnerabilities
    ├─ 3 critical
    ├─ 12 high
    ├─ 45 medium
    └─ 23 low

# View detailed report
$ docker scout cves myapp:latest

# Method 2: Trivy (Popular open-source)
$ docker run aquasec/trivy image myapp:latest
myapp:latest (alpine 3.18.0)
====================================
Total: 23 (UNKNOWN: 0, LOW: 8, MEDIUM: 10, HIGH: 4, CRITICAL: 1)

┌─────────────────┬──────────────┬──────────┬───────────────────┐
│    Library      │ Vulnerability│ Severity │ Installed Version │
├─────────────────┼──────────────┼──────────┼───────────────────┤
│ openssl         │ CVE-2023-1234│ CRITICAL │ 3.0.8             │
│ curl            │ CVE-2023-5678│ HIGH     │ 7.88.1            │
└─────────────────┴──────────────┴──────────┴───────────────────┘

# Method 3: Snyk
$ snyk container test myapp:latest
```

**Visual Explanation:**

```
VULNERABILITY SCANNING PROCESS:
═══════════════════════════════════════════════════

Step 1: Image Analysis
┌──────────────────────────────────────┐
│ Docker Image: myapp:latest           │
│                                      │
│ Layer 1: alpine:3.18                 │
│   └─ Packages: openssl, curl, bash  │
│                                      │
│ Layer 2: Dependencies                │
│   └─ Packages: python, pip          │
│                                      │
│ Layer 3: Application                 │
│   └─ Files: app.py, requirements.txt│
└──────────────────────────────────────┘
         │
         ▼ Scan each layer
         
Step 2: Compare with CVE Database
┌──────────────────────────────────────┐
│ CVE Database (Vulnerability DB)      │
│                                      │
│ openssl 3.0.8 → CVE-2023-1234       │
│ Status: CRITICAL                     │
│ Fix: Upgrade to 3.0.9               │
│                                      │
│ curl 7.88.1 → CVE-2023-5678         │
│ Status: HIGH                         │
│ Fix: Upgrade to 7.88.2              │
└──────────────────────────────────────┘
         │
         ▼
Step 3: Generate Report
┌──────────────────────────────────────┐
│ Vulnerability Report                 │
│                                      │
│ ❌ CRITICAL: 1                       │
│ ⚠️  HIGH: 4                          │
│ ⚠️  MEDIUM: 10                       │
│ ✓  LOW: 8                           │
│                                      │
│ Action Required:                     │
│ 1. Update openssl to 3.0.9          │
│ 2. Update curl to 7.88.2            │
└──────────────────────────────────────┘
```

**How to Fix Vulnerabilities:**

```dockerfile
# ❌ BEFORE (Vulnerable)
FROM alpine:3.16  # Old version
RUN apk add openssl=3.0.8  # Vulnerable version

# ✅ AFTER (Fixed)
FROM alpine:3.18  # Latest stable
RUN apk add --no-cache openssl  # Latest version (3.0.9)

# Best Practice: Always update base image
FROM python:3.11-alpine
RUN apk update && apk upgrade  # Update all packages
COPY . .
```

**CI/CD Integration:**

```yaml
# .github/workflows/docker-security.yml
name: Docker Security Scan

on: [push]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
        
      - name: Run Trivy scan
        run: |
          docker run aquasec/trivy image \
            --severity HIGH,CRITICAL \
            --exit-code 1 \
            myapp:${{ github.sha }}
      
      # Build fails if HIGH or CRITICAL vulnerabilities found!
      
      - name: Push image (only if scan passes)
        run: docker push myapp:${{ github.sha }}
```

**Severity Levels Explained:**

```
CRITICAL: 
─────────────────────────────────────────
- Remote code execution
- Authentication bypass
- Data breach potential
Action: Fix IMMEDIATELY (within hours)

HIGH:
─────────────────────────────────────────
- Privilege escalation
- Denial of service
- Information disclosure
Action: Fix within days

MEDIUM:
─────────────────────────────────────────
- Limited impact vulnerabilities
- Requires specific conditions
Action: Fix in next release cycle

LOW:
─────────────────────────────────────────
- Minimal security impact
- Theoretical vulnerabilities
Action: Fix when convenient
```

---

### Q21: How do you implement least privilege principle in containers?

**Short Answer:** Run containers as non-root user, drop unnecessary capabilities, use read-only filesystem, and limit resources.

**Complete Implementation:**

```dockerfile
# ═══════════════════════════════════════════════════
# LEAST PRIVILEGE DOCKERFILE
# ═══════════════════════════════════════════════════

FROM python:3.11-alpine

# 1. Create non-root user with specific UID
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies as root (needed for package installation)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy application files
COPY --chown=appuser:appgroup . .

# 5. Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appgroup /app/logs /app/tmp

# 6. Switch to non-root user
USER appuser

# 7. Set restrictive permissions
RUN chmod -R 755 /app && \
    chmod -R 700 /app/logs

# 8. Expose port (>1024 for non-root)
EXPOSE 8080

# 9. Health check (as non-root user)
HEALTHCHECK --interval=30s CMD wget --spider http://localhost:8080/health || exit 1

# 10. Start application
CMD ["python", "app.py"]
```

**Running with Additional Security:**

```bash
# Run with full security hardening
docker run -d \
  --name secure-app \
  --user 1001:1001 \              # Force non-root user
  --read-only \                   # Read-only root filesystem
  --tmpfs /tmp:rw,noexec,nosuid \ # Writable temp (restricted)
  --tmpfs /app/logs:rw \          # Writable logs directory
  --cap-drop=ALL \                # Drop all Linux capabilities
  --cap-add=NET_BIND_SERVICE \    # Add only needed capability
  --security-opt=no-new-privileges \ # Prevent privilege escalation
  --memory=512m \                 # Limit memory
  --cpus=1 \                      # Limit CPU
  --pids-limit=100 \              # Limit processes
  -p 8080:8080 \
  myapp:latest
```

**Visual Security Layers:**

```
SECURITY LAYERS (Defense in Depth):
═══════════════════════════════════════════════════

Layer 1: Base Image
┌─────────────────────────────────────────┐
│ ✓ Use minimal base (alpine)            │
│ ✓ Use specific version (not latest)    │
│ ✓ Scan for vulnerabilities             │
└─────────────────────────────────────────┘

Layer 2: User Permissions
┌─────────────────────────────────────────┐
│ ✓ Create non-root user (UID 1001)      │
│ ✓ USER appuser in Dockerfile           │
│ ✓ Proper file ownership (chown)        │
└─────────────────────────────────────────┘

Layer 3: Filesystem Security
┌─────────────────────────────────────────┐
│ ✓ Read-only root filesystem             │
│ ✓ Writable volumes only where needed   │
│ ✓ No secrets in image layers           │
└─────────────────────────────────────────┘

Layer 4: Capability Restrictions
┌─────────────────────────────────────────┐
│ ✓ Drop all capabilities (--cap-drop=ALL)│
│ ✓ Add only needed ones                 │
│ ✓ Prevent privilege escalation         │
└─────────────────────────────────────────┘

Layer 5: Resource Limits
┌─────────────────────────────────────────┐
│ ✓ Memory limit (--memory=512m)         │
│ ✓ CPU limit (--cpus=1)                 │
│ ✓ PID limit (--pids-limit=100)         │
└─────────────────────────────────────────┘

Layer 6: Network Security
┌─────────────────────────────────────────┐
│ ✓ Custom networks (isolation)          │
│ ✓ Only expose needed ports             │
│ ✓ Use unprivileged ports (>1024)       │
└─────────────────────────────────────────┘
```

**Linux Capabilities Explained:**

```bash
# List default container capabilities
$ docker run --rm alpine sh -c 'apk add -q libcap; capsh --print'
Current: cap_chown,cap_dac_override,cap_fowner,cap_fsetid,
         cap_kill,cap_setgid,cap_setuid,cap_setpcap,
         cap_net_bind_service,cap_net_raw,cap_sys_chroot,
         cap_mknod,cap_audit_write,cap_setfcap=ep

# Drop ALL capabilities (most secure)
docker run --cap-drop=ALL myapp
# Container can't do anything privileged

# Add specific capability if needed
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
# Can bind to port 80 (privileged port) but nothing else

# Common capabilities and when to use:
CAPABILITY              USE CASE
─────────────────────────────────────────────────────
NET_BIND_SERVICE       Bind to ports < 1024
CHOWN                  Change file ownership
DAC_OVERRIDE           Bypass file permission checks
SETUID/SETGID          Change user/group IDs
SYS_TIME               Set system time
NET_ADMIN              Network configuration
SYS_ADMIN              Many privileged operations (avoid!)
```

**Testing Security:**

```bash
# Test 1: Verify running as non-root
$ docker exec myapp whoami
appuser  # ✓ Not root!

$ docker exec myapp id
uid=1001(appuser) gid=1001(appgroup)  # ✓ Non-root UID

# Test 2: Try to write to read-only filesystem
$ docker exec myapp touch /test.txt
touch: /test.txt: Read-only file system  # ✓ Blocked!

# Test 3: Check writable locations
$ docker exec myapp touch /tmp/test.txt
# ✓ Works (tmpfs mounted)

# Test 4: Try privilege escalation
$ docker exec myapp sudo su
sudo: command not found  # ✓ Can't escalate!

# Test 5: Check capabilities
$ docker exec myapp grep Cap /proc/1/status
CapEff: 0000000000000000  # ✓ No capabilities!
```

---

### Q22: How do you handle secrets in Docker containers?

**Short Answer:** Never put secrets in images. Use environment variables at runtime, Docker secrets (Swarm), or mount secrets as files.

**Wrong Ways (NEVER DO THIS):**

```dockerfile
# ❌ WRONG 1: Hardcoded in Dockerfile
FROM python:3.11
ENV DATABASE_PASSWORD=supersecret123  # Visible in image!
ENV API_KEY=abc123xyz  # Anyone can see this!

# ❌ WRONG 2: ARG with default
FROM python:3.11
ARG DB_PASSWORD=secret  # Stored in image history!
RUN echo $DB_PASSWORD > /config/db.conf

# ❌ WRONG 3: COPY secrets file
FROM python:3.11
COPY .env /app/.env  # Secret now in image layer!

# Why wrong?
$ docker history myimage
# Shows all secrets in plain text!

$ docker inspect myimage
# Shows environment variables with secrets!
```

**Right Ways:**

```
METHOD 1: Environment Variables at Runtime
═══════════════════════════════════════════════════

# Pass at container creation
docker run -e DATABASE_PASSWORD=secret123 myapp

# From file
docker run --env-file secrets.env myapp

# In docker-compose.yml
services:
  app:
    image: myapp
    environment:
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - API_KEY=${API_KEY}

Visual:
┌──────────────────────────────┐
│ Host: secrets.env            │
│ DATABASE_PASSWORD=secret123  │
└──────────────┬───────────────┘
               │ --env-file
               ▼
┌──────────────────────────────┐
│ Container Environment        │
│ DATABASE_PASSWORD=secret123  │ ← Only in memory!
└──────────────────────────────┘

Pros:
✓ Not in image
✓ Easy to rotate
✓ Different per environment

Cons:
✗ Visible in docker inspect
✗ Visible in process list


METHOD 2: Docker Secrets (Swarm Mode)
═══════════════════════════════════════════════════

# Create secret
echo "supersecret123" | docker secret create db_password -

# Use in service
docker service create \
  --name myapp \
  --secret db_password \
  myimage

# Inside container
$ cat /run/secrets/db_password
supersecret123

Visual:
┌──────────────────────────────┐
│ Docker Secrets Storage       │
│ (Encrypted at rest)          │
│ db_password: supersecret123  │
└──────────────┬───────────────┘
               │ Mounted as file
               ▼
┌──────────────────────────────┐
│ Container                    │
│ /run/secrets/                │
│   └─ db_password             │ ← In-memory filesystem
└──────────────────────────────┘

Pros:
✓ Encrypted at rest
✓ Not visible in inspect
✓ Auto-mounted as file

Cons:
✗ Requires Swarm mode
✗ Only works with services


METHOD 3: Build-Time Secrets (BuildKit)
═══════════════════════════════════════════════════

# Dockerfile
# syntax=docker/dockerfile:1.4
FROM python:3.11

# Use secret during build only
RUN --mount=type=secret,id=pip_token \
    pip install --index-url https://$(cat /run/secrets/pip_token)@pypi.org

# Secret NOT stored in image!

# Build with secret
docker buildx build \
  --secret id=pip_token,src=./token.txt \
  -t myapp .

Pros:
✓ Needed for private repos
✓ Not in final image
✓ Not in build cache

Cons:
✗ Requires BuildKit
✗ Only for build time


METHOD 4: External Secret Management
═══════════════════════════════════════════════════

Use dedicated secret manager:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

# Example with Vault
docker run \
  -e VAULT_ADDR=https://vault.company.com \
  -e VAULT_TOKEN=... \
  myapp

# App fetches secrets from Vault at startup
import hvac
client = hvac.Client(url=os.getenv('VAULT_ADDR'))
secret = client.secrets.kv.read_secret_version(path='db/password')

Pros:
✓ Centralized management
✓ Audit logs
✓ Automatic rotation
✓ Fine-grained access control

Cons:
✗ Additional infrastructure
✗ Network dependency
✗ More complex setup
```

**Best Practices:**

```python
# APPLICATION CODE: How to use secrets

# ✅ GOOD: Read from environment
import os

DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD')
if not DATABASE_PASSWORD:
    raise ValueError("DATABASE_PASSWORD environment variable not set")

# ✅ GOOD: Read from Docker secret file
def get_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Fallback to environment variable
        return os.getenv(secret_name.upper())

DATABASE_PASSWORD = get_secret('db_password')

# ✅ GOOD: Read from secret manager
import boto3

def get_secret_from_aws(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return response['SecretString']

DATABASE_PASSWORD = get_secret_from_aws('prod/db/password')

# ❌ BAD: Hardcoded
DATABASE_PASSWORD = "supersecret123"  # Never do this!

# ❌ BAD: In config file in image
with open('/app/config.json') as f:
    config = json.load(f)
    DATABASE_PASSWORD = config['password']  # File in image!
```

**Security Checklist:**

```
✓ Never commit secrets to git
✓ Use .env files locally (add to .gitignore)
✓ Use different secrets per environment
✓ Rotate secrets regularly
✓ Use least privilege (minimal permissions)
✓ Audit secret access
✓ Encrypt secrets at rest
✓ Use secret scanners in CI/CD
✗ Never log secrets
✗ Never print secrets in error messages
✗ Never store secrets in images
```

---

## Performance Optimization Questions {#performance}

### Q23: How do you optimize container startup time?

**Short Answer:** Use smaller base images, minimize layers, optimize dependencies, use health checks wisely, and pre-warm caches.

**Complete Optimization Guide:**

```
CONTAINER STARTUP TIME BREAKDOWN:
═══════════════════════════════════════════════════

Phase 1: Image Pull (First time only)
┌─────────────────────────────────────────┐
│ Downloading layers from registry        │
│ Time: Depends on image size & network   │
│                                         │
│ Large image (1 GB): 2-5 minutes         │
│ Small image (50 MB): 5-10 seconds       │
└─────────────────────────────────────────┘

Phase 2: Container Creation
┌─────────────────────────────────────────┐
│ Creating container filesystem           │
│ Setting up network namespace            │
│ Mounting volumes                        │
│ Time: < 1 second                        │
└─────────────────────────────────────────┘

Phase 3: Process Start
┌─────────────────────────────────────────┐
│ Executing ENTRYPOINT/CMD                │
│ Loading application                     │
│ Time: Depends on application            │
│                                         │
│ Python app: 1-3 seconds                 │
│ Java app: 5-30 seconds                  │
│ Go app: < 1 second                      │
└─────────────────────────────────────────┘

Phase 4: Application Initialization
┌─────────────────────────────────────────┐
│ Connecting to database                  │
│ Loading configuration                   │
│ Warming up caches                       │
│ Time: Varies widely                     │
└─────────────────────────────────────────┘
```

**Optimization Techniques:**

```dockerfile
# ═══════════════════════════════════════════════════
# TECHNIQUE 1: Use Smaller Base Images
# ═══════════════════════════════════════════════════

# ❌ SLOW: Large base image
FROM ubuntu:20.04  # 72 MB
RUN apt-get update && apt-get install -y python3  # +200 MB
# Total: 272 MB, slow pull time

# ✅ FAST: Minimal base image
FROM python:3.11-alpine  # 50 MB
# Total: 50 MB, 5x faster pull!

# ═══════════════════════════════════════════════════
# TECHNIQUE 2: Multi-Stage Build
# ═══════════════════════════════════════════════════

# Build stage (large, but thrown away)
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production (small and fast)
FROM node:18-alpine  # 50 MB vs 900 MB
WORKDIR /app
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]

# ═══════════════════════════════════════════════════
# TECHNIQUE 3: Lazy Loading
# ═══════════════════════════════════════════════════

# ❌ SLOW: Load everything at startup
import all_modules  # Takes 5 seconds
initialize_everything()  # Takes 3 seconds
# Total startup: 8 seconds

# ✅ FAST: Lazy load what you need
def get_feature():
    import feature_module  # Load only when needed
    return feature_module.do_work()
# Initial startup: < 1 second

# ═══════════════════════════════════════════════════
# TECHNIQUE 4: Pre-compiled Python
# ═══════════════════════════════════════════════════

FROM python:3.11-alpine

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Pre-compile Python files
RUN python -m compileall .

# Faster startup (no compilation needed)
CMD ["python", "app.py"]

# ═══════════════════════════════════════════════════
# TECHNIQUE 5: Connection Pooling
# ═══════════════════════════════════════════════════

# ❌ SLOW: Create connections at startup
db = connect_to_database()  # Takes 2 seconds
cache = connect_to_redis()  # Takes 1 second

# ✅ FAST: Lazy connection with retry
def get_db():
    global db
    if not db:
        db = connect_to_database()
    return db

# ═══════════════════════════════════════════════════
# TECHNIQUE 6: Health Check with Start Period
# ═══════════════════════════════════════════════════

HEALTHCHECK \
  --interval=30s \
  --timeout=3s \
  --start-period=40s \  # Allow 40s for startup!
  --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Don't fail health check during initialization
```

**Measuring Startup Time:**

```bash
# Method 1: Time command
$ time docker run --rm myapp echo "Ready"
real    0m5.234s  # Total time

# Method 2: Docker events
$ docker events --filter 'type=container' --format '{{.Time}} {{.Status}}' &
$ docker run -d --name test myapp

2024-01-15T10:30:00 create   # Container created
2024-01-15T10:30:00 start    # Container started
2024-01-15T10:30:05 healthy  # App ready (5 seconds)

# Method 3: Application metrics
# Add to your app:
import time
start_time = time.time()

# ... initialization code ...

startup_time = time.time() - start_time
print(f"Startup time: {startup_time:.2f}s")
```

**Comparison:**

```
STARTUP TIME COMPARISON:
═══════════════════════════════════════════════════

Configuration 1: Large, Unoptimized
─────────────────────────────────────────
Base: ubuntu:20.04
Size: 1.2 GB
Startup: 15 seconds
┌────────────────────────────────┐
│ Pull: 120s (first time)        │
│ Create: 1s                     │
│ Start: 2s                      │
│ Initialize: 12s                │
│ Total: 15s (after pulled)      │
└────────────────────────────────┘

Configuration 2: Optimized
─────────────────────────────────────────
Base: python:3.11-alpine
Size: 80 MB
Startup: 3 seconds
┌────────────────────────────────┐
│ Pull: 10s (first time)         │
│ Create: 0.5s                   │
│ Start: 0.5s                    │
│ Initialize: 2s                 │
│ Total: 3s (after pulled)       │
└────────────────────────────────┘

Improvement: 5x faster! 🚀
```

---

### Q24: How do you reduce Docker image build time?

**Short Answer:** Use layer caching effectively, order Dockerfile instructions properly, use BuildKit, and parallelize builds.

**Complete Guide:**

```dockerfile
# ═══════════════════════════════════════════════════
# SLOW BUILD (First time: 10 minutes)
# ═══════════════════════════════════════════════════

FROM python:3.11

# ❌ Copy everything first
COPY . /app  # Any file change = rebuild everything!

WORKDIR /app

# Install dependencies (5 minutes)
RUN pip install -r requirements.txt

# Build takes 10 minutes every time you change app.py!

# ═══════════════════════════════════════════════════
# FAST BUILD (Subsequent: 30 seconds)
# ═══════════════════════════════════════════════════

FROM python:3.11

WORKDIR /app

# ✅ Copy dependencies first (rarely change)
COPY requirements.txt .

# Install dependencies (5 minutes)
# But cached if requirements.txt unchanged!
RUN pip install -r requirements.txt

# ✅ Copy code last (changes frequently)
COPY . .

# Now changing app.py only rebuilds this layer (1 second)!
```

**BuildKit Features:**

```bash
# Enable BuildKit (Docker 18.09+)
export DOCKER_BUILDKIT=1

# Or per-build
DOCKER_BUILDKIT=1 docker build -t myapp .

# BuildKit Benefits:
# 1. Parallel builds
# 2. Better caching
# 3. Secret mounting
# 4. Cache mounts
```

**Advanced Caching with BuildKit:**

```dockerfile
# syntax=docker/dockerfile:1.4

FROM python:3.11

WORKDIR /app

# ═══════════════════════════════════════════════════
# TECHNIQUE 1: Cache Mount (Persist pip downloads)
# ═══════════════════════════════════════════════════

COPY requirements.txt .

# Pip cache persists between builds!
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# First build: Downloads packages (5 min)
# Second build: Uses cached packages (30 sec)

# ═══════════════════════════════════════════════════
# TECHNIQUE 2: Bind Mount (Access files without COPY)
# ═══════════════════════════════════════════════════

RUN --mount=type=bind,source=.,target=/src \
    --mount=type=cache,target=/root/.cache \
    pip install /src

# No COPY needed, reads directly from host

# ═══════════════════════════════════════════════════
# TECHNIQUE 3: Multi-platform parallel build
# ═══════════════════════════════════════════════════

# Build for multiple platforms simultaneously
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest .

# Builds both platforms in parallel!
```

**Parallel Stage Builds:**

```dockerfile
# syntax=docker/dockerfile:1.4

# ═══════════════════════════════════════════════════
# These stages build IN PARALLEL!
# ═══════════════════════════════════════════════════

# Stage 1: Build frontend
FROM node:18 AS frontend
COPY frontend/ .
RUN npm install && npm run build

# Stage 2: Build backend (parallel with frontend!)
FROM golang:1.21 AS backend
COPY backend/ .
RUN go build -o app

# Stage 3: Run tests (parallel with above!)
FROM python:3.11 AS tests
COPY tests/ .
RUN pytest

# Stage 4: Final (waits for all above)
FROM alpine:3.18
COPY --from=frontend /dist ./public
COPY --from=backend /app ./api
CMD ["./api"]

# Timeline:
# Without parallel: frontend (5m) + backend (3m) + tests (2m) = 10m
# With parallel: max(5m, 3m, 2m) = 5m (2x faster!)
```

**Build Time Optimization Checklist:**

```
✓ Order instructions by change frequency
✓ Copy dependency files before source code
✓ Use .dockerignore to exclude files
✓ Combine RUN commands to reduce layers
✓ Use BuildKit cache mounts
✓ Enable BuildKit for parallel builds
✓ Use multi-stage builds
✓ Cache external downloads
✓ Don't install unnecessary packages
✓ Clean up in same RUN command
```

**Measuring Build Time:**

```bash
# Time full build
$ time docker build -t myapp .
real    5m34.567s

# Time with BuildKit
$ time DOCKER_BUILDKIT=1 docker build -t myapp .
real    2m12.345s  # 2.5x faster!

# See detailed timing
$ DOCKER_BUILDKIT=1 docker build --progress=plain -t myapp .
#1 [internal] load build definition
#1 transferring dockerfile: 432B done
#1 DONE 0.0s

#2 [internal] load .dockerignore
#2 transferring context: 52B done
#2 DONE 0.0s

#3 [1/5] FROM docker.io/library/python:3.11
#3 CACHED

#4 [2/5] COPY requirements.txt .
#4 DONE 0.1s

#5 [3/5] RUN pip install -r requirements.txt
#5 DONE 45.2s  # 45 seconds here

#6 [4/5] COPY . .
#6 DONE 0.3s

#7 exporting to image
#7 DONE 0.5s

Total: 46.1s
```

---

## Advanced Troubleshooting {#troubleshooting}

### Q25: Container runs on your machine but fails in production. How do you debug?

**Answer - Step-by-Step Debugging Process:**

```
DEBUGGING METHODOLOGY:
═══════════════════════════════════════════════════

Step 1: Gather Information
─────────────────────────────────────────
$ docker logs container_name
$ docker inspect container_name
$ docker ps -a

Step 2: Compare Environments
─────────────────────────────────────────
Local (Works) vs Production (Fails)
- Different Docker version?
- Different environment variables?
- Different network setup?
- Different volumes?
- Different resource limits?

Step 3: Reproduce Locally
─────────────────────────────────────────
Try to recreate production conditions locally

Step 4: Isolate the Issue
─────────────────────────────────────────
- Application issue?
- Configuration issue?
- Network issue?
- Resource issue?
- Permission issue?

Step 5: Fix and Validate
─────────────────────────────────────────
Test fix locally, then deploy to production
```

**Common Scenarios:**

```
SCENARIO 1: Environment Variables Missing
═══════════════════════════════════════════════════

Local (Works):
$ docker run -e DATABASE_URL=localhost:5432 myapp
✓ Works

Production (Fails):
$ docker run myapp
✗ Error: DATABASE_URL not set

Debug:
$ docker inspect myapp | grep -A 10 Env
# Check what environment variables are set

$ docker exec myapp env
# See actual environment in container

Fix:
Ensure environment variables passed in production:
$ docker run -e DATABASE_URL=prod-db:5432 myapp

SCENARIO 2: Volume Mount Differences
═══════════════════════════════════════════════════

Local (Works):
$ docker run -v $(pwd)/data:/app/data myapp
✓ /app/data exists and writable

Production (Fails):
$ docker run -v /var/lib/data:/app/data myapp
✗ Error: Permission denied

Debug:
$ docker exec myapp ls -la /app/data
drwxr-xr-x root root  # Owned by root!

$ docker exec myapp whoami
appuser  # Running as appuser, can't write!

Fix:
# Option 1: Fix permissions on host
$ sudo chown -R 1001:1001 /var/lib/data

# Option 2: Use named volume
$ docker volume create app-data
$ docker run -v app-data:/app/data myapp

SCENARIO 3: Network Connectivity
═══════════════════════════════════════════════════

Local (Works):
$ docker run myapp
✓ Connects to database at "localhost"

Production (Fails):
$ docker run myapp
✗ Error: Cannot connect to localhost

Debug:
$ docker exec myapp ping database
ping: bad address 'database'

$ docker network inspect bridge
# Check if containers on same network

Fix:
# Create custom network
$ docker network create app-network

# Run containers on same network
$ docker run --network app-network --name db postgres
$ docker run --network app-network \
  -e DATABASE_URL=db:5432 myapp
# Now "db" resolves!

SCENARIO 4: Resource Constraints
═══════════════════════════════════════════════════

Local (Works):
Laptop: 16 GB RAM, 8 CPUs
$ docker run myapp
✓ Works fine

Production (Fails):
Server: Limited resources
$ docker run --memory=512m --cpus=1 myapp
✗ Container killed (OOM)

Debug:
$ docker stats myapp
MEM USAGE: 512MB / 512MB (100%)  # At limit!

$ docker inspect myapp | grep OOMKilled
"OOMKilled": true

Fix:
# Option 1: Increase limit
$ docker run --memory=1g myapp

# Option 2: Optimize application
# Reduce memory usage in code

# Option 3: Add swap
$ docker run --memory=512m --memory-swap=1g myapp

SCENARIO 5: File Permissions
═══════════════════════════════════════════════════

Local (Works):
$ docker run -v ./uploads:/app/uploads myapp
✓ Can write files

Production (Fails):
$ docker run -v /mnt/uploads:/app/uploads myapp
✗ Error: Permission denied

Debug:
$ docker exec myapp touch /app/uploads/test
touch: cannot touch '/app/uploads/test': Permission denied

$ docker exec myapp ls -la /app/uploads
drwxr-xr-x root root

$ docker exec myapp id
uid=1001(appuser)  # Not root!

Fix:
# On host, fix permissions
$ sudo chown -R 1001:1001 /mnt/uploads

# Or in Dockerfile, ensure proper permissions
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads
```

**Debugging Tools:**

```bash
# 1. Check container logs
$ docker logs --tail 100 container_name
$ docker logs -f container_name  # Follow

# 2. Inspect container
$ docker inspect container_name | jq .

# 3. Check resource usage
$ docker stats container_name

# 4. Enter container
$ docker exec -it container_name sh

# 5. Check network
$ docker exec container_name ping other_container
$ docker exec container_name nslookup database

# 6. Check filesystem
$ docker exec container_name df -h
$ docker exec container_name ls -la /app

# 7. Check processes
$ docker exec container_name ps aux

# 8. Check environment
$ docker exec container_name env

# 9. Copy files out for analysis
$ docker cp container_name:/app/logs/error.log ./

# 10. Run with overridden command
$ docker run -it --entrypoint /bin/sh myapp
```

---

### Q26: How do you debug a container that exits immediately?

**Answer:**

```
CONTAINER EXITS IMMEDIATELY - DEBUG PROCESS:
═══════════════════════════════════════════════════

Step 1: Check Exit Code
─────────────────────────────────────────
$ docker ps -a
CONTAINER ID   STATUS
abc123         Exited (1) 2 seconds ago

$ docker inspect abc123 --format='{{.State.ExitCode}}'
1

Exit Codes:
0   = Normal exit
1   = Application error
137 = Killed (OOM or docker kill)
139 = Segmentation fault
143 = Terminated (SIGTERM)

Step 2: Check Logs
─────────────────────────────────────────
$ docker logs abc123
Error: Failed to connect to database
Connection refused

Step 3: Investigate Common Causes
─────────────────────────────────────────

CAUSE 1: CMD/ENTRYPOINT exits immediately
═══════════════════════════════════════════════════

# ❌ BAD: Command exits
FROM ubuntu
CMD echo "Hello"  # Prints and exits!

# ✅ GOOD: Long-running process
FROM ubuntu
CMD ["tail", "-f", "/dev/null"]  # Keeps running

# Check what command is running
$ docker inspect abc123 | grep -A 5 Cmd
"Cmd": ["echo", "Hello"]  # Ah, that's the problem!

CAUSE 2: Application crashes on startup
═══════════════════════════════════════════════════

# Override entrypoint to debug
$ docker run -it --entrypoint /bin/bash myapp

# Now manually run the command
root@container:/# python app.py
Error: Missing DATABASE_URL environment variable

# Fix: Add environment variable
$ docker run -e DATABASE_URL=postgres://... myapp

CAUSE 3: Missing dependencies
═══════════════════════════════════════════════════

$ docker logs abc123
ImportError: No module named 'flask'

# Enter container to check
$ docker run -it --entrypoint /bin/sh myapp
/app # python -c "import flask"
Traceback: No module named 'flask'

# Fix Dockerfile
RUN pip install flask

CAUSE 4: Permission denied
═══════════════════════════════════════════════════

$ docker logs abc123
/bin/sh: cannot execute /app/start.sh: Permission denied

# Check permissions
$ docker run --rm myapp ls -la /app/start.sh
-rw-r--r-- 1 root root ... start.sh

# Fix: Make executable
RUN chmod +x /app/start.sh

CAUSE 5: Wrong working directory
═══════════════════════════════════════════════════

Dockerfile:
FROM python:3.11
COPY app.py /app/
CMD ["python", "app.py"]  # Can't find app.py!

# Fix: Set WORKDIR
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]

CAUSE 6: Configuration file missing
═══════════════════════════════════════════════════

$ docker logs abc123
Error: config.json not found

# Mount config at runtime
$ docker run -v $(pwd)/config.json:/app/config.json myapp
```

**Testing Fixes:**

```bash
# Test 1: Run with shell to debug
$ docker run -it --entrypoint /bin/bash myapp
root@abc:/# ls /app
root@abc:/# python app.py  # Run manually
root@abc:/# exit

# Test 2: Keep container alive for debugging
$ docker run -d --entrypoint tail myapp -f /dev/null
$ docker exec -it abc123 bash
# Now debug inside running container

# Test 3: Override CMD to see if it's command issue
$ docker run myapp /bin/bash
# If this works, issue is with original CMD

# Test 4: Check if it's environment-specific
$ docker run -it -e DEBUG=true myapp
# Add debug mode to see detailed errors
```

---

(Continue to Part 4 for more questions on Real-World Production Scenarios, Docker Compose, Registry, and Challenging Scenarios?)