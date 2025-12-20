# Docker Interview Questions & Answers

## Complete Guide with Simple Explanations

## Table of Contents

1. [Basic Concepts Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#basic-concepts)
2. [Dockerfile Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#dockerfile-questions)
3. [Image & Container Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#image-container)
4. [Networking Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#networking)
5. [Volume & Storage Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#volumes)
6. [Multi-Stage Build Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#multi-stage)
7. [Docker Compose Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#compose)
8. [Security Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#security)
9. [Performance & Optimization Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#performance)
10. [Troubleshooting Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#troubleshooting)
11. [Scenario-Based Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#scenarios)
12. [Advanced Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#advanced)

---

## Basic Concepts Questions {#basic-concepts}

### Q1: What is Docker? Why do we use it?

**Short Answer:** Docker is a tool that packages your application and everything it needs into a container, so it runs the same everywhere.

**Detailed Explanation:**

```
WITHOUT DOCKER:
Developer's Laptop          Production Server
├─ Python 3.9              ├─ Python 3.7 ⚠️
├─ Ubuntu 20.04            ├─ Ubuntu 18.04 ⚠️
└─ App works ✓             └─ App breaks ✗
    "Works on my machine!"     "Doesn't work here!"

WITH DOCKER:
Developer's Laptop          Production Server
├─ Docker Container        ├─ Same Container
│  ├─ Python 3.9          │  ├─ Python 3.9 ✓
│  ├─ Ubuntu 20.04        │  ├─ Ubuntu 20.04 ✓
│  └─ App ✓               │  └─ App ✓
└─ Works!                  └─ Works!
    "Works in container"       "Works here too!"
```

**Why Use Docker:**

- ✓ **Consistency**: Same environment everywhere
- ✓ **Isolation**: Each app in its own container
- ✓ **Portability**: Run anywhere Docker exists
- ✓ **Fast**: Start in seconds, not minutes
- ✓ **Efficient**: Uses less resources than VMs

---

### Q2: What's the difference between Docker Image and Container?

**Short Answer:** Image = Class (blueprint), Container = Object (running instance)

**Visual Explanation:**

```
IMAGE (Blueprint):
┌─────────────────────────────────┐
│   Docker Image: myapp:latest    │
│                                 │
│   Contains:                     │
│   ├─ Ubuntu OS                  │
│   ├─ Python 3.11                │
│   ├─ Dependencies               │
│   └─ Your app code              │
│                                 │
│   Status: Stored on disk        │
│   Can't execute by itself       │
└─────────────────────────────────┘
         │
         │ docker run (creates)
         ▼
CONTAINER (Running Instance):
┌─────────────────────────────────┐
│   Container ID: abc123          │
│                                 │
│   Created from: myapp:latest    │
│   Status: RUNNING               │
│   Process: python app.py        │
│   Port: 8080                    │
│                                 │
│   This is actually executing!   │
└─────────────────────────────────┘
```

**Key Differences:**

|Image|Container|
|---|---|
|Read-only|Writable|
|Like a template|Like a running app|
|Stored on disk|Running in memory|
|Can't execute|Actively executing|
|One image → Many containers|One container from one image|

**Code Example:**

```bash
# Image (exists on disk)
docker images
# myapp:latest  100MB

# Create containers from image
docker run myapp:latest  # Container 1
docker run myapp:latest  # Container 2
docker run myapp:latest  # Container 3

# Three containers from ONE image!
```

---

### Q3: What is a Dockerfile?

**Short Answer:** A Dockerfile is a recipe file that tells Docker how to build your image.

**Simple Explanation:**

```
RECIPE FOR CAKE               DOCKERFILE
═══════════════════          ═══════════════════
1. Start with flour          FROM ubuntu:20.04
2. Add sugar                 RUN apt-get install python
3. Add eggs                  COPY requirements.txt .
4. Mix ingredients           RUN pip install -r requirements.txt
5. Bake at 350°F            COPY app.py .
6. Serve                     CMD ["python", "app.py"]

Result: Cake                 Result: Docker Image
```

**Example Dockerfile:**

```dockerfile
# Start with base
FROM python:3.11

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Add your code
COPY . .

# Run the app
CMD ["python", "app.py"]
```

---

### Q4: What's the difference between CMD and ENTRYPOINT?

**Short Answer:**

- **CMD**: Default command, can be overridden
- **ENTRYPOINT**: Fixed command, arguments can be added

**Visual Comparison:**

```
USING CMD:
Dockerfile: CMD ["python", "app.py"]

$ docker run myimage
→ Runs: python app.py ✓

$ docker run myimage python other.py
→ Runs: python other.py ✓ (CMD replaced!)

─────────────────────────────────────────

USING ENTRYPOINT:
Dockerfile: ENTRYPOINT ["python"]

$ docker run myimage app.py
→ Runs: python app.py ✓

$ docker run myimage other.py
→ Runs: python other.py ✓ (adds to ENTRYPOINT!)

$ docker run myimage
→ Runs: python (error - no file!) ✗
```

**Best Practice - Use Both:**

```dockerfile
ENTRYPOINT ["python"]  # Fixed executable
CMD ["app.py"]         # Default argument

# Result:
$ docker run myimage
→ python app.py

$ docker run myimage other.py
→ python other.py (CMD overridden)
```

---

### Q5: What is Docker Hub?

**Short Answer:** Docker Hub is like GitHub but for Docker images - a place to store and share images.

**Visual:**

```
DOCKER HUB (Cloud Storage)
┌────────────────────────────────────┐
│  Public Images:                    │
│  ├─ ubuntu:20.04                   │
│  ├─ python:3.11                    │
│  ├─ node:18                        │
│  └─ nginx:latest                   │
│                                    │
│  Your Private Images:              │
│  ├─ mycompany/myapp:v1.0          │
│  └─ mycompany/api:latest          │
└────────────────────────────────────┘
         ↓                  ↑
      Pull (download)    Push (upload)
         ↓                  ↑
┌────────────────────────────────────┐
│     Your Computer                  │
│  Local Images:                     │
│  ├─ ubuntu:20.04                   │
│  └─ mycompany/myapp:v1.0          │
└────────────────────────────────────┘
```

---

## Dockerfile Questions {#dockerfile-questions}

### Q6: What is the difference between COPY and ADD?

**Short Answer:** Both copy files, but ADD has extra features (auto-extract, URL download). Use COPY for simple copying.

**Comparison:**

```
COPY:
────────────────────────────────
✓ Copy local files/directories
✗ Can't download URLs
✗ Can't auto-extract archives

Example:
COPY app.py /app/
COPY folder/ /app/folder/

ADD:
────────────────────────────────
✓ Copy local files/directories
✓ Download from URLs
✓ Auto-extract .tar files

Example:
ADD app.py /app/                    # Same as COPY
ADD http://example.com/file.txt /app/  # Downloads!
ADD archive.tar.gz /app/            # Auto-extracts!
```

**Interview Answer:** "Both copy files, but I prefer COPY for clarity. ADD has extra features like extracting tar files and downloading URLs, but these can be unclear. I only use ADD when I specifically need those features."

---

### Q7: What is .dockerignore? Why is it important?

**Short Answer:** .dockerignore tells Docker which files to NOT include in the build context.

**Visual Example:**

```
YOUR PROJECT:
myproject/
├── app.py               (5 KB)
├── requirements.txt     (1 KB)
├── node_modules/        (500 MB!) ⚠️
├── .git/                (200 MB!) ⚠️
├── tests/               (10 MB)
└── *.log                (50 MB)

WITHOUT .dockerignore:
docker build .
→ Uploading 765 MB to Docker... ⏳ (5 minutes!)

WITH .dockerignore:
.dockerignore:
node_modules
.git
tests
*.log

docker build .
→ Uploading 6 KB to Docker... ⚡ (1 second!)
```

**Why Important:**

1. **Faster builds**: Less data to upload
2. **Smaller images**: Don't include unnecessary files
3. **Security**: Don't include secrets or credentials
4. **Cleaner**: Only what you need

---

### Q8: How do you optimize Dockerfile for smaller images?

**Short Answer:** Use multi-stage builds, minimal base images, and combine RUN commands.

**Before & After:**

```dockerfile
# ❌ BAD (1 GB image)
FROM ubuntu:latest
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get install -y python3-pip
COPY . .
RUN pip install -r requirements.txt

# ✅ GOOD (100 MB image)
FROM python:3.11-alpine      # Smaller base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt  # No cache
COPY . .
CMD ["python", "app.py"]
```

**Key Optimization Techniques:**

```
1. Use smaller base images:
   ubuntu (500 MB) → alpine (7 MB)

2. Multi-stage builds:
   Build stage (1 GB) → Production (100 MB)

3. Combine RUN commands:
   RUN apt-get update && apt-get install && rm -rf /var/lib/apt

4. Don't install unnecessary packages:
   --no-install-recommends

5. Clean up in same layer:
   RUN ... && rm -rf /tmp/*

6. Use .dockerignore:
   Exclude unnecessary files
```

---

### Q9: What is layer caching in Docker? How does it work?

**Short Answer:** Docker caches each instruction's result. If nothing changed, it reuses the cached layer instead of rebuilding.

**Visual Explanation:**

```
FIRST BUILD:
┌────────────────────────────────────┐
│ FROM python:3.11       → Build (5s) │ Layer 1
│ COPY requirements.txt  → Build (1s) │ Layer 2
│ RUN pip install        → Build (2m) │ Layer 3
│ COPY app.py            → Build (1s) │ Layer 4
└────────────────────────────────────┘
Total time: 2 minutes 7 seconds

SECOND BUILD (no changes):
┌────────────────────────────────────┐
│ FROM python:3.11       → CACHED ✓  │ Layer 1
│ COPY requirements.txt  → CACHED ✓  │ Layer 2
│ RUN pip install        → CACHED ✓  │ Layer 3
│ COPY app.py            → CACHED ✓  │ Layer 4
└────────────────────────────────────┘
Total time: 2 seconds!

THIRD BUILD (app.py changed):
┌────────────────────────────────────┐
│ FROM python:3.11       → CACHED ✓  │ Layer 1
│ COPY requirements.txt  → CACHED ✓  │ Layer 2
│ RUN pip install        → CACHED ✓  │ Layer 3
│ COPY app.py            → REBUILD ✗ │ Layer 4 (changed!)
└────────────────────────────────────┘
Total time: 3 seconds
```

**Cache Invalidation Rule:**

```
Once a layer changes, ALL subsequent layers rebuild!

Layer 1: ✓ Cached
Layer 2: ✓ Cached
Layer 3: ✗ Changed  ← Cache breaks here
Layer 4: ✗ Rebuild  ← Must rebuild (even if unchanged)
Layer 5: ✗ Rebuild  ← Must rebuild (even if unchanged)
```

---

## Image & Container Questions {#image-container}

### Q10: How do you list all Docker images and containers?

**Short Answer:**

```bash
# List images
docker images
# or
docker image ls

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a
# or
docker container ls -a
```

**Output Example:**

```
$ docker images
REPOSITORY   TAG       IMAGE ID       SIZE
myapp        latest    abc123def456   200MB
python       3.11      def456ghi789   900MB

$ docker ps -a
CONTAINER ID   IMAGE          STATUS
xyz789         myapp:latest   Up 5 minutes
abc123         myapp:latest   Exited (0) 2 hours ago
```

---

### Q11: How do you remove Docker images and containers?

**Short Answer:**

```bash
# Remove container
docker rm container_id
docker rm container_name

# Force remove running container
docker rm -f container_id

# Remove image
docker rmi image_name:tag
docker rmi image_id

# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune

# Remove everything (containers, images, networks)
docker system prune -a
```

**Visual Flow:**

```
Before cleanup:
├─ 5 containers (3 running, 2 stopped)
├─ 10 images (3 used, 7 unused)
└─ Disk usage: 5 GB

$ docker system prune -a
→ Remove 2 stopped containers
→ Remove 7 unused images

After cleanup:
├─ 3 containers (running)
├─ 3 images (in use)
└─ Disk usage: 1.5 GB
```

---

### Q12: What is the difference between `docker stop` and `docker kill`?

**Short Answer:**

- `docker stop`: Gracefully stops (sends SIGTERM, waits, then SIGKILL)
- `docker kill`: Force stops immediately (sends SIGKILL)

**Visual Comparison:**

```
DOCKER STOP (Graceful):
┌────────────────────────────────────┐
│ $ docker stop myapp                │
│                                    │
│ 1. Send SIGTERM to container       │
│    "Please shut down nicely"       │
│                                    │
│ 2. Container receives signal       │
│    App closes database connections │
│    App saves state                 │
│    App cleans up                   │
│                                    │
│ 3. Wait 10 seconds (default)       │
│                                    │
│ 4. If still running, send SIGKILL  │
│    "Force stop now!"               │
│                                    │
│ Result: Clean shutdown ✓           │
└────────────────────────────────────┘

DOCKER KILL (Force):
┌────────────────────────────────────┐
│ $ docker kill myapp                │
│                                    │
│ 1. Send SIGKILL immediately        │
│    "Stop NOW!"                     │
│                                    │
│ 2. Container stops instantly       │
│    No cleanup                      │
│    No saving state                 │
│    Connections dropped             │
│                                    │
│ Result: Abrupt stop ⚠️             │
└────────────────────────────────────┘
```

**When to Use:**

- `docker stop`: Normal shutdown (production)
- `docker kill`: Container not responding (emergency)

---

### Q13: How do you see logs of a container?

**Short Answer:**

```bash
# View logs
docker logs container_name

# Follow logs (like tail -f)
docker logs -f container_name

# Last 100 lines
docker logs --tail 100 container_name

# Logs with timestamps
docker logs -t container_name

# Logs since specific time
docker logs --since 30m container_name
```

**Example:**

```bash
$ docker logs myapp
[2024-12-19 10:30:00] Starting application...
[2024-12-19 10:30:01] Database connected
[2024-12-19 10:30:02] Server listening on port 8080
[2024-12-19 10:30:15] GET /api/users - 200 OK
[2024-12-19 10:30:20] POST /api/products - 201 Created
```

---

### Q14: How do you access a running container?

**Short Answer:**

```bash
# Execute command in running container
docker exec -it container_name bash

# If bash not available (Alpine)
docker exec -it container_name sh

# Run specific command
docker exec container_name ls /app
docker exec container_name cat /app/config.json

# As root user
docker exec -u root -it container_name bash
```

**Example Session:**

```bash
$ docker exec -it myapp bash

root@abc123:/app# ls
app.py  requirements.txt  config.json

root@abc123:/app# cat config.json
{"database": "postgres", "port": 5432}

root@abc123:/app# ps aux
USER  PID  COMMAND
root  1    python app.py

root@abc123:/app# exit
```

---

## Networking Questions {#networking}

### Q15: What are Docker networking modes?

**Short Answer:** Docker has 4 main network modes: bridge, host, none, and custom networks.

**Visual Explanation:**

```
1. BRIDGE (Default):
┌─────────────────────────────────────────┐
│  Host Machine (Your Computer)           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Docker Bridge Network            │  │
│  │  (172.17.0.0/16)                  │  │
│  │                                   │  │
│  │  ┌──────────┐    ┌──────────┐     │  │
│  │  │Container1│    │Container2│     │  │
│  │  │172.17.0.2│    │172.17.0.3│     │  │
│  │  └──────────┘    └──────────┘     │  │
│  └───────────────────────────────────┘  │
│         ↕                               │
│  Host Network (192.168.1.100)           │
└─────────────────────────────────────────┘

Containers have own IPs, isolated from host

2. HOST:
┌─────────────────────────────────────────┐
│  Host Machine (192.168.1.100)           │
│                                         │
│  ┌──────────────────────┐               │
│  │ Container            │               │
│  │ Uses host network    │               │
│  │ No isolation         │               │
│  └──────────────────────┘               │
└─────────────────────────────────────────┘

Container shares host's network directly

3. NONE:
┌─────────────────────────────────────────┐
│  Host Machine                           │
│                                         │
│  ┌──────────────────────┐               │
│  │ Container            │               │
│  │ No network           │               │
│  │ Completely isolated  │               │
│  └──────────────────────┘               │
└─────────────────────────────────────────┘

Container has no network access
```

**Commands:**

```bash
# Bridge (default)
docker run myapp

# Host network
docker run --network host myapp

# No network
docker run --network none myapp

# Custom network
docker network create mynetwork
docker run --network mynetwork myapp
```

---

### Q16: How do containers communicate with each other?

**Short Answer:** Containers on the same network can communicate using container names as hostnames.

**Example:**

```
SCENARIO: Frontend needs to call Backend API

┌─────────────────────────────────────────┐
│  Docker Network: mynetwork              │
│                                         │
│  ┌──────────────┐    ┌──────────────┐   │
│  │  frontend    │    │  backend     │   │
│  │  (React)     │    │  (Node API)  │   │
│  │              │───→│              │   │
│  │              │    │  Port 3000   │   │
│  └──────────────┘    └──────────────┘   │
│                                         │
│  Frontend can call: http://backend:3000 │
│  Uses container name as hostname!       │
└─────────────────────────────────────────┘
```

**Setup:**

```bash
# Create network
docker network create mynetwork

# Run backend
docker run -d \
  --name backend \
  --network mynetwork \
  backend-image

# Run frontend
docker run -d \
  --name frontend \
  --network mynetwork \
  -e API_URL=http://backend:3000 \
  frontend-image

# Frontend can now call backend using name "backend"!
```

---

### Q17: How do you expose container ports?

**Short Answer:** Use `-p` flag to map container port to host port.

**Visual:**

```
PORT MAPPING:

Your Computer (Host)         Container
┌──────────────────┐         ┌──────────────┐
│  localhost:8080  │────────→│  Port 80     │
│  (Host port)     │         │  (nginx)     │
└──────────────────┘         └──────────────┘

Command: docker run -p 8080:80 nginx

Syntax: -p HOST_PORT:CONTAINER_PORT
```

**Examples:**

```bash
# Map port 8080 (host) to 80 (container)
docker run -p 8080:80 nginx
# Access: http://localhost:8080

# Map port 3000 (host) to 3000 (container)
docker run -p 3000:3000 node-app
# Access: http://localhost:3000

# Bind to specific host IP
docker run -p 127.0.0.1:8080:80 nginx
# Access: http://127.0.0.1:8080 (only from local machine)

# Map random host port
docker run -P nginx
# Docker assigns random port, use docker ps to see
```

---

## Volume & Storage Questions {#volumes}

### Q18: What is a Docker volume? Why do we need it?

**Short Answer:** A volume is persistent storage that survives container deletion. Container data is lost when container is removed, but volume data persists.

**Visual Explanation:**

```
WITHOUT VOLUME:
┌─────────────────────────────────────────┐
│  Container                              │
│  ├─ /app/code                           │ 
│  ├─ /app/uploads/   ← User uploads here │
│  └─ /app/database/  ← Data saved here   │
└─────────────────────────────────────────┘
         │
         ▼
$ docker rm container
         │
         ▼
All data DELETED! ✗ (uploads and database gone!)

WITH VOLUME:
┌─────────────────────────────────────────┐
│  Container                              │
│  ├─ /app/code                           │
│  └─ /app/uploads/ ──→ Volume            │
└─────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Docker Volume│
                    │ (Disk)       │
                    └──────────────┘
         │
         ▼
$ docker rm container
         │
         ▼
Container deleted, but Volume still exists! ✓
```

**Types of Volumes:**

```
1. Named Volume (Managed by Docker):
   docker run -v mydata:/app/data myapp
   └─ Docker creates and manages volume

2. Bind Mount (Host directory):
   docker run -v /host/path:/container/path myapp
   └─ Links to specific host directory

3. Anonymous Volume:
   docker run -v /app/data myapp
   └─ Docker creates volume with random name
```

---

### Q19: What's the difference between Volume and Bind Mount?

**Short Answer:**

- **Volume**: Managed by Docker, stored in Docker area
- **Bind Mount**: Links to specific host directory

**Comparison:**

```
NAMED VOLUME:
┌──────────────────────────────────────┐
│  Docker manages storage              │
│  Location: /var/lib/docker/volumes/  │
│                                      │
│  $ docker volume create mydata       │
│  $ docker run -v mydata:/app myimage │
│                                      │
│  ✓ Portable                          │
│  ✓ Backup/restore easy               │
│  ✓ Works on all platforms            │
└──────────────────────────────────────┘

BIND MOUNT:
┌──────────────────────────────────────┐
│  You specify exact host path         │
│  Location: Anywhere on your system   │
│                                      │
│  $ docker run -v /home/user/app:/app │
│                                      │
│  ✓ Direct access to files            │
│  ✓ Good for development              │
│  ✗ Not portable (path may not exist) │
└──────────────────────────────────────┘
```

**When to Use:**

```
Use VOLUME when:
- Production deployments
- Need portability
- Don't need direct file access
- Example: database data, app uploads

Use BIND MOUNT when:
- Development
- Need to edit files from host
- Sharing config files
- Example: source code during dev
```

---

### Q20: How do you backup and restore volumes?

**Short Answer:** Create a container that mounts the volume, then tar the data.

**Backup:**

```bash
# Backup volume to tar file
docker run --rm \
  -v myvolume:/data \
  -v $(pwd):/backup \
  ubuntu \
  tar czf /backup/myvolume-backup.tar.gz -C /data .

# Explanation:
# --rm: Remove container after done
# -v myvolume:/data: Mount volume to backup
# -v $(pwd):/backup: Mount current directory for output
# tar czf: Create compressed tar file
```

**Restore:**

```bash
# Restore from tar file to volume
docker run --rm \
  -v myvolume:/data \
  -v $(pwd):/backup \
  ubuntu \
  tar xzf /backup/myvolume-backup.tar.gz -C /data

# Explanation:
# tar xzf: Extract compressed tar file
```

**Visual:**

```
BACKUP PROCESS:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Docker Volume│ ──→ │  Temporary   │ ──→ │  Tar File    │
│  myvolume    │     │  Container   │     │  (host disk) │
│  (data)      │     │  (tar)       │     │  backup.tar  │
└──────────────┘     └──────────────┘     └──────────────┘

RESTORE PROCESS:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Tar File    │ ──→ │  Temporary   │ ──→ │ Docker Volume│
│  backup.tar  │     │  Container   │     │  myvolume    │
│  (host disk) │     │  (tar)       │     │  (restored)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Multi-Stage Build Questions {#multi-stage}

### Q21: What is multi-stage build? Why is it useful?

**Short Answer:** Multi-stage build uses multiple FROM statements to build in one stage and copy only necessary files to final stage, creating smaller images.

**Visual:**

```
SINGLE-STAGE (Bad):
┌─────────────────────────────────────┐
│ FROM node:18                        │
│ COPY . .                            │
│ RUN npm install (500 MB)            │
│ RUN npm run build (5 MB output)    │
│                                     │
│ Final image: 1.2 GB                 │
│ ├─ node:18 base (900 MB)           │
│ ├─ node_modules (500 MB) ⚠️         │
│ ├─ source code (20 MB) ⚠️           │
│ └─ built output (5 MB) ✓           │
└─────────────────────────────────────┘

MULTI-STAGE (Good):
┌─────────────────────────────────────┐
│ # Build stage                       │
│ FROM node:18 AS builder             │
│ COPY . .                            │
│ RUN npm install                     │
│ RUN npm run build                   │
│                                     │
│ # Production stage                  │
│ FROM node:18-alpine                 │
│ COPY --from=builder /app/dist .     │
│                                     │
│ Final image: 55 MB                  │
│ ├─ node:18-alpine (50 MB) ✓        │
│ └─ built output (5 MB) ✓           │
│                                     │
│ Savings: 95% smaller! 🎉            │
└─────────────────────────────────────┘
```

**Benefits:**

- ✓ Much smaller final images (50-95% reduction)
- ✓ Faster deployments
- ✓ Better security (no build tools in production)
- ✓ Cleaner separation of build vs runtime

---

### Q22: Explain how COPY --from works in multi-stage builds

**Short Answer:** `COPY --from=stage` copies files from a previous build stage to current stage.

**Example:**

```dockerfile
# Stage 1: Build
FROM golang:1.21 AS builder
WORKDIR /build
COPY . .
RUN go build -o myapp

# Stage 2: Production
FROM alpine:3.18
COPY --from=builder /build/myapp /app/myapp
#            ^^^^^^^ From stage named "builder"
#                    ^^^^^^^^^^^^ Source path in builder
#                                 ^^^^^^^^^^^^ Destination in current stage
CMD ["/app/myapp"]
```

**Visual Flow:**

```
BUILDER STAGE (Temporary):
┌─────────────────────────────────┐
│ /build/                         │
│  ├── main.go       (source)     │
│  ├── go.mod        (deps)       │
│  ├── vendor/       (packages)   │
│  └── myapp         (binary) ✓   │ ← We want this!
└─────────────────────────────────┘
         │
         │ COPY --from=builder /build/myapp
         ▼
PRODUCTION STAGE (Final):
┌─────────────────────────────────┐
│ /app/                           │
│  └── myapp         (binary) ✓   │ ← Only this copied!
└─────────────────────────────────┘

Builder stage: DELETED after build
Production: Only has the binary (tiny!)
```

---

## Docker Compose Questions {#compose}

### Q23: What is Docker Compose? When do you use it?

**Short Answer:** Docker Compose runs multiple containers together using a YAML file. Use it when your application needs multiple services (app + database + cache).

**Visual:**

```
WITHOUT COMPOSE (Manual):
$ docker network create mynetwork
$ docker run -d --name db --network mynetwork postgres
$ docker run -d --name redis --network mynetwork redis
$ docker run -d --name app --network mynetwork -p 8080:8080 myapp
→ Multiple commands! Complex!

WITH COMPOSE (Simple):
$ docker-compose up
→ One command! All services start together!
```

**docker-compose.yml Example:**

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    image: myapp-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  # Backend API
  backend:
    image: myapp-backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
    depends_on:
      - db
      - redis

  # Database
  db:
    image: postgres:14
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=secret

  # Cache
  redis:
    image: redis:alpine

volumes:
  db-data:
```

**Visual Architecture:**

```
$ docker-compose up

┌────────────────────────────────────────┐
│  Docker Compose Network                │
│                                        │
│  ┌──────────┐                          │
│  │ frontend │ :3000                    │
│  └─────┬────┘                          │
│        │ calls                         │
│        ▼                               │
│  ┌──────────┐      ┌──────────┐       │
│  │ backend  │─────→│  redis   │       │
│  └─────┬────┘      └──────────┘       │
│        │                               │
│        │ queries                       │
│        ▼                               │
│  ┌──────────┐                          │
│  │    db    │                          │
│  └──────────┘                          │
└────────────────────────────────────────┘

All services talk to each other by name!
```

---

### Q24: What are the main Docker Compose commands?

**Short Answer:**

```bash
# Start all services
docker-compose up

# Start in background (detached)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs
docker-compose logs -f  # Follow logs

# View running services
docker-compose ps

# Restart services
docker-compose restart

# Build images
docker-compose build

# Run command in service
docker-compose exec service-name bash
```

**Example Session:**

```bash
# Start services
$ docker-compose up -d
Creating network "myapp_default"
Creating myapp_db_1    ... done
Creating myapp_redis_1 ... done
Creating myapp_backend_1 ... done
Creating myapp_frontend_1 ... done

# Check status
$ docker-compose ps
NAME                STATUS          PORTS
myapp_frontend_1    Up 2 minutes    0.0.0.0:3000->3000/tcp
myapp_backend_1     Up 2 minutes    0.0.0.0:8080->8080/tcp
myapp_db_1          Up 2 minutes    5432/tcp
myapp_redis_1       Up 2 minutes    6379/tcp

# View logs
$ docker-compose logs backend
backend_1  | Server started on port 8080

# Stop all
$ docker-compose down
Stopping myapp_frontend_1 ... done
Stopping myapp_backend_1  ... done
Stopping myapp_redis_1    ... done
Stopping myapp_db_1       ... done
```

---

## Security Questions {#security}

### Q25: How do you run containers as non-root user?

**Short Answer:** Create a user in Dockerfile and switch to it with USER instruction.

**Example:**

```dockerfile
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy and install as root
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . .

# Change ownership to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Now runs as appuser, not root!
CMD ["python", "app.py"]
```

**Why Important:**

```
RUNNING AS ROOT (Bad):
┌─────────────────────────────────┐
│ Container (root user)           │
│                                 │
│ If hacker exploits app:         │
│ ├─ Has root access              │
│ ├─ Can modify any file          │
│ ├─ Can install malware          │
│ └─ Can escape container ⚠️      │
└─────────────────────────────────┘

RUNNING AS NON-ROOT (Good):
┌─────────────────────────────────┐
│ Container (appuser)             │
│                                 │
│ If hacker exploits app:         │
│ ├─ Limited permissions          │
│ ├─ Can't modify system files    │
│ ├─ Can't install software       │
│ └─ Limited damage ✓             │
└─────────────────────────────────┘
```

---

### Q26: How do you handle secrets in Docker?

**Short Answer:** Never put secrets in Dockerfile or image. Use environment variables, Docker secrets, or secret management tools.

**❌ WRONG Ways:**

```dockerfile
# DON'T DO THIS!
ENV DATABASE_PASSWORD=supersecret123

# DON'T DO THIS!
COPY secrets.json /app/

# DON'T DO THIS!
ARG API_KEY=secret-key-here
```

**✅ RIGHT Ways:**

**1. Environment Variables at Runtime:**

```bash
docker run -e DATABASE_PASSWORD=secret123 myapp

# Or from file
docker run --env-file .env myapp
```

**2. Docker Secrets (Swarm mode):**

```bash
# Create secret
echo "secret123" | docker secret create db_password -

# Use in service
docker service create \
  --secret db_password \
  --name myapp \
  myapp:latest
```

**3. Build-time Secrets (BuildKit):**

```dockerfile
# syntax=docker/dockerfile:1.4
FROM python:3.11

RUN --mount=type=secret,id=pip_token \
    pip install --index-url https://$(cat /run/secrets/pip_token)@pypi.org
```

```bash
docker buildx build --secret id=pip_token,src=token.txt .
```

---

### Q27: What are Docker security best practices?

**Interview Answer:**

```
1. ✓ Use official base images
   FROM python:3.11  # Not random/unknown images

2. ✓ Run as non-root user
   USER appuser

3. ✓ Scan images for vulnerabilities
   docker scan myimage

4. ✓ Keep images updated
   Update base images regularly

5. ✓ Use specific versions, not 'latest'
   FROM python:3.11  # Not python:latest

6. ✓ Minimize image size
   Smaller = less attack surface

7. ✓ Don't store secrets in images
   Use environment variables or secrets management

8. ✓ Use read-only filesystem where possible
   docker run --read-only myapp

9. ✓ Limit container resources
   docker run --memory=512m --cpus=1 myapp

10. ✓ Use network segmentation
    Isolate containers in separate networks
```

---

## Performance & Optimization Questions {#performance}

### Q28: How do you optimize Docker build time?

**Short Answer:** Use layer caching, .dockerignore, multi-stage builds, and order instructions properly.

**Optimization Techniques:**

**1. Order Instructions (Most Important):**

```dockerfile
# ❌ BAD: Copy code before dependencies
COPY . .                    # Changes often
RUN pip install -r req.txt  # Rebuilds on every code change!

# ✅ GOOD: Dependencies first
COPY requirements.txt .     # Changes rarely
RUN pip install -r req.txt  # Cached unless deps change!
COPY . .                    # Changes often, but deps still cached
```

**2. Use .dockerignore:**

```
# .dockerignore
node_modules
.git
tests
*.log

Build time:
Without: 5 minutes (uploading 2 GB)
With: 10 seconds (uploading 50 MB)
```

**3. Multi-stage Builds:**

```dockerfile
FROM node:18 AS builder
RUN npm install && npm run build

FROM node:18-alpine
COPY --from=builder /app/dist .

Result: 90% smaller, faster deploys!
```

**4. BuildKit Cache Mounts:**

```dockerfile
# syntax=docker/dockerfile:1.4
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Pip downloads cached across builds!
```

**Time Comparison:**

```
BEFORE OPTIMIZATION:
First build: 10 minutes
Code change rebuild: 10 minutes ⚠️

AFTER OPTIMIZATION:
First build: 10 minutes
Code change rebuild: 30 seconds ✓
```

---

### Q29: How do you reduce Docker image size?

**Short Answer:** Use Alpine base, multi-stage builds, minimize layers, and clean up in same RUN command.

**Techniques:**

**1. Use Smaller Base Images:**

```dockerfile
ubuntu:latest    → 77 MB
ubuntu:slim      → 27 MB
alpine:latest    → 7 MB
scratch         → 0 MB (empty!)
```

**2. Multi-Stage Builds:**

```dockerfile
FROM node:18 AS builder       # 900 MB
RUN npm install && npm build

FROM node:18-alpine           # 50 MB
COPY --from=builder /dist .

Reduction: 900 MB → 55 MB (94% smaller!)
```

**3. Combine RUN Commands:**

```dockerfile
# ❌ BAD: 3 layers
RUN apt-get update          # Layer 1: 50 MB
RUN apt-get install python  # Layer 2: 100 MB
RUN rm -rf /var/lib/apt     # Layer 3: 4 KB (but 150 MB still there!)

# ✅ GOOD: 1 layer
RUN apt-get update && \
    apt-get install python && \
    rm -rf /var/lib/apt/*   # Cleaned in same layer: 100 MB total
```

**4. Don't Install Unnecessary Packages:**

```dockerfile
RUN apt-get install --no-install-recommends python3
# Installs only python3, not recommended packages
```

**5. Clear Package Manager Caches:**

```dockerfile
# Python
RUN pip install --no-cache-dir -r requirements.txt

# Node.js
RUN npm ci && npm cache clean --force

# Alpine
RUN apk add --no-cache python3
```

---

## Troubleshooting Questions {#troubleshooting}

### Q30: Container exits immediately. How do you debug?

**Short Answer:** Check logs, inspect the container, and verify the CMD/ENTRYPOINT.

**Debugging Steps:**

**1. Check Logs:**

```bash
docker logs container_name

# Common issues:
# - Application crashes
# - Missing dependencies
# - Permission errors
# - Port already in use
```

**2. Check Exit Code:**

```bash
docker ps -a
# EXITED (0)   = Normal exit
# EXITED (1)   = Application error
# EXITED (137) = Out of memory
# EXITED (139) = Segmentation fault
```

**3. Override CMD to Debug:**

```bash
# Run with shell instead of app
docker run -it myimage /bin/bash

# Or
docker run -it myimage sh

# Now you can manually run commands and see what fails
```

**4. Check Dockerfile CMD:**

```dockerfile
# ❌ BAD: Exits immediately
CMD echo "Hello"  # Runs and exits!

# ✅ GOOD: Keeps running
CMD ["python", "app.py"]  # Long-running process
```

**Common Reasons:**

```
1. CMD/ENTRYPOINT exits immediately
   → App runs and finishes (no long-running process)

2. Application crashes
   → Check logs for error

3. Missing file or permission denied
   → Check file paths and permissions

4. Wrong user
   → May not have permission to access files
```

---

### Q31: How do you troubleshoot "Cannot connect to Docker daemon"?

**Short Answer:** Docker daemon is not running or you don't have permission.

**Solutions:**

**1. Start Docker Daemon:**

```bash
# Linux
sudo systemctl start docker
sudo systemctl status docker

# macOS
# Start Docker Desktop app

# Windows
# Start Docker Desktop app
```

**2. Check User Permissions:**

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Logout and login again, then test:
docker ps  # Should work without sudo
```

**3. Check Docker Socket:**

```bash
# Verify socket exists
ls -l /var/run/docker.sock

# Should show:
# srw-rw---- 1 root docker 0 ... /var/run/docker.sock

# If wrong permissions:
sudo chmod 666 /var/run/docker.sock
```

**4. Check if Docker is Installed:**

```bash
docker --version

# If not installed:
# Install Docker following official docs
```

---

### Q32: How do you debug networking issues between containers?

**Short Answer:** Verify containers are on same network, check DNS resolution, and test connectivity.

**Debugging Steps:**

**1. Check Network Configuration:**

```bash
# List networks
docker network ls

# Inspect network
docker network inspect mynetwork

# Check which containers are connected
docker network inspect mynetwork | grep Name
```

**2. Test DNS Resolution:**

```bash
# From one container, ping another by name
docker exec frontend ping backend

# Should resolve to container's IP
# If "ping: bad address 'backend'" = not on same network
```

**3. Test Connectivity:**

```bash
# Try curl
docker exec frontend curl http://backend:8080

# If timeout = port not exposed
# If connection refused = service not running
# If not found = wrong network
```

**4. Common Issues:**

```
Issue: "Could not resolve host 'backend'"
Solution: Containers not on same network
→ docker network connect mynetwork frontend

Issue: "Connection refused"
Solution: Service not listening on correct port
→ Check EXPOSE and app configuration

Issue: "Connection timeout"
Solution: Firewall or port not accessible
→ Check network settings and firewall rules
```

---

## Scenario-Based Questions {#scenarios}

### Q33: You have a 3-tier application (Frontend, Backend, Database). How would you containerize it?

**Answer:**

**Architecture:**

```
┌──────────────┐
│   Frontend   │ :3000 (React)
│  (nginx)     │
└──────┬───────┘
       │ HTTP calls
       ▼
┌──────────────┐
│   Backend    │ :8080 (Node.js API)
└──────┬───────┘
       │ SQL queries
       ▼
┌──────────────┐
│   Database   │ :5432 (PostgreSQL)
│  (persistent)│
└──────────────┘
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - API_URL=http://backend:8080

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - database
    environment:
      - DATABASE_URL=postgres://user:pass@database:5432/mydb

  database:
    image: postgres:14
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb

volumes:
  db-data:
```

**Key Points:**

- Each tier in separate container
- Frontend talks to backend by name
- Backend talks to database by name
- Database uses volume for persistence
- depends_on ensures correct startup order

---

### Q34: Your Docker image is 2GB. How would you reduce it?

**Answer:**

**Analysis Steps:**

```
1. Check what's taking space:
   docker history myimage --no-trunc

2. Common culprits:
   - Large base image (ubuntu instead of alpine)
   - Build tools in final image
   - node_modules or dependencies
   - Source files not needed at runtime
```

**Solution:**

```dockerfile
# BEFORE (2 GB)
FROM ubuntu:latest                    # 500 MB
RUN apt-get install build-essential  # 800 MB
COPY . .                             # 200 MB
RUN npm install                      # 500 MB
RUN npm run build                    # 50 MB

# AFTER (100 MB)
# Build stage
FROM node:18-alpine AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine                  # 50 MB
COPY --from=builder /app/dist .     # 50 MB
RUN npm ci --only=production
CMD ["node", "server.js"]

# Reduction: 2 GB → 100 MB (95% smaller!)
```

---

### Q35: How would you implement health checks for your containers?

**Answer:**

**In Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .

# Health check every 30 seconds
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "server.js"]
```

**healthcheck.js:**

```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/health',
  timeout: 5000
};

http.get(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
}).on('error', () => {
  process.exit(1); // Unhealthy
});
```

**In Docker Compose:**

```yaml
services:
  app:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Health Endpoint in App:**

```javascript
// Express example
app.get('/health', async (req, res) => {
  try {
    // Check database
    await db.ping();
    // Check Redis
    await redis.ping();
    
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

---

## Advanced Questions {#advanced}

### Q36: Explain Docker's architecture

**Short Answer:** Docker uses client-server architecture. Docker Client talks to Docker Daemon, which builds, runs, and distributes containers.

**Visual:**

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR COMPUTER                        │
│                                                         │
│  ┌──────────────┐                                       │
│  │ Docker Client│                                       │
│  │              │                                       │
│  │ $ docker run │                                       │
│  │ $ docker build                                       │
│  └──────┬───────┘                                       │
│         │ REST API                                      │
│         ▼                                               │
│  ┌──────────────────────────────┐                      │
│  │     Docker Daemon            │                      │
│  │     (dockerd)                │                      │
│  │                              │                      │
│  │  ├─ Manages containers       │                      │
│  │  ├─ Manages images           │                      │
│  │  ├─ Manages networks         │                      │
│  │  └─ Manages volumes          │                      │
│  └──────┬───────────────────────┘                      │
│         │                                               │
│         ▼                                               │
│  ┌────────────────────────────────────┐                │
│  │  Container Runtime (containerd)    │                │
│  │  ├─ Creates containers             │                │
│  │  └─ Manages container lifecycle    │                │
│  └────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
         │
         │ Pull/Push
         ▼
┌─────────────────────────────────────────────────────────┐
│                    DOCKER HUB                           │
│  (Registry - stores images)                             │
└─────────────────────────────────────────────────────────┘
```

**Components:**

1. **Docker Client**: CLI tool you use
2. **Docker Daemon**: Background service that does the work
3. **Container Runtime**: Actually runs containers
4. **Registry**: Stores and distributes images

---

### Q37: What's the difference between Docker and Virtual Machines?

**Short Answer:** VMs include full OS (heavy), Docker containers share host OS kernel (lightweight).

**Visual Comparison:**

```
VIRTUAL MACHINES:
┌─────────────────────────────────────────┐
│         Host Operating System           │
├─────────────────────────────────────────┤
│             Hypervisor                  │
├───────────────┬───────────┬─────────────┤
│   VM 1        │   VM 2    │   VM 3      │
│ ┌───────────┐ │┌─────────┐│┌──────────┐│
│ │Guest OS   │ ││Guest OS ││ │Guest OS  ││
│ │(1 GB)     │ ││(1 GB)   ││ │(1 GB)    ││
│ ├───────────┤ │├─────────┤│ ├──────────┤│
│ │App        │ ││App      ││ │App       ││
│ └───────────┘ │└─────────┘│ └──────────┘│
└───────────────┴───────────┴─────────────┘

Total: 3 GB just for OS! ⚠️
Startup: Minutes

DOCKER CONTAINERS:
┌─────────────────────────────────────────┐
│         Host Operating System           │
├─────────────────────────────────────────┤
│            Docker Engine                │
├───────────┬───────────┬─────────────────┤
│Container1 │Container2 │  Container3     │
│ ┌────────┐│┌─────────┐│ ┌──────────┐   │
│ │App     ││ │App     ││  │App       │   │
│ │Libs    ││ │Libs    ││  │Libs      │   │
│ └────────┘│ └─────────┘│  └──────────┘   │
└───────────┴───────────┴─────────────────┘
     │           │             │
     └───────────┴─────────────┘
        Share Host OS Kernel

Total: ~100 MB for apps only ✓
Startup: Seconds
```

**Comparison:**

|Feature|VM|Docker|
|---|---|---|
|OS|Full OS per VM|Shares host OS|
|Size|GBs|MBs|
|Startup|Minutes|Seconds|
|Performance|Slower|Near-native|
|Isolation|Complete|Process-level|
|Resource|Heavy|Lightweight|

---

### Q38: How does Docker networking work internally?

**Short Answer:** Docker creates virtual networks using Linux networking features (network namespaces, virtual ethernet, and bridge).

**Technical Explanation:**

```
HOST MACHINE:
┌──────────────────────────────────────────┐
│  Physical Network Interface (eth0)       │
│  IP: 192.168.1.100                       │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Docker Bridge (docker0)                 │
│  IP: 172.17.0.1                          │
│                                          │
│  ┌─────────────┐    ┌─────────────┐      │
│  │ Container 1 │    │ Container 2 │      │
│  │ veth0       │    │ veth0       │      │
│  │ 172.17.0.2  │    │ 172.17.0.3  │      │
│  └─────────────┘    └─────────────┘      │
└──────────────────────────────────────────┘

Network Flow:
1. Each container gets virtual network interface (veth)
2. Connected to docker0 bridge
3. Bridge acts as switch
4. NAT allows containers to access external network
```

**Key Components:**

- **Network Namespace**: Isolated network stack per container
- **veth Pair**: Virtual ethernet cable connecting container to bridge
- **Bridge**: Virtual switch connecting containers
- **iptables**: NAT and firewall rules

---

### Q39: What is Docker Swarm? How is it different from Kubernetes?

**Short Answer:** Both are container orchestration tools. Swarm is simpler, Kubernetes is more powerful and feature-rich.

**Docker Swarm:**

```
SWARM CLUSTER:
┌────────────────────────────────────────┐
│  Manager Node                          │
│  ├─ Schedules containers               │
│  ├─ Manages cluster state              │
│  └─ Handles scaling                    │
└────────┬───────────────────────────────┘
         │ Assigns tasks
         ▼
┌────────────────┬────────────────┬───────┐
│ Worker Node 1  │ Worker Node 2  │ ...   │
│ ├─ Container A │ ├─ Container C │       │
│ └─ Container B │ └─ Container D │       │
└────────────────┴────────────────┴───────┘
```

**Comparison:**

|Feature|Docker Swarm|Kubernetes|
|---|---|---|
|Setup|Easy|Complex|
|Learning Curve|Low|High|
|Features|Basic|Advanced|
|Community|Smaller|Huge|
|Use Case|Small-medium|Enterprise|
|Auto-scaling|Basic|Advanced|
|Self-healing|Yes|Yes (better)|

**When to use:**

- **Swarm**: Small projects, quick setup, Docker-only environment
- **Kubernetes**: Large scale, complex requirements, multi-cloud

---

### Q40: How do you monitor Docker containers in production?

**Answer:**

**1. Docker Built-in Commands:**

```bash
# Container stats (CPU, memory, network)
docker stats

# Logs
docker logs -f container_name

# Inspect container
docker inspect container_name

# Top processes
docker top container_name
```

**2. Monitoring Tools:**

```
┌────────────────────────────────────┐
│  Prometheus + Grafana              │
│  ├─ Metrics collection             │
│  ├─ Alerting                       │
│  └─ Dashboards                     │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  ELK Stack (Elasticsearch, Logstash, Kibana) │
│  ├─ Log aggregation                │
│  ├─ Log analysis                   │
│  └─ Visualization                  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  cAdvisor                          │
│  ├─ Container metrics              │
│  └─ Resource usage                 │
└────────────────────────────────────┘
```

**3. docker-compose with monitoring:**

```yaml
version: '3.8'

services:
  app:
    image: myapp
    
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

**4. Key Metrics to Monitor:**

```
✓ CPU usage
✓ Memory usage
✓ Network I/O
✓ Disk I/O
✓ Container health status
✓ Application logs
✓ Error rates
✓ Response times
```

---

## Quick Reference: Common Commands

```bash
# Images
docker images                    # List images
docker pull image:tag            # Download image
docker build -t name .           # Build image
docker rmi image_id              # Remove image
docker tag source target         # Tag image

# Containers
docker ps                        # List running containers
docker ps -a                     # List all containers
docker run image                 # Create and start container
docker run -d image              # Run in background
docker run -it image bash        # Run interactive with shell
docker start container_id        # Start stopped container
docker stop container_id         # Stop container
docker rm container_id           # Remove container

# Logs & Debug
docker logs container            # View logs
docker logs -f container         # Follow logs
docker exec -it container bash   # Enter container
docker inspect container         # View details

# Networks
docker network ls                # List networks
docker network create name       # Create network
docker network connect net cont  # Connect container to network

# Volumes
docker volume ls                 # List volumes
docker volume create name        # Create volume
docker volume rm name            # Remove volume

# Compose
docker-compose up                # Start services
docker-compose up -d             # Start in background
docker-compose down              # Stop services
docker-compose logs              # View logs
docker-compose ps                # List services

# Cleanup
docker system prune              # Remove unused data
docker system prune -a           # Remove all unused data
docker container prune           # Remove stopped containers
docker image prune               # Remove unused images
docker volume prune              # Remove unused volumes
```

---

## Interview Tips

### How to Answer Docker Questions:

1. **Start with simple explanation**
    
    - "Docker is a containerization platform that..."
    - Don't jump straight into technical details
2. **Use analogies**
    
    - "Like a shipping container for applications"
    - "Image is like a class, container is like an object"
3. **Show practical experience**
    
    - "In my last project, I used Docker to..."
    - "I've worked with multi-stage builds to reduce image size..."
4. **Mention trade-offs**
    
    - "While Docker is great for X, it's not ideal for Y because..."
5. **Be honest about what you don't know**
    
    - "I haven't used that specific feature, but based on what I know about Docker..."

### Common Follow-up Questions:

After each answer, be prepared for:

- "Can you give an example?"
- "Have you used this in production?"
- "What challenges did you face?"
- "How did you solve that problem?"

### Red Flags to Avoid:

❌ "Docker is just like a VM" ❌ "I always use latest tag" ❌ "I run containers as root, it's fine" ❌ "I don't use .dockerignore" ❌ "My images are 5GB, that's normal"

### Good Things to Mention:

✅ Security considerations (non-root user) ✅ Optimization techniques (multi-stage, caching) ✅ Best practices (.dockerignore, specific versions) ✅ Real-world experience ✅ Troubleshooting skills

---

**Remember**: Interviewers value understanding over memorization. Show you understand WHY things work, not just HOW to do them!

Good luck with your interview! 🎉