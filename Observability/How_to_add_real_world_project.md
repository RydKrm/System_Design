# How to Add Production-Grade Observability to a Go Project

### A Complete Beginner's Guide — Step by Step, in Order

> You will add observability in 4 stages. Each stage is complete and useful on its own. Do not skip stages. Each one builds on the previous.

---

## What Is Observability? (In Plain English)

Imagine your Go service breaks in production at 2 AM. You get paged. You open your terminal. What do you look at?

If you have **no observability** → you SSH into the server and start guessing. If you have **observability** → you open a browser, type a query, and see exactly what broke, when, and why — in 5 minutes.

Observability is built from **three things**:

|Tool|Answers the question|Example|
|---|---|---|
|**Logs**|"What happened?"|`{"msg":"payment failed","user_id":42,"error":"card declined"}`|
|**Metrics**|"How often / how fast?"|`99th percentile latency = 2.3 seconds`|
|**Traces**|"Where did the time go?"|`checkout took 4s: payment-service was slow`|

---

## The Order You Must Follow

```
Stage 1: Logging    →  Stage 2: Metrics    →  Stage 3: Tracing    →  Stage 4: Dashboards
(Zap)                  (Prometheus)            (OpenTelemetry)         (Grafana + Loki)

Why this order:
- Logs give you immediate visibility with zero infrastructure
- Metrics tell you WHEN something went wrong (triggers your alert)
- Traces tell you WHERE time was wasted across services
- Dashboards make all three visible and correlated
```

Never start with dashboards. You have nothing to show yet. Never start with tracing. It is the hardest. Do logs first.

---

## Before You Start — Project Setup

Your project structure (we will fill each file in the stages below):

```
myapp/
├── main.go
├── go.mod
├── pkg/
│   ├── logger/
│   │   └── logger.go        ← Stage 1
│   ├── metrics/
│   │   └── metrics.go       ← Stage 2
│   └── tracer/
│       └── tracer.go        ← Stage 3
├── internal/
│   └── middleware/
│       └── middleware.go    ← Used in all stages
└── docker-compose.yml       ← Stage 4
```

Install all dependencies at once:

```bash
go get go.uber.org/zap@v1.27.0
go get github.com/prometheus/client_golang@v1.19.1
go get go.opentelemetry.io/otel@v1.28.0
go get go.opentelemetry.io/otel/sdk@v1.28.0
go get go.opentelemetry.io/otel/trace@v1.28.0
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc@v1.28.0
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp@v0.53.0
go get github.com/go-chi/chi/v5@v5.0.12
```

---

# STAGE 1 — Structured Logging with Zap

## What Is Structured Logging?

Normal logging (DO NOT do this in production):

```go
log.Printf("user %d logged in from %s", userID, ip)
// Output: user 42 logged in from 192.168.1.1
// Problem: this is just a string. You cannot filter by user_id.
// You cannot count how many logins happened. Machines cannot parse it.
```

Structured logging (DO this):

```go
logger.Info("User logged in",
    zap.Int64("user_id", 42),
    zap.String("ip", ip),
)
// Output: {"ts":"2024-01-15T02:47:13.241Z","level":"info","msg":"User logged in","user_id":42,"ip":"192.168.1.1"}
// Now you can filter by user_id=42, count logins per minute, build alerts.
```

The difference: every piece of data is a **named, typed field** — not embedded in a string.

---

## Step 1.1 — Create the Logger Package

```go
// pkg/logger/logger.go
package logger

import (
    "context"
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// We use an unexported type for context keys to prevent collisions
// with other packages storing things in context.
type contextKey struct{}

var loggerKey = contextKey{}

// Config holds everything the logger needs to start.
type Config struct {
    Level       string // "debug", "info", "warn", "error"
    Format      string // "json" for production, "console" for development
    ServiceName string // e.g. "payment-service"
    Version     string // e.g. "1.2.3"
    Environment string // "development", "staging", "production"
}

// New creates a ready-to-use Zap logger.
// It also returns an AtomicLevel — you can change the log level
// at runtime without restarting the service.
func New(cfg Config) (*zap.Logger, zap.AtomicLevel, error) {
    // AtomicLevel lets you change the level via HTTP without restarting.
    // Very useful in production when you need to temporarily enable DEBUG.
    atomicLevel := zap.NewAtomicLevel()
    if err := atomicLevel.UnmarshalText([]byte(cfg.Level)); err != nil {
        atomicLevel.SetLevel(zapcore.InfoLevel)
    }

    // EncoderConfig controls how each log field is formatted.
    encoderCfg := zapcore.EncoderConfig{
        TimeKey:        "ts",        // field name for timestamp
        LevelKey:       "level",     // field name for log level
        CallerKey:      "caller",    // field name for file:line
        MessageKey:     "msg",       // field name for the message
        StacktraceKey:  "stacktrace",
        LineEnding:     zapcore.DefaultLineEnding,
        EncodeLevel:    zapcore.LowercaseLevelEncoder,  // "info" not "INFO"
        EncodeTime:     zapcore.ISO8601TimeEncoder,      // "2024-01-15T02:47:13Z"
        EncodeDuration: zapcore.MillisDurationEncoder,  // milliseconds as a number
        EncodeCaller:   zapcore.ShortCallerEncoder,     // "handler/user.go:42"
    }

    var encoder zapcore.Encoder
    if cfg.Format == "console" {
        // Console format: human-readable with colours (for development)
        encoderCfg.EncodeLevel = zapcore.CapitalColorLevelEncoder
        encoder = zapcore.NewConsoleEncoder(encoderCfg)
    } else {
        // JSON format: machine-readable (for production)
        encoder = zapcore.NewJSONEncoder(encoderCfg)
    }

    // Core connects: encoder + output + level filter
    core := zapcore.NewCore(
        encoder,
        zapcore.AddSync(os.Stdout), // write to stdout (container best practice)
        atomicLevel,
    )

    // Build the final logger with extra options:
    // AddCaller → adds "caller":"handler/user.go:42" to every entry
    // AddStacktrace(ErrorLevel) → adds full stack trace on errors only
    log := zap.New(core,
        zap.AddCaller(),
        zap.AddStacktrace(zapcore.ErrorLevel),
        // These fields appear on EVERY log entry — no need to repeat them
        zap.Fields(
            zap.String("app", cfg.ServiceName),
            zap.String("version", cfg.Version),
            zap.String("env", cfg.Environment),
        ),
    )

    return log, atomicLevel, nil
}

// InjectContext stores a logger in ctx.
// Use this in HTTP middleware so the logger flows through the entire
// request lifecycle without passing it as a function argument everywhere.
func InjectContext(ctx context.Context, log *zap.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, log)
}

// FromContext extracts the logger from ctx.
// If no logger was stored, it returns the fallback — this never panics.
// Call this at the start of any function that needs to log.
func FromContext(ctx context.Context, fallback *zap.Logger) *zap.Logger {
    if l, ok := ctx.Value(loggerKey).(*zap.Logger); ok {
        return l
    }
    return fallback
}
```

---

## Step 1.2 — Use the Logger in main.go

```go
// main.go
package main

import (
    "fmt"
    "net/http"
    "os"

    "go.uber.org/zap"

    "myapp/pkg/logger"
)

func main() {
    // Create the logger — do this FIRST, before anything else.
    log, atomicLevel, err := logger.New(logger.Config{
        Level:       "info",
        Format:      "json",      // change to "console" in development
        ServiceName: "my-service",
        Version:     "1.0.0",
        Environment: "production",
    })
    if err != nil {
        fmt.Fprintf(os.Stderr, "failed to create logger: %v\n", err)
        os.Exit(1)
    }
    // IMPORTANT: always sync before the program exits.
    // This flushes any buffered log entries.
    defer log.Sync()

    // Log that we started — this is the first entry you will see.
    log.Info("Application starting",
        zap.String("http_port", "8080"),
    )

    // Register the dynamic log level endpoint.
    // With this you can change the log level without restarting:
    //   curl -X PUT http://localhost:8080/internal/log-level -d '{"level":"debug"}'
    http.Handle("/internal/log-level", atomicLevel)

    // Your handler — receives the logger via dependency injection
    handler := &MyHandler{log: log}
    http.HandleFunc("/hello", handler.Hello)

    log.Info("HTTP server started", zap.String("addr", ":8080"))
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatal("HTTP server failed", zap.Error(err))
    }
}

type MyHandler struct {
    log *zap.Logger
}

func (h *MyHandler) Hello(w http.ResponseWriter, r *http.Request) {
    // Extract the request-scoped logger from context.
    // It was put there by the middleware (see Step 1.3).
    log := logger.FromContext(r.Context(), h.log)

    // All log entries in this function automatically carry
    // request_id and trace_id because they are in the logger.
    log.Info("Handling hello request")

    w.Write([]byte("hello world"))

    log.Info("Hello request completed")
}
```

---

## Step 1.3 — Add HTTP Middleware

Middleware runs before every HTTP handler. It generates a request ID, creates a child logger with that ID attached, and stores it in the context. Now every log entry from every handler carries `request_id` automatically.

```go
// internal/middleware/logging.go
package middleware

import (
    "net/http"
    "time"

    "github.com/google/uuid"
    "go.uber.org/zap"

    "myapp/pkg/logger"
)

// RequestLogger creates a child logger with a unique request_id for every request.
// It logs one entry at the end showing: method, path, status, duration.
func RequestLogger(base *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Skip health checks — they are noise, not signal.
            if r.URL.Path == "/health" || r.URL.Path == "/ready" {
                next.ServeHTTP(w, r)
                return
            }

            // Generate a unique ID for this request.
            // If an upstream service already sent one, use it (preserves the chain).
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = uuid.New().String()
            }
            // Send the request ID back in the response header
            // so the client can use it to report an issue.
            w.Header().Set("X-Request-ID", requestID)

            // Create a child logger that carries request_id on every entry.
            // You never have to write zap.String("request_id", ...) again.
            reqLogger := base.With(
                zap.String("request_id", requestID),
                zap.String("method", r.Method),
                zap.String("path", r.URL.Path),
            )

            // Store the logger in the request context.
            ctx := logger.InjectContext(r.Context(), reqLogger)

            // Wrap the ResponseWriter to capture the status code.
            wrapped := &statusWriter{ResponseWriter: w, status: 200}

            start := time.Now()
            next.ServeHTTP(wrapped, r.WithContext(ctx))
            duration := time.Since(start)

            // Log one entry per request after it completes.
            // Choose the log level based on the response status:
            //   5xx → ERROR (server broke, user was hurt)
            //   4xx → WARN  (client did something wrong)
            //   2xx → INFO  (all good)
            fields := []zap.Field{
                zap.Int("status", wrapped.status),
                zap.Duration("duration", duration),
            }

            switch {
            case wrapped.status >= 500:
                reqLogger.Error("HTTP request failed", fields...)
            case wrapped.status >= 400:
                reqLogger.Warn("HTTP client error", fields...)
            default:
                reqLogger.Info("HTTP request served", fields...)
            }
        })
    }
}

// statusWriter wraps http.ResponseWriter to capture the status code.
// Without this we cannot know what status code was sent after the fact.
type statusWriter struct {
    http.ResponseWriter
    status int
}

func (sw *statusWriter) WriteHeader(status int) {
    sw.status = status
    sw.ResponseWriter.WriteHeader(status)
}
```

---

## Step 1.4 — The Log Level Rules

Learn these by heart. Wrong log levels are the #1 logging mistake.

```go
// DEBUG — developer detail. NEVER visible in production (level=info).
// Use freely: variable values, algorithm steps, cache keys.
logger.Debug("Cache key computed",
    zap.String("key", "user:42:profile"),
    zap.Duration("compute_time", 2*time.Microsecond),
)

// INFO — a meaningful business event happened and completed normally.
// Use for: requests served, orders placed, users registered, service started.
logger.Info("Order placed successfully",
    zap.String("order_id", "ord-789"),
    zap.String("user_id", "usr-42"),   // always log user_id, NEVER log email
    zap.Float64("total_usd", 59.99),
    zap.Duration("processing_time", 145*time.Millisecond),
)

// WARN — something unexpected happened, BUT the system recovered.
// Use for: retries that succeeded, fallbacks triggered, slow queries.
logger.Warn("Payment gateway retry succeeded",
    zap.Int("attempt", 2),
    zap.String("gateway", "stripe"),
    zap.Duration("total_elapsed", 892*time.Millisecond),
)

// ERROR — a user-facing operation FAILED. Something is broken.
// Use for: DB errors, payment failures, unhandled exceptions.
// Every ERROR should be actionable — someone should look at it.
logger.Error("Payment charge failed",
    zap.String("order_id", "ord-789"),
    zap.String("user_id", "usr-42"),
    zap.String("gateway", "stripe"),
    zap.Error(err),                    // always include the actual error
)

// FATAL — the service CANNOT start or continue. Calls os.Exit(1).
// Only use at startup for unrecoverable failures (cannot connect to DB).
logger.Fatal("Cannot connect to PostgreSQL",
    zap.String("host", "postgres:5432"),
    zap.Error(err),
)
```

---

## Step 1.5 — What You Must NEVER Log

This is the most important rule. Logging sensitive data can cause data breaches and GDPR violations. The consequences are severe.

```go
// ❌ NEVER log passwords (plain or hashed)
logger.Info("user logged in", zap.String("password", req.Password)) // NO

// ❌ NEVER log JWT tokens or session tokens
logger.Info("authenticated", zap.String("token", jwtToken)) // NO

// ❌ NEVER log full credit card numbers
logger.Info("payment", zap.String("card", "4111111111111111")) // NO
// ✅ Log only the last 4 digits
logger.Info("payment", zap.String("card_last4", "1111"))

// ❌ NEVER log email addresses (PII under GDPR)
logger.Info("user logged in", zap.String("email", user.Email)) // NO
// ✅ Log only the opaque user ID
logger.Info("user logged in", zap.String("user_id", user.ID))

// ❌ NEVER log full API keys
logger.Info("api call", zap.String("api_key", key)) // NO
// ✅ Log only the key ID (the identifier, not the secret)
logger.Info("api call", zap.String("api_key_id", keyID))

// ❌ NEVER log full request/response bodies (may contain any of the above)
body, _ := io.ReadAll(r.Body)
logger.Info("request", zap.ByteString("body", body)) // NO
// ✅ Log only the specific safe fields you need
logger.Info("request",
    zap.String("order_id", req.OrderID),
    zap.Float64("amount", req.Amount),
)
```

---

# STAGE 2 — Metrics with Prometheus

## What Are Metrics?

Metrics are numbers that change over time. Prometheus collects them by scraping a `/metrics` endpoint your service exposes every 15 seconds.

Why metrics instead of just logs?

- Logs tell you **what** happened to one request.
- Metrics tell you **how many** requests happened, at **what rate**, with **what latency** — for ALL requests, over time, on a graph.
- Metrics are how you get paged when something goes wrong.

---

## Step 2.1 — The Four Metric Types

```
Counter   — a number that only goes UP.
           Use for: requests total, errors total, orders placed total.
           Example: 15,432 total HTTP requests since startup.
           KEY RULE: Never use a counter for things that go down.

Gauge     — a number that can go up AND down.
           Use for: active connections, queue depth, memory usage, goroutines.
           Example: 47 active HTTP connections right now.

Histogram — records the distribution of values in pre-defined buckets.
           Use for: latency, request size, response size.
           Example: 95% of requests < 100ms, 99% < 500ms, 99.9% < 2s.
           This is what you use for SLOs.

Summary   — similar to histogram but calculates quantiles on the client.
           Avoid in production — summaries cannot be aggregated across
           multiple server instances. Use histogram instead.
```

---

## Step 2.2 — Create the Metrics Package

```go
// pkg/metrics/metrics.go
package metrics

import (
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/collectors"
)

// Registry holds all your custom metrics.
// We use a custom registry instead of the global default because:
// 1. It is easier to test (no global state)
// 2. It avoids accidental metric name collisions
type Registry struct {
    reg *prometheus.Registry

    // ─── HTTP metrics ─────────────────────────────────────────────────
    // How many requests, broken down by method + path + status code.
    HTTPRequestsTotal *prometheus.CounterVec

    // How long requests took, broken down by method + path.
    HTTPRequestDuration *prometheus.HistogramVec

    // How many requests are being processed RIGHT NOW.
    HTTPActiveRequests prometheus.Gauge

    // ─── Database metrics ─────────────────────────────────────────────
    // How long database queries took.
    DBQueryDuration *prometheus.HistogramVec

    // Pool utilisation (from sql.DB.Stats())
    DBConnectionsInUse prometheus.Gauge
    DBConnectionsIdle  prometheus.Gauge

    // ─── Business metrics ─────────────────────────────────────────────
    // These tell you about your BUSINESS, not just your infrastructure.
    // "Are orders being placed?" is more important than "Is CPU at 80%?"
    OrdersTotal       *prometheus.CounterVec   // count by status
    OrderValueUSD     *prometheus.HistogramVec // distribution of order sizes
    UsersRegistered   prometheus.Counter
    CacheHitsTotal    *prometheus.CounterVec
    CacheMissesTotal  *prometheus.CounterVec
}

// New creates and registers all metrics. Call this once at startup.
func New(serviceName string) (*Registry, error) {
    reg := prometheus.NewRegistry()

    // Register Go runtime metrics (goroutines, GC, memory) automatically.
    reg.MustRegister(
        collectors.NewGoCollector(),
        collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
    )

    r := &Registry{
        reg: reg,

        HTTPRequestsTotal: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Namespace: serviceName,
                Subsystem: "http",
                Name:      "requests_total",
                Help:      "Total HTTP requests by method, path, and status_code.",
            },
            // Labels: low-cardinality values only!
            // GOOD:   method (5 values), status_code (10 values), path (50 values)
            // BAD:    user_id (10M values) — would crash Prometheus with OOM
            []string{"method", "path", "status_code"},
        ),

        HTTPRequestDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: serviceName,
                Subsystem: "http",
                Name:      "request_duration_seconds",
                Help:      "HTTP request latency distribution.",
                // These bucket boundaries define the precision of your percentiles.
                // Values are in seconds. Add more buckets where your SLO boundary is.
                // If your SLO is "99% of requests < 500ms", have a bucket at 0.5.
                Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
            },
            []string{"method", "path"},
        ),

        HTTPActiveRequests: prometheus.NewGauge(
            prometheus.GaugeOpts{
                Namespace: serviceName,
                Subsystem: "http",
                Name:      "active_requests",
                Help:      "HTTP requests currently being processed.",
            },
        ),

        DBQueryDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: serviceName,
                Subsystem: "db",
                Name:      "query_duration_seconds",
                Help:      "Database query latency distribution.",
                Buckets:   []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
            },
            []string{"operation", "table"}, // e.g. "select","users" or "insert","orders"
        ),

        DBConnectionsInUse: prometheus.NewGauge(prometheus.GaugeOpts{
            Namespace: serviceName, Subsystem: "db",
            Name: "connections_in_use", Help: "Active DB connections.",
        }),

        DBConnectionsIdle: prometheus.NewGauge(prometheus.GaugeOpts{
            Namespace: serviceName, Subsystem: "db",
            Name: "connections_idle", Help: "Idle DB connections.",
        }),

        OrdersTotal: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Namespace: serviceName, Subsystem: "business",
                Name: "orders_total", Help: "Orders by status.",
            },
            []string{"status"}, // "created", "paid", "cancelled"
        ),

        OrderValueUSD: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: serviceName, Subsystem: "business",
                Name: "order_value_usd", Help: "Distribution of order values.",
                Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000},
            },
            []string{"status"},
        ),

        UsersRegistered: prometheus.NewCounter(prometheus.CounterOpts{
            Namespace: serviceName, Subsystem: "business",
            Name: "users_registered_total", Help: "Total user registrations.",
        }),

        CacheHitsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: serviceName, Subsystem: "cache",
            Name: "hits_total", Help: "Cache hits by cache name.",
        }, []string{"cache"}),

        CacheMissesTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: serviceName, Subsystem: "cache",
            Name: "misses_total", Help: "Cache misses by cache name.",
        }, []string{"cache"}),
    }

    // Register everything with our custom registry.
    reg.MustRegister(
        r.HTTPRequestsTotal,
        r.HTTPRequestDuration,
        r.HTTPActiveRequests,
        r.DBQueryDuration,
        r.DBConnectionsInUse,
        r.DBConnectionsIdle,
        r.OrdersTotal,
        r.OrderValueUSD,
        r.UsersRegistered,
        r.CacheHitsTotal,
        r.CacheMissesTotal,
    )

    return r, nil
}

// Gatherer returns the prometheus.Gatherer for use with promhttp.HandlerFor.
func (r *Registry) Gatherer() prometheus.Gatherer { return r.reg }

// ObserveHTTP is a convenience method that records both the counter and histogram.
func (r *Registry) ObserveHTTP(method, path, statusCode string, d time.Duration) {
    r.HTTPRequestsTotal.WithLabelValues(method, path, statusCode).Inc()
    r.HTTPRequestDuration.WithLabelValues(method, path).Observe(d.Seconds())
}

// ObserveDB records a database query duration.
func (r *Registry) ObserveDB(operation, table string, d time.Duration) {
    r.DBQueryDuration.WithLabelValues(operation, table).Observe(d.Seconds())
}
```

---

## Step 2.3 — Metrics Middleware

```go
// internal/middleware/metrics.go
package middleware

import (
    "net/http"
    "strconv"
    "time"

    "myapp/pkg/metrics"
)

// MetricsMiddleware records RED metrics for every HTTP request.
// RED = Rate (requests/second), Errors (error rate), Duration (latency).
func MetricsMiddleware(reg *metrics.Registry) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // IMPORTANT: use the route pattern (/users/{id}), not the actual URL path
            // (/users/12345), as the metric label. If you use the actual path,
            // each user ID creates a new time series. With 10M users that is
            // 10 million time series — it will crash Prometheus with OOM.
            //
            // How to get the route pattern depends on your router.
            // With chi: chi.RouteContext(r.Context()).RoutePattern()
            // With mux: mux.CurrentRoute(r).GetPathTemplate()
            // Fallback: r.URL.Path (acceptable if paths don't contain IDs)
            path := r.URL.Path

            reg.HTTPActiveRequests.Inc()
            defer reg.HTTPActiveRequests.Dec()

            start := time.Now()
            sw := &statusWriter{ResponseWriter: w, status: 200}
            next.ServeHTTP(sw, r)

            reg.ObserveHTTP(
                r.Method,
                path,
                strconv.Itoa(sw.status),
                time.Since(start),
            )
        })
    }
}
```

---

## Step 2.4 — Expose /metrics and Use in Business Logic

```go
// In main.go — add the metrics server
import (
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "myapp/pkg/metrics"
)

func main() {
    // ... logger setup from Stage 1 ...

    reg, err := metrics.New("myservice")
    if err != nil {
        log.Fatal("metrics init failed", zap.Error(err))
    }

    // ─── CRITICAL: serve /metrics on a SEPARATE, INTERNAL port ──────────
    // NEVER serve /metrics on the same port as your public API.
    // Metrics expose internal details (query counts, error rates) that
    // attackers could use to understand your system. Keep it internal.
    metricsServer := &http.Server{
        Addr: ":9090", // internal only — block this in your firewall/NetworkPolicy
        Handler: promhttp.HandlerFor(
            reg.Gatherer(),
            promhttp.HandlerOpts{EnableOpenMetrics: true},
        ),
    }
    go func() {
        log.Info("Metrics server started", zap.String("addr", ":9090"))
        metricsServer.ListenAndServe()
    }()

    // Use metrics in your business logic:
    // reg.OrdersTotal.WithLabelValues("created").Inc()
    // reg.UsersRegistered.Inc()
}
```

```go
// Using metrics in a service method (business logic)
func (s *OrderService) Create(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    log := logger.FromContext(ctx, s.log)

    // Measure DB query duration
    start := time.Now()
    order, err := s.repo.Create(ctx, req)
    s.metrics.ObserveDB("insert", "orders", time.Since(start))

    if err != nil {
        // Count failed orders
        s.metrics.OrdersTotal.WithLabelValues("failed").Inc()
        log.Error("Failed to create order", zap.Error(err))
        return nil, err
    }

    // Count successful orders
    s.metrics.OrdersTotal.WithLabelValues("created").Inc()

    // Record the order value (for revenue histograms)
    s.metrics.OrderValueUSD.WithLabelValues("created").Observe(order.TotalUSD)

    log.Info("Order created",
        zap.String("order_id", order.ID),
        zap.Float64("total_usd", order.TotalUSD),
    )

    return order, nil
}
```

---

## Step 2.5 — The Cardinality Rule (Most Important Metrics Rule)

Cardinality = the number of unique time series Prometheus has to store. Too many = Prometheus runs out of memory and crashes.

```
GOOD labels (low cardinality):
  status_code: ~10 values  (200, 201, 400, 401, 403, 404, 500 …)
  method:       5 values   (GET, POST, PUT, DELETE, PATCH)
  path:        ~50 values  (/api/v1/users, /api/v1/orders …)
  service:     ~15 values  (user-service, payment-service …)

BAD labels (high cardinality — NEVER use as metric labels):
  user_id:    10,000,000 values → 10M time series → OOM crash
  order_id:   unbounded         → unbounded memory growth
  request_id: unbounded
  email:      PII, also unbounded

Rule: if a label can have more than ~100 unique values, it does NOT
belong in metrics. Put it in LOGS or TRACES instead.

user_id in a LOG entry: ✅ fine — logs are just strings, no indexing
user_id as a metric label: ❌ fatal — Prometheus indexes every unique value
```

---

# STAGE 3 — Distributed Tracing with OpenTelemetry

## What Is Distributed Tracing?

A **trace** is the complete story of one request as it travels through your system. A **span** is one operation within that story (one database query, one HTTP call, one function).

Without tracing, when checkout takes 5 seconds, you don't know if it was:

- Authentication service? (50ms)
- Product service? (20ms)
- Payment service? (4,800ms ← here!)
- Database query? (100ms)

Tracing shows you the full breakdown instantly.

## How It Works

Every request gets a unique `trace_id`. When service A calls service B, it passes the `trace_id` in a header. Service B creates its spans under the same `trace_id`. All spans from all services are collected and assembled into a timeline called a "flame graph" in Grafana Tempo.

---

## Step 3.1 — Create the Tracer Package

```go
// pkg/tracer/tracer.go
package tracer

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// Config holds the tracer configuration.
type Config struct {
    ServiceName    string
    ServiceVersion string
    Environment    string
    // CollectorAddr is the gRPC address of the OTel Collector.
    // e.g. "otel-collector:4317"
    CollectorAddr string
    // SampleRate controls what fraction of traces are recorded.
    // 1.0 = record every request (good for development)
    // 0.1 = record 10% of requests (good for high-traffic production)
    SampleRate float64
}

// Init sets up the global OpenTelemetry tracer.
// Returns a shutdown function — ALWAYS call it at application exit
// to flush any buffered spans.
func Init(ctx context.Context, cfg Config) (shutdown func(context.Context) error, err error) {
    // Resource describes this service to the tracing backend.
    // These attributes appear on every span.
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(cfg.ServiceName),
            semconv.ServiceVersion(cfg.ServiceVersion),
            semconv.DeploymentEnvironment(cfg.Environment),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("create OTel resource: %w", err)
    }

    // Connect to the OTel Collector via gRPC.
    // The Collector receives spans from your app and forwards them to Tempo.
    conn, err := grpc.NewClient(cfg.CollectorAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        return nil, fmt.Errorf("connect to OTel Collector at %s: %w", cfg.CollectorAddr, err)
    }

    // Exporter sends spans to the Collector.
    exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithGRPCConn(conn))
    if err != nil {
        return nil, fmt.Errorf("create OTLP exporter: %w", err)
    }

    // Sampler: ParentBased means "if the upstream service sampled this
    // request, I sample it too; if not, I sample at SampleRate."
    // This keeps traces COMPLETE (no gaps in the middle of a trace).
    sampler := sdktrace.ParentBased(
        sdktrace.TraceIDRatioBased(cfg.SampleRate),
    )

    // TracerProvider manages all spans and sends them in batches.
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),    // batch for efficiency
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sampler),
    )

    // Register as the global tracer — any otel.Tracer() call uses this.
    otel.SetTracerProvider(tp)

    // Register W3C TraceContext propagator.
    // This is what allows trace context to flow through HTTP headers
    // from service to service.
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{}, // W3C standard
        propagation.Baggage{},
    ))

    return tp.Shutdown, nil
}
```

---

## Step 3.2 — Add Tracing to main.go

```go
// In main.go
func main() {
    // ... logger and metrics setup ...

    ctx := context.Background()

    // Init tracing. The shutdown function flushes buffered spans on exit.
    shutdownTracer, err := tracer.Init(ctx, tracer.Config{
        ServiceName:    "my-service",
        ServiceVersion: "1.0.0",
        Environment:    "production",
        CollectorAddr:  "otel-collector:4317",
        SampleRate:     0.1, // trace 10% of requests in production
    })
    if err != nil {
        // Tracing failure is NOT fatal — the service should still run.
        // Just log a warning and continue without traces.
        log.Warn("Tracing disabled — could not connect to OTel Collector",
            zap.Error(err),
        )
    } else {
        defer func() {
            shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()
            shutdownTracer(shutdownCtx)
        }()
        log.Info("Tracing enabled", zap.String("collector", "otel-collector:4317"))
    }
}
```

---

## Step 3.3 — Trace Middleware (The Most Important Part)

```go
// internal/middleware/tracing.go
package middleware

import (
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"

    "myapp/pkg/logger"
)

var tracer = otel.Tracer("myapp.middleware")

// TracingMiddleware does three things:
// 1. Extracts the incoming trace context (from X-Traceparent header)
//    so our spans are children of the upstream service's span.
// 2. Starts a new server span for this HTTP handler.
// 3. Injects trace_id and span_id into the request-scoped logger.
//    This is the KEY step — it links your logs to your traces.
func TracingMiddleware(base *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Step 1: Extract parent trace context from incoming headers.
            // If an upstream API gateway or load balancer already started
            // a trace and sent us a traceparent header, we pick it up here.
            // If not, a new root span will be created below.
            ctx := otel.GetTextMapPropagator().Extract(
                r.Context(),
                propagation.HeaderCarrier(r.Header),
            )

            // Step 2: Start the server span for this request.
            operationName := r.Method + " " + r.URL.Path
            ctx, span := tracer.Start(ctx, operationName,
                trace.WithSpanKind(trace.SpanKindServer),
                trace.WithAttributes(
                    attribute.String("http.method", r.Method),
                    attribute.String("http.url", r.URL.String()),
                ),
            )
            defer span.End() // always end the span when the handler returns

            // Step 3: Inject trace_id into the logger.
            // Now every log entry made during this request will carry trace_id.
            // In Grafana, you can click the trace_id in a log entry to jump
            // directly to the full distributed trace in Tempo.
            sc := span.SpanContext()
            reqLogger := base.With(
                zap.String("trace_id", sc.TraceID().String()),
                zap.String("span_id", sc.SpanID().String()),
            )
            ctx = logger.InjectContext(ctx, reqLogger)

            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

---

## Step 3.4 — Add Spans to Your Business Logic

```go
// In your service or repository, wrap important operations in spans.
// This is what gives you the breakdown in the flame graph.

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

// Create a tracer for your package. Do this once at package level.
var tracer = otel.Tracer("myapp.order-service")

func (s *OrderService) Create(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    // Start a span for this operation.
    // The span is a child of whatever span is currently in ctx.
    ctx, span := tracer.Start(ctx, "order.create")
    defer span.End()

    // Add useful attributes to the span.
    // These appear in the Grafana Tempo UI for this span.
    span.SetAttributes(
        attribute.String("user_id", req.UserID),
        attribute.Int("item_count", len(req.Items)),
    )

    // This span is the parent. The DB call below creates a child span.
    order, err := s.repo.Create(ctx, req) // ctx carries the span
    if err != nil {
        // Record the error on the span so it shows as "failed" in Tempo.
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }

    span.SetAttributes(
        attribute.String("order_id", order.ID),
        attribute.Float64("total_usd", order.TotalUSD),
    )

    return order, nil
}

// In your repository, the DB query gets its own child span.
func (r *OrderRepository) Create(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    ctx, span := tracer.Start(ctx, "db.insert orders")
    defer span.End()

    span.SetAttributes(
        attribute.String("db.system", "postgresql"),
        attribute.String("db.operation", "INSERT"),
        attribute.String("db.sql.table", "orders"),
    )

    start := time.Now()
    // ... execute the query ...
    elapsed := time.Since(start)

    // Record the duration on the span
    span.SetAttributes(attribute.Int64("db.duration_ms", elapsed.Milliseconds()))

    return order, nil
}
```

---

## Step 3.5 — Propagate Context When Calling Other Services

When your service calls another service over HTTP, you must inject the trace context into the outgoing request header. Otherwise the traces from the two services are disconnected islands.

```go
// Making an HTTP call to another service
func (c *PaymentClient) ChargeCard(ctx context.Context, req ChargeRequest) (*ChargeResult, error) {
    ctx, span := tracer.Start(ctx, "HTTP POST payment-service /charge")
    defer span.End()

    httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/charge", body)
    if err != nil {
        return nil, err
    }

    // CRITICAL: inject the trace context into the outgoing HTTP headers.
    // This adds a "traceparent" header that the payment-service will read.
    // Without this, the trace stops at your service boundary.
    otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(httpReq.Header))

    resp, err := c.httpClient.Do(httpReq)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }

    span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))
    return parseResponse(resp)
}
```

---

# STAGE 4 — Dashboards and Alerting

## Step 4.1 — Docker Compose for the Full Stack

Save this as `docker-compose.yml` in your project root.

```yaml
version: "3.9"

services:
  # Your application
  app:
    build: .
    ports:
      - "8080:8080"   # public API
    environment:
      OTEL_COLLECTOR_ADDR: otel-collector:4317
    depends_on: [postgres, redis, otel-collector]

  # ─── OTel Collector ─────────────────────────────────────────────────
  # Receives spans from your app (port 4317) and forwards to Tempo.
  # Also exposes its own metrics to Prometheus (port 8889).
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.103.0
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otelcol/config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC (your app sends here)

  # ─── Prometheus (metrics storage) ───────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.53.0
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=30d
      - --web.enable-lifecycle
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml:ro
    ports:
      - "9091:9090"

  # ─── Grafana (dashboards UI) ─────────────────────────────────────────
  grafana:
    image: grafana/grafana:11.1.0
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    ports:
      - "3000:3000"

  # ─── Loki (log storage) ──────────────────────────────────────────────
  loki:
    image: grafana/loki:3.1.0
    command: -config.file=/etc/loki/config.yaml
    volumes:
      - ./loki.yaml:/etc/loki/config.yaml:ro
    ports:
      - "3100:3100"

  # ─── Promtail (log shipper: Docker → Loki) ───────────────────────────
  # Reads your container's stdout and ships it to Loki automatically.
  # Since your app writes JSON logs to stdout, Promtail parses them.
  promtail:
    image: grafana/promtail:3.1.0
    command: -config.file=/etc/promtail/config.yaml
    volumes:
      - ./promtail.yaml:/etc/promtail/config.yaml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro

  # ─── Tempo (trace storage) ───────────────────────────────────────────
  tempo:
    image: grafana/tempo:2.5.0
    command: -config.file=/etc/tempo/config.yaml
    volumes:
      - ./tempo.yaml:/etc/tempo/config.yaml:ro
    ports:
      - "3200:3200"
```

---

## Step 4.2 — Prometheus Scrape Config

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

rule_files:
  - /etc/prometheus/alert-rules.yml

scrape_configs:
  # Scrape your application's metrics
  - job_name: myapp
    static_configs:
      - targets: [app:9090]   # your internal metrics port
```

---

## Step 4.3 — Alert Rules

```yaml
# alert-rules.yml
# These alerts fire based on SYMPTOMS (what users experience),
# not CAUSES (what the infrastructure is doing).
# A symptom alert: "5% of requests are failing" — users are hurting.
# A cause alert: "CPU is at 80%" — maybe users are hurting, maybe not.
# Always alert on symptoms.

groups:
  - name: myapp
    rules:

      # Alert when more than 1% of requests fail — this means users are hurting.
      - alert: HighErrorRate
        expr: |
          sum(rate(myservice_http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(myservice_http_requests_total[5m])) > 0.01
        for: 2m    # must be true for 2 minutes (avoids flapping)
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 1%"
          description: "{{ $value | humanizePercentage }} of requests are failing."

      # Alert when P99 latency exceeds 500ms — users experience slowness.
      - alert: SlowP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(myservice_http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 500ms"

      # Alert if the service stops producing metrics at all.
      # This catches crashes that wouldn't show up in error rate.
      - alert: ServiceSilent
        expr: absent(myservice_http_requests_total)
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is not producing metrics — may be down"

      # Alert if no orders have been placed in 30 minutes.
      # This is a business metric alert — it catches checkout bugs
      # that the infrastructure alerts might miss.
      - alert: NoOrdersCreated
        expr: rate(myservice_business_orders_total{status="created"}[30m]) == 0
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "No orders created in 30 minutes — checkout may be broken"
```

---

## Step 4.4 — Grafana Datasource Provisioning

This file tells Grafana to automatically connect to Loki, Prometheus, and Tempo. The magic: it links `trace_id` in log entries to Tempo traces (one click!).

```yaml
# grafana/provisioning/datasources/datasources.yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        # When Grafana finds a trace_id field in a log entry,
        # it renders it as a CLICKABLE LINK that opens Tempo.
        # This is the log-to-trace correlation feature.
        - name: Tempo
          matcherRegex: '"trace_id":"([a-f0-9]+)"'
          url: "$${__value.raw}"
          datasourceUid: tempo
          urlDisplayLabel: "Open trace in Tempo"

  - name: Tempo
    uid: tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      # Link from Tempo traces back to Loki logs for the same trace_id.
      tracesToLogsV2:
        datasourceUid: loki
        tags:
          - key: service.name
            value: app
      serviceMap:
        datasourceUid: prometheus
```

---

## Step 4.5 — Start Everything and Verify

```bash
# Start the entire stack
docker compose up -d

# Verify your app is running
curl http://localhost:8080/health

# Verify metrics are being scraped
curl http://localhost:9091/api/v1/targets | jq .

# Open Grafana
open http://localhost:3000
# Username: admin  Password: admin
```

In Grafana:

1. Go to **Explore** → Select **Loki** → Query: `{app="my-service"}` → You should see your JSON log entries
2. Click on a log entry that has a `trace_id` field → You should see a "Open trace in Tempo" link
3. Click that link → You see the full distributed trace
4. Go to **Explore** → Select **Prometheus** → Query: `myservice_http_requests_total` → You should see your request counter metrics

---

## Step 4.6 — Useful Queries to Know

```logql
# LogQL queries for Grafana Loki Explore:

# Show all error logs
{app="my-service", level="error"} | json

# Follow all logs for one specific request (use the request_id from a user complaint)
{app="my-service"} | json | request_id="req-abc123"

# Follow all logs for one trace (use trace_id from a slow trace in Tempo)
{app="my-service"} | json | trace_id="7f3a8c2d1e9b4f5a"

# Show all logs from one user (find what a user experienced)
{app="my-service"} | json | user_id="usr-42"

# Find all slow requests
{app="my-service"} | json | duration > 500ms

# Count error rate over time
sum(rate({app="my-service", level="error"}[5m]))
```

```promql
# PromQL queries for Grafana Prometheus Explore:

# Request rate (requests per second)
rate(myservice_http_requests_total[5m])

# Error rate percentage
sum(rate(myservice_http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(myservice_http_requests_total[5m]))

# P99 latency
histogram_quantile(0.99,
  sum(rate(myservice_http_request_duration_seconds_bucket[5m])) by (le)
)

# P50, P90, P99 latency together
histogram_quantile(0.50, sum(rate(myservice_http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(myservice_http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(myservice_http_request_duration_seconds_bucket[5m])) by (le))

# Active HTTP connections right now
myservice_http_active_requests

# Orders per minute
rate(myservice_business_orders_total{status="created"}[1m]) * 60
```

---

# Putting It All Together in main.go

Here is the complete `main.go` that uses all four stages:

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.uber.org/zap"

    appmw "myapp/internal/middleware"
    "myapp/pkg/logger"
    "myapp/pkg/metrics"
    "myapp/pkg/tracer"
)

func main() {
    ctx := context.Background()

    // ── Stage 1: Logger ───────────────────────────────────────────────
    log, atomicLevel, err := logger.New(logger.Config{
        Level:       getEnv("LOG_LEVEL", "info"),
        Format:      getEnv("LOG_FORMAT", "json"),
        ServiceName: "my-service",
        Version:     "1.0.0",
        Environment: getEnv("APP_ENV", "development"),
    })
    if err != nil {
        fmt.Fprintf(os.Stderr, "logger init failed: %v\n", err)
        os.Exit(1)
    }
    defer log.Sync()

    log.Info("Service starting",
        zap.String("version", "1.0.0"),
        zap.String("env", getEnv("APP_ENV", "development")),
    )

    // ── Stage 2: Metrics ──────────────────────────────────────────────
    reg, err := metrics.New("myservice")
    if err != nil {
        log.Fatal("metrics init failed", zap.Error(err))
    }

    // ── Stage 3: Tracing ──────────────────────────────────────────────
    shutdownTracer, err := tracer.Init(ctx, tracer.Config{
        ServiceName:    "my-service",
        ServiceVersion: "1.0.0",
        Environment:    getEnv("APP_ENV", "development"),
        CollectorAddr:  getEnv("OTEL_COLLECTOR_ADDR", "localhost:4317"),
        SampleRate:     0.1,
    })
    if err != nil {
        log.Warn("Tracing disabled", zap.Error(err))
    } else {
        defer func() {
            shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()
            shutdownTracer(shutdownCtx)
        }()
    }

    // ── Router + Middleware stack ──────────────────────────────────────
    // IMPORTANT: middleware order matters.
    // Request flows top to bottom. Response flows bottom to top.
    r := chi.NewRouter()
    r.Use(appmw.TracingMiddleware(log))    // 1. Start span + inject trace_id into logger
    r.Use(appmw.RequestLogger(log))        // 2. Log one entry per request (has trace_id)
    r.Use(appmw.MetricsMiddleware(reg))    // 3. Record RED metrics
    r.Use(appmw.Recovery)                  // 4. Catch panics (always last)

    // Health probes — not logged (they are noise)
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"status":"ok"}`))
    })

    // Dynamic log level — change without restart
    r.Mount("/internal/log-level", atomicLevel)

    // Your actual API routes
    r.Get("/hello", func(w http.ResponseWriter, r *http.Request) {
        log := logger.FromContext(r.Context(), log)
        log.Info("Handling hello")
        w.Write([]byte(`{"message":"hello world"}`))
    })

    // ── Application server ────────────────────────────────────────────
    appServer := &http.Server{
        Addr:         ":" + getEnv("HTTP_PORT", "8080"),
        Handler:      r,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // ── Internal metrics server ───────────────────────────────────────
    // NEVER serve this on the public port — it leaks internal details.
    metricsServer := &http.Server{
        Addr: ":9090",
        Handler: promhttp.HandlerFor(
            reg.Gatherer(),
            promhttp.HandlerOpts{EnableOpenMetrics: true},
        ),
    }

    // Start both servers in goroutines.
    go func() {
        log.Info("HTTP server started", zap.String("addr", appServer.Addr))
        if err := appServer.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal("HTTP server error", zap.Error(err))
        }
    }()

    go func() {
        log.Info("Metrics server started", zap.String("addr", metricsServer.Addr))
        if err := metricsServer.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal("Metrics server error", zap.Error(err))
        }
    }()

    // ── Graceful shutdown ─────────────────────────────────────────────
    // Wait for SIGINT (Ctrl+C) or SIGTERM (Kubernetes sends this when pod is killed).
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    sig := <-quit

    log.Info("Shutdown signal received — draining connections",
        zap.String("signal", sig.String()),
    )

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := appServer.Shutdown(shutdownCtx); err != nil {
        log.Error("Graceful shutdown failed", zap.Error(err))
    }

    log.Info("Service shutdown complete")
}

func getEnv(key, def string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return def
}
```

---

# Quick Reference Summary

```
Stage 1: Logging (Zap)
  Package:     pkg/logger/logger.go
  Middleware:  internal/middleware/logging.go
  Key concept: context propagation — logger travels in ctx, not as function arg
  Never log:   passwords, tokens, email, full credit card numbers
  Levels:      DEBUG=dev only, INFO=business events, WARN=recovered errors, ERROR=failures

Stage 2: Metrics (Prometheus)
  Package:     pkg/metrics/metrics.go
  Middleware:  internal/middleware/metrics.go
  Key concept: cardinality — never use user_id/order_id as metric labels
  Serve at:    :9090/metrics — INTERNAL PORT ONLY, never public
  RED method:  Rate + Errors + Duration — three metrics every service needs

Stage 3: Tracing (OpenTelemetry)
  Package:     pkg/tracer/tracer.go
  Middleware:  internal/middleware/tracing.go
  Key concept: context propagation across services via W3C traceparent header
  Link to logs: inject trace_id into Zap logger in tracing middleware
  Sample rate:  1.0 in dev, 0.1 in production

Stage 4: Dashboards (Grafana)
  Logs:   Loki + Promtail (auto-ships from Docker stdout)
  Traces: Tempo + OTel Collector
  Metrics: Prometheus
  UI:     Grafana (localhost:3000)
  Magic:  trace_id field in logs → clickable link → Tempo trace

Run everything: docker compose up -d
Grafana:        http://localhost:3000  (admin/admin)
```

---

_Observability is not a checkbox. It is a habit. Every new endpoint you add, ask: does it have a log entry? does it have a metric? does it have a trace span? If the answer to any of these is no, it is not done yet._