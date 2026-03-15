# The Complete Guide to Golang Metrics with Prometheus

> _A production-level deep dive for developers who want to measure everything, understand system behaviour in real time, and build alerting that catches problems before users do._

---

## Table of Contents

1. [The Problem Prometheus Was Born to Solve](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#1-the-problem-prometheus-was-born-to-solve)
2. [What is Prometheus?](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#2-what-is-prometheus)
3. [How Prometheus Works Internally — The Pull Model](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#3-how-prometheus-works-internally--the-pull-model)
4. [The Four Metric Types](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#4-the-four-metric-types)
5. [The Prometheus Ecosystem — Components You Must Know](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#5-the-prometheus-ecosystem--components-you-must-know)
6. [Installing the Go Prometheus Client](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#6-installing-the-go-prometheus-client)
7. [Your First Metrics — The Default Go Runtime Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#7-your-first-metrics--the-default-go-runtime-metrics)
8. [Counter — Counting Things That Only Go Up](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#8-counter--counting-things-that-only-go-up)
9. [Gauge — Measuring Things That Go Up and Down](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#9-gauge--measuring-things-that-go-up-and-down)
10. [Histogram — Measuring Distributions and Latency](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#10-histogram--measuring-distributions-and-latency)
11. [Summary — Client-Side Quantiles](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#11-summary--client-side-quantiles)
12. [Labels on Metrics — The Power Multiplier](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#12-labels-on-metrics--the-power-multiplier)
13. [Registering Metrics — The Right Way](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#13-registering-metrics--the-right-way)
14. [HTTP Middleware — Instrumenting Every Request](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#14-http-middleware--instrumenting-every-request)
15. [Instrumenting Database Operations](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#15-instrumenting-database-operations)
16. [Instrumenting Redis Cache Operations](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#16-instrumenting-redis-cache-operations)
17. [Instrumenting RabbitMQ Publishers and Consumers](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#17-instrumenting-rabbitmq-publishers-and-consumers)
18. [Instrumenting Background Workers and Goroutines](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#18-instrumenting-background-workers-and-goroutines)
19. [Custom Business Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#19-custom-business-metrics)
20. [PromQL — Querying Your Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#20-promql--querying-your-metrics)
21. [Alerting with Prometheus and Alertmanager](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#21-alerting-with-prometheus-and-alertmanager)
22. [Prometheus with Docker and Docker Compose](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#22-prometheus-with-docker-and-docker-compose)
23. [Prometheus with Kubernetes — ServiceMonitor and PodMonitor](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#23-prometheus-with-kubernetes--servicemonitor-and-podmonitor)
24. [Grafana Dashboards for Go Services](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#24-grafana-dashboards-for-go-services)
25. [The RED Method — A Framework for Service Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#25-the-red-method--a-framework-for-service-metrics)
26. [The USE Method — A Framework for Resource Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#26-the-use-method--a-framework-for-resource-metrics)
27. [Performance and Cardinality Best Practices](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#27-performance-and-cardinality-best-practices)
28. [Testing Your Metrics](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#28-testing-your-metrics)
29. [Production Best Practices Checklist](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#29-production-best-practices-checklist)
30. [Full Production Reference Implementation](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#30-full-production-reference-implementation)

---

## 1. The Problem Prometheus Was Born to Solve

Logging, as you learned in the Zap and Loki guides, tells you _what happened_. It gives you a narrative — a story of individual events. But logs alone cannot answer a different class of question: _how is the system behaving right now, and how has that behaviour changed over time?_

Imagine you deploy a new version of your Go service at 3 PM on a Tuesday. The logs look normal — no errors, no panics. But at 3:15 PM your users start complaining that the checkout page feels slow. You look at the error logs: nothing. You look at the info logs: requests are being processed. But something is clearly wrong.

What you need in that moment is not more logs. What you need are **metrics** — numeric measurements collected continuously over time that reveal trends, degradations, and anomalies. You need to be able to ask: _What was the average response time of my checkout endpoint at 3:05 PM versus 3:15 PM? How many database connections are currently open? How much heap memory is Go's garbage collector managing? How many messages are sitting unprocessed in the RabbitMQ queue?_

Prometheus was created at SoundCloud in 2012 and donated to the Cloud Native Computing Foundation in 2016, where it became the second graduated project after Kubernetes. Today it is the de facto standard for metrics in the cloud-native ecosystem, used by companies from startups to Netflix, Cloudflare, and GitLab. Its design is deliberately simple, its data model is elegant, and its query language PromQL is among the most expressive time-series query languages ever designed.

---

## 2. What is Prometheus?

Prometheus is a time-series database and monitoring system. At its heart, it periodically visits your running application at a designated HTTP endpoint (called the **metrics endpoint**, conventionally at `/metrics`), reads the current values of all the metrics your application exposes, and stores those values as time-series data — each data point stamped with a Unix millisecond timestamp.

Over hours and days, Prometheus accumulates a dense history of measurements. It can then answer questions like: _"What was the 99th percentile latency of my order-creation endpoint over the last 24 hours, broken down by HTTP status code?"_ or _"At what rate are errors occurring right now, compared to the same time last week?"_

The key insight that makes Prometheus elegant is its **data model**. Every metric in Prometheus is identified by a **metric name** and a set of **labels** (key-value pairs). For example:

```
http_requests_total{method="POST", path="/api/v1/orders", status="200"} 4821
http_requests_total{method="POST", path="/api/v1/orders", status="500"} 12
http_requests_total{method="GET",  path="/api/v1/orders", status="200"} 9034
```

Each unique combination of metric name and label set is an independent time series. This model is immensely powerful because it lets you slice and aggregate any metric along any dimension — by endpoint, by status code, by region, by service version — using PromQL at query time, without having to pre-define what aggregations you want when you instrument your code.

---

## 3. How Prometheus Works Internally — The Pull Model

The most distinctive architectural decision Prometheus makes is the **pull model**. Unlike many monitoring systems where applications actively push metrics to a central collector, Prometheus works the other way around: it actively reaches out to your application and _pulls_ the current metric values on a configurable schedule (typically every 15 or 30 seconds).

```
ASCII Diagram: Prometheus Pull Architecture

  ┌──────────────────────────────────────────────────────────────────────┐
  │                         YOUR GO SERVICE                              │
  │                                                                      │
  │   Business Logic                                                     │
  │   ┌──────────────────────────────────────────────┐                  │
  │   │  handler.go  → requests_total.Inc()           │                  │
  │   │  service.go  → order_duration.Observe(d)      │                  │
  │   │  repo.go     → db_query_duration.Observe(d)   │                  │
  │   └──────────────────────────────────────────────┘                  │
  │                          │                                           │
  │                          ▼                                           │
  │   In-Memory Registry (prometheus.DefaultRegisterer)                  │
  │   ┌──────────────────────────────────────────────┐                  │
  │   │  http_requests_total          = 4821          │                  │
  │   │  http_request_duration_seconds histogram      │                  │
  │   │  go_goroutines                = 42            │  ◄─────────────┐│
  │   │  go_memstats_alloc_bytes      = 14MB          │                ││
  │   │  process_cpu_seconds_total    = 12.4          │                ││
  │   └──────────────────────────────────────────────┘                  ││
  │                          │                                           ││
  │   HTTP /metrics endpoint (promhttp.Handler())                        ││
  │   ┌──────────────────────────────────────────────┐                  ││
  │   │  # HELP http_requests_total ...               │                  ││
  │   │  # TYPE http_requests_total counter           │                  ││
  │   │  http_requests_total{...} 4821                │                  ││
  │   │  ...                                          │ ◄── GET /metrics ││
  │   └──────────────────────────────────────────────┘                  ││
  └──────────────────────────────────────────────────────────────────────┘│
                                                                          │
  ┌───────────────────────────────────┐                                   │
  │         PROMETHEUS SERVER         │   scrapes every 15 seconds        │
  │                                   │ ──────────────────────────────────┘
  │  ┌───────────────────────────┐    │
  │  │  Scrape Manager           │    │
  │  │  (visits each target)     │    │
  │  └───────────┬───────────────┘    │
  │              ▼                    │
  │  ┌───────────────────────────┐    │
  │  │  TSDB (Time Series DB)    │    │
  │  │  Stores metric samples    │    │
  │  │  with millisecond stamps  │    │
  │  └───────────┬───────────────┘    │
  │              ▼                    │
  │  ┌───────────────────────────┐    │
  │  │  HTTP Query API (:9090)   │    │
  │  │  Accepts PromQL queries   │    │
  │  └───────────────────────────┘    │
  └───────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────┐
  │         GRAFANA                   │
  │  Visualizes PromQL query results  │
  │  as graphs, gauges, heatmaps      │
  └───────────────────────────────────┘
```

The pull model has several practical advantages. Since Prometheus is the one initiating connections, you always know exactly which services are being monitored and which are not. If a service disappears, Prometheus detects it immediately as a scrape failure, which itself becomes an alertable condition. With a push model, a silent service and a stopped service look identical — both stop sending data.

---

## 4. The Four Metric Types

Prometheus defines exactly four metric types. These four types cover virtually every measurement you will ever want to make about a software system. Understanding each type — not just how to use it, but _why_ it exists — is the foundation of effective instrumentation.

```
ASCII Diagram: The Four Prometheus Metric Types

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                      FOUR METRIC TYPES                                   │
  ├────────────────┬─────────────────────────────────────────────────────────┤
  │   COUNTER      │  A value that only ever increases (or resets to zero    │
  │                │  on service restart). Perfect for counting events.       │
  │                │  Examples: total HTTP requests, total errors,            │
  │                │  total bytes sent, total orders placed.                  │
  │                │                                                          │
  │                │  ████████████████████████►  (always going right)        │
  ├────────────────┼─────────────────────────────────────────────────────────┤
  │   GAUGE        │  A value that can freely go up or down. Perfect for     │
  │                │  measuring current state.                                │
  │                │  Examples: active goroutines, DB connection pool size,   │
  │                │  queue depth, memory usage, temperature.                 │
  │                │                                                          │
  │                │  ▲  ████  ██                                             │
  │                │  │ █    ██  █████                                        │
  │                │  └────────────────►  (fluctuates)                        │
  ├────────────────┼─────────────────────────────────────────────────────────┤
  │   HISTOGRAM    │  Samples observations and counts them in configurable    │
  │                │  buckets. Calculates sum and count. Used for latency,    │
  │                │  request sizes. Aggregatable across instances.           │
  │                │  Examples: HTTP duration, DB query time, payload size.   │
  │                │                                                          │
  │                │  Buckets: [0.005s][0.01s][0.025s][0.05s][0.1s][+Inf]   │
  │                │  Count:      12      28      55      71     78    80     │
  ├────────────────┼─────────────────────────────────────────────────────────┤
  │   SUMMARY      │  Like Histogram but calculates quantiles on the client  │
  │                │  side. NOT aggregatable across instances.                │
  │                │  Use Histogram in production for most cases.             │
  │                │  Examples: same as histogram, but when you need exact   │
  │                │  quantiles and have only one instance.                   │
  └────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. The Prometheus Ecosystem — Components You Must Know

```
ASCII Diagram: Full Prometheus Ecosystem

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    METRIC PRODUCERS                                      │
  │  Go Service  │  Node Exporter  │  Postgres Exporter  │  Redis Exporter  │
  └──────┬───────┴────────┬────────┴──────────┬──────────┴──────────┬───────┘
         │                │                   │                     │
         │  /metrics      │  /metrics         │  /metrics           │  /metrics
         └────────────────┴───────────────────┴─────────────────────┘
                                          │
                                          ▼  scrapes (pull)
  ┌───────────────────────────────────────────────────────────────────────┐
  │                     PROMETHEUS SERVER                                  │
  │                                                                        │
  │  ┌───────────────────────────────────────────────────────────────┐    │
  │  │  prometheus.yml (scrape config)                                │    │
  │  │  - job: go-services  targets: [svc1:8080, svc2:8080]          │    │
  │  │  - job: postgres     targets: [postgres-exporter:9187]        │    │
  │  │  - job: node         targets: [node-exporter:9100]            │    │
  │  └───────────────────────────────────────────────────────────────┘    │
  │                             │                                          │
  │                     TSDB (Local Storage)                               │
  │                     15 days default retention                          │
  └──────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────────┐
              │                  │                       │
              ▼                  ▼                       ▼
  ┌───────────────┐   ┌────────────────────┐  ┌─────────────────────┐
  │    Grafana    │   │   Alertmanager     │  │  Remote Write       │
  │               │   │                   │  │  (long-term storage)│
  │  Dashboards,  │   │  Routes alerts to: │  │                     │
  │  panels,      │   │  - PagerDuty       │  │  Thanos / Cortex /  │
  │  heatmaps,    │   │  - Slack           │  │  Mimir / VictoriaM  │
  │  stat panels  │   │  - Email           │  │  (multi-year retain)│
  └───────────────┘   │  - OpsGenie        │  └─────────────────────┘
                      └────────────────────┘
```

**Prometheus Server** is the core — it scrapes, stores, and queries metrics. **Node Exporter** exposes host-level metrics (CPU, memory, disk, network) from every machine. **Exporters** are adapters for third-party systems like PostgreSQL, Redis, RabbitMQ, and Nginx that translate their internal stats into the Prometheus exposition format. **Alertmanager** receives firing alerts from Prometheus, deduplicates them, groups them, and routes them to the right notification channels. **Grafana** visualizes PromQL query results as rich dashboards.

---

## 6. Installing the Go Prometheus Client

```bash
# Core client library
go get github.com/prometheus/client_golang/prometheus

# HTTP handler that serves the /metrics endpoint
go get github.com/prometheus/client_golang/prometheus/promhttp

# Collectors for Go runtime and process stats (usually included automatically)
go get github.com/prometheus/client_golang/prometheus/collectors
```

The minimal working example — exposing the `/metrics` endpoint in 10 lines:

```go
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    // The default registry already contains Go runtime and process metrics.
    // Just serve it at /metrics.
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

Visit `http://localhost:8080/metrics` and you will already see hundreds of metrics about your Go runtime: goroutine count, GC pause duration, heap size, CPU usage, and more — all for free, with zero instrumentation of your business logic.

---

## 7. Your First Metrics — The Default Go Runtime Metrics

The Prometheus Go client automatically registers a rich set of metrics about the Go runtime and the operating system process. Understanding these metrics is important because they are the first place you look when a Go service is behaving strangely.

```
ASCII Diagram: Default Metrics Categories

  ┌──────────────────────────────────────────────────────────────────────────┐
  │               DEFAULT PROMETHEUS GO METRICS                              │
  ├──────────────────────────┬───────────────────────────────────────────────┤
  │  go_goroutines           │ Number of active goroutines. Sudden spikes    │
  │                          │ indicate goroutine leaks.                     │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  go_gc_duration_seconds  │ Histogram of GC stop-the-world pause          │
  │                          │ duration. High values cause latency spikes.   │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  go_memstats_alloc_bytes │ Bytes currently allocated and still in use.   │
  │                          │ Watch for unexplained growth (memory leak).   │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  go_memstats_heap_sys_   │ Bytes obtained from OS for heap. Growing      │
  │  bytes                   │ without bound indicates memory pressure.      │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  process_cpu_seconds_    │ Total user+system CPU time consumed.          │
  │  total                   │ rate() of this gives CPU usage %.             │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  process_open_fds        │ Number of open file descriptors. Near the     │
  │                          │ OS limit causes "too many open files" errors. │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │  process_resident_memory │ Physical RAM used by the process.             │
  │  _bytes                  │                                               │
  └──────────────────────────┴───────────────────────────────────────────────┘
```

---

## 8. Counter — Counting Things That Only Go Up

A Counter is the simplest and most commonly used metric type. It represents a monotonically increasing count. You increment it when an event occurs. On its own, the raw counter value is not very useful — what you really care about is the **rate of change**, which PromQL's `rate()` function calculates for you. Think of a car's odometer: the total miles driven only goes up, but what you care about at any moment is the current speed (the rate of change).

```go
package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
    // HTTPRequestsTotal counts every HTTP request, labelled by method, path, and status.
    HTTPRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests received, partitioned by method, path, and status code.",
        },
        []string{"method", "path", "status_code"},
    )

    // OrdersCreatedTotal counts successfully created orders.
    OrdersCreatedTotal = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "orders_created_total",
            Help: "Total number of orders successfully created.",
        },
    )

    // PaymentErrorsTotal counts payment failures, labelled by error type.
    PaymentErrorsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "payment_errors_total",
            Help: "Total number of payment processing errors, partitioned by error type.",
        },
        []string{"error_type", "gateway"},
    )

    // DBQueriesTotal counts database queries, labelled by operation and table.
    DBQueriesTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "db_queries_total",
            Help: "Total number of database queries executed.",
        },
        []string{"operation", "table", "status"},
    )
)
```

Using counters in your application code:

```go
// In your HTTP handler (or middleware — see Section 14)
HTTPRequestsTotal.WithLabelValues("POST", "/api/v1/orders", "201").Inc()

// In your order service
OrdersCreatedTotal.Inc()

// In your payment service
PaymentErrorsTotal.WithLabelValues("timeout", "stripe").Inc()

// In your database repository
DBQueriesTotal.WithLabelValues("INSERT", "orders", "success").Inc()
DBQueriesTotal.WithLabelValues("INSERT", "orders", "error").Inc()
```

In PromQL, to get the current request rate per second over the last 5 minutes:

```promql
rate(http_requests_total[5m])
```

---

## 9. Gauge — Measuring Things That Go Up and Down

A Gauge represents a measurement that can freely increase or decrease — the current snapshot of some value. Unlike a Counter, you do not increment a Gauge; you `Set()` it to the current value, or use `Inc()`/`Dec()` for relative changes.

```go
package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
    // ActiveHTTPConnections tracks the number of currently open HTTP connections.
    ActiveHTTPConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "http_connections_active",
            Help: "Current number of active HTTP connections being processed.",
        },
    )

    // DBConnectionPoolSize tracks the current size of each pool.
    DBConnectionPoolSize = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "db_connection_pool_size",
            Help: "Current number of connections in the database pool.",
        },
        []string{"state"}, // "idle", "in_use", "max"
    )

    // RabbitMQQueueDepth tracks how many messages are waiting in each queue.
    RabbitMQQueueDepth = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "rabbitmq_queue_depth",
            Help: "Current number of messages waiting in each RabbitMQ queue.",
        },
        []string{"queue"},
    )

    // CacheSize tracks the number of items currently held in an in-memory cache.
    CacheSize = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "cache_items_total",
            Help: "Current number of items held in the in-memory cache.",
        },
        []string{"cache_name"},
    )

    // LastCronJobRunTime records when each background job last ran (Unix timestamp).
    // Alerting on this metric lets you detect stuck cron jobs.
    LastCronJobRunTime = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "cron_job_last_run_timestamp_seconds",
            Help: "Unix timestamp of the last successful run of each cron job.",
        },
        []string{"job_name"},
    )
)
```

Using gauges in your application code:

```go
// When a request arrives and when it completes
ActiveHTTPConnections.Inc()
defer ActiveHTTPConnections.Dec()

// Periodically update DB pool stats from your sql.DB stats
stats := db.Stats()
DBConnectionPoolSize.WithLabelValues("idle").Set(float64(stats.Idle))
DBConnectionPoolSize.WithLabelValues("in_use").Set(float64(stats.InUse))
DBConnectionPoolSize.WithLabelValues("max").Set(float64(stats.MaxOpenConnections))

// After successfully processing a RabbitMQ message or publishing
RabbitMQQueueDepth.WithLabelValues("order.created").Set(float64(depth))

// After a cron job completes successfully
LastCronJobRunTime.WithLabelValues("invoice-generator").SetToCurrentTime()
```

---

## 10. Histogram — Measuring Distributions and Latency

The Histogram is the most sophisticated and most important metric type for a backend service. It allows you to measure not just the _average_ of a value, but the full _distribution_ — and from the distribution, you can calculate percentiles (also called quantiles).

Why do percentiles matter so much? Because averages lie. If your endpoint has an average response time of 50ms, that sounds fine. But the average hides the fact that 99% of requests complete in 10ms and 1% of requests take 5 seconds. Those 1% of users are having a terrible experience, and the average completely masks it. The p99 (99th percentile) latency tells you exactly what that worst 1% experiences.

```go
package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
    // HTTPRequestDuration measures the full request-response cycle duration.
    // The buckets define the histogram boundaries in seconds.
    HTTPRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests in seconds, partitioned by method and path.",
            // Buckets cover: 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
            // Choose buckets based on your actual SLA. If your SLA is 200ms, you need
            // several buckets below 200ms to see where requests cluster.
            Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
        },
        []string{"method", "path"},
    )

    // DBQueryDuration measures how long each database query takes.
    DBQueryDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Duration of database queries in seconds.",
            Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2},
        },
        []string{"operation", "table"},
    )

    // ExternalAPICallDuration measures calls to third-party APIs (Stripe, Twilio, etc.)
    ExternalAPICallDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "external_api_call_duration_seconds",
            Help:    "Duration of calls to external APIs in seconds.",
            Buckets: prometheus.DefBuckets, // Prometheus default: .005, .01, .025 ... 10
        },
        []string{"api", "endpoint", "status"},
    )

    // MessageProcessingDuration measures how long it takes to process a queue message.
    MessageProcessingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "message_processing_duration_seconds",
            Help:    "Duration of RabbitMQ message processing in seconds.",
            Buckets: []float64{0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30},
        },
        []string{"queue", "status"},
    )
)
```

Using histograms in your application code:

```go
import "time"

// Pattern: record start time, defer the observation
start := time.Now()
// ... do the work ...
HTTPRequestDuration.WithLabelValues("POST", "/api/v1/orders").Observe(time.Since(start).Seconds())

// Or use the prometheus.NewTimer convenience helper:
timer := prometheus.NewTimer(
    DBQueryDuration.WithLabelValues("SELECT", "orders"),
)
defer timer.ObserveDuration() // automatically called when the surrounding function returns

// With context and deferred observation:
func (r *Repo) FindOrder(ctx context.Context, id int64) (*Order, error) {
    timer := prometheus.NewTimer(
        DBQueryDuration.WithLabelValues("SELECT", "orders"),
    )
    defer timer.ObserveDuration()

    // ... execute query ...
}
```

In PromQL, calculating the 99th percentile latency:

```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

---

## 11. Summary — Client-Side Quantiles

A Summary is similar to a Histogram but calculates quantiles on the client side (inside your Go process) rather than the server side. This has one critical limitation: you cannot aggregate summaries across multiple instances of your service. If you have three replicas, each Summary tracks only its own observations, and there is no correct way to combine three p99 values into a single p99 across all three.

For this reason, **Histograms are almost always preferred over Summaries in production** for services with more than one replica. Use a Summary only when you genuinely need exact quantile calculations and are certain you will always have exactly one instance.

```go
// Summary example — use sparingly
var RequestDurationSummary = prometheus.NewSummaryVec(
    prometheus.SummaryOpts{
        Name: "http_request_duration_summary_seconds",
        Help: "Request duration summary with pre-calculated quantiles.",
        Objectives: map[float64]float64{
            0.5:  0.05,  // p50 with 5% error tolerance
            0.9:  0.01,  // p90 with 1% error tolerance
            0.99: 0.001, // p99 with 0.1% error tolerance
        },
        MaxAge:     10 * time.Minute, // only consider observations from last 10 min
        AgeBuckets: 5,
    },
    []string{"method"},
)
```

---

## 12. Labels on Metrics — The Power Multiplier

Labels transform a single metric into a multi-dimensional data structure. A counter called `http_requests_total` with labels `{method, path, status_code}` is not one time series — it is one time series for every unique combination of those label values. This is enormously powerful, but it comes with the same cardinality warning as Loki labels.

```
ASCII Diagram: Labels Create Multiple Time Series

  Metric: http_requests_total

  Without labels:
  ┌─────────────────────────────────────┐
  │  http_requests_total  =  15,000     │  ← one series, not very useful
  └─────────────────────────────────────┘

  With labels {method, path, status_code}:
  ┌────────────────────────────────────────────────────────┐
  │  http_requests_total{method="GET",  path="/orders", status="200"} = 9034 │
  │  http_requests_total{method="POST", path="/orders", status="201"} = 4821 │
  │  http_requests_total{method="POST", path="/orders", status="400"} = 132  │
  │  http_requests_total{method="POST", path="/orders", status="500"} = 12   │
  │  http_requests_total{method="GET",  path="/health", status="200"} = 1003 │
  └────────────────────────────────────────────────────────┘
  Now you can ask: "What is the error rate for POST /orders specifically?"
  rate(http_requests_total{method="POST", path="/orders", status=~"5.."}[5m])

  CARDINALITY WARNING — never use these as labels:
  ❌ user_id     (millions of users = millions of time series)
  ❌ request_id  (unique per request = catastrophic)
  ❌ order_id    (unbounded growth)
  ❌ email       (PII + unbounded)
  ❌ ip_address  (too many unique values)

  SAFE labels (bounded, low cardinality):
  ✅ method      (GET, POST, PUT, DELETE, PATCH — ~5 values)
  ✅ status_code (200, 201, 400, 401, 403, 404, 500 — ~10 values)
  ✅ env         (production, staging, development — 3 values)
  ✅ region      (us-east-1, eu-west-1, ap-south-1 — ~10 values)
  ✅ queue       (orders, payments, notifications — ~10 values)
  ✅ table       (orders, users, products — ~20 values)
  ✅ status      (success, error, timeout — ~5 values)
```

---

## 13. Registering Metrics — The Right Way

In production, you should never use Prometheus's default global registry (`prometheus.DefaultRegisterer`) directly. Instead, create a **custom registry** and register all your metrics there. This approach makes testing far simpler (each test gets a fresh registry with no cross-contamination), prevents duplicate registration panics, and allows you to export only the metrics relevant to each service.

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/collectors"
)

// Registry holds all custom metrics for the application.
// Exporting it as a struct avoids global variables while keeping
// all metric definitions in one place.
type Registry struct {
    Prometheus *prometheus.Registry

    // HTTP metrics
    HTTPRequestsTotal    *prometheus.CounterVec
    HTTPRequestDuration  *prometheus.HistogramVec
    HTTPActiveRequests   prometheus.Gauge

    // Database metrics
    DBQueriesTotal      *prometheus.CounterVec
    DBQueryDuration     *prometheus.HistogramVec
    DBConnectionsActive *prometheus.GaugeVec

    // Cache metrics
    CacheHitsTotal   *prometheus.CounterVec
    CacheMissesTotal *prometheus.CounterVec

    // Business metrics
    OrdersCreatedTotal   prometheus.Counter
    PaymentErrorsTotal   *prometheus.CounterVec
    ActiveOrdersGauge    prometheus.Gauge
}

// NewRegistry creates a new Prometheus registry with all application metrics registered.
func NewRegistry(appName, appVersion string) *Registry {
    reg := prometheus.NewRegistry()

    // Register standard Go runtime and process collectors
    reg.MustRegister(collectors.NewGoCollector())
    reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))

    r := &Registry{
        Prometheus: reg,

        HTTPRequestsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "http_requests_total",
            Help:      "Total HTTP requests partitioned by method, path, and status.",
            ConstLabels: prometheus.Labels{"version": appVersion},
        }, []string{"method", "path", "status_code"}),

        HTTPRequestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
            Namespace: appName,
            Name:      "http_request_duration_seconds",
            Help:      "HTTP request latency distribution.",
            Buckets:   []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
        }, []string{"method", "path"}),

        HTTPActiveRequests: prometheus.NewGauge(prometheus.GaugeOpts{
            Namespace: appName,
            Name:      "http_active_requests",
            Help:      "Number of HTTP requests currently being processed.",
        }),

        DBQueriesTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "db_queries_total",
            Help:      "Total DB queries partitioned by operation, table, and status.",
        }, []string{"operation", "table", "status"}),

        DBQueryDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
            Namespace: appName,
            Name:      "db_query_duration_seconds",
            Help:      "Database query duration distribution.",
            Buckets:   []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1, 2},
        }, []string{"operation", "table"}),

        DBConnectionsActive: prometheus.NewGaugeVec(prometheus.GaugeOpts{
            Namespace: appName,
            Name:      "db_connections_active",
            Help:      "Current DB connection pool state.",
        }, []string{"state"}),

        CacheHitsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "cache_hits_total",
            Help:      "Total cache hits partitioned by cache name.",
        }, []string{"cache"}),

        CacheMissesTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "cache_misses_total",
            Help:      "Total cache misses partitioned by cache name.",
        }, []string{"cache"}),

        OrdersCreatedTotal: prometheus.NewCounter(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "orders_created_total",
            Help:      "Total orders successfully created.",
        }),

        PaymentErrorsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
            Namespace: appName,
            Name:      "payment_errors_total",
            Help:      "Total payment errors partitioned by type and gateway.",
        }, []string{"error_type", "gateway"}),

        ActiveOrdersGauge: prometheus.NewGauge(prometheus.GaugeOpts{
            Namespace: appName,
            Name:      "active_orders",
            Help:      "Number of orders currently in processing state.",
        }),
    }

    // Register all metrics — MustRegister panics on duplicate registration
    reg.MustRegister(
        r.HTTPRequestsTotal,
        r.HTTPRequestDuration,
        r.HTTPActiveRequests,
        r.DBQueriesTotal,
        r.DBQueryDuration,
        r.DBConnectionsActive,
        r.CacheHitsTotal,
        r.CacheMissesTotal,
        r.OrdersCreatedTotal,
        r.PaymentErrorsTotal,
        r.ActiveOrdersGauge,
    )

    return r
}
```

---

## 14. HTTP Middleware — Instrumenting Every Request

The cleanest way to instrument HTTP traffic is through middleware. A single middleware function wraps every handler and automatically records request count, duration, and active connections — with zero instrumentation needed in individual handlers.

```go
package middleware

import (
    "net/http"
    "strconv"
    "time"

    "yourapp/internal/metrics"
)

// PrometheusMiddleware instruments every HTTP request with metrics.
// It records request count, latency distribution, and active request gauge.
func PrometheusMiddleware(reg *metrics.Registry) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Normalize the path to avoid high-cardinality label explosions.
            // /api/v1/orders/789 and /api/v1/orders/790 should both be /api/v1/orders/:id
            path := normalizePath(r.URL.Path)

            // Track active requests
            reg.HTTPActiveRequests.Inc()
            defer reg.HTTPActiveRequests.Dec()

            // Capture the response status code
            wrapped := &captureWriter{ResponseWriter: w, statusCode: http.StatusOK}

            // Start timing
            start := time.Now()

            // Execute the actual handler
            next.ServeHTTP(wrapped, r)

            // Record metrics after handler completes
            duration := time.Since(start).Seconds()
            status := strconv.Itoa(wrapped.statusCode)

            reg.HTTPRequestsTotal.WithLabelValues(r.Method, path, status).Inc()
            reg.HTTPRequestDuration.WithLabelValues(r.Method, path).Observe(duration)
        })
    }
}

// normalizePath replaces dynamic path segments with placeholders to control cardinality.
// /api/v1/orders/789  →  /api/v1/orders/:id
// /api/v1/users/42/profile  →  /api/v1/users/:id/profile
func normalizePath(path string) string {
    // In production, use a routing library that provides pattern matching,
    // such as chi's RouteContext or gorilla/mux's route template.
    // Here is a simple regex-based fallback:
    import "regexp"
    var (
        uuidPattern    = regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
        numericPattern = regexp.MustCompile(`/\d+`)
    )
    path = uuidPattern.ReplaceAllString(path, ":uuid")
    path = numericPattern.ReplaceAllString(path, "/:id")
    return path
}

type captureWriter struct {
    http.ResponseWriter
    statusCode int
}

func (cw *captureWriter) WriteHeader(code int) {
    cw.statusCode = code
    cw.ResponseWriter.WriteHeader(code)
}
```

With the `chi` router, path normalization is built in:

```go
import (
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

r := chi.NewRouter()
r.Use(func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
        // chi.RouteContext gives you the route pattern, not the actual URL
        // so /api/v1/orders/789 becomes /api/v1/orders/{orderID}
        rctx := chi.RouteContext(req.Context())
        path := rctx.RoutePattern()
        // ... record metrics using path
    })
})
```

---

## 15. Instrumenting Database Operations

Every database call should record its duration and outcome. Using `prometheus.NewTimer` with `defer` makes this clean and mistake-proof.

```go
package repository

import (
    "context"
    "database/sql"
    "time"

    "yourapp/internal/metrics"
    "github.com/prometheus/client_golang/prometheus"
)

type OrderRepository struct {
    db  *sql.DB
    reg *metrics.Registry
}

func (r *OrderRepository) FindByID(ctx context.Context, id int64) (*Order, error) {
    // Start timing the query
    timer := prometheus.NewTimer(
        r.reg.DBQueryDuration.WithLabelValues("SELECT", "orders"),
    )
    defer timer.ObserveDuration()

    var order Order
    err := r.db.QueryRowContext(ctx,
        "SELECT id, user_id, total, status FROM orders WHERE id = $1", id,
    ).Scan(&order.ID, &order.UserID, &order.Total, &order.Status)

    if err == sql.ErrNoRows {
        r.reg.DBQueriesTotal.WithLabelValues("SELECT", "orders", "not_found").Inc()
        return nil, ErrNotFound
    }
    if err != nil {
        r.reg.DBQueriesTotal.WithLabelValues("SELECT", "orders", "error").Inc()
        return nil, err
    }

    r.reg.DBQueriesTotal.WithLabelValues("SELECT", "orders", "success").Inc()
    return &order, nil
}

func (r *OrderRepository) Create(ctx context.Context, order *Order) (int64, error) {
    timer := prometheus.NewTimer(
        r.reg.DBQueryDuration.WithLabelValues("INSERT", "orders"),
    )
    defer timer.ObserveDuration()

    var id int64
    err := r.db.QueryRowContext(ctx,
        "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id",
        order.UserID, order.Total, "pending",
    ).Scan(&id)

    if err != nil {
        r.reg.DBQueriesTotal.WithLabelValues("INSERT", "orders", "error").Inc()
        return 0, err
    }

    r.reg.DBQueriesTotal.WithLabelValues("INSERT", "orders", "success").Inc()
    return id, nil
}

// StartDBPoolMonitor runs in the background, periodically updating the
// DB connection pool gauge metrics from sql.DB.Stats().
func StartDBPoolMonitor(ctx context.Context, db *sql.DB, reg *metrics.Registry) {
    go func() {
        ticker := time.NewTicker(15 * time.Second)
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                stats := db.Stats()
                reg.DBConnectionsActive.WithLabelValues("idle").Set(float64(stats.Idle))
                reg.DBConnectionsActive.WithLabelValues("in_use").Set(float64(stats.InUse))
                reg.DBConnectionsActive.WithLabelValues("max_open").Set(float64(stats.MaxOpenConnections))
                reg.DBConnectionsActive.WithLabelValues("wait_count").Set(float64(stats.WaitCount))
            case <-ctx.Done():
                return
            }
        }
    }()
}
```

---

## 16. Instrumenting Redis Cache Operations

Cache operations are binary — they either hit or miss — and they have a duration. The cache hit ratio is one of the most important operational metrics for a cache-backed service.

```go
package cache

import (
    "context"
    "time"

    "github.com/redis/go-redis/v9"
    "github.com/prometheus/client_golang/prometheus"
    "yourapp/internal/metrics"
)

type UserCache struct {
    client *redis.Client
    reg    *metrics.Registry
}

func (c *UserCache) Get(ctx context.Context, userID int64) (*User, error) {
    key := fmt.Sprintf("user:%d:profile", userID)

    start := time.Now()
    val, err := c.client.Get(ctx, key).Bytes()
    duration := time.Since(start).Seconds()

    // Record Redis operation duration (reuse DBQueryDuration or create a dedicated one)
    // Here we assume a dedicated RedisOperationDuration histogram exists in the registry.

    if err == redis.Nil {
        c.reg.CacheMissesTotal.WithLabelValues("user_profile").Inc()
        return nil, ErrCacheMiss
    }
    if err != nil {
        // Redis error — neither a hit nor a clean miss
        c.reg.CacheMissesTotal.WithLabelValues("user_profile").Inc()
        return nil, err
    }

    c.reg.CacheHitsTotal.WithLabelValues("user_profile").Inc()

    var user User
    _ = json.Unmarshal(val, &user)
    return &user, nil
}

// CacheHitRatio returns a PromQL expression for the cache hit ratio.
// This is not Go code — it is the PromQL query to put in your Grafana dashboard.
//
//  rate(order_service_cache_hits_total[5m])
//  / (
//    rate(order_service_cache_hits_total[5m])
//    + rate(order_service_cache_misses_total[5m])
//  )
```

---

## 17. Instrumenting RabbitMQ Publishers and Consumers

Message queue metrics are essential for understanding throughput and detecting backlogs. For publishers, you care about publish rate and publish errors. For consumers, you care about processing rate, processing duration, and the queue depth (how many messages are waiting).

```go
package messaging

import (
    "context"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
    "github.com/prometheus/client_golang/prometheus"
    "yourapp/internal/metrics"
)

// Additional messaging-specific metrics (register these in your metrics.Registry)
type MessagingMetrics struct {
    MessagesPublishedTotal  *prometheus.CounterVec
    MessagesConsumedTotal   *prometheus.CounterVec
    MessageProcessDuration  *prometheus.HistogramVec
    QueueDepth              *prometheus.GaugeVec
}

type OrderPublisher struct {
    channel *amqp.Channel
    reg     *metrics.Registry
    mq      *MessagingMetrics
}

func (p *OrderPublisher) Publish(ctx context.Context, routingKey string, body []byte) error {
    start := time.Now()

    err := p.channel.PublishWithContext(ctx,
        "orders", routingKey, false, false,
        amqp.Publishing{ContentType: "application/json", Body: body},
    )

    duration := time.Since(start).Seconds()
    status := "success"
    if err != nil {
        status = "error"
    }

    p.mq.MessagesPublishedTotal.WithLabelValues(routingKey, status).Inc()
    // Record publish duration using a histogram if needed

    return err
}

type OrderConsumer struct {
    channel *amqp.Channel
    reg     *metrics.Registry
    mq      *MessagingMetrics
}

func (c *OrderConsumer) StartConsuming(ctx context.Context, queue string) error {
    msgs, err := c.channel.Consume(queue, "", false, false, false, false, nil)
    if err != nil {
        return err
    }

    for {
        select {
        case msg, ok := <-msgs:
            if !ok {
                return nil
            }

            start := time.Now()
            err := c.processMessage(ctx, msg)
            duration := time.Since(start).Seconds()

            status := "success"
            if err != nil {
                status = "error"
                msg.Nack(false, true) // requeue on error
            } else {
                msg.Ack(false)
            }

            c.mq.MessagesConsumedTotal.WithLabelValues(queue, status).Inc()
            c.mq.MessageProcessDuration.WithLabelValues(queue, status).Observe(duration)

        case <-ctx.Done():
            return nil
        }
    }
}

// PollQueueDepth periodically checks the queue depth via the RabbitMQ management API
// and updates the gauge metric.
func PollQueueDepth(ctx context.Context, mq *MessagingMetrics, queues []string) {
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                for _, q := range queues {
                    depth := getQueueDepthFromManagementAPI(q) // implement via HTTP call
                    mq.QueueDepth.WithLabelValues(q).Set(float64(depth))
                }
            case <-ctx.Done():
                return
            }
        }
    }()
}
```

---

## 18. Instrumenting Background Workers and Goroutines

Background workers — cron jobs, batch processors, event handlers — are notoriously difficult to monitor because they run silently in the background. The most valuable metrics for workers are: how many are currently running, how long each execution takes, and when each one last completed successfully.

```go
package worker

import (
    "context"
    "time"

    "yourapp/internal/metrics"
    "github.com/prometheus/client_golang/prometheus"
)

// WorkerMetrics holds metrics specific to background workers.
type WorkerMetrics struct {
    WorkerExecutionsTotal   *prometheus.CounterVec
    WorkerDuration          *prometheus.HistogramVec
    WorkerLastSuccess       *prometheus.GaugeVec  // Unix timestamp
    WorkerActiveGoroutines  *prometheus.GaugeVec
}

type InvoiceGenerator struct {
    wm *WorkerMetrics
}

func (w *InvoiceGenerator) Run(ctx context.Context) {
    w.wm.WorkerActiveGoroutines.WithLabelValues("invoice-generator").Inc()
    defer w.wm.WorkerActiveGoroutines.WithLabelValues("invoice-generator").Dec()

    timer := prometheus.NewTimer(
        w.wm.WorkerDuration.WithLabelValues("invoice-generator"),
    )
    defer timer.ObserveDuration()

    err := w.generateInvoices(ctx)

    if err != nil {
        w.wm.WorkerExecutionsTotal.WithLabelValues("invoice-generator", "error").Inc()
        return
    }

    w.wm.WorkerExecutionsTotal.WithLabelValues("invoice-generator", "success").Inc()
    // Update the "last success" timestamp — alert if this stops being updated
    w.wm.WorkerLastSuccess.WithLabelValues("invoice-generator").SetToCurrentTime()
}

// CronScheduler wraps any worker function with metrics instrumentation.
func InstrumentedCron(name string, wm *WorkerMetrics, fn func(context.Context) error) func(context.Context) {
    return func(ctx context.Context) {
        wm.WorkerActiveGoroutines.WithLabelValues(name).Inc()
        defer wm.WorkerActiveGoroutines.WithLabelValues(name).Dec()

        timer := prometheus.NewTimer(wm.WorkerDuration.WithLabelValues(name))
        defer timer.ObserveDuration()

        err := fn(ctx)
        if err != nil {
            wm.WorkerExecutionsTotal.WithLabelValues(name, "error").Inc()
            return
        }
        wm.WorkerExecutionsTotal.WithLabelValues(name, "success").Inc()
        wm.WorkerLastSuccess.WithLabelValues(name).SetToCurrentTime()
    }
}
```

The `WorkerLastSuccess` gauge is one of the most powerful alerting metrics you can have. In Prometheus, you can alert when `time() - worker_last_success_timestamp_seconds > 3600` — meaning the worker has not completed successfully in over an hour. This catches stuck or silently failing background jobs that would otherwise go undetected for days.

---

## 19. Custom Business Metrics

Beyond technical metrics (latency, error rate, CPU), production services should expose **business metrics** — measurements that directly reflect the health of the product. These metrics are uniquely valuable during incidents because they answer the question _"Is the business working?"_ rather than just _"Is the server working?"_

```go
package metrics

// BusinessMetrics holds domain-specific metrics that reflect product health.
// These sit alongside technical metrics and give you a complete picture.
type BusinessMetrics struct {

    // Revenue-related
    RevenueProcessedTotal prometheus.Counter  // total dollars/cents processed
    CheckoutStartedTotal  prometheus.Counter
    CheckoutCompletedTotal prometheus.Counter
    CheckoutAbandonedTotal prometheus.Counter

    // User-related
    UserRegistrationsTotal prometheus.Counter
    ActiveSessionsGauge    prometheus.Gauge
    LoginAttemptsTotal     *prometheus.CounterVec  // labels: {status: success|failure}

    // Inventory-related
    LowStockItemsGauge     prometheus.Gauge
    OutOfStockItemsGauge   prometheus.Gauge
}

// Example usage in the service layer:
func (s *CheckoutService) CompleteCheckout(ctx context.Context, cart Cart) (*Order, error) {
    s.biz.CheckoutStartedTotal.Inc()

    order, err := s.processPayment(ctx, cart)
    if err != nil {
        s.biz.CheckoutAbandonedTotal.Inc()
        return nil, err
    }

    s.biz.CheckoutCompletedTotal.Inc()
    s.biz.RevenueProcessedTotal.Add(cart.TotalCents) // use Add() to increment by amount

    return order, nil
}
```

The checkout conversion rate derived from these metrics in PromQL:

```promql
rate(order_service_checkout_completed_total[1h])
/
rate(order_service_checkout_started_total[1h])
```

This single query tells you, in real time, what percentage of checkout attempts are succeeding. A sudden drop is the earliest possible signal of a payment problem, a broken UI, or a backend error — often before any user complains.

---

## 20. PromQL — Querying Your Metrics

PromQL (Prometheus Query Language) is what you use to ask questions of your collected metrics. It is a functional language built around time-series data, and it rewards learning deeply.

```
ASCII Diagram: PromQL Query Anatomy

  Instant vector selector:
  ┌─────────────────────────────────────────────────────────────────┐
  │  http_requests_total{method="POST", status_code=~"5.."}         │
  │  └───────────────────┘└────────────────────────────────────────┘│
  │       metric name              label matchers                   ││
  │                                =  exact match                   ││
  │                                != not equal                     ││
  │                                =~ regex match (5xx status codes)││
  │                                !~ negative regex                ││
  └─────────────────────────────────────────────────────────────────┘

  Range vector selector (required for rate/increase functions):
  ┌─────────────────────────────────────────────────────────────────┐
  │  http_requests_total{method="POST"}[5m]                         │
  │                                    └──┘                         │
  │                              time range window                  │
  └─────────────────────────────────────────────────────────────────┘

  Functions:
  rate(counter[5m])         → per-second rate of change (smooth)
  increase(counter[1h])     → total increase over the window
  sum by (label) (metric)   → aggregate across time series
  avg by (label) (metric)   → average across time series
  histogram_quantile(φ, ...)→ calculate percentile from histogram
  absent(metric)            → returns 1 if metric has no data (alert on silence)
  predict_linear(gauge[1h], 4*3600) → predict value 4 hours from now
```

The most important PromQL queries for a Go backend service:

```promql
# Request rate (requests per second) for each endpoint
rate(order_service_http_requests_total[5m])

# Error rate (fraction of requests that returned 5xx)
sum(rate(order_service_http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(order_service_http_requests_total[5m]))

# P50, P90, P99 latency for all endpoints
histogram_quantile(0.50, sum by (le, path) (rate(order_service_http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.90, sum by (le, path) (rate(order_service_http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.99, sum by (le, path) (rate(order_service_http_request_duration_seconds_bucket[5m])))

# DB query error rate
rate(order_service_db_queries_total{status="error"}[5m])

# Cache hit ratio
rate(order_service_cache_hits_total[5m])
/ (rate(order_service_cache_hits_total[5m]) + rate(order_service_cache_misses_total[5m]))

# Active goroutines (watch for leaks)
go_goroutines{job="order-service"}

# GC pause p99
histogram_quantile(0.99, rate(go_gc_duration_seconds_bucket[5m]))

# Memory usage
process_resident_memory_bytes{job="order-service"}

# DB connection pool utilization
order_service_db_connections_active{state="in_use"}
/ order_service_db_connections_active{state="max_open"}

# Worker last success age (seconds since last successful run)
time() - order_service_worker_last_success_timestamp_seconds

# Predict disk exhaustion (if storing to local disk)
predict_linear(node_filesystem_free_bytes[6h], 24*3600) < 0
```

---

## 21. Alerting with Prometheus and Alertmanager

Prometheus evaluates alert rules continuously. When a rule's condition is true for the specified duration, it fires the alert to Alertmanager, which deduplicates, groups, and routes it.

```yaml
# alert-rules.yaml
groups:
  - name: go-service-alerts
    rules:

      # Alert when error rate exceeds 1% for 2 minutes
      - alert: HighHTTPErrorRate
        expr: |
          sum(rate(order_service_http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(order_service_http_requests_total[5m]))
          > 0.01
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High HTTP error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes."
          runbook: "https://wiki.company.com/runbooks/high-error-rate"

      # Alert when P99 latency exceeds 500ms
      - alert: SlowP99Latency
        expr: |
          histogram_quantile(0.99,
            sum by (le) (rate(order_service_http_request_duration_seconds_bucket[5m]))
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 500ms"
          description: "P99 response time is {{ $value | humanizeDuration }}."

      # Alert when the service produces no metrics (it may be down)
      - alert: ServiceDown
        expr: absent(order_service_http_requests_total)
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "order-service is not producing metrics"

      # Alert on goroutine leak (goroutine count growing unbounded)
      - alert: GoroutineLeak
        expr: go_goroutines{job="order-service"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Possible goroutine leak"
          description: "{{ $value }} goroutines active for more than 10 minutes."

      # Alert when a background worker has not run successfully in 2 hours
      - alert: WorkerStuck
        expr: |
          time() - order_service_worker_last_success_timestamp_seconds
          {job_name="invoice-generator"} > 7200
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Worker {{ $labels.job_name }} has not run successfully in 2 hours"

      # Alert on DB connection pool near exhaustion
      - alert: DBConnectionPoolExhaustion
        expr: |
          order_service_db_connections_active{state="in_use"}
          /
          order_service_db_connections_active{state="max_open"}
          > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DB connection pool is {{ $value | humanizePercentage }} full"

      # Alert on checkout conversion rate drop (business metric alert)
      - alert: CheckoutConversionDrop
        expr: |
          rate(order_service_checkout_completed_total[15m])
          /
          rate(order_service_checkout_started_total[15m])
          < 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Checkout conversion rate dropped below 80%"
          description: "Current conversion rate: {{ $value | humanizePercentage }}"
```

Alertmanager routing configuration:

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'job']
  group_wait: 30s       # wait 30s before sending first notification (group similar alerts)
  group_interval: 5m    # send updates every 5 minutes
  repeat_interval: 4h   # re-notify every 4 hours if alert is still firing
  receiver: 'slack-ops'

  routes:
    # Critical alerts go to PagerDuty (will wake someone up)
    - match:
        severity: critical
      receiver: pagerduty-critical

    # Warning alerts go to Slack only
    - match:
        severity: warning
      receiver: slack-ops

receivers:
  - name: 'slack-ops'
    slack_configs:
      - channel: '#alerts-backend'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

---

## 22. Prometheus with Docker and Docker Compose

```yaml
# docker-compose.yml — full observability stack
version: "3.8"

services:
  order-service:
    build: ./order-service
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=production
      - DB_URL=postgres://user:pass@postgres:5432/orders
    networks:
      - backend

  prometheus:
    image: prom/prometheus:v2.47.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yaml:/etc/prometheus/alert-rules.yaml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'     # allows config reload via POST /-/reload
    networks:
      - backend

  alertmanager:
    image: prom/alertmanager:v0.26.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - backend

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
    networks:
      - backend

  node-exporter:
    image: prom/node-exporter:v1.6.1
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
    networks:
      - backend

volumes:
  prometheus-data:
  grafana-data:

networks:
  backend:
    driver: bridge
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s       # collect metrics every 15 seconds
  evaluation_interval: 15s   # evaluate alert rules every 15 seconds

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alert-rules.yaml"

scrape_configs:
  - job_name: 'order-service'
    static_configs:
      - targets: ['order-service:8080']
    metrics_path: /metrics

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

---

## 23. Prometheus with Kubernetes — ServiceMonitor and PodMonitor

In Kubernetes, the Prometheus Operator extends the Kubernetes API with custom resources (`ServiceMonitor`, `PodMonitor`, `PrometheusRule`) that make configuring Prometheus as natural as deploying a service. The Kube Prometheus Stack Helm chart deploys the entire observability stack with sensible defaults.

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.enabled=true \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

Your Go service deployment and ServiceMonitor:

```yaml
# order-service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: backend
  labels:
    app: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        # Optional: tell Prometheus to scrape this pod directly (without ServiceMonitor)
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: order-service
          image: yourregistry/order-service:2.3.1
          ports:
            - name: http
              containerPort: 8080
            - name: metrics     # expose metrics on a dedicated named port
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: backend
  labels:
    app: order-service
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 8080
      targetPort: http
---
# ServiceMonitor tells Prometheus Operator to scrape the order-service
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: order-service
  namespace: backend
  labels:
    release: kube-prometheus-stack   # must match Prometheus operator's selector
spec:
  selector:
    matchLabels:
      app: order-service
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s
```

Alert rules as a Kubernetes PrometheusRule resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: order-service-alerts
  namespace: backend
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: order-service
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(order_service_http_requests_total{status_code=~"5.."}[5m]))
            / sum(rate(order_service_http_requests_total[5m])) > 0.01
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "High error rate in order-service"
```

---

## 24. Grafana Dashboards for Go Services

A well-designed Grafana dashboard for a Go service has four sections: the RED metrics (rate, errors, duration) for the HTTP layer, database metrics, cache metrics, and Go runtime metrics.

```
ASCII Diagram: Recommended Grafana Dashboard Layout

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │   order-service — Production Dashboard          [time range: last 1h]       │
  ├──────────────────────┬──────────────────────┬───────────────────────────────┤
  │  Request Rate        │   Error Rate         │   P99 Latency                 │
  │  [stat: 142 req/s]   │   [stat: 0.12%]      │   [stat: 87ms]               │
  ├──────────────────────┴──────────────────────┴───────────────────────────────┤
  │                   Request Rate by Endpoint (timeseries)                     │
  │  ████████████████████████████████████████████████████████████              │
  │  POST /api/v1/orders     ████                                               │
  │  GET  /api/v1/orders     ██████████                                         │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                   P50 / P90 / P99 Latency (timeseries)                     │
  │  99th: ─────────────────────────────────────────── 87ms                    │
  │  90th: ─────────────────────────────────────── 34ms                        │
  │  50th: ─────────────────────────────── 12ms                                │
  ├──────────────────────┬──────────────────────┬───────────────────────────────┤
  │  DB Query Rate       │  DB Error Rate       │  DB P99 Duration              │
  │  (timeseries)        │  (timeseries)        │  (timeseries)                 │
  ├──────────────────────┼──────────────────────┼───────────────────────────────┤
  │  Cache Hit Ratio     │  Active DB Conns     │  Queue Depth                  │
  │  [gauge: 94.3%]      │  [bargauge: 12/50]   │  [stat: 342]                 │
  ├──────────────────────┴──────────────────────┴───────────────────────────────┤
  │                   Go Runtime (timeseries)                                   │
  │  Goroutines: ──────────────────────────────── 42                           │
  │  Heap Alloc: ──────────────────────────────── 48MB                         │
  │  GC P99:     ──────────────────────────────── 0.4ms                        │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 25. The RED Method — A Framework for Service Metrics

The RED Method, created by Tom Wilkie at Weave Works, provides a minimal but complete framework for instrumenting any service. It identifies the three metrics that matter most for any request-driven service.

```
ASCII Diagram: The RED Method

  For every service that handles requests:

  ┌────────────────────────────────────────────────────────────────────────────┐
  │  R — RATE                                                                  │
  │  How many requests per second is the service handling?                     │
  │  PromQL: rate(http_requests_total[5m])                                     │
  │  Answers: Is traffic normal? Did a deploy cause a drop?                    │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  E — ERRORS                                                                │
  │  What fraction of requests are failing?                                    │
  │  PromQL: rate(http_requests_total{status=~"5.."}[5m])                      │
  │          / rate(http_requests_total[5m])                                   │
  │  Answers: Are users experiencing failures? Is a dependency broken?         │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  D — DURATION                                                              │
  │  How long are requests taking? (P50, P90, P99)                             │
  │  PromQL: histogram_quantile(0.99,                                          │
  │            rate(http_request_duration_seconds_bucket[5m]))                 │
  │  Answers: Are users experiencing slowness? Did a query get slower?         │
  └────────────────────────────────────────────────────────────────────────────┘

  If all three are healthy → the service is healthy.
  Start every incident investigation with these three questions.
```

---

## 26. The USE Method — A Framework for Resource Metrics

The USE Method, created by Brendan Gregg, complements the RED Method by focusing on infrastructure resources rather than service behaviour.

```
ASCII Diagram: The USE Method

  For every resource (CPU, memory, disk, network, DB connections):

  ┌────────────────────────────────────────────────────────────────────────────┐
  │  U — UTILIZATION                                                           │
  │  What percentage of the resource capacity is being used?                   │
  │  Examples: CPU at 70%, DB pool at 80% capacity, disk at 60%                │
  │  High utilization (>80%) means you are approaching limits.                 │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  S — SATURATION                                                            │
  │  Is there queuing or waiting because the resource is overloaded?           │
  │  Examples: DB connection wait count growing, CPU load average > cores      │
  │  Saturation means work is being delayed, not just the resource being busy. │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  E — ERRORS                                                                │
  │  Are there errors from this resource?                                      │
  │  Examples: DB connection refused, disk write errors, network packet drops  │
  └────────────────────────────────────────────────────────────────────────────┘
```

---

## 27. Performance and Cardinality Best Practices

Every unique combination of label values creates a separate time series in Prometheus. This is called the **cardinality** of a metric. High cardinality is the most common way teams accidentally destroy Prometheus performance.

When cardinality grows too large, Prometheus consumes excessive memory (it keeps recent time series in RAM), scrapes slow down, and query performance degrades. The most important rule is: **never use a label whose value could be unbounded**. User IDs, request IDs, session tokens, email addresses, and IP addresses are all forbidden as labels.

A second important practice is path normalization. Without it, every unique URL becomes a separate time series. The URL `/api/v1/orders/789` and `/api/v1/orders/790` are different URLs, but they represent the same endpoint. Your middleware must normalize them to `/api/v1/orders/:id` before using the path as a label value.

A third practice is to use the Namespace and Subsystem fields in metric names. Using `order_service_http_requests_total` instead of `http_requests_total` prevents naming conflicts when multiple services' metrics are collected into the same Prometheus instance, and makes it immediately clear which service a metric belongs to.

```go
// Good metric naming with Namespace and Subsystem
prometheus.NewCounterVec(prometheus.CounterOpts{
    Namespace: "order_service",   // your service name
    Subsystem: "http",            // the component within the service
    Name:      "requests_total",  // the measurement
    // Full name: order_service_http_requests_total
}, []string{"method", "path", "status_code"})
```

---

## 28. Testing Your Metrics

Testing that your metrics are correctly recorded is as important as testing your business logic. The Prometheus Go client provides `prometheus/testutil` for making assertions on metric values in unit tests.

```go
package middleware_test

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/testutil"
    "yourapp/internal/metrics"
    "yourapp/internal/middleware"
)

func TestPrometheusMiddleware_CountsRequests(t *testing.T) {
    // Create a fresh registry for this test — no cross-contamination
    reg := metrics.NewRegistry("test_service", "test")

    // Create the handler under test
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    // Wrap with the Prometheus middleware
    instrumented := middleware.PrometheusMiddleware(reg)(handler)

    // Make three requests
    for i := 0; i < 3; i++ {
        req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
        rec := httptest.NewRecorder()
        instrumented.ServeHTTP(rec, req)
    }

    // Assert the counter value
    expected := `
        # HELP test_service_http_requests_total Total HTTP requests partitioned by method, path, and status.
        # TYPE test_service_http_requests_total counter
        test_service_http_requests_total{method="GET",path="/api/v1/health",status_code="200"} 3
    `
    if err := testutil.CollectAndCompare(
        reg.HTTPRequestsTotal,
        strings.NewReader(expected),
    ); err != nil {
        t.Errorf("unexpected metric: %v", err)
    }
}

func TestPrometheusMiddleware_RecordsErrors(t *testing.T) {
    reg := metrics.NewRegistry("test_service", "test")

    errorHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusInternalServerError)
    })

    instrumented := middleware.PrometheusMiddleware(reg)(errorHandler)
    req := httptest.NewRequest(http.MethodPost, "/api/v1/orders", nil)
    rec := httptest.NewRecorder()
    instrumented.ServeHTTP(rec, req)

    // Assert that error counter incremented
    count := testutil.ToFloat64(
        reg.HTTPRequestsTotal.WithLabelValues("POST", "/api/v1/orders", "500"),
    )
    if count != 1 {
        t.Errorf("expected 1 error request, got %v", count)
    }
}
```

---

## 29. Production Best Practices Checklist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              PRODUCTION PROMETHEUS CHECKLIST FOR GO SERVICES                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  METRIC DESIGN                                                               │
│  ✅ Use Namespace and Subsystem in all metric names (service_subsystem_name) │
│  ✅ Keep label cardinality low — no user IDs, request IDs, or IPs as labels  │
│  ✅ Normalize URL paths in HTTP metrics to avoid cardinality explosion        │
│  ✅ Follow RED Method: rate, errors, duration for every service endpoint     │
│  ✅ Follow USE Method: utilization, saturation, errors for every resource    │
│  ✅ Add business metrics (conversion rate, revenue, active sessions)         │
│  ✅ Use Histograms over Summaries for latency (aggregatable across replicas) │
│  ✅ Choose histogram buckets that match your SLA boundaries                  │
│                                                                              │
│  IMPLEMENTATION                                                              │
│  ✅ Use a custom prometheus.Registry, not the global DefaultRegisterer       │
│  ✅ Register metrics in a central place and inject via dependency injection  │
│  ✅ Use prometheus.NewTimer + defer for clean latency measurement            │
│  ✅ Use MustRegister in init — panics at startup catch duplicate registrations│
│  ✅ Expose /metrics on a separate internal port (not the public API port)    │
│  ✅ Start a DB pool monitor goroutine for sql.DB connection metrics          │
│  ✅ Record worker last-success timestamp for every background job            │
│                                                                              │
│  ALERTING                                                                    │
│  ✅ Alert on high error rate (>1% 5xx for 2 minutes)                        │
│  ✅ Alert on high P99 latency (>500ms for 5 minutes)                        │
│  ✅ Alert on service silence (absent metric for 1 minute)                   │
│  ✅ Alert on goroutine leak (>1000 goroutines for 10 minutes)               │
│  ✅ Alert on worker staleness (last success > 2 hours ago)                  │
│  ✅ Alert on DB pool near exhaustion (>80% in_use for 5 minutes)            │
│  ✅ Alert on business metric anomalies (conversion rate drop)               │
│                                                                              │
│  OPERATIONS                                                                  │
│  ✅ Set Prometheus retention to at least 30 days                             │
│  ✅ Use remote write (Thanos / Mimir) for long-term storage beyond 30 days  │
│  ✅ Test metrics in unit tests with prometheus/testutil                      │
│  ✅ Document every metric with a clear Help string                           │
│  ✅ Periodically audit cardinality with the Prometheus TSDB status page      │
│     (http://prometheus:9090/tsdb-status)                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 30. Full Production Reference Implementation

This is the complete architecture of a production Go service fully instrumented with Prometheus.

```
ASCII Diagram: Complete Production Prometheus Architecture

  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                    PRODUCTION GO BACKEND (3 replicas)                        │
  │                                                                              │
  │  HTTP Request                                                                │
  │      │                                                                       │
  │      ▼                                                                       │
  │  ┌────────────────────────────────────────────────────────────────────────┐  │
  │  │              Middleware Stack                                           │  │
  │  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
  │  │  │  PrometheusMiddleware                                            │  │  │
  │  │  │  → HTTPRequestsTotal.WithLabelValues(method, path, status).Inc() │  │  │
  │  │  │  → HTTPRequestDuration.WithLabelValues(method, path).Observe(d) │  │  │
  │  │  │  → HTTPActiveRequests.Inc() / defer Dec()                       │  │  │
  │  │  └─────────────────────────────────────────────────────────────────┘  │  │
  │  └────────────────────────────────────────────────────────────────────────┘  │
  │      │                                                                       │
  │      ▼                                                                       │
  │  ┌──────────────────────────────────────────────────────────────────────┐   │
  │  │  Handler → Service → Repository → Cache                              │   │
  │  │                                                                      │   │
  │  │  Each layer uses metrics.Registry:                                   │   │
  │  │  • Service:    OrdersCreatedTotal.Inc()                              │   │
  │  │  •             PaymentErrorsTotal.WithLabelValues(...).Inc()         │   │
  │  │  •             CheckoutCompletedTotal.Inc()                          │   │
  │  │  • Repository: DBQueryDuration timer, DBQueriesTotal counter         │   │
  │  │  • Cache:      CacheHitsTotal / CacheMissesTotal                     │   │
  │  └──────────────────────────────────────────────────────────────────────┘   │
  │      │                                                                       │
  │  Background goroutines:                                                      │
  │  • DBPoolMonitor  → DBConnectionsActive gauge (every 15s)                   │
  │  • QueueMonitor   → RabbitMQQueueDepth gauge  (every 30s)                   │
  │  • Workers        → WorkerLastSuccess gauge, WorkerDuration histogram        │
  │                                                                              │
  │  /metrics endpoint (promhttp.HandlerFor(customRegistry, ...))               │
  │  Exposes: all custom metrics + Go runtime + process metrics                  │
  └──────────────────────────────────────────────┬───────────────────────────────┘
                                                 │
                                   GET /metrics every 15s (pull)
                                                 │
  Kubernetes Cluster                             ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  monitoring namespace                                                        │
  │                                                                              │
  │  ┌─────────────────────────────────────────────────────────────────────┐    │
  │  │  Prometheus Operator                                                 │    │
  │  │  watches ServiceMonitor CRDs → configures Prometheus scrape targets │    │
  │  └──────────────────────────────────────────────────────────────────────┘   │
  │                                                                              │
  │  ┌──────────────────────────┐     remote write      ┌───────────────────┐  │
  │  │  Prometheus              │ ─────────────────────► │  Thanos / Mimir   │  │
  │  │  (TSDB, 30d retention)   │                        │  (long-term store,│  │
  │  │  evaluates alert rules   │                        │  multi-year data) │  │
  │  └───────────┬──────────────┘                        └───────────────────┘  │
  │              │ fires alerts                                                  │
  │              ▼                                                               │
  │  ┌──────────────────────────┐                                               │
  │  │  Alertmanager            │                                               │
  │  │  deduplicates, groups,   │                                               │
  │  │  routes to:              │                                               │
  │  │  → PagerDuty (critical)  │                                               │
  │  │  → Slack (warning)       │                                               │
  │  └──────────────────────────┘                                               │
  │                                                                              │
  │  ┌──────────────────────────┐                                               │
  │  │  Grafana                 │                                               │
  │  │  datasource: Prometheus  │                                               │
  │  │  dashboards:             │                                               │
  │  │  → RED metrics per svc   │                                               │
  │  │  → DB/Cache/Queue panels │                                               │
  │  │  → Go runtime panels     │                                               │
  │  │  → Business metrics      │                                               │
  │  └──────────────────────────┘                                               │
  └──────────────────────────────────────────────────────────────────────────────┘

  On Incident:
  1. Alert fires (Prometheus Ruler → Alertmanager → PagerDuty)
  2. Engineer opens Grafana → sees error rate spike at 3:15 PM in dashboard
  3. Drills into P99 latency panel → DB query duration spiked at same time
  4. Opens DB connections panel → pool was 100% exhausted
  5. Checks PromQL: increase(order_service_db_queries_total{status="error"}[5m])
  6. Root cause: a missing database index on a new query in the 3 PM deploy
  7. Rolled back deploy → metrics return to baseline within 2 minutes
```

Complete `main.go` with metrics wiring:

```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "yourapp/internal/metrics"
    "yourapp/internal/middleware"
    "yourapp/internal/repository"
    "yourapp/internal/service"
    "yourapp/internal/handler"
    "yourapp/internal/observability"

    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.uber.org/zap"
)

func main() {
    // Initialize structured logger
    logger, _ := observability.NewProductionLogger(observability.AppConfig{
        AppName:     getEnv("APP_NAME", "order-service"),
        AppVersion:  getEnv("APP_VERSION", "unknown"),
        Environment: getEnv("APP_ENV", "development"),
        LogLevel:    getEnv("LOG_LEVEL", "info"),
        LokiURL:     getEnv("LOKI_URL", ""),
    })
    defer logger.Sync()

    // Initialize Prometheus metrics registry
    reg := metrics.NewRegistry(
        getEnv("APP_NAME", "order_service"),
        getEnv("APP_VERSION", "unknown"),
    )

    // Wire up dependencies with both logger and metrics
    db := repository.NewPostgres(logger, getEnv("DB_URL", ""))
    repository.StartDBPoolMonitor(context.Background(), db.DB, reg)

    orderRepo := repository.NewOrderRepository(logger, reg, db)
    orderSvc := service.NewOrderService(logger, reg, orderRepo)
    orderHandler := handler.NewOrderHandler(logger, reg, orderSvc)

    // Business HTTP server (port 8080)
    mux := http.NewServeMux()
    mux.Handle("/api/v1/orders", orderHandler)

    appStack := middleware.RequestID(logger)(
        middleware.RequestLogger(logger)(
            middleware.PrometheusMiddleware(reg)(mux),
        ),
    )

    appServer := &http.Server{
        Addr:    ":" + getEnv("PORT", "8080"),
        Handler: appStack,
    }

    // Internal metrics server (port 9090) — separate from the business API
    // Never expose /metrics on the public internet
    metricsMux := http.NewServeMux()
    metricsMux.Handle("/metrics", promhttp.HandlerFor(
        reg.Prometheus,
        promhttp.HandlerOpts{EnableOpenMetrics: true},
    ))
    metricsMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    metricsServer := &http.Server{
        Addr:    ":" + getEnv("METRICS_PORT", "9090"),
        Handler: metricsMux,
    }

    // Start both servers
    go func() {
        logger.Info("Business server listening", zap.String("addr", appServer.Addr))
        if err := appServer.ListenAndServe(); err != http.ErrServerClosed {
            logger.Fatal("Business server error", zap.Error(err))
        }
    }()

    go func() {
        logger.Info("Metrics server listening", zap.String("addr", metricsServer.Addr))
        if err := metricsServer.ListenAndServe(); err != http.ErrServerClosed {
            logger.Fatal("Metrics server error", zap.Error(err))
        }
    }()

    // Graceful shutdown on signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logger.Info("Shutting down gracefully")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    _ = appServer.Shutdown(ctx)
    _ = metricsServer.Shutdown(ctx)
    logger.Info("Servers stopped")
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
```

---

_Prometheus transforms your Go service from a black box into a glass box. With the RED Method covering every endpoint, the USE Method covering every resource, and business metrics covering the product itself, you build a monitoring system that gives you the earliest possible warning of problems, the fastest possible path to root cause, and the data to prove that a fix actually worked. That is what separates reactive firefighting from proactive, data-driven engineering._