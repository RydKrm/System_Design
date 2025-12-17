# Docker Cheat Sheet - Commands & Purposes 📋🐳

## **DOCKERFILE INSTRUCTIONS**

| Command | Purpose | Example |
|---------|---------|---------|
| **FROM** | Sets the base image | `FROM ubuntu:20.04` |
| **LABEL** | Adds metadata to image | `LABEL version="1.0"` |
| **ARG** | Defines build-time variables | `ARG VERSION=latest` |
| **ENV** | Sets environment variables | `ENV NODE_ENV=production` |
| **WORKDIR** | Sets working directory | `WORKDIR /app` |
| **COPY** | Copies files from host to image | `COPY . /app` |
| **ADD** | Like COPY but can extract archives | `ADD file.tar.gz /` |
| **RUN** | Executes commands during build | `RUN apt update` |
| **CMD** | Default command when container runs | `CMD ["npm", "start"]` |
| **ENTRYPOINT** | Main executable for container | `ENTRYPOINT ["python"]` |
| **EXPOSE** | Documents which ports to expose | `EXPOSE 80` |
| **USER** | Sets user for subsequent commands | `USER appuser` |
| **VOLUME** | Creates mount point | `VOLUME /data` |
| **HEALTHCHECK** | Defines health check command | `HEALTHCHECK CMD curl -f http://localhost` |
| **ONBUILD** | Adds trigger for child images | `ONBUILD COPY . /app` |
| **STOPSIGNAL** | Sets stop signal | `STOPSIGNAL SIGTERM` |
| **SHELL** | Changes default shell | `SHELL ["powershell", "-Command"]` |

---

## **DOCKER CLI COMMANDS**

### **Container Management**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker run` | Run a container | `docker run nginx` |
| `docker start` | Start stopped container | `docker start myapp` |
| `docker stop` | Stop running container | `docker stop myapp` |
| `docker restart` | Restart container | `docker restart myapp` |
| `docker kill` | Force stop container | `docker kill myapp` |
| `docker rm` | Remove container | `docker rm myapp` |
| `docker pause` | Pause container | `docker pause myapp` |
| `docker unpause` | Unpause container | `docker unpause myapp` |
| `docker exec` | Run command in running container | `docker exec -it myapp bash` |
| `docker attach` | Attach to running container | `docker attach myapp` |
| `docker wait` | Wait for container to stop | `docker wait myapp` |

### **Container Information**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker ps` | List running containers | `docker ps` |
| `docker ps -a` | List all containers | `docker ps -a` |
| `docker logs` | View container logs | `docker logs myapp` |
| `docker inspect` | Inspect container details | `docker inspect myapp` |
| `docker top` | List processes in container | `docker top myapp` |
| `docker stats` | Show container resource usage | `docker stats` |
| `docker diff` | Show changed files in container | `docker diff myapp` |
| `docker port` | Show port mappings | `docker port myapp` |
| `docker rename` | Rename container | `docker rename old new` |

### **Image Management**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker build` | Build image from Dockerfile | `docker build -t myapp .` |
| `docker pull` | Pull image from registry | `docker pull nginx` |
| `docker push` | Push image to registry | `docker push myrepo/myapp` |
| `docker images` | List images | `docker images` |
| `docker rmi` | Remove image | `docker rmi myapp` |
| `docker tag` | Tag an image | `docker tag myapp:v1 myapp:latest` |
| `docker history` | Show image history | `docker history myapp` |
| `docker save` | Save image to tar file | `docker save myapp > myapp.tar` |
| `docker load` | Load image from tar file | `docker load < myapp.tar` |
| `docker import` | Create image from tarball | `docker import myapp.tar` |
| `docker commit` | Create image from container | `docker commit mycontainer myimage` |

### **Network Management**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker network ls` | List networks | `docker network ls` |
| `docker network create` | Create network | `docker network create mynet` |
| `docker network rm` | Remove network | `docker network rm mynet` |
| `docker network connect` | Connect container to network | `docker network connect mynet myapp` |
| `docker network disconnect` | Disconnect container from network | `docker network disconnect mynet myapp` |
| `docker network inspect` | Inspect network | `docker network inspect mynet` |
| `docker network prune` | Remove unused networks | `docker network prune` |

### **Volume Management**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker volume ls` | List volumes | `docker volume ls` |
| `docker volume create` | Create volume | `docker volume create mydata` |
| `docker volume rm` | Remove volume | `docker volume rm mydata` |
| `docker volume inspect` | Inspect volume | `docker volume inspect mydata` |
| `docker volume prune` | Remove unused volumes | `docker volume prune` |

### **System & Info**
| Command | Purpose | Example |
|---------|---------|---------|
| `docker version` | Show Docker version | `docker version` |
| `docker info` | Show Docker system info | `docker info` |
| `docker system df` | Show disk usage | `docker system df` |
| `docker system prune` | Clean up unused data | `docker system prune -a` |
| `docker events` | Get real-time events | `docker events` |
| `docker login` | Log in to registry | `docker login` |
| `docker logout` | Log out from registry | `docker logout` |
| `docker search` | Search Docker Hub | `docker search nginx` |

---

## **DOCKER RUN OPTIONS**

| Option | Purpose | Example |
|--------|---------|---------|
| `-d` | Run in detached mode | `docker run -d nginx` |
| `-it` | Interactive mode with TTY | `docker run -it ubuntu bash` |
| `--name` | Assign container name | `docker run --name myapp nginx` |
| `-p` | Publish port | `docker run -p 80:80 nginx` |
| `-v` | Mount volume | `docker run -v /data:/app/data nginx` |
| `-e` | Set environment variable | `docker run -e PORT=3000 nginx` |
| `--env-file` | Set env variables from file | `docker run --env-file .env nginx` |
| `--network` | Connect to network | `docker run --network mynet nginx` |
| `--link` | Link to another container | `docker run --link db:mysql nginx` |
| `--rm` | Remove container after exit | `docker run --rm alpine echo "hello"` |
| `-w` | Set working directory | `docker run -w /app nginx` |
| `-u` | Set username/UID | `docker run -u 1000 nginx` |
| `--memory` | Memory limit | `docker run --memory=512m nginx` |
| `--cpus` | CPU limit | `docker run --cpus=1.5 nginx` |
| `--restart` | Restart policy | `docker run --restart=always nginx` |
| `--health-cmd` | Health check command | `docker run --health-cmd="curl localhost" nginx` |
| `--entrypoint` | Override entrypoint | `docker run --entrypoint bash nginx` |
| `--read-only` | Mount root filesystem as read-only | `docker run --read-only nginx` |
| `--security-opt` | Security options | `docker run --security-opt seccomp=unconfined nginx` |

---

## **DOCKER COMPOSE COMMANDS**

| Command | Purpose | Example |
|---------|---------|---------|
| `docker-compose up` | Start all services | `docker-compose up` |
| `docker-compose down` | Stop and remove all services | `docker-compose down` |
| `docker-compose start` | Start services | `docker-compose start` |
| `docker-compose stop` | Stop services | `docker-compose stop` |
| `docker-compose restart` | Restart services | `docker-compose restart` |
| `docker-compose ps` | List services | `docker-compose ps` |
| `docker-compose logs` | View logs | `docker-compose logs` |
| `docker-compose build` | Build images | `docker-compose build` |
| `docker-compose exec` | Execute command in service | `docker-compose exec web bash` |
| `docker-compose pull` | Pull service images | `docker-compose pull` |
| `docker-compose push` | Push service images | `docker-compose push` |
| `docker-compose config` | Validate and view config | `docker-compose config` |
| `docker-compose scale` | Scale services | `docker-compose scale web=3` |
| `docker-compose top` | Display running processes | `docker-compose top` |
| `docker-compose run` | Run one-off command | `docker-compose run web python manage.py migrate` |

---

## **QUICK REFERENCE - COMMON TASKS**

### **Development Workflow**
```bash
# Build image
docker build -t myapp .

# Run container
docker run -p 3000:3000 myapp

# Run with volume for hot reload
docker run -p 3000:3000 -v $(pwd):/app myapp

# Go inside container
docker exec -it myapp bash

# View logs
docker logs -f myapp

# Stop container
docker stop myapp

# Remove container
docker rm myapp

# Remove image
docker rmi myapp
```

### **Production Deployment**
```bash
# Tag for registry
docker tag myapp myrepo/myapp:1.0

# Push to registry
docker push myrepo/myapp:1.0

# Pull on server
docker pull myrepo/myapp:1.0

# Run with restart policy
docker run -d --name myapp --restart=always -p 80:80 myrepo/myapp:1.0

# Set resource limits
docker run -d --memory=512m --cpus=1.0 myapp
```

### **Cleanup Tasks**
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything
docker system prune -a
```

---

## **NETWORK TYPES**

| Type | Command | Purpose |
|------|---------|---------|
| **bridge** | `--network bridge` | Default network, containers can communicate |
| **host** | `--network host` | Shares host's network namespace |
| **none** | `--network none` | No networking |
| **overlay** | `--network overlay` | Multi-host networking |
| **macvlan** | `--network macvlan` | Assigns MAC address to container |

---

## **RESTART POLICIES**

| Policy | Command | Behavior |
|--------|---------|----------|
| **no** | `--restart=no` | No restart (default) |
| **on-failure** | `--restart=on-failure` | Restart on failure |
| **always** | `--restart=always` | Always restart |
| **unless-stopped** | `--restart=unless-stopped` | Always restart unless explicitly stopped |

---

## **LOG DRIVERS**

| Driver | Command | Purpose |
|--------|---------|---------|
| **json-file** | `--log-driver=json-file` | Default, logs to JSON file |
| **journald** | `--log-driver=journald` | Logs to systemd journal |
| **syslog** | `--log-driver=syslog` | Logs to syslog |
| **none** | `--log-driver=none` | No logs |

---

## **VOLUME TYPES**

| Type | Example | Purpose |
|------|---------|---------|
| **Named Volume** | `-v mydata:/app/data` | Docker-managed storage |
| **Bind Mount** | `-v /host/path:/container/path` | Mount host directory |
| **tmpfs Mount** | `--tmpfs /tmp` | In-memory storage |
| **Anonymous Volume** | `-v /app/data` | Auto-named volume |

---

## **HEALTHCHECK OPTIONS**

| Option | Purpose | Example |
|--------|---------|---------|
| `--interval` | Time between checks | `--interval=30s` |
| `--timeout` | Timeout for check | `--timeout=3s` |
| `--start-period` | Startup time | `--start-period=5s` |
| `--retries` | Consecutive failures | `--retries=3` |

---

## **SECURITY OPTIONS**

| Option | Purpose | Example |
|--------|---------|---------|
| `--cap-add` | Add Linux capability | `--cap-add=NET_ADMIN` |
| `--cap-drop` | Drop Linux capability | `--cap-drop=ALL` |
| `--security-opt` | Security options | `--security-opt=seccomp=unconfined` |
| `--read-only` | Read-only root filesystem | `--read-only` |
| `--user` | Run as specific user | `--user=1000` |

---

## **QUICK TROUBLESHOOTING**

| Problem | Command to Fix |
|---------|---------------|
| Container won't start | `docker logs container-name` |
| Can't access port | `docker port container-name` |
| Out of disk space | `docker system prune -a` |
| Can't remove image | `docker rmi -f image-name` |
| Can't remove container | `docker rm -f container-name` |
| Permission denied | Add `--privileged` or fix permissions |
| Network issues | `docker network inspect network-name` |

---

## **SHORTCUTS & ALIASES**

```bash
# Add to ~/.bashrc for convenience
alias dps='docker ps'
alias dpa='docker ps -a'
alias dim='docker images'
alias drm='docker rm'
alias drmi='docker rmi'
alias dstop='docker stop'
alias dstart='docker start'
alias dlogs='docker logs'
alias dexec='docker exec -it'
alias dcup='docker-compose up'
alias dcdown='docker-compose down'
```

---

## **DOCKERFILE BEST PRACTICES**

1. **Use specific tags**: `FROM node:16-alpine` not `FROM node`
2. **Combine RUN commands**: Reduce layers
3. **Use .dockerignore**: Exclude unnecessary files
4. **Order matters**: Put frequently changing steps last
5. **Use multi-stage builds**: Keep final image small
6. **Run as non-root**: `USER appuser`
7. **Clean up in same RUN**: `apt update && apt install && apt clean`
8. **Use HEALTHCHECK**: Monitor container health
9. **One process per container**: Follow single responsibility
10. **Use COPY over ADD**: Unless you need ADD's special features

---

## **PORT MAPPING FORMATS**

| Format | Example | Meaning |
|--------|---------|---------|
| `-p 80:80` | `-p 80:80` | Host port 80 → Container port 80 |
| `-p 8080:80` | `-p 8080:80` | Host port 8080 → Container port 80 |
| `-p 80` | `-p 80` | Random host port → Container port 80 |
| `-p 127.0.0.1:80:80` | `-p 127.0.0.1:80:80` | Only localhost can access |

---

**Save this cheat sheet! Print it, bookmark it, or keep it handy!** 📚✨