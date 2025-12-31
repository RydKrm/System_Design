## 🧠 RabbitMQ Topics to Learn (In Order)

#### 🟢 Beginner Level (Basics)

- What is RabbitMQ & Why Use It? - [Link](Basic/01_Intro.md)
- Message Brokers - [Link](Basic/02_how_it's_works.md)
- Messaging vs REST APIs - [Link](Basic/03.Messaging_vs_apis.md)
- Benefits of decoupling - [Link](Basic/04.why_decoupling.md)
- Producers - [Link](Basic/05.Producer.md)
- Queues - [Link](Basic/06.queue.md)
- Exchanges - [Link](Basic/07.Exchange.md)
- Briefly Exchange Types - [Link](Basic/08.Exchance_bref.md)
- Direct Exchange - [Link](Basic/09.direct_exchange.md)
- Fanout Exchange - [Link](Basic/10.fanout_exchange.md)
- Topic Exchange - [Link](Basic/11.topic_exchange.md)
- Headers Exchange
- Messages
- Brokers
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
- Dead Letter Queues (DLQ)
- Handle failed messages
- Retry mechanisms
- Message TTL (Time To Live)
- Auto-expire messages or queues
- Auto-Delete & Exclusive Queues
- Temporary queues for short-lived consumers

#### 🔴 Advanced Level

- Publisher Confirms
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
- Graceful shutdown
- Handling connection errors
- Scaling & Performance Optimization
- Parallel consumers
- Connection/channel pooling
- Best practices for production
