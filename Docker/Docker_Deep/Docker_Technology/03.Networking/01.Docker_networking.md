# Docker Networking - The City of Connected Rooms 🏙️🌉

## What is Docker Networking?

Think of Docker Networking as creating a **mini-internet inside your computer**! 

Your containers = **Houses in a city** 🏠🏠🏠
Docker Networking = **Roads, phone lines, and postal system** 🛣️📞📫

Each container (house) gets:
- Its own address (IP like 172.17.0.2)
- Its own phone line (network interface)
- Ability to call other houses (containers)
- A mailbox (ports) for receiving mail (requests)

## The Big Picture: Docker Network Types

Docker has 5 main types of "cities" you can build:

```
1. Bridge City      🏙️  (Default) - Houses on same street
2. Host City        🏠🌍  - House shares host's address
3. None City        🏝️   - House with no roads (island)
4. Overlay City     🌐🏙️  - Multiple cities connected (Swarm/Kubernetes)
5. Macvlan City     🏘️📡  - Houses get real street addresses
```

Let's explore each one!

## 1. Bridge Network - The Default City 🏙️

This is Docker's **default network** - like a gated community!

### How Bridge Network Works:

```bash
# When you run: docker run nginx

# Docker creates:
YOUR COMPUTER (Host)
├── Bridge: docker0 (172.17.0.1) ← The main road
    ├── Container 1: 172.17.0.2 (nginx) ← House 1
    │   └── Network: eth0 (connected to bridge)
    ├── Container 2: 172.17.0.3 (mysql) ← House 2  
    │   └── Network: eth0 (connected to bridge)
    └── Container 3: 172.17.0.4 (redis) ← House 3
        └── Network: eth0 (connected to bridge)

# All houses can talk to each other via the bridge!
```

### Bridge Network in Action:

```bash
# Create a bridge network (like building a new neighborhood)
docker network create my-network  # Creates "my-network" bridge

# Run containers in this network
docker run -d --name web --network my-network nginx
docker run -d --name db --network my-network mysql
docker run -d --name cache --network my-network redis

# Containers can talk using names!
# Inside web container: ping db → Works!
# Inside db container: ping cache → Works!
```

### The Magic of Container-to-Container Communication:

```bash
# Without Docker Networking (old way):
Container 1: "I want to talk to mysql"
Developer: "Use IP 172.17.0.3"
Problem: IP changes! 😫

# With Docker Networking (new way):
Container 1: "I want to talk to mysql"
Developer: "Just use 'db'"
Docker DNS: "db = 172.17.0.3" ← Automatic! 😄

# Docker provides built-in DNS!
# Containers can use each other's names
```

## 2. Port Mapping - The "Windows and Doors" 🪟🚪

This is how the OUTSIDE world talks to containers!

### Simple Port Mapping:

```bash
# Run container with port mapping:
docker run -d -p 8080:80 --name website nginx

# What happens:
HOST PORT 8080 → CONTAINER PORT 80
Your Computer        Container
   ↓                     ↓
localhost:8080  →   nginx:80
    ↑                     ↑
   You                 Website

# Like: House has window at position 8080
#       Inside, nginx is listening at window 80
#       Docker connects outside 8080 to inside 80
```

### Multiple Port Mappings:

```bash
# Map multiple ports:
docker run -d \
  -p 80:80        \  # HTTP
  -p 443:443      \  # HTTPS  
  -p 8080:8080    \  # Management
  --name myapp nginx

# Now:
http://localhost:80      → Container port 80
https://localhost:443    → Container port 443
http://localhost:8080    → Container port 8080
```

### Automatic Port Assignment:

```bash
# Let Docker choose host port:
docker run -d -p 80 --name web nginx
# Docker picks random port like 32768

# Check assigned port:
docker port web
# Output: 80/tcp → 0.0.0.0:32768

# Like: House has door, city assigns door number
```

## 3. Host Network - Sharing Your Address 🏠🌍

This mode removes network isolation - container uses host's network directly.

```bash
# Run with host network:
docker run -d --network host --name web nginx

# What happens:
Container shares host's IP and ports!
No port mapping needed!

# Now nginx runs on:
Host IP:Port 80 directly

# Like: Building is part of your house
# No separate address, uses your address
```

**Warning:** This is less secure but can be faster (no NAT overhead).

## 4. None Network - The Island 🏝️

Container with NO network access at all!

```bash
# Run with no network:
docker run -d --network none --name isolated alpine sleep 1000

# What container has:
- No IP address
- No network interfaces (except loopback)
- Can't connect to internet
- Can't talk to other containers

# Like: House on an island with no boats
# Completely isolated for maximum security
```

## 5. Overlay Network - Connecting Multiple Cities 🌐🏙️

This is for **Docker Swarm** or **Kubernetes** - connecting containers across multiple servers!

```bash
# Create overlay network (needs swarm):
docker swarm init                  # Initialize swarm
docker network create -d overlay my-overlay  # Create overlay network

# Run services on different machines:
docker service create \
  --network my-overlay \
  --name web \
  nginx

docker service create \
  --network my-overlay \
  --name db \
  mysql

# Magic: Containers on DIFFERENT servers can talk!
# Like having teleportation between cities!
```

## 6. Macvlan Network - Real Street Addresses 🏘️📡

Gives containers **real MAC addresses** and direct network access.

```bash
# Create macvlan network:
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  my-macvlan

# Run container:
docker run --network my-macvlan --ip=192.168.1.100 nginx

# Now container:
- Gets real IP on your network (192.168.1.100)
- Has its own MAC address
- Appears as separate device on network
- Can be accessed directly by other computers

# Like: Building gets its own street address
# Other houses on street can visit directly
```

## Deep Dive: How Docker Networking Actually Works 🔍

Let's look under the hood at what Docker creates:

### Step 1: The Virtual Ethernet Cable (veth pair)

```bash
# When container starts, Docker creates:
Container: eth0 (virtual network card) ↔ Host: vethXXXXX (virtual cable end)

# Like having a walkie-talkie pair:
# One walkie-talkie inside container
# Other walkie-talkie on host
# They're connected wirelessly!
```

### Step 2: The Bridge (docker0)

```bash
# The bridge is like a network switch:
docker0 bridge (172.17.0.1)
├── veth1 (connected to container1:172.17.0.2)
├── veth2 (connected to container2:172.17.0.3)
├── veth3 (connected to container3:172.17.0.4)
└── ...

# Bridge forwards traffic between containers
# Like a telephone exchange connecting calls
```

### Step 3: Network Namespace Isolation

```bash
# Each container gets its own network "view":
Container 1 Network View:
- Interface: eth0 (172.17.0.2)
- Routing table: routes to 172.17.0.0/16 via eth0
- iptables: empty (or container-specific rules)
- /proc/net: shows only container's network info

Container 2 Network View:
- Interface: eth0 (172.17.0.3)  ← DIFFERENT!
- Routing table: routes to 172.17.0.0/16 via eth0
- iptables: empty
- /proc/net: different from container 1

# Like each house has its own phone directory
# Can't see other houses' phone calls
```

### Step 4: IPTables - The Traffic Police 🚔

```bash
# Docker uses iptables for:
1. NAT (Network Address Translation)
2. Port forwarding
3. Firewall rules
4. Load balancing

# Example rules Docker creates:
# NAT for outgoing traffic:
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE

# Port forwarding:
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 80 -j DNAT --to-destination 172.17.0.2:80

# Like traffic cops directing cars:
# "Cars from neighborhood → change license plates (NAT)"
# "Cars going to port 80 → send to house 172.17.0.2"
```

### Step 5: Docker's Built-in DNS 🗺️

```bash
# Docker runs its own DNS server (127.0.0.11)
# Container's /etc/resolv.conf:
nameserver 127.0.0.11

# This DNS:
1. Resolves container names to IPs
   web → 172.17.0.2
   db  → 172.17.0.3

2. Forwards other requests to host's DNS
   google.com → 8.8.8.8 (or your ISP DNS)

# Like having a city directory service:
# "Need house 'db'? That's at 172.17.0.3"
# "Need internet? Let me connect you"
```

## Real-World Examples: Building Complete Systems

### Example 1: Web Application Stack 🌐

```bash
# Create network for our app:
docker network create app-network

# Run database:
docker run -d \
  --name database \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8.0

# Run backend API:
docker run -d \
  --name backend \
  --network app-network \
  -e DB_HOST=database \
  -p 3000:3000 \
  node-api:latest

# Run frontend:
docker run -d \
  --name frontend \
  --network app-network \
  -p 80:80 \
  nginx-frontend:latest

# Communication flow:
Browser → frontend:80 → backend:3000 → database:3306
         (public)      (internal)     (internal)
```

### Example 2: Microservices Architecture 🔗

```bash
# Create network:
docker network create microservices

# Run services:
docker run -d --name auth --network microservices auth-service
docker run -d --name users --network microservices user-service  
docker run -d --name orders --network microservices order-service
docker run -d --name payments --network microservices payment-service
docker run -d --name gateway --network microservices -p 8080:8080 api-gateway

# Gateway routes requests:
GET /api/users → users-service
POST /api/orders → orders-service (which calls payments-service)
```

### Example 3: Development with Hot Reload 🔥

```bash
# Create dev network:
docker network create dev-network

# Run database:
docker run -d --name postgres-dev --network dev-network postgres

# Run app with volume mount (code sync):
docker run -d \
  --name app-dev \
  --network dev-network \
  -p 3000:3000 \
  -v $(pwd)/src:/app/src \  # Mount source code
  -v /app/node_modules \    # Keep node_modules in container
  node-dev

# Now:
1. Edit code on host → auto syncs to container
2. App hot reloads
3. App can talk to postgres-dev
4. Visit localhost:3000
```

## Network Drivers - The "City Planners" 🏗️

Docker has different network drivers for different needs:

```bash
# 1. Bridge driver (default)
docker network create --driver bridge my-bridge

# 2. Host driver  
docker network create --driver host my-host

# 3. Overlay driver
docker network create --driver overlay my-overlay

# 4. Macvlan driver
docker network create --driver macvlan my-macvlan

# 5. IPvlan driver (similar to macvlan but shares MAC)
docker network create --driver ipvlan my-ipvlan

# 6. Third-party drivers (plugins):
# - Weave Net: Advanced networking features
# - Calico: Network policy enforcement
# - Flannel: Simple overlay networking
# - Cilium: eBPF-based networking
```

## Network Security Features 🔒

### 1. Network Segmentation

```bash
# Create separate networks for security:
docker network create frontend-net
docker network create backend-net
docker network create database-net

# Run containers in specific networks:
docker run -d --name web --network frontend-net nginx
docker run -d --name api --network backend-net node-api
docker run -d --name db --network database-net mysql

# Now:
- Web can't directly talk to database (different networks)
- More secure architecture
```

### 2. Internal Networks (No Internet Access)

```bash
# Create internal-only network:
docker network create --internal secure-net

# Run containers:
docker run -d --name internal-app --network secure-net myapp

# Container CAN:
- Talk to other containers in same network
- Use DNS resolution

# Container CANNOT:
- Access internet
- Be accessed from host (no port mapping)
- Talk to containers in other networks

# Like a secure vault inside bank
```

### 3. Network Policies (with plugins)

```bash
# Using Calico for network policies:
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
spec:
  podSelector:
    matchLabels:
      role: database
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api-server
    ports:
    - protocol: TCP
      port: 3306

# This means: Only api-server can talk to database on port 3306
# Like security rules: "Only employees with badge can enter server room"
```

## Advanced Networking Features 🚀

### 1. IPv6 Support

```bash
# Enable IPv6 in Docker daemon:
# /etc/docker/daemon.json:
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64"
}

# Create IPv6 network:
docker network create --ipv6 --subnet=2001:db8:1::/64 ipv6-net

# Run container with IPv6:
docker run --network ipv6-net --ip6 2001:db8:1::100 nginx
```

### 2. Dual Stack Networking (IPv4 + IPv6)

```bash
# Container gets both addresses:
Container eth0:
- IPv4: 172.17.0.2
- IPv6: 2001:db8:1::2

# Can communicate with both IPv4 and IPv6 networks
# Like having both landline and mobile phone
```

### 3. Service Discovery

```bash
# Docker provides automatic service discovery:
# 1. DNS-based:
ping web          # Resolves to container IP
ping db           # Resolves to container IP

# 2. Docker Embedded DNS:
# All containers use 127.0.0.11 as DNS
# This DNS knows all container names

# 3. Load balancing DNS:
# In Swarm mode, service name resolves to multiple IPs
# Docker DNS does round-robin between them
```

### 4. Network Aliases

```bash
# Give container multiple names:
docker run -d --name web1 --network mynet --network-alias website nginx
docker run -d --name web2 --network mynet --network-alias website nginx

# Now:
ping website  # Rotates between web1 and web2
# Like having multiple doors to same building
```

## Troubleshooting Network Issues 🐛

### Common Problems and Solutions:

```bash
# Problem 1: Containers can't talk to each other
# Solution: Check if in same network
docker network ls
docker network inspect my-network

# Problem 2: Can't access container from host  
# Solution: Check port mapping
docker ps  # Look under PORTS column
netstat -tulpn | grep 8080  # Check if port listening

# Problem 3: No internet in container
# Solution: Check DNS
docker exec container cat /etc/resolv.conf
# Should have: nameserver 127.0.0.11

# Problem 4: Slow network performance
# Solution: Use host network or macvlan
docker run --network host nginx  # Bypass bridge

# Problem 5: Port already in use
# Solution: Use different port or stop existing container
docker run -p 8081:80 nginx  # Use different host port
```

### Network Inspection Commands:

```bash
# See all networks:
docker network ls

# Inspect a network:
docker network inspect bridge
# Shows: containers, IP range, gateway, subnet

# See container network details:
docker inspect container-name | grep -A 20 "NetworkSettings"

# Check container's network namespace:
docker exec container ip addr show
docker exec container netstat -tulpn
docker exec container cat /etc/hosts
docker exec container cat /etc/resolv.conf

# Check host networking:
ip link show          # See network interfaces
brctl show docker0    # See bridge connections
iptables -L -n -t nat # See NAT rules
```

## Performance Considerations ⚡

### Bridge Network Overhead:

```bash
# Bridge network adds NAT overhead:
Host → Container: Packet goes through:
1. Host interface → Bridge → veth → Container
   (NAT translation happens here)

# Overhead: ~10% performance loss
# Use --network host for maximum performance
# Or macvlan for direct network access
```

### Network Driver Comparison:

```
Driver     | Performance | Isolation | Use Case
-----------|-------------|-----------|----------
bridge     | Good        | High      | Default, development
host       | Best        | None      | Performance critical
macvlan    | Excellent   | Medium    | Production, need real IP
overlay    | Good        | High      | Multi-host, clustering
none       | N/A         | Maximum   | Security sensitive
```

## Real Production Example: E-commerce Site 🛒

```yaml
# docker-compose.yml for production
version: '3.8'
services:
  # Load balancer (public facing)
  traefik:
    image: traefik:v2.4
    ports:
      - "80:80"
      - "443:443"
    networks:
      - public
      - internal
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
  
  # Web servers (behind load balancer)
  web:
    image: nginx:alpine
    networks:
      - internal
    deploy:
      replicas: 3
    labels:
      - "traefik.http.routers.web.rule=Host(`example.com`)"
  
  # Application servers
  app:
    image: node-app:latest
    networks:
      - internal
    deploy:
      replicas: 5
  
  # Database (private network only)
  database:
    image: postgres:13
    networks:
      - database
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  # Cache (private network)
  redis:
    image: redis:alpine
    networks:
      - internal
  
  # Monitoring (separate network)
  prometheus:
    image: prom/prometheus
    networks:
      - monitoring
    ports:
      - "9090:9090"

networks:
  public:      # For traefik to receive traffic
    driver: bridge
  internal:    # For service communication
    driver: overlay
  database:    # Database isolation
    internal: true  # No internet access
  monitoring:  # Monitoring tools
    driver: bridge

volumes:
  pgdata:
```

## The Complete Networking Picture 🖼️

```
Internet
    ↓
[ Your Router ]  ← Real network
    ↓
[ Your Computer ]  ← Host machine
    │
    ├── [ docker0 Bridge (172.17.0.1) ]  ← Default network
    │   ├── [ Container A: Web (172.17.0.2:80) ] ↔ [ Host Port: 8080 ]
    │   ├── [ Container B: API (172.17.0.3:3000) ] ↔ [ Host Port: 3000 ]
    │   └── [ Container C: DB (172.17.0.4:3306) ] ↔ (No host port)
    │
    ├── [ Custom Bridge: app-net (10.0.0.1) ]  ← Your custom network
    │   ├── [ Service 1 (10.0.0.2) ]
    │   └── [ Service 2 (10.0.0.3) ]
    │
    └── [ Host Network ]  ← Shared with host
        └── [ Container D ]  ← Uses host's IP directly

Communication:
- Browser → localhost:8080 → Container A:80
- Container A → Container B via "api" name (DNS)
- Container B → Container C via "db" name
- All isolated, all secured, all managed by Docker!
```

## Simple Rules to Remember:

1. **Default**: Containers on same network can talk using names
2. **Port Mapping**: Map host ports to container ports for external access
3. **Bridge**: Default network type (good for most cases)
4. **Host**: For maximum performance (less isolation)
5. **None**: For maximum security (no network)
6. **Overlay**: For multiple machines (Docker Swarm/Kubernetes)
7. **Macvlan**: For giving containers real IP addresses

## The Magic Simplicity ✨

Despite all this complexity, you just need to know:

```bash
# Basic networking:
docker run -p 80:80 nginx          # Make container accessible
docker network create my-net       # Create network
docker run --network my-net app    # Join container to network
docker-compose up                  # Everything connected automatically

# That's it! Docker handles the rest!
# The entire city of containers builds itself! 🏙️
```

Docker networking turns your computer into a bustling city of containers, all connected, all communicating, all isolated yet accessible when needed. It's like having a complete internet infrastructure inside your laptop! 🌐💻