# The Complete Guide to Observability in Production-Grade Systems

> _A deep, end-to-end exploration of how modern engineering teams build systems they can understand, debug, and operate with confidence — even when everything is on fire._

---

## Table of Contents

1. [What Observability Actually Means](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#1-what-observability-actually-means)
2. [Monitoring vs Observability — A Crucial Distinction](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#2-monitoring-vs-observability--a-crucial-distinction)
3. [The Three Pillars — Logs, Metrics, and Traces](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#3-the-three-pillars--logs-metrics-and-traces)
4. [How the Three Pillars Work Together](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#4-how-the-three-pillars-work-together)
5. [The Observability Lifecycle — From Event to Insight](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#5-the-observability-lifecycle--from-event-to-insight)
6. [Distributed Tracing — Following a Request Across Services](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#6-distributed-tracing--following-a-request-across-services)
7. [OpenTelemetry — The Unification Layer](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#7-opentelemetry--the-unification-layer)
8. [Instrumenting a Go Service End to End](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#8-instrumenting-a-go-service-end-to-end)
9. [The Observability Data Pipeline](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#9-the-observability-data-pipeline)
10. [Service Level Objectives and Error Budgets](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#10-service-level-objectives-and-error-budgets)
11. [Alerting Philosophy — Alerting on Symptoms, Not Causes](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#11-alerting-philosophy--alerting-on-symptoms-not-causes)
12. [The On-Call Runbook System](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#12-the-on-call-runbook-system)
13. [Observability in Microservices Architecture](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#13-observability-in-microservices-architecture)
14. [Observability in Kubernetes](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#14-observability-in-kubernetes)
15. [The Golden Signals Framework](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#15-the-golden-signals-framework)
16. [Cardinality — The Silent Killer of Observability Systems](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#16-cardinality--the-silent-killer-of-observability-systems)
17. [Continuous Profiling — The Fourth Pillar](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#17-continuous-profiling--the-fourth-pillar)
18. [Real User Monitoring and Synthetic Monitoring](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#18-real-user-monitoring-and-synthetic-monitoring)
19. [Chaos Engineering — Proving Observability Works](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#19-chaos-engineering--proving-observability-works)
20. [The Observability Maturity Model](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#20-the-observability-maturity-model)
21. [Building an Observability Culture](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#21-building-an-observability-culture)
22. [Observability Stack Selection Guide](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#22-observability-stack-selection-guide)
23. [Production Best Practices Checklist](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#23-production-best-practices-checklist)
24. [Full Production Reference Architecture](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#24-full-production-reference-architecture)

---

## 1. What Observability Actually Means

The word "observability" comes from control theory — the mathematical study of dynamic systems. In that field, a system is said to be _observable_ if its internal state can be inferred from its external outputs alone. You do not need to open the box, peer inside, or attach a debugger. By measuring what comes out, you can reason about what is happening within.

This definition, when applied to software systems, carries a profound implication: an observable system is one where **any question about its internal behavior can be answered using only the data it produces, without modifying the system, redeploying code, or attaching a debugger**. Observability is not a tool you buy. It is a property of the system itself — a property you deliberately engineer into it.

Cindy Sridharan, who wrote the foundational book on distributed systems observability, puts it this way: observability is about being able to ask _any_ question of a system, including questions you did not know you would need to ask when you built it. This is the hardest part of the definition, and the part that separates true observability from mere monitoring. Monitoring is about asking the questions you anticipated. Observability is about being able to ask the questions you never anticipated — the ones that arise for the first time at 2 AM when something novel and unexpected breaks.

```
ASCII Diagram: The Core Concept of Observability

  Traditional Monitoring (known unknowns):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   "I know my DB can fail, so I watch DB error count"                     │
  │   "I know latency can spike, so I alert on P99 > 500ms"                  │
  │   "I know disk can fill, so I watch disk usage"                          │
  │                                                                          │
  │   You can only answer questions you thought to ask BEFORE the incident   │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘
                         ▼
  Observability (known + unknown unknowns):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   System continuously emits rich, structured telemetry data              │
  │                                                                          │
  │   During an incident, engineer can ask ANY question:                     │
  │   "What were ALL the DB queries made by requests from user 42            │
  │    between 2:45 and 2:50 PM that had response time > 2s,                 │
  │    grouped by which replica they hit?"                                   │
  │                                                                          │
  │   This question was never anticipated. The system can still answer it.   │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘

  Observable System Properties:
  ┌──────────────────┬─────────────────────────────────────────────────────┐
  │  Rich data       │ Telemetry captures enough detail to reconstruct     │
  │                  │ any event, not just the ones you anticipated        │
  ├──────────────────┼─────────────────────────────────────────────────────┤
  │  Low query time  │ Tools exist to explore the data interactively, in   │
  │                  │ seconds, not hours of log grepping                  │
  ├──────────────────┼─────────────────────────────────────────────────────┤
  │  High context    │ Every data point carries enough context to be       │
  │                  │ meaningful in isolation (who, what, where, when)    │
  ├──────────────────┼─────────────────────────────────────────────────────┤
  │  Correlated      │ Logs, metrics, and traces are linked so you can     │
  │                  │ navigate between them during investigation          │
  └──────────────────┴─────────────────────────────────────────────────────┘
```

---

## 2. Monitoring vs Observability — A Crucial Distinction

Many engineers use monitoring and observability interchangeably. They are not the same thing, and conflating them leads to building systems that feel well-instrumented but fail completely during novel incidents.

Monitoring is the practice of watching predefined metrics and alerting when they breach predefined thresholds. It is reactive and bounded: you can only detect failures you anticipated. Monitoring asks _"Is this thing I already know about working or broken?"_ It is absolutely necessary — you need to know when your server is down — but it is not sufficient. Monitoring tells you that something is wrong. Observability tells you what is wrong, why, and how to fix it.

The difference becomes viscerally clear during an incident involving an unknown failure mode. Imagine a scenario where a Go service is correctly responding to all requests, all dashboards are green, all alerts are quiet, but users are experiencing intermittent 10-second delays on a specific checkout flow. Your monitoring sees no errors and no threshold breaches. But an observable system can answer the question: _"What is the p99 latency for the order creation endpoint, broken down by which downstream service was called last before the response was sent, for only the requests that had a total duration greater than 5 seconds?"_ Without that level of exploratory capability, you would spend hours guessing.

```
ASCII Diagram: Monitoring vs Observability

  MONITORING                              OBSERVABILITY
  ┌────────────────────────────┐          ┌────────────────────────────────┐
  │                            │          │                                │
  │  Predefined dashboards     │          │  Ad-hoc exploration tools      │
  │  Threshold-based alerts    │          │  Flexible query languages      │
  │  Answers known questions   │          │  Answers unknown questions     │
  │  Good for: "Is it up?"     │          │  Good for: "Why is it slow?"   │
  │                            │          │                                │
  │  Detects: known failures   │          │  Detects: any failure          │
  │  Miss: novel failures      │          │  Including novel ones          │
  │                            │          │                                │
  │  Tools: Nagios, Zabbix,    │          │  Tools: Prometheus + Grafana,  │
  │  simple uptime checks      │          │  Loki, Jaeger, Tempo, OTel     │
  │                            │          │                                │
  └────────────────────────────┘          └────────────────────────────────┘

  The relationship:
  Monitoring ⊂ Observability
  (Monitoring is a subset — a necessary but insufficient component
   of a fully observable system)
```

The practical implication is that building an observable system requires more investment than building a monitored system. You must emit richer telemetry, build more sophisticated tooling, and cultivate a culture of exploration rather than threshold-watching. But the return on that investment — measured in mean time to resolution during incidents — is enormous.

---

## 3. The Three Pillars — Logs, Metrics, and Traces

The three pillars of observability — logs, metrics, and traces — are not interchangeable tools. Each answers a fundamentally different class of question, and each has strengths that the others lack. An observable system needs all three working together, correlated through shared identifiers.

```
ASCII Diagram: The Three Pillars and What Each One Answers

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        THE THREE PILLARS                                    │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │  LOGS — "What happened?"                                                    │
  │  ┌────────────────────────────────────────────────────────────────────────┐ │
  │  │  Discrete, timestamped records of events. The narrative of the system. │ │
  │  │  Strengths:  Rich detail, arbitrary context, human readable            │ │
  │  │  Weaknesses: High volume, expensive to store, slow to query at scale   │ │
  │  │  Tools:      Zap (Go), Grafana Loki, Elasticsearch                     │ │
  │  │  Example:    {"msg":"payment failed","user_id":42,"error":"declined"}  │ │
  │  └────────────────────────────────────────────────────────────────────────┘ │
  │                                                                             │
  │  METRICS — "How much, how often, how fast?"                                 │
  │  ┌────────────────────────────────────────────────────────────────────────┐ │
  │  │  Numeric time-series measurements. The heartbeat of the system.        │ │
  │  │  Strengths:  Efficient storage, fast queries, great for trending       │ │
  │  │  Weaknesses: No context, cannot explain WHY a number changed           │ │
  │  │  Tools:      Prometheus, Grafana, InfluxDB                             │ │
  │  │  Example:    http_request_duration_p99{path="/checkout"} = 2.3s        │ │
  │  └────────────────────────────────────────────────────────────────────────┘ │
  │                                                                             │
  │  TRACES — "Where did the time go?"                                          │
  │  ┌────────────────────────────────────────────────────────────────────────┐ │
  │  │  A recording of the journey of one request across all services.        │ │
  │  │  Strengths:  End-to-end latency breakdown, dependency mapping          │ │
  │  │  Weaknesses: High overhead if sampling 100%, complex to implement      │ │
  │  │  Tools:      OpenTelemetry, Grafana Tempo, Jaeger, Zipkin              │ │
  │  │  Example:    order-svc(45ms) → payment-svc(1200ms) → stripe-api(900ms) │ │
  │  └────────────────────────────────────────────────────────────────────────┘ │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘

  The Question Each Pillar Answers:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  "Is something wrong?"           → Metrics  (alert on threshold breach) │
  │  "What exactly went wrong?"      → Logs     (detailed event narrative)  │
  │  "Where did the time go?"        → Traces   (latency breakdown by span) │
  │  "Which service caused it?"      → Traces   (dependency flow graph)     │
  │  "How often does this happen?"   → Metrics  (rate over time)            │
  │  "What was the full context?"    → Logs     (all fields of the event)   │
  │  "Is this a regression?"         → Metrics  (compare to historical data)│
  │  "What did the user experience?" → Traces + RUM (end-to-end journey)    │
  └─────────────────────────────────────────────────────────────────────────┘
```

Logs are the oldest and most familiar form of observability data. They are flexible and expressive — you can put anything you want in a log entry. Their weakness is volume: a high-traffic service produces billions of log entries per day, making storage expensive and queries slow without careful indexing. Logs are best for explaining _what happened in detail_ for a specific event or request.

Metrics are numeric measurements collected at regular intervals. Because they are just numbers, they are extraordinarily cheap to store and fast to query — a Prometheus query over weeks of data returns in milliseconds. Their weakness is that they provide no context: a spike in the error rate metric tells you _that_ errors increased but not _which_ requests failed, _why_ they failed, or _who_ was affected. Metrics are best for trending, alerting, and answering aggregate questions about system behaviour over time.

Traces record the journey of a single request as it travels through a distributed system. Each trace is composed of _spans_ — individual operations within a service or between services — each with a start time, duration, and contextual attributes. Traces answer the question that logs and metrics cannot: _"My request took 5 seconds. Where did those 5 seconds go?"_ Was it the authentication service? The database? The third-party payment API? The trace shows you the complete timeline.

---

## 4. How the Three Pillars Work Together

The magic of observability is not in any single pillar — it is in the connections between them. When your logs carry a `trace_id`, your metrics carry a `service` label that matches your log `app` field, and your traces link to the exact log entries emitted during that trace's execution, the three pillars become a unified investigation surface.

```
ASCII Diagram: Correlation Flow During an Incident Investigation

  INCIDENT: Users report slow checkout at 3:15 PM

  STEP 1: Start with METRICS (fast to query, gives you the "what")
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Grafana dashboard shows:                                              │
  │  • P99 latency for POST /api/v1/checkout spiked from 120ms → 4.2s      │
  │  • Error rate unchanged (0.02%) — it's slowness, not errors            │
  │  • Spike started at exactly 3:14:52 PM                                 │
  │  • Only affects the checkout endpoint, not GET endpoints               │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Drill down: which service is slow?

  STEP 2: Check TRACES (shows you the "where")
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Grafana Tempo shows slow checkout traces:                             │
  │                                                                        │
  │  POST /checkout    total: 4,231ms                                      │
  │  ├─ auth-service   validate_token        12ms  ✓ normal                │
  │  ├─ inventory-svc  check_stock           8ms   ✓ normal                │
  │  ├─ order-service  create_order          45ms  ✓ normal                │
  │  └─ payment-svc    charge_card           4,156ms  ← HERE IS THE PROBLEM│
  │      └─ stripe-api POST /payment_intents 4,089ms  ← Stripe is slow     │
  │                                                                        │
  │  Root cause localised: Stripe API calls are taking 4+ seconds          │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Get the full context: what exactly is happening?

  STEP 3: Check LOGS (gives you the "why" and exact details)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Query in Loki: {app="payment-svc"} | json | trace_id="abc123"         │
  │                                                                        │
  │  {"msg":"Calling Stripe API","endpoint":"/v1/payment_intents"}         │
  │  {"msg":"Stripe API response slow","elapsed_ms":4089,                  │
  │   "stripe_status":"processing","stripe_error":"api_connection_error",  │
  │   "retry_count":2,"idempotency_key":"idem-789abc"}                     │
  │  {"msg":"Stripe API eventually succeeded after retry",                 │
  │   "total_elapsed_ms":4231}                                             │
  │                                                                        │
  │  Full picture: Stripe's API is intermittently timing out               │
  │  and the retry logic is adding the bulk of the latency.                │
  └────────────────────────────────────────────────────────────────────────┘

  Total investigation time: ~4 minutes
  Without observability (just logs, no correlation): ~45 minutes of grepping
```

The key enabler of this investigation flow is the shared `trace_id`. Every log entry emitted during the processing of a request carries the same `trace_id` as the trace recorded for that request. This single field links all three pillars together, allowing you to navigate from a metric anomaly → a specific trace → the detailed logs for that exact request, in seconds rather than hours.

---

## 5. The Observability Lifecycle — From Event to Insight

Understanding how telemetry data travels from its source (your running code) to the tool that lets an engineer ask questions of it reveals where the bottlenecks and failure points of an observability system are. Each stage of this lifecycle has its own set of best practices, failure modes, and tradeoffs.

```
ASCII Diagram: Complete Observability Data Lifecycle

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  STAGE 1: INSTRUMENTATION                                                │
  │  Your Go application code emits telemetry                                │
  │                                                                          │
  │  go service                                                              │
  │  ┌────────────────────────────────────────────────────────────┐          │
  │  │  zap.Logger        → structured JSON log entries           │          │
  │  │  prometheus client → counter/gauge/histogram increments    │          │
  │  │  otel SDK          → span.Start(), span.End(), attributes  │          │
  │  └───────────────────────────────┬────────────────────────────┘          │
  └──────────────────────────────────┼───────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼───────────────────────────────────────┐
  │  STAGE 2: COLLECTION                                                     │
  │  Agents and exporters gather raw telemetry from services                 │
  │                                                                          │
  │  Logs:    Promtail / Fluentbit tails stdout and files                    │
  │  Metrics: Prometheus scrapes /metrics endpoint every 15s                 │
  │  Traces:  OTel SDK exports spans to OTel Collector via gRPC              │
  └──────────────────────────────────┬───────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼───────────────────────────────────────┐
  │  STAGE 3: PROCESSING                                                     │
  │  Raw telemetry is transformed, enriched, and filtered                    │
  │                                                                          │
  │  OTel Collector: batches spans, adds k8s metadata, drops debug traces    │
  │  Promtail:       parses JSON, extracts labels, drops health check logs   │
  │  Prometheus:     records/storage scrape, evaluates recording rules       │
  └──────────────────────────────────┬───────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼───────────────────────────────────────┐
  │  STAGE 4: STORAGE                                                        │
  │  Processed telemetry is persisted in purpose-built databases             │
  │                                                                          │
  │  Logs:    Grafana Loki     (compressed chunks by label set)              │
  │  Metrics: Prometheus TSDB  (time-series optimised storage)               │
  │  Traces:  Grafana Tempo    (object storage: S3/GCS)                      │
  └──────────────────────────────────┬───────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼───────────────────────────────────────┐
  │  STAGE 5: QUERY AND VISUALISATION                                        │
  │  Engineers explore telemetry data to answer questions                   │
  │                                                                          │
  │  Grafana: unified UI for dashboards, exploration, correlation           │
  │  LogQL:   query language for Loki log data                              │
  │  PromQL:  query language for Prometheus metric data                     │
  │  TraceQL: query language for Tempo trace data                           │
  └──────────────────────────────────┬───────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼───────────────────────────────────────┐
  │  STAGE 6: ALERTING AND ACTION                                            │
  │  Anomalies trigger notifications and automated responses                 │
  │                                                                          │
  │  Prometheus Alertmanager: routes alerts to Slack, PagerDuty              │
  │  Grafana Alerting:        unified alert rules across all data sources    │
  │  On-call runbooks:        engineers follow documented investigation paths│
  └──────────────────────────────────────────────────────────────────────────┘
```

Each stage of this lifecycle introduces latency between an event occurring in your system and an engineer being able to see it. In well-built observability systems, this end-to-end latency — from an event happening to it appearing queryable in your tools — is typically 30 to 60 seconds for logs and traces, and 15 seconds for metrics (due to Prometheus's scrape interval). This is called the **observability lag**, and understanding it is important for setting realistic expectations during incident response.

---

## 6. Distributed Tracing — Following a Request Across Services

Distributed tracing is the pillar that most clearly separates modern observability from traditional monitoring, and it is the one most likely to be underinvested. In a monolithic application, a slow function is easy to find: you profile the process and the call stack tells you everything. In a microservices architecture, a slow request might involve 10 or 15 services, each of which appears individually healthy. Without distributed tracing, diagnosing where the time went is nearly impossible.

A distributed trace is a collection of **spans** linked by a common **trace ID**. Every span represents one unit of work — an HTTP handler, a database query, an external API call — with a precise start time and duration. Spans are arranged in a parent-child tree, reflecting how work was delegated from one service to another.

```
ASCII Diagram: Anatomy of a Distributed Trace

  trace_id: 7f3a8c2d1e9b4f5a

  User Browser
  └── GET /checkout                       [0ms ──────────────────── 4,231ms]
      │
      ├── api-gateway     route_request   [0ms ── 3ms]
      │
      ├── auth-service    validate_token  [3ms ──── 15ms]
      │       └── redis   GET token:xyz   [4ms -- 6ms]
      │
      ├── inventory-svc    check_stock     [15ms ──── 23ms]
      │       └── postgres SELECT items   [16ms -- 22ms]
      │
      ├── order-service    create_order    [23ms ────────── 68ms]
      │       ├── postgres INSERT order   [24ms -- 45ms]
      │       └── rabbitmq publish msg    [45ms -- 67ms]
      │
      └── payment-svc     charge_card     [68ms ──────────────────── 4,231ms]  ← slow
              ├── [internal]prepare_req   [68ms - 75ms]
              └── stripe-api POST /v1/    [75ms ──────────────────── 4,164ms]  ← culprit
                      [network timeout, retried once]

  Reading this trace, the engineer immediately knows:
  • Total request time: 4,231ms
  • Auth, inventory, and order creation are all fast (< 70ms total)
  • The entire latency is in payment-svc calling stripe-api
  • Stripe took 4,089ms — this is a Stripe-side issue, not our code
  • Investigation complete in seconds, not hours
```

Spans carry **attributes** — key-value pairs that provide context about the operation. A database span might carry `db.system=postgresql`, `db.statement=SELECT * FROM orders WHERE id=$1`, `db.row_count=1`. An HTTP span carries `http.method=POST`, `http.url=/v1/payment_intents`, `http.status_code=200`. These attributes make the trace data rich enough to answer detailed questions without needing to cross-reference logs.

The mechanism that links spans across service boundaries is **context propagation**. When service A calls service B, it injects the current trace context (trace ID and current span ID) into the outgoing request as HTTP headers — typically `traceparent` following the W3C TraceContext standard. Service B extracts this context and creates its spans as children of A's span. This is how the tree structure of a trace is built across process boundaries.

```go
package tracing

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("order-service")

// Server-side: extract trace context from incoming request
func TraceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract the W3C traceparent header if it exists
        // This links this service's spans to the calling service's spans
        ctx := otel.GetTextMapPropagator().Extract(
            r.Context(),
            propagation.HeaderCarrier(r.Header),
        )

        // Start a new span for this HTTP handler
        ctx, span := tracer.Start(ctx, r.Method+" "+r.URL.Path,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                attribute.String("http.method", r.Method),
                attribute.String("http.url", r.URL.String()),
                attribute.String("http.user_agent", r.UserAgent()),
            ),
        )
        defer span.End()

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Client-side: inject trace context into outgoing request
func InstrumentedHTTPClient() *http.Client {
    return &http.Client{
        Transport: &tracingTransport{
            inner: http.DefaultTransport,
        },
    }
}

type tracingTransport struct {
    inner http.RoundTripper
}

func (t *tracingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    ctx, span := tracer.Start(req.Context(), "HTTP "+req.Method+" "+req.URL.Host,
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("http.method", req.Method),
            attribute.String("http.url", req.URL.String()),
        ),
    )
    defer span.End()

    // Inject the traceparent header so the downstream service can link its spans
    clone := req.Clone(ctx)
    otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(clone.Header))

    resp, err := t.inner.RoundTrip(clone)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }

    span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))
    return resp, nil
}

// Instrumenting a database operation
func (r *OrderRepository) FindByID(ctx context.Context, id int64) (*Order, error) {
    ctx, span := tracer.Start(ctx, "db.query orders.find_by_id",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "SELECT"),
            attribute.String("db.sql.table", "orders"),
            attribute.Int64("db.query.param.id", id),
        ),
    )
    defer span.End()

    var order Order
    err := r.db.QueryRowContext(ctx,
        "SELECT id, user_id, total, status FROM orders WHERE id = $1", id,
    ).Scan(&order.ID, &order.UserID, &order.Total, &order.Status)

    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }

    span.SetAttributes(attribute.String("db.result.status", order.Status))
    return &order, nil
}
```

---

## 7. OpenTelemetry — The Unification Layer

Before OpenTelemetry, every observability vendor — Datadog, New Relic, Jaeger, Zipkin — required its own proprietary SDK embedded in your application code. Switching vendors meant rewriting all your instrumentation. OpenTelemetry (OTel) was created to solve this by defining a single, vendor-neutral instrumentation API and SDK that any backend can receive.

OpenTelemetry is the result of merging two earlier projects: OpenCensus (from Google) and OpenTracing. It is now a graduated CNCF project and the industry standard for application instrumentation. When you instrument your Go service with OTel, you choose the backend (Jaeger, Tempo, Datadog, Honeycomb) independently of the instrumentation code. Changing backends requires changing only a few lines of configuration — not touching a single instrumentation call.

```
ASCII Diagram: OpenTelemetry Architecture

  Your Go Application
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  OTel API (stable, abstract):                                           │
  │  tracer.Start(ctx, "span-name")    → creates a span                     │
  │  span.SetAttributes(...)           → adds context to span               │
  │  span.RecordError(err)             → marks span as failed               │
  │  meter.Int64Counter(...)           → creates a metric                   │
  │  logger.Emit(record)               → emits a log record                 │
  │                                                                         │
  │  OTel SDK (configurable, pluggable):                                    │
  │  TracerProvider  → manages span lifecycle and export                    │
  │  MeterProvider   → manages metric collection and export                 │
  │  LoggerProvider  → manages log record export                            │
  │                                                                         │
  │  Exporters (swap without code changes):                                 │
  │  OTLP (gRPC/HTTP) → OTel Collector → any backend                        │
  │  Jaeger exporter  → Jaeger directly                                     │
  │  Stdout exporter  → terminal (development only)                         │
  └─────────────────────────────────────┬───────────────────────────────────┘
                                        │ OTLP protocol (gRPC port 4317)
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │              OTel Collector (optional but recommended)                  │
  │                                                                         │
  │  Receivers:    otlp, jaeger, zipkin, prometheus                         │
  │  Processors:   batch, attributes, filter, sampling, k8s metadata        │
  │  Exporters:    loki, tempo, prometheus, datadog, honeycomb, jaeger      │
  │                                                                         │
  │  Benefits: centralised config, tail-based sampling, fan-out to          │
  │  multiple backends, secret isolation (app never has backend creds)      │
  └─────────────────────────────────────────────────────────────────────-───┘
                                        │
              ┌─────────────────────────┼──────────────────────┐
              ▼                         ▼                       ▼
     Grafana Tempo               Grafana Loki            Prometheus
     (trace storage)             (log storage)           (metric storage)
```

The OTel Collector is the central routing hub of the observability pipeline. Your application sends all telemetry (logs, metrics, traces) to the Collector in the OTLP format. The Collector then fans it out to the appropriate storage backends. This architecture means your application code is completely decoupled from your storage choices: you can run Jaeger today, switch to Tempo next month, and add Honeycomb the month after — all without touching application code.

```go
package observability

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "google.golang.org/grpc"
)

// InitTracer configures the OpenTelemetry tracer and connects it to the OTel Collector.
// Returns a shutdown function that must be called when the application exits.
func InitTracer(ctx context.Context, serviceName, serviceVersion, collectorAddr string) (func(context.Context) error, error) {
    // Define the resource — metadata that identifies this service in all telemetry
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(serviceVersion),
            semconv.DeploymentEnvironment(os.Getenv("APP_ENV")),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("create OTel resource: %w", err)
    }

    // Create an OTLP exporter that sends spans to the OTel Collector via gRPC
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(collectorAddr),
        otlptracegrpc.WithInsecure(), // use TLS in production
        otlptracegrpc.WithDialOption(grpc.WithBlock()),
    )
    if err != nil {
        return nil, fmt.Errorf("create OTLP exporter: %w", err)
    }

    // Configure the TracerProvider with:
    // - BatchSpanProcessor: buffers spans and sends in batches (low overhead)
    // - ParentBased + TraceIDRatioBased sampler: sample 10% of root spans
    //   but always sample if the parent span was sampled (keeps traces complete)
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(
            sdktrace.ParentBased(
                sdktrace.TraceIDRatioBased(0.1), // 10% head-based sampling
            ),
        ),
    )

    // Register as the global tracer provider — all otel.Tracer() calls use this
    otel.SetTracerProvider(tp)

    // Register W3C TraceContext + Baggage propagators
    // This is what makes context propagation via HTTP headers work
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    // Return shutdown function — call this at application exit to flush buffered spans
    return tp.Shutdown, nil
}
```

---

## 8. Instrumenting a Go Service End to End

Bringing all three pillars together in a single Go service requires integrating Zap (logs), Prometheus (metrics), and OpenTelemetry (traces) in a unified way, where they share context through the request lifecycle. The key is that all three are initialized once at startup, injected via dependency injection, and correlated through the shared `trace_id`.

```
ASCII Diagram: Three-Pillar Integration in a Single Go Service

  main.go
  ┌────────────────────────────────────────────────────────────────────────────┐
  │  1. Init Logger   (Zap, JSON, to stdout + Loki)                            │
  │  2. Init Metrics  (Prometheus custom registry, /metrics endpoint)          │
  │  3. Init Tracer   (OTel SDK, OTLP exporter to OTel Collector)              │
  │  4. Wire deps:    handler(logger, metrics, tracer) → service → repo        │
  └────────────────────────────────────────────────────────────────────────────┘

  HTTP Request enters:
  ┌────────────────────────────────────────────────────────────────────────────┐
  │  middleware stack (applied in order):                                      │
  │                                                                            │
  │  TraceMiddleware     → starts root span, extracts parent if present        │
  │                        injects trace_id into request context               │
  │                                                                            │
  │  RequestIDMiddleware → generates request_id (or reads from header)         │
  │                        creates request-scoped Zap logger with request_id   │
  │                        AND trace_id both pre-attached                      │
  │                                                                            │
  │  MetricsMiddleware   → wraps response writer to capture status code        │
  │                        records http_requests_total, http_request_duration  │
  │                                                                            │
  │  Handler executes:                                                         │
  │    span := tracer.Start(ctx, "create_order")    → new child span           │
  │    log  := L(ctx, logger)                       → gets request logger      │
  │    reg.OrdersTotal.Inc()                        → increments counter       │
  │                                                                            │
  │  Every log entry carries: request_id + trace_id + span_id                  │
  │  Every metric carries: service label, path label, status label             │
  │  Every span carries: service name, version, environment attributes         │
  └────────────────────────────────────────────────────────────────────────────┘
```

The three-pillar correlation is achieved by injecting the OTel `trace_id` and `span_id` into the Zap logger at the point where a new span is created. This way, every log entry produced during a span carries the span's trace ID, making Grafana's "jump from log to trace" feature work automatically.

```go
// The key integration function: enrich the logger with OTel trace context
func enrichLoggerWithTrace(ctx context.Context, base *zap.Logger) *zap.Logger {
    span := trace.SpanFromContext(ctx)
    if !span.SpanContext().IsValid() {
        return base
    }
    return base.With(
        zap.String("trace_id", span.SpanContext().TraceID().String()),
        zap.String("span_id", span.SpanContext().SpanID().String()),
        zap.Bool("trace_sampled", span.SpanContext().IsSampled()),
    )
}

// Use in middleware: runs once per request, enriches the request-scoped logger
func TraceAndLogMiddleware(base *zap.Logger, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract or start trace
        ctx, span := tracer.Start(r.Context(), r.Method+" "+r.URL.Path)
        defer span.End()

        // Enrich logger with trace context
        traceLogger := enrichLoggerWithTrace(ctx, base)

        // Store in context
        ctx = context.WithValue(ctx, loggerKey, traceLogger)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

With this pattern, a log entry in Grafana Loki that carries `trace_id=7f3a8c2d` becomes a clickable link that opens Grafana Tempo and shows the exact trace for that request — all its spans, their durations, and their attributes. This single feature reduces investigation time more than almost any other observability investment.

---

## 9. The Observability Data Pipeline

In a production Kubernetes environment, the observability data pipeline is a complex, multi-component system. Understanding each component's role, failure modes, and scaling characteristics is essential for operating it reliably.

```
ASCII Diagram: Production Observability Data Pipeline

  ┌─────────────────────────────────────────────────────────────────────────-┐
  │                    APPLICATION TIER                                      │
  │                                                                          │
  │  order-svc (×3)  payment-svc (×2)  auth-svc (×2)  inventory-svc (×1)     │
  │      │                 │                 │                 │             │
  │      │ stdout (JSON)   │ stdout          │ stdout          │ stdout      │
  │      │ /metrics        │ /metrics        │ /metrics        │ /metrics    │
  │      │ OTLP gRPC       │ OTLP gRPC       │ OTLP gRPC       │ OTLP gRPC   │
  └──────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
         │                 │                 │                 │
  ┌──────▼─────────────────▼─────────────────▼─────────────────▼─────────────┐
  │                    COLLECTION TIER                                       │
  │                                                                          │
  │  ┌─────────────────┐              ┌────────────────────────────────────┐ │
  │  │  Promtail       │              │   OTel Collector                   │ │
  │  │  (DaemonSet)    │              │   (Deployment, 3 replicas)         │ │
  │  │                 │              │                                    │ │
  │  │  Tails all pod  │              │   Receives: OTLP (gRPC :4317)      │ │
  │  │  stdout logs    │              │   Processes: batch, k8s attrs,     │ │
  │  │  Parses JSON    │              │              tail sampling         │ │
  │  │  Labels:        │              │   Exports:  → Tempo (traces)       │ │
  │  │  namespace, pod │              │             → Loki (logs via OTLP) │ │
  │  │  app, level     │              │             → Prometheus (metrics) │ │
  │  └────────┬────────┘              └──────────────────┬─────────────────┘ │
  └───────────┼──────────────────────────────────────────┼───────────────────┘
              │                                          │
  ┌───────────▼──────────────────────────────────────────▼──────────-──────────┐
  │                    STORAGE TIER                                            │
  │                                                                            │
  │  ┌────────────────┐  ┌───────────────────-───┐  ┌───────────────────────┐  │
  │  │  Grafana Loki  │  │  Prometheus + Thanos  │  │   Grafana Tempo       │  │
  │  │                │  │                       │  │                       │  │
  │  │  Logs          │  │  Metrics              │  │  Traces               │  │
  │  │  (S3 backend)  │  │  (30d local TSDB      │  │  (S3 backend)         │  │
  │  │  30 day retain │  │   + 2yr Thanos S3)    │  │  7 day retain         │  │
  │  └────────┬───────┘  └──────────┬────────────┘  └──────────┬────────────┘  │
  └───────────┼────────────────────┼─────────────────────────┼─────────────────┘
              │                    │                          │
  ┌───────────▼────────────────────▼──────────────────────────▼─────────────────┐
  │                    VISUALISATION AND ALERTING TIER                          │
  │                                                                             │
  │  ┌────────────────────────────────────────────────────────────────────────┐ │
  │  │                      Grafana                                           │ │
  │  │                                                                        │ │
  │  │  Datasources:  Loki │ Prometheus │ Tempo                               │ │
  │  │                                                                        │ │
  │  │  Dashboards:   RED metrics   │  Go runtime  │  Business metrics        │ │
  │  │                DB/Cache      │  K8s cluster  │  SLO dashboards         │ │
  │  │                                                                        │ │
  │  │  Explore:      Correlate logs ↔ metrics ↔ traces                       │ │
  │  │                                                                        │ │
  │  │  Alerting:     Unified alert rules across all datasources              │ │
  │  └────────────────────────────────────────────────────────────────────────┘ │
  │                              │                                              │
  │  ┌────────────────────────────▼───────────────────────────────────────────┐ │
  │  │                     Alertmanager                                       │ │
  │  │  Critical → PagerDuty  │  Warning → Slack  │  Info → Email digest      │ │
  │  └────────────────────────────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Service Level Objectives and Error Budgets

Service Level Objectives (SLOs) are the bridge between observability data and business accountability. An SLO is a specific, measurable target for a service's reliability. It transforms vague aspirations like "our service should be reliable" into precise, queryable statements like "99.9% of checkout requests should complete successfully within 500ms, measured over a rolling 30-day window."

SLOs are built on top of metrics. The metric that an SLO measures is called a **Service Level Indicator (SLI)** — the actual measured performance. The target for that SLI is the SLO. The contractual promise to users is the **Service Level Agreement (SLA)**.

```
ASCII Diagram: SLI, SLO, SLA, and Error Budget Relationships

  ┌────────────────────────────────────────────────────────────────────────────┐
  │  SLI (Service Level Indicator): The measurement                           │
  │  "What fraction of checkout requests completed in < 500ms this week?"     │
  │  PromQL: sum(rate(http_requests_total{status!~"5..",                       │
  │                   path="/checkout",duration<0.5}[7d]))                    │
  │         / sum(rate(http_requests_total{path="/checkout"}[7d]))            │
  │  Current value: 99.87%                                                    │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  SLO (Service Level Objective): The internal target                       │
  │  "99.9% of checkout requests complete in < 500ms (30-day rolling window)" │
  │  This is what your engineering team commits to internally.                │
  ├────────────────────────────────────────────────────────────────────────────┤
  │  SLA (Service Level Agreement): The external contract                     │
  │  "99.5% availability guaranteed (credits for breach)"                     │
  │  SLA is always LOWER than SLO — the gap is your safety buffer.           │
  └────────────────────────────────────────────────────────────────────────────┘

  ERROR BUDGET:
  ┌────────────────────────────────────────────────────────────────────────────┐
  │                                                                            │
  │  SLO: 99.9% success rate over 30 days                                    │
  │  30 days = 43,200 minutes                                                 │
  │  0.1% error budget = 43.2 minutes of allowed failures per 30 days        │
  │                                                                            │
  │  Error Budget Usage:                                                       │
  │                                                                            │
  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░  52% used                  │
  │  [22.4 min used]                [20.8 min remaining]                      │
  │                                                                            │
  │  What Error Budgets Enable:                                               │
  │  • If budget is ample → team can move fast, take risks, deploy frequently │
  │  • If budget is low   → team must slow down, prioritise reliability work  │
  │  • If budget is gone  → FREEZE new features until budget recovers         │
  │                                                                            │
  │  This creates a measurable, data-driven conversation between engineering  │
  │  (wants to ship features) and operations (wants stability).              │
  └────────────────────────────────────────────────────────────────────────────┘
```

The power of error budgets is that they make the reliability vs velocity tradeoff explicit and data-driven. Instead of engineering teams and product teams arguing about whether it is safe to deploy, they look at the error budget dashboard: if there is budget remaining, deploy. If the budget is nearly exhausted, stabilise first. This removes politics from reliability decisions and replaces them with shared, objective measurements.

```yaml
# SLO recording rules in Prometheus (recording rules pre-compute expensive queries)
groups:
  - name: slo.rules
    interval: 30s
    rules:
      # Record the 30-day success rate for the checkout endpoint
      - record: slo:http_request_success_rate:30d
        expr: |
          sum(increase(http_requests_total{
            job="order-service",
            path="/api/v1/checkout",
            status_code!~"5.."
          }[30d]))
          /
          sum(increase(http_requests_total{
            job="order-service",
            path="/api/v1/checkout"
          }[30d]))

      # Record error budget remaining (1 = full budget, 0 = exhausted)
      - record: slo:error_budget_remaining:30d
        expr: |
          (slo:http_request_success_rate:30d - 0.999) / (1 - 0.999)

      # Alert when error budget is burning too fast (burn rate alert)
      # A burn rate of 14.4× means you'll exhaust the 30-day budget in 2 days
      - alert: ErrorBudgetBurnRateCritical
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          ) > (14.4 * 0.001)
        for: 5m
        annotations:
          summary: "Error budget burning at 14.4× normal rate — will exhaust in 50 hours"
```

---

## 11. Alerting Philosophy — Alerting on Symptoms, Not Causes

The most common alerting mistake is alerting on causes rather than symptoms. A _cause_ is an internal state of the system: "CPU is at 90%", "database connection pool is 80% full", "memory usage is 70%". A _symptom_ is what a user actually experiences: "requests are failing", "responses are slow", "checkout is unavailable".

Cause-based alerting creates alert fatigue. Your CPU might reach 90% briefly during a batch job without any user impact. Your memory might be at 70% while all requests complete perfectly. These alerts wake people up unnecessarily, training on-call engineers to dismiss alerts — including the ones that matter.

Symptom-based alerting directly measures user experience. If users are experiencing failures (error rate is high) or slowness (P99 latency is high), that is worth waking someone up. How the system arrived at that state — whether through CPU pressure, memory pressure, or a downstream dependency failure — is the root cause analysis that comes _after_ the page, not the trigger for the page.

```
ASCII Diagram: Symptom-Based vs Cause-Based Alerting

  CAUSE-BASED (noisy, low signal):               SYMPTOM-BASED (quiet, high signal):
  ┌────────────────────────────────────┐    ┌────────────────────────────────────┐
  │  ❌ CPU > 85% for 5m               │    │  ✅ Error rate > 1% for 2m        │
  │  ❌ Memory > 75%                   │    │  ✅ P99 latency > 500ms for 5m    │
  │  ❌ DB connections > 80%           │    │  ✅ Service not producing metrics | 
  │  ❌ Goroutines > 500               │    │  ✅ Checkout conversion rate < 80% │
  │  ❌ GC pause > 100ms               │    │  ✅ Error budget burn rate > 10×   │
  │  ❌ Cache miss rate > 20%          │    │  ✅No successful worker run in 2h  |
  │                                    │    │                                    │
  │  Problem: these fire constantly    │    │  These fire only when users are    │
  │  and usually without user impact   │    │  actually experiencing problems    │
  │                                    │    │                                    │
  │  Result: alert fatigue,            │    │  Result: every page is meaningful, │
  │  on-call ignores alerts            |    │  on-call trusts alerts             │
  └────────────────────────────────────┘    └────────────────────────────────────┘

  The Multiwindow, Multi-Burn-Rate Alert (Google SRE recommendation):
  ┌────────────────────────────────────────────────────────────────────────────┐
  │                                                                            │
  │  Page (critical):                                                          │
  │    Burn rate > 14.4× over 1h AND burn rate > 14.4× over 5m                 │
  │    Meaning: will exhaust 30-day budget in < 2 days                         │
  │    Response: wake up, fix immediately                                      │
  │                                                                            │
  │  Ticket (warning):                                                         │
  │    Burn rate > 1× over 6h AND burn rate > 1× over 30m                      │
  │    Meaning: burning budget faster than it accrues                          │
  │    Response: investigate during business hours                             │
  │                                                                            │
  │  This approach gives you: fast detection + low false positive rate         │
  └────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. The On-Call Runbook System

An alert without a runbook is half-built. A runbook is a documented investigation and resolution procedure for a specific alert. When an on-call engineer is paged at 2 AM, they should not have to reason from first principles about what to check and what to do. The runbook tells them exactly where to look, what questions to ask, what commands to run, and what escalation paths exist.

A good runbook follows a consistent structure. It names the alert and describes in plain language what it means in terms of user impact. It lists the first three to five investigation steps in order of likelihood, each step pointing to specific Grafana dashboards, LogQL queries, or PromQL expressions that narrow down the cause. It lists the most common root causes with their resolution procedures. It specifies when to escalate, to whom, and with what information.

```markdown
# Runbook: HighCheckoutErrorRate

## Alert Meaning
The checkout endpoint is returning 5xx errors at more than 1% of requests.
Users are experiencing payment failures and order creation failures.
This is a P1 incident — revenue impact is occurring right now.

## User Impact
Customers attempting checkout are seeing "Something went wrong" errors.
Estimated impact: ~[error_rate]% of checkout attempts failing.

## Initial Investigation (do in order, stop when root cause found)

### Step 1: Check which service is producing errors
Open the [Error Rate by Service dashboard](https://grafana.company.com/d/abc123)
Look at the "Error Rate by Service" panel for the last 15 minutes.
→ If order-service: go to Step 2a
→ If payment-service: go to Step 2b
→ If all services: likely infrastructure issue, go to Step 5

### Step 2a: Diagnose order-service errors
Run in Grafana Loki Explore:
{app="order-service", level="error"} | json | __error__="" 

Look for patterns: all errors the same type? One specific endpoint?

### Step 2b: Diagnose payment-service errors
Check Stripe dashboard: https://dashboard.stripe.com/events
Check Stripe status page: https://status.stripe.com
Run in Loki: {app="payment-service", level="error"} | json

### Step 3: Check recent deployments
kubectl rollout history deployment/order-service -n backend
kubectl rollout history deployment/payment-service -n backend
If a deploy happened in the last 30 minutes:
→ kubectl rollout undo deployment/order-service -n backend

## Common Root Causes and Resolutions
1. Database connection pool exhausted → scale up pod replicas or increase pool limit
2. Stripe API degraded → enable fallback payment processor, update status page
3. Bad deployment → kubectl rollout undo
4. Redis cache unavailable → verify Redis pods, check memory usage

## Escalation
If unresolved in 15 minutes: escalate to [payments-team slack] and ping @payments-oncall
If Stripe is degraded: notify customer success team immediately
```

---

## 13. Observability in Microservices Architecture

Microservices amplify both the need for observability and the complexity of implementing it. In a monolith, a slow function shows up immediately in a profiler or a stack trace. In a system of 20 microservices, a slow operation might involve 12 services, each of which appears healthy in isolation. Only distributed tracing can reveal the end-to-end picture.

The critical principle for microservices observability is **context propagation** — ensuring that the trace context, request ID, and correlation IDs flow through every service boundary, whether via HTTP, gRPC, or message queues. This is the single most common gap in microservices observability: teams instrument each service individually but fail to connect them, producing traces that show only one service and logs that cannot be correlated across the system.

```
ASCII Diagram: Context Propagation Across Service Boundaries

  HTTP/gRPC calls (synchronous):
  ┌─────────────────┐     W3C traceparent header       ┌─────────────────┐
  │  order-service  │ ──────────────────────────────►  │  payment-service│
  │  trace_id: abc  │     X-Request-ID: req-xyz        │  trace_id: abc  │
  │  span_id: 001   │                                  │  parent_id: 001 │
  └─────────────────┘                                  └─────────────────┘

  Message Queue (asynchronous — context must be in message headers):
  ┌─────────────────┐   RabbitMQ message headers:      ┌─────────────────┐
  │  order-service  │   traceparent: 00-abc-001-01     │  email-service  │
  │  publishes msg  │ ──────────────────────────────►  │  consumes msg   │
  │                 │   X-Request-ID: req-xyz          │  trace_id: abc  │
  └─────────────────┘   X-Correlation-ID: corr-123     └─────────────────┘

  Without context propagation:
  → Each service's spans are isolated islands
  → Cannot trace a request across services
  → Cannot query logs for a single request across services
  → Mean time to diagnose: hours

  With context propagation:
  → Single trace shows all 12 services involved
  → Single log query finds all entries: {env="prod"} | json | trace_id="abc"
  → Mean time to diagnose: minutes
```

For message queues specifically, context propagation requires explicitly serializing the OTel trace context into the message's metadata or headers when publishing, and extracting it when consuming. The OTel SDK provides helpers for this, but many teams forget to implement it, creating a "dark spot" in their traces wherever asynchronous processing begins.

```go
// Publishing to RabbitMQ with trace context propagation
func (p *Publisher) Publish(ctx context.Context, queue string, body []byte) error {
    // Serialize the current trace context into a map
    carrier := make(propagation.MapCarrier)
    otel.GetTextMapPropagator().Inject(ctx, carrier)

    // Attach to the AMQP message headers so the consumer can extract it
    headers := amqp.Table{}
    for k, v := range carrier {
        headers[k] = v
    }

    return p.channel.Publish("", queue, false, false, amqp.Publishing{
        ContentType: "application/json",
        Headers:     headers,
        Body:        body,
    })
}

// Consuming from RabbitMQ: extract trace context from message headers
func (c *Consumer) processDelivery(delivery amqp.Delivery) {
    // Reconstruct the trace context from message headers
    carrier := make(propagation.MapCarrier)
    for k, v := range delivery.Headers {
        if s, ok := v.(string); ok {
            carrier[k] = s
        }
    }
    ctx := otel.GetTextMapPropagator().Extract(context.Background(), carrier)

    // Now ctx carries the trace context from the publisher
    // Any spans created here are children of the publisher's span
    ctx, span := tracer.Start(ctx, "process "+delivery.RoutingKey)
    defer span.End()

    // Process the message with full trace context
    c.handleMessage(ctx, delivery.Body)
}
```

---

## 14. Observability in Kubernetes

Kubernetes introduces several observability challenges that do not exist in simpler deployment environments. Pods are ephemeral — they can be rescheduled to different nodes, restarted by liveness probes, and scaled up and down. Without proper observability, a pod that restarts 47 times in one night might go undetected until the root cause causes a complete outage.

```
ASCII Diagram: Kubernetes-Specific Observability Concerns

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  What to watch in Kubernetes that you don't have in bare-metal:          │
  │                                                                          │
  │  Pod lifecycle:                                                          │
  │  • OOMKilled pods (container killed for exceeding memory limit)          │
  │  • CrashLoopBackOff (container failing on startup repeatedly)           │
  │  • Pending pods (insufficient cluster resources to schedule)             │
  │  • Evicted pods (node pressure caused pod removal)                       │
  │                                                                          │
  │  Resource pressure:                                                      │
  │  • CPU throttling (container limited by CPU limit — causes latency)     │
  │  • Memory approaching limit (next OOM kill is coming)                   │
  │  • Node disk pressure (can cause pod eviction)                           │
  │  • PVC storage utilisation (persistent volumes can fill up)             │
  │                                                                          │
  │  Networking:                                                             │
  │  • DNS lookup failures (CoreDNS overload is a common K8s issue)         │
  │  • Service mesh errors (Istio/Linkerd circuit breaker trips)             │
  │  • NetworkPolicy blocking unexpected traffic                             │
  │                                                                          │
  │  Deployment health:                                                      │
  │  • Rollout stuck (new pods not passing readiness probe)                 │
  │  • HPA not scaling (metric-server unavailable or misconfigured)         │
  └──────────────────────────────────────────────────────────────────────────┘

  Key Kubernetes metrics to always collect:
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  kube_pod_container_status_restarts_total   → detect crash loops        │
  │  kube_pod_status_phase                      → pending/running/failed    │
  │  container_memory_working_set_bytes         → memory approaching limit  │
  │  container_cpu_cfs_throttled_seconds_total  → CPU throttling rate       │
  │  kube_horizontalpodautoscaler_status_*      → HPA health                │
  │  kubelet_volume_stats_used_bytes            → PVC utilisation           │
  └──────────────────────────────────────────────────────────────────────────┘
```

Kubernetes also provides rich metadata that should be attached to all telemetry as labels: `namespace`, `pod`, `container`, `node`, `deployment`, `daemonset`. The Kube State Metrics exporter and the Kubernetes resource attributes OTel processor automatically attach this metadata to metrics and traces respectively, making it possible to ask: _"Show me all traces from pods running on node k8s-node-03 in the backend namespace where the payment-service container was OOMKilled in the last hour."_

---

## 15. The Golden Signals Framework

The Golden Signals framework, introduced in the Google Site Reliability Engineering book, defines the four metrics that most completely characterise the health of any service from the perspective of user experience. Every production service should have dashboards and alerts built around all four golden signals.

```
ASCII Diagram: The Four Golden Signals

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    THE FOUR GOLDEN SIGNALS                               │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                                                                          │
  │  1. LATENCY                                                              │
  │     "How long does it take to serve a request?"                         │
  │     Key insight: measure BOTH successful and failed requests separately. │
  │     A failed request that returns in 1ms masks a slow downstream call.  │
  │     PromQL: histogram_quantile(0.99,                                     │
  │               rate(http_request_duration_seconds_bucket[5m]))           │
  │                                                                          │
  │  2. TRAFFIC                                                              │
  │     "How much demand is the system receiving?"                           │
  │     Establishes the baseline for all other signals.                     │
  │     A 50% drop in traffic is as alarming as a 50% increase in errors.  │
  │     PromQL: rate(http_requests_total[5m])                                │
  │                                                                          │
  │  3. ERRORS                                                               │
  │     "What fraction of requests are failing?"                             │
  │     Include: explicit errors (5xx), implicit errors (wrong content,      │
  │     SLO violations), policy errors (slow responses beyond threshold).   │
  │     PromQL: rate(http_requests_total{status_code=~"5.."}[5m])           │
  │             / rate(http_requests_total[5m])                             │
  │                                                                          │
  │  4. SATURATION                                                           │
  │     "How full is the service?"                                           │
  │     Measures the fraction of a constrained resource being used.         │
  │     Saturation predicts impending failure before it happens.            │
  │     Examples: CPU utilisation, memory utilisation, DB connection pool,  │
  │     queue depth, disk usage, goroutine count.                            │
  │     PromQL: go_goroutines / 10000  (fraction of goroutine budget used)  │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘

  Dashboard Layout (one row per signal, one panel per service):
  ┌────────────────┬──────────────────┬──────────────────┬──────────────────┐
  │  LATENCY       │  TRAFFIC         │  ERRORS          │  SATURATION      │
  │  P50/P90/P99   │  Req/sec         │  Error rate %    │  CPU/Mem/Pool %  │
  │  per endpoint  │  per service     │  per service     │  per service     │
  └────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 16. Cardinality — The Silent Killer of Observability Systems

Cardinality is the number of unique time series in a Prometheus instance or the number of unique label value combinations in Loki. It is the single most common way that well-intentioned observability investments become expensive failures. Understanding cardinality and managing it proactively is one of the most important operational skills in modern backend engineering.

Every unique combination of label values in a Prometheus metric creates a new time series. A metric with three labels — `service`, `endpoint`, and `status_code` — where `service` has 10 values, `endpoint` has 50 values, and `status_code` has 10 values creates a potential cardinality of 10 × 50 × 10 = 5,000 time series. That is completely manageable. But add a label for `user_id` with 1 million users, and the cardinality becomes 5 billion time series. Prometheus loads recent time series into RAM. 5 billion time series will exhaust the memory of any server.

```
ASCII Diagram: Cardinality Explosion

  Safe metric design:
  ┌────────────────────────────────────────────────────────────────────────┐
  │  http_requests_total{service, method, path, status_code}               │
  │                                                                        │
  │  service:     10 values  (order, payment, auth, ...)                  │
  │  method:       5 values  (GET, POST, PUT, DELETE, PATCH)               │
  │  path:        50 values  (normalized: /api/v1/orders/:id)             │
  │  status_code: 10 values  (200, 201, 400, 401, 403, 404, 500, 502, ...) │
  │                                                                        │
  │  Total series: 10 × 5 × 50 × 10 = 25,000 series  ← completely fine   │
  └────────────────────────────────────────────────────────────────────────┘

  Cardinality explosion (what NOT to do):
  ┌────────────────────────────────────────────────────────────────────────┐
  │  http_requests_total{service, method, path, status_code, user_id}      │
  │                                                                        │
  │  user_id: 1,000,000 values                                            │
  │                                                                        │
  │  Total series: 25,000 × 1,000,000 = 25 BILLION series                │
  │  Prometheus memory usage: ~3TB RAM                                    │
  │  Result: Prometheus crashes, all observability lost                   │
  └────────────────────────────────────────────────────────────────────────┘

  High-cardinality data belongs in LOGS and TRACES, not metrics:
  ┌────────────────────────────────────────────────────────────────────────┐
  │  user_id    → log field + trace attribute (exact queries)             │
  │  request_id → log field + trace ID (exact queries)                    │
  │  order_id   → log field + trace attribute (exact queries)             │
  │  email      → NEVER log (PII)                                         │
  │                                                                        │
  │  Rule: if the cardinality is > 100 unique values, it belongs in       │
  │  logs/traces, not in metric labels.                                    │
  └────────────────────────────────────────────────────────────────────────┘
```

Practical cardinality management requires periodic auditing. Prometheus exposes a `/api/v1/status/tsdb` endpoint that lists the top metrics by time series count. Any metric with more than 100,000 time series deserves immediate investigation. In Loki, the cardinality issue manifests differently — as "too many streams" — but has the same root cause: high-cardinality values used as labels.

---

## 17. Continuous Profiling — The Fourth Pillar

Logs, metrics, and traces tell you _that_ your service is slow and _where_ the latency went at a high level. But they cannot tell you _why_ a function is slow at the code level. For that, you need profiling — the practice of continuously sampling the CPU call stack of a running process to identify which functions consume the most time.

Continuous profiling, unlike traditional one-off profiling sessions, runs always in production, capturing a low-overhead sample of the call stack every few milliseconds. Over time, these samples accumulate into a statistically reliable picture of where CPU time is spent. When you notice a latency regression in your traces, you can open the profiler and immediately see which Go function, which package, or which library was responsible.

```
ASCII Diagram: Continuous Profiling in Context

  Traditional Debugging Path (without profiling):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Trace shows: payment-svc.charge_card took 200ms (was 50ms last week)   │
  │  But WHY did charge_card get slower?                                     │
  │  → Must reproduce locally                                                │
  │  → Run pprof in development                                              │
  │  → Hope the production conditions are replicable                        │
  │  → Time to resolution: hours to days                                    │
  └──────────────────────────────────────────────────────────────────────────┘

  With Continuous Profiling (Pyroscope / Grafana Pyroscope):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Trace shows: payment-svc.charge_card took 200ms (was 50ms last week)   │
  │  Open Pyroscope → select payment-svc → filter to charge_card scope      │
  │  Flame graph shows: 140ms in json.Marshal called with a 10MB payload    │
  │  Root cause: someone added a debug log that serializes the full card     │
  │  object. Fix: remove the debug log. Deploy. Latency drops back to 50ms. │
  │  Time to resolution: 10 minutes                                          │
  └──────────────────────────────────────────────────────────────────────────┘
```

Go has excellent built-in support for profiling via the `pprof` package. Enabling the profiling endpoint is a single import:

```go
import _ "net/http/pprof"

// This registers profiling handlers on the default mux:
// GET /debug/pprof/         → index of available profiles
// GET /debug/pprof/profile  → 30-second CPU profile
// GET /debug/pprof/heap     → heap allocation profile
// GET /debug/pprof/goroutine → goroutine dump
// IMPORTANT: only expose this on the internal port, never publicly
```

For continuous profiling in production, Grafana Pyroscope integrates with Go's pprof and provides flame graph visualisation correlated with your other Grafana data sources, including the ability to open a profile for the exact time window when a trace showed high latency.

---

## 18. Real User Monitoring and Synthetic Monitoring

All the observability tools discussed so far measure what happens inside your servers. But the user experience is the combination of server-side processing _and_ client-side rendering, network latency, CDN performance, and browser execution. Real User Monitoring (RUM) and Synthetic Monitoring close this gap.

**Real User Monitoring** collects performance data from actual users' browsers or mobile apps. It measures metrics like Time to First Byte (TTFB), First Contentful Paint (FCP), Largest Contentful Paint (LCP), and Core Web Vitals — the metrics Google uses for search ranking. RUM data reveals problems that server-side metrics cannot: a CDN that is slow for users in Southeast Asia, a JavaScript bundle that takes 8 seconds to parse on low-end Android devices, or an API endpoint that is fast on your server but slow to the user because of network routing issues.

**Synthetic Monitoring** runs automated browser tests from multiple geographic locations on a fixed schedule. Unlike RUM, which only sees traffic from real users, synthetic tests run even at 3 AM when no users are active. This makes them ideal for detecting outages and regressions before users encounter them.

```
ASCII Diagram: Full-Stack Observability with RUM

  User's Browser / Mobile App
  ┌────────────────────────────────────────────────────────────────────────┐
  │  RUM SDK (Grafana Faro, Datadog RUM, Sentry Performance)               │
  │                                                                        │
  │  Collects:                                                             │
  │  • Web Vitals: LCP, CLS, FID, TTFB                                   │
  │  • JavaScript errors and stack traces                                  │
  │  • API call durations from the client perspective                     │
  │  • User journey recordings (clicks, navigations)                      │
  │  • Performance timeline: DNS → TCP → TLS → Request → Response → Paint │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │
                             sends telemetry to
                                     │
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Backend Collector (Grafana Faro Collector)                            │
  │  Routes to Loki (RUM logs) and Tempo (RUM traces)                     │
  └──────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Grafana — correlated RUM + backend data                               │
  │  "User in Mumbai experienced 8s LCP. Why?"                            │
  │  → CDN cache miss in ap-south-1                                       │
  │  → API call took 3.2s (from user perspective)                         │
  │  → Server-side was 120ms — remaining 3080ms was network latency       │
  │  → Fix: cache the API response at the edge CDN                        │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 19. Chaos Engineering — Proving Observability Works

Observability infrastructure is only valuable if it works correctly when you need it most — during an incident. Chaos engineering is the practice of intentionally injecting failures into a system to verify that the observability and incident response processes work as expected, before a real incident forces you to find out the hard way.

The most important chaos engineering exercises for testing observability are: kill a random pod (does the alert fire within 2 minutes? does Grafana show the gap?), saturate the database connection pool (does the saturation metric alert fire? can the trace show which service is waiting for connections?), and inject latency into a downstream service (does the trace correctly attribute the latency? does the correct team get paged?).

Each chaos experiment should have a defined hypothesis (_"If we kill one payment-service pod, an alert should fire within 90 seconds and the on-call engineer should be able to identify the cause from observability data within 5 minutes"_) and a defined rollback plan. The result of the experiment is not just whether the system recovered, but whether the observability system provided the data needed to diagnose and respond to the failure.

---

## 20. The Observability Maturity Model

Teams do not build a fully observable system overnight. Observability is built incrementally, and understanding where your team is in the maturity model helps you prioritise the highest-value next investment.

```
ASCII Diagram: Observability Maturity Model

  LEVEL 0 — Dark (no observability)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  No structured logging. No metrics. No tracing.                        │
  │  Incidents are detected by user complaints.                            │
  │  Diagnosis involves SSH-ing into servers and grepping log files.       │
  │  MTTR: days to weeks.                                                  │
  └────────────────────────────────────────────────────────────────────────┘

  LEVEL 1 — Reactive (basic monitoring)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Basic uptime monitoring. Error rate alerts. Simple dashboards.        │
  │  Logs exist but are unstructured plain text.                           │
  │  Can detect known failures. Cannot diagnose novel ones.               │
  │  MTTR: hours.                                                          │
  └────────────────────────────────────────────────────────────────────────┘

  LEVEL 2 — Structured (three pillars separately)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Structured JSON logs shipped to Loki.                                 │
  │  Prometheus metrics with RED method coverage.                          │
  │  Basic distributed tracing with OTel.                                 │
  │  Each pillar works but they are not correlated.                       │
  │  MTTR: 30–60 minutes.                                                 │
  └────────────────────────────────────────────────────────────────────────┘

  LEVEL 3 — Correlated (three pillars linked)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  All three pillars share trace_id, enabling one-click navigation.     │
  │  SLOs defined and tracked with error budgets.                         │
  │  Symptom-based alerting (alert on user impact, not cause).            │
  │  Runbooks for every alert.                                             │
  │  MTTR: 5–15 minutes.                                                  │
  └────────────────────────────────────────────────────────────────────────┘

  LEVEL 4 — Proactive (predicting and preventing)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Continuous profiling identifies performance regressions before SLO   │
  │  breaches occur.                                                       │
  │  Anomaly detection flags unusual patterns before thresholds are hit.  │
  │  Chaos engineering validates observability and runbooks regularly.    │
  │  Business metrics correlated with technical metrics.                  │
  │  MTTR: < 5 minutes. Many incidents prevented entirely.               │
  └────────────────────────────────────────────────────────────────────────┘

  LEVEL 5 — Autonomous (machine-assisted operations)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Automatic root cause correlation across pillars.                     │
  │  Self-healing: auto-rollback on SLO breach, auto-scaling on latency.  │
  │  ML-based anomaly detection on business and technical metrics.        │
  │  MTTR: seconds for known failure modes, < 5 min for novel ones.       │
  └────────────────────────────────────────────────────────────────────────┘
```

Most healthy production engineering teams operate at Level 3 or early Level 4. The most common gap between Level 2 and Level 3 is trace-log correlation (adding `trace_id` to all log entries). This single investment — which requires adding perhaps 10 lines of middleware code — often has the highest ROI of any observability improvement because it dramatically reduces investigation time.

---

## 21. Building an Observability Culture

Observability tools without an observability culture are expensive infrastructure that rarely gets used. The tools are the easy part. The culture is the hard part.

An observability culture means that engineers treat observability as a first-class engineering responsibility, not a DevOps or SRE afterthought. Every new feature includes observability requirements — _"this feature must emit a metric for the business conversion rate and a log entry at each key decision point"_ — alongside functional requirements. Code review includes checking that new endpoints are instrumented, new background jobs log their outcomes, and new integrations propagate trace context.

It means that incidents are investigated using observability data, and that post-incident reviews include an assessment of observability gaps: _"During this incident, we could not determine X because we lacked Y data. Action item: add Y instrumentation."_ Each incident becomes an investment in future observability.

It means that dashboards are maintained, kept accurate, and actually used — not just created once and forgotten. The on-call engineer who runs an investigation should be updating the runbook with what they learned, improving the dashboard with the queries they needed, and proposing new alerts for failure modes they discovered.

```
ASCII Diagram: Observability Culture Flywheel

                  ┌─────────────────────────────────┐
                  │                                 │
                  ▼                                 │
         ┌──────────────────┐                       │
         │  Incident occurs │                       │
         └────────┬─────────┘                       │
                  │                                 │
                  ▼                                 │
         ┌──────────────────────────────────┐       │
         │  Investigation using obs data    │       │
         │  (fast resolution if data exists)│       │
         └────────┬─────────────────────────┘       │
                  │                                 │
                  ▼                                 │
         ┌──────────────────────────────────┐       │
         │  Post-incident review            │       │
         │  "What data was missing?"        │       │
         │  "What would have helped?"       │       │
         └────────┬─────────────────────────┘       │
                  │                                 │
                  ▼                                 │
         ┌──────────────────────────────────┐       │
         │  Add missing instrumentation     │       │
         │  Improve dashboards + runbooks   │       │
         │  Add new alerts                  │       │
         └────────┬─────────────────────────┘       │
                  │                                 │
                  └─────────────────────────────────┘

  Each incident makes the system more observable.
  Each improvement reduces the duration and impact of the next incident.
  This is the observability culture flywheel.
```

---

## 22. Observability Stack Selection Guide

Choosing the right tools is important, but the choice matters less than the discipline of using them consistently. The following comparison helps teams make informed decisions based on their constraints.

```
ASCII Diagram: Observability Stack Options

  FULLY OPEN SOURCE (self-hosted, maximum control, highest ops burden):
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Logs:    Grafana Loki + Promtail/Alloy                                │
  │  Metrics: Prometheus + Thanos (long-term)                              │
  │  Traces:  Grafana Tempo                                                │
  │  Viz:     Grafana                                                       │
  │  Alerts:  Prometheus Alertmanager                                       │
  │  Collect: OpenTelemetry Collector                                       │
  │  Profiler: Grafana Pyroscope (open source)                             │
  │                                                                        │
  │  Cost:    Infrastructure only (~$200–$2000/month depending on scale)   │
  │  Ops:     High (you manage upgrades, scaling, backups)                 │
  │  Best for: Cost-conscious teams with strong platform engineering       │
  └────────────────────────────────────────────────────────────────────────┘

  GRAFANA CLOUD (managed, open source compatible):
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Same stack as above but fully managed by Grafana Labs                 │
  │  Same APIs, same query languages (LogQL, PromQL, TraceQL)              │
  │  Can migrate to self-hosted at any time                                │
  │                                                                        │
  │  Cost:    Free tier (50GB logs, 10k metrics, 50GB traces/month)        │
  │           Paid: ~$8/month per seat + data ingestion costs              │
  │  Ops:     Low (Grafana manages infrastructure)                         │
  │  Best for: Small–medium teams who want low ops burden                  │
  └────────────────────────────────────────────────────────────────────────┘

  DATADOG (commercial, all-in-one, easiest to start):
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Logs + Metrics + Traces + Profiling + RUM + Synthetics in one product │
  │  Best-in-class UI, ML anomaly detection, 500+ integrations             │
  │  Vendor lock-in risk: proprietary agent and APIs                       │
  │                                                                        │
  │  Cost:    ~$15–$30/host/month + per-feature costs (can get expensive)  │
  │  Ops:     Very low (SaaS)                                              │
  │  Best for: Teams prioritising time to value over cost                  │
  └────────────────────────────────────────────────────────────────────────┘

  HONEYCOMB (commercial, trace-centric, best for debugging):
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Designed around high-cardinality traces and events                    │
  │  Best exploration UX for complex microservices debugging               │
  │  No separate logs/metrics concept — everything is an event             │
  │                                                                        │
  │  Cost:    Usage-based, ~$130/month per million events                  │
  │  Ops:     Very low (SaaS)                                              │
  │  Best for: Teams with complex microservices who want deep trace UX     │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 23. Production Best Practices Checklist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              PRODUCTION OBSERVABILITY CHECKLIST                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FOUNDATION                                                                  │
│  ✅ All three pillars implemented: structured logs + metrics + traces        │
│  ✅ All telemetry uses a shared trace_id for cross-pillar correlation        │
│  ✅ Request ID generated at entry point and propagated everywhere            │
│  ✅ Consistent field naming across all services (snake_case, same names)     │
│  ✅ Service name and version attached to all telemetry as resource attrs     │
│  ✅ OpenTelemetry used for traces (vendor-neutral, future-proof)             │
│  ✅ OTel Collector deployed as intermediary (decouples app from backends)    │
│                                                                              │
│  LOGS                                                                        │
│  ✅ JSON structured logs in production, console in development               │
│  ✅ Minimum level INFO in production, DEBUG in development                   │
│  ✅ Logs shipped to Loki/Elasticsearch via agent (Promtail/Fluentbit)        │
│  ✅ No PII, passwords, tokens, or card data in any log entry                 │
│  ✅ Dynamic log level endpoint (/internal/log-level) for on-demand debug     │
│  ✅ Log retention policy defined and enforced (30d hot, 90d warm, 1yr cold)  │
│                                                                              │
│  METRICS                                                                     │
│  ✅ RED metrics (rate, errors, duration) for every service endpoint         │
│  ✅ USE metrics (utilization, saturation, errors) for every resource        │
│  ✅ Business metrics (conversion rate, revenue, active sessions)             │
│  ✅ Go runtime metrics (goroutines, GC, heap, CPU) — automatic via OTel     │
│  ✅ Database pool metrics polled and exported as gauges                      │
│  ✅ Background worker last-success timestamp for every cron job             │
│  ✅ Label cardinality < 100 unique values per label                          │
│  ✅ URL paths normalized before use as metric labels                         │
│  ✅ Long-term metric storage (Thanos/Mimir) for retention > 30 days          │
│                                                                              │
│  TRACES                                                                      │
│  ✅ Every HTTP handler instrumented with a root span                         │
│  ✅ Every database operation wrapped in a child span                         │
│  ✅ Every external API call wrapped in a client span                         │
│  ✅ W3C traceparent header injected in all outgoing HTTP requests            │
│  ✅ W3C traceparent header extracted from all incoming HTTP requests         │
│  ✅ Trace context propagated through message queue headers                   │
│  ✅ Sampling configured (10% head-based or tail-based in OTel Collector)    │
│  ✅ Trace data linked to log entries via trace_id field in logs              │
│                                                                              │
│  ALERTING                                                                    │
│  ✅ Symptom-based alerts only (user impact, not internal cause)              │
│  ✅ SLOs defined with error budgets for all critical user journeys           │
│  ✅ Multi-burn-rate alerts to detect fast and slow budget exhaustion         │
│  ✅ Alert on service silence (absent metrics for > 1 minute)                │
│  ✅ Runbook linked in every alert annotation                                 │
│  ✅ Alerts routed by severity: critical → PagerDuty, warning → Slack        │
│  ✅ Alert deduplication and grouping configured in Alertmanager              │
│  ✅ Alerts tested and validated — no alert fires without a runbook           │
│                                                                              │
│  DASHBOARDS                                                                  │
│  ✅ Golden Signals dashboard (latency/traffic/errors/saturation) per service │
│  ✅ SLO dashboard showing error budget remaining                             │
│  ✅ Derived fields in Loki for one-click navigation to Tempo traces          │
│  ✅ Grafana annotations for deployments (shows when code was changed)        │
│  ✅ Dashboards version-controlled in Git, deployed via Grafana provisioning  │
│                                                                              │
│  CULTURE AND OPERATIONS                                                      │
│  ✅ Observability requirements included in every feature spec                │
│  ✅ Instrumentation reviewed in every code review                            │
│  ✅ Post-incident reviews include observability gap analysis                 │
│  ✅ Chaos experiments run monthly to validate alerting and runbooks          │
│  ✅ On-call runbooks reviewed and updated quarterly                          │
│  ✅ New engineers onboarded to observability tools in their first week       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 24. Full Production Reference Architecture

This is the complete, end-to-end observability architecture for a production-grade microservices system running on Kubernetes, integrating all the concepts described throughout this guide.

```
ASCII Diagram: Complete Production Observability Reference Architecture

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                        APPLICATION TIER (Kubernetes Cluster)                     │
  │                                                                                  │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │
  │  │  order-svc  │  payment-svc  │  auth-svc  │  inventory-svc  │  email-svc   │ │
  │  │                                                                             │ │
  │  │  Each service instruments:                                                  │ │
  │  │  • Zap JSON logger     → stdout                                            │ │
  │  │  • Prometheus client   → /metrics (internal port 9090)                     │ │
  │  │  • OTel SDK (traces)   → OTLP gRPC to Collector :4317                      │ │
  │  │                                                                             │ │
  │  │  Middleware stack on every service:                                         │ │
  │  │  TraceMiddleware → extract/start span, inject trace_id into logger         │ │
  │  │  RequestIDMiddleware → generate request_id, store in context               │ │
  │  │  MetricsMiddleware → record RED metrics per endpoint                       │ │
  │  │  HTTPLoggerMiddleware → log request + response after handler               │ │
  │  └─────────────────────────────────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────────────────────────┘
         │ stdout                    │ /metrics (scrape)         │ OTLP gRPC :4317
         ▼                           ▼                           ▼
  ┌────────────────────┐   ┌──────────────────────┐   ┌──────────────────────────┐
  │  Promtail          │   │  Prometheus           │   │  OTel Collector          │
  │  (DaemonSet)       │   │  (scrapes every 15s)  │   │  (3 replicas)            │
  │                    │   │                       │   │                          │
  │  Tails pod stdout  │   │  Evaluates SLO rules  │   │  Receives: OTLP          │
  │  Parses JSON       │   │  Evaluates alert rules │   │  Enriches: k8s metadata │
  │  Extracts labels:  │   │  Records: recording   │   │  Samples: 10% of traces  │
  │  namespace, pod,   │   │  rules for SLO rates  │   │  Batches: 512 spans/push │
  │  app, level        │   │                       │   │  Exports:                │
  │  Ships to Loki     │   │  Remote writes to     │   │  → Tempo (traces)        │
  │                    │   │  Thanos for long-term │   │  → Loki (OTel logs)      │
  └────────┬───────────┘   └──────────┬────────────┘   └────────────┬─────────────┘
           │                          │                              │
  ┌────────▼──────────────────────────▼──────────────────────────────▼──────────────┐
  │                        OBSERVABILITY STORAGE TIER                               │
  │                                                                                  │
  │  ┌─────────────────────┐  ┌─────────────────────────┐  ┌───────────────────┐   │
  │  │   Grafana Loki      │  │  Prometheus + Thanos     │  │  Grafana Tempo    │   │
  │  │                     │  │                          │  │                   │   │
  │  │  Logs               │  │  Metrics                 │  │  Traces           │   │
  │  │  Backend: S3        │  │  Local: 30d TSDB         │  │  Backend: S3      │   │
  │  │  Retention: 90d     │  │  Long-term: 2yr Thanos   │  │  Retention: 14d   │   │
  │  │  Compressor: zstd   │  │  Compaction: enabled     │  │  Codec: snappy    │   │
  │  └──────────┬──────────┘  └───────────┬─────────────┘  └─────────┬─────────┘   │
  │             │                          │                           │             │
  └─────────────┼──────────────────────────┼───────────────────────────┼─────────────┘
                │                          │                           │
  ┌─────────────▼──────────────────────────▼───────────────────────────▼─────────────┐
  │                        VISUALISATION AND ALERTING TIER                           │
  │                                                                                  │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐ │
  │  │                            Grafana                                          │ │
  │  │                                                                             │ │
  │  │  Datasources:  Loki (logs) │ Prometheus (metrics) │ Tempo (traces)         │ │
  │  │                                                                             │ │
  │  │  Correlation:  Loki log → trace_id field → click → Tempo trace            │ │
  │  │                Tempo trace → service → click → Prometheus metric           │ │
  │  │                Prometheus alert → click → Loki log query                   │ │
  │  │                                                                             │ │
  │  │  Dashboards (version-controlled in Git):                                   │ │
  │  │  • Golden Signals per service                                               │ │
  │  │  • SLO / Error Budget per user journey                                     │ │
  │  │  • Database / Redis / RabbitMQ health                                      │ │
  │  │  • Go runtime (goroutines, GC, heap)                                       │ │
  │  │  • Kubernetes cluster health                                                │ │
  │  │  • Business metrics (orders/min, revenue/hr, conversion rate)              │ │
  │  │                                                                             │ │
  │  │  Alerting (unified rules across all datasources):                          │ │
  │  │  • HighErrorRate, SlowP99, ServiceSilent (all services)                    │ │
  │  │  • ErrorBudgetBurnRate (SLO-based, multiwindow)                            │ │
  │  │  • WorkerStuck, DBPoolExhausted, GoroutineLeak                             │ │
  │  │  • CheckoutConversionDrop (business metric alert)                          │ │
  │  └─────────────────────────────────────────────────────────────────────────────┘ │
  │                                         │                                        │
  │  ┌──────────────────────────────────────▼────────────────────────────────────┐   │
  │  │                          Alertmanager                                      │   │
  │  │                                                                            │   │
  │  │  Routes:                                                                   │   │
  │  │  severity=critical, team=payments → PagerDuty payments rotation           │   │
  │  │  severity=critical, team=backend  → PagerDuty backend rotation            │   │
  │  │  severity=warning                 → Slack #alerts-backend                 │   │
  │  │  severity=info                    → Email digest (daily)                   │   │
  │  │                                                                            │   │
  │  │  Silences: deployment windows, known degradations with tickets            │   │
  │  │  Inhibitions: service-down inhibits all other alerts from that service    │   │
  │  └────────────────────────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────────────┘

  INCIDENT INVESTIGATION FLOW:
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                  │
  │  1. PagerDuty alert fires: "HighCheckoutErrorRate — 3.2% errors (threshold 1%)" │
  │                                                                                  │
  │  2. On-call opens Grafana → Error Rate dashboard → Identifies payment-svc       │
  │                                                                                  │
  │  3. Opens Tempo → Finds slow/erroring traces for payment-svc → Sees             │
  │     stripe-api spans timing out after 5 seconds                                 │
  │                                                                                  │
  │  4. Clicks trace_id in Tempo → Navigates to Loki → Sees full log context:      │
  │     "Stripe returned 502 Bad Gateway — their status page shows degradation"     │
  │                                                                                  │
  │  5. Checks Stripe status page (linked in runbook): confirmed degradation        │
  │                                                                                  │
  │  6. Enables fallback payment processor (documented in runbook)                  │
  │                                                                                  │
  │  7. Error rate drops within 2 minutes. Alert resolves.                          │
  │                                                                                  │
  │  8. Post-incident: add Stripe status page as a data source in Grafana,          │
  │     add automatic fallback when Stripe error rate > 5%                          │
  │                                                                                  │
  │  Total time from alert to resolution: 8 minutes                                 │
  │  Without observability: estimated 45–90 minutes                                 │
  │                                                                                  │
  └──────────────────────────────────────────────────────────────────────────────────┘
```

---

_Observability is not a destination you reach — it is a practice you cultivate. Every incident is a data point about what your system cannot yet explain about itself. Every post-incident review is an opportunity to close that gap. The teams that operate the most reliable systems are not the ones that have the fewest incidents — they are the ones that, when incidents occur, can understand them fastest, resolve them quickest, and learn from them most completely. That is what it means to build and operate a truly observable system._