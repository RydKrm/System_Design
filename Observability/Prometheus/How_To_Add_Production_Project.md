# Production-Grade Prometheus Metrics in Go

> A complete, copy-paste-ready guide for adding Prometheus metrics to a large production Go project — every metric type, every pattern, every pitfall.

---

## Table of Contents

1. [Why Prometheus?](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#1-why-prometheus)
2. [Project Setup](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#2-project-setup)
3. [The Four Metric Types](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#3-the-four-metric-types)
4. [The Metrics Registry Package](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#4-the-metrics-registry-package)
5. [HTTP Metrics Middleware](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#5-http-metrics-middleware)
6. [The Cardinality Rule — The Most Important Rule](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#6-the-cardinality-rule--the-most-important-rule)
7. [Database Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#7-database-metrics)
8. [Cache Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#8-cache-metrics)
9. [Message Queue Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#9-message-queue-metrics)
10. [Business Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#10-business-metrics)
11. [Background Worker Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#11-background-worker-metrics)
12. [Go Runtime Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#12-go-runtime-metrics)
13. [The Metrics Server — Internal Only](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#13-the-metrics-server--internal-only)
14. [Prometheus Scrape Configuration](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#14-prometheus-scrape-configuration)
15. [Alert Rules](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#15-alert-rules)
16. [Useful PromQL Queries](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#16-useful-promql-queries)
17. [Wiring Everything in main.go](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#17-wiring-everything-in-maingo)
18. [Testing Your Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#18-testing-your-metrics)
19. [Production Checklist](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#19-production-checklist)

---

## 1. Why Prometheus?

Logs answer _what happened_ to one request. Prometheus answers _how many_, _how fast_, and _how often_ — across ALL requests, over time, on a graph.

```
Scenario: your checkout is broken at 2 AM.

Without metrics:
  You have no idea something is wrong until users complain.
  Then you grep logs. 10M log lines. Good luck.

With Prometheus:
  An alert fires after 2 minutes: "error rate > 1% for 2 min".
  You open Grafana: the checkout error rate spiked at 02:14.
  You look at the P99 latency graph: payment service latency hit 8s at 02:14.
  You look at the DB connection pool gauge: it hit 100% at 02:13.
  Root cause found in 4 minutes without touching a single log line.
```

Prometheus collects metrics by **scraping** your `/metrics` endpoint every 15 seconds. Your application never pushes — Prometheus pulls.

---

## 2. Project Setup

```bash
go get github.com/prometheus/client_golang@v1.19.1
```

Project structure for this guide:

```
myapp/
├── cmd/server/
│   └── main.go
├── internal/
│   └── middleware/
│       └── metrics.go          ← HTTP metrics middleware
├── pkg/
│   └── metrics/
│       ├── metrics.go          ← registry + all metric definitions
│       └── metrics_test.go     ← tests
├── internal/
│   ├── user/service/           ← business metrics usage
│   ├── order/service/          ← business metrics usage
│   ├── product/repository/     ← DB metrics usage
│   └── worker/                 ← worker metrics usage
└── deployments/
    ├── prometheus.yml          ← scrape config
    └── alert-rules.yml         ← alert definitions
```

---

## 3. The Four Metric Types

Understanding WHEN to use each type is the most important concept.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  COUNTER                                                                     │
│  A number that only ever goes UP. Resets to 0 on service restart.            │
│  Use for: requests total, errors total, bytes sent, orders placed.           │
│  Never use for values that can decrease (use Gauge for those).               │
│  Query pattern: rate(counter[5m]) → per-second rate of increase              │
├──────────────────────────────────────────────────────────────────────────────┤
│  GAUGE                                                                       │
│  A number that can go up AND down. Represents a current value.               │
│  Use for: active connections, queue depth, memory usage, goroutines,         │
│           temperature, stock levels.                                         │
│  Query pattern: the gauge value itself, or delta over time                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  HISTOGRAM                                                                   │
│  Records observations into pre-defined size buckets.                        │
│  Use for: latency (request duration), request/response size.                │
│  Gives you percentiles: P50, P90, P99.                                      │
│  Can be aggregated across multiple instances (unlike Summary).              │
│  Query pattern: histogram_quantile(0.99, rate(hist_bucket[5m]))             │
├──────────────────────────────────────────────────────────────────────────────┤
│  SUMMARY                                                                     │
│  Like Histogram but calculates quantiles on the CLIENT side.                │
│  Avoid in production: summaries CANNOT be aggregated across instances.      │
│  If you have 5 pods, you cannot average their P99s correctly.               │
│  Use Histogram instead for latency in distributed systems.                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The Metrics Registry Package

This is the single file that defines every metric in your service. All other files import from here. Using a custom registry (not the global default) makes tests clean and prevents accidental metric name collisions.

```go
// pkg/metrics/metrics.go
package metrics

import (
	"database/sql"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

// Registry holds every Prometheus metric for the service.
// It is constructed once at startup and injected via dependency injection.
// Using a custom registry (not prometheus.DefaultRegisterer) means:
//   - Tests can create fresh registries without global state pollution
//   - No accidental metric name collisions with third-party libraries
//   - Explicit control over what gets exposed at /metrics
type Registry struct {
	reg *prometheus.Registry

	// ── HTTP metrics (RED method: Rate, Errors, Duration) ────────────────
	// Rate:     how many requests per second
	// Errors:   what fraction of requests are failing
	// Duration: how long requests are taking (histogram for percentiles)

	// Total requests by method, path, and status code.
	// Used to compute: request rate, error rate.
	HTTPRequestsTotal *prometheus.CounterVec

	// Request latency distribution.
	// Used to compute: P50, P90, P99 latency per endpoint.
	HTTPRequestDuration *prometheus.HistogramVec

	// Number of requests being processed RIGHT NOW.
	// Useful for detecting when the service is overwhelmed.
	HTTPActiveRequests prometheus.Gauge

	// ── Database metrics ─────────────────────────────────────────────────
	// Query duration by operation type and table.
	// Used to detect slow queries, missing indexes.
	DBQueryDuration *prometheus.HistogramVec

	// Connection pool utilisation. Saturation > 80% is a warning sign.
	DBConnectionsInUse prometheus.Gauge
	DBConnectionsIdle  prometheus.Gauge
	DBConnectionsMax   prometheus.Gauge

	// ── Cache metrics ─────────────────────────────────────────────────────
	// Hit/miss ratio tells you if caching is working.
	// Low hit rate = wasted DB queries.
	CacheHitsTotal   *prometheus.CounterVec
	CacheMissesTotal *prometheus.CounterVec

	// ── Message queue metrics ─────────────────────────────────────────────
	MessagesPublishedTotal *prometheus.CounterVec
	MessagesConsumedTotal  *prometheus.CounterVec
	MessageProcessDuration *prometheus.HistogramVec
	QueueDepth             *prometheus.GaugeVec

	// ── Business metrics ─────────────────────────────────────────────────
	// These are more valuable than infrastructure metrics in many cases.
	// "Are orders being placed?" is more important than "Is CPU at 80%?"
	OrdersTotal          *prometheus.CounterVec
	OrderValueUSD        *prometheus.HistogramVec
	UsersRegisteredTotal prometheus.Counter
	ProductsTotal        prometheus.Gauge
	ActiveSessionsTotal  prometheus.Gauge
	CheckoutFunnelTotal  *prometheus.CounterVec

	// ── Worker metrics ────────────────────────────────────────────────────
	WorkerJobsTotal        *prometheus.CounterVec
	WorkerJobDuration      *prometheus.HistogramVec
	WorkerLastSuccessTime  *prometheus.GaugeVec // Unix timestamp of last success
}

// New creates and registers all metrics. Call this once at application startup.
// serviceName is used as the metric namespace prefix, e.g. "ecommerce_api".
func New(serviceName string) (*Registry, error) {
	reg := prometheus.NewRegistry()

	// Register standard Go runtime collectors automatically.
	// These give you: goroutine count, GC duration, heap size, CPU usage.
	// All free — no extra code needed.
	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)

	r := &Registry{reg: reg}
	r.registerHTTPMetrics(reg, serviceName)
	r.registerDBMetrics(reg, serviceName)
	r.registerCacheMetrics(reg, serviceName)
	r.registerQueueMetrics(reg, serviceName)
	r.registerBusinessMetrics(reg, serviceName)
	r.registerWorkerMetrics(reg, serviceName)

	return r, nil
}

func (r *Registry) registerHTTPMetrics(reg *prometheus.Registry, ns string) {
	r.HTTPRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns,
			Subsystem: "http",
			Name:      "requests_total",
			Help:      "Total HTTP requests partitioned by method, path, and status_code.",
		},
		// LABEL CARDINALITY WARNING:
		// "method" has ~5 values: GET, POST, PUT, DELETE, PATCH
		// "path"   has ~50 values: normalised route patterns (NOT raw URLs)
		// "status_code" has ~10 values: 200, 201, 400, 401, 403, 404, 500 ...
		// Total time series: 5 × 50 × 10 = 2,500 — perfectly safe.
		// NEVER add user_id, order_id, or request_id as labels — see Section 6.
		[]string{"method", "path", "status_code"},
	)

	r.HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: ns,
			Subsystem: "http",
			Name:      "request_duration_seconds",
			Help:      "HTTP request latency distribution in seconds.",
			// Bucket boundaries define where percentile precision is high.
			// These cover: <5ms, <10ms, <25ms, <50ms, <100ms, <250ms, <500ms,
			//              <1s, <2.5s, <5s, <10s
			// If your SLO is "P99 < 500ms", the 0.5 bucket is critical.
			// Adjust buckets to put most observations in the middle buckets.
			Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path"},
	)

	r.HTTPActiveRequests = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns,
		Subsystem: "http",
		Name:      "active_requests",
		Help:      "Number of HTTP requests currently in flight.",
	})

	reg.MustRegister(
		r.HTTPRequestsTotal,
		r.HTTPRequestDuration,
		r.HTTPActiveRequests,
	)
}

func (r *Registry) registerDBMetrics(reg *prometheus.Registry, ns string) {
	r.DBQueryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: ns,
			Subsystem: "db",
			Name:      "query_duration_seconds",
			Help:      "Database query duration in seconds by operation and table.",
			Buckets:   []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5},
		},
		[]string{"operation", "table"}, // e.g. "select","users" or "insert","orders"
	)

	r.DBConnectionsInUse = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns, Subsystem: "db",
		Name: "connections_in_use",
		Help: "Number of database connections currently in use.",
	})
	r.DBConnectionsIdle = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns, Subsystem: "db",
		Name: "connections_idle",
		Help: "Number of idle database connections in the pool.",
	})
	r.DBConnectionsMax = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns, Subsystem: "db",
		Name: "connections_max",
		Help: "Maximum number of open connections configured.",
	})

	reg.MustRegister(
		r.DBQueryDuration,
		r.DBConnectionsInUse,
		r.DBConnectionsIdle,
		r.DBConnectionsMax,
	)
}

func (r *Registry) registerCacheMetrics(reg *prometheus.Registry, ns string) {
	r.CacheHitsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "cache",
			Name: "hits_total",
			Help: "Total cache hits by cache name.",
		},
		[]string{"cache"}, // e.g. "user_profile", "product_page", "session"
	)
	r.CacheMissesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "cache",
			Name: "misses_total",
			Help: "Total cache misses by cache name.",
		},
		[]string{"cache"},
	)

	reg.MustRegister(r.CacheHitsTotal, r.CacheMissesTotal)
}

func (r *Registry) registerQueueMetrics(reg *prometheus.Registry, ns string) {
	r.MessagesPublishedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "queue",
			Name: "messages_published_total",
			Help: "Total messages published by topic.",
		},
		[]string{"topic", "status"}, // status: "success" | "error"
	)
	r.MessagesConsumedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "queue",
			Name: "messages_consumed_total",
			Help: "Total messages consumed by topic and result.",
		},
		[]string{"topic", "result"}, // result: "success" | "error" | "retry"
	)
	r.MessageProcessDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: ns, Subsystem: "queue",
			Name:    "message_process_duration_seconds",
			Help:    "Message processing duration by topic.",
			Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 5, 30},
		},
		[]string{"topic"},
	)
	r.QueueDepth = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: ns, Subsystem: "queue",
			Name: "depth",
			Help: "Current number of messages waiting in queue.",
		},
		[]string{"queue"},
	)

	reg.MustRegister(
		r.MessagesPublishedTotal,
		r.MessagesConsumedTotal,
		r.MessageProcessDuration,
		r.QueueDepth,
	)
}

func (r *Registry) registerBusinessMetrics(reg *prometheus.Registry, ns string) {
	r.OrdersTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "business",
			Name: "orders_total",
			Help: "Total orders by status (created|paid|cancelled|refunded).",
		},
		[]string{"status"},
	)
	r.OrderValueUSD = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: ns, Subsystem: "business",
			Name:    "order_value_usd",
			Help:    "Distribution of order values in USD.",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000},
		},
		[]string{"status"},
	)
	r.UsersRegisteredTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: ns, Subsystem: "business",
		Name: "users_registered_total",
		Help: "Total number of completed user registrations.",
	})
	r.ProductsTotal = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns, Subsystem: "business",
		Name: "products_total",
		Help: "Current number of active products in the catalog.",
	})
	r.ActiveSessionsTotal = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: ns, Subsystem: "business",
		Name: "active_sessions_total",
		Help: "Number of active user sessions.",
	})
	r.CheckoutFunnelTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "business",
			Name: "checkout_funnel_total",
			Help: "Users at each stage of the checkout funnel.",
		},
		[]string{"stage"}, // "cart_viewed"|"checkout_started"|"payment_entered"|"order_placed"
	)

	reg.MustRegister(
		r.OrdersTotal,
		r.OrderValueUSD,
		r.UsersRegisteredTotal,
		r.ProductsTotal,
		r.ActiveSessionsTotal,
		r.CheckoutFunnelTotal,
	)
}

func (r *Registry) registerWorkerMetrics(reg *prometheus.Registry, ns string) {
	r.WorkerJobsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: ns, Subsystem: "worker",
			Name: "jobs_total",
			Help: "Total jobs processed by worker name and result.",
		},
		[]string{"worker", "result"}, // result: "success" | "error"
	)
	r.WorkerJobDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: ns, Subsystem: "worker",
			Name:    "job_duration_seconds",
			Help:    "Worker job execution duration.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"worker"},
	)
	// WorkerLastSuccessTime records Unix timestamp of last successful run.
	// Alert rule: time() - last_success > 3600 → worker has been silent > 1h.
	// This catches workers that crash silently — no error, just silence.
	r.WorkerLastSuccessTime = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: ns, Subsystem: "worker",
			Name: "last_success_timestamp_seconds",
			Help: "Unix timestamp of the last successful job completion.",
		},
		[]string{"worker"},
	)

	reg.MustRegister(
		r.WorkerJobsTotal,
		r.WorkerJobDuration,
		r.WorkerLastSuccessTime,
	)
}

// Gatherer returns the prometheus.Gatherer for use with promhttp.HandlerFor.
func (r *Registry) Gatherer() prometheus.Gatherer { return r.reg }

// ── Convenience helpers ───────────────────────────────────────────────────────
// These reduce boilerplate at call sites and enforce consistent label values.

// ObserveHTTP records a completed HTTP request.
// Call this at the END of every request (status code and duration are known).
func (r *Registry) ObserveHTTP(method, path, statusCode string, d time.Duration) {
	r.HTTPRequestsTotal.WithLabelValues(method, path, statusCode).Inc()
	r.HTTPRequestDuration.WithLabelValues(method, path).Observe(d.Seconds())
}

// ObserveDB records a database query duration.
// operation: "select" | "insert" | "update" | "delete" | "insert_tx"
// table:     the primary table affected, e.g. "users" | "orders"
func (r *Registry) ObserveDB(operation, table string, d time.Duration) {
	r.DBQueryDuration.WithLabelValues(operation, table).Observe(d.Seconds())
}

// UpdateDBPool reads current pool stats and updates the gauge metrics.
// Call this from a background goroutine every 15 seconds.
func (r *Registry) UpdateDBPool(stats sql.DBStats) {
	r.DBConnectionsInUse.Set(float64(stats.InUse))
	r.DBConnectionsIdle.Set(float64(stats.Idle))
	r.DBConnectionsMax.Set(float64(stats.MaxOpenConnections))
}

// RecordCacheResult records a cache hit or miss.
func (r *Registry) RecordCacheResult(cacheName string, hit bool) {
	if hit {
		r.CacheHitsTotal.WithLabelValues(cacheName).Inc()
	} else {
		r.CacheMissesTotal.WithLabelValues(cacheName).Inc()
	}
}
```

---

## 5. HTTP Metrics Middleware

```go
// internal/middleware/metrics.go
package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"myapp/pkg/metrics"
)

// MetricsMiddleware records RED metrics (Rate, Errors, Duration) for every
// HTTP request. It must be applied AFTER your router so that route patterns
// are available via chi.RouteContext.
func MetricsMiddleware(reg *metrics.Registry) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// ──- CRITICAL: Normalise the path BEFORE using it as a label ──────
			//
			// Raw path:    /api/v1/users/12345/orders/789
			// Route pattern: /api/v1/users/{userID}/orders/{orderID}   ← use this
			//
			// If you use the raw path as a metric label, every unique user ID
			// and order ID creates a new time series. With 10M users that is
			// 10M time series → Prometheus OOM crash. See Section 6 for details.
			path := routePattern(r)

			// Increment the active requests gauge BEFORE handling.
			// Decrement it AFTER (via defer) regardless of panic or error.
			reg.HTTPActiveRequests.Inc()
			defer reg.HTTPActiveRequests.Dec()

			// Wrap the ResponseWriter to capture the status code written.
			// Without this we cannot know the status after ServeHTTP returns.
			sw := &statusCapture{ResponseWriter: w, statusCode: http.StatusOK}

			start := time.Now()
			next.ServeHTTP(sw, r)
			duration := time.Since(start)

			reg.ObserveHTTP(
				r.Method,
				path,
				strconv.Itoa(sw.statusCode),
				duration,
			)
		})
	}
}

// routePattern extracts the route template from the chi router context.
// Falls back to r.URL.Path if chi is not in use.
// Examples:
//   /api/v1/users/12345         → /api/v1/users/{userID}
//   /api/v1/orders/abc/items/1  → /api/v1/orders/{orderID}/items/{itemID}
func routePattern(r *http.Request) string {
	chiCtx := chi.RouteContext(r.Context())
	if chiCtx != nil && chiCtx.RoutePattern() != "" {
		pattern := chiCtx.RoutePattern()
		// Remove trailing slashes for consistency.
		return strings.TrimRight(pattern, "/")
	}
	return r.URL.Path
}

// statusCapture wraps http.ResponseWriter to capture the status code.
// WriteHeader is idempotent — subsequent calls are ignored.
type statusCapture struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
	written      bool
}

func (sc *statusCapture) WriteHeader(code int) {
	if !sc.written {
		sc.statusCode = code
		sc.written = true
		sc.ResponseWriter.WriteHeader(code)
	}
}

func (sc *statusCapture) Write(b []byte) (int, error) {
	if !sc.written {
		sc.statusCode = http.StatusOK
		sc.written = true
	}
	n, err := sc.ResponseWriter.Write(b)
	sc.bytesWritten += int64(n)
	return n, err
}
```

---

## 6. The Cardinality Rule — The Most Important Rule

Cardinality = the number of unique time series stored in Prometheus. Too many = Prometheus runs out of memory and crashes. This kills ALL observability.

```
Safe metric label (low cardinality):
  status_code: ~10 unique values    (200, 201, 400, 401, 403, 404, 500 ...)
  method:       5 unique values     (GET, POST, PUT, DELETE, PATCH)
  path:        ~50 unique values    (/api/v1/users, /api/v1/orders ...)
  service:     ~15 unique values    (user-service, payment-service ...)

  Total series: 10 × 5 × 50 × 15 = 37,500   ← completely fine

Cardinality explosion (NEVER do this):
  user_id:    10,000,000 unique values  → 10M series per metric → OOM crash
  order_id:   unbounded
  request_id: unbounded
  product_sku: 1,000,000 unique values

  10M × 37,500 existing = 375 BILLION series → Prometheus crashes in seconds
```

```go
// ❌ WRONG — user_id as a metric label
httpRequests := prometheus.NewCounterVec(
    prometheus.CounterOpts{Name: "http_requests_total"},
    []string{"method", "path", "status_code", "user_id"}, // user_id: NEVER
)
// With 10M users, this creates 10M × 5 × 50 × 10 = 25 BILLION time series.

// ✅ CORRECT — user_id belongs in LOGS and TRACES, not metrics
httpRequests := prometheus.NewCounterVec(
    prometheus.CounterOpts{Name: "http_requests_total"},
    []string{"method", "path", "status_code"}, // safe: all low-cardinality
)

// ❌ WRONG — raw URL path as label
reg.HTTPRequestsTotal.WithLabelValues("GET", r.URL.Path, "200").Inc()
// /api/v1/users/123  →  new series
// /api/v1/users/456  →  new series
// /api/v1/users/789  →  new series ... 10M new series

// ✅ CORRECT — route pattern as label
reg.HTTPRequestsTotal.WithLabelValues("GET", "/api/v1/users/{id}", "200").Inc()
// All user requests → same single series

// Rule of thumb:
// If a label value can change per-request → it does NOT belong in metrics.
// Per-request data belongs in: LOGS (structured fields) or TRACES (span attributes).
```

---

## 7. Database Metrics

```go
// internal/user/repository/user_repo.go
package repository

import (
	"context"
	"database/sql"
	"time"

	"go.uber.org/zap"

	"myapp/pkg/logger"
	"myapp/pkg/metrics"
)

type UserRepository struct {
	db      *sql.DB
	metrics *metrics.Registry
	log     *zap.Logger
}

func New(db *sql.DB, m *metrics.Registry, log *zap.Logger) *UserRepository {
	return &UserRepository{db: db, metrics: m, log: log}
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*User, error) {
	log := logger.FromContext(ctx, r.log)

	start := time.Now()
	var user User
	err := r.db.QueryRowContext(ctx,
		"SELECT id, email, created_at FROM users WHERE id = $1 AND is_active = true",
		id,
	).Scan(&user.ID, &user.Email, &user.CreatedAt)
	elapsed := time.Since(start)

	// Record the query duration with operation and table labels.
	r.metrics.ObserveDB("select", "users", elapsed)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		log.Error("Failed to find user", zap.String("user_id", id), zap.Error(err))
		return nil, err
	}

	// Log slow queries — these indicate missing indexes or table scans.
	if elapsed > 100*time.Millisecond {
		log.Warn("Slow DB query on users table",
			zap.Duration("elapsed", elapsed),
			zap.String("operation", "select"),
		)
	}

	return &user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *User) error {
	log := logger.FromContext(ctx, r.log)

	start := time.Now()
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4)",
		user.ID, user.Email, user.PasswordHash, user.CreatedAt,
	)
	elapsed := time.Since(start)

	r.metrics.ObserveDB("insert", "users", elapsed)

	if err != nil {
		log.Error("Failed to create user", zap.Error(err), zap.Duration("elapsed", elapsed))
		return err
	}

	return nil
}

// ── DB Pool Monitor ──────────────────────────────────────────────────────────

// StartPoolMonitor runs in a background goroutine and updates the DB pool
// gauge metrics every 15 seconds. Cancel ctx to stop it.
//
// Without this, Prometheus sees the DB connection metrics as static zeros.
// Pool saturation > 80% is the #1 early warning signal before DB failures.
func StartPoolMonitor(ctx context.Context, db *sql.DB, m *metrics.Registry) {
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.UpdateDBPool(db.Stats())
			}
		}
	}()
}
```

---

## 8. Cache Metrics

```go
// internal/product/cache/product_cache.go
package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"

	"myapp/pkg/metrics"
)

type ProductCache struct {
	redis   *redis.Client
	metrics *metrics.Registry
	ttl     time.Duration
}

const cacheName = "product_page"

func (c *ProductCache) Get(ctx context.Context, productID string) (*Product, bool) {
	val, err := c.redis.Get(ctx, "product:"+productID).Result()
	if err != nil {
		// Cache miss: product not in Redis.
		// Record the miss BEFORE the DB call so the metric is accurate
		// even if the DB call panics.
		c.metrics.RecordCacheResult(cacheName, false) // hit=false → miss
		return nil, false
	}

	// Cache hit: product found in Redis.
	c.metrics.RecordCacheResult(cacheName, true) // hit=true

	var product Product
	if err := json.Unmarshal([]byte(val), &product); err != nil {
		return nil, false
	}
	return &product, true
}

func (c *ProductCache) Set(ctx context.Context, product *Product) error {
	data, err := json.Marshal(product)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, "product:"+product.ID, data, c.ttl).Err()
}

// ── Cache hit rate query in PromQL ────────────────────────────────────────────
//
// Cache hit rate % (last 5 minutes):
//   rate(myapp_cache_hits_total{cache="product_page"}[5m])
//   / (rate(myapp_cache_hits_total{cache="product_page"}[5m])
//      + rate(myapp_cache_misses_total{cache="product_page"}[5m]))
//
// If hit rate < 0.8 (80%), your cache TTL may be too short or the cache
// is being invalidated too aggressively.
```

---

## 9. Message Queue Metrics

```go
// internal/order/events/producer.go
package events

import (
	"context"
	"time"

	"myapp/pkg/metrics"
)

type OrderEventProducer struct {
	kafka   KafkaProducer
	metrics *metrics.Registry
}

func (p *OrderEventProducer) PublishOrderCreated(ctx context.Context, order *Order) error {
	start := time.Now()
	err := p.kafka.Publish(ctx, "orders.created", order)
	elapsed := time.Since(start)

	if err != nil {
		p.metrics.MessagesPublishedTotal.WithLabelValues("orders.created", "error").Inc()
		return err
	}

	p.metrics.MessagesPublishedTotal.WithLabelValues("orders.created", "success").Inc()
	_ = elapsed // optionally add a publish duration histogram
	return nil
}

// internal/notification/events/consumer.go
package events

import (
	"context"
	"time"

	"myapp/pkg/metrics"
)

type NotificationConsumer struct {
	metrics *metrics.Registry
}

func (c *NotificationConsumer) ProcessMessage(ctx context.Context, topic string, msg []byte) error {
	start := time.Now()

	err := c.handleMessage(ctx, topic, msg)
	elapsed := time.Since(start)

	// Record processing duration (histogram for percentiles).
	c.metrics.MessageProcessDuration.WithLabelValues(topic).Observe(elapsed.Seconds())

	if err != nil {
		c.metrics.MessagesConsumedTotal.WithLabelValues(topic, "error").Inc()
		return err
	}

	c.metrics.MessagesConsumedTotal.WithLabelValues(topic, "success").Inc()
	return nil
}

// ── Queue Depth Monitor ───────────────────────────────────────────────────────
// Poll queue depth from the Kafka/RabbitMQ management API every 30 seconds.
// High queue depth = consumers are falling behind = alert.
func (c *NotificationConsumer) StartDepthMonitor(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				depth, err := c.getQueueDepth(ctx)
				if err == nil {
					c.metrics.QueueDepth.WithLabelValues("notifications").Set(float64(depth))
				}
			}
		}
	}()
}
```

---

## 10. Business Metrics

Business metrics are the most important signals. "Are orders being placed?" matters more than "Is CPU at 80%?" in most e-commerce incident investigations.

```go
// internal/order/service/order_service.go
package service

import (
	"context"
	"time"

	"go.uber.org/zap"

	"myapp/pkg/logger"
	"myapp/pkg/metrics"
)

type OrderService struct {
	repo    OrderRepository
	metrics *metrics.Registry
	log     *zap.Logger
}

func (s *OrderService) Create(ctx context.Context, req CreateOrderRequest) (*Order, error) {
	log := logger.FromContext(ctx, s.log)

	// Track checkout funnel: user reached the "checkout started" stage.
	s.metrics.CheckoutFunnelTotal.WithLabelValues("checkout_started").Inc()

	order, err := s.repo.Create(ctx, req)
	if err != nil {
		// Count failed orders — but do NOT put order_id in the label (high cardinality).
		s.metrics.OrdersTotal.WithLabelValues("failed").Inc()
		log.Error("Failed to create order", zap.Error(err))
		return nil, err
	}

	// Count successful orders by status.
	s.metrics.OrdersTotal.WithLabelValues("created").Inc()

	// Record the order value distribution.
	// This lets you build revenue histograms: "what fraction of orders are > $100?"
	s.metrics.OrderValueUSD.WithLabelValues("created").Observe(order.TotalUSD)

	// Track funnel completion.
	s.metrics.CheckoutFunnelTotal.WithLabelValues("order_placed").Inc()

	log.Info("Order created",
		zap.String("order_id", order.ID),
		zap.Float64("total_usd", order.TotalUSD),
	)

	return order, nil
}

func (s *OrderService) Cancel(ctx context.Context, orderID string) error {
	if err := s.repo.UpdateStatus(ctx, orderID, "cancelled"); err != nil {
		return err
	}

	// Count cancellations — watch for spikes (may indicate a UX problem or fraud).
	s.metrics.OrdersTotal.WithLabelValues("cancelled").Inc()
	return nil
}

// internal/user/service/user_service.go
func (s *UserService) Register(ctx context.Context, req RegisterRequest) (*User, error) {
	user, err := s.repo.Create(ctx, ...)
	if err != nil {
		return nil, err
	}

	// Increment the monotonic user registration counter.
	// rate(users_registered_total[1h]) → registrations per second this hour.
	s.metrics.UsersRegisteredTotal.Inc()

	return user, nil
}

func (s *UserService) Login(ctx context.Context, req LoginRequest) (*AuthTokens, error) {
	// ...
	s.metrics.ActiveSessionsTotal.Inc()
	return tokens, nil
}

func (s *UserService) Logout(ctx context.Context, userID string) error {
	// ...
	s.metrics.ActiveSessionsTotal.Dec()
	return nil
}
```

---

## 11. Background Worker Metrics

Background workers fail silently. Metrics are the only way to detect them.

```go
// internal/worker/invoice_worker.go
package worker

import (
	"context"
	"time"

	"go.uber.org/zap"

	"myapp/pkg/metrics"
)

type InvoiceWorker struct {
	repo    InvoiceRepository
	metrics *metrics.Registry
	log     *zap.Logger
}

func (w *InvoiceWorker) Run(ctx context.Context) {
	workerName := "invoice_generator"

	start := time.Now()
	err := w.generateAllPendingInvoices(ctx)
	elapsed := time.Since(start)

	// Record job duration regardless of success or failure.
	w.metrics.WorkerJobDuration.WithLabelValues(workerName).Observe(elapsed.Seconds())

	if err != nil {
		w.metrics.WorkerJobsTotal.WithLabelValues(workerName, "error").Inc()
		w.log.Error("Invoice worker failed",
			zap.Duration("elapsed", elapsed),
			zap.Error(err),
		)
		return
	}

	w.metrics.WorkerJobsTotal.WithLabelValues(workerName, "success").Inc()

	// Record the Unix timestamp of the last successful run.
	// Alert rule: time() - last_success_timestamp_seconds > 3600
	// → worker has not succeeded in over 1 hour → page on-call.
	// This catches workers that crash silently with no error output.
	w.metrics.WorkerLastSuccessTime.WithLabelValues(workerName).SetToCurrentTime()

	w.log.Info("Invoice worker completed", zap.Duration("elapsed", elapsed))
}

func (w *InvoiceWorker) generateAllPendingInvoices(ctx context.Context) error {
	// ... implementation
	return nil
}
```

---

## 12. Go Runtime Metrics

These are free — registered automatically by `collectors.NewGoCollector()`. No extra code needed. They appear at `/metrics` automatically.

```
go_goroutines                     ← current goroutine count (spike = goroutine leak)
go_gc_duration_seconds            ← GC pause duration histogram
go_memstats_heap_alloc_bytes      ← current heap allocation
go_memstats_heap_inuse_bytes      ← heap memory in use
go_memstats_sys_bytes             ← total memory obtained from OS
go_memstats_gc_cpu_fraction       ← fraction of CPU time used by GC
process_resident_memory_bytes     ← RSS memory (from OS perspective)
process_cpu_seconds_total         ← CPU time used
process_open_fds                  ← open file descriptors (leak detector)
```

Useful alert rules for runtime metrics:

```yaml
# Goroutine leak — goroutine count grows without bound
- alert: GoroutineLeak
  expr: go_goroutines > 1000
  for: 10m

# Memory pressure — heap growing toward container limit
- alert: HighHeapMemory
  expr: go_memstats_heap_inuse_bytes / go_memstats_heap_sys_bytes > 0.85
  for: 5m

# GC thrashing — spending too much CPU on garbage collection
- alert: HighGCCPUFraction
  expr: rate(go_gc_duration_seconds_sum[5m]) > 0.1
  for: 5m
```

---

## 13. The Metrics Server — Internal Only

```go
// The /metrics endpoint exposes internal details:
// query counts, error rates, cache hit rates, business volumes.
// This information helps attackers understand your system.
// NEVER serve /metrics on your public API port.

// ✅ Correct: two separate servers
appServer := &http.Server{
    Addr:    ":8080", // public — load balancer routes traffic here
    Handler: appRouter,
}

// Internal metrics server — restrict at the network level:
//   Kubernetes: NetworkPolicy that only allows Prometheus to reach this port
//   AWS:        Security Group rule: port 9090 from Prometheus pod CIDR only
//   Docker:     Do NOT publish port 9090 with -p 9090:9090
metricsServer := &http.Server{
    Addr: ":9090", // internal only
    Handler: promhttp.HandlerFor(
        reg.Gatherer(),
        promhttp.HandlerOpts{
            EnableOpenMetrics: true, // enables OpenMetrics text format
        },
    ),
}

go metricsServer.ListenAndServe()

// Verify it works:
//   curl http://localhost:9090/metrics | head -30
//   # HELP ecommerce_api_http_requests_total Total HTTP requests ...
//   # TYPE ecommerce_api_http_requests_total counter
//   ecommerce_api_http_requests_total{method="GET",path="/api/v1/products",status_code="200"} 142
```

---

## 14. Prometheus Scrape Configuration

```yaml
# deployments/prometheus.yml
global:
  scrape_interval:     15s   # how often Prometheus polls /metrics
  evaluation_interval: 15s   # how often alert rules are evaluated

rule_files:
  - /etc/prometheus/alert-rules.yml

scrape_configs:
  # Your application
  - job_name: myapp
    static_configs:
      - targets: [myapp:9090]   # internal metrics port
    # Attach labels to every time series from this target
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # In Kubernetes, use ServiceMonitor CRD instead of static_configs:
  # apiVersion: monitoring.coreos.com/v1
  # kind: ServiceMonitor
  # metadata:
  #   name: myapp
  # spec:
  #   selector:
  #     matchLabels:
  #       app: myapp
  #   endpoints:
  #     - port: metrics      # the port named "metrics" in your Service
  #       interval: 15s
```

---

## 15. Alert Rules

```yaml
# deployments/alert-rules.yml
# Rule: alert on SYMPTOMS (what users experience), not CAUSES (what the infra is doing).
# Symptom: "5% of checkout requests are failing" — users are hurting.
# Cause:   "CPU is at 85%" — maybe users are hurting, maybe not.

groups:
  - name: http
    rules:
      # Error rate > 1% for 2 minutes = users are experiencing failures.
      - alert: HighHTTPErrorRate
        expr: |
          sum(rate(myapp_http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(myapp_http_requests_total[5m]))
          > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "HTTP error rate above 1%"
          description: "{{ $value | humanizePercentage }} of requests are failing."
          runbook: "https://wiki.mycompany.com/runbooks/high-error-rate"

      # P99 latency > 500ms for 5 minutes.
      - alert: SlowP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(myapp_http_request_duration_seconds_bucket[5m])) by (le, path)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 500ms on {{ $labels.path }}"

      # Service stops producing metrics → it may be completely down.
      # This catches crashes that wouldn't produce error-rate spikes.
      - alert: ServiceSilent
        expr: absent(myapp_http_requests_total)
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is not producing metrics — may be crashed"

  - name: database
    rules:
      # DB connection pool > 85% utilised for 5 minutes.
      # At 100%, requests start queuing, then timing out.
      - alert: DBConnectionPoolNearExhaustion
        expr: |
          myapp_db_connections_in_use
          / (myapp_db_connections_in_use + myapp_db_connections_idle)
          > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DB connection pool > 85% utilised"

      # P99 DB query latency > 500ms.
      - alert: SlowDBQueries
        expr: |
          histogram_quantile(0.99,
            rate(myapp_db_query_duration_seconds_bucket[5m])
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 DB query latency above 500ms"

  - name: business
    rules:
      # No orders created in 30 minutes during business hours.
      # This catches checkout bugs that infrastructure alerts miss.
      - alert: NoOrdersCreated
        expr: |
          rate(myapp_business_orders_total{status="created"}[30m]) == 0
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "No orders created in 30 minutes — checkout may be broken"

      # Checkout conversion rate dropped below 80%.
      # Monitors: of users who reach "checkout_started", how many place an order?
      - alert: CheckoutConversionRateLow
        expr: |
          rate(myapp_business_checkout_funnel_total{stage="order_placed"}[1h])
          / rate(myapp_business_checkout_funnel_total{stage="checkout_started"}[1h])
          < 0.80
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Checkout conversion rate below 80%"

  - name: workers
    rules:
      # Worker has not successfully completed a job in over 1 hour.
      # Background workers fail silently — this is the ONLY way to detect them.
      - alert: WorkerStuck
        expr: |
          time() - myapp_worker_last_success_timestamp_seconds > 3600
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Worker {{ $labels.worker }} has not succeeded in > 1 hour"

  - name: runtime
    rules:
      - alert: GoroutineLeak
        expr: go_goroutines > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Goroutine count above 1000 — possible goroutine leak"
```

---

## 16. Useful PromQL Queries

Copy these into Grafana panels or Prometheus Explore.

```promql
# ── HTTP ──────────────────────────────────────────────────────────────────────

# Request rate (requests per second over last 5 minutes)
rate(myapp_http_requests_total[5m])

# Error rate percentage
sum(rate(myapp_http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(myapp_http_requests_total[5m])) * 100

# Error rate per endpoint (shows which path is failing)
sum by (path) (rate(myapp_http_requests_total{status_code=~"5.."}[5m]))
/ sum by (path) (rate(myapp_http_requests_total[5m])) * 100

# P50, P90, P99 latency
histogram_quantile(0.50, sum(rate(myapp_http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(myapp_http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(myapp_http_request_duration_seconds_bucket[5m])) by (le))

# P99 latency per endpoint
histogram_quantile(0.99,
  sum by (le, path) (rate(myapp_http_request_duration_seconds_bucket[5m]))
)

# Active requests right now (saturation)
myapp_http_active_requests

# ── Database ──────────────────────────────────────────────────────────────────

# DB connection pool utilisation (0.0 to 1.0)
myapp_db_connections_in_use
/ (myapp_db_connections_in_use + myapp_db_connections_idle)

# P99 DB query latency
histogram_quantile(0.99,
  sum by (le, operation, table) (rate(myapp_db_query_duration_seconds_bucket[5m]))
)

# ── Cache ─────────────────────────────────────────────────────────────────────

# Cache hit rate per cache name
rate(myapp_cache_hits_total[5m])
/ (rate(myapp_cache_hits_total[5m]) + rate(myapp_cache_misses_total[5m]))

# ── Business ──────────────────────────────────────────────────────────────────

# Orders per minute
rate(myapp_business_orders_total{status="created"}[1m]) * 60

# Revenue per minute (sum of order values)
rate(myapp_business_order_value_usd_sum{status="created"}[1m]) * 60

# Average order value
rate(myapp_business_order_value_usd_sum{status="created"}[1h])
/ rate(myapp_business_order_value_usd_count{status="created"}[1h])

# Checkout conversion rate
rate(myapp_business_checkout_funnel_total{stage="order_placed"}[1h])
/ rate(myapp_business_checkout_funnel_total{stage="checkout_started"}[1h])

# User registration rate (per hour)
rate(myapp_business_users_registered_total[1h]) * 3600

# ── Workers ───────────────────────────────────────────────────────────────────

# Time since last successful worker run
time() - myapp_worker_last_success_timestamp_seconds

# Worker success rate
rate(myapp_worker_jobs_total{result="success"}[1h])
/ rate(myapp_worker_jobs_total[1h])
```

---

## 17. Wiring Everything in main.go

```go
// cmd/server/main.go
package main

import (
	"context"
	"database/sql"
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
	"myapp/internal/order/service"
	orderrepo "myapp/internal/order/repository"
	workerrepo "myapp/internal/worker"
	"myapp/pkg/logger"
	"myapp/pkg/metrics"
)

func main() {
	// ── 1. Logger (always first) ──────────────────────────────────────────
	log, atomicLevel, err := logger.New(logger.Config{
		Level: getEnv("LOG_LEVEL", "info"),
		Format: getEnv("LOG_FORMAT", "json"),
		ServiceName: "ecommerce-api",
		Version: getEnv("APP_VERSION", "1.0.0"),
		Environment: getEnv("APP_ENV", "production"),
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: logger init: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	// Log startup config — everything EXCEPT secrets (passwords, keys, tokens).
	log.Info("Application starting",
		zap.String("version", getEnv("APP_VERSION", "1.0.0")),
		zap.String("env", getEnv("APP_ENV", "production")),
		zap.String("db_host", getEnv("DB_HOST", "localhost")),
		zap.Int("db_max_conns", 25),
		// NEVER: DB_PASSWORD, JWT_SECRET, API_KEY
	)

	// ── 2. Metrics ────────────────────────────────────────────────────────
	reg, err := metrics.New("ecommerce_api")
	if err != nil {
		log.Fatal("Failed to initialise metrics registry", zap.Error(err))
	}

	// ── 3. Database ───────────────────────────────────────────────────────
	db, err := sql.Open("postgres", getEnv("DATABASE_URL", "postgres://..."))
	if err != nil {
		log.Fatal("Cannot open database connection", zap.Error(err))
	}
	defer db.Close()
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Start the DB pool monitor in a background goroutine.
	// It polls db.Stats() every 15s and updates the pool gauges.
	monitorCtx, monitorCancel := context.WithCancel(context.Background())
	defer monitorCancel()
	repository.StartPoolMonitor(monitorCtx, db, reg)

	log.Info("Database connected",
		zap.String("host", getEnv("DB_HOST", "localhost")),
	)

	// ── 4. Dependency injection ───────────────────────────────────────────
	orderRepo := orderrepo.New(db, reg, log)
	orderSvc  := service.New(orderRepo, reg, log)
	invoiceWorker := worker.New(orderRepo, reg, log)

	// ── 5. Router + middleware stack ──────────────────────────────────────
	r := chi.NewRouter()
	r.Use(appmw.Recovery(log))
	r.Use(appmw.TracingMiddleware(log))       // add trace_id to logger
	r.Use(appmw.RequestLogger(log))           // log one entry per request
	r.Use(appmw.MetricsMiddleware(reg))       // record RED metrics

	// Internal endpoints — NOT on the public router
	r.Get("/health", healthHandler(db))
	r.Get("/ready",  readyHandler(db))
	r.Mount("/internal/log-level", atomicLevel)

	// Public API
	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/orders", orderHandler.Create)
		r.Get("/orders/{id}", orderHandler.GetByID)
	})

	// ── 6. Application server (public) ───────────────────────────────────
	appServer := &http.Server{
		Addr:         ":" + getEnv("HTTP_PORT", "8080"),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ── 7. Metrics server (INTERNAL ONLY) ─────────────────────────────────
	// Restrict at the network layer (NetworkPolicy / Security Group):
	//   allow: Prometheus pod → port 9090
	//   deny:  everything else → port 9090
	metricsRouter := chi.NewRouter()
	metricsRouter.Handle("/metrics", promhttp.HandlerFor(
		reg.Gatherer(),
		promhttp.HandlerOpts{EnableOpenMetrics: true},
	))
	metricsServer := &http.Server{
		Addr:    ":" + getEnv("METRICS_PORT", "9090"),
		Handler: metricsRouter,
	}

	go func() {
		log.Info("Application server started", zap.String("addr", appServer.Addr))
		if err := appServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal("Application server crashed", zap.Error(err))
		}
	}()

	go func() {
		log.Info("Metrics server started", zap.String("addr", metricsServer.Addr))
		if err := metricsServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal("Metrics server crashed", zap.Error(err))
		}
	}()

	// ── 8. Background workers ─────────────────────────────────────────────
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-workerCtx.Done():
				return
			case <-ticker.C:
				invoiceWorker.Run(workerCtx)
			}
		}
	}()

	// ── 9. Graceful shutdown ──────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	log.Info("Shutdown signal received", zap.String("signal", sig.String()))

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := appServer.Shutdown(shutdownCtx); err != nil {
		log.Error("Graceful shutdown failed", zap.Error(err))
	}
	if err := metricsServer.Shutdown(shutdownCtx); err != nil {
		log.Error("Metrics server shutdown failed", zap.Error(err))
	}

	log.Info("Application shutdown complete")
}

func healthHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok"}`)
	}
}

func readyHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprintf(w, `{"status":"not_ready","reason":"database_unreachable"}`)
			return
		}
		fmt.Fprintf(w, `{"status":"ready"}`)
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
```

---

## 18. Testing Your Metrics

```go
// pkg/metrics/metrics_test.go
package metrics_test

import (
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetrics_HTTPRequestsCounter(t *testing.T) {
	// Use a FRESH registry for every test — never share registries between tests.
	// The global default registry accumulates state across tests causing
	// "metric already registered" panics.
	reg, err := New("test_service")
	require.NoError(t, err)

	// Record three requests: two 200s and one 500.
	reg.ObserveHTTP("GET", "/api/v1/users", "200", 50*time.Millisecond)
	reg.ObserveHTTP("GET", "/api/v1/users", "200", 80*time.Millisecond)
	reg.ObserveHTTP("POST", "/api/v1/orders", "500", 120*time.Millisecond)

	// testutil.ToFloat64 reads the current value of a counter.
	total200s := testutil.ToFloat64(
		reg.HTTPRequestsTotal.WithLabelValues("GET", "/api/v1/users", "200"),
	)
	total500s := testutil.ToFloat64(
		reg.HTTPRequestsTotal.WithLabelValues("POST", "/api/v1/orders", "500"),
	)

	assert.Equal(t, float64(2), total200s)
	assert.Equal(t, float64(1), total500s)
}

func TestMetrics_OrdersBusinessMetric(t *testing.T) {
	reg, err := New("test_service")
	require.NoError(t, err)

	reg.OrdersTotal.WithLabelValues("created").Inc()
	reg.OrdersTotal.WithLabelValues("created").Inc()
	reg.OrdersTotal.WithLabelValues("cancelled").Inc()

	created := testutil.ToFloat64(reg.OrdersTotal.WithLabelValues("created"))
	cancelled := testutil.ToFloat64(reg.OrdersTotal.WithLabelValues("cancelled"))

	assert.Equal(t, float64(2), created)
	assert.Equal(t, float64(1), cancelled)
}

func TestMetrics_DBPoolGauges(t *testing.T) {
	reg, err := New("test_service")
	require.NoError(t, err)

	reg.DBConnectionsInUse.Set(18)
	reg.DBConnectionsIdle.Set(7)
	reg.DBConnectionsMax.Set(25)

	assert.Equal(t, float64(18), testutil.ToFloat64(reg.DBConnectionsInUse))
	assert.Equal(t, float64(7),  testutil.ToFloat64(reg.DBConnectionsIdle))
	assert.Equal(t, float64(25), testutil.ToFloat64(reg.DBConnectionsMax))
}

func TestMetrics_CacheHitRate(t *testing.T) {
	reg, err := New("test_service")
	require.NoError(t, err)

	// Simulate 80% hit rate: 4 hits, 1 miss.
	for i := 0; i < 4; i++ {
		reg.RecordCacheResult("product_page", true)
	}
	reg.RecordCacheResult("product_page", false)

	hits   := testutil.ToFloat64(reg.CacheHitsTotal.WithLabelValues("product_page"))
	misses := testutil.ToFloat64(reg.CacheMissesTotal.WithLabelValues("product_page"))

	assert.Equal(t, float64(4), hits)
	assert.Equal(t, float64(1), misses)
	assert.InDelta(t, 0.8, hits/(hits+misses), 0.001)
}

func TestMetrics_WorkerLastSuccessTime(t *testing.T) {
	reg, err := New("test_service")
	require.NoError(t, err)

	before := float64(time.Now().Unix() - 1)
	reg.WorkerLastSuccessTime.WithLabelValues("invoice_generator").SetToCurrentTime()
	after := float64(time.Now().Unix() + 1)

	ts := testutil.ToFloat64(reg.WorkerLastSuccessTime.WithLabelValues("invoice_generator"))

	assert.GreaterOrEqual(t, ts, before)
	assert.LessOrEqual(t, ts, after)
}

func TestMetrics_HTTPHistogramRecordsCorrectBucket(t *testing.T) {
	reg, err := New("test_service")
	require.NoError(t, err)

	// Record a 75ms request — should fall in the 0.05–0.1 bucket.
	reg.ObserveHTTP("GET", "/api/v1/products", "200", 75*time.Millisecond)

	// CollectAndCompare verifies the metric against expected output.
	expected := `
		# HELP test_service_http_requests_total Total HTTP requests partitioned by method, path, and status_code.
		# TYPE test_service_http_requests_total counter
		test_service_http_requests_total{method="GET",path="/api/v1/products",status_code="200"} 1
	`
	err = testutil.CollectAndCompare(
		reg.HTTPRequestsTotal,
		strings.NewReader(expected),
		"test_service_http_requests_total",
	)
	assert.NoError(t, err)
}
```

---

## 19. Production Checklist

```
METRIC TYPES
  ✅ Counter for totals that only go up: requests, errors, orders, registrations
  ✅ Gauge for current values that go up/down: connections, goroutines, queue depth
  ✅ Histogram for latency and size distributions (P50/P90/P99)
  ✅ Never using Summary for distributed services (cannot aggregate across instances)

CARDINALITY (MOST IMPORTANT)
  ✅ No user_id, order_id, product_id, request_id as metric labels
  ✅ Route PATTERN used as path label (/users/{id}), not raw URL (/users/12345)
  ✅ Every label has < 100 unique values
  ✅ Have checked max cardinality: product of all label value counts < 100,000 per metric
  ✅ High-cardinality data is in LOGS (zap fields) and TRACES (span attributes), not metrics

HTTP METRICS
  ✅ HTTPRequestsTotal counter: method + path + status_code labels
  ✅ HTTPRequestDuration histogram: method + path labels
  ✅ HTTPActiveRequests gauge: no labels
  ✅ Histogram buckets tuned around SLO boundary (e.g. bucket at 0.5 if SLO is 500ms)
  ✅ Middleware applied AFTER router so route patterns are available

DATABASE METRICS
  ✅ DBQueryDuration histogram: operation + table labels
  ✅ DB pool gauges: in_use, idle, max — polled every 15s by background goroutine
  ✅ Pool monitor goroutine started at startup, cancelled on shutdown

CACHE METRICS
  ✅ CacheHitsTotal counter: cache name label
  ✅ CacheMissesTotal counter: cache name label
  ✅ Hit rate queryable: hits / (hits + misses)

BUSINESS METRICS
  ✅ Orders counted by status (created, paid, cancelled, refunded)
  ✅ Order value distribution (histogram — not just average)
  ✅ User registration counter
  ✅ Checkout funnel stages tracked
  ✅ Active session gauge

WORKER METRICS
  ✅ WorkerLastSuccessTime gauge set with SetToCurrentTime() after every success
  ✅ Alert rule: time() - last_success > 3600 → worker stuck
  ✅ Job duration histogram per worker
  ✅ Job success/error counter per worker

ALERTING
  ✅ Alerts are symptom-based (error rate, latency) not cause-based (CPU, memory)
  ✅ HighHTTPErrorRate: > 1% errors for 2 minutes → critical
  ✅ SlowP99Latency: P99 > 500ms for 5 minutes → warning
  ✅ ServiceSilent: absent(metric) for 1 minute → critical
  ✅ DBConnectionPoolNearExhaustion: > 85% for 5 minutes → warning
  ✅ NoOrdersCreated: no orders for 30 minutes during business hours → warning
  ✅ WorkerStuck: last success > 1 hour ago → warning
  ✅ Every alert has a runbook link in annotations

INFRASTRUCTURE
  ✅ Custom registry (not prometheus.DefaultRegisterer)
  ✅ Go runtime collectors registered: collectors.NewGoCollector()
  ✅ Metrics server on SEPARATE internal port (9090), never the public port
  ✅ Network-level restriction: only Prometheus can reach the metrics port
  ✅ OpenMetrics format enabled: promhttp.HandlerOpts{EnableOpenMetrics: true}

TESTING
  ✅ Fresh registry per test (never share or use global default)
  ✅ testutil.ToFloat64() used to assert counter and gauge values
  ✅ testutil.CollectAndCompare() used to verify full metric output
  ✅ Tests cover: increment, decrement, observe, and label combinations
```

---

_Metrics without alerts are decoration. Alerts without runbooks are noise. Build all three: instrument your code, write alert rules on symptoms, and write a runbook for every alert that tells the on-call engineer exactly what to look at and what to do._