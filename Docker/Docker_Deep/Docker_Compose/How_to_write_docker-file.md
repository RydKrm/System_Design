# Writing a Production-Grade Dockerfile for a Go Project with Kafka, gRPC, and WebSocket

_A senior engineer's walkthrough for someone who just joined the team._

---

## Before We Write a Single Line

When you join a team and you are asked to "dockerize" a service, the most common mistake a new engineer makes is to just google a Dockerfile and copy it without understanding what each line actually does. That will haunt you later — because when something breaks at 2am in production, you need to know exactly what is inside that container and why it was built that way.

So let us slow down and do this properly. Think of a Dockerfile not as a configuration file, but as a _recipe_. You are describing, step by step, how to build a self-contained, portable version of your application. Docker reads that recipe, executes each step in order, and at the end produces an image — a snapshot of everything your app needs to run, bundled into one artifact.

Now, our Go service is not simple. It talks to Kafka (which means it needs network connectivity and possibly some C libraries depending on the Kafka client you chose), it exposes a gRPC server (which means it listens on a TCP port and speaks HTTP/2), and it runs a WebSocket server (which means it keeps long-lived TCP connections open and upgrades them from HTTP). None of that changes the Dockerfile dramatically, but understanding what each of these protocols needs will help you make the right decisions.

---

## Understanding Multi-Stage Builds — The Most Important Concept Here

Before we look at a single line of Dockerfile syntax, you need to understand the idea behind multi-stage builds, because it is the most important architectural decision in a production Dockerfile.

Imagine you are baking a cake. You use a big industrial kitchen — full of mixers, ovens, cooling racks, measuring tools, and bags of ingredients. But when the cake is done, you do not deliver the whole kitchen to the customer. You put the cake in a small box and deliver just that.

That is exactly what multi-stage builds do.

In stage one — the **build stage** — we set up a full Go development environment. We install all the tools the compiler needs, copy our source code in, and run `go build`. This produces a single binary file. At this point the stage has done its job.

In stage two — the **runtime stage** — we start completely fresh. We take a tiny base image that has almost nothing in it, and we _copy only the compiled binary_ from stage one. No source code. No compiler. No build tools. No leftover temporary files. Just the binary and whatever it actually needs to run.

The result is a final image that is dramatically smaller than if we had done everything in one stage. Smaller images pull faster, start faster, have a smaller attack surface for security vulnerabilities, and cost less to store. A Go binary built for Linux typically needs nothing more than a minimal OS layer to run — sometimes not even that.

---

## Choosing the Right Base Images

The first line of each stage in a Dockerfile is `FROM`, and it tells Docker which base image to start from. Choosing the wrong base image is one of the most common beginner mistakes.

For the **build stage**, we use `golang:1.22-alpine`. Let us break this down. `golang` is the official Go image maintained by the Go team. `1.22` is the Go version — always pin to a specific version, never use `latest`, because `latest` changes over time and your builds will stop being reproducible. `alpine` means this image is based on Alpine Linux, which is a very lightweight Linux distribution. It gives us a small starting point even for the build stage.

For the **runtime stage**, we have two good choices depending on your Kafka client.

If you are using **`segmentio/kafka-go`** or **`twmb/franz-go`** (pure Go Kafka clients), then your compiled binary has no external C library dependencies. In this case you can use `scratch` — which is literally an empty image with absolutely nothing in it — or `gcr.io/distroless/static-debian12`, which is also nearly empty but includes some minimal Linux infrastructure that makes debugging slightly easier. Your binary runs directly on the kernel with no OS userland around it. This is as lean as it gets.

If you are using **`confluent-kafka-go`**, the situation is different. That library wraps `librdkafka`, which is a C library. A C library is compiled native code that your Go binary will try to load at runtime using something called CGO (Go's C interop layer). If the C library is not present in the runtime container, your binary will crash immediately when it starts. In this case you must use `alpine:3.19` or `debian:bookworm-slim` as your runtime base image, and you must explicitly install `librdkafka` into it.

For gRPC and WebSocket, there are no external C library concerns if you are using the standard Go gRPC stack (`google.golang.org/grpc`) and a pure-Go WebSocket library like `gorilla/websocket` or `nhooyr.io/websocket`. These are all pure Go and compile directly into your binary.

---

## The Complete Dockerfile — Walking Through Every Line

Below is the complete Dockerfile. We will go through it section by section so that you understand not just what each line says, but _why_ it is written that way.

```dockerfile
# ============================================================
# STAGE 1 — BUILD STAGE
# ============================================================
FROM golang:1.22-alpine AS builder
```

The `AS builder` part gives this stage a name. We will reference this name later when we want to copy files out of it. You can name it anything — `builder`, `compile`, `build-env` — but `builder` is the convention the whole industry uses, so stick with it.

```dockerfile
# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    gcc \
    musl-dev
```

`apk` is Alpine's package manager (like `apt` on Ubuntu or `yum` on CentOS). `add` installs packages. `--no-cache` tells apk not to store the package index locally after installing — this keeps the image layer smaller.

Now why do we need these specific packages? `git` is needed because `go get` and `go mod download` sometimes fetch dependencies directly from Git repositories. `ca-certificates` contains the root SSL/TLS certificates that your binary needs to make HTTPS connections — without this, your gRPC calls to external services will fail with certificate errors. `tzdata` contains timezone data; if your service ever formats timestamps in a specific timezone (many services do for logging or scheduling), without this file the Go `time` package will panic. `gcc` and `musl-dev` are C compiler tools. Alpine uses `musl libc` instead of the standard `glibc`, so if any of your code uses CGO (directly or through a dependency), you need these to compile successfully.

```dockerfile
# Set the working directory inside the container
WORKDIR /app
```

`WORKDIR` sets the directory that all subsequent commands will run inside. If the directory does not exist, Docker creates it. Think of it like running `cd /app` before every command — except it also affects the `COPY` destination if you use relative paths. Using `/app` is a common convention, but some teams use `/srv` or `/opt/service-name`. The important thing is to be consistent.

```dockerfile
# Copy dependency files first — before copying source code
COPY go.mod go.sum ./
```

This is one of the most important performance optimisations in a Dockerfile and it is worth understanding deeply. Docker builds images in layers. Each instruction (`FROM`, `RUN`, `COPY`, etc.) creates a new layer. Docker caches these layers, and if a layer has not changed since the last build, Docker reuses the cached version instead of re-running the instruction.

The dependency files (`go.mod` and `go.sum`) change far less often than your source code. If you copy them first and download dependencies in a separate step, then on subsequent builds — where you only changed your Go source files — Docker will reuse the cached layer where dependencies were downloaded. This can turn a 3-minute build into a 20-second build. If instead you copied everything at once and then ran `go mod download`, every single source code change would invalidate the dependency download cache, and you would re-download all your modules every time.

```dockerfile
# Download all dependencies
RUN go mod download
```

This fetches all the modules listed in your `go.mod` from their respective sources (GitHub, pkg.go.dev, etc.) and stores them in the module cache at `/root/go/pkg/mod`. After this point, the `go build` step does not need network access — everything is local.

```dockerfile
# Now copy the entire source code
COPY . .
```

Now we copy everything else — all your `.go` files, your `proto` files, your configuration files, anything that is in the build context. The `.dockerignore` file (which we will talk about shortly) controls what gets excluded from this copy.

```dockerfile
# Build the Go binary
RUN CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/server \
    ./cmd/server
```

This is the heart of the build stage. Let us go through each environment variable and flag.

`CGO_ENABLED=0` disables CGO entirely. When CGO is disabled, Go compiles everything into a single statically-linked binary — meaning the binary has no dependencies on any external `.so` files. This is what allows us to run the binary in a minimal container like `scratch`. If you are using `confluent-kafka-go`, you _cannot_ set this to 0, because that library fundamentally requires CGO. For pure-Go Kafka clients, always set it to 0.

`GOOS=linux` tells the Go compiler to produce a binary for Linux, even if you are building on a Mac or Windows machine. This is called cross-compilation and Go does it seamlessly. Since our container will run on Linux, this is always correct.

`GOARCH=amd64` tells the compiler to target the x86-64 architecture. If you are deploying to ARM-based machines (like AWS Graviton or Apple Silicon), you would change this to `arm64`.

`-ldflags="-w -s"` are linker flags. `-w` removes the DWARF debugging information. `-s` removes the symbol table. Together these two flags can reduce the binary size by 20-30%. You lose the ability to use `go pprof` with full debug info, but for most production services that is an acceptable trade-off. If you need profiling, you can add it back.

`-extldflags '-static'` tells the C linker (if it is involved at all) to produce a statically-linked binary. Combined with `CGO_ENABLED=0`, this is belt-and-suspenders — belt means no CGO, suspenders means even if CGO sneaks in somehow, we want everything linked statically.

`-o /app/server` specifies where the compiled binary should be written. We are putting it at `/app/server`.

`./cmd/server` is the build target — the package that contains your `main()` function. The convention in Go projects is to put each binary's main package under `cmd/<binary-name>/`. Adjust this to match your project structure.

---

```dockerfile
# ============================================================
# STAGE 2 — RUNTIME STAGE (for pure-Go Kafka clients)
# ============================================================
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
```

We start completely fresh here. `distroless/static-debian12` is a Google-maintained image that contains almost nothing — just enough to run a statically-compiled binary on Debian. It has no shell, no package manager, no `ls`, no `cat`. This is a security feature, not a limitation. If an attacker somehow gets code execution inside your container, they have nothing to work with.

The `:nonroot` tag means the default user in this image is not root. Running as a non-root user is a security best practice — if the process somehow escapes the container, it has limited privileges on the host.

```dockerfile
# Copy timezone data from the builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
```

`--from=builder` is the magic syntax that pulls files from a previous stage. Here we are copying the timezone data we installed in stage 1 into our runtime image. Without this, Go's `time.LoadLocation()` will fail at runtime.

```dockerfile
# Copy SSL certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
```

Same idea — we copy the SSL certificates. Our gRPC service needs these to establish TLS connections to other services, and our Kafka client needs them if it is connecting to a Kafka cluster with TLS enabled (which it should be in production).

```dockerfile
# Copy the compiled binary
COPY --from=builder /app/server /server
```

This is the main event. We copy the compiled Go binary from the builder stage into the root of our runtime image. The binary goes from `/app/server` in the builder to `/server` in the runtime image.

```dockerfile
# Expose the ports your service uses
EXPOSE 8080
EXPOSE 50051
EXPOSE 9090
```

`EXPOSE` is documentation. It does not actually publish ports or configure any networking — it just tells anyone reading the Dockerfile "hey, this container listens on these ports." Port 8080 here is for HTTP/WebSocket traffic, 50051 is the standard gRPC port, and 9090 is a common choice for metrics (Prometheus). When you run the container with `docker run`, you will still need `-p 8080:8080` to actually publish the ports.

```dockerfile
# Drop to non-root user
USER nonroot:nonroot
```

Explicitly set the user. Even though our `distroless/nonroot` image defaults to non-root, being explicit here makes the intent clear and ensures no parent image change can accidentally run us as root.

```dockerfile
# Set the entrypoint
ENTRYPOINT ["/server"]
```

`ENTRYPOINT` defines the executable that runs when the container starts. We use the array form (sometimes called "exec form") — `["/server"]` — rather than the string form `"/server"`. The difference matters. The string form runs your command inside a shell (`/bin/sh -c "/server"`), which means your process is a child of the shell, and signals like `SIGTERM` sent by Docker during shutdown may not reach your process correctly. The exec form runs your binary directly as PID 1, so signals are delivered straight to it. This is critical for graceful shutdown — your Go code's `signal.NotifyContext` or `os.Signal` handling will only work correctly if your process is PID 1 or signal forwarding is set up properly.

---

## The Variant for confluent-kafka-go (CGO-dependent builds)

If your project uses `confluent-kafka-go`, the build stage needs some adjustments, and the runtime stage cannot be `distroless`. Here is what changes:

```dockerfile
# STAGE 1 — BUILD (CGO variant)
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    gcc \
    musl-dev \
    librdkafka-dev \
    pkgconf

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# CGO must be enabled; do NOT use -static here
RUN CGO_ENABLED=1 \
    GOOS=linux \
    GOARCH=amd64 \
    go build \
    -ldflags="-w -s" \
    -tags musl \
    -o /app/server \
    ./cmd/server

# STAGE 2 — RUNTIME (CGO variant)
FROM alpine:3.19 AS runtime

RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    librdkafka

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /app/server /app/server

EXPOSE 8080
EXPOSE 50051

USER appuser:appgroup
ENTRYPOINT ["/app/server"]
```

The key differences here are: `CGO_ENABLED=1`, the addition of `-tags musl` (which tells the confluent library to use Alpine's musl libc instead of glibc), the installation of `librdkafka-dev` in the build stage, and the installation of `librdkafka` in the runtime stage. The runtime image is now `alpine:3.19` because we need a package manager to install `librdkafka`, and we manually create a non-root user with `addgroup` and `adduser` since Alpine does not have a built-in non-root user.

---

## The .dockerignore File — Do Not Skip This

Your Dockerfile is only as good as your `.dockerignore` file. When you write `COPY . .`, Docker sends your entire build context (the directory you run `docker build` from) to the Docker daemon. Without a `.dockerignore`, this includes your `vendor` directory if you have one, your local binary outputs, your `.git` directory with full history, your test fixtures, your `.env` files with secrets, and anything else sitting in your project root.

Create a `.dockerignore` file at the root of your project with at least this content:

```
# Version control
.git
.gitignore

# Go build artifacts
*.exe
*.test
server
bin/

# Development config (never put secrets in the image)
.env
.env.*
*.local

# IDE files
.vscode
.idea
*.swp

# Test output
coverage.out
*.coverprofile

# Documentation that doesn't need to be in the image
docs/
README.md
```

This file follows the same syntax as `.gitignore`. Getting this right means your build context is small and your `COPY . .` layer is not bloated with things that have nothing to do with your application.

---

## What About gRPC Specifically?

You might be wondering — does gRPC need any special treatment in the Dockerfile? The short answer is no, with one consideration.

gRPC in Go uses the `google.golang.org/grpc` package, which is pure Go. The only thing gRPC needs at build time is your `.proto` files compiled to Go code using `protoc` and the `protoc-gen-go` and `protoc-gen-go-grpc` plugins. This compilation step should happen _on your development machine_ or in a CI pipeline _before_ the Dockerfile is involved. The generated `*.pb.go` and `*_grpc.pb.go` files should be committed to your repository alongside your other Go source files. Your Dockerfile then just compiles that already-generated Go code. There is no need to install `protoc` inside the Docker builder stage.

If your team prefers to generate proto files as part of the Docker build (some do, for reproducibility), you would add a stage before the build stage that installs `protoc` and the plugins and runs the generation. But most teams do not do this because it adds complexity and slows down builds.

For gRPC TLS in production — where your server and clients authenticate each other with certificates — you would mount certificates into the container at runtime using Docker secrets or Kubernetes secrets. You never bake TLS certificates into the image itself.

---

## What About WebSocket Specifically?

WebSocket also needs no special Dockerfile treatment. A WebSocket connection starts as a plain HTTP/1.1 request and then upgrades to the WebSocket protocol. Your Go binary handles this entirely in userspace. The only thing you need to ensure is that the port your WebSocket server listens on is exposed and published. If your WebSocket server runs on port 8080, make sure `EXPOSE 8080` is in your Dockerfile and `-p 8080:8080` is in your `docker run` command or your `docker-compose.yml`.

One thing worth knowing: if you put an Nginx or Traefik reverse proxy in front of your container (which is common in production), you need to make sure the proxy is configured to pass the `Upgrade` and `Connection` headers through to your Go service. But that is a proxy configuration concern, not a Dockerfile concern.

---

## Building and Running the Image

Once you have the Dockerfile and `.dockerignore` in place, building the image looks like this:

```bash
docker build \
  --target runtime \
  -t my-service:local \
  -f Dockerfile \
  .
```

`--target runtime` tells Docker to stop at the `runtime` stage. This is optional — Docker will build through all stages by default — but naming the target explicitly makes the intent clear.

`-t my-service:local` tags the resulting image. In a real CI/CD pipeline, you would tag it with a Git SHA or a semantic version number, like `-t my-service:v1.4.2` or `-t my-service:abc1234`.

`-f Dockerfile` specifies the Dockerfile to use. If it is named `Dockerfile` and is in the current directory, this flag is optional, but being explicit is a good habit.

The final `.` is the build context — the directory whose contents are available to the `COPY` instructions. Almost always this is your project root.

To run the container locally:

```bash
docker run \
  --rm \
  -p 8080:8080 \
  -p 50051:50051 \
  -e KAFKA_BROKERS=kafka:9092 \
  -e GRPC_PORT=50051 \
  my-service:local
```

`--rm` means Docker will automatically remove the container when it stops. Good for local development. In production you do not use this.

`-e` sets environment variables. Your Go service should read all configuration (Kafka broker addresses, gRPC port, database URLs) from environment variables, not from files baked into the image. This is the Twelve-Factor App principle — configuration that changes between environments should never be inside the image.

---

## The Full Production Dockerfile

Putting everything together cleanly:

```dockerfile
# ============================================================
# STAGE 1 — BUILDER
# ============================================================
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    gcc \
    musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/server \
    ./cmd/server

# ============================================================
# STAGE 2 — RUNTIME
# ============================================================
FROM gcr.io/distroless/static-debian12:nonroot AS runtime

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

EXPOSE 8080
EXPOSE 50051

USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

This Dockerfile is small, fast to build (after the first run), produces a minimal image, and handles everything your Kafka, gRPC, and WebSocket service needs.

---

## Common Questions You Will Have

**"Why do I get `no such file or directory` when the container starts?"** This almost always means your binary is not statically linked and is trying to load a shared library that does not exist in the runtime image. Run `ldd /app/server` inside the builder stage to see what libraries the binary depends on. If you see anything other than `statically linked`, you either need to enable the shared library in the runtime image or fix your build to be truly static.

**"Why is my build so slow the first time but fast after?"** The first build has no cache. After that, if you only change Go source files, Docker reuses the `go mod download` layer and only rebuilds from the `COPY . .` instruction onward. The compilation itself is the expensive step, but subsequent builds save the module download time.

**"My container can connect to Kafka locally but not in the staging environment."** This is almost never a Dockerfile issue. Kafka has a concept of advertised listeners — when a client connects to Kafka, the broker tells the client its own address so the client can reconnect. If that advertised address is `localhost` or an internal Docker network address, external clients cannot reach it. This is a Kafka configuration concern, but it manifests as a connection failure in your Go service.

**"Should I run multiple services in one container?"** No. One process per container is the Docker philosophy. If you have a gRPC service and a separate metrics exporter or a WebSocket gateway and a gRPC backend, each should be its own container with its own Dockerfile. They communicate over the Docker network.

---

## Final Thought

A Dockerfile is a contract. It says: "here is exactly what my service is, exactly what it needs, and exactly how to build it, reproducibly, on any machine in the world." When you write it carefully — with the right base images, with multi-stage builds, with a proper `.dockerignore`, with your binary compiled statically — you are doing a favour to every engineer who will ever deploy, debug, or maintain this service. That includes future you, who will have forgotten all of this six months from now when something goes wrong at 2am. Write it so clearly that the Dockerfile itself tells the story.