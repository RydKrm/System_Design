# The Complete Guide to Golang Logging with Grafana Loki

> _A production-level deep dive for developers who want to aggregate, query, and alert on logs like a modern observability engineer._

---

## Table of Contents

1. [The Problem Loki Was Born to Solve](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#1-the-problem-loki-was-born-to-solve)
2. [What is Grafana Loki?](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#2-what-is-grafana-loki)
3. [How Loki Works Internally](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#3-how-loki-works-internally)
4. [The Loki Ecosystem — Components You Must Know](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#4-the-loki-ecosystem--components-you-must-know)
5. [Loki vs Elasticsearch — Choosing the Right Tool](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#5-loki-vs-elasticsearch--choosing-the-right-tool)
6. [Installing and Running Loki Locally](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#6-installing-and-running-loki-locally)
7. [Sending Logs from Go to Loki — The Approaches](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#7-sending-logs-from-go-to-loki--the-approaches)
8. [Approach 1 — Promtail as the Log Shipper](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#8-approach-1--promtail-as-the-log-shipper)
9. [Approach 2 — Direct Push via Loki HTTP API](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#9-approach-2--direct-push-via-loki-http-api)
10. [Approach 3 — grafana/loki-client-go (Official Go Client)](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#10-approach-3--grafanaloki-client-go-official-go-client)
11. [Approach 4 — Zap + Loki via go-loki](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#11-approach-4--zap--loki-via-go-loki)
12. [Approach 5 — OpenTelemetry Collector as the Bridge](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#12-approach-5--opentelemetry-collector-as-the-bridge)
13. [Labels — The Soul of Loki](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#13-labels--the-soul-of-loki)
14. [LogQL — Querying Your Logs](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#14-logql--querying-your-logs)
15. [Structured Metadata and JSON Parsing in LogQL](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#15-structured-metadata-and-json-parsing-in-logql)
16. [Loki in a Production Go Service — Full Integration](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#16-loki-in-a-production-go-service--full-integration)
17. [Multi-Tenant Loki with X-Scope-OrgID](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#17-multi-tenant-loki-with-x-scope-orgid)
18. [Loki with Docker and Docker Compose](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#18-loki-with-docker-and-docker-compose)
19. [Loki with Kubernetes — The Real Production Setup](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#19-loki-with-kubernetes--the-real-production-setup)
20. [Alerting with Loki and Grafana](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#20-alerting-with-loki-and-grafana)
21. [Loki with Grafana Dashboards](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#21-loki-with-grafana-dashboards)
22. [Log Retention and Storage Backends](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#22-log-retention-and-storage-backends)
23. [Performance Tuning for High-Volume Go Services](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#23-performance-tuning-for-high-volume-go-services)
24. [Production Best Practices Checklist](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#24-production-best-practices-checklist)
25. [Full Production Architecture — Reference Implementation](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#25-full-production-architecture--reference-implementation)

---

## 1. The Problem Loki Was Born to Solve

Picture a production environment with a Go backend service running as twenty replicas inside a Kubernetes cluster. Each replica writes log entries to its own standard output. Every second, hundreds of requests arrive, each generating several log lines. Over the course of a single day, your cluster produces hundreds of millions of log lines spread across twenty different containers on ten different nodes.

Now a user reports that their payment failed at 2:47 PM yesterday. You know the request ID is `req-8f2a3c`. Where do you even begin? You would need to SSH into each node, find the right container log, and use `grep` to search through gigabytes of text. By the time you finish, hours have passed and the user has already filed a complaint.

This is the problem that Grafana Loki was built to solve. Loki is a centralized log aggregation system — a single place where every log line from every service, every container, and every node flows into, gets stored, and becomes instantly queryable. Instead of chasing logs across machines, you open Grafana, type a query, and within seconds you see every log line tagged `request_id=req-8f2a3c` — regardless of which replica produced it, which node it ran on, or what time zone the server was in.

---

## 2. What is Grafana Loki?

Grafana Loki is an open-source, horizontally scalable log aggregation system developed by Grafana Labs and first released in 2018. Its design philosophy is deliberately minimal and elegant, inspired by the architecture of Prometheus (the industry-standard metrics system). The tagline Grafana Labs uses for Loki is _"Like Prometheus, but for logs"_ — and once you understand Prometheus, that description makes Loki immediately intuitive.

The most important thing to understand about Loki is what it deliberately chooses **not** to do. Traditional log aggregation systems like Elasticsearch index the full content of every log line. Every word, every number, every field becomes a searchable token stored in an inverted index. This makes search extremely fast, but it comes at a significant cost: the index itself can grow to be as large as the log data it indexes, doubling your storage requirements, and the indexing process consumes substantial CPU and memory.

Loki takes a fundamentally different approach. It indexes only the **labels** — small, low-cardinality metadata attached to each stream of logs. Things like `app=order-service`, `env=production`, `region=us-east-1`. The log content itself is stored compressed and unindexed. When you query Loki, it first uses labels to find the relevant compressed chunks, then scans only those chunks for content matches. The result is dramatically lower storage costs and simpler operations, at the cost of slightly slower full-text search on large data volumes.

---

## 3. How Loki Works Internally

Understanding Loki's internals transforms you from a user who merely sends logs into it to an engineer who can tune it, debug it, and architect around its strengths and limitations.

```
ASCII Diagram: Loki Internal Architecture

  Log Producers                                          Storage
  (Go Services,                                         Backend
   Containers,
   Files)
      │
      ▼
  ┌──────────┐    Push (HTTP)    ┌─────────────────────────────────────────────┐
  │ Promtail │ ─────────────────►│              LOKI                           │
  │  or      │                  │                                              │
  │ Go Client│                  │  ┌──────────────┐    ┌────────────────────┐  │
  └──────────┘                  │  │  Distributor  │───►│    Ingester        │  │
                                │  │               │    │                    │  │
                                │  │ - validates   │    │ - holds recent     │  │
                                │  │   labels      │    │   logs in memory   │  │
                                │  │ - hashes      │    │   (WAL on disk)    │  │
                                │  │   to ingester │    │ - flushes chunks   │  │
                                │  └──────────────┘    │   to storage       │  │
                                │                       └────────┬───────────┘  │
                                │                                │              │
                                │                                ▼              │
                                │                  ┌────────────────────────┐   │
                                │                  │   Object Storage        │   │
                                │                  │  (S3 / GCS / Azure /   │   │
                                │                  │   Local Filesystem)     │   │
                                │                  │                        │   │
                                │                  │  chunks/  index/       │   │
                                │                  │  [compressed log data] │   │
                                │                  └────────────────────────┘   │
                                │                                              │
                                │  ┌──────────────┐    ┌────────────────────┐  │
                                │  │    Querier    │◄───│   Query Frontend   │◄─┼── Grafana / LogQL
                                │  │               │    │                    │  │
                                │  │ - reads from  │    │ - caches results   │  │
                                │  │   ingesters   │    │ - splits queries   │  │
                                │  │   AND storage │    │ - retries          │  │
                                │  └──────────────┘    └────────────────────┘  │
                                └─────────────────────────────────────────────┘
```

When your Go service sends a log entry to Loki, it first arrives at the **Distributor**. The Distributor's job is to validate that the labels are well-formed, then use a consistent hashing algorithm to decide which **Ingester** should receive this log stream. This is important: logs with the same set of labels always go to the same Ingester, which keeps log streams coherent.

The **Ingester** is the in-memory buffer of Loki. It receives incoming log lines and accumulates them in memory, grouped by their label set. Each unique combination of labels is called a **stream**. Once a stream accumulates enough data (or enough time passes), the Ingester compresses the chunk using Snappy or Gzip compression and flushes it to the **object storage backend** — typically Amazon S3, Google Cloud Storage, or a local filesystem for development.

The **Querier** handles read requests. When you type a LogQL query in Grafana, the Query Frontend receives it, potentially splits it into smaller time-range sub-queries for parallelism, then sends those to the Querier pool. Each Querier fetches the relevant compressed chunks from storage, decompresses them, applies the content filter (the `|=` or `|~` part of your query), and returns the matching lines.

---

## 4. The Loki Ecosystem — Components You Must Know

Loki does not stand alone. It is part of a broader observability stack, and understanding all the moving parts helps you build a coherent system.

```
ASCII Diagram: The Complete Loki Observability Ecosystem

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       LOG PRODUCERS                                     │
  │   Go Service   │   Node.js API   │   PostgreSQL   │   Nginx             │
  └────────┬────────┴────────┬────────┴───────┬────────┴────────┬────────────┘
           │                 │                │                 │
           ▼                 ▼                ▼                 ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        LOG SHIPPERS                                     │
  │                                                                         │
  │   ┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌───────────────┐   │
  │   │ Promtail │   │  Alloy   │   │   Fluentd /  │   │  Go Direct    │   │
  │   │ (classic │   │ (modern  │   │   Fluentbit  │   │  Loki Client  │   │
  │   │  agent)  │   │  agent)  │   │  (K8s plugin)│   │  (push API)   │   │
  │   └────┬─────┘   └────┬─────┘   └──────┬───────┘   └──────┬────────┘   │
  └────────┼──────────────┼────────────────┼──────────────────┼────────────┘
           └──────────────┴────────────────┴──────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   Grafana Loki  │
                                  │   (Storage +    │
                                  │    Query Engine)│
                                  └────────┬────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                       │
                    ▼                      ▼                       ▼
           ┌──────────────┐      ┌─────────────────┐    ┌──────────────────┐
           │    Grafana   │      │  Loki Ruler      │    │    LogCLI        │
           │  (Dashboards │      │  (Alerting via   │    │  (CLI for local  │
           │   + Explore) │      │   AlertManager)  │    │   debugging)     │
           └──────────────┘      └─────────────────┘    └──────────────────┘
```

**Promtail** is the traditional Loki agent. It runs as a sidecar or DaemonSet, tails log files and container stdout/stderr, applies label extraction rules, and ships the entries to Loki. It is the simplest way to get started.

**Grafana Alloy** is the modern, next-generation agent that replaces Promtail. It speaks the OpenTelemetry protocol natively and can collect logs, metrics, and traces in a single agent.

**Grafana** is the visualization layer. You query Loki using the Explore view or build dashboards showing log volume, error rates, and log content alongside your metrics from Prometheus.

**Loki Ruler** evaluates LogQL alert rules on a schedule and sends alerts to Alertmanager, which then routes them to PagerDuty, Slack, or email.

**LogCLI** is a command-line tool for querying Loki directly from your terminal, useful for quick debugging without opening a browser.

---

## 5. Loki vs Elasticsearch — Choosing the Right Tool

This is one of the most common architectural decisions teams face. Both systems aggregate and make logs searchable, but they make opposite tradeoffs.

```
ASCII Diagram: Loki vs Elasticsearch Architecture Tradeoffs

  ELASTICSEARCH (ELK Stack)                LOKI (Grafana Stack)
  ────────────────────────────────         ────────────────────────────────
  Indexing Model:                          Indexing Model:
  ┌─────────────────────────────┐          ┌─────────────────────────────┐
  │ Full-text index of ALL      │          │ Index ONLY labels           │
  │ log content                 │          │ (app, env, region, etc.)    │
  │                             │          │                             │
  │ "user" → [line 1, line 5]   │          │ Compressed chunks by label  │
  │ "payment" → [line 2, line 5]│          │ set. Content scanned on     │
  │ "failed" → [line 2, line 8] │          │ query.                      │
  └─────────────────────────────┘          └─────────────────────────────┘

  Storage Cost:    HIGH (index ≈ data)     Storage Cost:    LOW (just data + tiny index)
  Write Speed:     Slower (must index)     Write Speed:     Fast (compress and store)
  Query Speed:     Very fast (indexed)     Query Speed:     Fast for label queries,
                                                            slower for full-text scan
  Operations:      Complex (shards,        Operations:      Simple (like Prometheus)
                   replicas, mappings)
  Best For:        Full-text search,       Best For:        High-volume structured
                   ad-hoc queries,                          logs, cost-conscious teams,
                   complex analytics                        Kubernetes environments

  Cost Example:    100 GB logs/day         Cost Example:    100 GB logs/day
                   ~200 GB storage                          ~15 GB storage (compressed)
```

For Go backend services producing structured JSON logs (as Zap does), Loki is an excellent choice. Your logs already have a consistent structure with known fields, so the inability to do arbitrary full-text indexing is rarely a limitation. You query by labels (service, environment, level) and then filter by JSON field values using LogQL's built-in JSON parser.

---

## 6. Installing and Running Loki Locally

Before integrating Loki into your Go service, you need a running Loki instance. Docker Compose is the fastest way to get the full stack running locally.

```yaml
# docker-compose.yml — local observability stack
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    networks:
      - observability

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log:ro                   # host system logs
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - observability
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
    networks:
      - observability
    depends_on:
      - loki

volumes:
  loki-data:
  grafana-data:

networks:
  observability:
    driver: bridge
```

The minimal Loki configuration file:

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093

limits_config:
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

---

## 7. Sending Logs from Go to Loki — The Approaches

There are five distinct ways to get your Go application's logs into Loki, each with different tradeoffs in complexity, reliability, and coupling.

```
ASCII Diagram: Five Approaches to Sending Go Logs to Loki

  Your Go Service
  (writes JSON logs)
        │
        │──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                    ▼                    ▼               ▼               ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐   ┌──────────────┐  ┌──────────────┐
  │Approach 1│        │Approach 2│        │Approach 3│   │ Approach 4   │  │ Approach 5   │
  │          │        │          │        │          │   │              │  │              │
  │ Promtail │        │ Direct   │        │ Official │   │ Zap + go-    │  │ OTel         │
  │ tails    │        │ HTTP API │        │ Go Client│   │ loki core    │  │ Collector    │
  │ stdout/  │        │ (manual  │        │ (async   │   │ (zap plugin) │  │ (vendor-     │
  │ log file │        │  push)   │        │  push)   │   │              │  │  neutral)    │
  └────┬─────┘        └────┬─────┘        └────┬─────┘   └──────┬───────┘  └──────┬───────┘
       │                   │                   │                 │                 │
       └───────────────────┴───────────────────┴─────────────────┴─────────────────┘
                                               │
                                               ▼
                                         Grafana Loki

  Approach 1: No code change. External agent.     Best for: Production K8s
  Approach 2: Simple, self-contained.             Best for: Learning, simple apps
  Approach 3: Official, reliable, async.          Best for: Moderate traffic services
  Approach 4: Zero-code integration with Zap.     Best for: Zap-based services
  Approach 5: Future-proof, vendor neutral.       Best for: Large orgs, multi-backend
```

---

## 8. Approach 1 — Promtail as the Log Shipper

This is the recommended approach for production Kubernetes deployments and the one that requires zero changes to your Go code. Your Go service simply writes structured JSON logs to stdout (as Zap naturally does). Promtail, running as a DaemonSet on every Kubernetes node, reads those logs, attaches Kubernetes labels, and ships them to Loki.

The key principle here is **separation of concerns**: your application does its job (writing logs), and a dedicated infrastructure agent does the shipping job. This means your Go service has no dependency on Loki at all. If Loki is down, your service continues operating normally and Promtail buffers entries until Loki recovers.

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml   # tracks which log lines have been sent

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Scrape Docker container logs
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*-json.log

    pipeline_stages:
      # Parse the Docker JSON wrapper
      - json:
          expressions:
            output: log
            stream: stream
            attrs:

      # Parse the actual log content (our Go JSON logs)
      - json:
          expressions:
            level: level
            msg: msg
            app: app
            request_id: request_id
          source: output

      # Promote parsed fields to Loki labels
      - labels:
          stream:
          level:
          app:

      # Set the final log line to the inner log content
      - output:
          source: output
```

This configuration tells Promtail to tail Docker container log files, parse the outer Docker JSON wrapper, then parse the inner Go JSON log, promote `level` and `app` fields to labels, and push the result to Loki. Your Go service needs no changes whatsoever.

---

## 9. Approach 2 — Direct Push via Loki HTTP API

Sometimes you want your Go service to push logs directly to Loki without any external agent. Loki exposes a simple HTTP endpoint (`/loki/api/v1/push`) that accepts log entries in a Protobuf or JSON format. This is straightforward to implement manually and gives you a clear understanding of the Loki push protocol.

```go
package loki

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "strconv"
    "time"
)

// Stream represents a Loki log stream — one unique combination of labels.
type Stream struct {
    Stream map[string]string `json:"stream"` // the label set
    Values [][2]string       `json:"values"` // pairs of [timestamp_ns, log_line]
}

// PushRequest is the body of a Loki push API call.
type PushRequest struct {
    Streams []Stream `json:"streams"`
}

// Client is a minimal Loki HTTP push client.
type Client struct {
    endpoint string
    client   *http.Client
    labels   map[string]string // default labels attached to every push
}

func NewClient(lokiURL string, defaultLabels map[string]string) *Client {
    return &Client{
        endpoint: lokiURL + "/loki/api/v1/push",
        client:   &http.Client{Timeout: 5 * time.Second},
        labels:   defaultLabels,
    }
}

// Push sends a single log line to Loki with optional extra labels.
func (c *Client) Push(line string, extraLabels map[string]string) error {
    // Merge default labels with extra labels
    labels := make(map[string]string, len(c.labels)+len(extraLabels))
    for k, v := range c.labels {
        labels[k] = v
    }
    for k, v := range extraLabels {
        labels[k] = v
    }

    // Loki requires the timestamp in nanoseconds as a string
    ts := strconv.FormatInt(time.Now().UnixNano(), 10)

    payload := PushRequest{
        Streams: []Stream{
            {
                Stream: labels,
                Values: [][2]string{{ts, line}},
            },
        },
    }

    body, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("marshal loki payload: %w", err)
    }

    req, err := http.NewRequest("POST", c.endpoint, bytes.NewReader(body))
    if err != nil {
        return fmt.Errorf("create loki request: %w", err)
    }
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return fmt.Errorf("push to loki: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusNoContent {
        return fmt.Errorf("loki returned unexpected status: %d", resp.StatusCode)
    }

    return nil
}
```

Usage:

```go
client := loki.NewClient("http://localhost:3100", map[string]string{
    "app":     "order-service",
    "env":     "production",
    "version": "2.3.1",
})

// Push a log line with an extra label for this specific event
err := client.Push(
    `{"level":"error","msg":"payment failed","user_id":42,"error":"timeout"}`,
    map[string]string{"level": "error"},
)
```

This direct approach is instructive, but for production you should add batching, retries, and async sending — which is exactly what the official client library does.

---

## 10. Approach 3 — grafana/loki-client-go (Official Go Client)

The official Loki Go client library handles the production concerns you do not want to implement yourself: it batches log entries in memory, flushes them on a timer or when a size threshold is reached, retries on transient failures, and pushes asynchronously so your application's hot path is never blocked by network I/O.

```bash
go get github.com/grafana/loki/clients/pkg/promtail
```

Because the full Loki repository is very large, many teams prefer to use a lighter, purpose-built client:

```bash
go get github.com/grafana/loki-client-go
```

Below is a complete, production-grade Loki client wrapper:

```go
package lokiclient

import (
    "context"
    "fmt"
    "sync"
    "time"

    "github.com/prometheus/common/model"
    "github.com/grafana/loki-client-go/loki"
    "github.com/grafana/loki-client-go/pkg/urlutil"
)

// Config holds the configuration for the Loki client.
type Config struct {
    URL            string            // Loki push endpoint, e.g. "http://loki:3100"
    DefaultLabels  map[string]string // labels added to every log entry
    BatchWait      time.Duration     // flush batch after this duration even if not full
    BatchSize      int               // flush when batch reaches this many bytes
    Timeout        time.Duration     // HTTP request timeout
    ExternalLabels map[string]string // additional labels, often from environment
}

// LokiWriter implements io.Writer and zapcore.WriteSyncer.
// It wraps the Loki client and can be used as a Zap output destination.
type LokiWriter struct {
    client *loki.Client
    labels model.LabelSet
    mu     sync.Mutex
}

// NewLokiWriter creates a new LokiWriter connected to the given Loki instance.
func NewLokiWriter(cfg Config) (*LokiWriter, error) {
    var u urlutil.URLValue
    if err := u.Set(cfg.URL + "/loki/api/v1/push"); err != nil {
        return nil, fmt.Errorf("invalid loki URL: %w", err)
    }

    lokiCfg := loki.Config{
        URL:       u,
        BatchWait: cfg.BatchWait,
        BatchSize: cfg.BatchSize,
        Timeout:   cfg.Timeout,
        ExternalLabels: model.LabelSet{},
    }

    // Merge default labels into the config external labels
    for k, v := range cfg.DefaultLabels {
        lokiCfg.ExternalLabels[model.LabelName(k)] = model.LabelValue(v)
    }

    client, err := loki.New(lokiCfg)
    if err != nil {
        return nil, fmt.Errorf("create loki client: %w", err)
    }

    labels := model.LabelSet{}
    for k, v := range cfg.DefaultLabels {
        labels[model.LabelName(k)] = model.LabelValue(v)
    }

    return &LokiWriter{
        client: client,
        labels: labels,
    }, nil
}

// Write implements io.Writer — called by Zap for each log entry.
func (w *LokiWriter) Write(p []byte) (int, error) {
    w.mu.Lock()
    defer w.mu.Unlock()

    line := string(p)
    if err := w.client.Handle(w.labels.Clone(), time.Now(), line); err != nil {
        // Never return an error here — we don't want logging to break the app
        // Instead, silently drop and optionally increment a metric counter
        return len(p), nil
    }
    return len(p), nil
}

// Sync implements zapcore.WriteSyncer — called by Zap on shutdown.
func (w *LokiWriter) Sync() error {
    w.client.Stop()
    return nil
}
```

---

## 11. Approach 4 — Zap + Loki via go-loki

Since you are already using Zap as your logger (as covered in the companion Zap guide), the most elegant integration is to add a Loki core directly to your Zap logger using `github.com/agoda-com/zap-loki` or similar community packages. This lets you continue writing `logger.Info(...)` calls exactly as you do today, while Loki receives every entry automatically.

```bash
go get github.com/agoda-com/zap-loki
```

```go
package logger

import (
    "os"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    zaploki "github.com/agoda-com/zap-loki"
    "gopkg.in/natefinish/lumberjack.v2"
)

// Config holds configuration for the unified logger.
type Config struct {
    AppName     string
    AppVersion  string
    Environment string
    LogLevel    string
    LokiURL     string // empty disables Loki integration
    LogFilePath string // empty disables file logging
}

// New builds a Zap logger that simultaneously writes to:
//   - stdout (console or JSON)
//   - a rotating log file (if LogFilePath is set)
//   - Grafana Loki (if LokiURL is set)
func New(cfg Config) (*zap.Logger, error) {
    var level zapcore.Level
    if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
        level = zapcore.InfoLevel
    }

    encoderCfg := zap.NewProductionEncoderConfig()
    encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

    var cores []zapcore.Core

    // Core 1: stdout
    stdoutEncoder := zapcore.NewJSONEncoder(encoderCfg)
    if cfg.Environment != "production" {
        devCfg := encoderCfg
        devCfg.EncodeLevel = zapcore.CapitalColorLevelEncoder
        stdoutEncoder = zapcore.NewConsoleEncoder(devCfg)
    }
    cores = append(cores, zapcore.NewCore(
        stdoutEncoder,
        zapcore.AddSync(os.Stdout),
        level,
    ))

    // Core 2: rotating file (optional)
    if cfg.LogFilePath != "" {
        lj := &lumberjack.Logger{
            Filename:   cfg.LogFilePath,
            MaxSize:    100,
            MaxBackups: 7,
            MaxAge:     30,
            Compress:   true,
        }
        cores = append(cores, zapcore.NewCore(
            zapcore.NewJSONEncoder(encoderCfg),
            zapcore.AddSync(lj),
            level,
        ))
    }

    // Core 3: Grafana Loki (optional)
    if cfg.LokiURL != "" {
        lokiCfg := zaploki.Config{
            URL:          cfg.LokiURL,
            BatchMaxSize: 1000,          // flush after 1000 entries
            BatchMaxWait: 10 * time.Second, // or after 10 seconds
            Labels: map[string]string{
                "app":     cfg.AppName,
                "version": cfg.AppVersion,
                "env":     cfg.Environment,
            },
        }

        lokiCore := zaploki.NewCore(lokiCfg)
        cores = append(cores, lokiCore)
    }

    base := zap.New(
        zapcore.NewTee(cores...),
        zap.AddCaller(),
        zap.AddStacktrace(zapcore.ErrorLevel),
    )

    hostname, _ := os.Hostname()
    return base.With(
        zap.String("app", cfg.AppName),
        zap.String("version", cfg.AppVersion),
        zap.String("env", cfg.Environment),
        zap.String("host", hostname),
    ), nil
}
```

With this setup, every `logger.Info(...)`, `logger.Error(...)`, and `logger.Warn(...)` call in your entire application — in every handler, service, repository, and worker — flows simultaneously to your terminal, your log file, and Grafana Loki. You write your logging code once and it reaches all destinations transparently.

---

## 12. Approach 5 — OpenTelemetry Collector as the Bridge

OpenTelemetry (OTel) is becoming the industry standard for observability data collection. It defines vendor-neutral protocols for traces, metrics, and logs. Using the OTel Collector as an intermediary between your Go service and Loki gives you maximum flexibility — you can switch from Loki to Elasticsearch or any other backend without changing a single line of application code.

```
ASCII Diagram: OpenTelemetry Collector as Log Bridge

  Go Service                          OTel Collector
  ┌─────────────────┐                ┌────────────────────────────────────┐
  │                 │                │                                    │
  │  zap logger     │                │  Receivers:                        │
  │  + OTel exporter│──── OTLP/gRPC ─►  otlp (grpc :4317)               │
  │                 │                │  filelog (tail files)              │
  └─────────────────┘                │                                    │
                                     │  Processors:                       │
                                     │  batch (group entries)             │
                                     │  attributes (add/remove labels)    │
                                     │  filter (drop debug in prod)       │
                                     │                                    │
                                     │  Exporters:                        │
                                     │  ┌──────────┐  ┌──────────────┐   │
                                     │  │  loki    │  │ elasticsearch│   │
                                     │  │ exporter │  │  exporter    │   │
                                     │  └──────────┘  └──────────────┘   │
                                     └────────────────────────────────────┘
```

```go
// go.mod: require go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc
package main

import (
    "context"
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/otel/sdk/log"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func setupOTelLogger(ctx context.Context) (*log.LoggerProvider, error) {
    exporter, err := otlploggrpc.New(ctx,
        otlploggrpc.WithEndpoint("otel-collector:4317"),
        otlploggrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res, _ := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("order-service"),
            semconv.ServiceVersion("2.3.1"),
            semconv.DeploymentEnvironment("production"),
        ),
    )

    provider := log.NewLoggerProvider(
        log.WithProcessor(log.NewBatchProcessor(exporter)),
        log.WithResource(res),
    )

    return provider, nil
}
```

---

## 13. Labels — The Soul of Loki

Labels are the most important concept in Loki, and understanding them deeply separates engineers who use Loki effectively from those who create performance problems. Every log stream in Loki is identified by a unique set of labels. Think of labels as the primary key of a log stream.

```
ASCII Diagram: How Labels Define Streams

  Label Set A:                       Label Set B:
  {app="order-svc", env="prod",      {app="order-svc", env="prod",
   level="info"}                      level="error"}
  ┌─────────────────────────────┐    ┌─────────────────────────────┐
  │ Stream 1                    │    │ Stream 2                    │
  │ chunk-001.gz                │    │ chunk-010.gz                │
  │ {"msg":"order placed",...}  │    │ {"msg":"payment failed"...} │
  │ {"msg":"user logged in"...} │    │ {"msg":"db timeout",...}    │
  └─────────────────────────────┘    └─────────────────────────────┘

  Label Set C:
  {app="order-svc", env="prod",
   level="info", user_id="42"}      ← DANGER: HIGH CARDINALITY
  ┌─────────────────────────────┐
  │ Stream 3                    │   One stream per user!
  │ (only lines for user 42)    │   With 1M users = 1M streams
  └─────────────────────────────┘   This will destroy Loki performance.
```

The critical rule of Loki label design is: **keep label cardinality low**. Cardinality refers to the number of unique values a label can take. Labels like `env` (production, staging, development) have cardinality 3 — perfectly fine. Labels like `user_id` or `request_id` have cardinality equal to your user base or request volume — catastrophic for Loki.

When you add a high-cardinality value as a label, Loki creates a new stream for each unique value. With millions of unique user IDs, Loki would have millions of streams, each with only a handful of log entries. This destroys the compression efficiency (each chunk is nearly empty) and overloads the index.

The correct pattern is to include high-cardinality values like `user_id` and `request_id` inside the log line itself (as JSON fields), not as labels. Then use LogQL's JSON parser to filter on them at query time.

```
Good Labels (low cardinality):        Bad Labels (high cardinality):
✅ app="order-service"                ❌ user_id="42"
✅ env="production"                   ❌ request_id="req-8f2a3c"
✅ level="error"                      ❌ trace_id="abc123def456"
✅ region="us-east-1"                 ❌ order_id="789012"
✅ pod="order-svc-7f9b8"             ❌ session_id="sess-xyz"
✅ namespace="backend"               ❌ ip_address="203.0.113.42"
```

---

## 14. LogQL — Querying Your Logs

LogQL is Loki's query language, inspired by PromQL (Prometheus Query Language). It is elegant and expressive, and once you learn it, querying millions of log lines feels effortless.

Every LogQL query starts with a **log stream selector** — a set of label matchers in curly braces that narrows down which streams to read. This is the most important part of any query because it determines how much data Loki needs to scan.

```
ASCII Diagram: LogQL Query Anatomy

  {app="order-service", env="production", level="error"}
   └────────────────────────────────────────────────────┘
   Stream Selector: selects which compressed chunks to scan.
   Only chunks matching ALL these labels are read.

  {app="order-service"} |= "payment failed"
                         └────────────────┘
                         Log Pipeline: filter lines containing this string.

  {app="order-service"} | json | user_id="42" | line_format "{{.msg}}"
                          └────┘ └────────────┘ └──────────────────────┘
                          Parse   Filter on       Format the output
                          JSON    parsed field    using a template

  Metric Query (rate of errors per second):
  rate({app="order-service", level="error"}[5m])
  └──────────────────────────────────────────────┘
  Returns a time series of error log frequency.
  Used in Grafana panels and alert rules.
```

Here are the most important LogQL patterns for a Go backend service.

Filtering all error logs for a specific service in the last hour:

```logql
{app="order-service", env="production"} |= "error"
```

Filtering by JSON field value (the structured way):

```logql
{app="order-service"} | json | level="error" | user_id="42"
```

Finding slow database queries logged by your Go service:

```logql
{app="order-service"} | json | db_duration_ms > 100
```

Counting error rate per minute (metric query for dashboards):

```logql
sum(rate({app="order-service", level="error"}[1m])) by (app)
```

Finding all logs for a specific request ID across all services:

```logql
{env="production"} | json | request_id="req-8f2a3c"
```

Showing the top 10 slowest HTTP endpoints by p99 response time:

```logql
topk(10,
  quantile_over_time(0.99,
    {app="order-service"} | json | unwrap response_time_ms [5m]
  ) by (path)
)
```

---

## 15. Structured Metadata and JSON Parsing in LogQL

Because your Go service writes JSON logs (as Zap produces), LogQL's JSON parser is extremely powerful. It parses the JSON fields of each log line and makes them available as queryable values, bridging the gap between Loki's label-indexed model and Elasticsearch's full-text indexed model.

```go
// Your Go service logs this (Zap JSON output):
logger.Error("Payment gateway timeout",
    zap.String("request_id", "req-8f2a3c"),
    zap.Int64("user_id", 42),
    zap.String("gateway", "stripe"),
    zap.Duration("elapsed", 5*time.Second),
    zap.Int("retry_count", 3),
)
```

This produces the log line:

```json
{
  "level": "error",
  "ts": "2024-01-15T14:30:00.000Z",
  "caller": "service/payment.go:87",
  "msg": "Payment gateway timeout",
  "app": "order-service",
  "env": "production",
  "request_id": "req-8f2a3c",
  "user_id": 42,
  "gateway": "stripe",
  "elapsed": 5000,
  "retry_count": 3
}
```

In LogQL, you can query this with full type awareness:

```logql
# Find all payment timeouts for a specific user
{app="order-service"} | json | msg="Payment gateway timeout" | user_id=`42`

# Find all requests that took more than 3 seconds
{app="order-service"} | json | elapsed > 3000

# Count payment failures per gateway in the last 24 hours
sum by (gateway) (
  count_over_time(
    {app="order-service"} | json | msg="Payment gateway timeout" [24h]
  )
)

# Find requests that exhausted all retries
{app="order-service"} | json | retry_count >= 3 | level="error"
```

---

## 16. Loki in a Production Go Service — Full Integration

This section brings everything together into a complete, copy-paste-ready integration pattern for a production Go service.

```go
// internal/observability/logger.go
package observability

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "sync"
    "time"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "gopkg.in/natefinish/lumberjack.v2"
)

// AppConfig holds observability configuration loaded from environment variables.
type AppConfig struct {
    AppName     string // APP_NAME
    AppVersion  string // APP_VERSION
    Environment string // APP_ENV: "production" | "development"
    LogLevel    string // LOG_LEVEL: "debug" | "info" | "warn" | "error"
    LokiURL     string // LOKI_URL: "http://loki:3100" (empty = disabled)
    LogFile     string // LOG_FILE: "/var/log/app/app.log" (empty = disabled)
}

// asyncLokiCore is a zapcore.Core that sends log entries to Loki asynchronously.
// It batches entries in a channel and flushes them in the background.
type asyncLokiCore struct {
    zapcore.LevelEnabler
    encoder zapcore.Encoder
    client  *lokiHTTPClient
    queue   chan []byte
    wg      sync.WaitGroup
    fields  []zapcore.Field
}

type lokiHTTPClient struct {
    endpoint string
    labels   map[string]string
    http     *http.Client
}

func newAsyncLokiCore(cfg AppConfig) *asyncLokiCore {
    encoderCfg := zap.NewProductionEncoderConfig()
    encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

    core := &asyncLokiCore{
        LevelEnabler: zapcore.InfoLevel,
        encoder:      zapcore.NewJSONEncoder(encoderCfg),
        client: &lokiHTTPClient{
            endpoint: cfg.LokiURL + "/loki/api/v1/push",
            labels: map[string]string{
                "app":     cfg.AppName,
                "version": cfg.AppVersion,
                "env":     cfg.Environment,
            },
            http: &http.Client{Timeout: 5 * time.Second},
        },
        queue: make(chan []byte, 10000), // buffer 10,000 log entries
    }

    // Start the background flush goroutine
    core.wg.Add(1)
    go core.flushWorker()

    return core
}

func (c *asyncLokiCore) flushWorker() {
    defer c.wg.Done()
    batch := make([]string, 0, 100)
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    flush := func() {
        if len(batch) == 0 {
            return
        }
        // Build and send the Loki push request
        _ = c.client.push(batch)
        batch = batch[:0]
    }

    for {
        select {
        case entry, ok := <-c.queue:
            if !ok {
                flush()
                return
            }
            batch = append(batch, string(entry))
            if len(batch) >= 100 {
                flush()
            }
        case <-ticker.C:
            flush()
        }
    }
}

func (c *asyncLokiCore) With(fields []zapcore.Field) zapcore.Core {
    clone := *c
    clone.fields = append(clone.fields, fields...)
    return &clone
}

func (c *asyncLokiCore) Check(entry zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
    if c.Enabled(entry.Level) {
        return ce.AddCore(entry, c)
    }
    return ce
}

func (c *asyncLokiCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
    buf, err := c.encoder.EncodeEntry(entry, append(c.fields, fields...))
    if err != nil {
        return err
    }

    // Non-blocking send to queue — drop if queue is full
    select {
    case c.queue <- buf.Bytes():
    default:
        // Queue full — drop entry rather than blocking the application
    }

    return nil
}

func (c *asyncLokiCore) Sync() error {
    close(c.queue)
    c.wg.Wait()
    return nil
}

// NewProductionLogger creates the full multi-output logger.
func NewProductionLogger(cfg AppConfig) (*zap.Logger, error) {
    var level zapcore.Level
    if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
        level = zapcore.InfoLevel
    }

    encCfg := zap.NewProductionEncoderConfig()
    encCfg.EncodeTime = zapcore.ISO8601TimeEncoder

    var cores []zapcore.Core

    // Always write to stdout
    stdoutEnc := zapcore.NewJSONEncoder(encCfg)
    if cfg.Environment != "production" {
        devCfg := encCfg
        devCfg.EncodeLevel = zapcore.CapitalColorLevelEncoder
        stdoutEnc = zapcore.NewConsoleEncoder(devCfg)
    }
    cores = append(cores, zapcore.NewCore(stdoutEnc, zapcore.AddSync(os.Stdout), level))

    // Optionally write to rotating file
    if cfg.LogFile != "" {
        lj := &lumberjack.Logger{
            Filename: cfg.LogFile, MaxSize: 100, MaxBackups: 7, MaxAge: 30, Compress: true,
        }
        cores = append(cores, zapcore.NewCore(
            zapcore.NewJSONEncoder(encCfg), zapcore.AddSync(lj), level,
        ))
    }

    // Optionally send to Loki
    if cfg.LokiURL != "" {
        cores = append(cores, newAsyncLokiCore(cfg))
    }

    hostname, _ := os.Hostname()
    return zap.New(
        zapcore.NewTee(cores...),
        zap.AddCaller(),
        zap.AddStacktrace(zapcore.ErrorLevel),
    ).With(
        zap.String("app", cfg.AppName),
        zap.String("version", cfg.AppVersion),
        zap.String("env", cfg.Environment),
        zap.String("host", hostname),
    ), nil
}
```

---

## 17. Multi-Tenant Loki with X-Scope-OrgID

In organizations that run multiple products or teams on a shared Loki instance, multi-tenancy allows each team to have isolated log storage and querying. Loki supports multi-tenancy through a single HTTP header: `X-Scope-OrgID`. Every push and query request must include this header when `auth_enabled: true` is set in the Loki configuration.

```go
package lokiclient

import (
    "net/http"
)

// TenantTransport injects the X-Scope-OrgID header into every Loki HTTP request.
// This is the standard mechanism for multi-tenant Loki isolation.
type TenantTransport struct {
    inner    http.RoundTripper
    tenantID string
}

func NewTenantTransport(tenantID string) http.RoundTripper {
    return &TenantTransport{
        inner:    http.DefaultTransport,
        tenantID: tenantID,
    }
}

func (t *TenantTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    // Clone the request to avoid mutating the original
    clone := req.Clone(req.Context())
    clone.Header.Set("X-Scope-OrgID", t.tenantID)
    return t.inner.RoundTrip(clone)
}

// Usage: create one HTTP client per tenant
func newLokiClientForTeam(lokiURL, teamName string) *http.Client {
    return &http.Client{
        Transport: NewTenantTransport(teamName), // "payments-team", "auth-team", etc.
        Timeout:   5 * time.Second,
    }
}
```

---

## 18. Loki with Docker and Docker Compose

When running your Go application with Docker, the cleanest setup is to configure the Docker logging driver to send container logs directly to Loki, without even needing Promtail.

```yaml
# docker-compose.yml — production-like setup with Loki logging driver
version: "3.8"

services:
  order-service:
    build: ./order-service
    environment:
      - APP_ENV=production
      - LOG_LEVEL=info
      - DB_URL=postgres://user:pass@postgres:5432/orders
    logging:
      driver: loki           # use the Docker Loki logging driver
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "5"
        loki-max-backoff: "2000ms"
        loki-timeout: "4s"
        # Automatically add container metadata as Loki labels
        loki-pipeline-stages: |
          - json:
              expressions:
                level: level
          - labels:
              level:
        labels: "app,version"
    labels:
      app: "order-service"
      version: "2.3.1"
    depends_on:
      - postgres
      - loki
    networks:
      - backend

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    networks:
      - backend

  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
    networks:
      - backend

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    networks:
      - backend

networks:
  backend:
    driver: bridge
```

Note: The Docker Loki logging driver must be installed separately:

```bash
docker plugin install grafana/loki-docker-driver:2.9.0 --alias loki --grant-all-permissions
```

---

## 19. Loki with Kubernetes — The Real Production Setup

In Kubernetes, the gold standard is to deploy Promtail as a **DaemonSet** — one Promtail pod per node — which tails all container logs on that node and ships them to Loki. Grafana provides a Helm chart that deploys the entire stack with sensible defaults.

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install the Loki stack (Loki + Promtail + Grafana) into a dedicated namespace
helm install loki-stack grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set loki.enabled=true \
  --set promtail.enabled=true \
  --set grafana.enabled=true \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi \
  --set loki.config.limits_config.ingestion_rate_mb=16
```

The Promtail DaemonSet configuration for Kubernetes automatically extracts pod labels as Loki labels:

```yaml
# promtail-values.yaml (Helm values override)
config:
  snippets:
    pipelineStages:
      # Parse the Go JSON log output
      - json:
          expressions:
            level: level
            msg: msg
            app: app
            request_id: request_id

      # Promote level to a Loki label for efficient filtering
      - labels:
          level:

      # Drop debug logs to reduce storage in production
      - drop:
          expression: '.*level=debug.*'

    # Kubernetes metadata automatically added as labels:
    # namespace, pod, container, node, app (from pod labels)
```

Your Go service in Kubernetes needs no Loki-specific code at all. You simply deploy it, and Promtail picks up its logs automatically. The Kubernetes pod labels (`app`, `namespace`, `pod`) become Loki labels, allowing you to immediately query by service name, namespace, or even individual pod.

```
ASCII Diagram: Kubernetes + Loki Architecture

  Kubernetes Cluster
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │   Node 1                           Node 2                        │
  │   ┌──────────────────────┐         ┌──────────────────────┐      │
  │   │ Pod: order-svc-7f9b8 │         │ Pod: order-svc-2a3c1 │      │
  │   │ Pod: auth-svc-1d2e3  │         │ Pod: payment-svc-4b5d│      │
  │   │                      │         │                      │      │
  │   │ Pod: PROMTAIL ◄───── │─────────│─────── PROMTAIL      │      │
  │   │   (tails all pods    │         │   (tails all pods    │      │
  │   │    on this node)     │         │    on this node)     │      │
  │   └──────────┬───────────┘         └──────────┬───────────┘      │
  │              │                                │                  │
  └──────────────┼────────────────────────────────┼──────────────────┘
                 │ push logs                      │ push logs
                 └───────────────┬────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Loki StatefulSet      │
                    │   (namespace: monitoring)│
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   Object Storage         │
                    │   (S3 / PVC)             │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Grafana               │
                    │   (Explore + Dashboards) │
                    └─────────────────────────┘
```

---

## 20. Alerting with Loki and Grafana

Loki includes a **Ruler** component that evaluates LogQL queries on a schedule and fires alerts when conditions are met. This brings log-based alerting into your observability workflow alongside your Prometheus metric alerts.

```yaml
# loki-rules.yaml — alert rules evaluated by Loki Ruler
groups:
  - name: golang-service-alerts
    interval: 1m   # evaluate every minute
    rules:

      # Alert when error rate exceeds 10 per minute
      - alert: HighErrorRate
        expr: |
          sum(rate({app="order-service", env="production", level="error"}[5m])) > 0.1
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate in order-service"
          description: "Error rate is {{ $value }} errors/sec over the last 5 minutes"
          runbook: "https://wiki.company.com/runbooks/order-service-errors"

      # Alert when no logs received for 5 minutes (service may be down)
      - alert: ServiceSilent
        expr: |
          absent_over_time({app="order-service", env="production"}[5m])
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "order-service has stopped producing logs"
          description: "No logs received from order-service for 5+ minutes"

      # Alert on payment gateway timeouts
      - alert: PaymentGatewayTimeouts
        expr: |
          sum(count_over_time(
            {app="order-service"} | json | msg="Payment gateway timeout" [5m]
          )) > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Payment gateway timeouts spiking"
          description: "{{ $value }} payment timeouts in the last 5 minutes"

      # Alert on slow database queries
      - alert: SlowDatabaseQueries
        expr: |
          sum(count_over_time(
            {app="order-service"} | json | db_duration > 500 [5m]
          )) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Elevated slow query rate"
```

These rules are loaded into Loki via the Ruler's configuration. When a rule fires, Loki sends the alert to Alertmanager, which routes it to Slack, PagerDuty, or any other notification channel you have configured.

---

## 21. Loki with Grafana Dashboards

Grafana's Explore view is for ad-hoc investigation. For ongoing operational monitoring, you build dashboards with panels that visualize your LogQL queries as time series, bar charts, and stat panels.

```json
// grafana-dashboard.json (partial — key panels)
{
  "panels": [
    {
      "title": "Error Rate (errors/sec)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum by (app) (rate({env=\"production\", level=\"error\"}[5m]))",
          "datasource": "Loki",
          "legendFormat": "{{app}}"
        }
      ]
    },
    {
      "title": "Log Volume by Level",
      "type": "bargauge",
      "targets": [
        {
          "expr": "sum by (level) (count_over_time({app=\"order-service\"}[1h]))",
          "datasource": "Loki"
        }
      ]
    },
    {
      "title": "P99 Response Time from Logs",
      "type": "gauge",
      "targets": [
        {
          "expr": "quantile_over_time(0.99, {app=\"order-service\"} | json | unwrap response_time_ms [5m])",
          "datasource": "Loki"
        }
      ]
    },
    {
      "title": "Recent Errors",
      "type": "logs",
      "targets": [
        {
          "expr": "{app=\"order-service\", env=\"production\", level=\"error\"}",
          "datasource": "Loki"
        }
      ],
      "options": {
        "dedupStrategy": "signature",
        "showTime": true,
        "wrapLogMessage": true
      }
    }
  ]
}
```

---

## 22. Log Retention and Storage Backends

In production, you must think carefully about how long you keep logs and where you store them. Loki supports multiple storage backends with different cost and performance characteristics.

```
ASCII Diagram: Loki Storage Backend Options

  ┌─────────────────────────────────────────────────────────────────────┐
  │                    LOKI STORAGE BACKENDS                            │
  ├──────────────────┬──────────────┬──────────────┬────────────────────┤
  │   Backend        │   Cost       │   Best For   │   Notes            │
  ├──────────────────┼──────────────┼──────────────┼────────────────────┤
  │ Filesystem       │ Very low     │ Development, │ No HA, single node │
  │                  │              │ small teams  │                    │
  ├──────────────────┼──────────────┼──────────────┼────────────────────┤
  │ Amazon S3        │ Low          │ AWS          │ Most common in     │
  │                  │ (~$0.023/GB) │ production   │ production         │
  ├──────────────────┼──────────────┼──────────────┼────────────────────┤
  │ Google GCS       │ Low          │ GCP          │ Same as S3 model   │
  │                  │ (~$0.020/GB) │ production   │                    │
  ├──────────────────┼──────────────┼──────────────┼────────────────────┤
  │ Azure Blob       │ Low          │ Azure        │ Same as S3 model   │
  ├──────────────────┼──────────────┼──────────────┼────────────────────┤
  │ MinIO            │ Very low     │ On-prem, K8s │ S3-compatible,     │
  │                  │ (hardware    │ self-hosted  │ great for air-gap  │
  │                  │  only)       │              │ environments       │
  └──────────────────┴──────────────┴──────────────┴────────────────────┘
```

Configuring S3 storage in Loki:

```yaml
# loki-config.yaml — production with S3 storage
common:
  storage:
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      bucketnames: my-company-loki-logs
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}
      s3forcepathstyle: false

limits_config:
  # Retention: delete logs older than 30 days
  retention_period: 720h    # 30 days * 24 hours

  # Per-tenant retention overrides
  per_tenant_override_config: /etc/loki/tenant-overrides.yaml

compactor:
  # The compactor enforces retention by deleting old chunks
  working_directory: /loki/compactor
  shared_store: s3
  retention_enabled: true
  retention_delete_delay: 2h
```

---

## 23. Performance Tuning for High-Volume Go Services

When your Go service produces tens of thousands of log lines per second, you must tune both the Loki client and the Loki server to handle the load without dropping entries or causing backpressure on your application.

On the **client side** (in your Go service), the most important tuning lever is the batch configuration of your Loki writer. Sending one HTTP request per log line is catastrophically inefficient — each request has TCP and HTTP overhead that dwarfs the tiny payload. Batching hundreds of entries into a single request amortizes that overhead dramatically. The recommended batch size is between 500 KB and 1 MB, flushed at most every 5 to 10 seconds.

You should also ensure that your Loki writer is **non-blocking**. If the Loki server is temporarily slow or unreachable, your writer should drop entries (with a counter metric) rather than blocking the goroutine that is trying to log. An application that hangs because its log shipper is backed up is worse than an application that loses some log entries.

```go
// Tuning constants for a high-volume Go service
const (
    LokiBatchSize     = 1 * 1024 * 1024  // 1 MB per batch
    LokiBatchMaxWait  = 5 * time.Second   // flush every 5 seconds at most
    LokiQueueDepth    = 50_000            // buffer 50,000 entries in memory
    LokiHTTPTimeout   = 10 * time.Second  // give Loki 10 seconds to accept a batch
    LokiMaxRetries    = 3                 // retry failed pushes 3 times
    LokiRetryBackoff  = 500 * time.Millisecond
)
```

On the **server side** (Loki configuration), the most important tuning parameters are ingestion rate limits and the number of ingesters. If you have multiple Go service replicas all pushing to Loki simultaneously, you need to ensure the ingestion rate limit is high enough to accommodate the combined throughput.

```yaml
limits_config:
  # Per-tenant ingestion limits
  ingestion_rate_mb: 64        # allow up to 64 MB/s per tenant
  ingestion_burst_size_mb: 128 # allow short bursts up to 128 MB
  per_stream_rate_limit: 3MB   # per-stream limit to prevent noisy streams
  per_stream_rate_limit_burst: 15MB

  # Maximum number of label names per stream (enforce low cardinality)
  max_label_names_per_series: 15

  # Maximum label value length (prevent accidentally long values)
  max_label_value_length: 2048

ingester:
  chunk_idle_period: 30m     # flush idle chunks after 30 minutes
  chunk_block_size: 262144   # 256 KB target chunk size
  chunk_target_size: 1572864 # 1.5 MB maximum chunk size before flush
  max_chunk_age: 2h          # force flush after 2 hours regardless of size
```

---

## 24. Production Best Practices Checklist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               PRODUCTION LOKI CHECKLIST FOR GO SERVICES                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LABEL DESIGN                                                                │
│  ✅ Use only low-cardinality labels (app, env, level, region, namespace)     │
│  ✅ Never use user_id, request_id, order_id as labels — put them in the line │
│  ✅ Keep label count per stream under 10                                     │
│  ✅ Be consistent — use the same label names across all services             │
│                                                                              │
│  CLIENT CONFIGURATION                                                        │
│  ✅ Always batch log entries — never send one entry per HTTP request         │
│  ✅ Use async (non-blocking) sending — drop entries if queue is full         │
│  ✅ Implement retry logic with exponential backoff for transient errors      │
│  ✅ Set a reasonable HTTP timeout (5–10 seconds)                             │
│  ✅ Monitor queue depth and dropped entry count with a Prometheus counter    │
│                                                                              │
│  LOG FORMAT                                                                  │
│  ✅ Write JSON logs (Zap's default) — enables LogQL JSON parser              │
│  ✅ Include consistent fields: level, ts, msg, app, version, env, host       │
│  ✅ Include request_id in every log entry during a request lifecycle         │
│  ✅ Include durations as numbers (milliseconds), not strings                 │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  ✅ Use Promtail/Alloy DaemonSet in Kubernetes — decouple app from shipper  │
│  ✅ Use object storage (S3/GCS) for Loki chunks in production                │
│  ✅ Configure retention (720h = 30 days is a common starting point)         │
│  ✅ Enable the Compactor for retention enforcement                           │
│  ✅ Run Loki in microservices mode for high-volume production deployments    │
│                                                                              │
│  OPERATIONS                                                                  │
│  ✅ Create Grafana dashboards for error rate, log volume, slow queries       │
│  ✅ Set up Loki Ruler alerts for high error rate and service silence         │
│  ✅ Use LogCLI for quick command-line log investigation during incidents     │
│  ✅ Periodically review your label cardinality with Loki's metrics endpoint  │
│  ✅ Test Loki availability — verify your app behaves correctly when Loki is  │
│     unreachable (it should not crash or slow down)                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 25. Full Production Architecture — Reference Implementation

This is the complete picture of how a production Go backend service integrates with the full Loki observability stack.

```
ASCII Diagram: Full Production Loki Architecture for a Go Backend

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         PRODUCTION GO BACKEND                               │
  │                                                                             │
  │  ┌──────────────────────────────────────────────────────────────────────┐   │
  │  │                     order-service (3 replicas)                        │   │
  │  │                                                                      │   │
  │  │  HTTP Request                                                        │   │
  │  │      │                                                               │   │
  │  │      ▼                                                               │   │
  │  │  ┌────────────────────────────────────────────────────┐             │   │
  │  │  │  Middleware: RequestID + RequestLogger             │             │   │
  │  │  └────────────────────────────────────────────────────┘             │   │
  │  │      │                                                               │   │
  │  │      ▼                                                               │   │
  │  │  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │   │
  │  │  │ Handler  │  │   Service   │  │  Repository  │  │  Publisher  │  │   │
  │  │  │ (logger) │  │  (logger)   │  │   (logger)   │  │  (logger)   │  │   │
  │  │  └──────────┘  └─────────────┘  └──────────────┘  └─────────────┘  │   │
  │  │         │              │                │                  │         │   │
  │  │         └──────────────┴────────────────┴──────────────────┘         │   │
  │  │                                  │                                   │   │
  │  │                     zap.Logger (unified)                             │   │
  │  │                                  │                                   │   │
  │  │                    zapcore.NewTee(cores...)                          │   │
  │  │                    ┌─────────────┼──────────────┐                   │   │
  │  │                    ▼             ▼              ▼                    │   │
  │  │             ┌──────────┐  ┌──────────┐  ┌─────────────┐            │   │
  │  │             │ stdout   │  │ app.log  │  │ Async Loki  │            │   │
  │  │             │  (JSON)  │  │(rotating)│  │   Writer    │            │   │
  │  │             └──────────┘  └──────────┘  └──────┬──────┘            │   │
  │  └──────────────────────────────────────────────  │  ─────────────────┘   │
  │                                                    │                       │
  └────────────────────────────────────────────────────┼───────────────────────┘
                                                        │ HTTP POST /loki/api/v1/push
  Kubernetes Cluster                                    │ (batched, async, retried)
  ┌─────────────────────────────────────────────────── ┼───────────────────────┐
  │                                                     ▼                      │
  │   ┌───────────────────────────────────────────────────────────────────┐   │
  │   │               monitoring namespace                                  │   │
  │   │                                                                     │   │
  │   │   ┌─────────────────┐    writes     ┌──────────────────────────┐   │   │
  │   │   │ Promtail        │──────────────►│        Grafana Loki       │   │   │
  │   │   │ DaemonSet       │               │                          │   │   │
  │   │   │ (tails stdout)  │               │  Distributor → Ingester  │   │   │
  │   │   └─────────────────┘               │       → S3/GCS           │   │   │
  │   │                                     │  Querier ← Query Frontend│   │   │
  │   │                                     └──────────────┬───────────┘   │   │
  │   │                                                     │              │   │
  │   │                                          ┌──────────┴───────────┐  │   │
  │   │                                          │      Grafana          │  │   │
  │   │                                          │  ┌────────────────┐  │  │   │
  │   │                                          │  │  Explore View  │  │  │   │
  │   │                                          │  │  (ad-hoc query)│  │  │   │
  │   │                                          │  ├────────────────┤  │  │   │
  │   │                                          │  │  Dashboards    │  │  │   │
  │   │                                          │  │  error rate,   │  │  │   │
  │   │                                          │  │  log volume,   │  │  │   │
  │   │                                          │  │  slow queries  │  │  │   │
  │   │                                          │  ├────────────────┤  │  │   │
  │   │                                          │  │  Alerting      │  │  │   │
  │   │                                          │  │  (Loki Ruler + │  │  │   │
  │   │                                          │  │  Alertmanager) │  │  │   │
  │   │                                          │  └────────────────┘  │  │   │
  │   │                                          └──────────────────────┘  │   │
  │   └───────────────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────┘

  On Incident:
  1. Alert fires (Loki Ruler → Alertmanager → PagerDuty/Slack)
  2. Engineer opens Grafana → sees spike in error rate panel
  3. Clicks into Explore, queries: {app="order-service"} | json | level="error"
  4. Finds request_id from error log
  5. Queries: {env="production"} | json | request_id="req-8f2a3c"
  6. Sees the full journey of that request across all services
  7. Root cause identified in < 5 minutes
```

The complete `main.go` wiring all components together:

```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "yourapp/internal/observability"
    "yourapp/internal/handler"
    "yourapp/internal/middleware"
    "yourapp/internal/repository"
    "yourapp/internal/service"
    "go.uber.org/zap"
)

func main() {
    // Step 1: Initialize the unified logger (stdout + file + Loki)
    logger, err := observability.NewProductionLogger(observability.AppConfig{
        AppName:     getEnv("APP_NAME", "order-service"),
        AppVersion:  getEnv("APP_VERSION", "unknown"),
        Environment: getEnv("APP_ENV", "development"),
        LogLevel:    getEnv("LOG_LEVEL", "info"),
        LokiURL:     getEnv("LOKI_URL", ""),              // empty = disabled
        LogFile:     getEnv("LOG_FILE", ""),               // empty = disabled
    })
    if err != nil {
        panic("failed to initialize logger: " + err.Error())
    }
    defer logger.Sync()

    logger.Info("Initializing application")

    // Step 2: Wire up dependencies with the logger
    db := repository.NewPostgres(logger, getEnv("DB_URL", ""))
    cache := repository.NewRedis(logger, getEnv("REDIS_URL", ""))
    publisher := repository.NewRabbitMQ(logger, getEnv("AMQP_URL", ""))
    orderRepo := repository.NewOrderRepository(logger, db)
    orderSvc := service.NewOrderService(logger, orderRepo, cache, publisher)
    orderHandler := handler.NewOrderHandler(logger, orderSvc)

    // Step 3: Build the HTTP server with logging middleware
    mux := http.NewServeMux()
    mux.Handle("/api/v1/orders", orderHandler)
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    stack := middleware.RequestID(logger)(
        middleware.RequestLogger(logger)(mux),
    )

    server := &http.Server{
        Addr:         ":" + getEnv("PORT", "8080"),
        Handler:      stack,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Step 4: Start the server with graceful shutdown
    go func() {
        logger.Info("Server listening", zap.String("addr", server.Addr))
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            logger.Fatal("Server failed", zap.Error(err))
        }
    }()

    // Step 5: Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logger.Info("Shutting down gracefully")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        logger.Error("Forced shutdown", zap.Error(err))
    }

    logger.Info("Server stopped")
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
```

---

_Grafana Loki transforms your logs from a scattered collection of text files into a unified, queryable, alertable observability asset. By pairing it with Zap's structured JSON output in Go, the Promtail agent in Kubernetes, and Grafana's visualization layer, you build a logging system that turns a 3 AM incident from a multi-hour grep session into a five-minute root-cause analysis. That is the real value of Loki — not just storing logs, but making them speak clearly when you need them most._