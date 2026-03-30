# Real-Time Log Aggregator & Analyzer

## Complete Project Documentation

---

## Table of Contents

1. Project Overview
2. Problem Statement
3. Solution Architecture
4. Core Components
5. Complete Functionality List
6. System Behavior
7. Data Flow
8. Technical Requirements
9. Benefits & Use Cases

---

## 1. Project Overview

### What is This Project?

The Real-Time Log Aggregator & Analyzer is a centralized logging system that collects, processes, stores, and analyzes log data from multiple applications and servers in real-time. It provides a unified platform for viewing and searching logs across your entire infrastructure.

### Simple Explanation

Imagine you run a company with 100 servers, each running different applications (web servers, databases, APIs, etc.). Each server generates thousands of log messages every minute. Without this system, you would need to:

- Log into each server individually to check logs
- Manually search through gigabytes of text files
- Struggle to correlate events across multiple servers
- Risk losing logs if a server crashes

This project solves all these problems by:

- Automatically collecting logs from all servers
- Storing them in one central location
- Making them searchable in seconds
- Providing real-time monitoring and alerts
- Preserving logs even if servers fail

### Real-World Example

**Scenario:** Your e-commerce website is running slow.

**Without this system:**

- Check web server logs (Server 1)
- Check API server logs (Server 2)
- Check database logs (Server 3)
- Check payment gateway logs (Server 4)
- Manually correlate timestamps
- Takes 30 minutes to find the issue

**With this system:**

- Search "slow response" across all servers
- See all related logs in one view
- Identify database timeout in 2 minutes
- Fix the problem quickly

---

## 2. Problem Statement

### Current Challenges in Log Management

#### Challenge 1: Distributed Logs

**Problem:** Logs are scattered across hundreds of servers. **Impact:**

- Time-consuming to access logs from multiple machines
- Impossible to get a unified view
- Difficult to trace requests across services

#### Challenge 2: Manual Log Analysis

**Problem:** Engineers must manually search through text files. **Impact:**

- Slow troubleshooting process
- Human errors in log analysis
- Cannot handle large log volumes

#### Challenge 3: Data Loss Risk

**Problem:** Logs stored only on local servers. **Impact:**

- If a server crashes, logs are lost forever
- Cannot investigate issues after server failure
- No historical data for analysis

#### Challenge 4: No Real-Time Monitoring

**Problem:** Cannot detect issues as they happen. **Impact:**

- Problems discovered by users, not monitoring
- Extended downtime
- Poor user experience

#### Challenge 5: Limited Search Capabilities

**Problem:** Basic text search tools (grep, less) are inadequate. **Impact:**

- Cannot search across multiple servers
- No full-text search capabilities
- No filtering or aggregation

---

## 3. Solution Architecture

### High-Level Design

The system consists of six major components working together:

1. **Log Shippers (Agents)** - Installed on each server to collect logs
2. **Ingestion Gateway** - Central endpoint receiving logs from all shippers
3. **Processing Pipeline** - Transforms raw logs into structured data
4. **Storage Engine** - Efficiently stores and indexes logs
5. **Query Engine** - Provides fast search and analytics
6. **Dashboard/API** - User interface for accessing logs

### Architecture Diagram (Conceptual)

```
Multiple Servers (Application Hosts)
    ↓ (Log Shippers collect and forward)
Ingestion Gateway (Central receiving point)
    ↓ (Queue for processing)
Processing Pipeline (Parse, Filter, Enrich)
    ↓ (Processed data)
Storage Engine (Disk/Database storage)
    ↓ (Indexed data)
Query Engine (Search and analytics)
    ↓ (Results)
Dashboard/API (User access)
```

---

## 4. Core Components

### Component 1: Log Shipper (Agent)

**Purpose:** Lightweight program installed on each server that monitors and forwards logs.

**Location:** Runs on the same machine as your applications.

**Responsibilities:**

- Monitor log files for new entries
- Collect logs from multiple sources
- Prepare logs for transmission
- Handle network failures gracefully

### Component 2: Ingestion Gateway

**Purpose:** Central server that receives logs from all shippers.

**Location:** Dedicated server(s) accessible by all application servers.

**Responsibilities:**

- Accept incoming log data
- Authenticate and authorize shippers
- Validate log format
- Control rate of incoming data
- Queue logs for processing

### Component 3: Processing Pipeline

**Purpose:** Transform raw log text into structured, searchable data.

**Location:** One or more processing servers.

**Responsibilities:**

- Parse log messages
- Extract important fields
- Filter unwanted logs
- Enrich logs with additional metadata
- Prepare data for storage

### Component 4: Storage Engine

**Purpose:** Persist logs efficiently for long-term storage and fast retrieval.

**Location:** Database or file system.

**Responsibilities:**

- Store processed logs
- Create indexes for fast searching
- Compress data to save space
- Manage data retention policies
- Handle backup and recovery

### Component 5: Query Engine

**Purpose:** Provide fast search and analytics capabilities.

**Location:** Application server.

**Responsibilities:**

- Execute search queries
- Perform aggregations and statistics
- Return results quickly
- Support complex filtering

### Component 6: Dashboard & API

**Purpose:** User interface for interacting with the log system.

**Location:** Web server.

**Responsibilities:**

- Display logs in readable format
- Provide search interface
- Show visualizations and charts
- Expose REST API for programmatic access

---

## 5. Complete Functionality List

### 5.1 Log Collection Functionality

#### Functionality 5.1.1: File Monitoring

**What it does:** Continuously watches log files for new content without blocking application performance.

**How it works:**

- Uses operating system notifications to detect when files change
- Reads only new lines that have been added
- Remembers the last position read to avoid duplicates
- Handles log file rotation (when old logs are archived and new files created)

**Behavior:**

- Detects new log lines within milliseconds
- Does not re-read entire files
- Automatically discovers new log files in watched directories
- Continues monitoring even if files are temporarily unavailable

**Example:** Your application writes: "ERROR: Database connection failed" Within 100 milliseconds, the shipper detects this new line and begins processing it.

---

#### Functionality 5.1.2: Multiple Source Support

**What it does:** Collects logs from different types of sources, not just files.

**Supported sources:**

- **Log files:** Traditional text files like `/var/log/app.log`
- **System logs:** Operating system events (syslog on Linux, Event Viewer on Windows)
- **Standard output:** Console output from applications (especially Docker containers)
- **Network sockets:** Applications sending logs over TCP/UDP
- **Database logs:** Direct collection from database systems

**How it works:** Each source type has a dedicated collector that understands its format and protocol.

**Behavior:**

- Runs multiple collectors simultaneously
- Each collector operates independently
- Automatically detects source type
- Handles different log formats (JSON, plain text, syslog format)

**Example:** Simultaneously collecting:

- Nginx access logs from `/var/log/nginx/access.log`
- Application logs from Docker container stdout
- System events from syslog
- Database errors from PostgreSQL

---

#### Functionality 5.1.3: Log Batching

**What it does:** Groups multiple log entries together before sending to reduce network overhead.

**How it works:**

- Accumulates logs in memory
- Sends when batch size reaches threshold (e.g., 100 logs)
- Also sends if time threshold reached (e.g., 10 seconds)
- Balances between latency and efficiency

**Behavior:**

- **High traffic scenario:** Batch fills quickly (100 logs in 1 second) → Send immediately
- **Low traffic scenario:** Few logs arrive → Wait up to 10 seconds → Send partial batch
- **Network down scenario:** Continues batching until buffer full → Save to disk

**Example:**

```
Time 10:00:00 - Log 1 arrives → Add to batch (1/100)
Time 10:00:01 - Logs 2-50 arrive → Add to batch (50/100)
Time 10:00:02 - Logs 51-100 arrive → Batch full → Send all 100 logs
Time 10:00:03 - Log 101 arrives → Start new batch
```

**Benefits:**

- Reduces network requests by 100x
- Lower bandwidth usage
- Better throughput
- Reduced load on ingestion gateway

---

#### Functionality 5.1.4: Data Compression

**What it does:** Compresses log data before transmission to save bandwidth.

**How it works:**

- Uses gzip compression algorithm
- Compresses entire batches
- Decompressed at gateway
- Maintains data integrity

**Behavior:**

- Automatic compression of all batches
- Typically achieves 10:1 compression ratio
- Text logs compress very well (repetitive patterns)
- Adds minimal CPU overhead

**Example:** Original batch: 100 logs = 100 KB After compression: 10 KB **Result:** 90% bandwidth savings

**Benefits:**

- Faster transmission over network
- Lower network costs
- Handles limited bandwidth scenarios
- More logs can be sent in same time

---

#### Functionality 5.1.5: Local Buffering

**What it does:** Temporarily stores logs on disk when network is unavailable.

**How it works:**

- Attempts to send logs to gateway
- If network fails, writes logs to local disk
- Periodically retries sending
- Deletes buffer files after successful transmission

**Behavior:**

- **Normal operation:** Logs sent immediately, no buffering
- **Network failure:** Logs saved to `/var/buffer/logs_timestamp.log`
- **Retry mechanism:** Attempts resend every 30 seconds
- **Recovery:** When network returns, sends buffered logs first (FIFO order)
- **Disk management:** Limits buffer size to prevent filling disk

**Example scenario:**

```
10:00 - Network goes down
10:00-10:30 - 1000 logs buffered to disk
10:30 - Network restored
10:31 - Shipper sends all 1000 buffered logs
10:32 - Deletes buffer files
10:33 - Resumes normal operation
```

**Benefits:**

- Zero data loss during network outages
- Graceful handling of temporary failures
- Automatic recovery
- No manual intervention required

---

#### Functionality 5.1.6: Retry with Exponential Backoff

**What it does:** Intelligently retries failed transmissions with increasing wait times.

**How it works:**

- First retry: Wait 1 second
- Second retry: Wait 2 seconds
- Third retry: Wait 4 seconds
- Fourth retry: Wait 8 seconds
- Fifth retry: Wait 16 seconds
- After max retries: Save to disk buffer

**Behavior:**

- Prevents overwhelming the gateway with retry requests
- Gives system time to recover
- Adapts to temporary vs. permanent failures
- Eventually gives up and buffers locally

**Example:**

```
Attempt 1: Send logs → Gateway returns 503 (overloaded) → Wait 1s
Attempt 2: Send logs → Gateway returns 503 → Wait 2s
Attempt 3: Send logs → Gateway returns 503 → Wait 4s
Attempt 4: Send logs → Gateway returns 200 (success!) → Done
```

**Benefits:**

- Reduces load during system stress
- Prevents request storms
- Higher success rate
- Protects both shipper and gateway

---

### 5.2 Ingestion Gateway Functionality

#### Functionality 5.2.1: Connection Handling

**What it does:** Accepts and manages thousands of simultaneous connections from shippers.

**How it works:**

- Runs HTTP or gRPC server
- Each shipper connection handled independently
- Uses concurrent processing (goroutines in Go)
- Configurable connection limits

**Behavior:**

- **Under load:** Accepts up to configured max (e.g., 10,000 connections)
- **Over limit:** Returns 503 Service Unavailable to new connections
- **Connection pooling:** Reuses connections for efficiency
- **Graceful shutdown:** Finishes processing existing requests before stopping

**Capacity example:**

- Can handle 10,000 concurrent shipper connections
- Each shipper sends batch every 10 seconds
- Total capacity: 100,000 log batches per minute
- With 100 logs per batch: 10,000,000 logs per minute

**Benefits:**

- Scales to large deployments
- Predictable performance
- Prevents overload
- Smooth operation under stress

---

#### Functionality 5.2.2: Authentication & Authorization

**What it does:** Verifies the identity of shippers and ensures they're authorized to send logs.

**How it works:**

- Each shipper has unique API key
- API key sent in HTTP header
- Gateway validates key against database
- Can map keys to specific sources/tenants

**Behavior:**

- **Valid key:** Request accepted, proceed to processing
- **Invalid key:** Return 401 Unauthorized, reject request
- **Expired key:** Return 401, suggest renewal
- **Revoked key:** Return 403 Forbidden, permanently blocked

**Security features:**

- API keys are long, random strings (difficult to guess)
- Keys can be rotated regularly
- Different keys for different environments (dev, staging, production)
- Audit log of all authentication attempts

**Example:**

```
Shipper sends:
POST /ingest
Authorization: Bearer sk_live_abc123xyz789...

Gateway checks:
- Is this key in our database? → Yes
- Is it expired? → No
- Is it revoked? → No
- Which source does it belong to? → "web-server-prod"
→ Accept request
```

**Benefits:**

- Prevents unauthorized log submissions
- Identifies log sources
- Security compliance
- Easy to revoke access

---

#### Functionality 5.2.3: Rate Limiting

**What it does:** Controls how many logs each shipper can send per unit of time.

**How it works:**

- Tracks request rate per API key
- Uses token bucket algorithm
- Configurable limits per source
- Can have different limits for different sources

**Token bucket algorithm:**

- Each source gets a bucket with tokens
- Tokens refill at constant rate (e.g., 1000/second)
- Each log batch consumes one token
- When bucket empty, requests rejected

**Behavior:**

- **Normal traffic:** All requests accepted
- **Spike traffic:** Accepts up to burst limit, then starts rejecting
- **Sustained overload:** Rejects excess requests with 429 Too Many Requests
- **Recovery:** As rate decreases, accepts requests again

**Example:**

```
Configuration:
- Rate: 1000 logs/second
- Burst: 5000 logs

Scenario:
10:00:00 - Shipper sends 100 logs → Accepted (900 tokens remaining)
10:00:00 - Shipper sends 1000 logs → Accepted (0 tokens, burst used)
10:00:00 - Shipper sends 100 logs → REJECTED (no tokens available)
10:00:01 - 1000 tokens refilled → Shipper can send again
```

**Benefits:**

- Prevents any single source from overwhelming system
- Fair resource allocation
- Protects against bugs (e.g., infinite logging loop)
- Ensures system stability

---

#### Functionality 5.2.4: Data Validation

**What it does:** Checks incoming logs for correctness before accepting them.

**Validation checks:**

**1. Format validation:**

- Is it valid JSON?
- Does it match expected schema?
- Are required fields present?

**2. Field validation:**

- Timestamp: Is it a valid date? Not in the future?
- Level: Is it one of [DEBUG, INFO, WARN, ERROR, FATAL]?
- Message: Is it non-empty? Within size limit?
- Source: Is it a valid source identifier?

**3. Size validation:**

- Individual log entry: Maximum 64 KB
- Batch size: Maximum 10 MB
- Field lengths: Message max 32 KB

**Behavior:**

- **All checks pass:** Accept and queue for processing
- **Any check fails:** Reject with 400 Bad Request and detailed error message
- **Partial batch failure:** Can reject entire batch or just invalid entries (configurable)

**Example validation:**

```
Valid log:
{
  "timestamp": "2026-01-19T10:30:00Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "source": "web-api-01"
}
→ Accepted ✓

Invalid log (future timestamp):
{
  "timestamp": "2027-01-19T10:30:00Z",
  "level": "ERROR",
  "message": "Database connection failed"
}
→ Rejected ✗ (timestamp in future)

Invalid log (missing required field):
{
  "level": "ERROR",
  "message": "Database connection failed"
}
→ Rejected ✗ (missing timestamp)
```

**Benefits:**

- Data quality assurance
- Prevents garbage data in system
- Early error detection
- Clear error messages for debugging

---

#### Functionality 5.2.5: Decompression

**What it does:** Unpacks compressed log data received from shippers.

**How it works:**

- Checks Content-Encoding header
- If "gzip", decompresses using gzip algorithm
- Validates decompressed data integrity
- Handles decompression errors

**Behavior:**

- **Compressed data:** Decompress → Validate → Process
- **Uncompressed data:** Process directly
- **Corrupted compression:** Return 400 Bad Request
- **Decompression bomb protection:** Rejects if decompressed size exceeds limit

**Decompression bomb protection:** A malicious shipper could send tiny compressed file that expands to gigabytes. Gateway protects against this:

- Monitors decompressed size while decompressing
- Stops if exceeds configured limit (e.g., 100 MB)
- Returns error to shipper

**Example:**

```
Receives:
- Content-Encoding: gzip
- Body: 10 KB (compressed)

Processing:
- Decompress → 100 KB (original size)
- Size check: 100 KB < 100 MB limit → OK
- Validate JSON → OK
- Continue processing
```

**Benefits:**

- Supports efficient transmission
- Validates data integrity
- Security protection
- Seamless handling

---

#### Functionality 5.2.6: Queueing

**What it does:** Temporarily holds accepted logs before they're processed.

**How it works:**

- Uses in-memory queue (channel/buffer)
- FIFO (First In, First Out) ordering
- Fixed capacity (e.g., 10,000 batches)
- Non-blocking push operations

**Behavior:**

- **Queue has space:** Immediately add logs, return success to shipper
- **Queue full:** Either reject new logs OR wait briefly for space
- **Processing fast:** Queue stays mostly empty
- **Processing slow:** Queue fills up, applies backpressure

**Queue types:**

**1. In-memory queue (fast but not durable):**

- Fastest performance
- Lost if gateway crashes
- Good for non-critical logs

**2. Redis queue (durable, distributed):**

- Survives gateway restarts
- Can be shared across multiple gateways
- Slightly slower but more reliable

**3. RabbitMQ queue (guaranteed delivery):**

- Persistent storage
- Advanced routing
- Best for critical logs

**Example flow:**

```
10:00:00 - Gateway receives batch A → Add to queue (position 1)
10:00:00 - Gateway receives batch B → Add to queue (position 2)
10:00:01 - Processor takes batch A from queue → Process
10:00:01 - Gateway receives batch C → Add to queue (position 2)
10:00:02 - Processor takes batch B from queue → Process
10:00:02 - Processor takes batch C from queue → Process
```

**Benefits:**

- Decouples ingestion from processing
- Smooths traffic spikes
- Enables asynchronous processing
- Improves overall throughput

---

#### Functionality 5.2.7: Health Monitoring

**What it does:** Provides visibility into gateway health and performance.

**Metrics tracked:**

- Total requests received
- Requests per second
- Success vs. failure rate
- Authentication failures
- Rate limit rejections
- Queue size
- Average response time
- Error types and counts

**Endpoints:**

**1. Health check endpoint:**

```
GET /health
Response: { "status": "healthy", "timestamp": "2026-01-19T10:30:00Z" }
```

**2. Metrics endpoint:**

```
GET /metrics
Response: Prometheus-formatted metrics
```

**Behavior:**

- Continuously updates metrics
- Exports in standard format (Prometheus)
- Can trigger alerts based on thresholds
- Provides real-time visibility

**Example metrics:**

```
gateway_requests_total: 1,500,000
gateway_requests_success: 1,490,000
gateway_requests_failed: 10,000
gateway_auth_failures: 500
gateway_rate_limit_rejections: 5,000
gateway_queue_size: 150 (current)
gateway_avg_response_ms: 25
```

**Alerting examples:**

- If error rate > 5%: Alert operations team
- If queue size > 8000: Scale up processors
- If auth failures spike: Possible attack

**Benefits:**

- Operational visibility
- Proactive problem detection
- Performance optimization
- Capacity planning

---

### 5.3 Processing Pipeline Functionality

#### Functionality 5.3.1: Log Parsing

**What it does:** Converts unstructured log text into structured data with named fields.

**How it works:**

- Uses patterns (regular expressions or parsers) to extract information
- Supports multiple log formats
- Identifies log format automatically when possible
- Handles multi-line logs (like stack traces)

**Common log formats supported:**

**1. JSON logs:**

```
Raw: {"timestamp":"2026-01-19T10:30:00Z","level":"ERROR","msg":"DB timeout"}
Parsed: Already structured, validate and normalize
```

**2. Apache/Nginx logs:**

```
Raw: 192.168.1.1 - - [19/Jan/2026:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234
Parsed:
- ip: 192.168.1.1
- timestamp: 2026-01-19T10:30:00Z
- method: GET
- path: /api/users
- status: 200
- bytes: 1234
```

**3. Application logs:**

```
Raw: 2026-01-19 10:30:00 ERROR [DatabaseService] Connection timeout after 30s
Parsed:
- timestamp: 2026-01-19T10:30:00Z
- level: ERROR
- component: DatabaseService
- message: Connection timeout after 30s
```

**4. Syslog format:**

```
Raw: <34>Jan 19 10:30:00 web-server app[1234]: User login failed
Parsed:
- facility: auth
- severity: error
- timestamp: 2026-01-19T10:30:00Z
- hostname: web-server
- app: app
- pid: 1234
- message: User login failed
```

**Behavior:**

- **Known format:** Apply specific parser
- **Unknown format:** Try generic parsers
- **Parsing fails:** Keep raw message, mark as unparsed
- **Multi-line logs:** Detect and combine related lines

**Example:**

```
Input:
"2026-01-19 10:30:00 ERROR [UserService] Failed to authenticate user john@example.com: invalid password"

Output:
{
  "timestamp": "2026-01-19T10:30:00Z",
  "level": "ERROR",
  "service": "UserService",
  "message": "Failed to authenticate user john@example.com: invalid password",
  "action": "authenticate",
  "email": "john@example.com",
  "reason": "invalid password"
}
```

**Benefits:**

- Enables structured searching
- Consistent field names
- Better analytics
- Easier filtering

---

#### Functionality 5.3.2: Log Filtering

**What it does:** Removes unwanted logs based on configurable rules to reduce storage costs and noise.

**Filter types:**

**1. Level-based filtering:**

- Production: Keep only WARN, ERROR, FATAL
- Development: Keep all levels including DEBUG
- Specific services: Different rules per service

**2. Content-based filtering:**

- Drop health check pings
- Remove heartbeat messages
- Filter out expected errors
- Block spam/noise patterns

**3. Source-based filtering:**

- Keep all logs from critical services
- Drop verbose logs from less important services
- Different rules per environment

**4. Rate-based filtering:**

- If same log appears 1000 times/minute, keep only 10 samples
- Prevent log flooding from bugs
- Maintain representative sample

**5. Sensitive data filtering:**

- Remove passwords from logs
- Redact credit card numbers
- Mask personal information (GDPR compliance)
- Replace API keys with [REDACTED]

**Behavior:**

- Filters applied in order
- If any filter says "drop", log is discarded
- Dropped logs not stored (saves space)
- Can log statistics about dropped logs

**Example rules:**

```
Rule 1: Drop all DEBUG logs in production
Rule 2: Drop logs containing "healthcheck"
Rule 3: Drop logs from "test-service" in staging
Rule 4: Redact any credit card numbers (regex pattern)
Rule 5: If log contains "password", replace value with [REDACTED]
```

**Example filtering:**

```
Log 1: "2026-01-19 10:30:00 DEBUG Starting request processing"
→ Dropped (Rule 1: DEBUG in production)

Log 2: "2026-01-19 10:30:01 INFO GET /healthcheck 200 OK"
→ Dropped (Rule 2: healthcheck)

Log 3: "2026-01-19 10:30:02 ERROR Database connection failed"
→ Kept (ERROR level, important)

Log 4: "2026-01-19 10:30:03 INFO User login: password=secret123"
→ Modified to "User login: password=[REDACTED]"

Log 5: "2026-01-19 10:30:04 INFO Payment card=4532-1111-2222-3333"
→ Modified to "Payment card=****-****-****-3333"
```

**Benefits:**

- Reduces storage costs (70-90% in typical cases)
- Improves search performance
- Removes noise
- Compliance with privacy regulations
- Focuses on important information

---

#### Functionality 5.3.3: Log Enrichment

**What it does:** Adds additional context and metadata to logs to make them more useful.

**Enrichment types:**

**1. Server metadata:**

```
Original log:
{ "level": "ERROR", "message": "Database timeout" }

After enrichment:
{
  "level": "ERROR",
  "message": "Database timeout",
  "hostname": "web-server-01",
  "ip": "192.168.1.100",
  "datacenter": "us-east-1",
  "environment": "production",
  "app_version": "2.3.1"
}
```

**2. Geographic information:**

```
Original: { "client_ip": "203.0.113.45" }

After GeoIP lookup:
{
  "client_ip": "203.0.113.45",
  "geo_country": "United States",
  "geo_city": "New York",
  "geo_lat": 40.7128,
  "geo_lon": -74.0060
}
```

**3. Request correlation:**

```
Original: { "message": "Processing payment" }

After enrichment:
{
  "message": "Processing payment",
  "request_id": "req_abc123",
  "user_id": "user_xyz",
  "session_id": "sess_789"
}
```

Now you can find all logs for specific request/user/session.

**4. Derived fields:**

```
Original: { "response_time_ms": 1500 }

After enrichment:
{
  "response_time_ms": 1500,
  "response_time_category": "slow",  // > 1000ms
  "is_error": false,
  "business_hour": true
}
```

**5. External data lookup:**

```
Original: { "user_id": "12345" }

After database lookup:
{
  "user_id": "12345",
  "user_plan": "premium",
  "user_country": "US",
  "user_signup_date": "2025-06-15"
}
```

**Behavior:**

- Enrichment happens after parsing
- Can use external services (GeoIP databases, internal APIs)
- Failed enrichment doesn't block log processing
- Cached lookups for performance
- Configurable which enrichments to apply

**Benefits:**

- Richer context for troubleshooting
- Better analytics capabilities
- Easier correlation of events
- Improved filtering options

---

#### Functionality 5.3.4: Log Aggregation

**What it does:** Groups and summarizes logs to provide statistical insights and reduce data volume.

**Aggregation types:**

**1. Time-based aggregation:**

```
Raw logs (1000 error logs in 1 minute):
ERROR Database timeout
ERROR Database timeout
... (998 more)

Aggregated:
{
  "timestamp": "2026-01-19T10:30:00Z",
  "window": "1 minute",
  "error_type": "Database timeout",
  "count": 1000,
  "first_occurrence": "2026-01-19T10:30:01Z",
  "last_occurrence": "2026-01-19T10:30:59Z"
}
```

Instead of storing 1000 similar logs, store one aggregated entry.

**2. Count aggregations:**

```
Logs per level in last hour:
- DEBUG: 50,000
- INFO: 30,000
- WARN: 5,000
- ERROR: 1,000
- FATAL: 10
```

**3. Top-N aggregations:**

```
Top 10 errors in last hour:
1. Database timeout: 500 occurrences
2. API rate limit exceeded: 300 occurrences
3. Invalid authentication: 150 occurrences
...
```

**4. Statistical aggregations:**

```
Response time statistics (last minute):
- Count: 10,000 requests
- Average: 125ms
- Median: 100ms
- 95th percentile: 250ms
- 99th percentile: 500ms
- Max: 2000ms
```

**5. Group-by aggregations:**

```
Errors by service:
- UserService: 100 errors
- PaymentService: 50 errors
- NotificationService: 25 errors

Errors by endpoint:
- /api/users: 80 errors
- /api/payments: 60 errors
- /api/products: 35 errors
```

**Behavior:**

- Runs in parallel with main processing
- Uses sliding time windows
- Updates metrics every second
- Can query historical aggregations
- Configurable aggregation rules

**Benefits:**

- Quick overview of system health
- Identifies trends and patterns
- Reduces storage for repetitive logs
- Enables real-time dashboards
- Faster than searching raw logs

---

#### Functionality 5.3.5: Worker Pool Processing

**What it does:** Processes logs in parallel using multiple workers for maximum throughput.

**How it works:**

- Creates pool of worker processes (e.g., 20 workers)
- Each worker processes logs independently
- Work is distributed via queue
- Workers run concurrently

**Architecture:**

```
Input Queue → [Worker 1] → Output
            → [Worker 2] → Output
            → [Worker 3] → Output
            ...
            → [Worker 20] → Output
```

**Worker responsibilities:** Each worker performs:

1. Read log batch from queue
2. Parse each log
3. Apply filters
4. Enrich with metadata
5. Perform aggregations
6. Send to storage

**Behavior:**

**Normal load:**

- All workers active
- Processing keeps pace with ingestion
- Low latency (logs processed in <100ms)

**High load:**

- Workers at full capacity
- Queue builds up slightly
- Still processing efficiently
- Latency increases moderately

**Overload:**

- Queue fills up
- Backpressure applied to ingestion
- Automatic scaling can add more workers
- System remains stable

**Worker failure:**

- Failed log returned to queue
- Another worker picks it up
- Automatic retry
- Error logged for investigation

**Example timing:**

```
Single worker: 100 logs/second
20 workers: 2,000 logs/second (20x faster)

Processing 100,000 logs:
- Single worker: 1000 seconds (16.6 minutes)
- 20 workers: 50 seconds
```

**Benefits:**

- High throughput
- Fault tolerance
- Efficient resource utilization
- Scalable (add more workers as needed)
- Low latency

---

### 5.4 Storage Engine Functionality

#### Functionality 5.4.1: Time-Based Partitioning

**What it does:** Organizes logs into separate files/tables based on time periods for efficient querying and management.

**How it works:**

- Logs stored in directories/partitions by date
- Common partition schemes: daily, hourly, or by month
- Each partition is independent
- Old partitions can be archived or deleted easily

**Directory structure example:**

```
/logs/
  /2026/
    /01/
      /19/
        /app1/
          00-00.log.gz  (logs from midnight to 1 AM)
          01-00.log.gz  (logs from 1 AM to 2 AM)
          ...
          23-00.log.gz  (logs from 11 PM to midnight)
        /app2/
          00-00.log.gz
          ...
    /20/
      /app1/
        ...
```

**Behavior:**

**When storing logs:**

- Determine time partition from log timestamp
- Create partition if it doesn't exist
- Append log to appropriate partition file
- Compress older partitions

**When querying logs:**

```
Query: "Find errors from last 2 hours"
System:
- Current time: 2026-01-19 10:30
- Relevant partitions: 2026/01/19/08-00 and 2026/01/19/09-00
- Only reads those 2 files (ignores thousands of others)
- Fast result (seconds instead of minutes)
```

**When deleting old logs:**

```
Retention policy: Keep logs for 30 days
System:
- Finds partitions older than 30 days
- Deletes entire partition: rm -rf /logs/2025/12/20
- Fast deletion (no need to scan individual logs)
```

**Benefits:**

- Faster queries (only scan relevant partitions)
- Easy data retention management
- Efficient storage (compress old partitions)
- Parallel processing (query multiple partitions simultaneously)
- Cost-effective (move old partitions to cheaper storage)

---

#### Functionality 5.4.2: Data Compression

**What it does:** Reduces storage space by compressing log files while maintaining accessibility.

**Compression strategies:**

**1. Real-time compression:**

- Compress logs as they're written
- Uses fast algorithms (LZ4, Snappy)
- Slight CPU overhead but much less storage

**2. Background compression:**

- Write logs uncompressed initially (fast)
- Compress older files in background
- Uses better compression (gzip, zstd) for more savings

**3. Columnar compression:**

- Store different fields separately
- Timestamp column, level column, message column
- Each column compressed independently
- Better compression ratio (repeated values in each column)

**Compression ratios:**

```
Text logs (typical):
- Original: 100 MB
- gzip: 10 MB (10:1 ratio)
- zstd: 8 MB (12.5:1 ratio)

JSON logs:
- Original: 200 MB
- gzip: 20 MB (10:1 ratio)

Overall storage savings: 80-90%
```

**Behavior:**

**Writing:**

- New logs written to current active file
- When file reaches size limit (e.g., 100 MB), close and compress
- Create new active file
- Compressed files are read-only

**Reading:**

- Detect if file is compressed (by extension or magic bytes)
- Decompress on-the-fly while reading
- Transparent to query engine
- Slight latency but acceptable for historical data

**Example:**

```
Day 1:
- Write 10 GB of logs (uncompressed)

Day 2:
- Background compression runs
- 10 GB → 1 GB compressed
- Disk space freed: 9 GB

After 30 days:
- Total logs: 300 GB uncompressed
- Actual storage: 30 GB compressed
- Savings: 270 GB (90%)
```

**Benefits:**

- Massive storage savings (80-90%)
- Lower storage costs
- Longer retention possible
- Faster backups (less data to transfer)

---

#### Functionality 5.4.3: Indexing

**What it does:** Creates lookup structures to find logs quickly without scanning entire dataset.

**Index types:**

**1. Time index:**

```
Maps timestamps to file offsets:
2026-01-19 10:30:00 → file offset 0
2026-01-19 10:30:01 → file offset 1024
2026-01-19 10:30:02 → file offset 2048
...

Query "logs at 10:30:01":
- Lookup in index → offset 1024
- Seek directly to that position
- Read log (no scanning needed)
```

**2. Full-text inverted index:**

```
Maps words to log IDs:
"database" → [log123, log456, log789, ...]
"timeout"  → [log234, log567, log890, ...]
"error"    → [log123, log234, log345, ...]

Query "database timeout":
- Lookup "database" → [log123, log456, log789]
- Lookup "timeout" → [log234, log567, log890]
- Intersect results → [log234] (appears in both)
- Retrieve log234
```

**3. Field index:**

```
Maps field values to logs:
level="ERROR"   → [log100, log150, log200, ...]
source="web-api" → [log50, log100, log150, ...]

Query: Find ERROR logs from web-api
- Lookup level="ERROR" → [log100, log150, log200]
- Lookup source="web-api" → [log50, log100, log150]
- Intersect → [log100, log150]
```

**4. Aggregation index:**

```
Pre-computed statistics:
Errors per hour:
  2026-01-19 10:00 → 50 errors
  2026-01-19 11:00 → 75 errors
  2026-01-19 12:00 → 30 errors

Query "error count from 10 AM to 12 PM":
- Read from aggregation index (instant)
- No need to count individual logs
```

**Index maintenance:**

**Building index:**

- Created as logs are stored
- Updated in real-time for new logs
- Background rebuild for historical logs

**Index storage:**

- Separate from log data
- Can be rebuilt if corrupted
- Uses efficient data structures (B-trees, hash tables)

**Performance impact:**

```
Without index:
- Query "find ERROR in last hour"
- Scan 1 million logs
- Time: 30 seconds

With index:
- Lookup in ERROR index
- Find 500 matching logs
- Time: 200 milliseconds (150x faster)
```

**Benefits:**

- Extremely fast searches
- Enables complex queries
- Scales to billions of logs
- Low query latency

---

#### Functionality 5.4.4: Data Retention Management

**What it does:** Automatically removes old logs based on configured policies to manage storage costs.

**Retention policies:**

**1. Time-based retention:**

```
Policy: Keep logs for 30 days
Behavior:
- Day 1-30: Logs available in fast storage
- Day 31: Logs automatically deleted
```

**2. Size-based retention:**

```
Policy: Keep maximum 1 TB of logs
Behavior:
- When total size reaches 1 TB
- Delete oldest logs until under limit
```

**3. Tiered retention:**

```
Policy:
- Last 7 days: High-performance SSD storage
- Days 8-30: Standard HDD storage
- Days 31-90: Archive to S3 (cheaper, slower access)
- After 90 days: Delete

Implementation:
- Automatic data movement between tiers
- Transparent to users (system knows where to look)
```

**4. Selective retention:**

```
Policy:
- ERROR and FATAL logs: Keep 90 days
- WARN logs: Keep 30 days
- INFO logs: Keep 7 days
- DEBUG logs: Keep 1 day

Different retention for different log levels
```

**5. Compliance retention:**

```
Policy:
- Audit logs: Keep 7 years (regulatory requirement)
- Payment logs: Keep 5 years (financial regulations)
- User activity: Keep 1 year (privacy regulations)
```

**Cleanup process:**

**Daily cleanup job:**

```
1. Scan all partitions
2. Identify partitions older than retention period
3. For each expired partition:
   - Delete files
   - Update index
   - Log deletion event
4. Reclaim disk space
5. Report storage freed
```

**Safe deletion:**

- Verify no active queries on partition
- Create deletion log for audit
- Soft delete first (move to trash)
- Hard delete after grace period
- Verify deletion completed successfully

**Example:**

```
Today: 2026-01-19
Retention: 30 days
Cutoff date: 2025-12-20

Cleanup runs:
- Found partition: /logs/2025/12/19 (31 days old)
- Status: Expired
- Action: Delete
- Files deleted: 100 GB
- Index updated
- Storage freed: 100 GB
```

**Benefits:**

- Controls storage costs
- Automatic maintenance
- Compliance with regulations
- No manual intervention
- Prevents disk full scenarios

---

#### Functionality 5.4.5: Backup and Recovery

**What it does:** Protects against data loss by creating copies and enabling restoration.

**Backup strategies:**

**1. Continuous backup:**

- New logs automatically replicated to backup location
- Near real-time synchronization
- Minimal data loss in case of failure

**2. Scheduled snapshots:**

- Full system snapshot daily
- Incremental backups hourly
- Point-in-time recovery capability

**3. Geographic replication:**

- Copy data to different physical location
- Protection against datacenter failures
- Can serve queries from backup (read replicas)

**Backup destinations:**

```
1. Secondary disk:
   - Fast recovery
   - Same datacenter
   - Protects against disk failure

2. Cloud storage (S3, GCS):
   - Unlimited capacity
   - Geo-redundant
   - Cost-effective for archives

3. Tape backup:
   - Long-term archival
   - Cheapest per GB
   - Slow recovery
```

**Recovery scenarios:**

**Scenario 1: Corrupted log files**

```
Problem: Logs from 2026-01-19 10:00-11:00 corrupted
Solution:
1. Identify affected partition
2. Stop writes to that partition
3. Restore from backup
4. Verify data integrity
5. Resume normal operation
Time: 5 minutes
```

**Scenario 2: Accidental deletion**

```
Problem: Admin deleted wrong partition
Solution:
1. Identify deleted partition
2. Locate backup snapshot
3. Restore deleted data
4. Rebuild indexes
5. Verify completeness
Time: 15 minutes
```

**Scenario 3: Complete system failure**

```
Problem: Storage system crashed, all data lost
Solution:
1. Provision new storage
2. Restore latest full backup
3. Apply incremental backups
4. Rebuild indexes
5. Resume ingestion
Time: 2-4 hours (depending on data size)
```

**Backup verification:**

- Regular restore tests (monthly)
- Verify backup integrity
- Test recovery procedures
- Measure recovery time

**Example backup schedule:**

```
Hourly:
- Incremental backup (only new data)
- Size: ~10 GB
- Duration: 5 minutes

Daily:
- Full backup (complete snapshot)
- Size: ~500 GB
- Duration: 2 hours
- Retention: 7 daily backups

Weekly:
- Archive to cold storage
- Size: ~3 TB
- Retention: 4 weekly backups

Monthly:
- Long-term archive
- Retention: 12 monthly backups
```

**Benefits:**

- Protection against data loss
- Business continuity
- Compliance requirements
- Disaster recovery capability
- Peace of mind

---

### 5.5 Query Engine Functionality

#### Functionality 5.5.1: Full-Text Search

**What it does:** Allows searching for any text or phrase across all log messages.

**Search capabilities:**

**1. Simple text search:**

```
Query: "database"
Returns: All logs containing the word "database"

Example results:
- "Database connection established"
- "Failed to connect to database"
- "Database query took 5 seconds"
```

**2. Phrase search:**

```
Query: "connection timeout"
Returns: Logs containing exact phrase "connection timeout"

Must be in that exact order, not just both words present
```

**3. Boolean operators:**

```
Query: "database AND timeout"
Returns: Logs containing both words

Query: "error OR warning"
Returns: Logs containing either word

Query: "database NOT timeout"
Returns: Logs with "database" but not "timeout"
```

**4. Wildcard search:**

```
Query: "data*"
Returns: Logs with words starting with "data"
Examples: database, data, datastore, dataset

Query: "*base"
Returns: Logs with words ending with "base"
Examples: database, codebase
```

**5. Field-specific search:**

```
Query: level:ERROR
Returns: Only ERROR level logs

Query: source:web-api AND message:timeout
Returns: Timeouts from web-api service only
```

**How it works:**

- Uses inverted index (built during storage)
- Tokenizes search query
- Looks up matching log IDs in index
- Retrieves and ranks results
- Returns most relevant first

**Search performance:**

```
Dataset: 1 billion logs (1 TB)
Query: "database timeout"

Without index:
- Scan all logs: 10 minutes

With index:
- Index lookup: 50ms
- Retrieve matching logs: 150ms
- Total: 200ms
```

**Benefits:**

- Find any log quickly
- Flexible query syntax
- Scales to massive datasets
- Natural language searching

---

#### Functionality 5.5.2: Structured Field Queries

**What it does:** Enables precise filtering based on structured fields extracted during parsing.

**Query types:**

**1. Exact match:**

```
Query: level = "ERROR"
Returns: Logs where level is exactly ERROR (not WARN or INFO)

Query: source = "payment-service"
Returns: Logs from payment-service only
```

**2. Range queries:**

```
Query: response_time > 1000
Returns: Logs where response time exceeds 1000ms

Query: timestamp >= "2026-01-19 10:00" AND timestamp <= "2026-01-19 11:00"
Returns: Logs from that one-hour window
```

**3. List membership:**

```
Query: level IN ("ERROR", "FATAL")
Returns: Logs that are either ERROR or FATAL

Query: status_code IN (500, 502, 503, 504)
Returns: Logs with server error status codes
```

**4. Pattern matching:**

```
Query: message LIKE "%timeout%"
Returns: Logs where message contains "timeout"

Query: user_email LIKE "%@gmail.com"
Returns: Logs from Gmail users
```

**5. Null/existence checks:**

```
Query: error_message IS NOT NULL
Returns: Logs that have an error message field

Query: user_id EXISTS
Returns: Logs where user_id was logged
```

**6. Nested field queries:**

```
Query: request.headers.authorization EXISTS
Returns: Logs with authorization header

Query: response.body.error.code = 1001
Returns: Logs with specific error code in response
```

**Complex query example:**

```
Find slow database queries from payment service during business hours:

level = "WARN" AND 
source = "payment-service" AND 
query_type = "database" AND
duration_ms > 1000 AND
timestamp >= "2026-01-19 09:00" AND 
timestamp <= "2026-01-19 17:00"
```

**Query execution:**

1. Parse query into filter tree
2. Optimize using indexes
3. Scan only relevant partitions
4. Apply all filters
5. Return matching logs

**Benefits:**

- Precise filtering
- Fast execution with indexes
- Combine multiple conditions
- SQL-like familiarity

---

#### Functionality 5.5.3: Time Range Filtering

**What it does:** Efficiently retrieves logs from specific time periods.

**Time range options:**

**1. Relative time:**

```
"last 5 minutes" → 2026-01-19 10:25:00 to 10:30:00
"last 1 hour" → 2026-01-19 09:30:00 to 10:30:00
"last 24 hours" → 2026-01-18 10:30:00 to 2026-01-19 10:30:00
"last 7 days" → 2026-01-12 to 2026-01-19
```

**2. Absolute time:**

```
"2026-01-19" → Entire day
"2026-01-19 10:00" → Specific hour
"2026-01-19 10:30:00" → Specific minute
"2026-01-19 10:30:00 to 2026-01-19 11:30:00" → Specific range
```

**3. Business hours:**

```
"today during business hours" → 09:00-17:00
"weekdays only" → Exclude weekends
"this month" → 2026-01-01 to 2026-01-31
```

**Optimization using time partitions:**

**Query:** "Find errors from last 2 hours"

```
Current time: 2026-01-19 14:30
Time range: 2026-01-19 12:30 to 14:30

Step 1: Identify relevant partitions
- 2026/01/19/12-00.log (contains logs from 12:00-13:00)
- 2026/01/19/13-00.log (contains logs from 13:00-14:00)
- 2026/01/19/14-00.log (contains logs from 14:00-14:30)

Step 2: Skip all other partitions (thousands of files ignored)

Step 3: Within each partition, use time index to find exact logs

Result: Found 500 errors in 300ms
```

**Without time partitioning:** Would need to scan all logs ever recorded (days or weeks of data).

**Behavior:**

**Recent data (last hour):**

- Very fast (data likely in memory cache)
- Latency: 50-100ms

**Historical data (last month):**

- Read from disk
- May need decompression
- Latency: 1-2 seconds

**Very old data (archived):**

- May require restore from archive
- Latency: minutes to hours

**Benefits:**

- Essential for troubleshooting
- Leverages partitioning for speed
- Intuitive for users
- Handles both recent and historical queries

---

#### Functionality 5.5.4: Aggregation and Analytics

**What it does:** Performs statistical analysis and summarization of logs.

**Aggregation types:**

**1. Count aggregations:**

```
Query: Count logs by level

Results:
ERROR: 1,500
WARN: 5,000
INFO: 50,000
DEBUG: 100,000
Total: 156,500
```

**2. Time-series aggregations:**

```
Query: Error count per hour for last 24 hours

Results:
2026-01-18 11:00 - 50 errors
2026-01-18 12:00 - 75 errors
2026-01-18 13:00 - 60 errors
...
2026-01-19 10:00 - 80 errors

(Generates data for time-series chart)
```

**3. Group-by aggregations:**

```
Query: Count errors grouped by source

Results:
payment-service: 500 errors
user-service: 300 errors
notification-service: 200 errors
auth-service: 150 errors
```

**4. Statistical aggregations:**

```
Query: Response time statistics

Results:
Count: 10,000 requests
Average: 125ms
Median: 100ms
Min: 10ms
Max: 5000ms
Std deviation: 200ms
95th percentile: 300ms
99th percentile: 800ms
```

**5. Top-N queries:**

```
Query: Top 10 most common errors

Results:
1. "Database connection timeout" - 1000 occurrences
2. "API rate limit exceeded" - 500 occurrences
3. "Invalid authentication token" - 300 occurrences
4. "Network connection refused" - 200 occurrences
5. "File not found" - 150 occurrences
...
```

**6. Unique value counts:**

```
Query: How many unique users encountered errors?

Result: 1,234 unique users

Query: How many unique error types?

Result: 45 unique error messages
```

**7. Percentile calculations:**

```
Query: Response time percentiles

Results:
50th percentile (median): 100ms (half of requests faster)
90th percentile: 200ms (90% of requests faster)
95th percentile: 350ms
99th percentile: 800ms
99.9th percentile: 2000ms

Useful for SLA monitoring
```

**Complex analytics example:**

```
Query: For each service, calculate error rate trend

Service: payment-service
Hour 1: 2% error rate (20/1000 requests)
Hour 2: 3% error rate (30/1000 requests)
Hour 3: 5% error rate (50/1000 requests)
Trend: Increasing (potential problem!)

Service: user-service
Hour 1: 0.5% error rate (5/1000 requests)
Hour 2: 0.4% error rate (4/1000 requests)
Hour 3: 0.5% error rate (5/1000 requests)
Trend: Stable (healthy)
```

**Pre-computed vs. on-demand:**

**Pre-computed aggregations:**

- Calculated during log processing
- Stored in aggregation tables
- Instant results
- Used for dashboards

**On-demand aggregations:**

- Calculated when queried
- More flexible
- Slower but handles custom queries

**Benefits:**

- Understand system behavior
- Identify trends and patterns
- Monitor SLAs
- Capacity planning
- Business intelligence

---

#### Functionality 5.5.5: Real-Time Streaming

**What it does:** Provides live stream of logs as they arrive, similar to `tail -f` command.

**How it works:**

- Client connects via WebSocket
- Server pushes new logs immediately
- Filters applied on server-side
- Low latency (milliseconds)

**Use cases:**

**1. Live debugging:**

```
Developer deploys new version
Opens live stream filtered to their service
Watches logs in real-time
Catches errors immediately
```

**2. Monitoring dashboards:**

```
Operations dashboard shows:
- Live error count (updates every second)
- Recent critical errors (scrolling list)
- Real-time metrics
```

**3. Automated alerting:**

```
System monitors live stream
When ERROR rate > threshold:
  - Send alert to Slack
  - Page on-call engineer
  - Create incident ticket
```

**Streaming features:**

**1. Filtered streaming:**

```
Stream: level=ERROR AND source=payment-service
Receives: Only payment errors in real-time
Ignores: All other logs
```

**2. Multiple subscribers:**

```
100 users watching different streams:
- User 1: All errors
- User 2: payment-service logs
- User 3: Slow queries
Each gets their filtered view
```

**3. Backpressure handling:**

```
If logs arrive faster than client can consume:
- Buffer last 1000 logs
- Drop oldest if buffer full
- Client sees "X logs dropped" warning
```

**4. Pause/resume:**

```
User can pause stream
Logs buffer on server
Resume to catch up
Useful for reading specific entries
```

**Example WebSocket protocol:**

```
Client connects:
WS /stream?level=ERROR&source=payment-service

Server sends:
{ "type": "log", "data": { "timestamp": "...", "message": "..." } }
{ "type": "log", "data": { "timestamp": "...", "message": "..." } }
{ "type": "heartbeat", "timestamp": "..." }
{ "type": "log", "data": { "timestamp": "...", "message": "..." } }
```

**Performance:**

- Latency: <100ms from log generation to stream
- Capacity: 10,000 concurrent streams
- Efficiency: Uses server-sent events or WebSocket

**Benefits:**

- Immediate visibility
- Live troubleshooting
- Real-time monitoring
- Automated responses

---

### 5.6 API and Dashboard Functionality

#### Functionality 5.6.1: REST API

**What it does:** Provides programmatic access to all log querying and management functions.

**API endpoints:**

**1. Search endpoint:**

```
GET /api/v1/logs/search

Parameters:
- q: Search query (e.g., "database timeout")
- level: Filter by level
- source: Filter by source
- from: Start timestamp
- to: End timestamp
- limit: Maximum results (default 100)
- offset: Pagination offset

Example:
GET /api/v1/logs/search?q=error&level=ERROR&from=2026-01-19T10:00:00Z&limit=50

Response:
{
  "total": 1500,
  "results": [
    {
      "timestamp": "2026-01-19T10:30:00Z",
      "level": "ERROR",
      "message": "Database timeout",
      "source": "payment-service"
    },
    ...
  ],
  "took_ms": 250
}
```

**2. Aggregation endpoint:**

```
GET /api/v1/logs/aggregate

Parameters:
- metric: count, avg, sum, min, max
- group_by: Field to group by
- from/to: Time range

Example:
GET /api/v1/logs/aggregate?metric=count&group_by=level&from=2026-01-19T00:00:00Z

Response:
{
  "aggregations": [
    { "level": "ERROR", "count": 1500 },
    { "level": "WARN", "count": 5000 },
    { "level": "INFO", "count": 50000 }
  ]
}
```

**3. Export endpoint:**

```
GET /api/v1/logs/export

Downloads logs in various formats:
- JSON
- CSV
- Plain text

Example:
GET /api/v1/logs/export?format=csv&from=2026-01-19T10:00:00Z&to=2026-01-19T11:00:00Z

Returns: CSV file download
```

**4. System management endpoints:**

```
GET /api/v1/status - System health
GET /api/v1/metrics - Performance metrics
POST /api/v1/retention - Update retention policy
GET /api/v1/sources - List all log sources
```

**Authentication:**

- API key in header: `Authorization: Bearer YOUR_API_KEY`
- Rate limited per API key
- Different keys for different access levels

**Benefits:**

- Integration with other tools
- Automation scripts
- Custom dashboards
- Third-party integrations

---

#### Functionality 5.6.2: Web Dashboard

**What it does:** Provides visual interface for searching, viewing, and analyzing logs.

**Dashboard features:**

**1. Search interface:**

```
Components:
- Search box (auto-complete for fields)
- Time range picker (last hour, last day, custom range)
- Filter builder (visual query builder)
- Results table (paginated, sortable)

User flow:
1. Enter search term
2. Select time range
3. Add filters (level=ERROR, source=payment-service)
4. Click "Search"
5. View results in table
6. Click log to see full details
```

**2. Log viewer:**

```
Features:
- Syntax highlighting (JSON, stacktraces)
- Expandable/collapsible fields
- Copy to clipboard
- Share link to specific log
- Related logs (same request_id)

Display:
┌─────────────────────────────────────┐
│ 2026-01-19 10:30:00 ERROR           │
│ Source: payment-service             │
│ Message: Database timeout           │
│                                     │
│ Details:                            │
│   query: SELECT * FROM orders       │
│   duration: 30000ms                 │
│   user_id: 12345                    │
│   request_id: req_abc123            │
└─────────────────────────────────────┘
```

**3. Real-time monitoring:**

```
Live dashboard showing:
- Log volume graph (last hour, updating every second)
- Error rate gauge (current percentage)
- Recent errors (scrolling list)
- System health indicators
```

**4. Analytics dashboards:**

```
Pre-built dashboards:
- System overview (all services health)
- Error analysis (top errors, trends)
- Performance metrics (response times)
- User activity (requests per user)

Visualizations:
- Time-series line charts
- Bar charts (top N)
- Pie charts (distribution)
- Heatmaps (activity patterns)
```

**5. Saved queries:**

```
Users can save frequently used queries:
- "Production errors from payment service"
- "Slow database queries"
- "Failed authentication attempts"

One-click access to saved queries
Share saved queries with team
```

**6. Alerting configuration:**

```
Visual alert builder:
1. Select condition (ERROR rate > 100/minute)
2. Choose notification (Email, Slack, PagerDuty)
3. Set schedule (24/7 or business hours only)
4. Save alert rule

Dashboard shows active alerts
```

**Example dashboard layout:**

```
┌─────────────────────────────────────────────────────┐
│ [Search: "database timeout"]  [Last 1 hour ▼]       │
├─────────────────────────────────────────────────────┤
│ Filters: ☑ ERROR  ☑ payment-service                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Chart: Error count over time]                      │
│    |                                               │
│  100|     ▄▄▄                                       │
│   50|  ▄▄█  █▄▄                                     │
│    0|▄█        █▄▄▄▄                                │
│     └────────────────────────────────────           │
│     10:00  10:15  10:30  10:45  11:00              │
│                                                     │
│ Results (1,500 total)                               │
│ ┌───────────┬───────┬──────────────────┬─────────┐ │
│ │ Timestamp │ Level │ Message          │ Source  │ │
│ ├───────────┼───────┼──────────────────┼─────────┤ │
│ │ 10:30:00  │ ERROR │ Database timeout │ payment │ │
│ │ 10:29:55  │ ERROR │ Connection lost  │ payment │ │
│ │ 10:29:50  │ ERROR │ Query failed     │ payment │ │
│ └───────────┴───────┴──────────────────┴─────────┘ │
│                                                     │
│ [1][2][3]...[15] Next →                             │
└─────────────────────────────────────────────────────┘
```

**Benefits:**

- User-friendly interface
- No technical skills required
- Visual analytics
- Quick troubleshooting
- Team collaboration

---

## 6. System Behavior

### 6.1 Normal Operation Flow

**End-to-end log journey:**

```
1. Application generates log (0ms)
   "2026-01-19 10:30:00 ERROR Database timeout"

2. Shipper detects new line (10ms)
   - File watcher triggers
   - Read new line

3. Shipper processes (20ms)
   - Add to batch (95/100 logs)
   - Not full yet, wait for more

4. More logs arrive, batch fills (30ms)
   - Batch now 100/100 logs
   - Trigger send

5. Shipper compresses and sends (50ms)
   - gzip compression: 100KB → 10KB
   - HTTP POST to gateway

6. Network transmission (70ms)
   - Over internet/private network

7. Gateway receives (75ms)
   - Authenticate API key ✓
   - Check rate limit ✓
   - Validate format ✓
   - Decompress ✓
   - Add to processing queue

8. Gateway responds (80ms)
   - HTTP 202 Accepted
   - Shipper clears batch

9. Worker picks from queue (100ms)
   - Parse logs
   - Apply filters (keep ERRORs, drop DEBUGs)
   - Enrich with metadata

10. Storage (150ms)
    - Write to partition file
    - Update indexes
    - Compress old files

11. Query available (160ms)
    - Log now searchable
    - Appears in real-time streams

Total latency: 160ms from generation to queryable
```

### 6.2 High Load Behavior

**Scenario: Traffic spike (10x normal load)**

```
Normal: 10,000 logs/second
Spike: 100,000 logs/second

System response:

1. Shippers (0-5 seconds into spike):
   - Batches fill faster
   - Send more frequently
   - Local buffer starts filling

2. Ingestion Gateway (5-10 seconds):
   - Accepts all requests (under capacity)
   - Queue starts growing
   - Queue size: 1000 → 5000 batches

3. Processing Pipeline (10-30 seconds):
   - Workers at full capacity
   - Queue continues growing
   - Queue size: 5000 → 8000 batches
   - Alert: "Queue size high"

4. Auto-scaling triggers (30 seconds):
   - Start additional worker instances
   - Scale from 20 → 40 workers
   - Processing capacity doubles

5. System recovers (30-60 seconds):
   - Workers drain queue
   - Queue size: 8000 → 4000 → 1000 → 100
   - Latency normalizes

6. Spike ends (60 seconds):
   - Traffic returns to normal
   - Scale down workers (40 → 20)
   - System stable

Maximum lag during spike: 30 seconds
Data loss: Zero (all logs buffered)
```

### 6.3 Failure Scenarios

#### Scenario A: Network Partition (Shipper can't reach Gateway)

```
Problem: Network between shipper and gateway fails

Shipper behavior:
1. Attempt to send → Connection timeout
2. Retry with backoff → Still fails
3. Save to local buffer (/tmp/buffer/logs_1737280200.log)
4. Continue collecting new logs → Add to buffer
5. Retry every 30 seconds
6. Network recovers after 10 minutes
7. Send all buffered logs (10 minutes worth)
8. Delete buffer files
9. Resume normal operation

Result: No data loss, 10-minute delay in log availability
```

#### Scenario B: Processing Pipeline Overload

```
Problem: Workers can't keep up with ingestion rate

System behavior:
1. Queue fills up (0 → 10,000 batches in 5 minutes)
2. Alert triggered: "Processing backlog"
3. Gateway applies backpressure:
   - Returns 503 to some shippers
   - Shippers buffer locally
4. Auto-scaling increases workers
5. Queue drains over 15 minutes
6. System recovers

Result: Temporary buffering on shippers, no data loss
```

#### Scenario C: Storage Disk Full

```
Problem: Storage disk reaches capacity

System behavior:
1. Storage attempts write → Disk full error
2. Alert: "Storage capacity critical"
3. Emergency retention cleanup runs:
   - Delete oldest 10% of logs
   - Free 100 GB
4. Resume writes
5. Admin provisions additional storage
6. System continues

Result: Loss of oldest logs, recent logs preserved
```

#### Scenario D: Complete Gateway Failure

```
Problem: Ingestion gateway server crashes

System behavior:
1. Shippers detect connection failure
2. All shippers buffer logs locally
3. Load balancer redirects to standby gateway
4. Shippers reconnect to standby gateway
5. Send buffered logs
6. Resume normal operation

Downtime: 30-60 seconds
Data loss: Zero (all buffered)
```

### 6.4 Query Performance Behavior

**Query 1: Recent data**

```
Query: "Find errors in last 5 minutes"
Behavior:
- Data likely in memory cache
- No disk reads needed
- Latency: 50-100ms
```

**Query 2: Historical data**

```
Query: "Find errors from 3 days ago"
Behavior:
- Read from compressed partitions
- Decompress on-the-fly
- Use time index to skip irrelevant data
- Latency: 1-2 seconds
```

**Query 3: Large result set**

```
Query: "All logs from last 24 hours" (10 million logs)
Behavior:
- Paginated results (100 at a time)
- First page: 200ms
- Scroll through pages
- Export available for full dataset
```

**Query 4: Complex aggregation**

```
Query: "Error count per hour for last 30 days, grouped by service"
Behavior:
- Use pre-computed aggregation tables
- Minimal computation needed
- Latency: 500ms
- Returns 720 data points (30 days × 24 hours)
```

---

## 7. Data Flow Diagrams

### 7.1 Write Path (Log Ingestion)

```
Application
    ↓ (writes log to file)
Log File
    ↓ (monitors)
Shipper Agent
    ↓ (batch, compress, authenticate)
Network
    ↓ (HTTP/gRPC)
Ingestion Gateway
    ↓ (validate, decompress, queue)
Processing Queue (Redis/RabbitMQ)
    ↓ (worker picks batch)
Processing Worker
    ↓ (parse, filter, enrich)
Storage Engine
    ↓ (write to partition, update index)
Disk/Database
```

### 7.2 Read Path (Log Query)

```
User/API Client
    ↓ (search query)
Query Engine
    ↓ (parse query, optimize)
Index
    ↓ (find matching log IDs)
Storage Engine
    ↓ (identify partitions)
Disk/Database
    ↓ (read relevant partitions)
Query Engine
    ↓ (filter, sort, format)
API/Dashboard
    ↓ (display results)
User
```

---

## 8. Technical Requirements

### 8.1 Infrastructure Requirements

**For 100 servers, 10,000 logs/second:**

**Shipper nodes (100 servers):**

- CPU: Minimal (<5% of 1 core)
- Memory: 50 MB per shipper
- Disk: 1 GB buffer space
- Network: 1 Mbps per shipper

**Ingestion Gateway (2 servers for high availability):**

- CPU: 4-8 cores
- Memory: 8-16 GB
- Network: 1 Gbps
- Can handle 50,000 requests/second

**Processing Pipeline (5-10 worker servers):**

- CPU: 8 cores each
- Memory: 16 GB each
- Disk: SSD for temporary processing

**Storage:**

- Disk: 10 TB (for 30 days retention)
- IOPS: 5,000+ for writes
- Throughput: 500 MB/s sustained

**Query Servers (2-3 servers):**

- CPU: 8 cores
- Memory: 32 GB (for indexes and caching)
- SSD storage for indexes

### 8.2 Scalability

**Horizontal scaling:**

```
Start:
- 1 gateway → 10,000 logs/sec
- 5 workers → 10,000 logs/sec
- 1 storage node → 10,000 logs/sec

Scale to 100,000 logs/sec:
- 10 gateways → 100,000 logs/sec
- 50 workers → 100,000 logs/sec
- 10 storage nodes (sharded) → 100,000 logs/sec
```

Each component scales independently.

---

## 9. Benefits & Use Cases

### 9.1 Key Benefits

**1. Centralization:**

- Single source of truth for all logs
- No need to access individual servers
- Unified view across entire infrastructure

**2. Real-time visibility:**

- See issues as they happen
- Immediate alerting
- Live troubleshooting

**3. Powerful search:**

- Find any log in seconds
- Complex queries across billions of logs
- Full-text and structured search

**4. Data retention:**

- Logs preserved even after server death
- Historical analysis
- Compliance requirements

**5. Performance:**

- Low latency ingestion
- Fast queries
- Scales to massive volumes

**6. Cost efficiency:**

- Compression reduces storage by 90%
- Tiered storage (hot/warm/cold)
- Automatic retention management

### 9.2 Use Cases

**1. Troubleshooting production issues:**

```
Scenario: Website slow for certain users
Actions:
- Search logs for those specific users
- Find slow database queries
- Identify bottleneck
- Deploy fix
Time: Minutes instead of hours
```

**2. Security monitoring:**

```
Scenario: Detect unauthorized access attempts
Actions:
- Monitor for failed login patterns
- Alert on suspicious activity
- Investigate breach attempts
- Audit access logs
```

**3. Performance optimization:**

```
Scenario: Improve API response times
Actions:
- Analyze response time distribution
- Identify slowest endpoints
- Find common slow queries
- Optimize problematic code
```

**4. Business analytics:**

```
Scenario: Understand user behavior
Actions:
- Track feature usage from logs
- Measure conversion rates
- Identify drop-off points
- Make data-driven decisions
```

**5. Compliance and auditing:**

```
Scenario: Regulatory audit
Actions:
- Provide complete audit trail
- Demonstrate data retention
- Show access controls
- Prove security measures
```

---

## 10. Summary

This Real-Time Log Aggregator & Analyzer project provides a comprehensive solution for modern log management. It addresses the critical challenges of distributed systems by centralizing log collection, enabling powerful search and analytics, ensuring data durability, and providing real-time visibility.

The system is designed with scalability, reliability, and performance as core principles, making it suitable for everything from small startups to large enterprises with thousands of servers generating billions of logs daily.