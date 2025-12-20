# Docker Images & Containers Interview Guide - Part 2

## Continuing from Part 1...

## Container Management Questions {#container-management}

### Q13: How do you copy files between host and container?

**Short Answer:** Use `docker cp` command to copy files in both directions.

**Syntax & Examples:**

```bash
# Copy FROM host TO container
docker cp /host/path/file.txt container_name:/container/path/

# Copy FROM container TO host  
docker cp container_name:/container/path/file.txt /host/path/

# Copy directory
docker cp /host/directory container_name:/container/directory/
```

**Visual Explanation:**

```
HOST TO CONTAINER:
═══════════════════════════════════════════

Host Machine                Container
┌─────────────────┐        ┌─────────────────┐
│ /home/user/     │        │ /app/           │
│  └─ data.json   │───────→│  └─ data.json   │
└─────────────────┘        └─────────────────┘

Command:
$ docker cp /home/user/data.json mycontainer:/app/

What happens:
1. Docker reads file from host
2. Writes to container's writable layer
3. File now available in container

CONTAINER TO HOST:
═══════════════════════════════════════════

Container               Host Machine
┌─────────────────┐    ┌─────────────────┐
│ /app/           │    │ /home/user/     │
│  └─ logs.txt    │───→│  └─ logs.txt    │
└─────────────────┘    └─────────────────┘

Command:
$ docker cp mycontainer:/app/logs.txt /home/user/

What happens:
1. Docker reads file from container
2. Writes to host filesystem
3. File now on host
```

**Practical Examples:**

```bash
# Example 1: Copy config file to container
$ docker cp config.json myapp:/app/config/
# Use case: Update configuration without rebuilding image

# Example 2: Extract logs from container
$ docker cp myapp:/var/log/app.log ./logs/
# Use case: Debugging, log analysis

# Example 3: Copy entire directory
$ docker cp ./static-files myapp:/usr/share/nginx/html/
# Use case: Update website files

# Example 4: Copy from stopped container
$ docker cp stopped-container:/app/data.db ./backup/
# Works even if container is stopped!

# Example 5: Preserve permissions
$ docker cp -a /host/folder container:/path/
# -a preserves permissions and attributes
```

**Common Use Cases:**

```
DEVELOPMENT:
✓ Hot-reload code without rebuilding
✓ Test configuration changes
✓ Add debugging files

DEBUGGING:
✓ Extract logs from container
✓ Copy core dumps
✓ Get diagnostic files

BACKUP:
✓ Copy database files
✓ Extract generated reports
✓ Backup application data

QUICK FIXES:
✓ Patch files without rebuild
✓ Add missing dependencies
✓ Update certificates
```

**Important Notes:**

```
⚠️ LIMITATIONS:
1. Changes are in writable layer
   └─ Lost when container removed (unless using volumes)

2. Not recommended for production
   └─ Use volumes or rebuild image instead

3. Can't copy to running process memory
   └─ Only filesystem

4. Permissions may differ
   └─ Files copied as root in container
```

---

### Q14: How do you limit container resources (CPU, memory)?

**Short Answer:** Use `--memory`, `--cpus`, and `--cpu-shares` flags with `docker run`.

**Complete Examples:**

```bash
# Limit memory
docker run --memory=512m myapp
# Container can use max 512 MB RAM

# Limit CPUs
docker run --cpus=1.5 myapp
# Container can use 1.5 CPU cores

# Limit both
docker run --memory=1g --cpus=2 myapp
# 1 GB RAM, 2 CPU cores

# CPU shares (relative weight)
docker run --cpu-shares=512 myapp
# Default is 1024, this gets half priority
```

**Visual Explanation:**

```
WITHOUT LIMITS:
═══════════════════════════════════════════
Host Resources:
┌──────────────────────────────────────┐
│ CPU: 8 cores                         │
│ RAM: 16 GB                           │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│ Container (No Limits)                │
│ Can use: ALL 8 cores                 │
│ Can use: ALL 16 GB RAM              │
│                                      │
│ ⚠️ Risk: Can starve other containers│
└──────────────────────────────────────┘

WITH LIMITS:
═══════════════════════════════════════════
Host Resources:
┌──────────────────────────────────────┐
│ CPU: 8 cores                         │
│ RAM: 16 GB                           │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│ Container 1 (--memory=2g --cpus=2)   │
│ Limited to: 2 cores, 2 GB RAM       │
├──────────────────────────────────────┤
│ Container 2 (--memory=4g --cpus=4)   │
│ Limited to: 4 cores, 4 GB RAM       │
├──────────────────────────────────────┤
│ Host still has: 2 cores, 10 GB free │
└──────────────────────────────────────┘
```

**Memory Limits Detailed:**

```bash
# Memory limit (hard limit)
docker run --memory=512m myapp
# If exceeds 512m → Container killed (OOM)

# Memory + swap limit
docker run --memory=512m --memory-swap=1g myapp
# Physical memory: 512m
# Swap: 512m (1g - 512m)
# Total available: 1g

# Memory reservation (soft limit)
docker run --memory=1g --memory-reservation=512m myapp
# Prefers to stay under 512m
# Can burst to 1g if available

# Disable OOM killer
docker run --memory=512m --oom-kill-disable myapp
# ⚠️ Dangerous! Container won't be killed if OOM
```

**CPU Limits Detailed:**

```bash
# CPU shares (relative weight)
docker run --cpu-shares=512 myapp
# Default: 1024
# 512 = half priority
# 2048 = double priority

# CPU count limit
docker run --cpus=2 myapp
# Use maximum 2 CPU cores

# CPU period and quota
docker run --cpu-period=100000 --cpu-quota=50000 myapp
# Can use 50% of CPU time

# Pin to specific CPUs
docker run --cpuset-cpus="0,1" myapp
# Only use CPU cores 0 and 1
```

**Checking Resource Usage:**

```bash
# Real-time stats
$ docker stats
CONTAINER   CPU %   MEM USAGE / LIMIT   MEM %
myapp       25.5%   247MB / 512MB      48.2%

# Stats for specific container
$ docker stats myapp
CONTAINER   CPU %   MEM USAGE / LIMIT   NET I/O
myapp       15.2%   123MB / 512MB      1.2MB / 850KB

# Inspect resource limits
$ docker inspect myapp | grep -A 10 "Memory"
"Memory": 536870912,  # 512 MB in bytes
"MemoryReservation": 0,
"MemorySwap": -1,
"NanoCpus": 2000000000,  # 2 CPUs
```

**Practical Scenarios:**

```
SCENARIO 1: Database Container
─────────────────────────────────────
docker run -d \
  --name postgres \
  --memory=2g \
  --cpus=2 \
  --memory-swap=4g \
  postgres:14

Reasoning:
- Databases need stable memory
- 2 GB physical RAM
- 2 GB swap for occasional peaks
- 2 CPUs for query processing

SCENARIO 2: Background Worker
─────────────────────────────────────
docker run -d \
  --name worker \
  --memory=512m \
  --cpus=0.5 \
  --cpu-shares=512 \
  myapp-worker

Reasoning:
- Background tasks, low priority
- Half CPU (0.5)
- Low CPU shares (512)
- Minimal memory

SCENARIO 3: Web Application
─────────────────────────────────────
docker run -d \
  --name webapp \
  --memory=1g \
  --memory-reservation=750m \
  --cpus=2 \
  webapp:latest

Reasoning:
- Responsive to users (2 CPUs)
- Can burst memory to 1g
- Prefers to stay at 750m
```

**What Happens When Limits Exceeded:**

```
MEMORY LIMIT EXCEEDED:
═══════════════════════════════════════════
Container using: 512 MB (at limit)
Tries to allocate more → OOM (Out of Memory)

Linux OOM Killer:
1. Container process killed
2. Container exits
3. Exit code: 137 (SIGKILL)
4. Container stops

$ docker ps -a
CONTAINER   STATUS
myapp       Exited (137)

Check logs:
$ docker logs myapp
...
Out of memory: Kill process

CPU LIMIT EXCEEDED:
═══════════════════════════════════════════
Container using: 2.0 CPUs (at limit)
Tries to use more → Throttled

CPU throttling:
1. Process slowed down
2. Container stays running
3. No crash, just slower
4. Respects limit

Result: Container slower but stable
```

---

### Q15: How do you view container logs? What are the best practices?

**Short Answer:** Use `docker logs container_name`. Use `-f` to follow, `--tail` to limit lines, `--since` for time filtering.

**Complete Command Reference:**

```bash
# Basic logs
docker logs mycontainer

# Follow logs (like tail -f)
docker logs -f mycontainer

# Last 100 lines
docker logs --tail 100 mycontainer

# Logs since time
docker logs --since 30m mycontainer    # Last 30 minutes
docker logs --since 2024-01-15 mycontainer

# Logs until time
docker logs --until 2024-01-15T10:00:00 mycontainer

# With timestamps
docker logs -t mycontainer

# Combine options
docker logs -f --tail 50 --since 10m mycontainer
```

**Visual Explanation:**

```
WHERE LOGS COME FROM:
═══════════════════════════════════════════

Container Process:
┌─────────────────────────────────────┐
│ PID 1: python app.py                │
│                                     │
│ print("Starting server...")  ───┐   │
│ print("Connected to DB")     ───┤   │
│ print("Listening on :8080")  ───┤   │
└─────────────────────────────────┴───┘
                                  │
                                  │ STDOUT
                                  │ STDERR
                                  ▼
┌─────────────────────────────────────┐
│ Docker Logging Driver               │
│ (json-file by default)              │
└─────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────┐
│ Log File on Host                    │
│ /var/lib/docker/containers/         │
│ <container-id>/                     │
│ <container-id>-json.log             │
│                                     │
│ {"log":"Starting server...\n",      │
│  "stream":"stdout",                 │
│  "time":"2024-01-15T10:30:00Z"}    │
└─────────────────────────────────────┘
                                  │
                                  │ docker logs
                                  ▼
                        Your Terminal
```

**Log Format:**

```json
# Default JSON format:
{
  "log": "Starting application...\n",
  "stream": "stdout",
  "time": "2024-01-15T10:30:00.123456789Z"
}

{
  "log": "ERROR: Connection failed\n",
  "stream": "stderr",
  "time": "2024-01-15T10:30:05.987654321Z"
}
```

**Logging Drivers:**

```bash
# Check current logging driver
$ docker info | grep "Logging Driver"
Logging Driver: json-file

# Available drivers:
- json-file (default)
- syslog
- journald
- gelf
- fluentd
- awslogs
- splunk

# Set logging driver
docker run --log-driver=syslog myapp

# Set in daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Best Practices:**

```
1. LOG ROTATION:
═══════════════════════════════════════════
Problem: Logs grow infinitely → Disk full

Solution: Configure log rotation
docker run \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp

Result:
- Max file size: 10 MB
- Max files: 3
- Total max: 30 MB
- Old logs automatically deleted

2. STRUCTURED LOGGING:
═══════════════════════════════════════════
# ❌ Bad: Unstructured
print("User logged in")

# ✅ Good: Structured JSON
import json
log = {"event": "user_login", "user_id": 123, "timestamp": "..."}
print(json.dumps(log))

Benefits:
- Easy to parse
- Easy to search
- Works with log aggregators

3. LOG LEVELS:
═══════════════════════════════════════════
Use standard log levels:
DEBUG → INFO → WARNING → ERROR → CRITICAL

Python example:
import logging
logging.basicConfig(level=logging.INFO)
logging.info("Server started")
logging.error("Connection failed")

4. CENTRALIZED LOGGING:
═══════════════════════════════════════════
Don't rely on docker logs in production!

Use log aggregation:
Container → Fluentd → Elasticsearch → Kibana
Container → Logstash → Elasticsearch → Kibana
Container → CloudWatch Logs
Container → Splunk

5. AVOID SENSITIVE DATA:
═══════════════════════════════════════════
❌ Don't log:
- Passwords
- API keys
- Credit card numbers
- Personal data

✅ Log:
- Event names
- User IDs (hashed)
- Status codes
- Timestamps
```

**Example: Production-Ready Logging Setup:**

```bash
# Run with log rotation
docker run -d \
  --name myapp \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --log-opt compress=true \
  myapp:latest

# Check log files
$ ls -lh /var/lib/docker/containers/<container-id>/
-rw-r----- 1 root root 10M Jan 15 10:30 <id>-json.log
-rw-r----- 1 root root 9.8M Jan 15 09:30 <id>-json.log.1.gz
-rw-r----- 1 root root 9.7M Jan 15 08:30 <id>-json.log.2.gz
```

**Troubleshooting:**

```bash
# No logs appearing?
# Check if app logs to stdout/stderr

# Python example
print("This goes to docker logs")  ✓
logging.info("This too")  ✓
with open("file.log", "w") as f:
    f.write("This does NOT")  ✗

# Logs too large?
# Add log rotation

# Logs not persisting?
# Check log driver and max-file settings

# Need historical logs?
# Use centralized logging (ELK, Splunk, etc.)
```

---

## Advanced Container Questions {#advanced-containers}

### Q16: What is container orchestration? When do you need it?

**Short Answer:** Container orchestration automates deployment, scaling, and management of containers. You need it when running multiple containers across multiple hosts.

**Visual Explanation:**

```
WITHOUT ORCHESTRATION:
═══════════════════════════════════════════
Manual Management:

Server 1               Server 2               Server 3
┌────────────┐        ┌────────────┐        ┌────────────┐
│ Container1 │        │ Container3 │        │ Container5 │
│ Container2 │        │ Container4 │        │            │
└────────────┘        └────────────┘        └────────────┘

You manually:
✗ SSH to each server
✗ Start containers one by one
✗ Monitor health manually
✗ Update containers manually
✗ No auto-scaling
✗ No load balancing
✗ No automatic restart

WITH ORCHESTRATION (Kubernetes/Swarm):
═══════════════════════════════════════════
Automated Management:

┌─────────────────────────────────────────┐
│     Orchestrator (Control Plane)        │
│  ├─ Scheduler                           │
│  ├─ Health Monitor                      │
│  ├─ Load Balancer                       │
│  └─ Auto-scaler                         │
└──────────┬──────────────────────────────┘
           │ Manages automatically
     ┌─────┴─────┬─────────────┬─────────┐
     ▼           ▼             ▼         ▼
Server 1     Server 2      Server 3   Server 4
┌────────┐  ┌────────┐   ┌────────┐  ┌────────┐
│ C1  C2 │  │ C3  C4 │   │ C5  C6 │  │ C7  C8 │
└────────┘  └────────┘   └────────┘  └────────┘

Orchestrator automatically:
✓ Deploys containers
✓ Monitors health
✓ Restarts failed containers
✓ Scales up/down
✓ Load balances traffic
✓ Updates with zero downtime
```

**When You Need Orchestration:**

```
USE DOCKER ALONE:
─────────────────────────────────────
✓ Development environment
✓ Single server
✓ Small applications
✓ Learning/testing
✓ CI/CD build agents
✓ Few containers (< 10)

Example:
- Personal blog
- Development database
- Local testing

USE ORCHESTRATION:
─────────────────────────────────────
✓ Production applications
✓ Multiple servers
✓ Need high availability
✓ Need auto-scaling
✓ Many containers (> 10)
✓ Microservices architecture

Example:
- E-commerce platform
- SaaS application
- Enterprise applications
```

**Popular Orchestrators:**

```
1. KUBERNETES (Most Popular):
─────────────────────────────────────
Pros:
✓ Industry standard
✓ Huge ecosystem
✓ Cloud-native
✓ Self-healing
✓ Auto-scaling

Cons:
✗ Complex to learn
✗ Steep learning curve
✗ Overkill for small apps

2. DOCKER SWARM:
─────────────────────────────────────
Pros:
✓ Built into Docker
✓ Easy to learn
✓ Simple setup
✓ Good for small/medium

Cons:
✗ Smaller ecosystem
✗ Less features than K8s
✗ Declining popularity

3. AWS ECS/Fargate:
─────────────────────────────────────
Pros:
✓ AWS integration
✓ Managed service
✓ No servers to manage (Fargate)

Cons:
✗ AWS vendor lock-in
✗ AWS-specific
```

---

### Q17: Explain container networking in detail.

**Short Answer:** Docker creates isolated network namespaces for containers. Containers connect via bridges, overlay networks, or host network, using virtual ethernet pairs and iptables rules.

**Deep Dive:**

```
CONTAINER NETWORK ARCHITECTURE:
═══════════════════════════════════════════

Physical Level:
┌──────────────────────────────────────────┐
│ Host Machine                             │
│ Physical NIC: eth0 (192.168.1.100)       │
└────────────┬─────────────────────────────┘
             │
             ▼
Virtual Level:
┌──────────────────────────────────────────┐
│ Docker Bridge: docker0                   │
│ IP: 172.17.0.1/16                        │
│                                          │
│  ┌────────────┐        ┌────────────┐   │
│  │ veth       │        │ veth       │   │
│  │ (virtual)  │        │ (virtual)  │   │
│  └─────┬──────┘        └─────┬──────┘   │
│        │                     │          │
└────────┼─────────────────────┼──────────┘
         │                     │
    ┌────▼─────┐          ┌───▼──────┐
    │Container1│          │Container2│
    │ Network  │          │ Network  │
    │Namespace │          │Namespace │
    │          │          │          │
    │eth0:     │          │eth0:     │
    │172.17.0.2│          │172.17.0.3│
    └──────────┘          └──────────┘

Each container has:
- Own network namespace (isolated)
- Own network interface (eth0)
- Own IP address
- Own routing table
- Own iptables rules
```

**Network Types:**

```
1. BRIDGE NETWORK (Default):
═══════════════════════════════════════════
docker run --network bridge myapp

┌─────────────────────────────────────────┐
│ Host: 192.168.1.100                     │
│                                         │
│  Docker Bridge (docker0: 172.17.0.1)   │
│   │                                     │
│   ├─ Container1 (172.17.0.2)           │
│   ├─ Container2 (172.17.0.3)           │
│   └─ Container3 (172.17.0.4)           │
└─────────────────────────────────────────┘

Containers can:
✓ Talk to each other via IP
✓ Access internet (via NAT)
✗ Not accessible from outside (unless port mapped)

2. HOST NETWORK:
═══════════════════════════════════════════
docker run --network host myapp

┌─────────────────────────────────────────┐
│ Host Network (192.168.1.100)           │
│                                         │
│ Container shares host's network         │
│ No isolation                            │
│ Container's port 80 = Host's port 80   │
└─────────────────────────────────────────┘

Containers:
✓ Maximum performance
✓ Direct access to host network
✗ No network isolation
✗ Port conflicts possible

3. NONE NETWORK:
═══════════════════════════════════════════
docker run --network none myapp

Container has:
✗ No network interface
✗ No connectivity
✓ Maximum isolation

Use case:
- Security-sensitive workloads
- Batch processing (no network needed)

4. CUSTOM BRIDGE:
═══════════════════════════════════════════
docker network create mynetwork
docker run --network mynetwork myapp

┌─────────────────────────────────────────┐
│ Custom Bridge: mynetwork                │
│                                         │
│ ┌─────────────┐      ┌─────────────┐   │
│ │ Container A │─────→│ Container B │   │
│ │ (DNS: name) │      │ (by name!)  │   │
│ └─────────────┘      └─────────────┘   │
└─────────────────────────────────────────┘

Benefits:
✓ Automatic DNS resolution
✓ Containers talk by name
✓ Better isolation
✓ Custom subnet
```

**Port Mapping Deep Dive:**

```
HOW PORT MAPPING WORKS:
═══════════════════════════════════════════

docker run -p 8080:80 nginx

Step 1: Container starts
Container has: eth0 (172.17.0.2)
Nginx listens on: 172.17.0.2:80

Step 2: Docker creates iptables rules
iptables NAT rule:
If packet to Host:8080 → DNAT to 172.17.0.2:80

Step 3: External access
┌──────────────────────────────────────────┐
│ Internet                                 │
└────────────┬─────────────────────────────┘
             │
             │ HTTP request to
             │ 192.168.1.100:8080
             ▼
┌──────────────────────────────────────────┐
│ Host: 192.168.1.100                      │
│  iptables: Port 8080 → 172.17.0.2:80    │
└────────────┬─────────────────────────────┘
             │
             │ Forwarded to
             ▼
┌──────────────────────────────────────────┐
│ Container (172.17.0.2)                   │
│ Nginx listening on port 80               │
└──────────────────────────────────────────┘
```

---

## Practical Scenario Questions {#scenarios}

### Q18: You need to run a containerized application that requires access to a GPU. How would you set this up?

**Answer:**

```bash
# Requirements:
1. NVIDIA GPU on host
2. NVIDIA Docker runtime installed
3. NVIDIA drivers on host

# Install NVIDIA Container Toolkit
$ distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
$ curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
$ curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
    sudo tee /etc/apt/sources.list.d/nvidia-docker.list
$ sudo apt-get update && sudo apt-get install -y nvidia-docker2
$ sudo systemctl restart docker

# Run container with GPU access
$ docker run --gpus all nvidia/cuda:11.0-base nvidia-smi

# Specify which GPUs
$ docker run --gpus '"device=0,1"' myapp  # Use GPU 0 and 1
$ docker run --gpus 2 myapp               # Use 2 GPUs

# Check GPU usage in container
$ docker exec myapp nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 470.57.02    Driver Version: 470.57.02    CUDA Version: 11.4    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  Tesla V100-PCIE...  On   | 00000000:00:1E.0 Off |                    0 |
| N/A   32C    P0    25W / 250W |      0MiB / 32510MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

---

### Q19: How would you debug a container that keeps restarting?

**Answer:**

```bash
# Step 1: Check container status
$ docker ps -a
CONTAINER ID   STATUS
abc123         Restarting (1) 5 seconds ago

# Step 2: View logs
$ docker logs abc123
Error: Connection to database failed
Errno 111: Connection refused

# Step 3: Check exit code
$ docker inspect abc123 --format='{{.State.ExitCode}}'
1  # Application error

# Step 4: Disable auto-restart to debug
$ docker update --restart=no abc123

# Step 5: Run with interactive shell to debug
$ docker run -it --entrypoint /bin/bash myimage
root@container:/# python app.py  # Run manually to see errors

# Step 6: Check resource limits
$ docker stats abc123
# See if out of memory

# Step 7: Check dependencies
$ docker exec abc123 ping database
# Check if can reach database

# Common issues:
1. Missing environment variables
2. Can't connect to dependencies
3. Out of memory
4. Permission issues
5. Wrong CMD/ENTRYPOINT
```

---

**That completes Part 2!**

Would you like me to create a Part 3 with:

- More advanced troubleshooting questions
- Security-focused questions
- Performance optimization questions
- Real-world interview scenarios

Let me know if you'd like me to continue or if you'd like the files for what we have so far!