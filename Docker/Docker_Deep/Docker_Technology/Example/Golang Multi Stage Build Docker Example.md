# Understanding a Multi-Stage Dockerfile for a Go Service

## The Big Idea Before We Touch a Single Line

Before walking through this file line by line, it is worth pausing on the philosophy behind it, because once that philosophy clicks, every individual instruction will feel obvious rather than arbitrary. This Dockerfile uses a technique called a **multi-stage build**. The core problem it solves is this: compiling a Go program requires a heavyweight toolchain — the Go compiler itself, system libraries, sometimes a C compiler for cgo bindings, and various build utilities. None of that machinery is needed once the program has actually been compiled into a binary. A compiled Go binary is, for the most part, a single self-contained executable. So if you were to ship the same image that you used to build the program, you would be carrying around gigabytes of compiler tooling into production for absolutely no reason, the way a chef might ship the entire kitchen along with a finished dish. Multi-stage builds solve this by letting you use one throwaway image to do the heavy lifting of compilation, and then a second, much leaner image that only contains the finished binary and the bare minimum needed to run it. Docker discards the first stage entirely once the build finishes copying out what it needs, so the final image you actually deploy never carries the weight of the builder.

## Stage One: The Builder

The file begins with `FROM golang:1.21-alpine AS builder`. This line does two things worth noticing separately. First, it pulls the official Go image based on Alpine Linux, which is a minimal Linux distribution prized for being small in size compared to something like Ubuntu or Debian — this keeps even the builder stage reasonably lean, though as we will see, size barely matters here since this stage gets thrown away anyway. Second, and more importantly, the `AS builder` part gives this stage a name. Naming a stage is what makes multi-stage builds possible at all, because later in the file we will reference this name to reach back and grab files from it.

Next comes `RUN apk add --no-cache git gcc musl-dev`. Here, `apk` is Alpine's package manager, analogous to `apt` on Debian-based systems. We install `git` because Go's module system sometimes needs to fetch dependencies directly from version control repositories rather than a binary cache, `gcc` because certain Go packages rely on cgo, which means parts of them are actually written in C and need a C compiler to build, and `musl-dev` because Alpine uses the musl C library instead of the more common glibc, so any cgo code needs musl's development headers to compile against. The `--no-cache` flag tells Alpine not to keep the package index lying around afterward, which trims a small amount of fat from this layer.

`WORKDIR /app` simply sets the working directory inside the image to `/app`, meaning every subsequent instruction that touches the filesystem will do so relative to this folder, much like running `cd /app` once and then never worrying about paths again.

The next two lines deserve special attention because they reflect a deliberate ordering trick rather than accident: `COPY go.mod go.sum ./` followed by `RUN go mod download`, and only afterward `COPY . .`. Docker builds images in layers, and it caches each layer based on whether its inputs have changed. Your Go module files — `go.mod` and `go.sum` — change far less often than your actual source code does. By copying only those two files first and running `go mod download` before copying the rest of the source, Docker can reuse the cached dependency-download layer on every subsequent build as long as your dependencies themselves have not changed, even if you have just edited a hundred lines of business logic. If the source code were copied in before the dependency download, then every single code change would invalidate the cache and force Docker to re-download every dependency from scratch on every build, which is wasteful and slow. This pattern, copy manifests first and source second, is one of the small but meaningful habits that separates a Dockerfile written with intention from one written carelessly.

Then `COPY . .` brings in the rest of the project's source code, and finally the actual compilation happens: `RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o main .` This single line is dense, so it is worth unpacking each flag on its own terms. Setting `CGO_ENABLED=0` disables cgo entirely, which forces Go to produce a statically linked binary that does not depend on any external C libraries at runtime — this matters enormously for the next stage, because the runtime image will not have the C libraries that a cgo-enabled binary might expect to find. `GOOS=linux` explicitly targets Linux as the operating system for the compiled binary, which is a sensible safeguard regardless of what platform you are building on, since the image will run on Linux containers no matter what. The `-a` flag forces a full rebuild of all packages rather than relying on Go's own build cache, which sacrifices a bit of build speed for a guarantee of consistency. The `-installsuffix cgo` flag is a naming convention that avoids ambiguity between cgo and non-cgo build artifacts, which becomes relevant given that cgo is disabled. The `-ldflags="-w -s"` portion strips debugging information and the symbol table from the binary, which shrinks its size since none of that debugging metadata is needed in production. And finally, `-o main .` simply names the output binary `main` and builds the current directory's package.

## Stage Two: The Runtime Image

With `FROM alpine:latest`, the Dockerfile starts an entirely fresh image, severed from everything in the builder stage except what we explicitly choose to carry over. This is the moment where the earlier philosophy pays off: this image never had the Go compiler installed in it, never had `gcc` or `git`, and carries none of the intermediate build artifacts. It begins life as nothing more than a minimal Linux base.

`RUN apk --no-cache add ca-certificates tzdata` installs two small but important packages. `ca-certificates` provides the root certificates needed for the binary to make outbound HTTPS calls and verify TLS connections — without this, any HTTP client inside your Go program attempting to reach an external HTTPS service would fail with certificate verification errors, since Alpine's minimal base does not ship trusted root certificates by default. `tzdata` provides timezone database information, which matters if your application does any timezone-aware date or time handling, since Go's time package relies on the operating system's timezone data unless it is compiled in directly.

`WORKDIR /root/` sets up the working directory for this stage, conventionally placed in root's home directory for a minimal image like this, though in more security-conscious setups you would often create a dedicated non-root user instead — something worth keeping in mind as you mature this Dockerfile further.

Now the multi-stage build's payoff arrives: `COPY --from=builder /app/main .` This instruction reaches back into the named `builder` stage, grabs the compiled binary sitting at `/app/main`, and copies it into the current working directory of this fresh runtime image. Everything else from the builder — the Go toolchain, the source code, the intermediate object files — simply never makes it into this image at all. The very next line, `COPY --from=builder /app/.env.example .env.example`, does the same thing for an example environment file, presumably so the running container has a template of expected configuration variables available, though note this only copies the example file and not actual secrets, which is the correct instinct since secrets should never be baked into an image layer.

`RUN mkdir -p ./uploads` creates an uploads directory inside the container, presumably because the application writes uploaded files somewhere on its local filesystem at runtime. It is worth flagging, as a senior engineer would to a junior one, that this directory lives inside the container's own filesystem, which is ephemeral — anything written there will vanish the moment the container is destroyed unless a volume is mounted onto that path, so this line alone does not give you durable file storage.

`EXPOSE 9020` is mostly a documentation instruction. It does not actually open the port to the outside world; that happens separately when you run the container with a `-p` flag or configure port mappings in something like Docker Compose or Kubernetes. What `EXPOSE` does do is signal intent to anyone reading the Dockerfile, and certain orchestration tools do read this metadata to make sensible default choices.

The `HEALTHCHECK` instruction tells Docker how to periodically verify that the running container is actually healthy rather than merely alive. The `--interval=30s` means Docker checks every thirty seconds, `--timeout=3s` means each individual check attempt must complete within three seconds or it is considered a failure, `--start-period=5s` gives the application five seconds of grace after starting before failed checks start counting against it, accounting for the application's own startup time, and `--retries=3` means the container is only marked unhealthy after three consecutive failures, which avoids over-reacting to a single transient blip. The actual check itself, `wget --no-verbose --tries=1 --spider http://localhost:9020/health`, makes a lightweight HTTP request to a `/health` endpoint that the Go application is expected to expose, using `--spider` so that `wget` only checks that the response exists without actually downloading or printing the body.

Finally, `CMD ["./main"]` specifies the default command that runs when a container starts from this image — simply executing the compiled binary we copied in earlier. This is written in what is called exec form, using a JSON array rather than a plain shell string, which is the generally preferred style because it runs the binary directly as the container's main process rather than wrapping it inside an intermediate shell process, giving cleaner signal handling for things like graceful shutdowns.

## Seeing Both Stages Side by Side

```
┌─────────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│         STAGE 1: "builder"              │    │         STAGE 2: runtime image          │
│      FROM golang:1.21-alpine            │    │           FROM alpine:latest            │
│                                         │    │                                         │
│  ┌─────────────────────────────────┐    │    │  ┌─────────────────────────────────┐    │
│  │ apk add git gcc musl-dev        │    │    │  │ apk add ca-certificates tzdata  │    │
│  └─────────────────────────────────┘    │    │  └─────────────────────────────────┘    │
│                  │                      │    │                  │                      │
│                  ▼                      │    │                  ▼                      │
│  ┌─────────────────────────────────┐    │    │  ┌─────────────────────────────────┐    │
│  │ COPY go.mod go.sum ./           │    │    │  │ WORKDIR /root/                  │    │
│  │ RUN  go mod download            │    │    │  └─────────────────────────────────┘    │
│  │   (cached unless deps change)   │    │    │                  │                      │
│  └─────────────────────────────────┘    │    │                  ▼                      │
│                  │                      │    │  ┌─────────────────────────────────┐    │
│                  ▼                      │    │  │ COPY --from=builder             │    │
│  ┌─────────────────────────────────┐    │    │  │   /app/main           ──────────┼────┼──┐
│  │ COPY . .                        │    │    │  │   /app/.env.example   ──────────┼────┼──┤
│  │ RUN go build → ./main           │────┼────┼─▶│                                 │    │
│  └─────────────────────────────────┘    │    │  └─────────────────────────────────┘    │
│                                         │    │                  │                      │
│   Contains: compiler, source code,      │    │                  ▼                      │
│   build cache, git, gcc, dev headers    │    │  ┌─────────────────────────────────┐    │
│   (heavy — but never shipped)           │    │  │ mkdir uploads/                  │    │
│                                         │    │  │ EXPOSE 9020                     │    │
│                                         │    │  │ HEALTHCHECK /health             │    │
│                                         │    │  │ CMD ["./main"]                  │    │
│                                         │    │  └─────────────────────────────────┘    │
│                                         │    │                                         │
│   ░░░ discarded after build ░░░         │    │   Contains: only the binary + certs +   │
│                                         │    │   tzdata + uploads dir (lean image)     │
└─────────────────────────────────────────┘    └─────────────────────────────────────────┘
        builds in memory/disk,                          this is what actually gets
        never pushed or run                              pushed to a registry and
                                                           deployed to production
```

The arrow crossing from the builder stage into the runtime stage in the diagram above represents the only thing that survives the transition: the compiled binary and the example environment file, pulled across explicitly via `--from=builder`. Everything to the left of that arrow, the compiler, the package manager caches, the source tree, simply ceases to exist once the final image is assembled, which is precisely why a Go service built this way can often produce a final image in the range of fifteen to twenty megabytes, rather than the several-hundred-megabyte image you would get if you shipped the builder stage directly.

## A Few Things Worth Keeping in Mind as You Grow This Further

This Dockerfile is solid and reflects sound instincts, but a few refinements are worth filing away for later. Running the final container as root, which is the implicit default here since no `USER` instruction creates and switches to an unprivileged user, is a common shortcut that is worth tightening once security review becomes a concern, since a compromised process running as root inside a container has more leverage than one running as an ordinary user. Similarly, the `uploads` directory created inside the container will not persist across restarts or redeployments unless it is backed by a mounted volume or, better yet, replaced with object storage such as S3-compatible storage, since relying on a container's own writable layer for anything you care about keeping is a classic and easily avoided mistake.