# Complete Docker Security Guide for Multi-Project Servers

## Table of Contents

1. [Understanding Docker Security](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#understanding)
2. [Docker Security Architecture](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#architecture)
3. [Container Isolation and Namespaces](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#isolation)
4. [Image Security](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#image-security)
5. [Network Security](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#network-security)
6. [Secrets Management](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#secrets-management)
7. [User and Permission Management](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#user-management)
8. [Resource Limits and Controls](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#resource-limits)
9. [Security Scanning and Monitoring](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#scanning)
10. [Hardening Docker Daemon](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#docker-daemon)
11. [Complete Security Implementation](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#implementation)
12. [Security Checklist and Audit](https://claude.ai/chat/aefcc9c9-f1e1-41de-9883-ed6b27dff2da#checklist)

---

## 1. Understanding Docker Security {#understanding}

Docker provides multiple layers of security, but many features are **not enabled by default**. Understanding these layers is crucial for running production workloads safely.

### The Docker Security Stack

```
┌────────────────────────────────────────────────────────────────┐
│                    Security Layers Stack                       │
│                                                                │
│  Layer 7: Security Scanning & Monitoring                       │
│           ├─ Image vulnerability scanning                      │
│           ├─ Runtime security monitoring                       │
│           └─ Audit logging                                     │
│                                                                │
│  Layer 6: Secrets Management                                   │
│           ├─ Docker secrets                                    │
│           ├─ Environment variable protection                   │
│           └─ Encrypted storage                                 │
│                                                                │
│  Layer 5: Network Isolation                                    │
│           ├─ Custom networks                                   │
│           ├─ Network policies                                  │
│           └─ Firewall rules                                    │
│                                                                │
│  Layer 4: Resource Limits                                      │
│           ├─ CPU limits                                        │
│           ├─ Memory limits                                     │
│           └─ Storage limits                                    │
│                                                                │
│  Layer 3: Access Control                                       │
│           ├─ User namespaces                                   │
│           ├─ Read-only filesystems                             │
│           └─ Capability dropping                               │
│                                                                │
│  Layer 2: Container Runtime Security                           │
│           ├─ Seccomp profiles                                  │
│           ├─ AppArmor/SELinux                                  │
│           └─ No privileged mode                                │
│                                                                │
│  Layer 1: Image Security                                       │
│           ├─ Official base images                              │
│           ├─ Minimal images                                    │
│           ├─ No secrets in images                              │
│           └─ Image signing                                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Common Security Vulnerabilities (What Can Go Wrong)

**Vulnerability 1: Running as Root**

```dockerfile
# ❌ INSECURE (Default behavior)
FROM node:18-alpine
WORKDIR /app
COPY . .
CMD ["node", "server.js"]

# Container runs as root (UID 0)
# If compromised, attacker has root access inside container
```

**Vulnerability 2: Privileged Mode**

```yaml
# ❌ EXTREMELY DANGEROUS
services:
  app:
    privileged: true  # Gives container almost full host access
    # Can access all devices, mount filesystems, bypass security
```

**Vulnerability 3: Exposed Docker Socket**

```yaml
# ❌ CRITICAL SECURITY RISK
services:
  app:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    # Container can now control Docker on the host
    # Can create privileged containers, escape isolation
```

**Vulnerability 4: Secrets in Environment Variables**

```yaml
# ❌ INSECURE - Visible in docker inspect
services:
  app:
    environment:
      - DATABASE_PASSWORD=supersecret123
      - API_KEY=sk_live_abc123
```

**Vulnerability 5: No Resource Limits**

```yaml
# ❌ VULNERABLE TO RESOURCE EXHAUSTION
services:
  app:
    image: myapp
    # No limits - one container can consume all CPU/memory
    # Can cause denial of service for other containers
```

---

## 2. Docker Security Architecture {#architecture}

### How Docker Isolates Containers

Docker uses Linux kernel features to create isolated environments:

```
┌──────────────────────────────────────────────────────────────────┐
│                         Linux Kernel                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Namespaces                              │  │
│  │  (Process, Network, Mount, User, IPC, UTS isolation)       │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │ Container 1  │  │ Container 2  │  │ Container 3  │      │  │
│  │  │              │  │              │  │              │      │  │
│  │  │ PID: 1-100   │  │ PID: 1-100   │  │ PID: 1-100   │      │  │
│  │  │ (isolated)   │  │ (isolated)   │  │ (isolated)   │      │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────-──┐ │
│  │                      Control Groups (cgroups)               │ │
│  │  (Resource limits: CPU, Memory, Disk I/O, Network)          │ │
│  │                                                             │ │
│  │  Container 1: max 1 CPU, 512MB RAM                          │ │
│  │  Container 2: max 2 CPU, 1GB RAM                            │ │
│  │  Container 3: max 0.5 CPU, 256MB RAM                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Security Modules                        │  │
│  │  ├─ Seccomp: Syscall filtering                             │  │
│  │  ├─ AppArmor/SELinux: Mandatory access control             │  │
│  │  └─ Capabilities: Fine-grained privileges                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Security vs Convenience Trade-off

```
High Security                              High Convenience
(More restrictions)                        (Fewer restrictions)
     │                                              │
     ├─ User namespaces                             ├─ Run as root
     ├─ Read-only root filesystem                   ├─ Writable filesystem
     ├─ Drop all capabilities                       ├─ Full capabilities
     ├─ Custom seccomp profile                      ├─ Default profile
     ├─ No network access                           ├─ Host network mode
     ├─ Resource limits                             ├─ Unlimited resources
     │                                              │
     └───────────────┬──────────────────────────────┘
                     │
              Find the balance
           (Production sweet spot)
```

---

## 3. Container Isolation and Namespaces {#isolation}

### Understanding Namespaces

Namespaces are the foundation of container isolation. Each namespace isolates a specific system resource.

**Types of Namespaces**:

1. **PID Namespace** (Process isolation)
2. **Network Namespace** (Network stack isolation)
3. **Mount Namespace** (Filesystem isolation)
4. **User Namespace** (User ID isolation)
5. **IPC Namespace** (Inter-process communication isolation)
6. **UTS Namespace** (Hostname isolation)

### Enabling User Namespaces

User namespaces remap container root to unprivileged host user.

**How it works**:

```
Without user namespaces:
Container Root (UID 0) = Host Root (UID 0)  ❌ DANGEROUS!

With user namespaces:
Container Root (UID 0) = Host User (UID 100000)  ✓ SAFE!
```

**Enable user namespaces**:

```bash
# 1. Configure Docker daemon
sudo nano /etc/docker/daemon.json
```

```json
{
  "userns-remap": "default"
}
```

```bash
# 2. Restart Docker
sudo systemctl restart docker

# 3. Verify
docker info | grep "userns"

# Output should show:
# Security Options:
#  userns
```

**What happens**:

```bash
# Check subuid/subgid mappings
cat /etc/subuid
# dockremap:100000:65536

cat /etc/subgid
# dockremap:100000:65536

# Container UID 0 maps to host UID 100000
# Container UID 1 maps to host UID 100001
# etc.
```

**Test it**:

```bash
# Start container as root
docker run --rm -it alpine id
# Output: uid=0(root) gid=0(root)

# Check from host what the actual UID is
docker run --rm alpine sleep 1000 &
ps aux | grep sleep
# Shows UID 100000, not 0!
```

### Read-Only Root Filesystem

Prevent containers from writing to their filesystem (except specific volumes).

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    volumes:
      - app_data:/data  # Only this is writable
```

**Why this matters**:

```
Attacker compromises container:
├─ Tries to install malware → BLOCKED (read-only filesystem)
├─ Tries to modify system files → BLOCKED
├─ Tries to write backdoor → BLOCKED
└─ Can only write to /tmp (cleared on restart) and /data
```

### Dropping Capabilities

Linux capabilities divide root privileges into distinct units. Drop unnecessary ones.

**Default capabilities** (too many!):

```
CHOWN, DAC_OVERRIDE, FSETID, FOWNER, MKNOD, NET_RAW, SETGID,
SETUID, SETFCAP, SETPCAP, NET_BIND_SERVICE, SYS_CHROOT, KILL,
AUDIT_WRITE
```

**Drop all and add only what's needed**:

```yaml
services:
  app:
    image: myapp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only need to bind to port 80/443
```

**Common capability needs**:

```yaml
# Web server (needs to bind to ports < 1024)
cap_add:
  - NET_BIND_SERVICE

# Application that changes user/group
cap_add:
  - SETUID
  - SETGID

# Application that needs raw sockets (like ping)
cap_add:
  - NET_RAW

# Most apps need NONE!
cap_drop:
  - ALL
```

### No New Privileges Flag

Prevents privilege escalation inside container.

```yaml
services:
  app:
    image: myapp
    security_opt:
      - no-new-privileges:true
```

**What it prevents**:

```bash
# Without no-new-privileges:
# Attacker finds setuid binary
chmod +s /bin/bash  # Sets setuid bit
./bash              # Gains elevated privileges

# With no-new-privileges:
chmod +s /bin/bash  # Sets setuid bit
./bash              # Setuid is IGNORED, no privilege escalation
```

---

## 4. Image Security {#image-security}

### Use Minimal Base Images

Smaller images = fewer vulnerabilities

```dockerfile
# ❌ BAD: Full OS (1.13 GB, thousands of packages)
FROM ubuntu:22.04

# ⚠️ BETTER: Slim variant (229 MB)
FROM node:18-slim

# ✓ BEST: Alpine (49 MB, minimal packages)
FROM node:18-alpine
```

**Size comparison**:

```
ubuntu:22.04         → 77 MB  (compressed), 1.13 GB (unpacked)
node:18              → 337 MB (compressed), 1.1 GB (unpacked)
node:18-slim         → 87 MB  (compressed), 229 MB (unpacked)
node:18-alpine       → 49 MB  (compressed), 175 MB (unpacked)
```

### Multi-Stage Builds to Minimize Attack Surface

```dockerfile
# ❌ BAD: Includes build tools in production image
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install  # Includes devDependencies
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]

# Build tools, TypeScript compiler, etc. all in production image!
```

```dockerfile
# ✓ GOOD: Build and runtime separated
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (only what's needed)
FROM node:18-alpine
WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Don't Store Secrets in Images

```dockerfile
# ❌ CRITICAL MISTAKE: Secret in build args
ARG DATABASE_PASSWORD=supersecret123
ENV DATABASE_PASSWORD=${DATABASE_PASSWORD}

# This password is BAKED INTO THE IMAGE
# Anyone with access to image can extract it
```

**Why this is dangerous**:

```bash
# Extract secrets from image
docker history myapp:latest
# Shows all layers including build args

docker inspect myapp:latest
# Shows environment variables

# Extract from image filesystem
docker save myapp:latest -o myapp.tar
tar -xf myapp.tar
# Can find secrets in layer files
```

**Correct approach**:

```dockerfile
# ✓ GOOD: No secrets in Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .

# Secrets provided at runtime
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    environment:
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
    # Or use secrets (better)
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Scan Images for Vulnerabilities

Use tools to scan images before deployment.

**Trivy** (free, comprehensive):

```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan image
trivy image node:18-alpine

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Output to JSON
trivy image -f json -o results.json myapp:latest

# Fail CI if vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

**Integrate in CI/CD**:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, production]
  pull_request:
    branches: [production]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Fail if critical vulnerabilities found
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          exit-code: '1'
          severity: 'CRITICAL'
```

### Sign and Verify Images

Docker Content Trust ensures images haven't been tampered with.

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Push signed image (requires Notary)
docker push myregistry.com/myapp:latest
# Prompts for signing key passphrase

# Pull image (verifies signature)
docker pull myregistry.com/myapp:latest
# Fails if signature is invalid or missing
```

---

## 5. Network Security {#network-security}

### Network Isolation Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    Docker Host Server                          │
│                                                                │
│  ┌─────────────────────────────────────────────────────-─────┐ │
│  │              Project 1 Network (Isolated)                 │ │
│  │                                                           │ │
│  │  ┌──────────┐    ┌──────────┐    ┌─────────────┐          │ │
│  │  │ Frontend │    │ Backend  │    │ PostgreSQL  │          │ │
│  │  │          │───►│          │───►│             │          │ │
│  │  └──────────┘    └──────────┘    └─────────────┘          │ │
│  │       │               │                                   │ │
│  └───────┼───────────────┼───────────────────────────────────┘ │
│          │               │                                     │
│  ┌───────▼───────────────▼───────────────────────────────────┐ │
│  │              Proxy Network (Shared)                       │ │
│  │              Only frontend/backend connect here           │ │
│  │                                                           │ │
│  │                 ┌─────────────────┐                       │ │
│  │                 │  Nginx Proxy    │                       │ │
│  │                 │  (Port 80, 443) │                       │ │
│  │                 └─────────────────┘                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────-────┐ │
│  │              Project 2 Network (Isolated)                 │ │
│  │                                                           │ │
│  │  ┌──────────┐    ┌──────────┐    ┌─────────────┐          │ │
│  │  │ Frontend │    │ Backend  │    │   MySQL     │          │ │
│  │  │          │───►│          │───►│             │          │ │
│  │  └──────────┘    └──────────┘    └─────────────┘          │ │
│  └─────────────────────────────────────────────────────-────┘  │
│                                                                │
│  Key Security Principle:                                       │
│  - Databases NEVER on proxy network                            │
│  - Each project isolated from others                           │
│  - Only web-facing containers on proxy network                 │
└────────────────────────────────────────────────────────────────┘
```

### Implementing Network Segmentation

```yaml
# docker-compose.yml
services:
  # Frontend - needs external access
  frontend:
    image: myapp-frontend
    networks:
      - internal      # Can talk to backend
      - proxy         # Can receive traffic from nginx
  
  # Backend - needs external access and database
  backend:
    image: myapp-backend
    networks:
      - internal      # Can talk to database
      - proxy         # Can receive traffic from nginx
  
  # Database - NO external access
  postgres:
    image: postgres:15-alpine
    networks:
      - internal      # Only internal network
    # NOT on proxy network!
  
  # Redis - NO external access
  redis:
    image: redis:7-alpine
    networks:
      - internal
    # NOT on proxy network!

networks:
  # Internal network - private to this project
  internal:
    driver: bridge
    internal: true  # No external connectivity
  
  # Proxy network - shared with nginx
  proxy:
    external: true
```

### Firewall Rules with iptables

```bash
#!/bin/bash
# /opt/scripts/docker-firewall.sh

# Allow established connections
iptables -A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Allow traffic from specific IPs only
ALLOWED_IPS="203.0.113.0/24 198.51.100.0/24"

for ip in $ALLOWED_IPS; do
    iptables -A DOCKER-USER -s $ip -j ACCEPT
done

# Block access to database ports from outside
iptables -A DOCKER-USER -p tcp --dport 5432 -j DROP   # PostgreSQL
iptables -A DOCKER-USER -p tcp --dport 27017 -j DROP  # MongoDB
iptables -A DOCKER-USER -p tcp --dport 6379 -j DROP   # Redis
iptables -A DOCKER-USER -p tcp --dport 3306 -j DROP   # MySQL

# Log dropped packets
iptables -A DOCKER-USER -j LOG --log-prefix "DOCKER-USER-DROP: " --log-level 4

# Drop everything else
iptables -A DOCKER-USER -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Disable Inter-Container Communication (ICC)

```json
// /etc/docker/daemon.json
{
  "icc": false,
  "iptables": true
}
```

```bash
sudo systemctl restart docker
```

Now containers can only communicate if on the same custom network.

---

## 6. Secrets Management {#secrets-management}

### Docker Secrets (Swarm Mode)

Docker Secrets is the most secure way to handle sensitive data.

```bash
# Initialize swarm mode (required for secrets)
docker swarm init

# Create secret from file
echo "super_secret_password" | docker secret create db_password -

# Or from file
docker secret create db_password /path/to/password.txt

# List secrets
docker secret ls

# Inspect secret (doesn't show value!)
docker secret inspect db_password
```

**Use in docker-compose**:

```yaml
version: '3.8'

services:
  backend:
    image: myapp-backend
    secrets:
      - db_password
      - api_key
    environment:
      # Point to secret file
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - API_KEY_FILE=/run/secrets/api_key

secrets:
  db_password:
    external: true
  api_key:
    external: true
```

**Read secrets in application**:

```javascript
// Node.js
const fs = require('fs');

function getSecret(secretName) {
  try {
    const secretPath = process.env[`${secretName.toUpperCase()}_FILE`];
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    console.error(`Failed to read secret ${secretName}:`, error);
    process.exit(1);
  }
}

const dbPassword = getSecret('db_password');
const apiKey = getSecret('api_key');

// Use secrets
const dbUrl = `postgresql://user:${dbPassword}@postgres:5432/db`;
```

```go
// Golang
package main

import (
    "io/ioutil"
    "os"
    "strings"
)

func getSecret(name string) (string, error) {
    secretFile := os.Getenv(strings.ToUpper(name) + "_FILE")
    data, err := ioutil.ReadFile(secretFile)
    if err != nil {
        return "", err
    }
    return strings.TrimSpace(string(data)), nil
}

func main() {
    dbPassword, err := getSecret("db_password")
    if err != nil {
        panic(err)
    }
    
    // Use secret
    dbUrl := fmt.Sprintf("postgresql://user:%s@postgres:5432/db", dbPassword)
}
```

### Environment Variable Security

If you can't use Docker Secrets, secure environment variables:

```yaml
# ❌ BAD: Secrets in docker-compose.yml (committed to git)
services:
  app:
    environment:
      - DB_PASSWORD=supersecret123

# ✓ BETTER: Use .env file (not committed)
services:
  app:
    env_file:
      - .env

# ✓ BEST: Use Docker secrets
```

**.env file** (add to .gitignore):

```bash
# .env
DB_PASSWORD=supersecret123
API_KEY=sk_live_abc123

# .gitignore
.env
*.env
!.env.example
```

**.env.example** (commit this as template):

```bash
# .env.example
DB_PASSWORD=change_me
API_KEY=your_api_key_here
```

### Encrypted Environment Variables

```bash
#!/bin/bash
# encrypt-env.sh

# Encrypt .env file
gpg --symmetric --cipher-algo AES256 .env

# This creates .env.gpg

# Decrypt at runtime
gpg --decrypt .env.gpg > .env
docker-compose up -d

# Clean up
rm .env
```

### HashiCorp Vault Integration

For enterprise secrets management:

```yaml
services:
  backend:
    image: myapp-backend
    environment:
      - VAULT_ADDR=https://vault.company.com
      - VAULT_TOKEN=${VAULT_TOKEN}
    command: |
      sh -c "
        vault kv get -field=password secret/database > /tmp/db_pass
        node server.js
      "
```

---

## 7. User and Permission Management {#user-management}

### Never Run as Root

```dockerfile
# ❌ BAD: Runs as root (default)
FROM node:18-alpine
WORKDIR /app
COPY . .
CMD ["node", "server.js"]

# Check: docker run myapp id
# Output: uid=0(root) gid=0(root)  ← DANGEROUS!
```

```dockerfile
# ✓ GOOD: Create and use non-root user
FROM node:18-alpine

# Create user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy files as root
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]

# Check: docker run myapp id
# Output: uid=1001(nodejs) gid=1001(nodejs)  ✓
```

### File Permissions in Volumes

```yaml
services:
  app:
    image: myapp
    user: "1001:1001"  # Run as UID:GID
    volumes:
      - app_data:/data

volumes:
  app_data:
    driver: local
    driver_opts:
      type: none
      o: bind,uid=1001,gid=1001
      device: /opt/docker-data/app
```

### User Remapping

```bash
# Check current user mapping
docker run --rm alpine id

# Enable user namespace remapping
sudo nano /etc/docker/daemon.json
```

```json
{
  "userns-remap": "default"
}
```

```bash
sudo systemctl restart docker

# Now check again
docker run --rm alpine id
# Output: uid=0(root) gid=0(root)  (inside container)

# But on host:
ps aux | grep "docker"
# Shows actual UID 100000+ (remapped)
```

---

## 8. Resource Limits and Controls {#resource-limits}

### Why Resource Limits Matter

Without limits, one compromised or misbehaving container can:

- Consume all CPU → other containers starve
- Fill all RAM → kernel OOM killer starts killing processes
- Fill all disk → database corruption, service failures

### CPU Limits

```yaml
services:
  # Method 1: CPU shares (relative weight)
  frontend:
    image: myapp-frontend
    cpu_shares: 1024  # Default, gets 1x share
  
  backend:
    image: myapp-backend
    cpu_shares: 2048  # Gets 2x share (twice as much CPU)
  
  # Method 2: CPU count
  worker:
    image: myapp-worker
    cpus: '1.5'  # Maximum 1.5 CPUs
  
  # Method 3: CPU percentage
  batch:
    image: myapp-batch
    cpu_percent: 50  # Maximum 50% of one CPU
  
  # Method 4: Specific CPUs
  analytics:
    image: myapp-analytics
    cpuset: '0,1'  # Only use CPU 0 and 1
```

**Deploy configuration** (better for production):

```yaml
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '2.0'      # Hard limit
          memory: 2048M    # Hard limit
        reservations:
          cpus: '1.0'      # Guaranteed minimum
          memory: 1024M    # Guaranteed minimum
```

### Memory Limits

```yaml
services:
  app:
    image: myapp
    mem_limit: 1g           # Maximum memory
    mem_reservation: 512m   # Soft limit (guaranteed)
    memswap_limit: 2g      # Memory + swap limit
```

**What happens when limit is reached**:

```yaml
services:
  app:
    mem_limit: 512m
    oom_kill_disable: false  # Default: container is killed if OOM
    # oom_kill_disable: true  # DON'T DO THIS in production!
```

### Storage Limits

```yaml
services:
  app:
    image: myapp
    storage_opt:
      size: '10G'  # Maximum storage for container
```

**Volume size limits**:

```bash
# Create limited volume
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=1g \
  limited_volume
```

### Complete Resource Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    image: myapp-frontend
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  backend:
    image: myapp-backend
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
  
  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    shm_size: 256m  # Shared memory for PostgreSQL
```

### Monitoring Resource Usage

```bash
# Real-time resource usage
docker stats

# Output:
# CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT   MEM %
# abc123         project1_backend  15.2%     512MiB / 2GiB      25%
# def456         project1_postgres 8.7%      1.2GiB / 4GiB      30%

# Specific container
docker stats project1_backend

# Format output
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Automated monitoring script**:

```bash
#!/bin/bash
# /opt/scripts/monitor-resources.sh

THRESHOLD_CPU=80
THRESHOLD_MEM=85

while true; do
    docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemPerc}}" | \
    while IFS=',' read -r name cpu mem; do
        cpu_val=$(echo $cpu | sed 's/%//')
        mem_val=$(echo $mem | sed 's/%//')
        
        if (( $(echo "$cpu_val > $THRESHOLD_CPU" | bc -l) )); then
            echo "⚠️  $name: High CPU usage: $cpu"
            # Send alert
        fi
        
        if (( $(echo "$mem_val > $THRESHOLD_MEM" | bc -l) )); then
            echo "⚠️  $name: High memory usage: $mem"
            # Send alert
        fi
    done
    
    sleep 60
done
```

---

## 9. Security Scanning and Monitoring {#scanning}

### Runtime Security Monitoring with Falco

Falco detects anomalous behavior in running containers.

**Install Falco**:

```bash
# Install Falco kernel module
curl -s https://falco.org/repo/falcosecurity-3672BA8F.asc | apt-key add -
echo "deb https://download.falco.org/packages/deb stable main" | tee -a /etc/apt/sources.list.d/falcosecurity.list
apt-get update
apt-get install -y falco

# Start Falco
systemctl start falco
```

**Falco detects**:

- Shell spawned in container
- Sensitive file access
- Privilege escalation attempts
- Unexpected network connections
- Binary execution from /tmp

**Example alerts**:

```
Warning Shell spawned in container
  container=project1_backend
  command=bash
  user=nodejs

Critical Sensitive file opened for writing
  container=project1_postgres
  file=/etc/passwd
  user=postgres

Error Unexpected network connection
  container=project1_backend
  destination=suspicious-domain.com
  port=4444
```

### Container Security Scanning

```bash
# Scan running containers
docker scan project1_backend

# Scan image before running
docker scan myregistry.com/myapp:latest

# Generate report
docker scan --file Dockerfile --json myapp:latest > security-report.json
```

### Audit Logging

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "labels": "production_tag",
    "env": "os,customer"
  },
  "audit-log": true,
  "audit-log-format": "json",
  "audit-log-path": "/var/log/docker/audit.log"
}
```

### Security Event Monitoring

```bash
#!/bin/bash
# /opt/scripts/security-monitor.sh

LOG_FILE="/var/log/docker-security.log"

log_event() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Monitor for privileged containers
docker events --filter 'type=container' --filter 'event=start' --format '{{json .}}' | \
while read event; do
    container_id=$(echo "$event" | jq -r '.id')
    container_name=$(echo "$event" | jq -r '.Actor.Attributes.name')
    
    # Check if privileged
    privileged=$(docker inspect --format='{{.HostConfig.Privileged}}' "$container_id")
    
    if [ "$privileged" = "true" ]; then
        log_event "⚠️  ALERT: Privileged container started: $container_name ($container_id)"
        # Send alert
        curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"⚠️ Privileged container started: $container_name\"}"
    fi
    
    # Check for exposed docker socket
    volumes=$(docker inspect --format='{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' "$container_id")
    if echo "$volumes" | grep -q "/var/run/docker.sock"; then
        log_event "🚨 CRITICAL: Container has access to Docker socket: $container_name"
        # Send critical alert
    fi
done
```

---

## 10. Hardening Docker Daemon {#docker-daemon}

### Secure Docker Daemon Configuration

```json
// /etc/docker/daemon.json
{
  // User namespace remapping
  "userns-remap": "default",
  
  // Disable inter-container communication
  "icc": false,
  
  // Enable SELinux/AppArmor
  "selinux-enabled": true,
  
  // Default seccomp profile
  "seccomp-profile": "/etc/docker/seccomp-default.json",
  
  // Default capabilities to drop
  "default-capabilities": [
    "CHOWN",
    "DAC_OVERRIDE",
    "SETGID",
    "SETUID",
    "NET_BIND_SERVICE"
  ],
  
  // Disable legacy registry
  "disable-legacy-registry": true,
  
  // Live restore (containers keep running if daemon restarts)
  "live-restore": true,
  
  // Logging
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  
  // Storage driver
  "storage-driver": "overlay2",
  
  // Default ulimits
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  
  // No experimental features in production
  "experimental": false
}
```

### TLS for Docker Daemon

Secure remote Docker API access:

```bash
# Generate CA
openssl genrsa -aes256 -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem

# Generate server key
openssl genrsa -out server-key.pem 4096
openssl req -subj "/CN=$HOST" -sha256 -new -key server-key.pem -out server.csr

echo "subjectAltName = DNS:$HOST,IP:$IP" > extfile.cnf
openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# Configure Docker daemon
```

```json
{
  "tls": true,
  "tlscert": "/etc/docker/certs/server-cert.pem",
  "tlskey": "/etc/docker/certs/server-key.pem",
  "tlscacert": "/etc/docker/certs/ca.pem",
  "tlsverify": true,
  "hosts": ["tcp://0.0.0.0:2376", "unix:///var/run/docker.sock"]
}
```

### Restrict Docker Socket Access

```bash
# Only allow specific users to access Docker socket
sudo groupadd docker
sudo usermod -aG docker deploy
sudo usermod -aG docker ci-user

# Set strict permissions
sudo chown root:docker /var/run/docker.sock
sudo chmod 660 /var/run/docker.sock

# Never expose Docker socket to containers!
# This is equivalent to giving root access to host
```

---

## 11. Complete Security Implementation {#implementation}

### Secure Dockerfile Template

```dockerfile
# Use specific version (not :latest)
FROM node:18.19.0-alpine3.19

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

WORKDIR /app

# Install dependencies as root (needed for node_modules permissions)
COPY --chown=appuser:appuser package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy application
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
```

### Secure Docker Compose Template

```yaml
version: '3.8'

services:
  frontend:
    image: myapp-frontend:${VERSION:-latest}
    container_name: ${PROJECT}_frontend
    restart: unless-stopped
    
    # Security options
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    
    # Networking
    networks:
      - internal
      - proxy
    
    # Writable mounts (since read_only: true)
    tmpfs:
      - /tmp:mode=1777,size=100m
      - /var/run:mode=755,size=10m
    
    # Environment (no secrets here!)
    environment:
      - NODE_ENV=production
    
    # Secrets
    secrets:
      - api_key
    
    # Health check
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "project,environment"
  
  backend:
    image: myapp-backend:${VERSION:-latest}
    container_name: ${PROJECT}_backend
    restart: unless-stopped
    
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    
    networks:
      - internal
      - proxy
    
    tmpfs:
      - /tmp:mode=1777,size=100m
    
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    
    secrets:
      - db_password
      - jwt_secret
    
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_USER=${DB_USER}
      - DB_NAME=${DB_NAME}
      - REDIS_HOST=redis
    
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  postgres:
    image: postgres:15.5-alpine
    container_name: ${PROJECT}_postgres
    restart: unless-stopped
    
    # Database should NOT be read-only
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - SETGID
      - SETUID
    
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    
    # Only on internal network (NOT proxy!)
    networks:
      - internal
    
    secrets:
      - db_password
    
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    
    # Shared memory for PostgreSQL
    shm_size: 256m
  
  redis:
    image: redis:7.2-alpine
    container_name: ${PROJECT}_redis
    restart: unless-stopped
    
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    
    networks:
      - internal
    
    command: redis-server --requirepass-file /run/secrets/redis_password
    
    secrets:
      - redis_password
    
    volumes:
      - redis_data:/data
    
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
    name: ${PROJECT}_postgres_data
    driver: local
    driver_opts:
      type: none
      o: bind,uid=999,gid=999
      device: /opt/docker-volumes/${PROJECT}/postgres
  
  redis_data:
    name: ${PROJECT}_redis_data
    driver: local

networks:
  internal:
    name: ${PROJECT}_network
    driver: bridge
    internal: true  # No external connectivity
    ipam:
      config:
        - subnet: 172.20.0.0/16
  
  proxy:
    external: true

secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  api_key:
    file: ./secrets/api_key.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Security Automation Script

```bash
#!/bin/bash
# /opt/scripts/security-audit.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Docker Security Audit ==="

# Check for privileged containers
echo -e "\n${YELLOW}Checking for privileged containers...${NC}"
privileged=$(docker ps --format '{{.Names}}' | while read name; do
    if [ "$(docker inspect --format='{{.HostConfig.Privileged}}' $name)" = "true" ]; then
        echo "  ${RED}✗${NC} $name is running in privileged mode"
    fi
done)
if [ -z "$privileged" ]; then
    echo "  ${GREEN}✓${NC} No privileged containers found"
fi

# Check for exposed Docker socket
echo -e "\n${YELLOW}Checking for exposed Docker socket...${NC}"
socket_exposed=$(docker ps --format '{{.Names}}' | while read name; do
    if docker inspect --format='{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' $name | grep -q "/var/run/docker.sock"; then
        echo "  ${RED}✗${NC} $name has access to Docker socket"
    fi
done)
if [ -z "$socket_exposed" ]; then
    echo "  ${GREEN}✓${NC} No containers with Docker socket access"
fi

# Check for root containers
echo -e "\n${YELLOW}Checking for containers running as root...${NC}"
docker ps --format '{{.Names}}' | while read name; do
    user=$(docker inspect --format='{{.Config.User}}' $name)
    if [ -z "$user" ] || [ "$user" = "0" ] || [ "$user" = "root" ]; then
        echo "  ${RED}✗${NC} $name is running as root"
    else
        echo "  ${GREEN}✓${NC} $name is running as user: $user"
    fi
done

# Check for resource limits
echo -e "\n${YELLOW}Checking for resource limits...${NC}"
docker ps --format '{{.Names}}' | while read name; do
    mem_limit=$(docker inspect --format='{{.HostConfig.Memory}}' $name)
    cpu_limit=$(docker inspect --format='{{.HostConfig.NanoCpus}}' $name)
    
    if [ "$mem_limit" = "0" ]; then
        echo "  ${YELLOW}⚠${NC}  $name has no memory limit"
    fi
    
    if [ "$cpu_limit" = "0" ]; then
        echo "  ${YELLOW}⚠${NC}  $name has no CPU limit"
    fi
done

# Check image versions
echo -e "\n${YELLOW}Checking for :latest tags...${NC}"
docker ps --format '{{.Image}}' | while read image; do
    if echo "$image" | grep -q ":latest"; then
        echo "  ${YELLOW}⚠${NC}  Using :latest tag: $image"
    fi
done

# Scan for vulnerabilities
echo -e "\n${YELLOW}Scanning images for vulnerabilities...${NC}"
docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read image; do
    echo "Scanning $image..."
    trivy image --severity HIGH,CRITICAL --quiet $image | grep -q "Total: 0" && \
        echo "  ${GREEN}✓${NC} No high/critical vulnerabilities" || \
        echo "  ${RED}✗${NC} Vulnerabilities found in $image"
done

echo -e "\n=== Audit Complete ==="
```

---

## 12. Security Checklist and Audit {#checklist}

### Production Security Checklist

```
## Image Security
☐ Use specific image versions (not :latest)
☐ Use minimal base images (alpine when possible)
☐ Multi-stage builds to minimize image size
☐ No secrets in Dockerfiles or images
☐ Run vulnerability scans on all images
☐ Sign images with Docker Content Trust
☐ Regularly update base images

## Container Runtime Security
☐ Run containers as non-root user
☐ Drop all capabilities, add only needed ones
☐ Use read-only root filesystem
☐ Enable no-new-privileges
☐ Never use privileged mode
☐ Never expose Docker socket to containers
☐ Use security-opt for additional hardening

## Network Security
☐ Use custom networks (not default bridge)
☐ Isolate databases on internal-only networks
☐ Only expose necessary ports
☐ Implement network segmentation between projects
☐ Use firewall rules to restrict access
☐ Disable inter-container communication (icc=false)

## Secrets Management
☐ Never store secrets in environment variables
☐ Use Docker secrets or external secret managers
☐ Secrets read from files at runtime
☐ .env files in .gitignore
☐ Rotate secrets regularly
☐ Encrypt sensitive configuration files

## Resource Management
☐ Set memory limits on all containers
☐ Set CPU limits on all containers
☐ Set storage limits
☐ Monitor resource usage
☐ Configure restart policies appropriately

## Access Control
☐ Enable user namespace remapping
☐ Restrict Docker socket access
☐ Use least privilege principle
☐ Implement RBAC for Docker access
☐ Regular access audits

## Monitoring and Logging
☐ Centralized logging configured
☐ Security event monitoring in place
☐ Runtime security monitoring (Falco or similar)
☐ Regular security scans scheduled
☐ Audit logging enabled
☐ Alert systems configured

## Docker Daemon Security
☐ Latest Docker version installed
☐ Secure daemon configuration
☐ TLS enabled for remote access
☐ User namespace remapping enabled
☐ Live restore enabled
☐ Experimental features disabled in production

## Backup and Recovery
☐ Regular automated backups
☐ Backup encryption enabled
☐ Disaster recovery plan documented
☐ Recovery procedures tested
☐ Off-site backup storage

## Compliance and Documentation
☐ Security policies documented
☐ Incident response plan in place
☐ Regular security audits scheduled
☐ Compliance requirements met
☐ Team trained on security practices
```

### Automated Security Audit Script

```bash
#!/bin/bash
# /opt/scripts/complete-security-audit.sh

OUTPUT_FILE="/opt/security-audit-$(date +%Y%m%d).txt"

{
    echo "======================================"
    echo "Docker Security Audit Report"
    echo "Generated: $(date)"
    echo "======================================"
    
    echo -e "\n## Docker Version"
    docker version
    
    echo -e "\n## Running Containers"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    
    echo -e "\n## Security Issues"
    
    echo -e "\n### Privileged Containers"
    docker ps -q | while read cid; do
        name=$(docker inspect --format='{{.Name}}' $cid)
        priv=$(docker inspect --format='{{.HostConfig.Privileged}}' $cid)
        if [ "$priv" = "true" ]; then
            echo "❌ CRITICAL: $name is privileged"
        fi
    done
    
    echo -e "\n### Root Containers"
    docker ps -q | while read cid; do
        name=$(docker inspect --format='{{.Name}}' $cid)
        user=$(docker inspect --format='{{.Config.User}}' $cid)
        if [ -z "$user" ]; then
            echo "⚠️  WARNING: $name runs as root"
        fi
    done
    
    echo -e "\n### Resource Limits"
    docker ps -q | while read cid; do
        name=$(docker inspect --format='{{.Name}}' $cid)
        mem=$(docker inspect --format='{{.HostConfig.Memory}}' $cid)
        cpu=$(docker inspect --format='{{.HostConfig.NanoCpus}}' $cid)
        if [ "$mem" = "0" ]; then
            echo "⚠️  WARNING: $name has no memory limit"
        fi
        if [ "$cpu" = "0" ]; then
            echo "⚠️  WARNING: $name has no CPU limit"
        fi
    done
    
    echo -e "\n### Image Vulnerabilities"
    docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | while read image; do
        echo "Scanning $image..."
        trivy image --severity HIGH,CRITICAL --format table $image
    done
    
    echo -e "\n### Network Configuration"
    docker network ls
    
    echo -e "\n### Volume Mounts"
    docker ps -q | while read cid; do
        name=$(docker inspect --format='{{.Name}}' $cid)
        echo "Container: $name"
        docker inspect --format='{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}' $cid
    done
    
    echo -e "\n======================================"
    echo "Audit Complete"
    echo "======================================"
    
} | tee "$OUTPUT_FILE"

echo "Report saved to: $OUTPUT_FILE"
```

---

## Summary

You now have comprehensive Docker security knowledge:

✅ **Understanding**: How Docker security works at multiple layers  
✅ **Image Security**: Minimal images, no secrets, vulnerability scanning  
✅ **Container Isolation**: User namespaces, capabilities, read-only filesystems  
✅ **Network Security**: Segmentation, isolation, firewall rules  
✅ **Secrets Management**: Docker secrets, encrypted environment variables  
✅ **Access Control**: Non-root users, permission management  
✅ **Resource Limits**: CPU, memory, storage controls  
✅ **Monitoring**: Runtime security, audit logging, vulnerability scanning  
✅ **Implementation**: Complete secure templates and scripts  
✅ **Audit**: Comprehensive checklist and automated auditing

### Key Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimum permissions needed
3. **Isolation**: Separate projects and services
4. **Monitoring**: Continuous security observation
5. **Automation**: Security built into CI/CD
6. **Regular Updates**: Keep everything patched
7. **Zero Trust**: Verify everything

### Most Critical Security Measures

**Priority 1 (Must Have)**:

- Never run as root
- No privileged containers
- No Docker socket access
- Use specific image versions
- Set resource limits

**Priority 2 (Should Have)**:

- Enable user namespaces
- Drop unnecessary capabilities
- Use read-only filesystems
- Implement network segmentation
- Use Docker secrets

**Priority 3 (Nice to Have)**:

- Image signing
- Runtime security monitoring
- Advanced RBAC
- Compliance automation

Your Docker infrastructure is now production-ready and secure! 🔒