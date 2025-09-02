# Complete Guide to Distribution System Monitoring
*A Developer's Handbook for Building Reliable Distributed Systems*

## Table of Contents
1. [Introduction: The Critical Need for Monitoring](#introduction)
2. [Understanding Distribution Systems](#understanding)
3. [The Four Pillars of Observability](#pillars)
4. [Infrastructure Monitoring](#infrastructure)
5. [Application Performance Monitoring (APM)](#apm)
6. [Distributed Tracing](#tracing)
7. [Log Management and Analysis](#logging)
8. [Business Metrics Monitoring](#business)
9. [Security Monitoring](#security)
10. [Synthetic Monitoring](#synthetic)
11. [Real User Monitoring (RUM)](#rum)
12. [Database and Storage Monitoring](#database)
13. [Network Monitoring](#network)
14. [Container and Orchestration Monitoring](#containers)
15. [Alerting and Incident Response](#alerting)
16. [Monitoring Strategy and Best Practices](#strategy)

---

## Introduction: The Critical Need for Monitoring {#introduction}

In the modern software landscape, distribution systems have become the backbone of virtually every application we use. From Netflix streaming movies to your banking app processing transactions, these systems span multiple servers, data centers, and geographic regions. But with this distribution comes complexity—and complexity breeds failure.

Consider this scenario: Your e-commerce platform suddenly experiences a 50% increase in checkout failures. Users are abandoning their carts, revenue is plummeting, and you have no idea where to start looking. Is it the payment service? The inventory system? Network latency between microservices? Without proper monitoring, you're flying blind in a storm.

This is why monitoring isn't just important—it's existential. A well-monitored system gives you eyes and ears into every corner of your distributed architecture, allowing you to detect, diagnose, and resolve issues before they impact your users. More importantly, it enables you to understand your system's behavior patterns, optimize performance, and make data-driven decisions about scaling and architecture changes.

### Why Traditional Monitoring Falls Short

Traditional monitoring approaches were designed for monolithic applications running on single servers. They focused on basic metrics like CPU usage, memory consumption, and disk space. While these metrics remain important, distributed systems introduce new challenges:

**Cascade Failures**: A small issue in one service can trigger failures across multiple dependent services, creating a domino effect that's difficult to trace without proper monitoring.

**Emergent Behaviors**: The interaction between multiple services can create unexpected behaviors that only manifest at scale or under specific conditions.

**Temporal Dependencies**: In distributed systems, the timing of events across services becomes critical. A request might fail not because of resource constraints, but because of subtle timing issues between services.

**Partial Failures**: Unlike monolithic systems that typically fail completely, distributed systems often experience partial failures where some functionality works while other parts don't.

### The Modern Monitoring Imperative

Today's monitoring must be:
- **Comprehensive**: Covering every layer of your stack
- **Real-time**: Providing immediate insight into system state
- **Contextual**: Connecting metrics across services and time
- **Actionable**: Enabling quick problem resolution
- **Proactive**: Predicting issues before they occur

---

## Understanding Distribution Systems {#understanding}

Before diving into monitoring techniques, let's establish a clear understanding of what we're monitoring. A distributed system is a collection of independent computers that appears to users as a single coherent system. These systems share several key characteristics that directly impact how we monitor them.

### Key Characteristics of Distributed Systems

**Geographic Distribution**: Components may be spread across different data centers, regions, or continents. This introduces network latency and potential connectivity issues that must be monitored.

**Autonomy**: Each component operates independently with its own failure modes, performance characteristics, and scaling patterns.

**Concurrency**: Multiple operations occur simultaneously across different components, creating complex interaction patterns.

**Fault Tolerance**: Systems are designed to continue operating despite component failures, but this resilience must be continuously verified through monitoring.

**Scalability**: Components can be added or removed dynamically, requiring monitoring systems that can adapt to changing topologies.

### Common Distributed System Architectures

**Microservices Architecture**: Small, independent services communicating over networks. Each service requires individual monitoring while also tracking inter-service communication patterns.

**Service-Oriented Architecture (SOA)**: Larger, more coarse-grained services with well-defined interfaces. Monitoring focuses on service-level agreements and interface performance.

**Event-Driven Architecture**: Systems where components communicate through events rather than direct calls. Monitoring must track event flows and processing delays.

**Serverless Architecture**: Functions that execute on-demand without persistent infrastructure. Monitoring challenges include cold starts, execution duration, and resource limits.

### The Complexity Challenge

Each architectural pattern introduces unique monitoring requirements. A microservices system might have hundreds of services with thousands of dependencies, while a serverless system might have ephemeral components that exist only during execution. Understanding your specific architecture is crucial for designing an effective monitoring strategy.

---

## The Four Pillars of Observability {#pillars}

Modern monitoring is built on the foundation of observability—the ability to understand the internal state of a system based on its external outputs. This concept is borrowed from control theory and has been adapted for software systems. Observability rests on four fundamental pillars:

### 1. Metrics: The Quantified View

Metrics are numerical measurements taken over time intervals. They provide a quantified view of system behavior and are typically stored as time series data.

**Types of Metrics:**

*Counter Metrics*: Values that only increase over time, such as total requests processed or total errors encountered. These are useful for calculating rates and identifying trends.

```
http_requests_total{method="GET", status="200"} 1,245,892
http_requests_total{method="POST", status="500"} 1,234
```

*Gauge Metrics*: Values that can go up or down, representing current states like memory usage, active connections, or queue depth.

```
memory_usage_bytes 2,147,483,648
active_connections 150
queue_depth 23
```

*Histogram Metrics*: Distribution of values over time, commonly used for latency, response time, and size measurements.

```
http_request_duration_seconds_bucket{le="0.1"} 125
http_request_duration_seconds_bucket{le="0.5"} 890
http_request_duration_seconds_bucket{le="1.0"} 1200
```

*Summary Metrics*: Similar to histograms but calculate quantiles on the client side, useful for tracking percentiles over time.

**Key Performance Indicators (KPIs):**
- **Throughput**: Requests per second, transactions per minute
- **Latency**: Response time, processing duration
- **Error Rate**: Percentage of failed requests
- **Saturation**: Resource utilization levels

### 2. Logs: The Narrative Thread

Logs provide detailed, timestamped records of discrete events within your system. They tell the story of what happened, when, and in what context.

**Structured vs. Unstructured Logging:**

*Unstructured Logs* (Traditional):
```
2024-01-15 14:30:25 ERROR: Failed to process payment for user 12345, amount $99.99, reason: insufficient funds
```

*Structured Logs* (Modern):
```json
{
  "timestamp": "2024-01-15T14:30:25Z",
  "level": "ERROR",
  "event": "payment_processing_failed",
  "user_id": "12345",
  "amount": 99.99,
  "currency": "USD",
  "reason": "insufficient_funds",
  "payment_method": "credit_card",
  "trace_id": "abc123def456"
}
```

**Log Levels and Their Purpose:**
- **FATAL/CRITICAL**: System is unusable
- **ERROR**: Error conditions that don't halt execution
- **WARN**: Warning messages about potential issues
- **INFO**: Informational messages about normal operation
- **DEBUG**: Detailed information for debugging
- **TRACE**: Very detailed execution traces

### 3. Traces: The Journey Map

Distributed tracing tracks requests as they flow through multiple services in your distributed system. Each trace represents a single user request or transaction and shows the complete journey through your system.

**Trace Components:**

*Spans*: Individual operations within a trace, representing work done by a single service.

*Trace Context*: Information propagated between services to maintain trace continuity.

*Baggage*: Additional context data carried along with the trace.

**Example Trace Structure:**
```
Trace: user_checkout_flow (duration: 1.2s)
├── Span: api_gateway (duration: 1.2s)
│   ├── Span: auth_service (duration: 50ms)
│   ├── Span: inventory_service (duration: 200ms)
│   ├── Span: payment_service (duration: 800ms)
│   │   ├── Span: fraud_check (duration: 300ms)
│   │   └── Span: charge_processor (duration: 450ms)
│   └── Span: notification_service (duration: 100ms)
```

### 4. Events: The State Changes

Events represent discrete occurrences in your system—deployments, configuration changes, alerts, or business events. They provide context for understanding why metrics might change or why certain trace patterns emerge.

**Event Categories:**
- **System Events**: Deployments, restarts, configuration changes
- **Business Events**: User registrations, purchases, cancellations
- **Operational Events**: Alerts, incidents, maintenance windows
- **Security Events**: Login attempts, access violations, policy changes

---

## Infrastructure Monitoring {#infrastructure}

Infrastructure monitoring forms the foundation of any comprehensive monitoring strategy. It focuses on the physical and virtual resources that host your distributed system components.

### Server and Host Monitoring

**Essential Host Metrics:**

*CPU Metrics*:
- **CPU Utilization**: Percentage of time CPU is busy
- **Load Average**: System load over different time periods (1min, 5min, 15min)
- **CPU Steal Time**: Time when virtual CPU waits for physical CPU (important in cloud environments)
- **Context Switches**: Frequency of task switching (high values may indicate thrashing)

*Memory Metrics*:
- **Memory Utilization**: Percentage of available memory in use
- **Available Memory**: Free memory available for new processes
- **Swap Usage**: Virtual memory usage (high values indicate memory pressure)
- **Memory Pressure**: Rate of memory allocation requests vs. availability

*Storage Metrics*:
- **Disk Usage**: Percentage of storage capacity used
- **Disk I/O**: Read/write operations per second
- **Disk Latency**: Time taken for disk operations
- **Inode Usage**: File system metadata usage (can limit file creation)

*Network Metrics*:
- **Network Throughput**: Data transfer rates in/out
- **Packet Loss**: Percentage of lost network packets
- **Network Latency**: Round-trip time for network requests
- **Connection Count**: Active network connections

**Advanced Infrastructure Monitoring:**

*NUMA (Non-Uniform Memory Access) Monitoring*:
In multi-processor systems, monitor memory access patterns across NUMA nodes to optimize performance.

*Power and Thermal Monitoring*:
Track power consumption and thermal throttling, especially important for edge computing and high-density deployments.

*Hardware Health Monitoring*:
Monitor RAID status, fan speeds, power supply health, and other hardware components through IPMI or vendor-specific tools.

### Cloud Infrastructure Monitoring

Cloud environments introduce additional monitoring considerations due to their dynamic nature and shared resource model.

**AWS-Specific Monitoring:**
- **EC2 Instance Metrics**: CPU credits (for burstable instances), network performance, EBS optimization
- **Auto Scaling Groups**: Scaling activities, desired vs. actual capacity
- **Load Balancer Metrics**: Request count, latency, healthy/unhealthy targets
- **RDS Metrics**: Database connections, read/write IOPS, storage space

**Azure-Specific Monitoring:**
- **Virtual Machine Metrics**: Performance counters, boot diagnostics
- **App Service Metrics**: Response time, throughput, memory usage
- **Service Bus Metrics**: Queue length, message processing rate

**GCP-Specific Monitoring:**
- **Compute Engine Metrics**: Instance uptime, preemptible instance notifications
- **Kubernetes Engine Metrics**: Node status, pod resource usage
- **Cloud Functions Metrics**: Execution count, duration, memory usage

### Virtualization and Hypervisor Monitoring

**VMware vSphere Monitoring:**
- **Host Performance**: CPU ready time, memory ballooning, storage latency
- **VM Performance**: Resource contention, snapshot usage
- **Cluster Health**: HA failover capacity, DRS balance

**Hyper-V Monitoring:**
- **Host Resources**: Hyper-V processor utilization, logical processor usage
- **Virtual Machine Health**: Integration services status, checkpoint usage
- **Network Performance**: Virtual switch throughput, VLAN configuration

**KVM/QEMU Monitoring:**
- **Host Performance**: QEMU process metrics, virtio performance
- **Guest Performance**: Balloon driver status, paravirtualized driver performance

### Infrastructure Monitoring Tools and Techniques

**Agent-Based Monitoring:**
Deploy monitoring agents on each host to collect detailed metrics. Popular agents include:
- **Telegraf**: Flexible, plugin-driven agent
- **Collectd**: High-performance daemon for collecting system statistics
- **Node Exporter**: Prometheus agent for hardware and OS metrics
- **SNMP**: Network management protocol for infrastructure devices

**Agentless Monitoring:**
Monitor infrastructure without installing agents, using:
- **WMI/PowerShell**: Windows management interfaces
- **SSH**: Remote command execution for Linux systems
- **IPMI**: Intelligent Platform Management Interface for hardware
- **Cloud APIs**: Native monitoring APIs provided by cloud vendors

**Hybrid Approaches:**
Combine agent-based and agentless monitoring for comprehensive coverage while minimizing overhead.

---

## Application Performance Monitoring (APM) {#apm}

Application Performance Monitoring focuses on the performance and behavior of your application code as it runs in production. Unlike infrastructure monitoring, which looks at the underlying systems, APM provides insights into how your application is performing from a user experience perspective.

### Core APM Concepts

**Application Topology Discovery:**
Modern APM tools automatically discover the structure of your application, mapping dependencies between services, databases, and external systems. This creates a dynamic topology map that shows how requests flow through your system.

**Code-Level Visibility:**
APM tools instrument your application code to provide method-level performance data. They can show you which functions are slow, which database queries are expensive, and where your application spends most of its time.

**Transaction Tracing:**
APM traces complete user transactions from start to finish, showing the execution path through different application tiers. This includes web servers, application servers, databases, and external service calls.

### Key APM Metrics

**Response Time Metrics:**
- **Average Response Time**: Mean time to process requests
- **95th Percentile Response Time**: Response time for 95% of requests (excludes outliers)
- **99th Percentile Response Time**: Response time for 99% of requests (includes most outliers)
- **Apdex Score**: Application Performance Index measuring user satisfaction

**Throughput Metrics:**
- **Requests Per Minute (RPM)**: Volume of requests processed
- **Transactions Per Second (TPS)**: Business transaction processing rate
- **Concurrent Users**: Number of simultaneous active users

**Error Metrics:**
- **Error Rate**: Percentage of requests resulting in errors
- **Error Count**: Absolute number of errors over time
- **Exception Details**: Specific error types and stack traces

**Resource Utilization:**
- **CPU Usage per Transaction**: Computational cost of processing requests
- **Memory Allocation**: Memory consumed by application processes
- **Garbage Collection Impact**: Time spent in GC and its effect on performance

### Deep Dive: Transaction Tracing

Transaction tracing is one of the most powerful features of APM. It provides a detailed view of what happens during a single user request or business transaction.

**Trace Anatomy:**
```
Transaction: /api/orders/create (2.3s total)
├── Controller Processing (50ms)
├── Authentication Service Call (200ms)
├── Database Operations (1.8s)
│   ├── User Lookup Query (300ms)
│   ├── Inventory Check Query (800ms)
│   └── Order Creation Transaction (700ms)
├── Payment Processing (150ms)
└── Email Notification (100ms)
```

**Waterfall Charts:**
Visual representations showing the timeline of different operations within a transaction. These help identify bottlenecks and understand the critical path through your application.

**Cross-Tier Correlation:**
Modern APM tools correlate performance data across different tiers of your application (web, app, database) to provide a unified view of performance issues.

### Application-Level Metrics

**Business Transaction Monitoring:**
Focus on key business processes rather than just technical metrics:
- **User Registration Flow**: Time and success rate for new user signups
- **Checkout Process**: Cart-to-completion conversion and performance
- **Search Functionality**: Query performance and result relevance

**Custom Metrics:**
Applications should expose domain-specific metrics that matter to your business:
```javascript
// Java example using Micrometer
const promClient = require('prom-client');

class OrderService {
    constructor() {
        // Counter for tracking number of orders created
        this.orderCounter = new promClient.Counter({
            name: 'orders_created_total',
            help: 'Number of orders created'
        });
        
        // Histogram for tracking order processing time
        this.orderProcessingTimer = new promClient.Histogram({
            name: 'orders_processing_duration_seconds',
            help: 'Time taken to process orders',
            buckets: [0.1, 0.5, 1, 2, 5, 10] // Define buckets in seconds
        });
    }
    
    async createOrder(request) {
        // Start timing
        const endTimer = this.orderProcessingTimer.startTimer();
        
        try {
            // Process the order
            const order = await this.processOrder(request);
            
            // Increment counter after successful processing
            this.orderCounter.inc();
            
            return order;
        } finally {
            // End timing (automatically records duration)
            endTimer();
        }
    }
    
    // Placeholder for order processing logic
    async processOrder(request) {
        // Your order processing logic here
        return {
            id: Math.random().toString(36).substr(2, 9),
            ...request,
            createdAt: new Date().toISOString(),
            status: 'created'
        };
    }
}

module.exports = OrderService;
```

**Service Level Indicators (SLIs):**
Quantitative measures of service performance that directly relate to user experience:
- **Availability**: Percentage of time service is operational
- **Latency**: Time to process requests
- **Throughput**: Rate of successful request processing
- **Quality**: Accuracy or correctness of responses

### APM Implementation Strategies

**Auto-Instrumentation vs. Manual Instrumentation:**

*Auto-Instrumentation*:
- Automatically captures common metrics without code changes
- Uses bytecode manipulation or runtime hooks
- Great for getting started quickly
- May miss application-specific logic

*Manual Instrumentation*:
- Requires code changes to add monitoring
- Provides precise control over what's measured
- Better for business-specific metrics
- More maintenance overhead

**Sampling Strategies:**
APM tools often sample transactions to reduce overhead:
- **Fixed Rate Sampling**: Sample a fixed percentage of transactions
- **Adaptive Sampling**: Adjust sampling based on system load
- **Priority Sampling**: Always sample important transactions (errors, slow requests)

**Performance Impact:**
Good APM tools should have minimal impact on application performance (typically <5% overhead). Monitor the monitoring system itself to ensure it's not becoming a bottleneck.

### Popular APM Tools

**Commercial Solutions:**
- **New Relic**: Comprehensive APM with AI-powered insights
- **Dynatrace**: AI-powered full-stack monitoring
- **AppDynamics**: Business performance monitoring focused on user experience
- **Datadog APM**: Integrated monitoring platform with APM capabilities

**Open Source Solutions:**
- **Elastic APM**: Part of the Elastic Stack, integrates with logs and metrics
- **Jaeger**: Distributed tracing system originally developed by Uber
- **Zipkin**: Distributed tracing system that helps gather timing data
- **SkyWalking**: Application performance monitor tool for distributed systems

---

## Distributed Tracing {#tracing}

Distributed tracing is perhaps the most critical monitoring technique for modern distributed systems. It provides end-to-end visibility into requests as they traverse multiple services, giving you the ability to understand the complete journey of a user request or business transaction.

### Understanding Distributed Tracing

**The Challenge:**
In a monolithic application, you can easily trace a request through your application using a debugger or log statements. In a distributed system, a single user request might touch dozens of services across multiple hosts. Traditional logging becomes insufficient because logs from different services aren't correlated, making it nearly impossible to reconstruct the full picture of what happened.

**The Solution:**
Distributed tracing creates a unique identifier for each request (a trace ID) and propagates this identifier through all service calls related to that request. Each service adds span information to the trace, creating a hierarchical view of the request's journey.

### Core Tracing Concepts

**Trace:**
A trace represents a single user request or business transaction. It consists of multiple spans that together show the complete execution path through your distributed system.

**Span:**
A span represents a single operation within a trace. Each span has:
- **Operation Name**: Descriptive name for the operation
- **Start Time**: When the operation began
- **Duration**: How long the operation took
- **Parent Span ID**: Links to the calling span (except for root spans)
- **Tags**: Key-value pairs for additional metadata
- **Logs**: Timestamped events within the span

**Trace Context:**
Information that's propagated between services to maintain trace continuity:
- **Trace ID**: Unique identifier for the entire trace
- **Span ID**: Unique identifier for the current span
- **Baggage**: Additional context data (use sparingly due to overhead)

### Trace Propagation

**In-Process Propagation:**
Within a single service, context is typically propagated through thread-local storage or explicit parameter passing.

**Cross-Service Propagation:**
Between services, trace context is propagated through:
- **HTTP Headers**: Most common for REST APIs
- **Message Headers**: For asynchronous messaging systems
- **gRPC Metadata**: For gRPC-based communications

**Example HTTP Propagation:**
```http
GET /api/orders/12345 HTTP/1.1
Host: order-service.internal
X-Trace-Id: 4bf92f3577b34da6a3ce929d0e0e4736
X-Span-Id: 00f067aa0ba902b7
X-Parent-Span-Id: 7f2a2d7c8e3b4a1f
```

### Implementing Distributed Tracing

**OpenTracing Standard:**
OpenTracing provides a vendor-neutral API for distributed tracing. It defines common operations and semantics for creating and manipulating traces and spans.

```javascript
const { trace } = require('@opentelemetry/api');

class OrderService {
    constructor() {
        // Get a tracer instance
        this.tracer = trace.getTracer('order-service', '1.0.0');
    }
    
    async processOrder(request) {
        // Create the main span (similar to tracer.buildSpan().start())
        const span = this.tracer.startSpan('process_order', {
            attributes: {
                'order.id': request.id,
                'customer.id': request.customerId
            }
        });
        
        try {
            // Make this span active (similar to scopeManager().activate())
            return await trace.getActiveSpan().context().with(span, async () => {
                // Validate order with child span
                const validationSpan = this.tracer.startSpan('validate_order', {
                    parent: span
                });
                
                try {
                    await this.validateOrder(request);
                } catch (error) {
                    // Mark validation span as error
                    validationSpan.setAttributes({ error: true });
                    validationSpan.addEvent('error');
                    validationSpan.recordException(error);
                    validationSpan.setStatus({
                        code: trace.SpanStatusCode.ERROR,
                        message: error.message
                    });
                    throw error;
                } finally {
                    validationSpan.end();
                }
                
                // Process payment
                return await this.processPayment(request);
            });
        } finally {
            span.end();
        }
    }
    
    async validateOrder(request) {
        // Validation logic here
        if (!request.id) {
            throw new ValidationException('Order ID is required');
        }
        if (!request.customerId) {
            throw new ValidationException('Customer ID is required');
        }
        // Add more validation as needed
    }
    
    async processPayment(request) {
        // Payment processing logic here
        return {
            id: request.id,
            customerId: request.customerId,
            status: 'processed',
            processedAt: new Date().toISOString()
        };
    }
}

// Custom exception class
class ValidationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationException';
    }
}

module.exports = { OrderService, ValidationException };
```

**OpenTelemetry:**
OpenTelemetry is the successor to OpenTracing, providing a more comprehensive observability framework that includes metrics, logs, and traces.

```javascript
// Javascript OpenTelemetry example
const { trace, SpanStatusCode, context } = require('@opentelemetry/api');

async function processOrder(orderId) {
    const tracer = trace.getTracer(__filename);
    
    // Create main span
    const span = tracer.startSpan('process_order');
    span.setAttributes({
        'order.id': orderId
    });
    
    try {
        // Execute within the span context (similar to Python's 'with' statement)
        return await context.with(trace.setSpan(context.active(), span), async () => {
            
            // Validate order
            const validationSpan = tracer.startSpan('validate_order');
            try {
                await context.with(trace.setSpan(context.active(), validationSpan), async () => {
                    await validateOrder(orderId);
                    validationSpan.addEvent('Order validated successfully');
                });
            } finally {
                validationSpan.end();
            }
            
            // Process payment
            const paymentSpan = tracer.startSpan('process_payment');
            try {
                const paymentResult = await context.with(trace.setSpan(context.active(), paymentSpan), async () => {
                    return await processPayment(orderId);
                });
                
                paymentSpan.setAttributes({
                    'payment.amount': paymentResult.amount,
                    'payment.method': paymentResult.method
                });
            } finally {
                paymentSpan.end();
            }
            
            span.setStatus({ code: SpanStatusCode.OK });
            return true;
        });
        
    } catch (error) {
        span.recordException(error);
        span.setStatus({ 
            code: SpanStatusCode.ERROR, 
            message: error.message 
        });
        throw error;
    } finally {
        span.end();
    }
}

// Helper functions (placeholders for actual implementation)
async function validateOrder(orderId) {
    // Validation logic here
    if (!orderId) {
        throw new Error('Order ID is required');
    }
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function processPayment(orderId) {
    // Payment processing logic here
    // Simulate async payment processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
        amount: 99.99,
        method: 'credit_card',
        orderId: orderId,
        status: 'completed'
    };
}

module.exports = { processOrder };
```

### Trace Analysis Techniques

**Critical Path Analysis:**
Identify the longest sequential path through a trace to understand the minimum possible execution time and find optimization opportunities.

**Parallel Processing Analysis:**
Analyze which operations run in parallel vs. sequentially to identify opportunities for better concurrency.

**Error Correlation:**
When errors occur, distributed tracing helps you understand the complete context: what services were involved, what operations were in progress, and what the system state was at the time of failure.

**Performance Regression Detection:**
Compare trace patterns over time to identify performance regressions. Look for:
- Increasing span durations
- New error patterns
- Changes in service call patterns

### Advanced Tracing Patterns

**Async Operation Tracing:**
Handling asynchronous operations requires special consideration:

```javascript
// Node.js async tracing example
const { trace, context } = require('@opentelemetry/api');

async function processOrderAsync(orderId) {
    const tracer = trace.getTracer('order-service');
    
    const span = tracer.startSpan('process_order_async');
    const ctx = trace.setSpan(context.active(), span);
    
    try {
        // Start async operation
        const asyncOp = context.with(ctx, () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // This operation maintains trace context
                    const childSpan = tracer.startSpan('async_operation');
                    childSpan.addEvent('Processing in background');
                    childSpan.end();
                    resolve('completed');
                }, 1000);
            });
        });
        
        const result = await asyncOp;
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
    } finally {
        span.end();
    }
}
```

**Fan-out/Fan-in Patterns:**
When a request spawns multiple parallel operations that later converge:

```javascript

// Node.js fan-out/fan-in tracing
const { trace, SpanStatusCode, context } = require('@opentelemetry/api');

async function processOrderWithFanOut(orderId) {
    const tracer = trace.getTracer('order-service');
    
    return tracer.startActiveSpan('process_order_fanout', async (span) => {
        try {
            // Fan-out: Start multiple parallel operations
            const operations = [
                // Inventory check
                tracer.startActiveSpan('check_inventory', async (childSpan) => {
                    try {
                        await checkInventory(orderId);
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        throw error;
                    } finally {
                        childSpan.end();
                    }
                }),
                
                // Payment processing
                tracer.startActiveSpan('process_payment', async (childSpan) => {
                    try {
                        await processPayment(orderId);
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        throw error;
                    } finally {
                        childSpan.end();
                    }
                }),
                
                // Shipping calculation
                tracer.startActiveSpan('calculate_shipping', async (childSpan) => {
                    try {
                        await calculateShipping(orderId);
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        throw error;
                    } finally {
                        childSpan.end();
                    }
                })
            ];
            
            // Fan-in: Wait for all operations to complete
            await Promise.all(operations);
            
            span.setStatus({ code: SpanStatusCode.OK });
            
        } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
        } finally {
            span.end();
        }
    });
}

// Alternative implementation using Promise.allSettled for more granular error handling
async function processOrderWithFanOutSettled(orderId) {
    const tracer = trace.getTracer('order-service');
    
    return tracer.startActiveSpan('process_order_fanout', async (span) => {
        try {
            // Fan-out: Start multiple parallel operations
            const operations = [
                tracer.startActiveSpan('check_inventory', async (childSpan) => {
                    try {
                        const result = await checkInventory(orderId);
                        childSpan.setStatus({ code: SpanStatusCode.OK });
                        return { operation: 'inventory', result };
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        return { operation: 'inventory', error };
                    } finally {
                        childSpan.end();
                    }
                }),
                
                tracer.startActiveSpan('process_payment', async (childSpan) => {
                    try {
                        const result = await processPayment(orderId);
                        childSpan.setStatus({ code: SpanStatusCode.OK });
                        return { operation: 'payment', result };
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        return { operation: 'payment', error };
                    } finally {
                        childSpan.end();
                    }
                }),
                
                tracer.startActiveSpan('calculate_shipping', async (childSpan) => {
                    try {
                        const result = await calculateShipping(orderId);
                        childSpan.setStatus({ code: SpanStatusCode.OK });
                        return { operation: 'shipping', result };
                    } catch (error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
                        return { operation: 'shipping', error };
                    } finally {
                        childSpan.end();
                    }
                })
            ];
            
            // Fan-in: Wait for all operations to complete (similar to Go's channel pattern)
            const results = await Promise.allSettled(operations);
            
            // Check for any failures
            const failures = results
                .filter(result => result.status === 'rejected' || result.value?.error)
                .map(result => result.reason || result.value?.error);
            
            if (failures.length > 0) {
                const firstError = failures[0];
                span.recordException(firstError);
                span.setStatus({ code: SpanStatusCode.ERROR, message: firstError.message });
                throw firstError;
            }
            
            span.setStatus({ code: SpanStatusCode.OK });
            
        } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
        } finally {
            span.end();
        }
    });
}

// Helper functions (placeholders for actual implementation)
async function checkInventory(orderId) {
    // Simulate inventory check
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    if (Math.random() < 0.1) { // 10% chance of failure
        throw new Error(`Inventory check failed for order ${orderId}`);
    }
    return { available: true, quantity: 10 };
}

async function processPayment(orderId) {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500));
    if (Math.random() < 0.05) { // 5% chance of failure
        throw new Error(`Payment failed for order ${orderId}`);
    }
    return { status: 'completed', transactionId: 'txn_' + Math.random().toString(36).substr(2, 9) };
}

async function calculateShipping(orderId) {
    // Simulate shipping calculation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800));
    if (Math.random() < 0.05) { // 5% chance of failure
        throw new Error(`Shipping calculation failed for order ${orderId}`);
    }
    return { cost: 9.99, estimatedDays: 3 };
}

module.exports = { 
    processOrderWithFanOut, 
    processOrderWithFanOutSettled 
};
```

### Tracing Best Practices

**Span Naming:**
Use consistent, descriptive names for spans:
- **Good**: `GET /api/users/{id}`, `database.query`, `cache.get`
- **Bad**: `handle_request`, `db_call`, `method1`

**Tag Strategy:**
Add meaningful tags but avoid high-cardinality values:
- **Good**: `http.method`, `db.operation`, `user.type`
- **Bad**: `user.email`, `request.body`, `timestamp`

**Sampling:**
Implement intelligent sampling to balance observability with performance:
- Sample all errors
- Sample all slow requests
- Use lower sampling rates for normal, fast requests
- Consider business-critical operations for higher sampling

**Security Considerations:**
Never include sensitive data in traces:
- Avoid PII in span names or tags
- Sanitize URLs and parameters
- Be careful with error messages that might leak sensitive information

---

## Log Management and Analysis {#logging}

Logging is the oldest and most fundamental form of application monitoring. In distributed systems, logs become even more critical because they provide the detailed narrative of what happened, when, and in what context. However, traditional logging approaches often fall short in distributed environments, requiring new strategies and tools.

### Evolution of Logging in Distributed Systems

**Traditional Logging Challenges:**
In monolithic applications, logs were typically written to local files and analyzed using basic tools like `grep` and `awk`. This approach breaks down in distributed systems because:
- Logs are scattered across multiple hosts
- Correlating events across services is difficult
- Volume of logs can be overwhelming
- Different services may use different log formats

**Modern Logging Requirements:**
- **Centralized Collection**: All logs must be aggregated in a central location
- **Structured Format**: Logs should be machine-readable for automated analysis
- **Correlation**: Logs from related operations must be linkable
- **Real-time Processing**: Critical for alerting and monitoring
- **Scalable Storage**: Must handle high volumes efficiently
- **Fast Search**: Quick retrieval of relevant log entries

### Structured Logging

Structured logging represents events as structured data rather than free-form text. This makes logs much more valuable for automated analysis, searching, and alerting.

**JSON Logging Example:**
```json
{
  "timestamp": "2024-01-15T14:30:25.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "version": "1.2.3",
  "instance_id": "payment-svc-7d4f8k9x2",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "event": "payment_processing_failed",
  "user_id": "user123",
  "order_id": "order456",
  "payment_method": "credit_card",
  "amount": 99.99,
  "currency": "USD",
  "error_code": "INSUFFICIENT_FUNDS",
  "error_message": "Payment declined by issuer",
  "duration_ms": 1250,
  "retry_count": 2,
  "metadata": {
    "card_type": "visa",
    "issuer_bank": "example_bank",
    "merchant_id": "merchant789"
  }
}
```

**Benefits of Structured Logging:**
- **Searchability**: Easy to query specific fields
- **Aggregation**: Can calculate metrics from log data
- **Alerting**: Create precise alerts based on field values
- **Correlation**: Link related events using trace IDs
- **Machine Learning**: Enable automated anomaly detection

### Log Levels and Their Strategic Use

**FATAL/CRITICAL**: Reserved for catastrophic failures that require immediate attention:
```json
{
  "level": "FATAL",
  "event": "database_connection_pool_exhausted",
  "message": "Cannot serve requests - all database connections in use",
  "active_connections": 100,
  "max_connections": 100,
  "waiting_requests": 50
}
```

**ERROR**: Significant problems that affect functionality but don't stop the service:
```json
{
  "level": "ERROR", 
  "event": "external_service_timeout",
  "service": "payment-gateway",
  "timeout_ms": 5000,
  "retry_attempt": 3,
  "fallback_used": true
}
```

**WARN**: Potential issues or degraded performance conditions:
```json
{
  "level": "WARN",
  "event": "high_response_time",
  "operation": "user_search",
  "duration_ms": 2500,
  "threshold_ms": 1000,
  "query_complexity": "high"
}
```

**INFO**: Important business events and normal operational milestones:
```json
{
  "level": "INFO",
  "event": "user_registration_completed",
  "user_id": "user789",
  "registration_type": "email",
  "email_domain": "company.com",
  "referral_source": "organic"
}
```

**DEBUG**: Detailed information useful for troubleshooting:
```json
{
  "level": "DEBUG",
  "event": "cache_miss",
  "cache_key": "user_profile_123",
  "cache_type": "redis",
  "ttl_remaining": 0,
  "fetch_source": "database"
}
```

### Log Correlation Strategies

**Correlation IDs:**
Every request should have a unique correlation ID that's passed through all related operations:
```javascript
const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

// Create AsyncLocalStorage instance for correlation ID context
const correlationIdContext = new AsyncLocalStorage();

// Custom logger class that automatically includes correlation ID
class Logger {
    constructor(name) {
        this.name = name;
    }
    
    _log(level, message, extra = {}) {
        const correlationId = correlationIdContext.getStore() || 'unknown';
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            logger: this.name,
            correlation_id: correlationId,
            message,
            ...extra
        };
        
        console.log(JSON.stringify(logEntry));
    }
    
    info(message, extra = {}) {
        this._log('info', message, extra);
    }
    
    error(message, extra = {}) {
        this._log('error', message, extra);
    }
    
    warn(message, extra = {}) {
        this._log('warn', message, extra);
    }
    
    debug(message, extra = {}) {
        this._log('debug', message, extra);
    }
}

// Function to set correlation ID in context
function setCorrelationId(cid = null) {
    if (cid === null) {
        cid = uuidv4();
    }
    return cid;
}

// Function to get correlation ID from context
function getCorrelationId() {
    return correlationIdContext.getStore() || 'unknown';
}

// Express.js middleware for correlation ID
function correlationMiddleware(req, res, next) {
    const cid = req.headers['x-correlation-id'] || uuidv4();
    
    // Store correlation ID in AsyncLocalStorage context
    correlationIdContext.run(cid, () => {
        // Add correlation ID to response headers
        res.set('X-Correlation-ID', cid);
        
        // Make correlation ID available on request object
        req.correlationId = cid;
        
        next();
    });
}

// Business logic function
function processOrder(orderData) {
    const logger = new Logger('order-service');
    
    logger.info("Processing order", {
        event: "order_processing_started",
        order_id: orderData.id,
        items_count: orderData.items.length
    });
    
    // Simulate some async work
    return new Promise((resolve) => {
        setTimeout(() => {
            logger.info("Order processed successfully", {
                event: "order_processing_completed",
                order_id: orderData.id
            });
            resolve({ status: 'completed', orderId: orderData.id });
        }, 100);
    });
}

// Alternative implementation using a more traditional approach with Winston logger
const winston = require('winston');

// Custom Winston format that includes correlation ID
const correlationFormat = winston.format((info) => {
    info.correlation_id = getCorrelationId();
    return info;
});

// Winston logger configuration
const winstonLogger = winston.createLogger({
    format: winston.format.combine(
        correlationFormat(),
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Usage with Winston
function processOrderWithWinston(orderData) {
    winstonLogger.info("Processing order", {
        event: "order_processing_started",
        order_id: orderData.id,
        items_count: orderData.items.length
    });
    
    return new Promise((resolve) => {
        setTimeout(() => {
            winstonLogger.info("Order processed successfully", {
                event: "order_processing_completed",
                order_id: orderData.id
            });
            resolve({ status: 'completed', orderId: orderData.id });
        }, 100);
    });
}

// Example Express.js application setup
const express = require('express');
const app = express();

app.use(express.json());
app.use(correlationMiddleware);

app.post('/orders', async (req, res) => {
    try {
        const result = await processOrder(req.body);
        res.json(result);
    } catch (error) {
        const logger = new Logger('order-service');
        logger.error("Order processing failed", {
            event: "order_processing_failed",
            error: error.message,
            order_id: req.body.id
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Example standalone usage (without web framework)
async function standaloneExample() {
    const orderData = {
        id: 'order-123',
        items: [{ name: 'Product A' }, { name: 'Product B' }]
    };
    
    // Set correlation ID and run within context
    const cid = uuidv4();
    correlationIdContext.run(cid, async () => {
        console.log('Current correlation ID:', getCorrelationId());
        await processOrder(orderData);
    });
}

module.exports = {
    Logger,
    setCorrelationId,
    getCorrelationId,
    correlationMiddleware,
    processOrder,
    processOrderWithWinston,
    standaloneExample
};

```

**Distributed Tracing Integration:**
Logs should include trace and span IDs to correlate with distributed traces:

```java
// Java with OpenTelemetry
const { trace } = require('@opentelemetry/api');
const winston = require('winston');

class LoggingService {
    constructor() {
        this.logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
    }
    
    logOrderEvent(event, order) {
        const currentSpan = trace.getActiveSpan();
        const spanContext = currentSpan ? currentSpan.spanContext() : null;
        
        const logData = {
            event: event,
            orderId: order.id,
            message: `Order event: ${event}`
        };
        
        if (spanContext) {
            logData.traceId = spanContext.traceId;
            logData.spanId = spanContext.spanId;
        }
        
        this.logger.info(logData);
    }
}

module.exports = LoggingService;
```

### Log Aggregation and Pipeline Architecture

**Log Collection Patterns:**

*Push Model*: Applications actively send logs to collectors
```yaml
# Fluentd configuration example
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<filter **>
  @type parser
  key_name log
  <parse>
    @type json
  </parse>
</filter>

<match **>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  index_name logs-${tag}-%Y.%m.%d
</match>
```

*Pull Model*: Collectors actively fetch logs from sources
```yaml
# Promtail (Loki) configuration
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/log/containers/*.log
```

**Pipeline Processing:**

*Parsing*: Convert unstructured logs to structured format
*Enrichment*: Add metadata like geolocation, service information
*Filtering*: Remove noise and sensitive information
*Routing*: Send different log types to appropriate destinations

### Log Analysis and Querying

**Elasticsearch Query Examples:**

*Find all errors in the last hour*:
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"level": "ERROR"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

*Aggregate error counts by service*:
```json
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        {"term": {"level": "ERROR"}},
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  },
  "aggs": {
    "errors_by_service": {
      "terms": {"field": "service.keyword"}
    }
  }
}
```

**Splunk Search Examples:**

*Find payment failures with high amounts*:
```
index=payments level=ERROR event=payment_failed amount>1000
| stats count by error_code, payment_method
| sort -count
```

*Track user journey across services*:
```
index=* trace_id="4bf92f3577b34da6a3ce929d0e0e4736"
| sort _time
| table _time service event message
```

### Log-Based Metrics and Alerting

**Deriving Metrics from Logs:**

*Error Rate Calculation*:
```yaml
# Prometheus log-based metrics with Loki
- name: error_rate
  query: |
    sum(rate({service=~".+"} |= "ERROR" [5m])) by (service) /
    sum(rate({service=~".+"} [5m])) by (service)
```

*Response Time Distribution*:
```yaml
- name: response_time_histogram
  query: |
    histogram_quantile(0.95,
      sum(rate({service="api-gateway"} | json | duration_ms != "" | 
          unwrap duration_ms [5m])) by (le)
    )
```

**Log-Based Alerting:**

*High Error Rate Alert*:
```yaml
groups:
- name: error_rates
  rules:
  - alert: HighErrorRate
    expr: |
      (
        sum(rate({service=~".+"} |= "ERROR" [5m])) by (service) /
        sum(rate({service=~".+"} [5m])) by (service)
      ) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "{{ $labels.service }} has error rate above 5%"
```

### Security and Compliance Considerations

**Sensitive Data Handling:**
Never log sensitive information like passwords, credit card numbers, or personal identifiable information (PII):

```javascript
// Good: Sanitized logging
const winston = require('winston');

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

function logPaymentAttempt(paymentData) {
    const sanitizedData = {
        user_id: paymentData.user_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        card_last_four: paymentData.card_number.slice(-4),
        card_type: paymentData.card_type
    };
    
    logger.info("Payment attempted", sanitizedData);
}

// Bad: Logging sensitive data
function logPaymentAttemptBad(paymentData) {
    logger.info("Payment attempted", paymentData); // Contains full card number!
}

module.exports = { logPaymentAttempt, logPaymentAttemptBad };
```

**Compliance Requirements:**
- **GDPR**: Implement right to erasure for user-related logs
- **PCI DSS**: Strict controls on payment-related log data
- **SOX**: Immutable audit trails for financial systems
- **HIPAA**: Protection of health information in logs

**Log Retention Policies:**
```yaml
# Example retention policy configuration
retention_policies:
  - pattern: "logs-application-*"
    retention_days: 30
  - pattern: "logs-audit-*"
    retention_days: 2557  # 7 years for compliance
  - pattern: "logs-debug-*"
    retention_days: 7
```

---

## Business Metrics Monitoring {#business}

While technical metrics tell you how your system is performing, business metrics tell you how well your system is serving your users and achieving business objectives. This type of monitoring bridges the gap between technical operations and business outcomes.

### Understanding Business Metrics

**Definition:**
Business metrics are quantifiable measures that directly relate to business objectives and user experience. They answer questions like "Are users successfully completing purchases?" rather than "Is the server CPU usage normal?"

**Key Characteristics:**
- **User-Centric**: Focus on user experience and outcomes
- **Actionable**: Directly tied to business decisions
- **Leading Indicators**: Often predict business performance
- **Cross-Functional**: Relevant to both technical and business teams

### Types of Business Metrics

**Conversion Metrics:**
Track how well your system converts users through critical business processes:

*E-commerce Conversion Funnel*:
```json
{
  "funnel_stage": "product_view",
  "user_id": "user123",
  "session_id": "session456",
  "product_id": "product789",
  "timestamp": "2024-01-15T14:30:25Z",
  "user_agent": "mobile_app",
  "referrer": "email_campaign_winter2024"
}

{
  "funnel_stage": "add_to_cart",
  "user_id": "user123",
  "session_id": "session456", 
  "product_id": "product789",
  "quantity": 2,
  "cart_value": 199.98,
  "timestamp": "2024-01-15T14:32:10Z"
}

{
  "funnel_stage": "checkout_completed",
  "user_id": "user123",
  "session_id": "session456",
  "order_id": "order123",
  "order_value": 199.98,
  "payment_method": "credit_card",
  "timestamp": "2024-01-15T14:35:45Z"
}
```

*SaaS User Activation*:
```json
{
  "event": "user_signed_up",
  "user_id": "user456",
  "plan": "free_trial",
  "referral_source": "google_ads",
  "timestamp": "2024-01-15T10:00:00Z"
}

{
  "event": "first_login",
  "user_id": "user456",
  "time_to_first_login_hours": 2.5,
  "timestamp": "2024-01-15T12:30:00Z"
}

{
  "event": "feature_adoption",
  "user_id": "user456",
  "feature": "dashboard_created",
  "days_since_signup": 1,
  "timestamp": "2024-01-16T09:15:00Z"
}
```

**Revenue Metrics:**
Track the financial impact of your system:

*Revenue Recognition*:
```javascript
// JavaScript example for revenue tracking
class RevenueMetrics {
    constructor(metricsClient) {
        this.metrics = metricsClient;
    }
    
    recordSale(order) {
        // Record total revenue
        this.metrics.counter('revenue.total', {
            value: order.amount,
            tags: {
                currency: order.currency,
                payment_method: order.paymentMethod,
                product_category: order.category,
                customer_segment: order.customer.segment
            }
        });
        
        // Record monthly recurring revenue for subscriptions
        if (order.isSubscription) {
            this.metrics.gauge('revenue.mrr', {
                value: order.monthlyValue,
                tags: {
                    plan: order.subscriptionPlan,
                    billing_cycle: order.billingCycle
                }
            });
        }
    }
    
    recordRefund(refund) {
        this.metrics.counter('revenue.refunded', {
            value: refund.amount,
            tags: {
                reason: refund.reason,
                days_since_purchase: refund.daysSincePurchase
            }
        });
    }
}

module.exports = RevenueMetrics;
```

**Engagement Metrics:**
Measure how actively users interact with your system:

*User Activity Tracking*:
```javascript
// JavaScript example for engagement tracking
class EngagementTracker {
    constructor(analytics) {
        this.analytics = analytics;
        this.sessionStart = Date.now();
        this.actionsCount = 0;
        this.features_used = new Set();
    }
    
    trackAction(action, metadata = {}) {
        this.actionsCount++;
        this.features_used.add(action);
        
        this.analytics.track('user_action', {
            action: action,
            session_duration_seconds: (Date.now() - this.sessionStart) / 1000,
            actions_count: this.actionsCount,
            features_used_count: this.features_used.size,
            ...metadata
        });
    }
    
    trackSessionEnd() {
        const sessionDuration = (Date.now() - this.sessionStart) / 1000;
        
        this.analytics.track('session_ended', {
            duration_seconds: sessionDuration,
            actions_count: this.actionsCount,
            features_used: Array.from(this.features_used),
            engagement_score: this.calculateEngagementScore()
        });
    }
    
    calculateEngagementScore() {
        const duration = (Date.now() - this.sessionStart) / 1000;
        const actionsPerMinute = this.actionsCount / (duration / 60);
        const featureUsageRatio = this.features_used.size / TOTAL_FEATURES;
        
        return actionsPerMinute * featureUsageRatio * Math.log(duration / 60);
    }
}
```

### Implementing Business Metrics Collection

**Event-Driven Architecture:**
Use domain events to capture business metrics naturally:

```java
// Java example with domain events
const EventEmitter = require("events");

class MetricsService {
  recordBusinessEvent(eventName, data) {
    console.log(`Business Event Recorded: ${eventName}`, data);
    // In real life: push to metrics backend
  }
}

class ConversionFunnelService {
  recordConversion(orderId, stage) {
    console.log(`Conversion recorded for order ${orderId} at stage: ${stage}`);
    // In real life: store conversion funnel data
  }
}

class OrderEventHandler extends EventEmitter {
  constructor(metricsService, conversionFunnelService) {
    super();
    this.metricsService = metricsService;
    this.conversionFunnelService = conversionFunnelService;

    // Register event listeners
    this.on("OrderCreatedEvent", this.handleOrderCreated.bind(this));
    this.on("PaymentCompletedEvent", this.handlePaymentCompleted.bind(this));
  }

  handleOrderCreated(event) {
    this.metricsService.recordBusinessEvent("order.created", {
      order_id: event.orderId,
      customer_id: event.customerId,
      order_value: event.orderValue,
      product_category: event.primaryProductCategory,
      channel: event.channel,
    });
  }

  handlePaymentCompleted(event) {
    this.metricsService.recordBusinessEvent("payment.completed", {
      order_id: event.orderId,
      payment_method: event.paymentMethod,
      processing_time_ms: event.processingTime,
      fraud_score: event.fraudScore,
    });

    // Update conversion funnel metrics
    this.conversionFunnelService.recordConversion(
      event.orderId,
      "payment_completed"
    );
  }
}

// Example usage
const metricsService = new MetricsService();
const conversionFunnelService = new ConversionFunnelService();
const handler = new OrderEventHandler(metricsService, conversionFunnelService);

// Fire some events
handler.emit("OrderCreatedEvent", {
  orderId: "ORD123",
  customerId: "CUST456",
  orderValue: 250.0,
  primaryProductCategory: "electronics",
  channel: "web",
});

handler.emit("PaymentCompletedEvent", {
  orderId: "ORD123",
  paymentMethod: "credit_card",
  processingTime: 1200,
  fraudScore: 0.02,
});

```

**Real-Time Analytics Pipeline:**
Process business events in real-time for immediate insights:

```yaml
# Apache Kafka Streams example configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: business-metrics-processor
data:
  application.yml: |
    spring:
      kafka:
        bootstrap-servers: kafka:9092
        streams:
          application-id: business-metrics-processor
          default-key-serde: org.apache.kafka.common.serialization.Serdes$StringSerde
          default-value-serde: org.springframework.kafka.support.serializer.JsonSerde
    
    processor:
      input-topics:
        - order-events
        - payment-events
        - user-events
      output-topics:
        - business-metrics
        - conversion-funnel-updates
```

### Business Metrics Dashboards

**Executive Dashboard:**
High-level metrics for business leaders:

```python
# Python example for executive dashboard metrics
class ExecutiveDashboard:
    def __init__(self, metrics_db):
        self.db = metrics_db
    
    def get_kpi_summary(self, date_range):
        return {
            'revenue': {
                'current_period': self.get_revenue(date_range),
                'previous_period': self.get_revenue(date_range.previous_period()),
                'growth_rate': self.calculate_growth_rate('revenue', date_range),
                'trend': self.get_trend('revenue', date_range)
            },
            'active_users': {
                'current_period': self.get_active_users(date_range),
                'previous_period': self.get_active_users(date_range.previous_period()),
                'growth_rate': self.calculate_growth_rate('active_users', date_range)
            },
            'conversion_rate': {
                'current_period': self.get_conversion_rate(date_range),
                'previous_period': self.get_conversion_rate(date_range.previous_period()),
                'change': self.calculate_change('conversion_rate', date_range)
            },
            'churn_rate': {
                'current_period': self.get_churn_rate(date_range),
                'previous_period': self.get_churn_rate(date_range.previous_period()),
                'change': self.calculate_change('churn_rate', date_range)
            }
        }
```

**Operational Dashboard:**
Detailed metrics for day-to-day operations:

```sql
-- SQL example for operational metrics
-- Daily conversion funnel analysis
SELECT 
    DATE(event_timestamp) as date,
    COUNT(CASE WHEN funnel_stage = 'product_view' THEN user_id END) as product_views,
    COUNT(CASE WHEN funnel_stage = 'add_to_cart' THEN user_id END) as cart_additions,
    COUNT(CASE WHEN funnel_stage = 'checkout_started' THEN user_id END) as checkout_starts,
    COUNT(CASE WHEN funnel_stage = 'checkout_completed' THEN user_id END) as purchases,
    
    -- Calculate conversion rates
    ROUND(100.0 * COUNT(CASE WHEN funnel_stage = 'add_to_cart' THEN user_id END) / 
          NULLIF(COUNT(CASE WHEN funnel_stage = 'product_view' THEN user_id END), 0), 2) as view_to_cart_rate,
    
    ROUND(100.0 * COUNT(CASE WHEN funnel_stage = 'checkout_completed' THEN user_id END) / 
          NULLIF(COUNT(CASE WHEN funnel_stage = 'add_to_cart' THEN user_id END), 0), 2) as cart_to_purchase_rate
          
FROM user_funnel_events 
WHERE event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_timestamp)
ORDER BY date DESC;
```

### Cohort Analysis

Track user behavior over time to understand retention and lifetime value:

```javascript
// JavaScript cohort analysis example
class CohortAnalysis {
  constructor(analyticsDb) {
    this.db = analyticsDb; // expects a pg.Pool or pg.Client instance
  }

  async generateRetentionCohort(startDate, endDate) {
    const query = `
      WITH user_first_activity AS (
          SELECT 
              user_id,
              DATE_TRUNC('month', MIN(event_timestamp)) AS cohort_month,
              MIN(event_timestamp) AS first_activity
          FROM user_events 
          WHERE event_timestamp BETWEEN $1 AND $2
          GROUP BY user_id
      ),
      user_monthly_activity AS (
          SELECT 
              ue.user_id,
              ufa.cohort_month,
              DATE_TRUNC('month', ue.event_timestamp) AS activity_month,
              EXTRACT(EPOCH FROM (DATE_TRUNC('month', ue.event_timestamp) - ufa.cohort_month)) / 2629746 AS months_since_first
          FROM user_events ue
          JOIN user_first_activity ufa ON ue.user_id = ufa.user_id
          WHERE ue.event_timestamp BETWEEN $1 AND $2
          GROUP BY ue.user_id, ufa.cohort_month, DATE_TRUNC('month', ue.event_timestamp)
      )
      SELECT 
          cohort_month,
          months_since_first,
          COUNT(DISTINCT user_id) AS active_users,
          FIRST_VALUE(COUNT(DISTINCT user_id)) OVER (
              PARTITION BY cohort_month ORDER BY months_since_first
          ) AS cohort_size,
          ROUND(
              100.0 * COUNT(DISTINCT user_id) / 
              FIRST_VALUE(COUNT(DISTINCT user_id)) OVER (
                  PARTITION BY cohort_month ORDER BY months_since_first
              ), 
              2
          ) AS retention_rate
      FROM user_monthly_activity
      GROUP BY cohort_month, months_since_first
      ORDER BY cohort_month, months_since_first;
    `;

    const result = await this.db.query(query, [startDate, endDate]);
    return result.rows;
  }
}

// Example usage (with pg)
const { Pool } = require("pg");

(async () => {
  const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "analytics",
    password: "secret",
    port: 5432,
  });

  const cohort = new CohortAnalysis(pool);

  const data = await cohort.generateRetentionCohort("2023-01-01", "2023-12-31");
  console.log(data);

  await pool.end();
})();

```

### A/B Testing and Experimentation

Integrate experimentation into your business metrics:

```javascript
// JavaScript example for A/B testing metrics
class ExperimentTracker {
  constructor(metricsClient) {
    this.metricsClient = metricsClient;
    this.experiments = {}; // { experimentId: Experiment }
  }

  getUserSegment(userId) {
    // Stubbed segmentation logic
    return "default_segment";
  }

  updateExperimentStats(experimentId, variant, conversionValue) {
    const experiment = this.experiments[experimentId];
    if (!experiment.stats) {
      experiment.stats = {};
    }
    if (!experiment.stats[variant]) {
      experiment.stats[variant] = {
        conversions: 0,
        participants: 0,
        totalValue: 0,
      };
    }

    const stats = experiment.stats[variant];
    stats.conversions += 1;
    stats.totalValue += conversionValue;
  }

  getVariantStats(experimentId, variant) {
    const experiment = this.experiments[experimentId];
    return experiment.stats?.[variant] || {
      conversions: 0,
      participants: 0,
      totalValue: 0,
    };
  }

  calculateSignificance(stats, controlVariant) {
    // Placeholder: you’d plug in real stats test here (chi-square, t-test, etc.)
    return Math.random(); // Just a stub
  }

  trackConversion(userId, experimentId, variant, conversionValue) {
    const experiment = this.experiments[experimentId];
    if (!experiment) {
      return;
    }

    // Record the conversion
    this.metricsClient.counter("experiment.conversion", 1, {
      experiment_id: experimentId,
      variant: variant,
      user_segment: this.getUserSegment(userId),
    });

    // Record conversion value
    this.metricsClient.histogram("experiment.conversion_value", conversionValue, {
      experiment_id: experimentId,
      variant: variant,
    });

    // Update experiment statistics
    this.updateExperimentStats(experimentId, variant, conversionValue);
  }

  getExperimentResults(experimentId) {
    const experiment = this.experiments[experimentId];
    const results = {
      experimentId,
      variants: {},
    };

    for (const variant of experiment.variants) {
      const stats = this.getVariantStats(experimentId, variant);
      results.variants[variant] = {
        conversions: stats.conversions,
        participants: stats.participants,
        conversionRate:
          stats.participants > 0
            ? stats.conversions / stats.participants
            : 0,
        averageValue:
          stats.conversions > 0 ? stats.totalValue / stats.conversions : 0,
        statisticalSignificance: this.calculateSignificance(
          stats,
          experiment.controlVariant
        ),
      };
    }

    return results;
  }
}

// Example mock metrics client
class MetricsClient {
  counter(name, value, tags) {
    console.log("Counter:", name, value, tags);
  }
  histogram(name, value, tags) {
    console.log("Histogram:", name, value, tags);
  }
}

// Example usage
const metricsClient = new MetricsClient();
const tracker = new ExperimentTracker(metricsClient);

tracker.experiments["exp1"] = {
  variants: ["A", "B"],
  controlVariant: "A",
};

tracker.trackConversion("user123", "exp1", "B", 42.5);
console.log(tracker.getExperimentResults("exp1"));

```

---

## Security Monitoring {#security}

Security monitoring in distributed systems requires a comprehensive approach that covers application security, infrastructure security, network security, and compliance. Unlike traditional security monitoring that focused on perimeter defense, distributed systems require monitoring of lateral movement, service-to-service communication, and complex attack patterns that span multiple services.

### Security Monitoring Fundamentals

**Defense in Depth Strategy:**
Security monitoring should implement multiple layers of detection:
- **Perimeter Monitoring**: External threats and attack attempts
- **Network Monitoring**: Internal traffic analysis and anomaly detection  
- **Application Monitoring**: Code-level vulnerabilities and attack patterns
- **Data Monitoring**: Access patterns and data exfiltration attempts
- **User Behavior Monitoring**: Anomalous user activities and privilege escalation

**Security Event Categories:**
- **Authentication Events**: Login attempts, failures, MFA challenges
- **Authorization Events**: Access grants, denials, privilege escalations
- **Data Access Events**: Read, write, delete operations on sensitive data
- **Configuration Changes**: System configuration modifications
- **Network Events**: Unusual traffic patterns, connection attempts
- **Application Events**: Code injection attempts, input validation failures

### Authentication and Authorization Monitoring

**Login Pattern Analysis:**

```javascript
// javascript example for authentication monitoring
class AuthenticationMonitor {
  constructor(securityMetrics) {
    this.metrics = securityMetrics;
    this.suspiciousPatterns = {};
  }

  trackLoginAttempt(userId, ipAddress, userAgent, success, factorsUsed) {
    // Record basic login metrics
    this.metrics.counter("auth.login_attempts", 1, {
      success: String(success).toLowerCase(),
      factors_count: String(factorsUsed.length),
      user_agent_type: this.classifyUserAgent(userAgent),
    });

    // Detect suspicious patterns
    this.detectBruteForce(userId, ipAddress, success);
    this.detectImpossibleTravel(userId, ipAddress);
    this.detectUnusualDevice(userId, userAgent);

    // Log structured security event
    const securityEvent = {
      event_type: "authentication",
      user_id: userId,
      ip_address: this.anonymizeIp(ipAddress),
      success: success,
      factors_used: factorsUsed,
      risk_score: this.calculateRiskScore(userId, ipAddress, userAgent),
      geolocation: this.getGeolocation(ipAddress),
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(securityEvent);
  }

  detectBruteForce(userId, ipAddress, success) {
    const key = `brute_force:${ipAddress}:${userId}`;
    let currentFailures = this.getFailureCount(key, 300); // 5 minutes

    if (!success) {
      currentFailures += 1;
      this.incrementFailureCount(key);
    }

    if (currentFailures >= 5) {
      // Threshold for brute force
      this.generateAlert("brute_force_detected", {
        user_id: userId,
        ip_address: ipAddress,
        failure_count: currentFailures,
        severity: "high",
      });
    }
  }

  detectImpossibleTravel(userId, ipAddress) {
    const lastLocation = this.getLastLoginLocation(userId);
    const currentLocation = this.getGeolocation(ipAddress);

    if (lastLocation && currentLocation) {
      const distance = this.calculateDistance(lastLocation, currentLocation);
      const lastLoginTime = this.getLastLoginTime(userId);
      const now = new Date();
      const timeDiffSeconds = (now - lastLoginTime) / 1000;

      const timeDiffHours = timeDiffSeconds / 3600;
      const maxSpeedKmh = distance / timeDiffHours;

      if (maxSpeedKmh > 1000) {
        // Impossible by commercial flight
        this.generateAlert("impossible_travel", {
          user_id: userId,
          distance_km: distance,
          time_diff_hours: timeDiffHours,
          required_speed_kmh: maxSpeedKmh,
          severity: "medium",
        });
      }
    }
  }

  // --- Stub methods (need real implementations) ---
  classifyUserAgent(userAgent) {
    return "unknown";
  }

  anonymizeIp(ip) {
    return ip;
  }

  calculateRiskScore(userId, ipAddress, userAgent) {
    return 0.5;
  }

  getGeolocation(ip) {
    return { lat: 0, lon: 0 };
  }

  logSecurityEvent(event) {
    console.log("Security event:", event);
  }

  getFailureCount(key, timeWindow) {
    return 0;
  }

  incrementFailureCount(key) {
    // Stub
  }

  generateAlert(type, details) {
    console.log("ALERT:", type, details);
  }

  getLastLoginLocation(userId) {
    return null;
  }

  getLastLoginTime(userId) {
    return new Date();
  }

  calculateDistance(loc1, loc2) {
    return 0;
  }

  detectUnusualDevice(userId, userAgent) {
    // Stub
  }
}

```

**Privilege Escalation Detection:**

```sql
-- SQL example for detecting privilege escalation
-- Monitor role changes and permission grants
SELECT 
    user_id,
    role_changed_from,
    role_changed_to,
    changed_by_user,
    change_timestamp,
    
    -- Calculate risk score based on role sensitivity
    CASE 
        WHEN role_changed_to IN ('admin', 'super_user', 'system') THEN 'HIGH'
        WHEN role_changed_to IN ('manager', 'editor') THEN 'MEDIUM'
        ELSE 'LOW'
    END as risk_level,
    
    -- Detect rapid role changes (potential account compromise)
    LAG(change_timestamp) OVER (PARTITION BY user_id ORDER BY change_timestamp) as previous_change,
    EXTRACT(EPOCH FROM (change_timestamp - LAG(change_timestamp) OVER (PARTITION BY user_id ORDER BY change_timestamp))) / 3600 as hours_since_last_change

FROM user_role_changes 
WHERE change_timestamp >= NOW() - INTERVAL '24 hours'
    AND role_changed_to != role_changed_from

-- Flag suspicious patterns
HAVING hours_since_last_change < 1 OR risk_level = 'HIGH'
ORDER BY change_timestamp DESC;
```

### Application Security Monitoring

**Input Validation and Injection Attack Detection:**

```javascript
// javascript example for detecting injection attacks
class SecurityEventLogger {
  constructor(meterRegistry, alertService, logger) {
    this.meterRegistry = meterRegistry;
    this.alertService = alertService;
    this.logger = logger || console;
  }

  logSecurityEvent(request, eventType, details) {
    const event = {
      eventType: eventType,
      timestamp: new Date().toISOString(),
      sourceIP: this.getClientIP(request),
      userAgent: request.headers["user-agent"] || "",
      requestURL: request.originalUrl || request.url,
      requestMethod: request.method,
      details: details,
      riskScore: this.calculateRiskScore(eventType, details, request),
      toJson: function () {
        return JSON.stringify(this);
      },
      getSeverity: function () {
        if (this.riskScore > 8) return "high";
        if (this.riskScore > 5) return "medium";
        return "low";
      },
    };

    // Increment metrics
    this.meterRegistry.counter("security.events", {
      type: eventType,
      severity: event.getSeverity(),
    });

    // Generate alert if high risk
    if (event.riskScore > 8.0) {
      this.alertService.generateSecurityAlert(event);
    }

    // Log structured event
    this.logger.warn("Security event detected:", event.toJson());
  }

  handleSqlInjectionAttempt(event) {
    const suspiciousQuery = event.query;
    const sanitizedQuery = this.sanitizeSqlForLogging(suspiciousQuery);

    this.logSecurityEvent(
      event.request,
      "sql_injection_attempt",
      `Suspicious SQL patterns detected: ${sanitizedQuery}`
    );

    // Track attack patterns
    const attackPattern = this.detectAttackPattern(suspiciousQuery);
    if (attackPattern) {
      this.meterRegistry.counter("security.attack_patterns", {
        pattern: attackPattern.name,
      });
    }
  }

  detectAttackPattern(query) {
    const q = query.toLowerCase();

    if (q.includes("union select")) {
      return { name: "UNION_SQL_INJECTION", risk: 9.0 };
    }

    if (/\s+(and|or)\s+\d+\s*=\s*\d+/.test(q)) {
      return { name: "BOOLEAN_SQL_INJECTION", risk: 8.5 };
    }

    if (q.includes("waitfor delay") || q.includes("sleep(")) {
      return { name: "TIME_BASED_SQL_INJECTION", risk: 9.5 };
    }

    return null;
  }

  // --- Helper methods (placeholders) ---

  getClientIP(req) {
    return (
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  sanitizeSqlForLogging(query) {
    return query.replace(/['"]/g, "");
  }

  calculateRiskScore(eventType, details, request) {
    // Placeholder: in real life you’d use heuristics
    if (eventType.includes("sql_injection")) return 9.0;
    return 5.0;
  }
}

// --- Example usage ---
class FakeMeterRegistry {
  counter(name, tags) {
    console.log("Metric incremented:", name, tags);
  }
}

class FakeAlertService {
  generateSecurityAlert(event) {
    console.log("ALERT GENERATED:", event);
  }
}

const logger = new SecurityEventLogger(
  new FakeMeterRegistry(),
  new FakeAlertService()
);

// Simulated SQL injection event
logger.handleSqlInjectionAttempt({
  query: "SELECT * FROM users WHERE id = 1 UNION SELECT password FROM secrets",
  request: {
    headers: { "user-agent": "curl/7.0" },
    originalUrl: "/login",
    method: "POST",
    connection: { remoteAddress: "192.168.1.10" },
  },
});

```

**Web Application Firewall (WAF) Integration:**

```yaml
# Example WAF rule configuration for monitoring
rules:
  - id: "XSS_DETECTION"
    description: "Detect Cross-Site Scripting attempts"
    pattern: "(?i)(<script|javascript:|on\\w+\\s*=|<iframe)"
    action: "BLOCK"
    severity: "HIGH"
    log_payload: true
    
  - id: "SQL_INJECTION_DETECTION"
    description: "Detect SQL injection attempts"
    pattern: "(?i)(union\\s+select|or\\s+1\\s*=\\s*1|drop\\s+table|insert\\s+into)"
    action: "BLOCK"
    severity: "CRITICAL"
    log_payload: true
    
  - id: "COMMAND_INJECTION"
    description: "Detect command injection attempts"
    pattern: "(?i)(;\\s*(ls|cat|wget|curl)|\\|\\s*(nc|netcat)|`[^`]*`)"
    action: "BLOCK"
    severity: "HIGH"
    
  - id: "DIRECTORY_TRAVERSAL"
    description: "Detect directory traversal attempts"
    pattern: "(\\.\\./|\\.\\\\|/etc/passwd|/windows/system32)"
    action: "BLOCK" 
    severity: "MEDIUM"

monitoring:
  metrics_endpoint: "/waf/metrics"
  log_format: "json"
  alert_webhook: "https://security-alerts.company.com/webhook"

### Network Security Monitoring

**Traffic Analysis and Anomaly Detection:**

```python
# Python example for network traffic analysis
class NetworkSecurityMonitor:
    def __init__(self, metrics_client):
        self.metrics = metrics_client
        self.baseline_profiles = {}
        self.anomaly_detector = AnomalyDetector()
    
    def analyze_traffic_flow(self, flow_data):
        """
        Analyze network flow data for security anomalies
        """
        flow_metrics = {
            'source_ip': flow_data['src_ip'],
            'dest_ip': flow_data['dst_ip'],
            'dest_port': flow_data['dst_port'],
            'protocol': flow_data['protocol'],
            'bytes_transferred': flow_data['bytes'],
            'packets_count': flow_data['packets'],
            'duration_seconds': flow_data['duration'],
            'flags': flow_data['tcp_flags'] if flow_data['protocol'] == 'TCP' else None
        }
        
        # Detect unusual traffic patterns
        self.detect_port_scanning(flow_metrics)
        self.detect_data_exfiltration(flow_metrics)
        self.detect_ddos_attempts(flow_metrics)
        self.detect_lateral_movement(flow_metrics)
        
        # Update baseline profiles
        self.update_baseline_profile(flow_metrics)
        
        return flow_metrics
    
    def detect_port_scanning(self, flow_metrics):
        """
        Detect port scanning activities
        """
        src_ip = flow_metrics['source_ip']
        key = f"port_scan:{src_ip}"
        
        # Track unique destination ports per source IP
        unique_ports = self.get_unique_ports_per_source(src_ip, time_window=300)
        
        if len(unique_ports) > 20:  # Threshold for port scan detection
            self.generate_security_alert('port_scan_detected', {
                'source_ip': src_ip,
                'unique_ports_accessed': len(unique_ports),
                'time_window_seconds': 300,
                'severity': 'medium',
                'ports_accessed': list(unique_ports)[:10]  # Limit for logging
            })
    
    def detect_data_exfiltration(self, flow_metrics):
        """
        Detect potential data exfiltration based on traffic volume
        """
        src_ip = flow_metrics['source_ip']
        bytes_transferred = flow_metrics['bytes_transferred']
        
        # Get baseline traffic volume for this source
        baseline = self.get_baseline_traffic(src_ip)
        
        if baseline and bytes_transferred > baseline * 10:  # 10x normal traffic
            self.generate_security_alert('potential_data_exfiltration', {
                'source_ip': src_ip,
                'bytes_transferred': bytes_transferred,
                'baseline_bytes': baseline,
                'anomaly_factor': bytes_transferred / baseline,
                'severity': 'high'
            })
    
    def detect_lateral_movement(self, flow_metrics):
        """
        Detect lateral movement within the network
        """
        src_ip = flow_metrics['source_ip']
        dst_ip = flow_metrics['dest_ip']
        
        # Check if this is internal-to-internal communication
        if self.is_internal_ip(src_ip) and self.is_internal_ip(dst_ip):
            # Track internal network scanning
            internal_destinations = self.get_internal_destinations(src_ip, time_window=3600)
            
            if len(internal_destinations) > 50:  # Unusual internal scanning
                self.generate_security_alert('lateral_movement_detected', {
                    'source_ip': src_ip,
                    'internal_destinations_count': len(internal_destinations),
                    'severity': 'high',
                    'investigation_required': True
                })
```

**Service Mesh Security Monitoring:**

```yaml
# Istio service mesh security policies and monitoring
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-authz
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/order-service"]
  - to:
    - operation:
        methods: ["POST"]
        paths: ["/api/v1/payments"]
  
---
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: security-metrics
spec:
  metrics:
  - providers:
    - name: prometheus
  - overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_principal:
          value: "%{SOURCE_PRINCIPAL}"
        destination_service_name:
          value: "%{DESTINATION_SERVICE_NAME}"
        response_code:
          value: "%{RESPONSE_CODE}"
```

**Container Security Monitoring:**

```javascript
// Go example for container security monitoring
class ContainerSecurityMonitor {
  constructor(metricsClient, alertManager) {
    this.metricsClient = metricsClient;
    this.alertManager = alertManager;
  }

  async monitorContainerEvents(ctx) {
    const { eventChan, errChan } = this.subscribeToContainerEvents();

    while (true) {
      const result = await Promise.race([
        this.take(eventChan).then((event) => ({ type: "event", event })),
        this.take(errChan).then((err) => ({ type: "error", err })),
        ctx.done, // assume ctx.done is a promise that rejects when cancelled
      ]);

      if (!result) {
        return new Error("context canceled");
      }

      if (result.type === "event") {
        this.processContainerEvent(result.event);
      } else if (result.type === "error") {
        throw new Error(`container event monitoring error: ${result.err}`);
      }
    }
  }

  processContainerEvent(event) {
    switch (event.type) {
      case "container.create":
        this.validateContainerImage(event);
        this.checkPrivilegedExecution(event);
        break;
      case "container.start":
        this.monitorResourceLimits(event);
        this.validateSecurityContext(event);
        break;
      case "container.exec":
        this.monitorExecCommands(event);
        break;
    }

    // Record metrics
    this.metricsClient.counter("container.security.events", 1, {
      event_type: event.type,
      image: event.image,
      namespace: event.namespace,
    });
  }

  validateContainerImage(event) {
    // Check if image is from trusted registry
    if (!this.isTrustedRegistry(event.image)) {
      this.alertManager.generateAlert("untrusted_container_image", {
        severity: "medium",
        image: event.image,
        containerId: event.containerId,
        message: "Container created from untrusted registry",
      });
    }

    // Check for known vulnerable images
    if (this.hasKnownVulnerabilities(event.image)) {
      const vulnerabilities = this.getImageVulnerabilities(event.image);
      this.alertManager.generateAlert("vulnerable_container_image", {
        severity: "high",
        image: event.image,
        containerId: event.containerId,
        vulnerabilities,
        message: "Container created from image with known vulnerabilities",
      });
    }
  }

  monitorExecCommands(event) {
    const suspiciousCommands = [
      "curl",
      "wget",
      "nc",
      "netcat",
      "python",
      "perl",
      "bash",
      "sh",
      "chmod +x",
      "base64 -d",
      "echo",
      "cat /etc/passwd",
    ];

    for (const cmd of suspiciousCommands) {
      if (event.command.includes(cmd)) {
        this.alertManager.generateAlert("suspicious_container_exec", {
          severity: "medium",
          containerId: event.containerId,
          command: event.command,
          user: event.user,
          message: "Suspicious command executed in container",
        });
        break;
      }
    }
  }

  // --- Stubs to be implemented ---
  subscribeToContainerEvents() {
    // return { eventChan: asyncIterable, errChan: asyncIterable }
    throw new Error("subscribeToContainerEvents not implemented");
  }

  async take(chan) {
    // Assume chan is an async iterator
    const { value, done } = await chan.next();
    if (done) return null;
    return value;
  }

  checkPrivilegedExecution(event) {
    // Stub
  }

  monitorResourceLimits(event) {
    // Stub
  }

  validateSecurityContext(event) {
    // Stub
  }

  isTrustedRegistry(image) {
    // Stub: check registry domain
    return image.startsWith("trusted.registry/");
  }

  hasKnownVulnerabilities(image) {
    // Stub
    return false;
  }

  getImageVulnerabilities(image) {
    // Stub
    return [];
  }
}

// --- Example mock clients ---
class MetricsClient {
  counter(name, value, tags) {
    console.log("METRIC:", name, value, tags);
  }
}

class AlertManager {
  generateAlert(type, data) {
    console.log("ALERT:", type, data);
  }
}

```

### Data Loss Prevention (DLP) Monitoring

**Sensitive Data Access Monitoring:**

```sql
-- SQL example for monitoring sensitive data access
-- Create audit log for sensitive data access
CREATE TABLE sensitive_data_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
    record_count INTEGER,
    data_classification VARCHAR(50), -- PII, PHI, FINANCIAL, etc.
    access_pattern VARCHAR(50), -- BULK, INDIVIDUAL, SCAN
    ip_address INET,
    user_agent TEXT,
    query_hash VARCHAR(64), -- Hash of the actual query
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 10)
);

-- Trigger function to audit sensitive data access
CREATE OR REPLACE FUNCTION audit_sensitive_data_access()
RETURNS TRIGGER AS $
BEGIN
    -- Detect bulk data access
    IF TG_OP = 'SELECT' AND FOUND THEN
        INSERT INTO sensitive_data_audit (
            user_id, table_name, operation, record_count, 
            data_classification, access_pattern, risk_score
        ) VALUES (
            current_setting('app.current_user_id', true),
            TG_TABLE_NAME,
            TG_OP,
            1, -- This would be calculated based on result set
            get_table_classification(TG_TABLE_NAME),
            CASE 
                WHEN get_query_record_count() > 1000 THEN 'BULK'
                WHEN get_query_pattern() LIKE '%LIKE%' THEN 'SCAN' 
                ELSE 'INDIVIDUAL'
            END,
            calculate_access_risk_score(current_setting('app.current_user_id', true), TG_TABLE_NAME)
        );
    END IF;
    
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Apply trigger to sensitive tables
CREATE TRIGGER audit_customer_data_access
    AFTER SELECT ON customers
    FOR EACH STATEMENT
    EXECUTE FUNCTION audit_sensitive_data_access();
```

**File and Document Monitoring:**

```javascript
// JavaScript example for document access monitoring
const fs = require("fs");
const path = require("path");

class DocumentSecurityMonitor {
  constructor(dlpEngine, metricsClient, logger) {
    this.dlpEngine = dlpEngine;
    this.metrics = metricsClient;
    this.logger = logger;
    this.fileClassifiers = this.loadClassificationModels();
  }

  // Placeholder for model loading
  loadClassificationModels() {
    return {};
  }

  // Monitor file access and classify
  monitorFileAccess(userId, filePath, operation, contentSample = null) {
    const classification = this.classifyFileContent(filePath, contentSample);

    const accessEvent = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      file_path: this.sanitizeFilePath(filePath),
      operation,
      classification,
      file_size_bytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      risk_score: this.calculateFileAccessRisk(userId, filePath, classification),
    };

    // Record metrics
    this.metrics.counter("dlp.file_access", 1, {
      classification: classification.level,
      operation,
      risk_level: this.getRiskLevel(accessEvent.risk_score),
    });

    // Generate alerts if high risk
    if (accessEvent.risk_score >= 8) {
      this.generateDlpAlert(accessEvent);
    }

    // Structured logging
    this.logger.info("File access monitored", accessEvent);

    return accessEvent;
  }

  // File content classification
  classifyFileContent(filePath, contentSample) {
    const fileExtension = path.extname(filePath).toLowerCase();

    if ([".xlsx", ".csv", ".db"].includes(fileExtension)) {
      const sensitivityIndicators = this.scanForSensitivePatterns(contentSample);

      if (sensitivityIndicators.pii_count > 10) {
        return { level: "HIGH", type: "PII", confidence: 0.9 };
      } else if (sensitivityIndicators.financial_patterns > 5) {
        return { level: "HIGH", type: "FINANCIAL", confidence: 0.85 };
      } else if (sensitivityIndicators.email_count > 20) {
        return { level: "MEDIUM", type: "CONTACT_INFO", confidence: 0.7 };
      }
    }

    return { level: "LOW", type: "GENERAL", confidence: 0.6 };
  }

  // Scan text for sensitive patterns
  scanForSensitivePatterns(content) {
    if (!content) {
      return { pii_count: 0, financial_patterns: 0, email_count: 0 };
    }

    const patterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      credit_card: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      phone: /\b\d{3}[-.]\d{3}[-.]\d{4}\b/g,
      bank_account: /\b\d{8,17}\b/g,
    };

    const results = {};

    for (const [name, regex] of Object.entries(patterns)) {
      const matches = content.match(regex) || [];
      results[`${name}_count`] = matches.length;
    }

    results.pii_count = (results.ssn_count || 0) + (results.phone_count || 0);
    results.financial_patterns =
      (results.credit_card_count || 0) + (results.bank_account_count || 0);
    results.email_count = results.email_count || 0;

    return results;
  }

  // Helpers (placeholders, should be implemented as per your logic)
  sanitizeFilePath(filePath) {
    return filePath.replace(/\\/g, "/"); // normalize for logging
  }

  calculateFileAccessRisk(userId, filePath, classification) {
    // Example: simplistic scoring
    let score = 1;
    if (classification.level === "HIGH") score = 9;
    else if (classification.level === "MEDIUM") score = 6;
    return score;
  }

  getRiskLevel(score) {
    if (score >= 8) return "HIGH";
    if (score >= 5) return "MEDIUM";
    return "LOW";
  }

  generateDlpAlert(accessEvent) {
    this.logger.warn("DLP Alert Generated", accessEvent);
  }
}

module.exports = DocumentSecurityMonitor;

```

### Compliance and Audit Monitoring

**GDPR Compliance Monitoring:**

```javascript
// JavaScript example for GDPR compliance monitoring
class GDPRComplianceMonitor {
    constructor(auditLogger, alertManager) {
        this.auditLogger = auditLogger;
        this.alertManager = alertManager;
        this.dataSubjectRequests = new Map();
    }
    
    // Monitor data subject access requests (Article 15)
    trackDataAccessRequest(userId, requestType, dataCategories) {
        const request = {
            id: this.generateRequestId(),
            userId: userId,
            type: requestType, // ACCESS, PORTABILITY, RECTIFICATION, ERASURE
            dataCategories: dataCategories,
            timestamp: new Date().toISOString(),
            status: 'PENDING',
            dueDate: this.calculateDueDate(requestType) // 30 days for most requests
        };
        
        this.dataSubjectRequests.set(request.id, request);
        
        this.auditLogger.log({
            event: 'gdpr_data_subject_request',
            requestId: request.id,
            userId: userId,
            requestType: requestType,
            dataCategories: dataCategories,
            legalBasis: this.determineLegalBasis(requestType),
            timestamp: request.timestamp
        });
        
        // Set up compliance deadline monitoring
        this.scheduleComplianceCheck(request.id, request.dueDate);
        
        return request.id;
    }
    
    // Monitor data processing activities (Article 30)
    trackDataProcessingActivity(activity) {
        const processingRecord = {
            id: this.generateRecordId(),
            controller: activity.controller,
            processor: activity.processor,
            dataCategories: activity.dataCategories,
            dataSubjectCategories: activity.dataSubjectCategories,
            purposes: activity.purposes,
            legalBasis: activity.legalBasis,
            recipients: activity.recipients,
            thirdCountryTransfers: activity.thirdCountryTransfers,
            retentionPeriod: activity.retentionPeriod,
            securityMeasures: activity.securityMeasures,
            timestamp: new Date().toISOString()
        };
        
        this.auditLogger.log({
            event: 'gdpr_processing_activity',
            ...processingRecord
        });
        
        // Validate legal basis
        this.validateLegalBasis(processingRecord);
        
        return processingRecord.id;
    }
    
    // Monitor consent management (Article 7)
    trackConsentEvent(userId, consentType, action, lawfulBasis) {
        const consentEvent = {
            userId: userId,
            consentType: consentType, // MARKETING, ANALYTICS, COOKIES, etc.
            action: action, // GRANTED, WITHDRAWN, UPDATED
            lawfulBasis: lawfulBasis,
            timestamp: new Date().toISOString(),
            ipAddress: this.getCurrentIP(),
            userAgent: this.getCurrentUserAgent(),
            consentMethod: this.getConsentMethod() // EXPLICIT, IMPLIED, etc.
        };
        
        this.auditLogger.log({
            event: 'gdpr_consent_event',
            ...consentEvent
        });
        
        // Alert on consent withdrawal for critical processing
        if (action === 'WITHDRAWN' && this.isCriticalConsent(consentType)) {
            this.alertManager.generateAlert('critical_consent_withdrawn', {
                userId: userId,
                consentType: consentType,
                severity: 'medium',
                actionRequired: 'Update data processing activities'
            });
        }
    }
    
    // Monitor data retention compliance (Article 5)
    auditDataRetention() {
        const retentionViolations = [];
        
        // Check for data that should be deleted
        const expiredData = this.findExpiredData();
        
        expiredData.forEach(data => {
            retentionViolations.push({
                dataId: data.id,
                dataType: data.type,
                retentionPeriod: data.retentionPeriod,
                expiryDate: data.expiryDate,
                daysOverdue: this.calculateOverdueDays(data.expiryDate),
                legalBasis: data.legalBasis
            });
        });
        
        if (retentionViolations.length > 0) {
            this.alertManager.generateAlert('gdpr_retention_violation', {
                violationCount: retentionViolations.length,
                violations: retentionViolations,
                severity: 'high',
                actionRequired: 'Delete or anonymize expired data'
            });
        }
        
        this.auditLogger.log({
            event: 'gdpr_retention_audit',
            violationCount: retentionViolations.length,
            violations: retentionViolations,
            auditTimestamp: new Date().toISOString()
        });
    }
}
```

**SOX Compliance Monitoring (Financial Systems):**

```javascript
// JavaScript example for SOX compliance monitoring
import EventEmitter from "events";
import cron from "node-cron";

// Mock constants
const SOX_APPROVAL_THRESHOLD = 10000;

// Dependencies (injected)
class SOXComplianceMonitor {
  constructor(auditRepository, complianceReportRepository, alertService) {
    this.auditRepository = auditRepository;
    this.complianceReportRepository = complianceReportRepository;
    this.alertService = alertService;

    // Event bus for listening to domain events
    this.eventBus = new EventEmitter();

    // Listen to financial data changes
    this.eventBus.on("financialDataChange", (event) =>
      this.onFinancialDataChange(event)
    );

    // Schedule quarterly compliance report
    cron.schedule("0 0 1 */3 *", () => this.generateSOXComplianceReport());
  }

  async onFinancialDataChange(event) {
    const auditRecord = {
      transactionId: event.transactionId,
      userId: event.userId,
      changeType: event.changeType,
      tableName: event.tableName,
      recordId: event.recordId,
      oldValue: this.sanitizeFinancialData(event.oldValue),
      newValue: this.sanitizeFinancialData(event.newValue),
      businessJustification: event.businessJustification,
      approverUserId: event.approverUserId,
      timestamp: new Date(),
      ipAddress: this.getCurrentUserIP(),
      applicationName: this.getCurrentApplication(),
    };

    await this.auditRepository.save(auditRecord);

    // Validations
    await this.validateApprovalWorkflow(auditRecord);
    await this.checkSegregationOfDuties(auditRecord);
    await this.detectUnusualFinancialActivity(auditRecord);
  }

  async validateApprovalWorkflow(record) {
    if (record.changeType === "JOURNAL_ENTRY") {
      const amount = this.extractAmount(record.newValue);

      if (amount > SOX_APPROVAL_THRESHOLD && !record.approverUserId) {
        await this.alertService.generateSOXAlert("unapproved_journal_entry", {
          transactionId: record.transactionId,
          amount,
          userId: record.userId,
          severity: "HIGH",
        });
      }
    }
  }

  async checkSegregationOfDuties(record) {
    const userRoles = await this.getUserRoles(record.userId);

    if (
      userRoles.includes("TRANSACTION_CREATOR") &&
      userRoles.includes("TRANSACTION_APPROVER") &&
      record.approverUserId &&
      record.approverUserId === record.userId
    ) {
      await this.alertService.generateSOXAlert(
        "segregation_of_duties_violation",
        {
          userId: record.userId,
          transactionId: record.transactionId,
          violation: "User approved own transaction",
          severity: "CRITICAL",
        }
      );
    }
  }

  async generateSOXComplianceReport() {
    const quarterStart = this.getQuarterStart();
    const quarterEnd = this.getQuarterEnd();

    const report = {
      reportPeriod: `Q${this.getQuarter()} ${this.getYear()}`,
      totalFinancialTransactions: await this.auditRepository.countTransactions(
        quarterStart,
        quarterEnd
      ),
      unapprovedTransactions:
        await this.auditRepository.countUnapprovedTransactions(
          quarterStart,
          quarterEnd
        ),
      segregationViolations:
        await this.auditRepository.countSegregationViolations(
          quarterStart,
          quarterEnd
        ),
      accessControlChanges:
        await this.auditRepository.countAccessControlChanges(
          quarterStart,
          quarterEnd
        ),
      dataIntegrityIssues: await this.auditRepository.countDataIntegrityIssues(
        quarterStart,
        quarterEnd
      ),
      reportGeneratedAt: new Date(),
    };

    await this.complianceReportRepository.save(report);

    if (this.hasComplianceIssues(report)) {
      await this.alertService.generateSOXAlert("quarterly_compliance_issues", {
        reportPeriod: report.reportPeriod,
        issueCount: this.getTotalIssues(report),
        severity: "HIGH",
      });
    }
  }

  // ---------- Helpers (stubs, to be implemented) ----------
  sanitizeFinancialData(data) {
    return data; // e.g., mask sensitive info
  }

  getCurrentUserIP() {
    return "127.0.0.1"; // stub
  }

  getCurrentApplication() {
    return "FinanceApp"; // stub
  }

  extractAmount(newValue) {
    return parseFloat(newValue.amount || 0);
  }

  async getUserRoles(userId) {
    return ["TRANSACTION_CREATOR"]; // stub
  }

  getQuarterStart() {
    return new Date(); // stub
  }

  getQuarterEnd() {
    return new Date(); // stub
  }

  getQuarter() {
    return 3; // stub
  }

  getYear() {
    return new Date().getFullYear();
  }

  hasComplianceIssues(report) {
    return (
      report.unapprovedTransactions > 0 ||
      report.segregationViolations > 0 ||
      report.dataIntegrityIssues > 0
    );
  }

  getTotalIssues(report) {
    return (
      report.unapprovedTransactions +
      report.segregationViolations +
      report.dataIntegrityIssues
    );
  }

  async detectUnusualFinancialActivity(record) {
    // Placeholder: detect anomalies (fraud detection logic)
    return;
  }
}

export default SOXComplianceMonitor;

```

---

## Synthetic Monitoring {#synthetic}

Synthetic monitoring, also known as active monitoring, involves creating artificial transactions that simulate real user interactions with your system. Unlike passive monitoring that observes actual user traffic, synthetic monitoring proactively tests your system's availability and performance from the user's perspective.

### Understanding Synthetic Monitoring

**Core Concept:**
Synthetic monitoring uses automated scripts or robots to simulate user journeys through your application. These synthetic transactions run continuously from various locations, providing consistent baseline measurements of system performance and availability.

**Key Benefits:**
- **Proactive Detection**: Identify issues before real users encounter them
- **Consistent Baseline**: Regular measurements unaffected by user behavior variations
- **Geographic Coverage**: Test performance from multiple global locations
- **24/7 Monitoring**: Continuous testing even during low traffic periods
- **SLA Validation**: Verify service level agreements with objective measurements

### Types of Synthetic Monitoring

**API Monitoring:**
Monitor RESTful APIs, GraphQL endpoints, and web services:

```javascript
// JavaScript example for synthetic API monitoring
import axios from "axios";

class SyntheticTestResult {
  constructor({ testName, success, responseTimeMs, statusCode, errorMessage, timestamp, location }) {
    this.testName = testName;
    this.success = success;
    this.responseTimeMs = responseTimeMs;
    this.statusCode = statusCode;
    this.errorMessage = errorMessage || null;
    this.timestamp = timestamp || Date.now();
    this.location = location || "default";
  }
}

class APISyntheticMonitor {
  constructor(metricsClient, alertManager) {
    this.metrics = metricsClient;
    this.alerts = alertManager;
    this.testDefinitions = this.loadTestDefinitions();
  }

  loadTestDefinitions() {
    // Placeholder: load tests from config, DB, or file
    return [];
  }

  async runApiTest(testConfig) {
    const start = Date.now();
    let testResult;

    try {
      // Prepare headers
      const headers = {
        ...(testConfig.headers || {}),
        "User-Agent": "SyntheticMonitor/1.0",
        "X-Synthetic-Test": "true",
      };

      // Execute request
      const response = await axios.request({
        method: testConfig.method,
        url: testConfig.url,
        headers,
        data: testConfig.payload,
        params: testConfig.query_params,
        timeout: (testConfig.timeout || 30) * 1000,
        httpsAgent: { rejectUnauthorized: testConfig.verify_ssl !== false },
      });

      const responseTime = Date.now() - start;

      // Validate response
      const validationResult = this.validateResponse(response, testConfig);

      testResult = new SyntheticTestResult({
        testName: testConfig.name,
        success: validationResult.success,
        responseTimeMs: responseTime,
        statusCode: response.status,
        errorMessage: validationResult.error,
        timestamp: Date.now(),
        location: testConfig.location || "default",
      });
    } catch (error) {
      const responseTime = Date.now() - start;
      testResult = new SyntheticTestResult({
        testName: testConfig.name,
        success: false,
        responseTimeMs: responseTime,
        statusCode: error.response ? error.response.status : 0,
        errorMessage: error.message,
        timestamp: Date.now(),
        location: testConfig.location || "default",
      });
    }

    // Record metrics & handle alerts
    this.recordTestMetrics(testResult);
    this.handleTestResult(testResult, testConfig);

    return testResult;
  }

  validateResponse(response, testConfig) {
    const validations = testConfig.validations || [];

    for (const validation of validations) {
      if (validation.type === "status_code") {
        const expected = validation.expected;
        if (!expected.includes(response.status)) {
          return {
            success: false,
            error: `Expected status ${expected}, got ${response.status}`,
          };
        }
      }

      if (validation.type === "response_time") {
        const maxTime = validation.max_ms;
        const actualTime = response.elapsedTime || 0; // axios doesn’t provide this natively
        if (actualTime > maxTime) {
          return {
            success: false,
            error: `Response time ${actualTime}ms exceeds limit ${maxTime}ms`,
          };
        }
      }

      if (validation.type === "json_path") {
        try {
          const data = response.data;
          const path = validation.path.split(".");
          let value = data;
          for (const p of path) {
            value = value?.[p];
          }

          const expectedValue = validation.expected;
          if (expectedValue === "not_null" && (value === null || value === undefined)) {
            return {
              success: false,
              error: `JSON path ${validation.path}: expected not_null, got ${value}`,
            };
          } else if (expectedValue !== "not_null" && value !== expectedValue) {
            return {
              success: false,
              error: `JSON path ${validation.path}: expected ${expectedValue}, got ${value}`,
            };
          }
        } catch (err) {
          return {
            success: false,
            error: `JSON validation failed: ${err.message}`,
          };
        }
      }
    }

    return { success: true };
  }

  recordTestMetrics(result) {
    const tags = {
      test_name: result.testName,
      location: result.location,
      success: String(result.success),
    };

    this.metrics.histogram("synthetic.api.response_time", result.responseTimeMs, tags);
    this.metrics.counter("synthetic.api.tests", 1, tags);
    this.metrics.gauge("synthetic.api.availability", result.success ? 1 : 0, tags);
  }

  handleTestResult(result, testConfig) {
    // TODO: implement alerting logic (Slack, PagerDuty, etc.)
    if (!result.success) {
      this.alerts.sendAlert({
        test: testConfig.name,
        message: result.errorMessage,
        location: result.location,
      });
    }
  }
}

// Example usage
const apiTestConfig = {
  name: "user_login_api",
  method: "POST",
  url: "https://api.example.com/auth/login",
  headers: { "Content-Type": "application/json" },
  payload: {
    username: "synthetic_test_user",
    password: "test_password_123",
  },
  timeout: 10,
  location: "us-east-1",
  validations: [
    { type: "status_code", expected: [200] },
    { type: "response_time", max_ms: 2000 },
    { type: "json_path", path: "data.token", expected: "not_null" },
  ],
  frequency_minutes: 5,
};

const monitor = new APISyntheticMonitor(metricsClient, alertManager);
monitor.runApiTest(apiTestConfig);
```

**Web Application Monitoring:**
Simulate real user interactions with web applications:

```javascript
// JavaScript example using Puppeteer for web app synthetic monitoring
const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

class WebSyntheticMonitor {
    constructor(metricsClient, alertManager) {
        this.metrics = metricsClient;
        this.alerts = alertManager;
        this.browserPool = [];
    }
    
    async runWebJourney(journeyConfig) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        try {
            // Configure page for monitoring
            await this.setupPageMonitoring(page);
            
            const startTime = performance.now();
            const result = await this.executeJourney(page, journeyConfig);
            const totalTime = performance.now() - startTime;
            
            result.totalDurationMs = totalTime;
            result.timestamp = new Date().toISOString();
            result.location = journeyConfig.location || 'default';
            
            // Record metrics
            await this.recordWebMetrics(result);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                location: journeyConfig.location || 'default'
            };
        } finally {
            await page.close();
            await this.returnBrowser(browser);
        }
    }
    
    async setupPageMonitoring(page) {
        // Monitor network requests
        await page.setRequestInterception(true);
        const requests = [];
        
        page.on('request', request => {
            requests.push({
                url: request.url(),
                method: request.method(),
                startTime: Date.now()
            });
            request.continue();
        });
        
        page.on('response', response => {
            const request = requests.find(r => r.url === response.url());
            if (request) {
                request.status = response.status();
                request.responseTime = Date.now() - request.startTime;
            }
        });
        
        // Monitor JavaScript errors
        page.on('pageerror', error => {
            console.error('Page error:', error.message);
        });
        
        // Monitor console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });
        
        return { requests };
    }
    
    async executeJourney(page, config) {
        const steps = config.steps;
        const stepResults = [];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepStartTime = performance.now();
            
            try {
                const stepResult = await this.executeStep(page, step);
                stepResult.duration = performance.now() - stepStartTime;
                stepResult.stepIndex = i;
                stepResults.push(stepResult);
                
                if (!stepResult.success) {
                    return {
                        success: false,
                        failedStep: i,
                        error: stepResult.error,
                        steps: stepResults
                    };
                }
                
            } catch (error) {
                return {
                    success: false,
                    failedStep: i,
                    error: error.message,
                    steps: stepResults
                };
            }
        }
        
        return {
            success: true,
            steps: stepResults
        };
    }
    
    async executeStep(page, step) {
        switch (step.type) {
            case 'navigate':
                await page.goto(step.url, { waitUntil: 'networkidle2' });
                return { success: true, type: 'navigate', url: step.url };
                
            case 'click':
                await page.waitForSelector(step.selector, { timeout: 10000 });
                await page.click(step.selector);
                return { success: true, type: 'click', selector: step.selector };
                
            case 'type':
                await page.waitForSelector(step.selector, { timeout: 10000 });
                await page.type(step.selector, step.text);
                return { success: true, type: 'type', selector: step.selector };
                
            case 'wait_for_element':
                await page.waitForSelector(step.selector, { 
                    timeout: step.timeout || 10000 
                });
                return { success: true, type: 'wait_for_element', selector: step.selector };
                
            case 'assert_text':
                await page.waitForSelector(step.selector, { timeout: 10000 });
                const text = await page.$eval(step.selector, el => el.textContent);
                const textMatches = text.includes(step.expectedText);
                
                if (!textMatches) {
                    throw new Error(`Expected text "${step.expectedText}" not found. Actual: "${text}"`);
                }
                
                return { 
                    success: true, 
                    type: 'assert_text', 
                    expected: step.expectedText,
                    actual: text 
                };
                
            case 'measure_performance':
                const performanceMetrics = await page.evaluate(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    return {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                    };
                });
                
                return {
                    success: true,
                    type: 'measure_performance',
                    metrics: performanceMetrics
                };
                
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }
    
    async recordWebMetrics(result) {
        const tags = {
            journey: result.journeyName || 'unknown',
            location: result.location,
            success: result.success.toString()
        };
        
        // Record overall journey metrics
        this.metrics.histogram('synthetic.web.journey_duration', 
                             result.totalDurationMs, tags);
        this.metrics.counter('synthetic.web.journeys', 1, tags);
        
        // Record step-level metrics
        if (result.steps) {
            result.steps.forEach((step, index) => {
                const stepTags = { ...tags, step_type: step.type, step_index: index.toString() };
                this.metrics.histogram('synthetic.web.step_duration', 
                                     step.duration, stepTags);
            });
        }
        
        // Record performance metrics if available
        const perfStep = result.steps?.find(s => s.type === 'measure_performance');
        if (perfStep && perfStep.metrics) {
            const perfMetrics = perfStep.metrics;
            const perfTags = { ...tags };
            
            this.metrics.histogram('synthetic.web.load_time', 
                                 perfMetrics.loadTime, perfTags);
            this.metrics.histogram('synthetic.web.first_contentful_paint', 
                                 perfMetrics.firstContentfulPaint, perfTags);
        }
    }
}

// Example web journey configuration
const webJourneyConfig = {
    name: "user_registration_flow",
    location: "us-west-2",
    steps: [
        {
            type: "navigate",
            url: "https://app.example.com/signup"
        },
        {
            type: "wait_for_element",
            selector: "#signup-form"
        },
        {
            type: "type",
            selector: "#email",
            text: "synthetic.test@example.com"
        },
        {
            type: "type",
            selector: "#password",
            text: "TestPassword123!"
        },
        {
            type: "click",
            selector: "#signup-button"
        },
        {
            type: "wait_for_element",
            selector: ".welcome-message",
            timeout: 15000
        },
        {
            type: "assert_text",
            selector: ".welcome-message",
            expectedText: "Welcome to our platform"
        },
        {
            type: "measure_performance"
        }
    ],
    frequency_minutes: 10,
    timeout_minutes: 5
};
```

**Database Connectivity Monitoring:**

```sql
-- SQL example for database synthetic monitoring
-- Create synthetic monitoring stored procedures
CREATE OR REPLACE FUNCTION synthetic_database_health_check()
RETURNS TABLE(
    check_name VARCHAR(50),
    success BOOLEAN,
    duration_ms INTEGER,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE
) AS $
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    duration INTEGER;
    error_msg TEXT;
BEGIN
    -- Test 1: Basic connectivity and response time
    start_time := clock_timestamp();
    BEGIN
        PERFORM 1;
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY SELECT 'basic_connectivity'::VARCHAR(50), TRUE, duration, NULL::TEXT, clock_timestamp();
    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        
        RETURN QUERY SELECT 'basic_connectivity'::VARCHAR(50), FALSE, duration, error_msg, clock_timestamp();
    END;
    
    -- Test 2: Table access performance
    start_time := clock_timestamp();
    BEGIN
        PERFORM COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day';
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY SELECT 'table_access'::VARCHAR(50), TRUE, duration, NULL::TEXT, clock_timestamp();
    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        
        RETURN QUERY SELECT 'table_access'::VARCHAR(50), FALSE, duration, error_msg, clock_timestamp();
    END;
    
    -- Test 3: Write operation performance
    start_time := clock_timestamp();
    BEGIN
        INSERT INTO synthetic_test_log (test_run_id, test_type, timestamp) 
        VALUES (gen_random_uuid(), 'health_check', clock_timestamp());
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY SELECT 'write_operation'::VARCHAR(50), TRUE, duration, NULL::TEXT, clock_timestamp();
    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        
        RETURN QUERY SELECT 'write_operation'::VARCHAR(50), FALSE, duration, error_msg, clock_timestamp();
    END;
    
    -- Test 4: Complex query performance
    start_time := clock_timestamp();
    BEGIN
        PERFORM 
            u.id,
            COUNT(o.id) as order_count,
            SUM(o.total_amount) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id 
        WHERE u.created_at > NOW() - INTERVAL '7 days'
        GROUP BY u.id
        HAVING COUNT(o.id) > 0
        LIMIT 100;
        
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        RETURN QUERY SELECT 'complex_query'::VARCHAR(50), TRUE, duration, NULL::TEXT, clock_timestamp();
    EXCEPTION WHEN OTHERS THEN
        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        
        RETURN QUERY SELECT 'complex_query'::VARCHAR(50), FALSE, duration, error_msg, clock_timestamp();
    END;
    
    RETURN;
END;
$ LANGUAGE plpgsql;

-- Create table for synthetic test logging
CREATE TABLE IF NOT EXISTS synthetic_test_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id UUID NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Multi-Location Synthetic Monitoring

**Geographic Distribution Strategy:**

```yaml
# Example configuration for multi-location synthetic monitoring
synthetic_monitoring:
  global_configuration:
    user_agent: "SyntheticMonitor/2.0"
    timeout_seconds: 30
    retry_attempts: 3
    alert_threshold_failures: 3
    
  locations:
    - name: "us-east-1"
      region: "North America"
      provider: "AWS"
      endpoint: "https://synthetic-us-east-1.monitoring.company.com"
      
    - name: "us-west-2" 
      region: "North America"
      provider: "AWS"
      endpoint: "https://synthetic-us-west-2.monitoring.company.com"
      
    - name: "eu-west-1"
      region: "Europe"
      provider: "AWS"
      endpoint: "https://synthetic-eu-west-1.monitoring.company.com"
      
    - name: "ap-southeast-1"
      region: "Asia Pacific"
      provider: "AWS" 
      endpoint: "https://synthetic-ap-southeast-1.monitoring.company.com"
  
  test_suites:
    - name: "api_health_checks"
      type: "api"
      frequency_minutes: 5
      locations: ["us-east-1", "eu-west-1", "ap-southeast-1"]
      tests:
        - name: "login_api"
          method: "POST"
          url: "https://api.company.com/auth/login"
          expected_status: [200]
          max_response_time_ms: 2000
          
        - name: "user_profile_api"
          method: "GET" 
          url: "https://api.company.com/users/profile"
          headers:
            Authorization: "Bearer ${synthetic_token}"
          expected_status: [200]
          max_response_time_ms: 1500
    
    - name: "web_user_journeys"
      type: "browser"
      frequency_minutes: 15
      locations: ["us-east-1", "eu-west-1"]
      tests:
        - name: "checkout_flow"
          max_duration_minutes: 5
          steps:
            - navigate: "https://shop.company.com"
            - click: ".product-card:first-child"
            - click: "#add-to-cart"
            - navigate: "https://shop.company.com/cart"
            - click: "#checkout-button"
            - assert_element_present: "#payment-form"
```

**Synthetic Monitoring Orchestration:**

```javascript
class SyntheticOrchestrator {
  constructor({ testRunners, scheduler, metricsClient, alertManager, locations }) {
    this.testRunners = testRunners; // Map of testType -> runner
    this.scheduler = scheduler;
    this.metrics = metricsClient;
    this.alerts = alertManager;
    this.locations = locations; // Array of Location objects
    this.recentResults = {}; // To track recent results per test/location
  }

  async startMonitoring() {
    // Start monitoring for each location
    const locationMonitors = this.locations.map(loc => this.runLocationMonitoring(loc));
    
    // Start result aggregation (could be implemented if needed)
    const aggregation = this.runResultAggregation();

    await Promise.all([...locationMonitors, aggregation]);
  }

  async runLocationMonitoring(location) {
    const interval = 60 * 1000; // 1 min
    const monitorLoop = async () => {
      while (true) {
        const scheduledTests = this.scheduler.getScheduledTests(location, new Date());
        for (const test of scheduledTests) {
          this.executeTest(test, location).catch(console.error);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    };
    await monitorLoop();
  }

  async executeTest(test, location) {
    const runner = this.testRunners[test.type];
    if (!runner) {
      this.recordTestError(test, location, new Error(`No runner for test type ${test.type}`));
      return;
    }

    try {
      const start = Date.now();
      const result = await runner.runTest(test, location); // runner should return { success, durationMs, error, metrics }
      result.TestName = test.name;
      result.Location = location.name || "default";
      result.Duration = Date.now() - start;
      result.Timestamp = new Date();

      this.recordTestResult(result);
      this.evaluateAlerts(result, test);
    } catch (err) {
      this.recordTestError(test, location, err);
    }
  }

  recordTestResult(result) {
    const tags = {
      test_name: result.TestName,
      location: result.Location,
      success: String(result.Success),
    };

    this.metrics.histogram("synthetic.test.duration", result.Duration, tags);
    this.metrics.gauge("synthetic.test.success_rate", result.Success ? 1 : 0, tags);
    this.metrics.counter("synthetic.test.executions", 1, tags);

    if (result.Metrics?.CustomMetrics) {
      for (const [name, value] of Object.entries(result.Metrics.CustomMetrics)) {
        this.metrics.gauge(`synthetic.custom.${name}`, value, tags);
      }
    }

    // Store recent results for alert evaluation
    const key = `${result.TestName}:${result.Location}`;
    if (!this.recentResults[key]) this.recentResults[key] = [];
    this.recentResults[key].unshift(result);
    this.recentResults[key] = this.recentResults[key].slice(0, 20); // keep last 20 results
  }

  evaluateAlerts(result, test) {
    const key = `${result.TestName}:${result.Location}`;
    const recentResults = this.recentResults[key] || [];

    // Consecutive failures
    let consecutiveFailures = 0;
    for (const r of recentResults) {
      if (!r.Success) consecutiveFailures++;
      else break;
    }

    if (consecutiveFailures >= test.AlertThreshold) {
      this.alerts.fire("synthetic_test_failing", {
        TestName: result.TestName,
        Location: result.Location,
        ConsecutiveFailures: consecutiveFailures,
        LastError: result.Error,
        Severity: this.calculateSeverity(test, consecutiveFailures),
      });
    }

    // Performance degradation
    if (result.Success) {
      const successfulResults = recentResults.filter(r => r.Success);
      const avgResponseTime =
        successfulResults.reduce((sum, r) => sum + r.Duration, 0) / (successfulResults.length || 1);
      const currentResponseTime = result.Duration;

      if (currentResponseTime > avgResponseTime * 2) {
        this.alerts.fire("synthetic_performance_degradation", {
          TestName: result.TestName,
          Location: result.Location,
          CurrentResponseTime: currentResponseTime,
          AverageResponseTime: avgResponseTime,
          DegradationFactor: currentResponseTime / avgResponseTime,
          Severity: "medium",
        });
      }
    }
  }

  calculateSeverity(test, consecutiveFailures) {
    const baseSeverity = test.CriticalityLevel; // "low", "medium", "high", "critical"

    if (consecutiveFailures >= 10) {
      return baseSeverity === "high" || baseSeverity === "critical" ? "critical" : "high";
    }
    if (consecutiveFailures >= 5) {
      return baseSeverity === "low" ? "medium" : "high";
    }
    return baseSeverity;
  }

  recordTestError(test, location, error) {
    const result = {
      TestName: test.name,
      Location: location.name || "default",
      Success: false,
      Duration: 0,
      Error: error.message,
      Metrics: { CustomMetrics: {} },
      Timestamp: new Date(),
    };
    this.recordTestResult(result);
  }

  async runResultAggregation() {
    // Placeholder: implement aggregation logic if needed
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // every 5 mins
    }
  }

  getRecentResults(testName, location, count) {
    const key = `${testName}:${location}`;
    return (this.recentResults[key] || []).slice(0, count);
  }

  getAverageResponseTime(testName, location, count) {
    const recent = this.getRecentResults(testName, location, count).filter(r => r.Success);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, r) => sum + r.Duration, 0) / recent.length;
  }
}

export default SyntheticOrchestrator;


```

### Advanced Synthetic Monitoring Patterns

**Chained Transaction Monitoring:**
Monitor complex business processes that span multiple services:

```javascript
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';

class ChainedTransactionMonitor {
  constructor(metricsClient) {
    this.metrics = metricsClient;
    this.transactionResults = {};
  }

  generateChainId() {
    return `chain_${uuidv4().slice(0, 8)}_${Math.floor(Date.now() / 1000)}`;
  }

  async executeTransactionChain(chainConfig) {
    const chainId = this.generateChainId();
    const chainResult = {
      chainId,
      chainName: chainConfig.name,
      transactions: [],
      overallSuccess: true,
      startTime: performance.now(),
      context: {}, // Shared context
    };

    console.info(`Starting transaction chain: ${chainConfig.name} (ID: ${chainId})`);

    for (const transactionConfig of chainConfig.transactions) {
      console.info(`Executing transaction: ${transactionConfig.name}`);

      const transactionResult = await this.executeTransaction(transactionConfig, chainResult.context);
      chainResult.transactions.push(transactionResult);

      if (!transactionResult.success) {
        chainResult.overallSuccess = false;
        console.error(`Transaction failed: ${transactionConfig.name}`);

        if (transactionConfig.critical ?? true) {
          console.error('Critical transaction failed, aborting chain');
          break;
        }
      }

      if (transactionResult.contextUpdates) {
        Object.assign(chainResult.context, transactionResult.contextUpdates);
      }

      if (transactionConfig.delaySeconds) {
        await new Promise(resolve => setTimeout(resolve, transactionConfig.delaySeconds * 1000));
      }
    }

    chainResult.endTime = performance.now();
    chainResult.totalDuration = chainResult.endTime - chainResult.startTime;

    this.recordChainMetrics(chainResult);

    console.info(`Chain completed: ${chainConfig.name}, Success: ${chainResult.overallSuccess}, Duration: ${(chainResult.totalDuration / 1000).toFixed(2)}s`);
    return chainResult;
  }

  async executeTransaction(transactionConfig, context) {
    switch (transactionConfig.type) {
      case 'api_call':
        return await this.executeApiTransaction(transactionConfig, context);
      case 'database_operation':
        return await this.executeDatabaseTransaction(transactionConfig, context);
      case 'message_queue':
        return await this.executeMessageTransaction(transactionConfig, context);
      default:
        throw new Error(`Unknown transaction type: ${transactionConfig.type}`);
    }
  }

  substituteContextVariables(template, context) {
    if (typeof template === 'string') {
      for (const [key, value] of Object.entries(context)) {
        template = template.replace(`\${${key}}`, String(value));
      }
      return template;
    } else if (Array.isArray(template)) {
      return template.map(item => this.substituteContextVariables(item, context));
    } else if (typeof template === 'object' && template !== null) {
      const result = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.substituteContextVariables(value, context);
      }
      return result;
    }
    return template;
  }

  extractFromJson(data, jsonPath) {
    // Simple JSONPath: $.data.order_id
    const pathParts = jsonPath.replace('$.', '').split('.');
    let current = data;
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  async executeApiTransaction(config, context) {
    const url = this.substituteContextVariables(config.url, context);
    const payload = this.substituteContextVariables(config.payload ?? {}, context);
    const headers = this.substituteContextVariables(config.headers ?? {}, context);
    const start = performance.now();

    try {
      const response = await axios({
        method: config.method,
        url,
        data: payload,
        headers,
        timeout: config.timeout ?? 30000,
        validateStatus: () => true, // prevent axios from throwing on non-2xx
      });

      const end = performance.now();
      const success = (config.expectedStatusCodes ?? [200]).includes(response.status);

      const result = {
        transactionName: config.name,
        type: 'api_call',
        success,
        statusCode: response.status,
        responseTime: end - start,
        startTime: start,
        endTime: end,
        url,
      };

      if (config.contextExtractions && typeof response.data === 'object') {
        const contextUpdates = {};
        for (const [key, path] of Object.entries(config.contextExtractions)) {
          const value = this.extractFromJson(response.data, path);
          if (value !== null) contextUpdates[key] = value;
        }
        result.contextUpdates = contextUpdates;
      }

      return result;
    } catch (error) {
      const end = performance.now();
      return {
        transactionName: config.name,
        type: 'api_call',
        success: false,
        error: error.message,
        responseTime: end - start,
        startTime: start,
        endTime: end,
        url,
      };
    }
  }

  async executeDatabaseTransaction(config, context) {
    const start = performance.now();
    // Substitute variables
    const query = this.substituteContextVariables(config.query, context);
    const params = this.substituteContextVariables(config.parameters ?? [], context);

    try {
      // Simulate DB operation (replace with real db client)
      await new Promise(resolve => setTimeout(resolve, 100)); // simulate latency
      const rowsAffected = Math.floor(Math.random() * 5); // simulated

      const end = performance.now();
      const result = {
        transactionName: config.name,
        type: 'database_operation',
        success: true,
        rowsAffected,
        responseTime: end - start,
        startTime: start,
        endTime: end,
      };

      if (config.contextExtractions && rowsAffected > 0) {
        const contextUpdates = {};
        for (const [key, column] of Object.entries(config.contextExtractions)) {
          contextUpdates[key] = `${column}_simulated_value`;
        }
        result.contextUpdates = contextUpdates;
      }

      return result;
    } catch (error) {
      const end = performance.now();
      return {
        transactionName: config.name,
        type: 'database_operation',
        success: false,
        error: error.message,
        responseTime: end - start,
        startTime: start,
        endTime: end,
      };
    }
  }

  async executeMessageTransaction(config, context) {
    const start = performance.now();
    try {
      const messageData = this.substituteContextVariables(config.message, context);
      const queueName = this.substituteContextVariables(config.queue, context);

      await new Promise(resolve => setTimeout(resolve, (config.processingDelay ?? 0.1) * 1000));

      const end = performance.now();
      const result = {
        transactionName: config.name,
        type: 'message_queue',
        success: true,
        queue: queueName,
        responseTime: end - start,
        startTime: start,
        endTime: end,
      };

      if (config.contextExtractions) {
        const contextUpdates = {};
        for (const key of Object.keys(config.contextExtractions)) {
          contextUpdates[key] = `msg_${uuidv4().slice(0, 8)}`;
        }
        result.contextUpdates = contextUpdates;
      }

      return result;
    } catch (error) {
      const end = performance.now();
      return {
        transactionName: config.name,
        type: 'message_queue',
        success: false,
        error: error.message,
        responseTime: end - start,
        startTime: start,
        endTime: end,
      };
    }
  }

  recordChainMetrics(chainResult) {
    const chainName = chainResult.chainName;
    const success = chainResult.overallSuccess;
    const duration = chainResult.totalDuration;

    this.metrics.gauge('synthetic.chain.duration', duration, [`chain:${chainName}`]);
    this.metrics.increment('synthetic.chain.executions', [`chain:${chainName}`, `success:${success}`]);

    for (const txn of chainResult.transactions) {
      this.metrics.gauge('synthetic.transaction.response_time', txn.responseTime, [
        `transaction:${txn.transactionName}`,
        `type:${txn.type}`,
      ]);
      this.metrics.increment('synthetic.transaction.executions', [
        `transaction:${txn.transactionName}`,
        `type:${txn.type}`,
        `success:${txn.success}`,
      ]);
    }
  }
}

export default ChainedTransactionMonitor;


```