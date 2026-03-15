# The Complete Production Logging Best Practices Guide

> _Everything a backend engineer must know to log with discipline, clarity, and operational purpose — written for teams who treat logs as a first-class engineering asset._

---

## Table of Contents

1. [The Philosophy of Production Logging](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#1-the-philosophy-of-production-logging)
2. [The Golden Rule — Log for the Person Debugging at 3 AM](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#2-the-golden-rule--log-for-the-person-debugging-at-3-am)
3. [Log Levels — Using Them With Surgical Precision](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#3-log-levels--using-them-with-surgical-precision)
4. [Structured Logging — Never Log Plain Text in Production](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#4-structured-logging--never-log-plain-text-in-production)
5. [What to Log — The Boundary Rule](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#5-what-to-log--the-boundary-rule)
6. [What Never to Log — Security and Privacy](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#6-what-never-to-log--security-and-privacy)
7. [The Anatomy of a Perfect Log Entry](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#7-the-anatomy-of-a-perfect-log-entry)
8. [Request ID and Distributed Tracing Through Logs](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#8-request-id-and-distributed-tracing-through-logs)
9. [Contextual Logging — Carrying State Without Repetition](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#9-contextual-logging--carrying-state-without-repetition)
10. [Error Logging — The Art of Logging Failures](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#10-error-logging--the-art-of-logging-failures)
11. [Logging HTTP Requests and Responses](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#11-logging-http-requests-and-responses)
12. [Logging Database Operations](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#12-logging-database-operations)
13. [Logging External API Calls](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#13-logging-external-api-calls)
14. [Logging in Background Workers and Cron Jobs](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#14-logging-in-background-workers-and-cron-jobs)
15. [Logging in Goroutines and Concurrent Code](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#15-logging-in-goroutines-and-concurrent-code)
16. [Log Volume Management — The Noise Problem](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#16-log-volume-management--the-noise-problem)
17. [Dynamic Log Levels — Changing Verbosity Without Restarts](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#17-dynamic-log-levels--changing-verbosity-without-restarts)
18. [Sampling — Logging a Fraction of High-Volume Events](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#18-sampling--logging-a-fraction-of-high-volume-events)
19. [Performance — Making Logging Invisible to Your Application](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#19-performance--making-logging-invisible-to-your-application)
20. [Log Correlation — Connecting Logs, Metrics, and Traces](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#20-log-correlation--connecting-logs-metrics-and-traces)
21. [Operational Logging Patterns](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#21-operational-logging-patterns)
22. [Environment-Specific Logging Strategy](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#22-environment-specific-logging-strategy)
23. [Log Retention and Rotation Strategy](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#23-log-retention-and-rotation-strategy)
24. [The Anti-Patterns — What Kills Production Logging](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#24-the-anti-patterns--what-kills-production-logging)
25. [The Production Logging Checklist](https://claude.ai/chat/adbbc2eb-6931-49d7-884a-599af0c1705e#25-the-production-logging-checklist)

---

## 1. The Philosophy of Production Logging

Logging is one of the oldest practices in software engineering, and yet it remains one of the most poorly practiced. The reason is simple: logging feels like an afterthought. When you are writing a feature, the log statements you add are almost never what you are thinking about. They come at the end, tacked on because you know you are supposed to log _something_. The result is logs that are dense with noise in the places you do not need them, and completely silent in the places you do.

In production, logs serve a single ultimate purpose: **they allow a human being to understand what the system was doing at a specific moment in the past**. This sounds obvious, but it has profound implications for how you should write every single log statement. When you sit down to write `logger.Info(...)`, the question you must ask yourself is not _"What is happening right now?"_ but rather _"If this service starts misbehaving at 2 AM six months from now, what would the person debugging it wish they could see?"_

Logs are not for the developer writing the code. They are for the operator running it. They are for your future self, exhausted, under pressure, trying to reconstruct what happened from evidence alone. Every log statement is a message you are sending to that future person. The discipline of good logging is the discipline of writing that message with enough clarity, context, and precision that it is genuinely useful rather than merely present.

```
ASCII Diagram: The Three Audiences of Production Logs

  ┌────────────────────────────────────────────────────────────────────────────┐
  │                      WHO READS YOUR LOGS?                                  │
  ├────────────────────────────────────────────────────────────────────────────┤
  │                                                                            │
  │  1. THE HUMAN OPERATOR (incident response, debugging)                     │
  │     Needs: context, request IDs, error messages, affected entity IDs      │
  │     Reading: Grafana Loki explore, grep, LogCLI                           │
  │     Time pressure: HIGH — usually during an incident                      │
  │                                                                            │
  │  2. THE LOG AGGREGATION SYSTEM (Loki, Elasticsearch, Datadog)             │
  │     Needs: consistent JSON structure, indexed fields, low cardinality     │
  │     Reading: automatically, indexing fields, building time series         │
  │     Time pressure: constant — processes every entry in real time          │
  │                                                                            │
  │  3. THE ALERTING SYSTEM (Prometheus, Loki Ruler)                          │
  │     Needs: predictable field names, consistent level values               │
  │     Reading: evaluates log patterns and rates every 15–60 seconds         │
  │     Time pressure: constant — fires alerts based on log patterns          │
  │                                                                            │
  └────────────────────────────────────────────────────────────────────────────┘

  Your log statements must serve all three audiences simultaneously.
  A log that a human can read but a machine cannot parse is only 33% effective.
  A log that a machine can index but provides no context is also only 33% effective.
```

---

## 2. The Golden Rule — Log for the Person Debugging at 3 AM

Every production engineering team eventually develops an instinct for this. When you write a log statement, close your eyes and picture the following scenario: it is 3 AM, your service has been throwing errors for 20 minutes, an on-call engineer — who may not have written any of the code involved — is staring at a screen trying to figure out what went wrong. They have the logs. Nothing else.

This mental model immediately clarifies what makes a log entry good or bad. A log entry that says `"error occurred"` is worse than useless — it uses storage, creates noise, but tells the engineer nothing actionable. A log entry that says `"failed to charge payment card: stripe returned code decline_code=insufficient_funds after 2 retries, user_id=42, order_id=789, amount_cents=5999, gateway=stripe, elapsed_ms=1243"` is a gift. The engineer knows exactly what failed, why it failed, for whom it failed, how long it took, and how many times it was retried.

```
ASCII Diagram: The 3 AM Debugging Test

  Bad log:
  ┌────────────────────────────────────────────────────────────────────────────┐
  │ {"level":"error","msg":"payment failed"}                                   │
  └────────────────────────────────────────────────────────────────────────────┘
  Questions the engineer STILL has to answer:
  ✗ Which user?        ✗ Which order?       ✗ What error?
  ✗ Which gateway?     ✗ How long did it take?  ✗ Was it retried?
  → Engineer must now dig through 5 more systems to find the answer.

  Good log:
  ┌────────────────────────────────────────────────────────────────────────────┐
  │ {                                                                          │
  │   "level":       "error",                                                  │
  │   "ts":          "2024-01-15T02:47:13.241Z",                              │
  │   "msg":         "Payment card charge failed",                            │
  │   "request_id":  "req-8f2a3c",                                            │
  │   "user_id":     42,                                                       │
  │   "order_id":    789,                                                      │
  │   "amount_cents": 5999,                                                    │
  │   "gateway":     "stripe",                                                 │
  │   "decline_code":"insufficient_funds",                                     │
  │   "retry_count": 2,                                                        │
  │   "elapsed_ms":  1243,                                                     │
  │   "error":       "stripe: card declined [insufficient_funds]"              │
  │ }                                                                          │
  └────────────────────────────────────────────────────────────────────────────┘
  Questions the engineer can answer immediately:
  ✓ Which user?        ✓ Which order?       ✓ What error?
  ✓ Which gateway?     ✓ How long?          ✓ Was it retried?
  → Engineer can immediately determine root cause and customer impact.
```

---

## 3. Log Levels — Using Them With Surgical Precision

Log levels are not decoration. They are a filtering mechanism that allows operators to control the signal-to-noise ratio of their log stream. When every event is logged at `INFO`, the level becomes meaningless and every important signal is buried in noise. When critical errors are logged at `DEBUG`, they get dropped in production and the on-call engineer never sees them. Level discipline is one of the most important habits in production logging.

```
ASCII Diagram: Log Level Decision Tree

  Something happened in the system. What level do I use?
                        │
          ┌─────────────▼─────────────┐
          │ Is it a developer-only     │
          │ detail? (variable value,   │
          │ algorithm step, cache key) │
          └─────────┬─────────────────┘
          YES       │ NO
          ▼         ▼
       DEBUG   ┌────────────────────────┐
               │ Is it a normal,        │
               │ expected business      │
               │ event? (request,       │
               │ login, order, startup) │
               └────────┬───────────────┘
               YES      │ NO
               ▼        ▼
             INFO  ┌─────────────────────────────────┐
                   │ Did something unexpected happen  │
                   │ BUT the system recovered?        │
                   │ (retry succeeded, fallback used, │
                   │  deprecated API called,          │
                   │  slow query detected)            │
                   └──────────┬──────────────────────┘
                   YES        │ NO
                   ▼          ▼
                 WARN    ┌──────────────────────────────┐
                         │ Did a request or operation   │
                         │ FAIL and the user was        │
                         │ affected? (DB error, payment │
                         │ failed, external API down)   │
                         └──────────┬───────────────────┘
                         YES        │ NO
                         ▼          ▼
                       ERROR   ┌──────────────────────────┐
                               │ Is the entire service    │
                               │ unable to start or       │
                               │ continue? (cannot bind   │
                               │ port, no DB on startup)  │
                               └────────────┬─────────────┘
                               YES          │ NO
                               ▼            ▼
                             FATAL      (reconsider)
```

**DEBUG** is for information that is useful only while actively developing or diagnosing a specific, known issue. It should never be enabled in production under normal circumstances. Examples: the exact SQL query being executed, the value of a variable after transformation, cache key computation. Because DEBUG is disabled in production, you can be as verbose as you like — it costs nothing.

**INFO** is for events that confirm the system is operating as designed. Every significant business operation that completes successfully deserves an INFO log: a user authenticated, an order was placed, a batch job completed, a server started. INFO logs should tell a coherent story of what the system did. Reading only the INFO logs of a healthy service should produce a clear narrative of its activity.

**WARN** is for conditions that are unusual and worthy of attention, but from which the system has already recovered. The key distinction between WARN and ERROR is recovery: if the system handled it without user impact, it is a WARN. Examples: a connection attempt that succeeded on the second try, a cache that was bypassed due to unavailability, a deprecated API endpoint being called, a query that took longer than expected.

**ERROR** is for conditions where a user-facing operation has failed. Something a user tried to do did not succeed because of a system problem. This is not a validation error (which is expected and normal) — it is an infrastructure failure, an unhandled exception, a dependency returning an unexpected response. Every ERROR log should be actionable: an engineer reading it should be able to determine what failed and begin investigating.

**FATAL** is reserved for conditions where the service cannot reasonably continue operating. It should almost always appear only at startup — if the service cannot connect to its database, cannot bind to its port, or cannot load a required configuration file. In application code beyond the startup phase, FATAL should almost never appear. Using FATAL mid-operation is usually a design error; the correct response is to return an error and let the calling code decide what to do.

```go
// Correct level discipline in Go with Zap

// DEBUG — developer detail, disabled in production
logger.Debug("Cache key computed",
    zap.String("key", "user:42:profile"),
    zap.Duration("computation_time", 2*time.Microsecond),
)

// INFO — normal business event
logger.Info("Order placed successfully",
    zap.Int64("order_id", 789),
    zap.Int64("user_id", 42),
    zap.Float64("total_usd", 59.99),
    zap.Duration("processing_time", 145*time.Millisecond),
)

// WARN — unusual but recovered
logger.Warn("Payment gateway retry succeeded",
    zap.Int("attempt", 2),
    zap.String("gateway", "stripe"),
    zap.Int64("order_id", 789),
    zap.Duration("total_elapsed", 892*time.Millisecond),
)

// ERROR — user-facing failure
logger.Error("Failed to process payment — order remains unpaid",
    zap.Int64("order_id", 789),
    zap.Int64("user_id", 42),
    zap.String("gateway", "stripe"),
    zap.String("decline_code", "card_declined"),
    zap.Error(err),
)

// FATAL — only at startup
logger.Fatal("Cannot connect to PostgreSQL — service cannot start",
    zap.String("host", "postgres:5432"),
    zap.Error(err),
)
```

---

## 4. Structured Logging — Never Log Plain Text in Production

Plain text logging is the practice of embedding data inside a formatted string: `log.Printf("user %d logged in from %s", userID, ip)`. This feels natural because it mirrors how humans write. But in production, it is deeply problematic.

When your log entry is a string, every piece of data inside it is a substring. To find all log entries for user 42, you must use `grep "user 42"` — which will also match "user 420", "user 4200", and "user 4242". To count error rates, you need regex patterns that are fragile and slow. To build a dashboard, you need a log parsing configuration that must be maintained every time a log message changes wording.

Structured logging solves all of these problems by treating every piece of data as a named, typed field rather than a substring. Your log entry is not a sentence — it is a record. Every field has a name, a type, and a value. This structure makes log entries immediately queryable, indexable, and parseable by every log aggregation tool on the market.

```
ASCII Diagram: Plain Text vs Structured Logging Comparison

  PLAIN TEXT LOGGING:
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ 2024-01-15 10:30:01 ERROR payment failed for user 42 order 789 amt $59.99│
  └──────────────────────────────────────────────────────────────────────────┘
  To filter user 42:     grep "user 42"         → fragile, matches "user 420"
  To count errors:       grep "ERROR" | wc -l   → no time breakdown possible
  To find slow payments: impossible             → duration is not in the log
  To index in Loki:      must write regex rules → breaks when message changes
  To build alerts:       must parse strings     → complex, fragile rules

  STRUCTURED LOGGING (JSON):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ {                                                                        │
  │   "level":      "error",                                                 │
  │   "ts":         "2024-01-15T10:30:01.000Z",                             │
  │   "msg":        "Payment failed",                                        │
  │   "user_id":    42,                                                      │
  │   "order_id":   789,                                                     │
  │   "amount_usd": 59.99,                                                   │
  │   "gateway":    "stripe",                                                │
  │   "error":      "card_declined"                                          │
  │ }                                                                        │
  └──────────────────────────────────────────────────────────────────────────┘
  To filter user 42:     {app="svc"} | json | user_id=42         → exact, fast
  To count errors:       count_over_time({level="error"}[5m])    → queryable
  To find slow payments: {app="svc"} | json | elapsed_ms > 1000  → typed filter
  To index in Loki:      automatic, no configuration needed
  To build alerts:       rate({level="error"}[5m]) > 0.1         → clean rules
```

The structured log fields you include in every entry should be typed correctly. A duration should be a number (milliseconds or seconds as a float), not a string like `"1.2s"`. A user ID should be an integer, not a string `"42"`. An error should be a string field named `"error"`, not embedded in the message. This typing matters because LogQL and PromQL can perform numeric comparisons only on typed numeric fields.

```go
// Wrong — embedding data in the message string
logger.Info(fmt.Sprintf("User %d logged in from %s, session %s", userID, ip, sessionID))

// Wrong — using the wrong types
logger.Info("Request completed",
    zap.String("user_id", strconv.FormatInt(userID, 10)), // should be Int64
    zap.String("duration", "145ms"),                       // should be Duration
    zap.String("status", "200"),                           // should be Int
)

// Correct — structured, typed fields
logger.Info("Request completed",
    zap.Int64("user_id", userID),
    zap.Duration("duration", 145*time.Millisecond),
    zap.Int("status_code", 200),
    zap.String("method", "POST"),
    zap.String("path", "/api/v1/orders"),
)
```

---

## 5. What to Log — The Boundary Rule

One of the most reliable rules for deciding where to add log statements is the **boundary rule**: log at the boundaries of your system, where work enters and exits a component. The boundaries are the places where something meaningful either begins or ends, where control transfers from one system to another, and where failures are most likely to occur and most important to capture.

```
ASCII Diagram: The Boundary Rule — Where to Log

  SYSTEM BOUNDARIES (always log at these points):

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │   External World                                                        │
  │        │                                                                │
  │        ▼                                                                │
  │   ┌─────────┐  ◄── LOG: request received (method, path, user_id)       │
  │   │  HTTP   │                                                           │
  │   │ Handler │  ◄── LOG: request completed (status, duration)           │
  │   └────┬────┘                                                           │
  │        │                                                                │
  │        ▼                                                                │
  │   ┌─────────┐  ◄── LOG: (only on error or significant state change)    │
  │   │ Service │      Business logic rarely needs entry/exit logging       │
  │   │  Layer  │                                                           │
  │   └────┬────┘                                                           │
  │        │                                                                │
  │        ├────────────────────────────────────────┐                      │
  │        ▼                                        ▼                      │
  │   ┌─────────┐  ◄── LOG: query + duration    ┌────────┐                 │
  │   │Database │        + error if any         │  Cache │ ◄── LOG: hit    │
  │   │         │                               │        │     or miss     │
  │   └─────────┘                               └────────┘                 │
  │        │                                                                │
  │        ▼                                                                │
  │   ┌─────────┐  ◄── LOG: API call started (url, method)                │
  │   │External │  ◄── LOG: API call completed (status, duration)          │
  │   │  APIs   │  ◄── LOG: error if any (status code, response body)      │
  │   └─────────┘                                                           │
  │        │                                                                │
  │        ▼                                                                │
  │   ┌─────────┐  ◄── LOG: message published (queue, routing key)        │
  │   │Message  │  ◄── LOG: message received (queue, message ID)           │
  │   │ Queue   │  ◄── LOG: message processed (duration, status)           │
  │   └─────────┘                                                           │
  │                                                                         │
  │   INSIDE service/business logic: log only errors and significant        │
  │   state transitions. Do NOT log every line of code execution.           │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

The boundary rule also implies what **not** to log: the interior of pure business logic. If a function takes two numbers, adds them, and returns the result, there is nothing to log. The log-worthy event is the request that triggered the calculation and the result that was returned. Logging every intermediate step inside a pure function is debugging noise, not operational signal.

Concretely, every log at a boundary should answer five questions: **What** happened? **Who** triggered it (user ID, service name)? **Where** in the system (component, function)? **When** (timestamp, already automatic)? **How did it go** (success, error, duration)?

---

## 6. What Never to Log — Security and Privacy

This is the most important section in this guide from a risk perspective. Logging the wrong data does not just create noise — it creates security vulnerabilities, compliance violations, and potential legal liability. The consequences of logging sensitive data are severe: a data breach where log files are exfiltrated, a GDPR violation resulting in a fine, or a compliance audit failure.

```
ASCII Diagram: Data That Must NEVER Appear in Logs

  ┌──────────────────────────────────────────────────────────────────────────┐
  │              ABSOLUTELY FORBIDDEN IN ANY LOG ENTRY                       │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                                                                          │
  │  AUTHENTICATION & SECRETS                                                │
  │  ✗ Passwords (plaintext or hashed)                                      │
  │  ✗ Password reset tokens                                                 │
  │  ✗ JWT tokens or session tokens (if stolen, gives full account access)  │
  │  ✗ API keys (your service's keys or user-provided keys)                 │
  │  ✗ OAuth tokens or refresh tokens                                       │
  │  ✗ Private keys or certificates                                         │
  │  ✗ Database connection strings (contain credentials)                    │
  │  ✗ Encryption keys                                                       │
  │  ✗ HMAC secrets                                                          │
  │                                                                          │
  │  PAYMENT & FINANCIAL DATA (PCI-DSS compliance)                          │
  │  ✗ Full credit card numbers (PAN)                                       │
  │  ✗ Card verification values (CVV/CVC) — never, not even masked          │
  │  ✗ Card expiry dates (when combined with other card data)               │
  │  ✗ Bank account numbers                                                  │
  │  ✗ IBAN or routing numbers                                              │
  │                                                                          │
  │  PERSONAL IDENTIFYING INFORMATION (GDPR / CCPA compliance)              │
  │  ✗ Full names (log user_id instead)                                     │
  │  ✗ Email addresses (log user_id instead)                                │
  │  ✗ Phone numbers                                                         │
  │  ✗ Physical addresses                                                    │
  │  ✗ Date of birth                                                         │
  │  ✗ National ID / SSN / passport numbers                                 │
  │  ✗ IP addresses (these are PII in GDPR jurisdictions)                   │
  │  ✗ Device fingerprints that can identify individuals                    │
  │                                                                          │
  │  SENSITIVE BUSINESS DATA                                                 │
  │  ✗ Full request/response bodies (may contain any of the above)          │
  │  ✗ Form submissions (may contain passwords, card numbers)               │
  │  ✗ Private messages between users                                        │
  │  ✗ Healthcare data (HIPAA compliance)                                   │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘

  SAFE ALTERNATIVES:
  Instead of email:    log user_id (an opaque internal identifier)
  Instead of card PAN: log last_four ("****4242") and card_brand ("visa")
  Instead of token:    log token_id (the ID from your token table, not the token itself)
  Instead of password: log nothing — password operations succeed or fail, nothing else
  Instead of full body: log specific safe fields extracted from the body
```

Beyond security and privacy concerns, you should also think carefully before logging full request and response bodies. Even when no PII is involved, bodies can be very large, dramatically increasing your log storage costs and making it harder to find the entries that matter. Instead of logging the full body, log only the specific fields that are operationally meaningful: the order ID, the product IDs, the amount — not the entire JSON blob.

```go
// Wrong — logging the full request body (may contain sensitive data)
body, _ := io.ReadAll(r.Body)
logger.Info("Order request received", zap.ByteString("body", body))

// Correct — log only the safe, operationally relevant fields
logger.Info("Order request received",
    zap.Int64("user_id", req.UserID),
    zap.Int("item_count", len(req.Items)),
    zap.Float64("total_usd", req.TotalUSD),
    zap.String("currency", req.Currency),
    // do NOT log: card_number, cvv, email, full address
)

// Wrong — logging an auth token
logger.Info("User authenticated", zap.String("token", token))

// Correct — log only the token's identifier, never the token itself
logger.Info("User authenticated",
    zap.Int64("user_id", claims.UserID),
    zap.String("token_id", claims.TokenID), // the jti claim — an opaque ID
    zap.Time("expires_at", claims.ExpiresAt),
)
```

---

## 7. The Anatomy of a Perfect Log Entry

A production log entry is a structured record that should always contain a consistent set of core fields, plus operation-specific fields. Consistency is critical — if the field is called `user_id` in one service and `userId` in another and `uid` in a third, querying across services becomes exponentially more difficult.

```
ASCII Diagram: Anatomy of a Perfect Log Entry

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  {                                                                       │
  │    // TIER 1: ALWAYS PRESENT (set by logger infrastructure)              │
  │    "ts":         "2024-01-15T02:47:13.241Z",  ← ISO8601, always UTC     │
  │    "level":      "error",                     ← debug/info/warn/error   │
  │    "msg":        "Payment card charge failed", ← concise, consistent    │
  │    "caller":     "service/payment.go:87",      ← file and line number   │
  │                                                                          │
  │    // TIER 2: APPLICATION CONTEXT (set via logger.With at startup)      │
  │    "app":        "order-service",              ← service name           │
  │    "version":    "2.3.1",                      ← deployed version       │
  │    "env":        "production",                 ← environment            │
  │    "host":       "web-node-07",                ← hostname / pod name    │
  │    "region":     "us-east-1",                  ← deployment region      │
  │                                                                          │
  │    // TIER 3: REQUEST CONTEXT (set via logger.With in middleware)        │
  │    "request_id": "req-8f2a3c9d",              ← unique per request      │
  │    "trace_id":   "abc123def456",               ← OpenTelemetry trace ID │
  │    "user_id":    42,                           ← authenticated user     │
  │    "session_id": "sess-opaque-id",             ← session identifier     │
  │                                                                          │
  │    // TIER 4: OPERATION-SPECIFIC FIELDS (set at the call site)          │
  │    "order_id":     789,                        ← the entity being acted on│
  │    "amount_cents":  5999,                      ← typed numeric value    │
  │    "gateway":      "stripe",                   ← which external system  │
  │    "decline_code": "insufficient_funds",       ← specific failure reason│
  │    "retry_count":  2,                          ← how many attempts made │
  │    "elapsed_ms":   1243,                       ← operation duration     │
  │                                                                          │
  │    // TIER 5: ERROR DETAIL (only on error/warn entries)                 │
  │    "error":       "stripe: card declined [insufficient_funds]",         │
  │    "stacktrace":  "service/payment.go:87\nservice/order.go:124\n..."    │
  │  }                                                                       │
  └──────────────────────────────────────────────────────────────────────────┘

  Field naming conventions (pick one, use everywhere):
  ✅ snake_case:   user_id, order_id, elapsed_ms, status_code  ← recommended
  ✗ camelCase:   userId, orderId, elapsedMs  ← works but inconsistent in Go
  ✗ kebab-case:  user-id, order-id  ← problematic in some query languages
  ✗ Mixed:       userId, order_id, ElapsedMs  ← never do this
```

The `msg` field deserves special attention. A good log message is concise, consistent, and describes what happened — not what the code is doing. Prefer _"Payment card charge failed"_ over _"Error in chargeCard function"_. The message should remain constant across deployments: if you change the wording, your log-based alerts and dashboards that pattern-match on the message will break silently. Think of the message as a stable identifier for an event type, not a prose sentence that you edit for clarity.

---

## 8. Request ID and Distributed Tracing Through Logs

In any system that handles concurrent requests — which is every production Go service — the ability to isolate all logs belonging to a single request is not a luxury, it is a necessity. Without it, a busy service's logs are an interleaved stream of entries from hundreds of concurrent requests, and finding all the entries for one specific failing request is like finding a specific conversation in a crowded stadium.

The solution is to generate a unique request ID at the entry point of every request, attach it to a child logger via `logger.With(zap.String("request_id", id))`, store that child logger in the request's `context.Context`, and propagate it through every function call in the request's lifecycle. Every log entry made during the handling of that request will automatically carry the request ID, allowing you to reconstruct the complete, ordered story of the request with a single query.

```go
package middleware

import (
    "context"
    "net/http"
    "github.com/google/uuid"
    "go.uber.org/zap"
)

type contextKey string
const loggerCtxKey contextKey = "logger"

// RequestLogger middleware injects a request-scoped logger into every request.
func RequestLogger(base *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Honour upstream request IDs (e.g. from an API gateway or load balancer)
            // so the trace can be linked end-to-end across all services.
            reqID := r.Header.Get("X-Request-ID")
            if reqID == "" {
                reqID = uuid.New().String()
            }

            // Forward the request ID downstream so other services can link their logs
            w.Header().Set("X-Request-ID", reqID)

            // Create a request-scoped child logger.
            // From this point, EVERY log entry during this request carries request_id
            // without any extra code at the call sites.
            reqLogger := base.With(
                zap.String("request_id", reqID),
                zap.String("method", r.Method),
                zap.String("path", r.URL.Path),
            )

            ctx := context.WithValue(r.Context(), loggerCtxKey, reqLogger)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// L extracts the request-scoped logger from a context.
// This is the function every handler, service, and repository should call.
func L(ctx context.Context, fallback *zap.Logger) *zap.Logger {
    if l, ok := ctx.Value(loggerCtxKey).(*zap.Logger); ok {
        return l
    }
    return fallback
}

// Usage in a handler:
func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
    log := middleware.L(r.Context(), h.logger)

    // This log entry automatically has request_id, method, path
    log.Info("Processing order creation request")

    order, err := h.service.Create(r.Context(), req)
    if err != nil {
        log.Error("Order creation failed", zap.Error(err))
        return
    }

    log.Info("Order created", zap.Int64("order_id", order.ID))
}

// Usage in a service (receives ctx, extracts logger):
func (s *OrderService) Create(ctx context.Context, req CreateOrderReq) (*Order, error) {
    log := middleware.L(ctx, s.logger)

    // This also carries request_id — no manual passing needed
    log.Debug("Validating order items", zap.Int("item_count", len(req.Items)))
    // ...
}
```

When you pass `context.Context` through your entire call stack (which you should always do in Go), the request-scoped logger travels with it invisibly. Every component in the chain calls `middleware.L(ctx, fallback)` to get the correctly scoped logger, and every log entry they produce carries the request ID automatically.

---

## 9. Contextual Logging — Carrying State Without Repetition

Contextual logging is the practice of attaching fields to a logger once and having them appear automatically on every subsequent log entry from that logger. This is done via `logger.With(fields...)`, which creates a new child logger with those fields pre-loaded.

The principle is: **add context at the moment you acquire it, and let it flow forward**. When you authenticate a user, add `user_id` to the logger. When you begin processing an order, add `order_id`. When you enter a specific component, add the component name. You never have to repeat these fields in individual log calls.

```go
package service

import "go.uber.org/zap"

type OrderService struct {
    // Component-level context — added once in the constructor
    logger *zap.Logger
}

func NewOrderService(base *zap.Logger) *OrderService {
    return &OrderService{
        logger: base.With(zap.String("component", "order-service")),
    }
}

func (s *OrderService) ProcessOrder(ctx context.Context, userID, orderID int64) error {
    // Operation-level context — added once at the start of the operation
    // Every log call below automatically carries component + user_id + order_id
    log := middleware.L(ctx, s.logger).With(
        zap.Int64("user_id", userID),
        zap.Int64("order_id", orderID),
    )

    log.Info("Starting order processing")
    // Output: {..., "component":"order-service", "user_id":42, "order_id":789, "msg":"Starting order processing"}

    if err := s.validateInventory(ctx, log, orderID); err != nil {
        log.Error("Inventory validation failed", zap.Error(err))
        return err
    }

    if err := s.chargePayment(ctx, log, orderID); err != nil {
        log.Error("Payment charge failed", zap.Error(err))
        return err
    }

    log.Info("Order processing completed successfully")
    // Output: {..., "component":"order-service", "user_id":42, "order_id":789, "msg":"Order processing completed successfully"}

    return nil
}

// Both sub-functions receive the already-contextualized logger
func (s *OrderService) validateInventory(ctx context.Context, log *zap.Logger, orderID int64) error {
    log.Debug("Checking inventory for order items")
    // No need to pass user_id or order_id — they are already in the logger
    // ...
}
```

This pattern eliminates one of the most common logging anti-patterns: copy-pasting the same fields into every log call. When you forget to include a field in one log call (and you will), the context is lost for exactly the log entry you needed it on. With contextual logging, you cannot forget because the fields are baked into the logger itself.

---

## 10. Error Logging — The Art of Logging Failures

Errors are the most important events in your log stream, and they deserve the most careful thought. The fundamental principle of error logging is this: **log an error at the point where you first know it cannot be recovered from, and only once**. Logging the same error multiple times as it propagates up the call stack creates noise and confusion.

```
ASCII Diagram: Where to Log Errors — The Single Log Rule

  database.QueryRow() returns an error
              │
              ▼
  repository.FindUser() receives the error
      │ Should I log here?
      │ → Only if I am making a final decision about this error.
      │   If I am going to return it to the caller, DO NOT log yet.
      │   The caller may have more context to add.
      ▼
  service.GetUser() receives the error
      │ Should I log here?
      │ → This is where the business context exists (user_id, request_id).
      │   I know the operation has failed.
      │   Log HERE with full context, then return a wrapped error.
      ▼
  handler.GetUser() receives the wrapped error
      │ Should I log here?
      │ → The error was already logged below. DO NOT log again.
      │   Just return the appropriate HTTP status code.
      ▼
  HTTP 500 response sent to client

  Result: ONE log entry with FULL context. Not three log entries with partial context.
```

When you do log an error, include everything that would help someone understand what was attempted, why it failed, and what the impact is. The `zap.Error(err)` field captures the error message. Use `zap.NamedError("db_error", err)` when you have multiple errors to distinguish them. For errors from external systems, include the external system's error code, not just your own wrapping.

```go
// Wrong — logging too early, without context
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    row := r.db.QueryRowContext(ctx, "SELECT id, email FROM users WHERE id = $1", id)
    var user User
    if err := row.Scan(&user.ID, &user.Email); err != nil {
        r.logger.Error("scan failed", zap.Error(err)) // ← too early, no business context
        return nil, err
    }
    return &user, nil
}

// Wrong — logging at every layer (same error logged 3 times)
func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        s.logger.Error("repo failed", zap.Error(err)) // ← already logged below!
        return nil, err
    }
    return user, nil
}

// Correct — log once, at the layer with the most context
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    // Repository: execute the query, return error without logging
    row := r.db.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1", id)
    var user User
    if err := row.Scan(&user.ID); err != nil {
        return nil, fmt.Errorf("scan user row: %w", err) // wrap, don't log
    }
    return &user, nil
}

func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    // Service: has business context (user_id), knows this is a final failure
    log := middleware.L(ctx, s.logger)

    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        // Log HERE with full context — this is where we know the operation has failed
        log.Error("Failed to retrieve user",
            zap.Int64("user_id", id),
            zap.Error(err),
            zap.String("operation", "GetUser"),
        )
        return nil, err
    }
    return user, nil
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    // Handler: error was already logged in service. Just respond.
    user, err := h.service.GetUser(r.Context(), userID)
    if err != nil {
        // NO log here — already logged. Just send the HTTP response.
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

There is one important exception: when an error crosses a system boundary (from a repository into a service, or from a service into a handler), it is acceptable — even desirable — to add context via error wrapping (`fmt.Errorf("fetch user profile: %w", err)`) rather than via logging. Error wrapping enriches the error message for when it is eventually logged, without creating duplicate log entries.

---

## 11. Logging HTTP Requests and Responses

Every HTTP request that enters your service and every response that leaves should produce exactly one log entry. This entry, produced by middleware, is the canonical record of the request. It should be logged **after** the handler completes (not before) so that the response status code and duration can be included.

```go
package middleware

import (
    "net/http"
    "time"
    "go.uber.org/zap"
)

func HTTPLogger(base *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            wrapped := &statusCapture{ResponseWriter: w, code: http.StatusOK}

            // Process the request
            next.ServeHTTP(wrapped, r)

            duration := time.Since(start)
            log := L(r.Context(), base)

            // Choose the log level based on the response status:
            // 5xx = ERROR (server-side failure, user was affected)
            // 4xx = WARN  (client error — worth watching but expected)
            // 2xx/3xx = INFO (normal operation)
            switch {
            case wrapped.code >= 500:
                log.Error("HTTP request failed",
                    zap.Int("status", wrapped.code),
                    zap.Duration("duration", duration),
                    zap.Int64("bytes_written", wrapped.bytesWritten),
                    zap.String("user_agent", r.UserAgent()),
                )
            case wrapped.code >= 400:
                log.Warn("HTTP client error",
                    zap.Int("status", wrapped.code),
                    zap.Duration("duration", duration),
                    zap.Int64("bytes_written", wrapped.bytesWritten),
                )
            default:
                log.Info("HTTP request served",
                    zap.Int("status", wrapped.code),
                    zap.Duration("duration", duration),
                    zap.Int64("bytes_written", wrapped.bytesWritten),
                )
            }
        })
    }
}

type statusCapture struct {
    http.ResponseWriter
    code         int
    bytesWritten int64
}

func (s *statusCapture) WriteHeader(code int) {
    s.code = code
    s.ResponseWriter.WriteHeader(code)
}

func (s *statusCapture) Write(b []byte) (int, error) {
    n, err := s.ResponseWriter.Write(b)
    s.bytesWritten += int64(n)
    return n, err
}
```

There is one important performance consideration for high-traffic health check endpoints. If your service handles 1,000 health check requests per second from a Kubernetes liveness probe, logging each one at INFO level will produce 1,000 log entries per second of pure noise. The solution is to skip logging for known health check paths, or to use sampling for high-frequency low-value endpoints.

```go
// Skip logging for health check endpoints
if r.URL.Path == "/health" || r.URL.Path == "/ready" {
    next.ServeHTTP(w, r)
    return
}
```

---

## 12. Logging Database Operations

Database operations are among the most common sources of production issues: slow queries, connection pool exhaustion, deadlocks, and constraint violations. Every database operation should be logged with enough information to diagnose these issues without needing to enable database-level query logging.

```go
func (r *OrderRepository) Create(ctx context.Context, order *CreateOrderInput) (*Order, error) {
    log := middleware.L(ctx, r.logger).With(
        zap.String("operation", "create_order"),
        zap.String("table", "orders"),
        zap.Int64("user_id", order.UserID),
    )

    // Log at DEBUG before the query — enabled only during active investigation
    log.Debug("Executing INSERT query")

    start := time.Now()
    var result Order
    err := r.db.QueryRowContext(ctx, insertOrderSQL, order.UserID, order.Total).
        Scan(&result.ID, &result.CreatedAt)
    elapsed := time.Since(start)

    if err != nil {
        log.Error("Database INSERT failed",
            zap.Duration("elapsed", elapsed),
            zap.Error(err),
            // Include the postgres error code if available for better diagnosis
            zap.String("pg_code", extractPGCode(err)),
        )
        return nil, fmt.Errorf("create order: %w", err)
    }

    // Log slow queries at WARN level — they indicate missing indexes or growing tables
    if elapsed > 100*time.Millisecond {
        log.Warn("Slow database query",
            zap.Duration("elapsed", elapsed),
            zap.String("suggestion", "check index on orders(user_id)"),
        )
    }

    // DEBUG for successful fast queries — no noise in production
    log.Debug("INSERT completed",
        zap.Int64("order_id", result.ID),
        zap.Duration("elapsed", elapsed),
    )

    return &result, nil
}
```

Notice the graduated log level strategy: the successful fast case is logged at DEBUG (invisible in production), a slow query is a WARN (visible but not alarming), and an error is ERROR (demands attention). This ensures that the database layer is both observable (everything is logged somewhere) and quiet (production logs only show what needs attention).

---

## 13. Logging External API Calls

Calls to external APIs (Stripe, Twilio, SendGrid, any third-party service) are among the riskiest operations in your system: they introduce network latency, can fail in unexpected ways, and have rate limits. They should always be logged with the URL (sanitized of credentials), the HTTP method, the response status, the duration, and any error details.

```go
func (c *StripeClient) ChargeCard(ctx context.Context, req *ChargeRequest) (*ChargeResult, error) {
    log := middleware.L(ctx, c.logger).With(
        zap.String("external_api", "stripe"),
        zap.String("endpoint", "/v1/payment_intents"),
        zap.Int64("amount_cents", req.AmountCents),
        zap.String("currency", req.Currency),
        // NEVER log: card number, CVV, full API key
        // SAFE to log: last four digits, currency, amount
    )

    log.Info("Calling Stripe payment API")
    start := time.Now()

    result, statusCode, err := c.doRequest(ctx, req)
    elapsed := time.Since(start)

    if err != nil {
        log.Error("Stripe API call failed",
            zap.Int("http_status", statusCode),
            zap.Duration("elapsed", elapsed),
            zap.Error(err),
            zap.String("stripe_error_code", extractStripeCode(err)),
            zap.String("stripe_decline_code", extractDeclineCode(err)),
        )
        return nil, err
    }

    log.Info("Stripe API call succeeded",
        zap.Int("http_status", statusCode),
        zap.Duration("elapsed", elapsed),
        zap.String("payment_intent_id", result.ID),
        zap.String("status", result.Status),
    )
    return result, nil
}
```

Always log both the start and the completion of a slow external call. If the call takes 30 seconds and you only log at completion, you have no visibility into calls that are currently in progress. The start log (at INFO or DEBUG) serves as a heartbeat: if you see the start log but no completion log, you know the call is hanging.

---

## 14. Logging in Background Workers and Cron Jobs

Background workers fail silently. Unlike HTTP requests, which produce a 500 response that users see immediately, a cron job that crashes at midnight produces nothing visible unless you have deliberately instrumented it. Every background worker should log its start, its completion (with duration), and its error if any.

```go
func (w *InvoiceWorker) Run(ctx context.Context) {
    log := w.logger.With(zap.String("worker", "invoice-generator"))

    log.Info("Invoice generation worker started")
    start := time.Now()

    invoicesGenerated, err := w.generateAllPendingInvoices(ctx, log)

    if err != nil {
        log.Error("Invoice generation worker failed",
            zap.Error(err),
            zap.Duration("elapsed", time.Since(start)),
            zap.Int("invoices_generated_before_failure", invoicesGenerated),
        )
        return
    }

    log.Info("Invoice generation worker completed",
        zap.Duration("elapsed", time.Since(start)),
        zap.Int("invoices_generated", invoicesGenerated),
    )
}

// Inside the worker, log per-item progress at DEBUG
// and log errors per-item at ERROR without stopping the entire batch.
func (w *InvoiceWorker) generateAllPendingInvoices(ctx context.Context, log *zap.Logger) (int, error) {
    orders, err := w.repo.FindPendingOrders(ctx)
    if err != nil {
        return 0, fmt.Errorf("fetch pending orders: %w", err)
    }

    log.Info("Fetched pending orders for invoicing", zap.Int("count", len(orders)))

    successCount := 0
    for _, order := range orders {
        itemLog := log.With(zap.Int64("order_id", order.ID))
        itemLog.Debug("Generating invoice for order")

        if err := w.generateInvoice(ctx, order); err != nil {
            // Log per-item errors but continue processing other items
            itemLog.Error("Failed to generate invoice",
                zap.Error(err),
                zap.Int64("user_id", order.UserID),
            )
            continue
        }

        successCount++
        itemLog.Debug("Invoice generated successfully")
    }

    return successCount, nil
}
```

A particularly valuable practice for cron jobs is to log a summary at completion: how many items were processed, how many succeeded, how many failed, and the total duration. This single INFO entry tells an operator at a glance whether the batch ran normally without having to count individual log lines.

---

## 15. Logging in Goroutines and Concurrent Code

Go's concurrency model makes it easy to accidentally lose log context. When you start a goroutine, you are starting a new execution context, and if you do not pass the logger (and the context) into it, the goroutine will either use a root logger with no context or — worse — have no access to a logger at all.

```go
// Wrong — goroutine uses a captured variable from a loop
// The logger inside the goroutine has no context about which iteration it is
for _, order := range orders {
    go func() {
        logger.Info("Processing order") // which order? the logger doesn't know
        process(order)
    }()
}

// Correct — pass context-enriched logger into the goroutine explicitly
for _, order := range orders {
    order := order // capture loop variable
    orderLog := logger.With(zap.Int64("order_id", order.ID))

    go func(log *zap.Logger) {
        log.Info("Processing order in background goroutine")
        if err := process(order); err != nil {
            log.Error("Background processing failed", zap.Error(err))
        }
        log.Info("Background processing completed")
    }(orderLog) // pass the enriched logger as an argument
}

// Correct — for goroutines that receive context, extract logger from context
func (w *Worker) startProcessingGoroutine(ctx context.Context, job Job) {
    jobLog := middleware.L(ctx, w.logger).With(
        zap.String("job_type", job.Type),
        zap.String("job_id", job.ID),
    )

    go func() {
        jobLog.Info("Job started")
        if err := w.processJob(job); err != nil {
            jobLog.Error("Job failed", zap.Error(err))
            return
        }
        jobLog.Info("Job completed")
    }()
}
```

A critical rule for goroutines: **never log inside a goroutine using a logger whose context comes from a `context.Context` that may be cancelled before the goroutine completes**. If the request context is cancelled (because the HTTP connection was closed), the logger extracted from it is still valid — `*zap.Logger` is not context-aware — but any database or external calls you make using that cancelled context will fail. Use a background context for truly background work, while keeping the log context for logging.

---

## 16. Log Volume Management — The Noise Problem

One of the most insidious problems in production logging is log noise. It begins gradually: a developer adds a DEBUG log in a loop, another adds INFO logs for every cache operation, a third adds verbose request logging. Within months, your service is producing 10 million log entries per day, storage costs are significant, and finding a meaningful log entry in the noise is harder than it was before you had structured logging at all.

```
ASCII Diagram: Log Volume Anti-Patterns

  The Chatty Loop:
  ┌────────────────────────────────────────────────────────────────────────┐
  │ for _, item := range order.Items {                                     │
  │     logger.Info("Processing item", zap.Int64("item_id", item.ID))     │
  │     processItem(item)                                                  │
  │     logger.Info("Item processed", zap.Int64("item_id", item.ID))      │
  │ }                                                                      │
  │ → 1,000 item order = 2,000 log entries per order request               │
  └────────────────────────────────────────────────────────────────────────┘

  The Fix: Log the summary, not each iteration
  ┌────────────────────────────────────────────────────────────────────────┐
  │ for _, item := range order.Items {                                     │
  │     logger.Debug("Processing item", zap.Int64("item_id", item.ID))    │
  │     processItem(item)                                                  │
  │ }                                                                      │
  │ logger.Info("All items processed",                                     │
  │     zap.Int("total_items", len(order.Items)),                          │
  │     zap.Int64("order_id", order.ID))                                  │
  │ → Always 1 log entry per order request                                 │
  └────────────────────────────────────────────────────────────────────────┘

  The Health Check Flood:
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Kubernetes liveness probe: GET /health every 10 seconds per pod       │
  │ 20 pods × 6 requests/minute = 120 health check log entries/minute     │
  │ = 172,800 meaningless log entries per day                              │
  └────────────────────────────────────────────────────────────────────────┘

  The Fix: Skip health check logging, or log only failures
  ┌────────────────────────────────────────────────────────────────────────┐
  │ if r.URL.Path == "/health" || r.URL.Path == "/ready" {                │
  │     next.ServeHTTP(w, r) // no logging                                 │
  │     return                                                             │
  │ }                                                                      │
  └────────────────────────────────────────────────────────────────────────┘
```

A useful mental model for managing log volume is to think of your log stream as having a **budget**. Each service is allocated a certain volume of logs per day based on its traffic and importance. DEBUG costs nothing (disabled in production). INFO is cheap but should be spent wisely. ERROR is free but should rarely occur. A service that produces millions of INFO logs per day is not well-observed — it is drowning in its own output.

---

## 17. Dynamic Log Levels — Changing Verbosity Without Restarts

One of the most powerful operational tools available in production logging is the ability to change the log level of a running service without restarting it. When you are investigating a subtle bug and need DEBUG logs from a specific service, restarting the service introduces its own risk and may lose the conditions that triggered the bug. Zap's `zap.AtomicLevel` solves this elegantly.

```go
package main

import (
    "encoding/json"
    "net/http"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// AtomicLevel can be changed at runtime via an HTTP endpoint.
// It is safe to update concurrently.
var atomicLevel = zap.NewAtomicLevelAt(zapcore.InfoLevel)

func buildLogger() *zap.Logger {
    encoderCfg := zap.NewProductionEncoderConfig()
    core := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderCfg),
        zapcore.AddSync(os.Stdout),
        atomicLevel, // ← level is controlled by the atomic level, not a constant
    )
    return zap.New(core, zap.AddCaller())
}

func registerLevelEndpoint(mux *http.ServeMux) {
    // GET /internal/log-level → returns current level
    // PUT /internal/log-level {"level": "debug"} → changes level
    mux.HandleFunc("/internal/log-level", atomicLevel.ServeHTTP)
}

// Usage:
// To enable debug logging in production:
// curl -X PUT http://service:8080/internal/log-level -d '{"level":"debug"}'
//
// To revert to info:
// curl -X PUT http://service:8080/internal/log-level -d '{"level":"info"}'
```

This capability is invaluable during incident investigations. You can temporarily increase verbosity on a suspicious service, capture the debug logs you need to diagnose the issue, and then reduce the level again — all without any deployment, restart, or risk to the service's operation.

---

## 18. Sampling — Logging a Fraction of High-Volume Events

Some events in a production system occur at such high frequency that logging every occurrence is neither useful nor affordable. If your search API processes 50,000 requests per second and all are successful, you do not need 50,000 log entries per second — you need enough entries to detect anomalies and confirm normal operation. Sampling gives you statistical visibility without the full cost.

The key rule of sampling is: **never sample errors**. Every error deserves a log entry. Sampling applies only to events that are repetitive, expected, and individually unimportant — like successful cache lookups or health checks. Sample high-frequency success events, and always log 100% of errors and warnings.

```go
package logging

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// NewSampledLogger creates a logger that emits the first N entries per
// time interval for each unique message, then suppresses duplicates.
// This is built into Zap via NewSamplerWithOptions.
func NewSampledLogger(base *zap.Logger) *zap.Logger {
    // Zap's built-in sampler: after the first 100 identical messages per second,
    // log only 1 in every 100 subsequent identical messages.
    sampledCore := zapcore.NewSamplerWithOptions(
        base.Core(),
        time.Second,  // sampling window
        100,          // log first 100 per window
        10,           // then log 1 in 10 after that
    )
    return zap.New(sampledCore, zap.AddCaller())
}

// For manual sampling in specific code paths:
var sampleCounter atomic.Int64

func logIfSampled(logger *zap.Logger, rate int, msg string, fields ...zap.Field) {
    n := sampleCounter.Add(1)
    if n%int64(rate) == 0 {
        // Add a field indicating this is a sampled entry and the sample rate
        fields = append(fields, zap.Int("sample_rate", rate))
        logger.Info(msg, fields...)
    }
}

// Usage in a high-frequency cache path:
func (c *Cache) Get(ctx context.Context, key string) ([]byte, bool) {
    val, ok := c.store[key]
    if ok {
        // Only log 1 in 1000 cache hits — we have metrics for the rate,
        // we do not need individual log entries for every cache hit
        logIfSampled(c.logger, 1000, "Cache hit",
            zap.String("key", key),
            zap.Bool("hit", true),
        )
    } else {
        // Always log cache misses — they are more interesting
        c.logger.Debug("Cache miss", zap.String("key", key))
    }
    return val, ok
}
```

---

## 19. Performance — Making Logging Invisible to Your Application

Logging has a cost. Every log entry involves serialization, possible string formatting, and I/O. If your logger is slow, it will add latency to every request that passes through it. The goal of high-performance logging is to make the logging infrastructure as invisible as possible to your application's hot path.

```
ASCII Diagram: Logging Performance Hierarchy

  FASTEST (almost zero cost):
  ┌──────────────────────────────────────────────────────────────────────┐
  │  zap.Logger with level check (disabled level discarded immediately)  │
  │  logger.Debug("msg") when level >= Info  → 0 allocations, ~2ns      │
  └──────────────────────────────────────────────────────────────────────┘

  FAST (zero allocation):
  ┌──────────────────────────────────────────────────────────────────────┐
  │  zap.Logger with typed fields (zap.String, zap.Int64, zap.Duration) │
  │  → 0 heap allocations, ~200ns                                        │
  └──────────────────────────────────────────────────────────────────────┘

  MODERATE (reflection):
  ┌──────────────────────────────────────────────────────────────────────┐
  │  zap.SugaredLogger with Infow (key-value pairs)                      │
  │  → some allocations for interface{}, ~500ns                          │
  └──────────────────────────────────────────────────────────────────────┘

  SLOW (avoid in hot paths):
  ┌──────────────────────────────────────────────────────────────────────┐
  │  zap.Any() with complex types (uses reflection)                      │
  │  fmt.Sprintf() in log messages (allocates new string)                │
  │  → allocations + reflection, 1-5μs                                   │
  └──────────────────────────────────────────────────────────────────────┘

  VERY SLOW (never use):
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Synchronous file writes in the hot path (disk I/O per log entry)   │
  │  Sending HTTP request to log aggregator per log entry (network I/O) │
  │  → milliseconds per log entry                                        │
  └──────────────────────────────────────────────────────────────────────┘
```

The most important performance best practices are:

First, always use **typed Zap fields** (`zap.String`, `zap.Int64`, `zap.Duration`) rather than `zap.Any` or `fmt.Sprintf` inside log calls. Typed fields are encoded directly to bytes without heap allocation. Using `fmt.Sprintf` to build a log message string first, then passing it to the logger, defeats the entire purpose of Zap's zero-allocation design.

Second, **never use synchronous I/O in the hot path**. The `zapcore.AddSync(os.Stdout)` approach buffers writes, but if you are using a custom writer that makes an HTTP request to Loki on every `Write()` call, you will block every goroutine that logs. Always use asynchronous, batched writers for remote destinations.

Third, use **buffered output**. Zap's default behavior for file writing is to write synchronously, which means every log entry triggers a `write()` syscall. For very high throughput services, consider wrapping your writer in a `bufio.Writer` and flushing on a timer.

```go
// Wrong — fmt.Sprintf in hot path
logger.Info(fmt.Sprintf("Processing order %d for user %d", orderID, userID))

// Correct — typed fields, zero allocation
logger.Info("Processing order",
    zap.Int64("order_id", orderID),
    zap.Int64("user_id", userID),
)

// Wrong — zap.Any with a complex type in hot path
logger.Info("Order details", zap.Any("order", order)) // uses reflection

// Correct — extract and log only the fields you need
logger.Info("Order details",
    zap.Int64("order_id", order.ID),
    zap.String("status", order.Status),
    zap.Float64("total_usd", order.TotalUSD),
)
```

---

## 20. Log Correlation — Connecting Logs, Metrics, and Traces

Modern observability is built on three pillars: **logs** (what happened), **metrics** (how much and how often), and **traces** (how long each step took and how they connected). The true power of these three systems emerges when they are correlated — when a Grafana dashboard panel can link from a metric spike to the relevant log entries, and from a log entry to the distributed trace that shows exactly which service call was slow.

Correlation is achieved through shared identifiers. The `trace_id` from an OpenTelemetry trace, when embedded in your log entry as a field, allows Grafana Tempo (the trace storage system) to find the trace from the log and vice versa. Loki and Tempo have built-in support for this correlation when the field names match.

```go
package middleware

import (
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

// TraceLogger adds the OpenTelemetry trace ID and span ID to the log context.
// This enables one-click navigation from a log entry in Grafana Loki
// to the corresponding distributed trace in Grafana Tempo.
func TraceLogger(base *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            span := trace.SpanFromContext(r.Context())
            if span.SpanContext().IsValid() {
                // Inject trace context into the logger
                enrichedLogger := base.With(
                    zap.String("trace_id", span.SpanContext().TraceID().String()),
                    zap.String("span_id", span.SpanContext().SpanID().String()),
                )
                ctx := context.WithValue(r.Context(), loggerCtxKey, enrichedLogger)
                r = r.WithContext(ctx)
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

With this middleware in place, every log entry carries a `trace_id`. In Grafana, you can configure a "derived field" in your Loki datasource that turns the `trace_id` value into a clickable link to Grafana Tempo. Clicking it opens the full distributed trace for that request — showing every service call, every database query, and every external API call, with durations — all starting from a single log entry.

---

## 21. Operational Logging Patterns

Beyond individual log statements, there are several higher-level patterns that make a logging system more operationally useful in practice.

**Application Lifecycle Logging** ensures that the startup and shutdown sequence of your service is fully visible. Every significant step of initialization should be logged at INFO: configuration loaded, database connection established, migrations run, HTTP server started. Similarly, the graceful shutdown sequence should be logged in detail. When a deployment fails or a service does not start cleanly, these logs are the first and often the only evidence of what went wrong.

```go
func main() {
    logger.Info("Application starting",
        zap.String("version", version),
        zap.String("env", env),
        zap.String("config_source", configFile),
    )

    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil {
        logger.Fatal("Failed to connect to database", zap.Error(err))
    }
    logger.Info("Database connection established",
        zap.String("host", cfg.DatabaseHost),
        zap.Int("max_connections", cfg.MaxDBConnections),
    )

    if err := db.RunMigrations(); err != nil {
        logger.Fatal("Database migrations failed", zap.Error(err))
    }
    logger.Info("Database migrations completed",
        zap.Int("migrations_run", migrationsRun),
    )

    logger.Info("HTTP server starting", zap.String("addr", ":8080"))
    // ... start server ...
}
```

**Audit Logging** is a special category of INFO logging for security-sensitive operations: user password changes, role assignments, data exports, bulk deletions, and administrative actions. Audit logs answer the question _"Who did what, when, and from where?"_ They should be written to a separate, append-only log stream that cannot be deleted or modified, even by administrators.

```go
// Audit log entry for a sensitive operation
auditLogger.Info("User password changed",
    zap.Int64("actor_user_id", requestingUserID),  // who initiated it
    zap.Int64("target_user_id", targetUserID),       // whose password was changed
    zap.String("actor_ip", clientIP),                // from where
    zap.String("change_type", "password_reset"),     // what kind of change
    zap.Bool("forced_by_admin", isAdmin),
    // DO NOT log the old or new password
)
```

**Startup Configuration Logging** means logging all the non-sensitive configuration values at startup. When a service misbehaves, one of the first questions is _"What configuration is it running with?"_ Logging the effective configuration at startup makes this immediately answerable.

```go
logger.Info("Loaded configuration",
    zap.String("db_host", cfg.DBHost),
    zap.Int("db_pool_max", cfg.DBPoolMax),
    zap.String("redis_host", cfg.RedisHost),
    zap.String("log_level", cfg.LogLevel),
    zap.String("feature_flags", strings.Join(cfg.EnabledFeatures, ",")),
    // DO NOT log: db_password, redis_password, api_keys, jwt_secret
)
```

---

## 22. Environment-Specific Logging Strategy

Different environments have different needs. Development environments prioritize human readability and verbosity. Production environments prioritize machine parseability, low cost, and low noise.

```
ASCII Diagram: Environment-Specific Logging Configuration

  DEVELOPMENT
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Format:    Console (colored, human-readable)                            │
  │  Level:     DEBUG (see everything)                                       │
  │  Output:    stdout only                                                  │
  │  Sampling:  none (see every event)                                       │
  │  Loki:      disabled (no infrastructure running locally)                │
  │  Stack:     on all errors (full traces in terminal)                      │
  │                                                                          │
  │  Goal: maximum visibility for the developer writing code                 │
  └──────────────────────────────────────────────────────────────────────────┘

  STAGING / QA
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Format:    JSON (same as production — catch parsing issues early)       │
  │  Level:     DEBUG (catch issues before they reach production)            │
  │  Output:    stdout + Loki (test the full pipeline)                       │
  │  Sampling:  none (low traffic, can afford full logging)                  │
  │  Loki:      enabled (validates log pipeline configuration)               │
  │  Stack:     on all errors                                                │
  │                                                                          │
  │  Goal: match production as closely as possible, maximum observability    │
  └──────────────────────────────────────────────────────────────────────────┘

  PRODUCTION
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Format:    JSON (machine-readable, indexed by Loki/Elasticsearch)       │
  │  Level:     INFO (suppress debug noise)                                  │
  │  Output:    stdout + rotating file + Loki                                │
  │  Sampling:  on high-frequency success events (1 in 100 cache hits)      │
  │  Loki:      enabled with async batched writer                            │
  │  Stack:     on ERROR and above only                                      │
  │  Rotation:  100MB max file, 7 backups, 30 days, gzip compressed          │
  │                                                                          │
  │  Goal: minimum noise, maximum signal, zero performance impact            │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## 23. Log Retention and Rotation Strategy

Log retention is a balance between operational need and cost. Logs that are too old to be useful should be deleted; logs that may still be needed for debugging, compliance, or forensics should be kept. The standard industry practice is a tiered retention model.

```
ASCII Diagram: Tiered Log Retention Strategy

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    LOG RETENTION TIERS                                   │
  ├──────────────────┬───────────────┬─────────────────────────────────────  ┤
  │  Tier            │  Retention    │  Storage / Notes                      │
  ├──────────────────┼───────────────┼───────────────────────────────────────┤
  │  Hot             │  7–30 days    │  Loki / Elasticsearch (fast queries)  │
  │  (recent logs)   │               │  Full indexing, instant search        │
  │                  │               │  Most expensive — minimize volume     │
  ├──────────────────┼───────────────┼───────────────────────────────────────┤
  │  Warm            │  30–90 days   │  S3 / GCS (compressed, cheap)         │
  │  (older logs)    │               │  Queryable but slower                 │
  │                  │               │  Good for post-incident forensics     │
  ├──────────────────┼───────────────┼───────────────────────────────────────┤
  │  Cold / Archive  │  1–7 years    │  S3 Glacier / tape (almost free)      │
  │  (compliance)    │               │  For regulated industries (finance,   │
  │                  │               │  healthcare) requiring audit trails   │
  │                  │               │  Hours to days to retrieve            │
  └──────────────────┴───────────────┴───────────────────────────────────────┘

  Local file rotation (Lumberjack config):
  MaxSize    = 100 MB   (rotate when file reaches 100 MB)
  MaxBackups = 7        (keep 7 rotated files)
  MaxAge     = 30 days  (delete files older than 30 days)
  Compress   = true     (gzip rotated files — typically 5:1 compression ratio)

  With 100MB files × 7 backups × 5:1 gzip = ~140 MB total local disk usage
  With 100MB/day log volume, rotation happens daily, 7 days kept locally
```

---

## 24. The Anti-Patterns — What Kills Production Logging

Understanding what to avoid is as important as understanding what to do. The following anti-patterns are the most common causes of logging systems that are expensive, noisy, and useless in production.

**The String Formatting Anti-Pattern** is using `fmt.Sprintf` or string concatenation inside a log call. `logger.Info(fmt.Sprintf("user %d logged in", id))` is strictly worse than `logger.Info("user logged in", zap.Int64("user_id", id))` in every dimension: it is slower (allocates a string), it is unstructured (the ID is embedded in a string, not a field), and it makes filtering harder. Never format strings before passing them to a structured logger.

**The Exception Swallowing Anti-Pattern** is catching an error, logging a vague message, and returning `nil` — pretending the error did not happen. `if err != nil { logger.Error("something went wrong"); return nil }` is worse than not logging at all, because it actively misleads: the caller receives nil and assumes success while an error was silently discarded.

**The Log-and-Return Anti-Pattern** is logging an error at one level and then returning it to be logged again at a higher level. This produces two (or three, or four) log entries for the same error, each with partial context, making it appear that there were multiple failures when there was only one.

**The God Level Anti-Pattern** is logging everything at INFO, treating INFO as a universal catch-all. This destroys the entire value of log levels: operators cannot filter to see only important events because everything is "important" according to the logger. Reserve INFO for meaningful business events and use DEBUG for developer details.

**The Silent Success Anti-Pattern** is logging extensively when things go wrong but logging nothing when things go right. A system that only logs errors gives no baseline against which to judge the error rate. You need INFO logs of successful operations to know what "normal" looks like so you can tell when things deviate from normal.

**The Blocking Writer Anti-Pattern** is using a log writer that can block the application. If your logger writes synchronously to a remote endpoint (Loki, Elasticsearch) and that endpoint is slow or unreachable, every log call in your application will block, causing request timeouts and potentially crashing the service. All remote log destinations must be written to asynchronously with a non-blocking queue.

---

## 25. The Production Logging Checklist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  THE COMPLETE PRODUCTION LOGGING CHECKLIST                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FOUNDATION                                                                  │
│  ✅ Use a structured logger (Zap) — never plain text logs in production      │
│  ✅ Output JSON in production, console format in development                 │
│  ✅ Use ISO8601 UTC timestamps on every entry                                │
│  ✅ Include caller (file:line) on every entry                                │
│  ✅ Always call defer logger.Sync() in main() to flush buffers               │
│  ✅ Use a custom registry, not global logger, for testability                │
│                                                                              │
│  LOG LEVELS                                                                  │
│  ✅ Set production minimum level to INFO — never DEBUG in production         │
│  ✅ Use DEBUG only for developer details — freely verbose, costs nothing     │
│  ✅ Use INFO for normal business events — user actions, successful ops       │
│  ✅ Use WARN for recovered anomalies — retries, fallbacks, slow queries      │
│  ✅ Use ERROR for user-facing failures — payment failed, request failed      │
│  ✅ Use FATAL only at startup for unrecoverable initialization failures      │
│  ✅ Log 5xx responses at ERROR, 4xx at WARN, 2xx at INFO in HTTP middleware  │
│                                                                              │
│  STRUCTURE AND CONTENT                                                       │
│  ✅ Use snake_case for all field names, consistently across all services     │
│  ✅ Use typed fields (zap.Int64, zap.Duration) — never zap.Any in hot paths │
│  ✅ Never embed data in message strings — use fields                         │
│  ✅ Keep the msg field short, stable, and consistent across deployments      │
│  ✅ Always include: ts, level, msg, app, version, env, host                  │
│  ✅ Always include request_id on every log entry within a request            │
│  ✅ Include duration on every operation that involves I/O or computation     │
│  ✅ Include the affected entity ID (user_id, order_id) on every entry        │
│  ✅ Include error details: error message + root cause + external error code  │
│                                                                              │
│  SECURITY AND PRIVACY                                                        │
│  ✅ Never log passwords, tokens, API keys, or secrets                        │
│  ✅ Never log full credit card numbers (PAN) or CVV values                   │
│  ✅ Never log PII: email, full name, phone, address, SSN                     │
│  ✅ Never log full request/response bodies (may contain sensitive data)      │
│  ✅ Use user_id (opaque internal ID) instead of email or name                │
│  ✅ Log last four digits of card (e.g. "****4242"), never the full number    │
│  ✅ Audit log all sensitive operations to a tamper-evident store             │
│                                                                              │
│  CONTEXT AND CORRELATION                                                     │
│  ✅ Generate a unique request_id for every incoming request                  │
│  ✅ Propagate request_id via context.Context through the entire call stack   │
│  ✅ Propagate request_id via X-Request-ID header to downstream services      │
│  ✅ Use logger.With() to attach context at each layer (component, operation) │
│  ✅ Add trace_id and span_id for OpenTelemetry correlation with Tempo        │
│  ✅ Log errors once, at the layer with the most context — never multiple times│
│                                                                              │
│  BOUNDARIES                                                                  │
│  ✅ Log at HTTP request entry and completion via middleware                  │
│  ✅ Log every database query duration and error                              │
│  ✅ Log every external API call start, completion, duration, and error       │
│  ✅ Log every message published and consumed from the queue                  │
│  ✅ Log start, completion, and summary of every background worker / cron job │
│  ✅ Log application lifecycle: startup steps, shutdown sequence              │
│                                                                              │
│  VOLUME AND PERFORMANCE                                                      │
│  ✅ Never log inside tight loops — log a summary after the loop              │
│  ✅ Skip logging for health check / readiness probe endpoints                │
│  ✅ Use Zap sampling for high-frequency low-value success events             │
│  ✅ Use async, batched writers for remote destinations (Loki, Elasticsearch) │
│  ✅ Never use fmt.Sprintf in a log call — use typed fields instead           │
│  ✅ Never block the application on log I/O — use non-blocking writers        │
│  ✅ Use zap.AtomicLevel for dynamic level changes without restarts           │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  ✅ Write to stdout (for container log collectors) AND rotating file         │
│  ✅ Configure log rotation: 100MB max, 7 backups, 30 days, gzip             │
│  ✅ Ship logs to Loki/Elasticsearch via Promtail/agent (decouple from app)  │
│  ✅ Define retention: 30 days hot in Loki, 90 days warm in S3               │
│  ✅ Build Grafana dashboards: error rate, log volume, slow queries by service│
│  ✅ Set up Loki ruler alerts: high error rate, service silence, anomalies    │
│  ✅ Test log entries in unit tests using zaptest/observer                    │
│  ✅ Document field naming conventions in a team wiki and enforce in review   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

_Good logging is not about logging more. It is about logging the right things, in the right places, with the right context, at the right level. A service with 100 well-crafted log entries per request is infinitely more valuable in a crisis than a service with 10,000 entries that say nothing. The discipline of production logging is the discipline of writing for your future self, under pressure, in the dark — and giving that person exactly the evidence they need to understand what happened and fix it._