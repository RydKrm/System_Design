## 🧠 RabbitMQ Topics to Learn (In Order)

#### 🟢 Beginner Level (Basics)

- What is RabbitMQ & Why Use It?
- Message Brokers
- Messaging vs REST APIs
- Benefits of decoupling
- Installing RabbitMQ
- Install via Docker
- Access the Management UI
- Core Concepts
- Producers
- Consumers
- Queues
- Messages
- Brokers
- First Program (Hello World)
- Create a producer
- Create a consumer
- Send and receive a simple message using amqplib
- Work Queues
- One producer, multiple consumers
- Distribute time-consuming tasks among workers
- Message Acknowledgment (ack, nack)
- How to confirm a message is received
- Requeue on failure
- Durability
- Durable Queues
- Persistent Messages
- Restart-safe messaging

#### 🟡 Intermediate Level

- Prefetch / Fair Dispatch
- Avoid overloading a single worker
- Limit number of unacknowledged messages per worker
- Exchanges
- What is an Exchange?
- Types of Exchanges:
- Direct
- Fanout
- Topic
- Headers (optional)
- Direct Exchange
- Route messages using routing keys (e.g. info, error)
- Fanout Exchange
- Broadcast messages to all queues (Pub/Sub)
- Topic Exchange
- Pattern-based routing (e.g. log.info, user.created)
- Dead Letter Queues (DLQ)
- Handle failed messages
- Retry mechanisms
- Message TTL (Time To Live)
- Auto-expire messages or queues
- Auto-Delete & Exclusive Queues
- Temporary queues for short-lived consumers

#### 🔴 Advanced Level

- -Publisher Confirms
- Ensure message reached broker (for reliability)
- Consumer Priorities
- Let some consumers get priority in receiving messages
- Headers Exchange
- Routing based on headers instead of routing keys
- RPC (Remote Procedure Call)
- Implement request/response with RabbitMQ
- Delayed Messages
- Delay delivery with plugins or TTL + DLX
- High Availability (HA) Setup
- Clustering RabbitMQ
- Mirrored queues (for failover)
- Security & Authentication
- Create users & permissions
- Use TLS/SSL for secure connections
- Monitoring & Management
- Use RabbitMQ Management Plugin
- Metrics with Prometheus/Grafana
- Connection Handling
- Auto reconnect
- -raceful shutdown
- Handling connection errors
- Scaling & Performance Optimization
- Parallel consumers
- Connection/channel pooling
- Best practices for production
