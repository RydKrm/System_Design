___

## Internet 

- How Internet Works 
- HTTP
- Domain Name
- Hosting 
- DNS 
- Browser and How the work 
-  **NAT (Network Address Translation)**
- **IPv4 vs IPv6**
- **MTU & packet fragmentation**
- **Keep-alive connections**
- **Connection pooling at TCP level**
- **TIME_WAIT / CLOSE_WAIT states**

## Operating System 

- Processes vs Threads - Done 
- Context switching - Done 
- Virtual memory
- File systems - Done 
- Syscalls
- Signals
- Scheduling
- Deadlocks & starvation

## Networking 
- OSI MODEL 
- FTP 
- SFTP 
- DNS 
- TCP 
- UDP
- RPC
- HTTP / HTTPS 
- SSL / TLS 
- SSH 
- Email Protocols 
-  How latency actually happens
- Packet loss
- Retries & timeouts
- Idempotency

## Language 

- JavaScript - Done 
- TypeScript - Done
- Golang - Done 
- Python
- Rust

## Front End

- React.js
- Next.js

## Backend 

- Node.js 
- Nest.JS 
- Gin 

## Back End Internals

- **NAT (Network Address Translation)**
- **IPv4 vs IPv6**
- **MTU & packet fragmentation**
- **Keep-alive connections**
- **Connection pooling at TCP level**
- **TIME_WAIT / CLOSE_WAIT states**
- Request lifecycle
- Thread pools vs event loop
- Connection lifecycle
- Memory allocation patterns
- Backpressure propagation
- Streaming responses
- Graceful shutdown
- Hot reload vs cold restart

## API Styles 

- REST 
- JSON API 
- gRPC 
- GraphQL
- OPEN API Specs 
- **API versioning strategies**
- **Backward compatibility**
- **Schema evolution**
- **Breaking vs non-breaking changes**
- **Consumer-driven contracts**

## Authentication 

- Attribute Based Access Control (ABAC)
- Discretionary Access Control (DAC)
- Policy-Based Access Control (PBAC)
- Role-Based Access Control (RBAC)
- Mandatory Access Control (MAC)
- Relationship-Based Access Control (ReBAC)
- Token-based authentication
-  JSON Web Tokens
-  OAuth 2.0
-  Session Based Authentication
- **Auth threat modeling**
- **Token revocation strategies**
- **Refresh token rotation**
- **Zero-trust architecture**
- **Service-to-service authentication (mTLS)**

## API Performance Metrics 

- Caching Strategies
- Profiling and monitoring
- Performance Testing
-  Error Handling / Retries

## Web Security 

- MD5 
- SHA
- scrypt 
- bcrypt
- OWASP (Open Web Application Security Project) Risks 
- CORS (Cross-Origin Resource Sharing) 
- SSL / TLS - cryptographic protocols
- CSP (Content Security Policy) 
- Server Security 
- OAuth2, OpenID Connect
- SQL injection & XSS
- CSRF
- Secrets management
- Encryption basics (AES, RSA)
- **Rate limiting strategies**
- **Bot protection**
- **Replay attacks**
- **Timing attacks**
- **Security headers deep dive**

## Repo Hosting 

- Git and GitHub


## Database 

- MySQL 
- MongoDB
- PostgreSQL
- Firebase
- Neo 4j
- Migration
- N +1 Problem
- Transection 
- ORM
- ACID
- ORM
- Normalization
- Isolation levels
- Indexes (B-Tree, GIN, Hash)
- Query planner
- Joins & execution plans
- Locks & deadlocks
- Failure Modes 
- Profiling Performance
- Database Indexes 
- Data Replication
- Sharding Strategies 
- Read replicas
- Connection pooling
- CAP Theorem 
- **Write amplification**
- **Read amplification**
- **Hot partitions**
- **Online schema migrations**
- **Multi-region databases**
- **Data consistency across services**
- **Soft deletes vs hard deletes**


## Caching 

- Caching Strateges
- Redis 
- HTTP Caching
-  **Cache invalidation strategies (deep dive)**
- **Cache stampede**
- **Write-through / write-back**
- **Read-through vs lazy loading**
- **Consistency vs performance tradeoffs**

## Web Server 

- NGINX 
- Forward Proxy 
- Reverse Proxy 
- Caching Server 
- Firewall 
- Load Balancer
- **L4 vs L7 load balancing**
- **Health checks**
- **Blue-green & canary routing**
- **Rate limiting at gateway level**

## Cloud Providers 

- AWS 
- Serverless
- **Infrastructure as Code (Terraform mindset)**
- **Secrets rotation**
- **Multi-region deployments**
- **Disaster recovery**
- **Backup & restore strategies**
- **Cost optimization (FinOps basics)**

## Testing 

- Integration Testing 
- Unit Testing 
- Functional Testing 
- **Contract testing**
- **Load / stress testing**
- **Chaos testing**
- **Test data management**
- **Testing in distributed systems**

## Containerization 

- Docker 
- Kubernetes 

## CI/CD 

- Jenkins 
- GitHub Actions 
- **Deployment strategies**
    - Blue-green
    - Canary
    - Rolling
- **Feature flags**
- **Rollback strategies**

## Message Broker 

- RabbitMQ 
- **Kafka (conceptual at least)**
- **Event ordering**
- **At-least-once vs exactly-once**
- **Consumer groups**
- **Idempotent consumers**
- **Event schema versioning**

## Search Engines 

- Elastic search

## Architectural Patterns 

- Monolith
- Micro Service 
- SOA (Service-Oriented Architecture)
- Serverless
- Event-driven architecture
- CQRS
- Hexagonal / Clean Architecture
- DDD (practical, not academic)
- Twelve-Factor App methodology

##  Real Time Data

- Server Sent Event 
- Web Sockets 
- Long / Short Polling


## Observability 

- Instrumentation 
- Monitoring
- Telemetry 
- Logging strategies
- Prometheus
- OpenTelemetry
- **Distributed tracing**
- **RED / USE metrics**
- **Alert fatigue management**
- **SLO-driven alerting**

## Server Migration Strategies 

- Graceful Degradation 
- Throttling
- Back pressure 
- Load Shifting
- Circuit Breaker

## Distributed Systems (Critical for Top Engineers)

- CAP theorem (proper understanding)
- Consistency models
- Consensus (Raft, Paxos basics)
- Leader election
- Service discovery
- Distributed locks
- Eventual consistency
- Idempotency at scale
- Circuit breaker
- Retry with backoff
- Bulkhead
- Saga pattern
- Two-phase commit
- **Clock skew**
- **Time synchronization (NTP)**
- **Split-brain scenarios**
- **Quorum-based systems**
- **Gossip protocols**

## Methodology 

- **Twelve-Factor App**

### Generative AI (Engineering-Focused)

- LLM fundamentals
- Tokenization
- Embeddings
- Vector databases
- RAG architecture
- Prompt engineering (structured)
- Tool calling & agents
- Model evaluation
- AI security (prompt injection)
- Cost & latency optimization
- GenAI observability