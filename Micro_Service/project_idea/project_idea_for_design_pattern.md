# HR360 — A Complete Microservices Project

### Where Every Design Pattern You Learned Comes to Life

---

## The Project Idea

You are building **HR360** — a production-grade Human Resource Management System. Companies use this system to manage their employees, track attendance, handle leave applications, process payroll, run performance reviews, and generate HR reports. The whole system is built as a microservices architecture running on Go, PostgreSQL, Kafka, gRPC, Redis, Docker, and everything else in your stack.

This is not a toy project. This is the kind of system that a company of 500 to 5,000 employees actually uses every day. It has real complexity, real data relationships, real business rules, and real operational requirements. Every single design pattern you studied in this conversation fits naturally into this system — not forced, not contrived, but exactly where it belongs.

The beauty of an HR system as a learning project is that it has every category of microservice problem. It has simple CRUD services (Employee Service). It has complex multi-step business processes that span multiple services (leave applications, payroll processing). It has services that need rich reporting and querying (Reporting Service). It has services that need complete audit history (Compliance Service). It has real-time requirements (notification delivery). It has high-stakes financial operations (payroll) that cannot tolerate duplicates. Every pattern you learned was designed for exactly these situations.

---

## The Services

Before the folder structure, you need to understand what each service does and why it exists. The system has nine services plus supporting infrastructure.

The **Employee Service** is the source of truth for all employee data — personal information, employment status, department assignments, reporting relationships. This is the most referenced service in the system. Every other service that needs employee information either calls this service via gRPC or consumes its events.

The **Leave Service** manages the complete leave application lifecycle — submission, approval routing, status tracking, and history. This service has the richest state machine in the system. A leave application moves through PENDING, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED, and TAKEN states, with different actors (employee, manager, HR) able to trigger transitions at different points.

The **Leave Balance Service** tracks how many leave days each employee has available, used, and carried forward. It is updated by events from the Leave Service and the Payroll Service (which grants annual leave allocations). Balance calculations must be exactly right — there can be no double deductions.

The **Approval Service** manages the workflow for decisions that need human approval — leave applications, expense claims, payroll runs. It knows who needs to approve what, sends reminders, handles delegation when approvers are on leave, and records every approval decision with full audit metadata.

The **Attendance Service** tracks daily attendance — clock-in, clock-out, late arrivals, early departures. It integrates with biometric devices via webhooks and computes overtime hours that feed into payroll.

The **Payroll Service** is the most financially sensitive service. It computes salaries based on attendance data, leave deductions, overtime, bonuses, and deductions. It generates payslips and initiates bank transfers. A payroll run is a saga involving the Attendance Service, Leave Balance Service, and an external bank API. Nothing here can be processed twice.

The **Notification Service** sends emails, SMS, and in-app notifications. It is a pure consumer — it never initiates notifications on its own. It consumes events from every other service and decides what communication to send.

The **Reporting Service** is a read-only service that answers complex analytical queries — headcount trends, leave utilization, payroll expense by department, attrition rates. It maintains pre-built read models (projections) fed by events from all other services.

The **API Gateway** is the single entry point for all client traffic. It handles authentication, rate limiting, routing, and circuit breaking. No service is exposed directly to clients.

---

## The Complete Folder and File Structure

```
hr360/
│
├── docker-compose.yml                  ← All services + infrastructure
├── docker-compose.dev.yml              ← Local development overrides
├── Makefile                            ← Build, test, run commands
├── .env.example                        ← Environment variable template
├── README.md
│
├── proto/                              ← Shared Protobuf definitions (ALL gRPC contracts)
│   ├── employee/
│   │   ├── employee_command.proto      ← Write operations (HireEmployee, UpdateEmployee)
│   │   └── employee_query.proto        ← Read operations (GetEmployee, ListEmployees)
│   ├── leave/
│   │   ├── leave_command.proto         ← SubmitLeave, ApproveLeave, RejectLeave
│   │   └── leave_query.proto           ← GetLeave, ListLeaves, GetLeaveHistory
│   ├── leave_balance/
│   │   └── leave_balance.proto
│   ├── approval/
│   │   └── approval.proto
│   ├── attendance/
│   │   └── attendance.proto
│   ├── payroll/
│   │   ├── payroll_command.proto
│   │   └── payroll_query.proto
│   ├── notification/
│   │   └── notification.proto
│   └── reporting/
│       └── reporting.proto
│
├── pkg/                                ← Shared Go packages used by ALL services
│   ├── idempotency/                    ← ★ IDEMPOTENCY PATTERN
│   │   ├── key.go                      ← IdempotencyKey GORM model
│   │   ├── grpc_interceptor.go         ← gRPC server interceptor for deduplication
│   │   ├── http_middleware.go          ← HTTP middleware for client-facing idempotency
│   │   └── cleanup.go                  ← Cleanup worker for expired keys
│   │
│   ├── outbox/                         ← ★ OUTBOX PATTERN
│   │   ├── event.go                    ← OutboxEvent GORM model
│   │   ├── publisher.go                ← Writes events into outbox within a transaction
│   │   ├── worker.go                   ← Polls outbox table, publishes to Kafka
│   │   ├── distributed_worker.go       ← Redis-locked worker for multi-instance safety
│   │   └── cleanup.go                  ← Cleanup worker for old published events
│   │
│   ├── inbox/                          ← ★ TRANSACTIONAL INBOX PATTERN
│   │   ├── message.go                  ← InboxMessage GORM model
│   │   ├── consumer.go                 ← Kafka consumer: reads and writes to inbox table
│   │   ├── processor.go                ← Processes inbox messages with handler registry
│   │   ├── registry.go                 ← Handler registration (init() pattern)
│   │   ├── dead_letter.go              ← Moves failed messages to dead letter table
│   │   └── recovery.go                 ← Resets stuck PROCESSING messages to PENDING
│   │
│   ├── dlq/                            ← ★ DEAD LETTER QUEUE PATTERN
│   │   ├── envelope.go                 ← DLQ message envelope with failure metadata
│   │   ├── consumer_wrapper.go         ← Wraps handlers with retry + DLQ routing
│   │   ├── monitor.go                  ← Watches DLQ topics, stores records, alerts
│   │   ├── replayer.go                 ← Replays DLQ messages back to original topics
│   │   └── admin_api.go                ← HTTP admin API for DLQ management
│   │
│   ├── circuitbreaker/                 ← ★ CIRCUIT BREAKER PATTERN
│   │   ├── breaker.go                  ← Custom circuit breaker implementation
│   │   ├── observable_breaker.go       ← Circuit breaker with OTel metrics
│   │   └── config.go                   ← Per-service circuit breaker configurations
│   │
│   ├── saga/                           ← ★ SAGA PATTERN (shared orchestrator base)
│   │   ├── state.go                    ← SagaState GORM model (base fields)
│   │   ├── orchestrator.go             ← Base orchestrator with step management
│   │   └── step.go                     ← SagaStep definition (command + compensation)
│   │
│   ├── eventstore/                     ← ★ EVENT SOURCING PATTERN (shared)
│   │   ├── event.go                    ← EventStore GORM model (append-only table)
│   │   ├── repository.go               ← Load (replay) and Save (append) aggregates
│   │   ├── snapshot.go                 ← Snapshot model and snapshot repository
│   │   └── kafka_relay.go              ← Publishes event store events to Kafka
│   │
│   ├── telemetry/                      ← ★ SIDECAR PATTERN (OTel integration)
│   │   ├── tracer.go                   ← OTel TracerProvider setup (sends to localhost:4317)
│   │   ├── metrics.go                  ← OTel MeterProvider setup
│   │   └── middleware.go               ← gRPC interceptors for trace propagation
│   │
│   ├── logging/                        ← ★ SIDECAR PATTERN (log shipping)
│   │   └── logger.go                   ← JSON logger writing to file (Fluent Bit picks up)
│   │
│   ├── health/                         ← Health check utilities
│   │   └── checker.go                  ← DB + Kafka health check functions
│   │
│   └── config/                         ← Shared configuration loading
│       ├── config.go                   ← Reads env vars and /etc/secrets/ files
│       └── secrets.go                  ← Reads Vault-injected secret files + SIGHUP reload
│
├── services/
│   │
│   ├── employee-service/               ← Source of truth for all employee data
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go                 ← Wires everything together, starts gRPC server
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── employee.go         ← Employee aggregate (pure business logic)
│   │   │   │   └── events.go           ← EmployeeHired, EmployeeUpdated, etc.
│   │   │   ├── commands/
│   │   │   │   ├── handler.go          ← ★ CQRS: Command handler (write side)
│   │   │   │   └── commands.go         ← HireEmployee, UpdateEmployee command structs
│   │   │   ├── queries/
│   │   │   │   ├── handler.go          ← ★ CQRS: Query handler (read side)
│   │   │   │   └── read_models.go      ← EmployeeDetailView, EmployeeListView
│   │   │   ├── projections/
│   │   │   │   └── employee_summary.go ← ★ CQRS: Builds read model from events
│   │   │   ├── grpc/
│   │   │   │   ├── command_server.go   ← gRPC server for command proto
│   │   │   │   └── query_server.go     ← gRPC server for query proto
│   │   │   └── repository/
│   │   │       └── employee_repo.go    ← GORM repository for write model
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── leave-service/                  ← Leave application lifecycle management
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── leave_aggregate.go  ← ★ EVENT SOURCING: Leave aggregate
│   │   │   │   │                           Apply(), Submit(), Approve(), Reject()
│   │   │   │   └── events.go           ← LeaveSubmitted, LeaveApproved, etc.
│   │   │   ├── commands/
│   │   │   │   ├── handler.go          ← ★ CQRS: Handles write commands
│   │   │   │   └── commands.go         ← SubmitLeave, ApproveLeave command structs
│   │   │   ├── queries/
│   │   │   │   ├── handler.go          ← ★ CQRS: Queries read models
│   │   │   │   └── read_models.go      ← LeaveDetailView, LeaveSummaryView
│   │   │   ├── projections/
│   │   │   │   ├── leave_summary.go    ← ★ CQRS: Builds LeaveDetailView from events
│   │   │   │   └── leave_calendar.go   ← ★ CQRS: Explodes date ranges for calendar
│   │   │   ├── repository/
│   │   │   │   └── leave_event_repo.go ← ★ EVENT SOURCING: Load/Save via event store
│   │   │   ├── saga/
│   │   │   │   └── submit_leave_saga.go← ★ SAGA: Orchestrates the submission flow
│   │   │   ├── clients/
│   │   │   │   ├── employee_client.go  ← gRPC client with ★ CIRCUIT BREAKER
│   │   │   │   ├── balance_client.go   ← gRPC client with ★ CIRCUIT BREAKER
│   │   │   │   └── approval_client.go  ← gRPC client with ★ CIRCUIT BREAKER
│   │   │   └── grpc/
│   │   │       ├── command_server.go
│   │   │       └── query_server.go
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── leave-balance-service/          ← Tracks available/used leave days per employee
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   └── balance.go          ← LeaveBalance aggregate
│   │   │   ├── handlers/
│   │   │   │   └── kafka_handlers.go   ← ★ INBOX: Handles LeaveSubmitted, LeaveCancelled
│   │   │   │                               Deduplication via ★ IDEMPOTENCY
│   │   │   └── grpc/
│   │   │       └── server.go           ← GetBalance, CheckBalance gRPC handlers
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── approval-service/               ← Approval workflow for leaves, payroll, expenses
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── approval_aggregate.go  ← ★ EVENT SOURCING: Approval aggregate
│   │   │   │   └── events.go              ← ApprovalCreated, ApprovalDecided, etc.
│   │   │   ├── handlers/
│   │   │   │   └── kafka_handlers.go      ← ★ INBOX: Consumes commands from SAGA
│   │   │   │                                  ★ IDEMPOTENCY: Deduplicates SAGA commands
│   │   │   ├── repository/
│   │   │   │   └── approval_event_repo.go ← ★ EVENT SOURCING: Load/Save approvals
│   │   │   └── grpc/
│   │   │       └── server.go
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── attendance-service/             ← Clock-in/out, overtime, daily attendance
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   └── attendance.go       ← Attendance aggregate
│   │   │   ├── handlers/
│   │   │   │   └── webhook_handler.go  ← HTTP handler for biometric device webhooks
│   │   │   │                               ★ IDEMPOTENCY: Deduplicates device events
│   │   │   └── grpc/
│   │   │       └── server.go           ← GetAttendance, GetOvertimeHours
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── payroll-service/                ← Salary computation, payslips, bank transfers
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── payroll_run.go      ← PayrollRun aggregate
│   │   │   │   └── events.go           ← PayrollRunStarted, PayslipGenerated, etc.
│   │   │   ├── saga/
│   │   │   │   └── payroll_run_saga.go ← ★ SAGA: The most complex saga in the system
│   │   │   │                               Steps: Compute → Approve → Generate Payslips
│   │   │   │                                    → Initiate Bank Transfer
│   │   │   │                               Compensations at every step
│   │   │   ├── clients/
│   │   │   │   ├── attendance_client.go← gRPC with ★ CIRCUIT BREAKER
│   │   │   │   ├── balance_client.go   ← gRPC with ★ CIRCUIT BREAKER
│   │   │   │   └── bank_client.go      ← External bank API with ★ CIRCUIT BREAKER
│   │   │   │                               ★ IDEMPOTENCY: Bank transfer must not duplicate
│   │   │   ├── repository/
│   │   │   │   └── payroll_event_repo.go ← ★ EVENT SOURCING: Complete payroll audit trail
│   │   │   └── grpc/
│   │   │       └── server.go
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── notification-service/           ← Email, SMS, in-app notification delivery
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── handlers/
│   │   │   │   └── kafka_handlers.go   ← ★ INBOX: Consumes events from ALL services
│   │   │   │                               ★ IDEMPOTENCY: Never send duplicate emails
│   │   │   ├── providers/
│   │   │   │   ├── email.go            ← SendGrid/SMTP email provider
│   │   │   │   └── sms.go              ← SMS provider
│   │   │   └── templates/
│   │   │       └── *.html              ← Email templates
│   │   └── migrations/
│   │       └── *.sql
│   │
│   ├── reporting-service/              ← Analytics, dashboards, exports (PURE READ)
│   │   ├── Dockerfile
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── projections/            ← ★ CQRS: All projection workers live here
│   │   │   │   ├── leave_summary.go    ← Builds leave_summary_read_model
│   │   │   │   ├── leave_calendar.go   ← Builds leave_calendar_read_model
│   │   │   │   ├── headcount.go        ← Builds headcount_by_dept_month
│   │   │   │   ├── payroll_expense.go  ← Builds payroll_expense_by_dept
│   │   │   │   └── attendance_stats.go ← Builds attendance_summary_read_model
│   │   │   ├── queries/
│   │   │   │   ├── leave_queries.go    ← ★ CQRS + ★ CROSS-SERVICE AGGREGATION
│   │   │   │   ├── payroll_queries.go
│   │   │   │   └── headcount_queries.go
│   │   │   └── grpc/
│   │   │       └── server.go
│   │   └── migrations/
│   │       └── *.sql
│   │
│   └── api-gateway/                    ← Single entry point for all client traffic
│       ├── Dockerfile
│       ├── cmd/
│       │   └── main.go
│       ├── internal/
│       │   ├── middleware/
│       │   │   ├── auth.go             ← JWT validation
│       │   │   ├── idempotency.go      ← ★ IDEMPOTENCY: HTTP Idempotency-Key header
│       │   │   ├── rate_limiter.go     ← Token bucket rate limiting
│       │   │   └── circuit_breaker.go  ← ★ CIRCUIT BREAKER: Per-service breakers
│       │   ├── clients/
│       │   │   ├── leave_cmd_client.go ← gRPC client to Leave Command Service
│       │   │   ├── leave_qry_client.go ← gRPC client to Leave Query (Reporting) Service
│       │   │   ├── employee_client.go
│       │   │   └── payroll_client.go
│       │   └── handlers/
│       │       ├── leave_handler.go    ← HTTP handlers routing to correct services
│       │       ├── employee_handler.go
│       │       └── payroll_handler.go
│       └── Makefile
│
├── infrastructure/                     ← All infrastructure configuration
│   ├── kafka/
│   │   └── topics.sh                   ← Script to create all Kafka topics on startup
│   │                                       leave.events, leave.events.dlq
│   │                                       leave.events.retry.1, .retry.2, .retry.3
│   │                                       employee.events, employee.events.dlq
│   │                                       balance.events, payroll.events, etc.
│   │
│   ├── envoy/                          ← ★ SIDECAR PATTERN: Proxy sidecar configs
│   │   ├── leave-service.yaml
│   │   ├── employee-service.yaml
│   │   ├── payroll-service.yaml
│   │   └── api-gateway.yaml
│   │
│   ├── fluent-bit/                     ← ★ SIDECAR PATTERN: Log shipper configs
│   │   ├── leave-service.conf
│   │   ├── employee-service.conf
│   │   └── parsers.conf
│   │
│   ├── otel/                           ← ★ SIDECAR PATTERN: OTel collector configs
│   │   ├── leave-collector.yaml
│   │   ├── employee-collector.yaml
│   │   └── payroll-collector.yaml
│   │
│   ├── vault/                          ← ★ SIDECAR PATTERN: Vault agent configs
│   │   ├── leave-agent.hcl
│   │   ├── templates/
│   │   │   ├── db-password.tpl
│   │   │   └── kafka-credentials.tpl
│   │   └── policies/
│   │       └── leave-service-policy.hcl
│   │
│   ├── grafana/
│   │   └── dashboards/
│   │       ├── circuit-breakers.json   ← Dashboard for all circuit breaker states
│   │       ├── dlq-health.json         ← Dashboard for DLQ depth and error rates
│   │       ├── saga-progress.json      ← Dashboard for in-flight SAGA states
│   │       └── service-health.json     ← Overall service health dashboard
│   │
│   └── postgres/
│       └── init.sql                    ← Creates databases for all services
│
└── tools/
    ├── dlq-admin/                      ← CLI tool for DLQ management
    │   └── main.go                     ← List, replay, discard DLQ messages
    ├── saga-inspector/                 ← CLI tool to inspect stuck SAGAs
    │   └── main.go
    └── event-replay/                   ← CLI tool to replay events from event store
        └── main.go                         (for rebuilding read models)
```

---

## Where Every Design Pattern Lives

Now let us map every pattern you studied in this conversation to exactly where it sits in this project, why it is there, and what problem it is solving in the HR360 context.

---

### Cross-Service Data Aggregation

**Where it lives:** `services/reporting-service/internal/queries/` and `services/api-gateway/internal/handlers/`

**The HR360 problem it solves:** The HR portal needs to show a manager a dashboard with their team's leave applications enriched with employee names, departments, current balance, and approval status. These four pieces of information live in four different services — Leave Service, Employee Service, Leave Balance Service, and Approval Service.

**How it is implemented in this project:** The Reporting Service uses Strategy 2 from the aggregation guide — it consumes Kafka events from all four services and maintains a pre-built `leave_summary_read_model` table that is already joined. When a manager opens their dashboard, it is a single fast SELECT from this table. For the API Gateway, individual record fetches (when a user opens a single leave application) use Strategy 1 — parallel gRPC calls to the relevant services. The Reporting Service is the pure read side. The individual services handle the pure write side. The aggregation pattern bridges them.

---

### SAGA Pattern

**Where it lives:** `services/leave-service/internal/saga/submit_leave_saga.go` and `services/payroll-service/internal/saga/payroll_run_saga.go`

**The HR360 problem it solves:** Submitting a leave application touches four services. The Leave Service creates the leave record. The Leave Balance Service deducts the balance. The Approval Service creates a pending approval task. The Notification Service sends an email to the manager. All four must succeed — or all must be compensated. Payroll processing is even more complex — it involves computing salaries, getting manager approval, generating payslips, and initiating bank transfers. If the bank transfer fails, payslips must be marked as failed and managers must be notified.

**How it is implemented in this project:** The `submit_leave_saga.go` is an orchestration SAGA. The Leave Service's saga orchestrator sends commands to each participant through Kafka command topics. Each participant replies with success or failure. The orchestrator persists its state after every step in `saga_states` table (GORM model). If compensation is needed, the orchestrator sends compensating commands in reverse order. The `payroll_run_saga.go` is the most complex SAGA — it has conditional branching (small payroll runs skip manager approval, large runs require it) and multiple external service calls.

---

### Outbox Pattern

**Where it lives:** `pkg/outbox/` (shared across all services)

**The HR360 problem it solves:** Every service needs to publish Kafka events when it changes its data — but writing to the database and publishing to Kafka are two separate operations that cannot be made atomic. If the Leave Service writes a leave record and then crashes before publishing the `LeaveSubmitted` event, the rest of the system never finds out about the new leave.

**How it is implemented in this project:** The `pkg/outbox/publisher.go` is used by every service's command handler and SAGA orchestrator. Every database write that should produce a Kafka event writes an outbox row in the same GORM transaction. The `pkg/outbox/worker.go` runs as a goroutine in every service, polling its service's outbox table and publishing events to Kafka. In multi-instance deployments, `pkg/outbox/distributed_worker.go` uses a Redis lock so only one instance publishes at a time.

---

### Transactional Inbox Pattern

**Where it lives:** `pkg/inbox/` (shared), used in `services/leave-balance-service/`, `services/notification-service/`, `services/approval-service/`

**The HR360 problem it solves:** The Leave Balance Service consumes `LeaveSubmitted` events from Kafka. If it processes the event (deducts the balance) and then crashes before committing the Kafka offset, Kafka re-delivers the message and the balance is deducted twice. The employee loses days they should not lose.

**How it is implemented in this project:** The `pkg/inbox/consumer.go` reads from Kafka using `FetchMessage` (not auto-commit). It writes the raw message to the service's `inbox_messages` table with `ON CONFLICT DO NOTHING`. It then commits the offset. The `pkg/inbox/processor.go` runs in a separate goroutine, executing business logic from the handler registry in a single DB transaction that also marks the inbox message as PROCESSED. The Leave Balance Service registers its handler in `services/leave-balance-service/internal/handlers/kafka_handlers.go` via `init()`.

---

### Event Sourcing Pattern

**Where it lives:** `pkg/eventstore/` (shared), used in `services/leave-service/`, `services/approval-service/`, `services/payroll-service/`

**The HR360 problem it solves:** HR systems need complete audit trails. Auditors ask: "What was the status of this leave when the manager approved it?" "When exactly did the payroll figure change and who changed it?" "Show me every state transition this approval went through." Traditional UPDATE statements destroy this history. You need to know every decision that was made, by whom, and in what order.

**How it is implemented in this project:** The Leave aggregate (`services/leave-service/internal/domain/leave_aggregate.go`) stores no mutable state in a traditional sense. Every command (`Submit`, `Approve`, `Reject`) raises an event which is appended to the `event_store` table via `pkg/eventstore/repository.go`. The current state of a leave is reconstructed by replaying its event stream. The Compliance Service (a future extension) can replay any aggregate's event stream to produce a complete audit log. The `pkg/eventstore/kafka_relay.go` publishes every stored event to Kafka for downstream consumption.

---

### Circuit Breaker Pattern

**Where it lives:** `pkg/circuitbreaker/` (shared), used in every service's `clients/` directory and in `services/api-gateway/internal/middleware/circuit_breaker.go`

**The HR360 problem it solves:** During a high-traffic period, the Approval Service database goes under heavy load and starts responding slowly. Without circuit breakers, every service that calls the Approval Service starts accumulating blocked goroutines. The Leave Service runs out of memory and crashes. Then the API Gateway crashes because it cannot reach the Leave Service. The entire HR360 system goes down because one database got slow.

**How it is implemented in this project:** Every gRPC client in `services/*/internal/clients/` wraps its calls with a `gobreaker.CircuitBreaker` using the `ObservableCircuitBreaker` from `pkg/circuitbreaker/observable_breaker.go`. At the API Gateway level, `services/api-gateway/internal/middleware/circuit_breaker.go` has per-service breakers — if the Approval Service breaker opens, API Gateway returns a `503 Service Unavailable` with a `Retry-After` header. The Grafana `circuit-breakers.json` dashboard shows the real-time state of every breaker across all services.

---

### Dead Letter Queue Pattern

**Where it lives:** `pkg/dlq/` (shared), integrated with all Kafka consumers

**The HR360 problem it solves:** The Notification Service receives a `PayrollCompleted` event but the employee's email address in the event payload is malformed. The service cannot send the email. It retries five times and fails every time. Without a DLQ, either the notification is silently lost (the employee never gets their payslip notification) or the consumer blocks on this message forever.

**How it is implemented in this project:** The `pkg/dlq/consumer_wrapper.go` wraps every Kafka handler in the system. When a handler fails, it retries with exponential backoff. After the retry budget is exhausted, the original message is published to the service's DLQ topic (e.g., `notification.events.dlq`) with a `DLQEnvelope` containing the error type, stack trace, and retry count. The `pkg/dlq/monitor.go` consumes DLQ topics and stores records in a `dlq_records` table. The Grafana `dlq-health.json` dashboard shows DLQ depth per service. The `tools/dlq-admin/` CLI tool lets engineers list, replay, or discard DLQ messages after fixing the root cause.

---

### CQRS Pattern

**Where it lives:** Every service has a `commands/` and `queries/` directory split. The Reporting Service is the purest CQRS implementation — it is the dedicated read side for the entire system.

**The HR360 problem it solves:** HR managers need a dashboard that shows leave utilization trends by department for the last 12 months, broken down by leave type, with approval rates. This is a complex aggregation query. If you run it against the normalized `leaves` table in the Leave Service's write database — which is also handling all the write traffic from employees submitting leaves — you are competing for database resources and the query will be slow.

**How it is implemented in this project:** The Leave Service is split into `commands/handler.go` (write side — handles SubmitLeave, ApproveLeave) and `queries/handler.go` (read side — serves simple single-record reads from a local read model). The Reporting Service is the dedicated read service for complex cross-service queries. It has five projection workers in `services/reporting-service/internal/projections/` that consume events from all other services and build denormalized read model tables. Managers query the Reporting Service for dashboards and reports, while employees submit leaves to the Leave Command Service. The two paths never compete for resources.

---

### Sidecar Pattern

**Where it lives:** `infrastructure/envoy/`, `infrastructure/fluent-bit/`, `infrastructure/otel/`, `infrastructure/vault/` and in `docker-compose.yml` where each service has three to four companion containers.

**The HR360 problem it solves:** HR360 has nine services. Each needs TLS for secure inter-service communication. Each needs structured logs shipped to Elasticsearch for centralized debugging. Each needs distributed traces in Jaeger and metrics in Grafana. Each needs database passwords rotated automatically when the Vault lease expires. Implementing all of this inside each Go service would mean nine times the implementation work, nine different versions, nine places to fix security vulnerabilities.

**How it is implemented in this project:** In `docker-compose.yml`, every service has three sidecar containers: an Envoy proxy (`service-name-proxy`) handling mTLS and traffic management, a Fluent Bit log shipper (`service-name-log-shipper`) collecting JSON logs from the shared volume, and an OTel Collector (`service-name-otel`) receiving traces and metrics and routing them to Jaeger and Grafana. The Vault Agent sidecar (`service-name-vault-agent`) is added for the payroll service and any service handling sensitive financial data. All nine Go service binaries are completely unaware of TLS, Elasticsearch, Jaeger, or Vault — they only write to `localhost` and `/etc/secrets/`.

---

### Idempotency Pattern

**Where it lives:** `pkg/idempotency/` (shared), used at every layer of the system.

**The HR360 problem it solves:** An employee submits a leave application on their mobile phone. The response is slow and the app shows a loading spinner. The employee, getting impatient, taps the Submit button twice more before the response arrives. Without idempotency, three leave applications are created. The employee's manager gets three approval requests. The leave balance is deducted three times. HR has to manually clean up the mess.

**How it is implemented in this project:** At the HTTP layer, `services/api-gateway/internal/middleware/idempotency.go` requires an `Idempotency-Key` header on all POST requests and caches responses in Redis for 24 hours. At the gRPC layer, `pkg/idempotency/grpc_interceptor.go` is registered as a server interceptor in every command service — it checks the `idempotency_keys` table before executing any handler. At the Kafka layer, `pkg/idempotency/` works alongside the Inbox Pattern — the `processed_messages` table ensures every Kafka message is processed exactly once even if Kafka re-delivers it. At the SAGA layer, every SAGA command carries a stable `command_id` checked against the `processed_commands` table. The payroll service has the strictest idempotency controls because a duplicate bank transfer is a financial error that requires real-world correction.

---

## The Data Flow That Connects All Patterns

Here is the complete journey of a single leave application through HR360, showing exactly which pattern activates at each step:

```
COMPLETE LEAVE APPLICATION JOURNEY IN HR360
─────────────────────────────────────────────────────────────────────────────

  Employee taps "Submit Leave" on mobile app (bad network, taps twice)

  ① API GATEWAY receives both requests
    ★ IDEMPOTENCY (HTTP): Both carry same Idempotency-Key header
      → Second request: cached response returned immediately ✓

  ② API GATEWAY forwards single request to Leave Command Service via gRPC
    ★ CIRCUIT BREAKER: Checks if Leave Service breaker is CLOSED ✓
    ★ SIDECAR (Envoy): Wraps plain gRPC in mTLS, handles retries ✓

  ③ LEAVE COMMAND SERVICE receives request
    ★ IDEMPOTENCY (gRPC interceptor): Checks idempotency_keys table ✓
    ★ EVENT SOURCING: Loads Leave aggregate (empty — new leave)
      → Calls aggregate.Submit() → raises LeaveSubmittedEvent
    ★ OUTBOX: Single transaction:
        INSERT into event_store (LeaveSubmittedEvent)
        INSERT into outbox_events (leave.events topic)
    Responds: { leave_id: "L001" }

  ④ OUTBOX WORKER publishes LeaveSubmitted to Kafka
    ★ SIDECAR (OTel): Traces the publish with span context ✓
    ★ SIDECAR (Fluent Bit): Logs the publish to Elasticsearch ✓

  ⑤ LEAVE BALANCE SERVICE consumes from leave.events
    ★ TRANSACTIONAL INBOX: Writes message to inbox_messages table ✓
    ★ INBOX PROCESSOR: In one DB transaction:
        Deducts 5 days from EMP-42's balance
        Marks inbox message as PROCESSED
        Writes BalanceDeducted to balance outbox
    ★ IDEMPOTENCY: If message arrives twice, second is skipped ✓
    ★ DLQ: If deduction fails 5 times, sends to leave.events.dlq ✓

  ⑥ APPROVAL SERVICE consumes from leave.events
    ★ TRANSACTIONAL INBOX: Stores message in inbox ✓
    ★ EVENT SOURCING: Creates Approval aggregate, appends ApprovalCreated
    ★ OUTBOX: Publishes ApprovalCreated to approval.events ✓

  ⑦ NOTIFICATION SERVICE consumes from approval.events
    ★ TRANSACTIONAL INBOX: Stores message in inbox ✓
    ★ IDEMPOTENCY: Email not sent twice if Kafka re-delivers ✓
    → Sends email to manager: "A leave request needs your approval"

  ⑧ REPORTING SERVICE consumes from leave.events + approval.events
    ★ CQRS (Projection): Updates leave_summary_read_model
    ★ CQRS (Projection): Updates leave_calendar_read_model
    ★ CROSS-SERVICE AGGREGATION: Read model is pre-joined
    → Manager's dashboard now shows the new pending leave ✓

  ⑨ MANAGER opens HR portal dashboard
    ★ CQRS: Query goes to Reporting Service (read side)
    ★ CIRCUIT BREAKER: Gateway checks Reporting Service breaker ✓
    → Single SELECT from leave_summary_read_model: fast ✓

  ⑩ MANAGER approves leave
    Steps ①–⑧ repeat for the approval
    ★ SAGA: Leave Service saga orchestrator marks step complete ✓
    ★ EVENT SOURCING: ApprovalDecided event appended ✓
    ★ OUTBOX → INBOX → NOTIFICATION: Employee gets approval email ✓

─────────────────────────────────────────────────────────────────────────────
10 steps. Every pattern active. Nothing lost. Nothing duplicated.
The system is consistent even if any service crashes at any point.
─────────────────────────────────────────────────────────────────────────────
```

---

## The Order to Build This Project

You do not build everything at once. Here is the sequence that makes each step feel achievable and each pattern feel natural rather than overwhelming.

**Phase 1 — Foundation (Week 1–2):** Start with the `pkg/` shared packages. Build `pkg/outbox/`, `pkg/idempotency/`, and `pkg/logging/`. These are pure Go packages with no external dependencies except GORM and Kafka. Write tests for them. Get comfortable with the patterns before integrating them into services.

**Phase 2 — First Service (Week 3–4):** Build the Employee Service in full — CQRS split, GORM models, gRPC server for both command and query protos, Outbox Pattern for publishing employee events. This is the simplest service and gives you the template that all other services will follow.

**Phase 3 — The Core Flow (Week 5–8):** Build Leave Service (with Event Sourcing for the aggregate), Leave Balance Service (with Transactional Inbox consuming leave events), and Approval Service. Wire them together with Kafka. At the end of Phase 3, you can submit a leave application through Kafka and see the balance deducted and an approval created.

**Phase 4 — Resilience Layer (Week 9–10):** Add Circuit Breakers to all gRPC clients. Add the DLQ wrapper to all Kafka consumers. Add the Idempotency interceptor to all gRPC command servers. The system now handles failures gracefully — a crashed service does not take down the others, and duplicate messages are handled.

**Phase 5 — The Complex SAGA (Week 11–12):** Build the Payroll Service with its SAGA. This is where you put together everything you know — Event Sourcing for the payroll run aggregate, SAGA orchestration with compensation, Circuit Breakers for the bank API client, strict Idempotency for bank transfers, DLQ for failed payroll notifications.

**Phase 6 — Observability and Sidecars (Week 13–14):** Add Docker Compose sidecar configuration for Envoy (mTLS), Fluent Bit (log shipping), and the OTel Collector (traces and metrics). Build the Grafana dashboards for circuit breaker health, DLQ depth, and SAGA progress. At this point, the system is not just functionally correct — it is operationally observable.

**Phase 7 — Reporting Service (Week 15–16):** Build the Reporting Service with all its projection workers. This is where CQRS and cross-service data aggregation come together — consuming events from all other services and building pre-joined read models for the manager dashboard.

By the end of Phase 7, you have built a production-grade HR system where every pattern you studied is working together as a coherent whole. Not one of them was added for its own sake. Every one of them is solving a real problem that this real system actually has.