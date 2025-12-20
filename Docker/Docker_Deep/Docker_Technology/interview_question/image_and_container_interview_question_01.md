# Docker Images & Containers: Complete Interview Guide

## Deep Dive with Explanations & Diagrams

## Table of Contents

1. [Fundamental Concepts](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#fundamentals)
2. [Image Architecture Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#image-architecture)
3. [Container Lifecycle Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#container-lifecycle)
4. [Image Management Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#image-management)
5. [Container Management Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#container-management)
6. [Image Building Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#image-building)
7. [Container Runtime Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#container-runtime)
8. [Image vs Container Deep Dive](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#image-vs-container)
9. [Advanced Image Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#advanced-images)
10. [Advanced Container Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#advanced-containers)
11. [Practical Scenario Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#scenarios)
12. [Troubleshooting Questions](https://claude.ai/chat/1aeaf5cc-96d4-4c4b-bd25-c56339a51961#troubleshooting)

---

## Fundamental Concepts {#fundamentals}

### Q1: What is a Docker image? Explain its structure.

**Short Answer:** A Docker image is a read-only template containing everything needed to run an application. It's built in layers, like a stack of transparent sheets.

**Detailed Explanation:**

```
DOCKER IMAGE STRUCTURE:

Image = Stack of Layers (like a cake)
┌─────────────────────────────────────┐
│ Layer 5: CMD instruction (metadata) │ ← Your startup command
├─────────────────────────────────────┤
│ Layer 4: COPY app code (5 MB)       │ ← Your application
├─────────────────────────────────────┤
│ Layer 3: RUN pip install (200 MB)   │ ← Dependencies
├─────────────────────────────────────┤
│ Layer 2: COPY requirements.txt (2KB)│ ← Dependency list
├─────────────────────────────────────┤
│ Layer 1: FROM python:3.11 (150 MB)  │ ← Base OS + Python
└─────────────────────────────────────┘

Total Image Size: 355 MB
Each layer is READ-ONLY and IMMUTABLE
```

**Image Properties:**

```
1. IMMUTABLE (Cannot be changed)
   ┌──────────────────────┐
   │ myapp:v1.0           │ ← Frozen, never changes
   │ sha256:abc123...     │
   └──────────────────────┘

2. LAYERED (Built in steps)
   Each Dockerfile instruction = One layer
   
3. SHAREABLE (Multiple containers can use same image)
   Image: myapp:latest
          ↓
   ┌──────┴──────┬──────┬──────┐
   │             │      │      │
   Container1  Container2  Container3  Container4

4. PORTABLE (Works on any Docker host)
   Dev → Staging → Production (same image!)

5. VERSIONED (Tagged with names/versions)
   myapp:v1.0
   myapp:v1.1
   myapp:latest
```

**Real-World Analogy:**

```
Image = Class in Programming
──────────────────────────────
class Car:                    Docker Image: myapp:latest
  def __init__(self):        ├─ Contains code
    self.engine = "V8"       ├─ Contains config
    self.wheels = 4          └─ Ready to instantiate

Can't drive a class!         Can't run an image directly!
Need to create objects       Need to create containers
```

---

### Q2: What is a Docker container? How does it differ from an image?

**Short Answer:** A container is a running instance of an image. Image = Template (read-only), Container = Running process (writable).

**Visual Comparison:**

```
IMAGE (Blueprint - Static)
┌─────────────────────────────────────┐
│ Docker Image: nginx:latest          │
│                                     │
│ Contains:                           │
│ ├─ Ubuntu OS files                  │
│ ├─ Nginx binary                     │
│ ├─ Config files                     │
│ └─ Default HTML                     │
│                                     │
│ Status: Stored on disk              │
│ State: Read-only, frozen            │
│ Can't execute by itself             │
│ Size: 142 MB                        │
└─────────────────────────────────────┘

         docker run (creates instance)
                    ↓

CONTAINER (Running Instance - Dynamic)
┌─────────────────────────────────────┐
│ Container ID: abc123def456          │
│ Name: my-nginx                      │
│                                     │
│ Based on: nginx:latest              │
│                                     │
│ Running:                            │
│ ├─ PID 1: nginx master              │
│ ├─ PID 7: nginx worker              │
│ └─ Listening on port 80             │
│                                     │
│ Status: RUNNING                     │
│ State: Writable layer on top        │
│ Can create/modify files             │
│ Has own filesystem namespace        │
│ Has own network namespace           │
│ Has own process namespace           │
└─────────────────────────────────────┘
```

**Key Differences Table:**

|Aspect|Image|Container|
|---|---|---|
|**Nature**|Template/Blueprint|Running Instance|
|**State**|Immutable (Read-only)|Mutable (Writable)|
|**Storage**|Stored on disk|Running in memory|
|**Execution**|Cannot execute|Actively executing|
|**Quantity**|One|Many from one image|
|**Lifespan**|Permanent (until deleted)|Temporary (until stopped)|
|**Size**|Fixed|Image size + changes|
|**Creation**|Built from Dockerfile|Created from image|
|**Command**|`docker build`|`docker run`|
|**Sharing**|Shared by containers|Isolated per container|

**Code Example:**

```bash
# Image exists on disk
$ docker images
REPOSITORY   TAG      IMAGE ID       SIZE
nginx        latest   abc123def456   142MB

# Create 3 containers from ONE image
$ docker run -d --name web1 nginx  # Container 1
$ docker run -d --name web2 nginx  # Container 2
$ docker run -d --name web3 nginx  # Container 3

# Three independent containers from same image
$ docker ps
CONTAINER ID   IMAGE    NAME   STATUS
xyz789abc      nginx    web1   Up 5 seconds
def456ghi      nginx    web2   Up 3 seconds
jkl012mno      nginx    web3   Up 1 second

# Each container is isolated and independent!
```

---

### Q3: Can you modify a Docker image? What happens when you try to modify files in a container?

**Short Answer:** You cannot modify an image (read-only). When you modify files in a container, changes are written to a writable layer on top of the image.

**Visual Explanation:**

```
IMAGE LAYERS (Read-Only, Immutable):
┌─────────────────────────────────────┐
│ Layer 3: app code     [READ-ONLY]   │ 🔒
├─────────────────────────────────────┤
│ Layer 2: dependencies [READ-ONLY]   │ 🔒
├─────────────────────────────────────┤
│ Layer 1: base OS      [READ-ONLY]   │ 🔒
└─────────────────────────────────────┘
            ↓ docker run
            ↓
RUNNING CONTAINER:
┌─────────────────────────────────────┐
│ Writable Layer [READ-WRITE] ✏️      │ ← Changes go here!
├─────────────────────────────────────┤
│ Layer 3: app code     [READ-ONLY]   │ 🔒
├─────────────────────────────────────┤
│ Layer 2: dependencies [READ-ONLY]   │ 🔒
├─────────────────────────────────────┤
│ Layer 1: base OS      [READ-ONLY]   │ 🔒
└─────────────────────────────────────┘
```

**What Happens When You Modify Files:**

```
SCENARIO 1: Creating New File
─────────────────────────────────────
$ docker run -it ubuntu bash
root@abc123:/# echo "Hello" > /test.txt

Writable Layer:
┌─────────────────────────────────────┐
│ + /test.txt (new file)              │ ✓ Added to writable layer
└─────────────────────────────────────┘

SCENARIO 2: Modifying Existing File
─────────────────────────────────────
Image has: /etc/config.json
Container modifies it:

root@abc123:/# echo "new data" >> /etc/config.json

What happens (Copy-on-Write):
1. File exists in image layer (read-only)
2. Docker COPIES file to writable layer
3. Modification happens in writable layer
4. Original in image unchanged

Writable Layer:
┌─────────────────────────────────────┐
│ /etc/config.json (modified copy)    │ ← Modified version
└─────────────────────────────────────┘

Image Layer (unchanged):
┌─────────────────────────────────────┐
│ /etc/config.json (original)         │ ← Original intact
└─────────────────────────────────────┘

When reading: Container sees version in writable layer

SCENARIO 3: Deleting File
─────────────────────────────────────
root@abc123:/# rm /app/data.txt

Writable Layer:
┌─────────────────────────────────────┐
│ .wh.data.txt (whiteout marker)      │ ← Hides original
└─────────────────────────────────────┘

Image Layer (unchanged):
┌─────────────────────────────────────┐
│ /app/data.txt (still exists!)       │ ← Still in image
└─────────────────────────────────────┘

File appears deleted, but exists in image!
```

**Important Points:**

```
1. Image layers NEVER change
   ├─ Even if container modifies files
   └─ Original files remain in image

2. Changes only in writable layer
   ├─ Lost when container is removed
   └─ Unless committed or using volumes

3. Copy-on-Write mechanism
   ├─ Efficient (don't copy until needed)
   └─ Multiple containers share image layers

4. To persist changes:
   ├─ Use volumes
   ├─ Commit container to new image
   └─ Rebuild image with changes
```

---

### Q4: What is the difference between `docker commit` and `docker build`?

**Short Answer:**

- `docker commit`: Creates image from running container (manual changes)
- `docker build`: Creates image from Dockerfile (automated, reproducible)

**Visual Comparison:**

```
DOCKER COMMIT (Manual):
═══════════════════════════════════════════════════════

Step 1: Start container
$ docker run -it ubuntu bash

Step 2: Make manual changes
root@abc123:/# apt-get update
root@abc123:/# apt-get install python3
root@abc123:/# pip install flask
root@abc123:/# exit

Step 3: Commit container to image
$ docker commit abc123 myapp:v1

Flow:
┌──────────┐    Manual     ┌───────────┐    Commit    ┌──────────┐
│ Base     │────Changes───→│ Container │─────────────→│ New Image│
│ Image    │    in Shell   │           │              │          │
└──────────┘               └───────────┘              └──────────┘

Problems:
❌ Not reproducible (manual steps)
❌ No documentation (what did you do?)
❌ Hard to maintain
❌ Can't see history
❌ Not version controlled

DOCKER BUILD (Automated):
═══════════════════════════════════════════════════════

Step 1: Write Dockerfile
FROM ubuntu
RUN apt-get update && apt-get install -y python3
RUN pip install flask

Step 2: Build image
$ docker build -t myapp:v1 .

Flow:
┌──────────┐               ┌──────────┐    Build     ┌──────────┐
│Dockerfile│──────────────→│  Docker  │─────────────→│ New Image│
│ (Recipe) │  Automated    │  Daemon  │              │          │
└──────────┘               └──────────┘              └──────────┘

Benefits:
✓ Reproducible (same Dockerfile = same image)
✓ Documented (Dockerfile is documentation)
✓ Version controlled (track changes in git)
✓ Automated (CI/CD pipelines)
✓ Cacheable (faster rebuilds)
```

**When to Use Each:**

```
USE DOCKER COMMIT:
──────────────────────────────────
✓ Quick debugging/testing
✓ One-off experiments
✓ Temporary fixes
✓ Creating checkpoint of container state

Example:
$ docker run -it ubuntu bash
# Test some configuration...
# Works! Save for later
$ docker commit abc123 test-config:v1

USE DOCKER BUILD:
──────────────────────────────────
✓ Production images
✓ Team collaboration
✓ CI/CD pipelines
✓ Version control
✓ Need reproducibility

Example:
Write Dockerfile → git commit → CI builds → Deploy
```

**Code Example:**

```bash
# COMMIT APPROACH (Manual)
$ docker run -it ubuntu:20.04 bash
root@abc:/# apt-get update
root@abc:/# apt-get install -y python3 python3-pip
root@abc:/# pip3 install flask
root@abc:/# exit
$ docker commit abc123 myapp:manual
# Image created, but how do you recreate it?

# BUILD APPROACH (Automated)
$ cat Dockerfile
FROM ubuntu:20.04
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install flask

$ docker build -t myapp:automated .
# Documented, reproducible, shareable!
```

---

## Image Architecture Questions {#image-architecture}

### Q5: How are Docker image layers stored on disk?

**Short Answer:** Image layers are stored in `/var/lib/docker/overlay2/` using overlay filesystem. Each layer is stored separately and stacked using union mount.

**Visual Explanation:**

```
OVERLAY2 FILESYSTEM:

/var/lib/docker/overlay2/
├── layer-abc123/            ← Layer 1 (Base OS)
│   ├── diff/                   (Actual files)
│   │   ├── bin/
│   │   ├── usr/
│   │   └── lib/
│   ├── link                    (Short ID)
│   └── work/                   (Temp working dir)
│
├── layer-def456/            ← Layer 2 (Dependencies)
│   ├── diff/
│   │   └── usr/local/lib/python/
│   ├── lower                   (Points to parent: abc123)
│   └── link
│
├── layer-ghi789/            ← Layer 3 (App code)
│   ├── diff/
│   │   └── app/
│   ├── lower                   (Points to parent: def456)
│   └── link
│
└── container-xyz/           ← Container writable layer
    ├── diff/                   (Container changes)
    ├── merged/                 (Unified view of all layers)
    ├── lower                   (Points to: ghi789)
    └── work/

HOW LAYERS ARE STACKED:

Bottom (oldest) → Top (newest)
┌─────────────────────────────────┐
│ Container Writable Layer        │ ← Changes here
├─────────────────────────────────┤
│ Layer 3: App code (ghi789)     │
├─────────────────────────────────┤
│ Layer 2: Dependencies (def456)  │
├─────────────────────────────────┤
│ Layer 1: Base OS (abc123)      │
└─────────────────────────────────┘

Union Mount (OverlayFS):
All layers appear as single filesystem!

What you see in container:
/
├── bin/        (from Layer 1)
├── usr/
│   ├── bin/    (from Layer 1)
│   └── local/
│       └── lib/
│           └── python/  (from Layer 2)
├── app/        (from Layer 3)
└── test.txt    (from Writable Layer)
```

**Key Concepts:**

```
1. SHARING LAYERS:
──────────────────────────────────────
Image A:        Image B:        Image C:
┌────────┐     ┌────────┐     ┌────────┐
│ Layer C│     │ Layer D│     │ Layer E│
├────────┤     ├────────┤     ├────────┤
│ Layer B│     │ Layer B│     │ Layer B│ ← Shared!
├────────┤     ├────────┤     ├────────┤
│ Layer A│     │ Layer A│     │ Layer A│ ← Shared!
└────────┘     └────────┘     └────────┘

Layer A stored ONCE on disk, used by all three!
Saves disk space!

2. LAYER IDENTIFICATION:
──────────────────────────────────────
Each layer has unique SHA256 hash:
sha256:abc123def456...

If two layers have same content = Same hash = Reused!

3. LAYER METADATA:
──────────────────────────────────────
{
  "id": "abc123",
  "parent": "def456",
  "created": "2024-01-15T10:30:00Z",
  "container_config": {...},
  "size": 1024576
}
```

---

### Q6: What is the Union Filesystem? How does it work in Docker?

**Short Answer:** Union filesystem (OverlayFS in modern Docker) combines multiple directories (layers) into a single unified view. Lower layers are read-only, top layer is writable.

**Visual Explanation:**

```
HOW UNION FILESYSTEM WORKS:

LAYER STRUCTURE:
┌─────────────────────────────────────┐
│ Upper Dir (Writable)                │
│ /var/lib/docker/overlay2/container/ │
│ ├── new-file.txt                    │ ← Created in container
│ └── modified-config.json            │ ← Modified in container
└─────────────────────────────────────┘
               ↓ Union Mount
┌─────────────────────────────────────┐
│ Lower Dir 3 (Read-only)             │
│ ├── app/app.py                      │ ← Application code
│ └── app/config.json                 │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Lower Dir 2 (Read-only)             │
│ └── usr/local/lib/python/           │ ← Dependencies
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Lower Dir 1 (Read-only)             │
│ ├── bin/                            │ ← Base OS
│ ├── usr/                            │
│ └── lib/                            │
└─────────────────────────────────────┘

MERGED VIEW (What container sees):
┌─────────────────────────────────────┐
│ Merged Directory                    │
│ ├── bin/              (from Layer 1)│
│ ├── usr/                            │
│ │   ├── bin/         (from Layer 1)│
│ │   └── local/                      │
│ │       └── lib/                    │
│ │           └── python/ (Layer 2)  │
│ ├── app/                            │
│ │   ├── app.py        (from Layer 3)│
│ │   └── config.json (from Upper!)  │ ← Modified version
│ ├── new-file.txt       (from Upper!)│ ← New file
│ └── lib/              (from Layer 1)│
└─────────────────────────────────────┘
```

**How File Operations Work:**

```
OPERATION 1: READ FILE
──────────────────────────────────────
Container reads: /app/app.py

Union FS logic:
1. Check Upper dir (writable) → Not found
2. Check Lower dir 3 → Found!
3. Return file from Layer 3

Result: File read from image layer

OPERATION 2: MODIFY FILE
──────────────────────────────────────
Container modifies: /app/config.json

Union FS logic:
1. File exists in Lower dir 3 (read-only)
2. COPY file to Upper dir (Copy-on-Write)
3. Modify copy in Upper dir
4. Original in Lower dir unchanged

Result:
- Upper dir: /app/config.json (modified)
- Lower dir: /app/config.json (original)
- Container sees modified version

OPERATION 3: CREATE FILE
──────────────────────────────────────
Container creates: /tmp/data.txt

Union FS logic:
1. Write directly to Upper dir
2. No need to check Lower dirs

Result: File only exists in Upper dir

OPERATION 4: DELETE FILE
──────────────────────────────────────
Container deletes: /app/app.py

Union FS logic:
1. File exists in Lower dir (can't delete read-only)
2. Create "whiteout" file in Upper dir: .wh.app.py
3. Whiteout hides file from merged view

Result:
- Lower dir: /app/app.py (still exists!)
- Upper dir: .wh.app.py (whiteout marker)
- Container: File appears deleted
```

**Benefits:**

```
1. EFFICIENCY:
   ├─ Layers shared between containers
   ├─ Only copy when modifying (Copy-on-Write)
   └─ Saves disk space and memory

2. SPEED:
   ├─ Container starts instantly (no copying)
   ├─ Image layers cached
   └─ Fast file access

3. ISOLATION:
   ├─ Each container has own writable layer
   ├─ Changes don't affect other containers
   └─ Image layers protected (read-only)
```

---

### Q7: What is the difference between image layers and container layers?

**Short Answer:** Image layers are read-only and shared, container layer is writable and unique per container.

**Visual Comparison:**

```
IMAGE LAYERS (Shared, Read-Only):
══════════════════════════════════════════════

┌─────────────────────────────────────────┐
│ Image: myapp:latest                     │
│                                         │
│ Layer 3: COPY app code    [READ-ONLY]   │ 🔒
│ Layer 2: RUN pip install  [READ-ONLY]   │ 🔒
│ Layer 1: FROM python:3.11 [READ-ONLY]   │ 🔒
│                                         │
│ Properties:                             │
│ ✓ Immutable (cannot change)             │
│ ✓ Shared (multiple containers use it)   │
│ ✓ Stored in /var/lib/docker/overlay2/   │
│ ✓ Permanent (until image deleted)       │
│ ✓ Created during docker build           │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
        ▼           ▼           ▼           ▼

CONTAINER LAYERS (Unique, Writable):
══════════════════════════════════════════════

┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│Container 1│  │Container 2│  │Container 3│  │Container 4│
│           │  │           │  │           │  │           │
│ Writable  │  │ Writable  │  │ Writable  │  │ Writable  │
│ Layer     │  │ Layer     │  │ Layer     │  │ Layer     │
│[RW] ✏️    │  │[RW] ✏️   │  │[RW] ✏️    │  │[RW] ✏️    │
├───────────┤  ├───────────┤  ├───────────┤  ├───────────┤
│ Image Layers (Shared Below)                             │
│ Layer 3: App code [RO] 🔒                               │
│ Layer 2: Dependencies [RO] 🔒                           │
│ Layer 1: Base OS [RO] 🔒                                │
└─────────────────────────────────────────────────────────┘

Properties of Container Layer:
✓ Mutable (can change)
✓ Unique (each container has own)
✓ Temporary (lost when container removed)
✓ Created during docker run
✓ Stores all changes made in container
```

**Detailed Comparison:**

|Aspect|Image Layers|Container Layer|
|---|---|---|
|**State**|Read-only 🔒|Read-write ✏️|
|**Sharing**|Shared by all containers|Unique per container|
|**Lifetime**|Permanent (until image deleted)|Temporary (until container removed)|
|**Creation**|`docker build`|`docker run`|
|**Purpose**|Store application + dependencies|Store runtime changes|
|**Location**|`/var/lib/docker/overlay2/`|`/var/lib/docker/overlay2/container-id/`|
|**Size**|Fixed (part of image)|Grows with changes|
|**Modification**|Cannot be changed|Can create/modify/delete files|

**Practical Example:**

```bash
# Image: 200 MB (3 layers)
$ docker images myapp
REPOSITORY   TAG      SIZE
myapp        latest   200MB

# Create 3 containers from image
$ docker run -d --name c1 myapp
$ docker run -d --name c2 myapp
$ docker run -d --name c3 myapp

# Disk usage:
Image layers: 200 MB (stored once)
Container c1 layer: 0 MB (no changes yet)
Container c2 layer: 0 MB (no changes yet)
Container c3 layer: 0 MB (no changes yet)
Total: 200 MB

# Now make changes in each container
$ docker exec c1 bash -c "dd if=/dev/zero of=/bigfile bs=1M count=50"
$ docker exec c2 bash -c "dd if=/dev/zero of=/bigfile bs=1M count=30"
$ docker exec c3 bash -c "dd if=/dev/zero of=/bigfile bs=1M count=20"

# Disk usage now:
Image layers: 200 MB (unchanged, still shared)
Container c1 layer: 50 MB (changes)
Container c2 layer: 30 MB (changes)
Container c3 layer: 20 MB (changes)
Total: 300 MB

# When containers are removed:
$ docker rm -f c1 c2 c3

# Disk usage:
Image layers: 200 MB (still there!)
Container layers: 0 MB (deleted with containers)
Total: 200 MB
```

---

## Container Lifecycle Questions {#container-lifecycle}

### Q8: Explain the complete lifecycle of a Docker container.

**Short Answer:** Container lifecycle: Created → Running → Paused → Stopped → Removed. Each state transition is triggered by specific commands.

**Visual Lifecycle:**

```
CONTAINER LIFECYCLE STATES:

                    docker create
                          │
                          ▼
              ┌────────────────────────┐
              │      CREATED           │
              │(Exists but not started)│
              └───────────┬────────────┘
                          │ docker start
                          ▼
              ┌────────────────────────┐
              │      RUNNING           │◄───┐
              │  (Container executing) │    │ docker unpause
              └─┬───────────┬──────────┘    │
                │           │               │
    docker pause│           │docker stop    │
                │           │               │
                ▼           ▼               │
    ┌──────────────┐  ┌────────────────┐    │
    │   PAUSED     │  │    STOPPED     │    │
    │(Frozen state)│  │ (Graceful stop)│────┘
    └──────┬───────┘  └────────┬───────┘
           │                   │
           │docker unpause     │docker start
           └──────────┬────────┘
                      │
                      │ docker rm
                      ▼
              ┌────────────────────────┐
              │      REMOVED           │
              │  (Deleted from disk)   │
              └────────────────────────┘
```

**State-by-State Explanation:**

```
STATE 1: CREATED
═══════════════════════════════════════════════════
Command: docker create nginx
What happens:
├─ Container configuration created
├─ Filesystem prepared (image layers + writable layer)
├─ Network settings configured
├─ Resources allocated (but not started)
└─ Container ID assigned

Status: EXISTS but NOT RUNNING
Disk: Uses space (writable layer created)
Memory: No memory used
Process: No process running

Example:
$ docker create --name mynginx nginx
abc123def456

$ docker ps -a
CONTAINER ID   STATUS
abc123def456   Created

STATE 2: RUNNING
═══════════════════════════════════════════════════
Command: docker start mynginx
What happens:
├─ Container process started (PID 1)
├─ Network activated
├─ Volumes mounted
├─ Port mapping applied
└─ CMD/ENTRYPOINT executed

Status: ACTIVE
Disk: Uses space
Memory: Active memory usage
Process: Running (nginx master + workers)

Example:
$ docker start mynginx
$ docker ps
CONTAINER ID   STATUS
abc123def456   Up 5 seconds

You can:
✓ Access via HTTP
✓ See logs: docker logs mynginx
✓ Execute commands: docker exec mynginx ls
✓ View stats: docker stats mynginx

STATE 3: PAUSED
═══════════════════════════════════════════════════
Command: docker pause mynginx
What happens:
├─ All processes frozen (SIGSTOP)
├─ No CPU time allocated
├─ Memory preserved
└─ Network connections held

Status: FROZEN
Disk: Uses space
Memory: Preserved (not released)
Process: Frozen (not executing)

Example:
$ docker pause mynginx
$ docker ps
CONTAINER ID   STATUS
abc123def456   Up 1 minute (Paused)

Container is "frozen in time":
✗ Can't accept connections
✗ Can't process requests
✓ Can resume quickly (docker unpause)

STATE 4: STOPPED
═══════════════════════════════════════════════════
Command: docker stop mynginx
What happens:
├─ SIGTERM sent to PID 1 (graceful shutdown)
├─ Wait 10 seconds (default)
├─ If still running, send SIGKILL
├─ Processes terminated
└─ Resources released

Status: EXITED
Disk: Uses space (writable layer preserved)
Memory: Released
Process: Terminated

Example:
$ docker stop mynginx
$ docker ps -a
CONTAINER ID   STATUS
abc123def456   Exited (0) 10 seconds ago

You can:
✓ Restart: docker start mynginx
✓ View logs: docker logs mynginx
✓ Inspect: docker inspect mynginx
✗ Can't access application

STATE 5: REMOVED
═══════════════════════════════════════════════════
Command: docker rm mynginx
What happens:
├─ Container must be stopped first
├─ Writable layer deleted
├─ Network disconnected
├─ Volumes (if not named) deleted
└─ Container metadata removed

Status: DELETED
Disk: Space freed
Memory: N/A
Process: N/A

Example:
$ docker rm mynginx
$ docker ps -a
(Container not listed - completely gone)

You cannot:
✗ Start it again
✗ View logs
✗ Recover data (unless using volumes)
```

**Common Lifecycle Commands:**

```bash
# Create (but don't start)
docker create --name mycontainer nginx

# Create AND start (most common)
docker run -d --name mycontainer nginx

# Start stopped container
docker start mycontainer

# Stop running container (graceful)
docker stop mycontainer

# Kill running container (force)
docker kill mycontainer

# Pause container
docker pause mycontainer

# Unpause container
docker unpause mycontainer

# Restart container
docker restart mycontainer

# Remove stopped container
docker rm mycontainer

# Remove running container (force)
docker rm -f mycontainer
```

**Transition Times:**

```
Fast Transitions (< 1 second):
✓ Created → Running (docker start)
✓ Running → Paused (docker pause)
✓ Paused → Running (docker unpause)
✓ Stopped → Removed (docker rm)

Slower Transitions:
⏱ Running → Stopped (docker stop)
   └─ Up to 10 seconds (grace period)

⏱ Any → Running (docker run)
   └─ Depends on image size and application startup
```

---

### Q9: What happens when you run `docker run`? Explain step-by-step.

**Short Answer:** `docker run` creates and starts a container in one command. It pulls image if needed, creates container, sets up networking, and starts the process.

**Detailed Step-by-Step:**

```
COMMAND: docker run -d -p 8080:80 --name webserver nginx

STEP 1: Parse Arguments
═══════════════════════════════════════════════════
Docker parses:
├─ -d: Run in detached mode (background)
├─ -p 8080:80: Map host port 8080 to container port 80
├─ --name webserver: Container name
└─ nginx: Image to use

STEP 2: Check Image Locally
═══════════════════════════════════════════════════
Docker checks: "Do I have nginx:latest locally?"

/var/lib/docker/images/
├─ ubuntu:20.04 ✓
├─ python:3.11 ✓
└─ nginx:latest ✗ (NOT FOUND)

Action: Need to pull from registry

STEP 3: Pull Image (if needed)
═══════════════════════════════════════════════════
Docker connects to Docker Hub:

Pulling from library/nginx
  Downloading layer 1/5: ████████████ 100%
  Downloading layer 2/5: ████████████ 100%
  Downloading layer 3/5: ████████████ 100%
  Downloading layer 4/5: ████████████ 100%
  Downloading layer 5/5: ████████████ 100%
Status: Downloaded

Layers saved to: /var/lib/docker/overlay2/

STEP 4: Create Container
═══════════════════════════════════════════════════
Docker creates container structure:

┌─────────────────────────────────────────┐
│ Container ID: abc123def456 (generated)  │
│ Name: webserver                         │
│                                         │
│ Filesystem:                             │
│ ┌─────────────────────────────────────┐ │
│ │ Writable Layer (empty initially)    │ │
│ ├─────────────────────────────────────┤ │
│ │ nginx Image Layers (read-only)      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Network Configuration:                  │
│ ├─ Namespace created (isolated network) │
│ ├─ veth pair created (virtual ethernet) │
│ ├─ Connected to bridge network          │
│ └─ Port mapping: 8080 → 80              │
│                                         │
│ Process Configuration:                  │
│ ├─ PID namespace created                │
│ ├─ Mount namespace created              │
│ └─ CMD: ["nginx", "-g", "daemon off;"]  │
└─────────────────────────────────────────┘

STEP 5: Set Up Networking
═══════════════════════════════════════════════════
Docker creates network stack:

Host Machine (192.168.1.100):
┌──────────────────────────────────────┐
│  Docker Bridge (docker0)             │
│  IP: 172.17.0.1                      │
│                                      │
│  ┌────────────────────────────┐      │
│  │ Container: webserver       │      │
│  │ IP: 172.17.0.2             │      │
│  │ Port: 80 (nginx listening) │      │
│  └────────────────────────────┘      │
│           ↕                          │
│  Port Mapping:                       │
│  Host :8080 → Container :80          │
└──────────────────────────────────────┘

Access: http://localhost:8080 → Container :80

STEP 6: Mount Volumes (if specified)
═══════════════════════════════════════════════════
If -v flag used:
docker run -v /host/data:/container/data nginx

Bind mount created:
Host: /host/data ↔ Container: /container/data

(In our example, no volumes, so this step skipped)

STEP 7: Start Container Process
═══════════════════════════════════════════════════
Docker starts the main process:

1. Create new process namespaces
2. Set up cgroups (resource limits)
3. Execute CMD: nginx -g "daemon off;"

Process started:
PID 1 (in container): nginx master process
PID 7 (in container): nginx worker process

Container Status: RUNNING

STEP 8: Return Container ID
═══════════════════════════════════════════════════
Docker returns:
abc123def456789...

Container running in background (-d flag)

STEP 9: Container Running
═══════════════════════════════════════════════════
┌─────────────────────────────────────────┐
│ Container: webserver                    │
│ Status: UP                              │
│                                         │
│ Process Tree:                           │
│ └─ nginx (PID 1)                        │
│    └─ nginx worker                      │
│                                         │
│ Network:                                │
│ ├─ Listening on port 80                │
│ └─ Accessible via host:8080            │
│                                         │
│ Logs:                                   │
│ $ docker logs webserver                 │
│ Nginx started successfully              │
└─────────────────────────────────────────┘
```

**Complete Timeline:**

```
Time  Action                          Status
────────────────────────────────────────────────────
0ms   docker run command received     
10ms  Arguments parsed                
20ms  Image check (nginx:latest)      Not found
      ↓ Pull needed                   
1s    Connecting to Docker Hub        
5s    Downloading layers              Downloading...
15s   Layers saved to disk            Downloaded ✓
15.1s Container created                Created
15.2s Network configured              Network ready
15.3s Filesystem mounted              FS ready
15.5s Process started                 Running
15.6s Container ID returned           abc123def456

Total time: ~16 seconds (first run with pull)
Subsequent runs: <1 second (image cached)
```

**What You Can Do Now:**

```bash
# View container
$ docker ps
CONTAINER ID   IMAGE   COMMAND   STATUS
abc123def456   nginx   ...       Up 1 minute

# Access application
$ curl http://localhost:8080
Welcome to nginx!

# View logs
$ docker logs webserver
Nginx started on port 80

# Execute command inside
$ docker exec webserver ls /etc/nginx

# Stop container
$ docker stop webserver

# Remove container
$ docker rm webserver
```

---

### Q10: What is the difference between `docker stop` and `docker kill`?

**Short Answer:**

- `docker stop`: Graceful shutdown (SIGTERM, wait, then SIGKILL)
- `docker kill`: Immediate forced stop (SIGKILL directly)

**Detailed Comparison:**

```
DOCKER STOP (Graceful Shutdown):
═══════════════════════════════════════════════════

$ docker stop mycontainer

Timeline:
─────────────────────────────────────────────────
0s:    Command received
0.1s:  Docker sends SIGTERM to container PID 1
       ↓
       Container receives signal
       Application has chance to:
       ├─ Close database connections
       ├─ Finish processing requests
       ├─ Save state to disk
       ├─ Clean up resources
       └─ Exit gracefully
       ↓
10s:   Grace period (default --time=10)
       ↓
       If process still running:
       Docker sends SIGKILL (force kill)
       ↓
Exit:  Container stopped

Visual Flow:
┌──────────────────────────────────────────┐
│ docker stop mycontainer                  │
└──────────┬───────────────────────────────┘
           ▼
    ┌──────────────┐
    │ Send SIGTERM │ "Please stop"
    └──────┬───────┘
           ▼
    ┌──────────────────────────┐
    │ Wait 10 seconds          │ App can clean up
    │ (configurable with -t)   │
    └──────┬───────────────────┘
           ▼
    ┌──────────────────┐
    │ Still running?   │
    └──────┬───────┬───┘
           │       │
       Yes │       │ No
           ▼       ▼
    ┌──────────┐  Container
    │SIGKILL   │  Stopped
    │Force kill│  Exit code: 0
    └──────┬───┘
           ▼
    Container Stopped
    Exit code: 137

DOCKER KILL (Immediate Forced Stop):
═══════════════════════════════════════════════════

$ docker kill mycontainer

Timeline:
─────────────────────────────────────────────────
0s:    Command received
0.1s:  Docker sends SIGKILL to container PID 1
       ↓
       Container process killed immediately
       ├─ No cleanup possible
       ├─ Connections dropped
       ├─ Unsaved data lost
       └─ Abrupt termination
       ↓
Exit:  Container stopped

Visual Flow:
┌──────────────────────────────────────────┐
│ docker kill mycontainer                  │
└──────────┬───────────────────────────────┘
           ▼
    ┌──────────────┐
    │ Send SIGKILL │ "DIE NOW!"
    └──────┬───────┘
           ▼
    Container Stopped
    Exit code: 137
```

**Signal Comparison:**

```
SIGTERM (docker stop):
──────────────────────────────────────
Signal Number: 15
Meaning: "Terminate" (Polite request)
Catchable: YES (app can handle it)
Default action: Terminate process

Application can do:
✓ Catch signal: signal.SIGTERM
✓ Run cleanup code
✓ Save data
✓ Close connections gracefully
✓ Exit with custom code

Example (Python):
import signal
import sys

def handle_sigterm(sig, frame):
    print("Received SIGTERM, cleaning up...")
    db.close()
    cache.flush()
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)

SIGKILL (docker kill):
──────────────────────────────────────
Signal Number: 9
Meaning: "Kill" (Cannot be ignored)
Catchable: NO (kernel kills process)
Default action: Immediate termination

Application cannot do anything:
✗ Cannot catch signal
✗ No cleanup code runs
✗ Data may be lost
✗ Connections dropped
✗ No graceful exit
```

**Exit Codes:**

```
Normal Stop (docker stop):
──────────────────────────────────────
Exit Code 0: Application exited normally
  └─ Responded to SIGTERM and exited gracefully

Exit Code 137: Killed after timeout
  └─ Didn't respond to SIGTERM, was SIGKILLed
  └─ Calculation: 128 + 9 (SIGKILL) = 137

Forced Stop (docker kill):
──────────────────────────────────────
Exit Code 137: Forcefully killed
  └─ Always 137 for docker kill
```

**When to Use Each:**

```
USE DOCKER STOP:
✓ Normal operations
✓ Production environments
✓ When data integrity matters
✓ Applications with databases
✓ Need graceful shutdown

Example scenarios:
- Deploying new version
- Maintenance window
- Scaling down
- Regular operations

USE DOCKER KILL:
⚠️ Emergency only
⚠️ Container not responding
⚠️ docker stop hangs
⚠️ Need immediate stop

Example scenarios:
- Container frozen/hung
- Process consuming all CPU
- Debugging stuck container
- Emergency situations
```

**Practical Examples:**

```bash
# Example 1: Graceful stop with custom timeout
$ docker stop --time=30 mydb
# Waits 30 seconds before forcing

# Example 2: Stop multiple containers gracefully
$ docker stop $(docker ps -q)
# Stops all running containers

# Example 3: Force kill immediately
$ docker kill mycontainer

# Example 4: Send custom signal
$ docker kill --signal=SIGTERM mycontainer
# Similar to docker stop but no grace period

# Example 5: Check how container was stopped
$ docker inspect -f '{{.State.ExitCode}}' mycontainer
0   ← Graceful exit
137 ← Killed
```

**Web Server Example:**

```
NGINX with docker stop:
──────────────────────────────────────
$ docker stop nginx

What happens:
1. SIGTERM sent
2. Nginx receives signal
3. Stops accepting new connections
4. Finishes serving current requests
5. Closes connections
6. Exits cleanly
Result: No broken requests ✓

NGINX with docker kill:
──────────────────────────────────────
$ docker kill nginx

What happens:
1. SIGKILL sent
2. Process terminates immediately
3. Active connections dropped
4. Requests fail
Result: Broken requests! ✗
```

---

## Image Management Questions {#image-management}

### Q11: How do you list all Docker images and their sizes?

**Short Answer:**

```bash
docker images
# or
docker image ls
```

**Detailed Explanation:**

```bash
# Basic listing
$ docker images
REPOSITORY          TAG         IMAGE ID        CREATED         SIZE
nginx               latest      abc123def456    2 days ago      142MB
python              3.11        def456ghi789    1 week ago      917MB
python              3.11-slim   ghi789jkl012    1 week ago      125MB
myapp               v1.0        jkl012mno345    3 hours ago     455MB
myapp               v1.1        mno345pqr678    1 hour ago      460MB
<none>              <none>      pqr678stu901    5 hours ago     1.2GB

Column Explanation:
──────────────────────────────────────
REPOSITORY: Image name
TAG:        Version/variant
IMAGE ID:   Unique identifier (SHA256, first 12 chars)
CREATED:    When image was built
SIZE:       Apparent size (compressed)
```

**Advanced Filtering:**

```bash
# Filter by repository
$ docker images python
REPOSITORY   TAG       IMAGE ID       SIZE
python       3.11      def456         917MB
python       3.11-slim ghi789         125MB

# Filter by tag
$ docker images myapp:v1.0
REPOSITORY   TAG    IMAGE ID    SIZE
myapp        v1.0   jkl012      455MB

# Show all images including intermediate
$ docker images -a
# Includes layers used during build

# Show image digests (full SHA256)
$ docker images --digests
REPOSITORY   TAG     DIGEST                    SIZE
nginx        latest  sha256:abc123...def456    142MB

# Format output as JSON
$ docker images --format json
{"Containers":"N/A","CreatedAt":"2024-01-15...","Digest":"...",}

# Custom format
$ docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
REPOSITORY   TAG       SIZE
nginx        latest    142MB
python       3.11      917MB

# Show only image IDs
$ docker images -q
abc123def456
def456ghi789
ghi789jkl012

# Filter dangling images (untagged)
$ docker images --filter "dangling=true"
REPOSITORY   TAG       IMAGE ID       SIZE
<none>       <none>    pqr678stu901   1.2GB
```

**Understanding Image Sizes:**

```
IMAGE SIZE BREAKDOWN:

What is shown:
──────────────────────────────────────
SIZE column shows "apparent size"
- This is compressed size
- Size as shown by `docker images`
- Size on Docker Hub

Example: nginx:latest = 142 MB

Actual disk usage:
──────────────────────────────────────
To see real disk usage:
$ docker system df

TYPE            TOTAL    ACTIVE   SIZE
Images          5        2        1.5GB
Containers      3        1        50MB
Local Volumes   2        1        200MB

Why different?
├─ Layer sharing (images share layers)
├─ Compression
└─ Deduplication

Visual Example:
┌─────────────────────────────────────┐
│ Image A: 500 MB (apparent)          │
│ ├─ Layer 1: 200 MB                  │
│ ├─ Layer 2: 200 MB  ← Shared!       │
│ └─ Layer 3: 100 MB                  │
│                                     │
│ Image B: 400 MB (apparent)          │
│ ├─ Layer 2: 200 MB  ← Same layer!   │
│ └─ Layer 4: 200 MB                  │
│                                     │
│ Apparent total: 900 MB              │
│ Actual on disk: 700 MB              │
│ (Layer 2 counted once)              │
└─────────────────────────────────────┘
```

**Cleaning Up:**

```bash
# Remove specific image
$ docker rmi nginx:latest
# or
$ docker image rm nginx:latest

# Remove multiple images
$ docker rmi nginx:latest python:3.11

# Remove by ID
$ docker rmi abc123def456

# Remove dangling images (untagged)
$ docker image prune
WARNING! This will remove all dangling images.
Are you sure? [y/N] y
Deleted Images:
untagged: sha256:pqr678...
Total reclaimed space: 1.2GB

# Remove all unused images
$ docker image prune -a
WARNING! This will remove all images without at least one container.
Deleted Images:
untagged: myapp:v1.0
untagged: python:3.11-slim
Total reclaimed space: 580MB

# Force remove (even if container using it)
$ docker rmi -f nginx:latest
```

---

### Q12: What are dangling images? How do you remove them?

**Short Answer:** Dangling images are untagged images (shown as `<none>:<none>`). They're leftover layers from previous builds. Remove with `docker image prune`.

**Visual Explanation:**

```
HOW DANGLING IMAGES ARE CREATED:

SCENARIO 1: Rebuilding with Same Tag
─────────────────────────────────────

Step 1: Build image
$ docker build -t myapp:latest .
┌─────────────────────────────┐
│ myapp:latest                │
│ Image ID: abc123            │
│ Tag: myapp:latest ✓         │
└─────────────────────────────┘

Step 2: Change code, rebuild with same tag
$ docker build -t myapp:latest .
┌─────────────────────────────┐
│ NEW myapp:latest            │
│ Image ID: def456            │
│ Tag: myapp:latest ✓         │
└─────────────────────────────┘

Step 3: Old image becomes dangling
┌─────────────────────────────┐
│ <none>:<none>               │ ← DANGLING!
│ Image ID: abc123            │
│ Tag: REMOVED ✗              │
│ (tag moved to new image)    │
└─────────────────────────────┘

SCENARIO 2: Failed/Interrupted Build
─────────────────────────────────────

$ docker build -t myapp:latest .
Step 1/10: FROM ubuntu
Step 2/10: RUN apt-get update
Step 3/10: COPY app.py .
ERROR: app.py not found
Build failed!

Result: Intermediate layers created
┌─────────────────────────────┐
│ <none>:<none>               │ ← DANGLING!
│ (partial build artifacts)   │
└─────────────────────────────┘
```

**Identifying Dangling Images:**

```bash
# List all images
$ docker images
REPOSITORY   TAG      IMAGE ID       SIZE
myapp        latest   def456ghi789   200MB
nginx        latest   abc123def456   142MB
<none>       <none>   jkl012mno345   500MB  ← DANGLING
<none>       <none>   pqr678stu901   300MB  ← DANGLING

# Filter only dangling
$ docker images --filter "dangling=true"
REPOSITORY   TAG      IMAGE ID       SIZE
<none>       <none>   jkl012mno345   500MB
<none>       <none>   pqr678stu901   300MB

Total wasted space: 800MB!

# Get IDs only
$ docker images -f "dangling=true" -q
jkl012mno345
pqr678stu901
```

**Why Dangling Images Exist:**

```
REASON 1: Image Retagging
─────────────────────────────────────
Old version exists → Build new version with same tag
→ Old image loses tag → Becomes dangling

REASON 2: Build Failures
─────────────────────────────────────
Build starts → Creates layers → Build fails
→ Incomplete layers left behind → Dangling

REASON 3: Intermediate Layers
─────────────────────────────────────
Multi-stage build → Creates temporary layers
→ Only final image tagged → Intermediate dangling

REASON 4: Image Removal
─────────────────────────────────────
Tag removed → docker rmi myapp:v1.0
→ Image becomes untagged → Dangling
```

**Removing Dangling Images:**

```bash
# Method 1: Prune command (RECOMMENDED)
$ docker image prune
WARNING! This will remove all dangling images.
Are you sure you want to continue? [y/N] y

Deleted Images:
deleted: sha256:jkl012mno345...
deleted: sha256:pqr678stu901...

Total reclaimed space: 800MB

# Method 2: Remove by filter
$ docker rmi $(docker images -f "dangling=true" -q)
Deleted: jkl012mno345
Deleted: pqr678stu901

# Method 3: Force remove all
$ docker image prune -f
# No confirmation prompt

# Method 4: System-wide cleanup
$ docker system prune
# Removes stopped containers, dangling images, unused networks
```

**Prevention:**

```bash
# Use .dockerignore
# Prevents rebuild triggers from unnecessary files

# Be specific with tags
docker build -t myapp:v1.0 .  # Specific version
docker build -t myapp:v1.1 .  # New version
# Instead of always using :latest

# Clean up after builds
docker image prune -f

# Automated cleanup in CI/CD
- docker build -t myapp:$VERSION .
- docker push myapp:$VERSION
- docker image prune -f  # Clean danglers
```

---

(Continuing in next part due to length...)

Would you like me to continue with the remaining sections? I have:

- Container Management Questions
- Image Building Questions
- Container Runtime Questions
- Advanced Questions
- Scenario Questions
- Troubleshooting Questions

Each section has detailed Q&As with diagrams and explanations!