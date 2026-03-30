---
title: "Architecting a Go Backend with Event-Driven Design and the Outbox Pattern"
source: "https://medium.com/@steffankharmaaiarvi/architecting-a-go-backend-with-event-driven-design-and-the-outbox-pattern-3928bf315e0a"
author:
  - "[[Steffan Kharmaaiarvi]]"
published: 2025-05-07
created: 2026-01-18
description: "“” is published by Steffan Kharmaaiarvi."
tags:
  - "clippings"
---
## Introduction

Designing a real-world backend system involves more than just writing code that “works” — it requires thinking about architecture, reliability, and maintainability from the start. In this tutorial, we are going to build a simple orders service that will help you understand the patterns better**.** This project demonstrates how to build an **event-driven** application using the **Transactional Outbox Pattern** and organized code with **Clean Architecture** principles.

By the end, you’ll not only understand how the project works, but also gain insight into **“architectural thinking”** — designing systems that are robust, resilient, and maintainable from day one.

## Project Overview: Orders Service with Reliable Event Publishing

Let’s start with a high-level overview of what the project does. Imagine an Order service that needs to save new orders to a database and notify other systems that an order was created (by sending an event to a message queue like Kafka). A naive approach might try to do both operations at the same time — but what if one succeeds and the other fails? This project solves that problem by using an **asynchronous event-driven approach** with a transactional **outbox**.

**The typical workflow looks like this:**

1. **Client sends a request to create an order**  
	Example: `POST /orders` with a JSON body like:
```c
{
 “item”: “book”,
 “quantity”: 2
}
```

**2\. Order and event are saved in a single database transaction.** Inside one atomic DB transaction:

- The order is inserted into the `orders` table.
- The event is inserted into the `outbox` table.

The transaction is committed only if both inserts succeed — ensuring **strong consistency**.

**3\. Client receives a success response**

At this point, the order is stored in the DB, and an event is queued in the `outbox`, but **nothing has been sent to Kafka yet**. The response is fast, as it doesn’t wait for Kafka delivery.  
**4\. A background consumer process scans the outbox table**

- Runs periodically (e.g. every second).
- Queries `outbox` table for entries where `published_at IS NULL`.

**5\. Each outbox event is published to Kafka (Redpanda)**

**6\. The event is marked as sent in the database**

If publishing to Kafka succeeds:

- The `published_at` column of the outbox entry is updated with the current timestamp.

If it fails:

- The row remains unchanged, and will be retried later (ensuring **at-least-once delivery**).

## Event-Driven Architecture in Simple Terms

What do we mean by an **event-driven architecture**? In traditional applications, one service might call another directly (say, an Orders service calling an Inventory service’s API to update stock). In an event-driven system, services communicate indirectly by **publishing events** to a message broker and **subscribing** to events they care about. This approach offers significant decoupling:

- An **event** is just a message (for example, “OrderCreated” with order details) that gets sent to a **broker** (like Kafka).
- **Producers** (or publishers) are the components that generate events. In our case, the Orders service is a producer of an “Order Created” event.
- **Consumers** are the components that listen for events and react to them. For example, an Inventory service could listen for “OrderCreated” events to decrement stock, or a Billing service could listen to create an invoice.
- The **broker (Kafka/Redpanda)** is the central hub where events are sent. Producers don’t need to know who the consumers are. They just send the event to Kafka, and any service interested can consume it. This decoupling means you can add new listeners (services) without changing the order service’s code at all.

In simpler terms, event-driven design is like a newspaper subscription: one part of your system “publishes” news (events) and others “subscribe” to get notified. This makes systems more scalable and flexible — services are loosely coupled and communicate asynchronously. If a consumer is slow or down temporarily, the broker will buffer events, and the producer service isn’t affected (it just drops off the event and continues its own work).

**Why should a beginner care?** Because as soon as your application grows beyond a single service or module, you’ll need to consider how parts of the system interact. Event-driven architecture can make your life easier by preventing tight interdependencies. However, it introduces a new challenge: ensuring that an event is **reliably** published when something important happens (like an order being saved). This is where the Outbox Pattern comes in, solving the classic problem of keeping the database and event stream in sync.

## The Transactional Outbox Pattern — Solving the “Double-Write” Problem

Whenever you have to **write to two places** (for example, save to a DB and send a message to Kafka), you encounter the *dual-write problem*. What if you update the database but crash before sending the Kafka event? Or vice versa? We’d end up with inconsistent state. The **Transactional Outbox Pattern** is a design pattern that solves this by turning the two writes into **one atomic operation**.

The problem scenario:

1. Save order to database.
2. Send “order created” event to Kafka.

If step 1 succeeds but step 2 fails (network glitch, broker down, etc.), you have an order in the database with no corresponding event — other services will never know about it. If step 2 succeeded but step 1 failed, you’d publish an event about an order that doesn’t exist in the DB. Neither outcome is acceptable!

**Solution — the Outbox Pattern:** Instead of trying to do both actions at once, do this in the order service:

- Within **one database transaction**, insert the new Order into the `orders` table **and** insert an entry into an `**outbox**` table. The outbox table is just a log of events that need to be published. For example, it might have columns like `event_type` (e.g. "OrderCreated"), `payload` (JSON data of the event), maybe the order ID or other reference, and a `processed` flag or timestamp.
- Commit the transaction. At this point, the database has both the order and the event record safely stored. Even if the app crashes now, we haven’t lost the event — it’s sitting in the outbox table.
- A separate **Outbox Processor** service or background worker will periodically check the outbox table for new events that haven’t been sent yet. It will read them, publish each to Kafka, then mark them as sent (or remove them from the table).
- If publishing to Kafka fails for some reason, the outbox entry stays in the database, and the outbox processor can retry later. This guarantees that as long as the database transaction succeeded, the event will eventually be delivered to the message broker. We have effectively decoupled the timing — the order creation can commit immediately, and the event publishing can retry until successful, without risking inconsistency.
![](https://miro.medium.com/v2/resize:fit:640/format:webp/1*SCBuv3La580UOP7wEc9-3A.png)

Figure: Transactional Outbox Pattern — The Order Service writes to its own database within a transaction (1), inserting a record into the Order table and an event into the Outbox table together. A separate Message Relay/Outbox Worker then continuously polls or fetches new events from the Outbox table (2) and publishes them to the Message Broker (Kafka) (3). This ensures that if the database transaction commits, the event will not be lost. The pattern guarantees at-least-once delivery of events to the broker, since an outbox entry will be retried until published. Consumers of the event must handle potential duplicates (idempotency) because an event might be sent more than once if the relay crashes and restarts mid-process.

In our go-orders-outbox project, the **Orders service** + database represent the left side of the above diagram, and a separate **consumer service** acts as the “Message Relay” on the right side. The beauty of this pattern is that it uses the **database’s atomic transaction** to ensure both the state change and the event are recorded together. It avoids complex distributed transactions or two-phase commit protocols.

**At-Least-Once vs Exactly-Once:** The outbox pattern typically gives *at-least-once* guarantees for event delivery. That means an event might be delivered twice in some failure scenarios (for example, if the outbox worker sends the message but crashes before marking it as sent, it will send it again on restart). This is usually acceptable in exchange for guaranteed delivery, but it means consumers of events should be designed to handle duplicates (make the event handling idempotent). For an “OrderCreated” event, a consumer could check “have I seen this order ID before?” to avoid processing it twice. Designing for idempotency is a common requirement in event-driven systems whenever at-least-once delivery is used.

To sum up, the Transactional Outbox Pattern is a reliable way to integrate event-driven communication in your system **without losing data**. It’s a common solution to ensure your database and your message broker don’t get out of sync. Now, let’s see how our Go project implements this pattern in practice, starting with how the codebase is organized.

## Project Structure Walkthrough (Clean Architecture Style)

When building backend systems, especially those that may evolve over time, **code structure matters just as much as business logic**. A well-organized codebase not only improves maintainability, but also reflects how you, as a developer, think about responsibilities, dependencies, and change.

One of the most robust approaches to organizing backend applications is **Clean Architecture** — popularized by Uncle Bob and inspired by the hexagonal architecture (ports and adapters). It encourages separating your system into distinct layers:

- **Domain layer** — pure business logic and data models.
- **Use case (application) layer** — orchestration logic that coordinates what should happen.
- **Infrastructure layer** — actual implementations that interact with databases, queues, APIs, etc.

This approach gives you testable, flexible, and loosely-coupled code. And one practical example of how this looks in real life is the [go-orders-outbox](https://github.com/steffanharmaajarvi/go-orders-outbox) project.

Let’s break down what makes this layering so effective — using that project as a reference.

### 🔹 cmd/ – Keep Entrypoints Isolated

Every executable in your system — whether it’s a web server, background worker, or database migrator — should have its own entrypoint. This is exactly what’s done in `go-orders-outbox`:

- `cmd/app`: the main HTTP API
- `cmd/consumer`: the outbox relay that sends events to Kafka
- `cmd/migrator`: a one-time runner for DB migrations

Each of these entrypoints is thin and focused — their job is to **wire up dependencies** and **start the application**. This keeps concerns separate from the actual business logic.

### 🔹 internal/domain – Define the Language of Your System

Your **domain layer** should define what your system *is*, not what it *does with technology*. In the case of an Orders service, this means:

- The `Order` struct with fields like ID, customer, item, quantity
- An `OutboxEvent` representing the structure of events
- Interfaces like `OrderRepository`, `OutboxRepository` — describing what needs to happen, but **not how**

This layer is technology-agnostic. It knows nothing about SQL, Kafka, HTTP, or JSON — and that’s exactly the point. You could move this domain to another project or test it independently of your stack.

### 🔹 internal/usecase – Coordinate Logic Without Knowing the Details

The usecase layer is where actions like `CreateOrder` or `PublishEvent` are implemented. It’s the **brains of your app**, but it stays clean by depending only on the interfaces from the domain.

For example, the `CreateOrder` usecase might:

- Accept an input DTO
- Validate it
- Call `orderRepo.Create(order)`
- Call `outboxRepo.Save(event)`

But it doesn’t know *how* those things are implemented — only that they get done. This allows you to test the usecase logic in isolation, passing in mocks or fakes as needed.

### 🔹 internal/infrastructure – Plug in the Real World

This layer is where actual technology choices live: PostgreSQL, Kafka, logging, config parsing, etc.

In `go-orders-outbox`, this includes:

- A Postgres-backed implementation of `OrderRepository`
- Code that inserts events into the outbox table
- A Kafka producer that takes outbox entries and sends them as messages

If one day you wanted to swap PostgreSQL for CockroachDB or Redpanda for another broker, you would only change code in this layer — without touching the domain or usecase logic.

This separation makes the system **adaptable** without becoming fragile.

## Clean Architecture Mindset: Why Organize Code This Way?

At first glance, the layered structure might seem like over-engineering for a small app. Why not just write a simple server that directly writes to the database and sends to Kafka? The answer is **maintainability and flexibility**. Clean Architecture (and similar patterns) provide several benefits:

- **Decoupling:** Each part of the code has a single responsibility. Your core business rules (e.g., what constitutes a valid order, how an order is processed) are not tangled up with SQL queries or HTTP handlers. This means you can change one part without heavily impacting others. For instance, if you decide to switch from Kafka to a different messaging system, you might only need to change the `infrastructure` layer for the outbox consumer. The usecase code that says “publish order created event” remains the same.
- **Testability:** Because the use cases depend on interfaces, you can provide fake implementations during tests. You could test the Order creation logic in-memory without a running Postgres or Kafka by substituting a stub repository that just records calls. This makes it easier to write unit tests for your business logic, which is crucial for catching issues early.
- **Understandability:** For new developers (including you, the reader!), the code structure communicates the intended architecture. When you open the project, you can quickly locate where the domain concepts are defined versus where the external communication happens. It provides a clear roadmap of the system.
- **Reusability:** Cleanly separated code can sometimes be reused. For example, the domain models are pure Go structs and can potentially be shared or moved to another service if needed, without pulling in DB or Kafka dependencies.
- **Conway’s Law alignment:** In a microservices environment, each service might follow a similar internal architecture. It provides consistency across projects, which is helpful in a team setting. Also, if one day the Orders service is split or needs to call another internal usecase, the boundaries are already well-defined.

**Trade-offs:** Of course, with all these benefits, there’s a cost. The code can be more verbose with lots of interface definitions and boilerplate to wire things together. For a very simple script or a tiny project, it might feel like overkill to have so many layers. Clean Architecture is a guide, not a hard rule — you should apply the level of abstraction that makes sense. However, for learning purposes, this project shows a full-fledged separation, which is great practice for larger systems you’ll encounter in a professional environment.

In our go-orders-outbox example, the Clean Architecture style complements the outbox pattern. The domain/usecase layers don’t need to know that Kafka is in play — they just know that when an order is created, an event needs to be recorded (via the Outbox interface). The infrastructure deals with the database and the actual Kafka publishing. This separation makes it easier to reason about the consistency guarantees: the usecase ensures the two writes happen in one transaction, and the consumer service in infrastructure ensures delivery to Kafka.

So, thinking in Clean Architecture terms encourages you to ask: **“Am I mixing business logic with infrastructure?”** If yes, consider splitting it. Over time, this leads to codebases that scale with complexity far better.

## Docker Compose Setup: Running Postgres, Kafka (Redpanda), and Services

To run a system composed of multiple services (database, brokers, application servers), **Docker Compose** is a handy tool. The go-orders-outbox project includes a `docker-compose.yml` that defines all the necessary services and how they connect. Let’s break down the main components defined in the Compose setup:

- **PostgreSQL Database (**`**postgres**` **service):** This is the relational database holding the orders and outbox tables. In the compose file, you’ll see an image like `postgres:15` (or a similar version tag), environment variables for the database name, user, and password, and a volume to persist data. Other services will refer to this DB by the hostname `postgres` (the service name becomes a DNS name in the compose network).
- **Redpanda (Kafka Broker) (**`**redpanda**` **service):** Redpanda is a Kafka-compatible streaming platform that doesn’t require Zookeeper, making it simpler for local deployment. In the compose file, the Redpanda service likely uses the official Redpanda Docker image. It will expose the Kafka listener port (often 9092 or 29092) for other services to produce to or consume from. The Orders service and consumer will use the broker address `redpanda:9092` to connect (Compose sets up a default network so services can reach each other by name).
- **Orders App (**`**app**` **service):** This is the container running our Go application (the Orders API). The Dockerfile for this might be multi-stage: building the Go binary and then running it. In development, it might use the `air` tool (more on that soon) for live reload. This service will wait for Postgres to be up (sometimes compose files have a small script or use `depends_on` to ensure ordering) and then start the HTTP server. The app connects to Postgres (using the host `postgres` and configured credentials) to perform its queries. Interestingly, the app in this pattern might **not** connect to Kafka at all – it just writes to the outbox in the database.
- **Outbox Consumer (**`**consumer**` **service):** This is the separate service that continuously monitors the outbox table and publishes events to Kafka. It’s essentially another Go program (from `cmd/consumer/main.go`) built into its own container. The consumer service will also connect to Postgres (to read and update outbox entries) and to Redpanda (Kafka) to send messages. In Compose, it might use the same image as the app (if both binaries are built together), just running a different entrypoint/command to start the consumer binary. This service might not expose any HTTP port – it likely just runs as a background worker.
- **Migrator (**`**migrator**` **service):** Often, projects include a migration step to ensure the database schema is up-to-date. The migrator could be a container that runs a migration tool (like golang-migrate or a custom migration script in Go) and then exits. Its job is to apply the latest SQL migrations to the Postgres DB (creating the tables like `orders` and `outbox`). In Compose, this service would run on startup, ensure the tables exist, then finish. The other services might be configured to wait until migrations are done (through dependency or a retry logic) before fully starting operations.

All these services are defined in the Compose file with a shared network. This means they can reach each other by service name. For example, the app’s config might point to `postgres://user:pass@postgres:5432/ordersdb` for the database, and `redpanda:9092` for Kafka broker address.

```c
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: orders
    ports:
      - "5432:5432"
    volumes:
      - ./docker/postgres/data/:/var/lib/postgresql/data/

  redpanda:
    image: redpandadata/redpanda:latest
    command:
      - redpanda start
      - --overprovisioned
      - --smp 1
      - --memory 512M
      - --reserve-memory 0M
      - --node-id 0
      - --check=false
      - --kafka-addr PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://redpanda:9092
    ports:
      - "9092:9092"

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8085:8080"
    environment:
      - KAFKA_CLUSTERS_0_NAME=local
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=redpanda:9092
    depends_on:
      - redpanda
  migrator:
    build:
      context: .
      dockerfile: ./docker/migrator/Dockerfile
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: orders
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DSN: postgres://user:pass@postgres:5432/orders?sslmode=disable
    depends_on:
      - postgres
    command: [ "./wait-and-migrate.sh" ]  
    volumes:
      - ./migrations:/app/migrations
  app:
    build:
      context: .
      dockerfile: ./docker/app/Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - ./cmd:/app/cmd
      - ./internal:/app/internal
      - ./go.mod:/app/go.mod
      - ./go.sum:/app/go.sum
      - ./migrations:/app/migrations
      - ./configs/.env.yml:/app/configs/.env.yml
    depends_on:
      - postgres
      - redpanda
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/orders?sslmode=disable
      - KAFKA_BROKER=redpanda:9092
  consumer:
    build:
      context: .
      dockerfile: ./docker/consumer/Dockerfile
    ports:
      - "8082:8082"
    depends_on:
      - redpanda
    environment:
      - KAFKA_BROKER=redpanda:9092

volumes:
  pgdata:
```

To run the whole system, you’d typically use `docker-compose up`. The migration service would run first (setting up schema), Postgres and Redpanda start, then the app and consumer start. After a few seconds, you have an Orders service running. You could then simulate creating an order (perhaps by calling an HTTP endpoint on the app if it exposes one), and verify that the event shows up in Redpanda (Kafka). Redpanda has a handy CLI (`rpk`) or you could attach a Kafka viewer to see messages, but even without that, you might see logs from the consumer service indicating it published an event.

The Docker Compose setup makes it easy for a newcomer to run the whole architecture on their machine, without manually starting a DB and Kafka and wiring them. It also ensures that the environment (versions of DB, Kafka, etc.) is consistent.

## Hot-Reload with Air for Faster Development

During development, it’s tedious to rebuild and restart your Go application container every time you make a code change. This project addresses that by using **Air** — a live-reloading tool for Go. Air watches your files and automatically rebuilds and restarts the Go binary when you edit the source code. This provides a fast feedback loop, which is great when you’re iterating on an API or debugging something.

How is Air used here? Typically, there are two ways:

- **Locally on host:** You can install the `air` tool on your machine and run `air` in the project directory. The `air.toml` configuration (usually provided in the repo) will tell it how to build and run the project (which directory to watch, what command to run, etc.). If the project is set up with multiple binaries (app and consumer), you might run Air for each (maybe in separate terminals) or have Air start both.
- **Inside Docker:** Another common approach is to use a Docker image for Air. In the Compose file, instead of running the compiled app directly, the `app` service could use the Air image as its base in development mode. It would mount the source code into the container and the Air process inside would compile and run the app. For example, the Dockerfile (dev stage) or compose might have something like `command: air -c .air.toml` for the app service. This way, as you edit code on your host (which is volume-mounted into the container), the Air inside notices changes and rebuilds. The benefit is you don’t need Go installed on your host or the Air tool globally – Docker handles it.
- In go-orders-outbox, the presence of Air means that the project is optimized for a better developer experience:
- You can change a Go file in, say, the usecase or infrastructure layer, hit save, and within a second or two the running container restarts the app with your changes. No need to manually stop containers or rebuild images each time.
- This encourages experimentation: as a beginner, you can tweak the code, e.g., modify how an order is validated or how the outbox logger prints messages, and see the effect immediately.
```c
# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

RUN apk add --no-cache git build-base

COPY . ./
COPY ./configs/.air.toml ./
#
#RUN go build -o main ./cmd/app
#
## Final stage
#FROM alpine:latest
#
#WORKDIR /root/
#
#COPY --from=builder /app/main .
#COPY ./configs/ ./

RUN go install github.com/cosmtrek/air@v1.45.0

EXPOSE 8081

CMD ["air"]
```

The key point is that Air is there to save you time. As you learn from this project, you can play with the code and immediately observe how the system behaves, which is one of the best ways to solidify understanding. It’s a friendly tool that makes the development process much smoother, especially in a project with multiple moving parts like this.

## Code Walkthrough: Creating an Order and Publishing an Event

Now for the fun part — let’s see how the code actually works for the main flow of creating an order. We’ll walk through two pieces of the puzzle:

1. The logic that runs when a new order is created (which will involve writing to the database and the outbox).
2. The outbox consumer logic that takes that event from the DB and sends it to Kafka.

We’ll use simplified Go snippets (not the full code) with comments to illustrate these steps.

## 1\. Order Creation (writing to Orders and Outbox in one transaction)

When the Orders service receives a request to create a new order (for example, an HTTP POST `/orders` with JSON data), it will invoke a usecase method to handle it. This might be `CreateOrder(ctx, orderData)`. Here’s a pseudo-code version of what happens, focusing on the database transaction and outbox:

```c
func (uc *CreateOrderUseCase) Execute(ctx context.Context, input CreateOrderInput) error {
 totalAmountDecimal := new(decimal.Big).SetFloat64(input.TotalAmount)

 order := &models.Order{
  ID:          uuid.New().String(),
  UserID:      input.UserID,
  TotalAmount: types.NewDecimal(totalAmountDecimal),
  Status:      models.OrderStatusPending,
 }

 orderPayload, err := json.Marshal(order)
 if err != nil {
  log.Err(err).Msg("failed to marshal order")

  return errors.New("failed to marshal order")
 }
 
 err = uc.uow.Do(ctx, func(tx *sql.Tx) (err error) {
  if err := uc.orderRepo.Save(ctx, tx, order); err != nil {
   return err
  }

  event := &models.Outbox{
   ID:            uuid.New().String(),
   AggregateType: string(outbox.OrderOutboxAggregateType),
   AggregateID:   order.ID,
   Type:          string(outbox.OutboxEventTypeOrderCreated),
   Payload:       orderPayload,
   SentAt:        null.TimeFromPtr(nil),
   OccurredAt:    null.TimeFrom(time.Now()),
  }

  return uc.outboxRepo.Save(ctx, tx, event)
 })

 if err != nil {
  log.Err(err).Msg("failed to save order")

  return errors.New("failed to save order")
 }

 return nil
}
```

*What’s happening here?* We explicitly begin a transaction and do two inserts: one to `orders` and one to `outbox`. Only after both succeed do we commit. If any step fails, we roll back so the database isn’t left in a partial state. In a Clean Architecture implementation, this code might be split differently – for instance, the `OrderRepository.Create(order, tx)` could handle the SQL, and similarly an `OutboxRepository.Save(event, tx)`. But the core idea remains: **wrap the operations in one atomic transaction**.

Also note: the `OutboxEvent.Payload` in this example stores the entire order as JSON. This is a simple approach to ensure the event has all necessary info. In practice, you might just store the order ID and let the consumer fetch details from the DB, but that re-introduces coupling. Storing the needed data in the outbox event can let other services rely solely on the event without calling back to the order service. It’s a design choice – here we went with self-contained events.

After this function runs, the client (whoever made the request) gets a success response that the order was created. Nothing has been sent to Kafka *yet* — that will happen shortly in the background. From the user’s perspective, they don’t wait for the event to be delivered; the system is event-driven.

## 2\. Outbox dispatcher (reading from DB and sending to Kafka)

On the other side, our **consumer service** is running. Its job is to continually look at the `outbox` table for any events that need publishing. There are several ways to implement this polling; one simple way is an infinite loop with a small sleep, which checks for new outbox entries. Here’s a conceptual snippet of what the outbox processor might do:

```c
func (o *OutboxDispatcher) Execute() error {
 log.Info().Msg("Starting outbox dispatcher")

 ctx, cancel := context.WithCancel(context.Background())
 defer cancel()

 ticker := time.NewTicker(o.pollInterval)
 defer ticker.Stop()

 workerChan := make(chan models.Outbox, o.workerCount)
 for range o.workerCount {
  go o.worker(ctx, workerChan)
 }

 for {
  select {
  case <-ticker.C:
   log.Info().Msg("Fetching outboxes")
   events, _ := o.outboxRepo.FetchUnsent(ctx)

   for _, event := range events {
    workerChan <- *event
   }
  default:
   log.Warn().Msg("worker pool full, skipping for now")
   time.Sleep(time.Second * 5)
  case <-ctx.Done():
   return ctx.Err()
  }
 }

 return nil
}

func (o *OutboxDispatcher) worker(ctx context.Context, channel <-chan models.Outbox) {
 for {
  select {
  case outboxEvent := <-channel:
   o.process(ctx, outboxEvent)
  case <-ctx.Done():
   return
  }

 }

}

func (o *OutboxDispatcher) process(ctx context.Context, eventOutbox models.Outbox) {
 log.Info().Msg("Processing outbox...")

 ctx, cancel := context.WithTimeout(ctx, time.Second*10)
 defer cancel()

 topic, ok := common.AggregateTypeToTopic[eventOutbox.AggregateType]
 if !ok {
  return
 }

 key := fmt.Sprintf("%s-%s", eventOutbox.AggregateType, eventOutbox.ID)
 err := o.eventPublisher.Publish(ctx, topic, key, eventOutbox.Payload)
 if err != nil {
  log.Err(err).Msg("failed to publish outbox")
 }

 eventOutbox.SentAt = null.TimeFrom(time.Now())

 err = o.outboxRepo.Save(ctx, nil, &eventOutbox)
 if err != nil {
  log.Err(err).Msg("failed to save outbox")
 }

 log.Info().Msg("outbox processed...")

}
```

A few important things to note in this logic:

- We query for outbox entries where `published_at IS NULL` (meaning not yet sent). We limit to a certain number to avoid reading too many at once. In a real system, you might also order by creation time.
- We then iterate and for each event, send it to Kafka. Here we used a hypothetical Kafka client (`kafkaWriter`) – in practice, this could be something like Segment’s kafka-go writer or Sarama. The message consists of a topic, a key, and a value (we put the payload as the message value).
- If the `WriteMessages` fails, we log an error and *do not* mark the event as published. That means it stays in the outbox table and the loop will retry sending it on the next tick (1 second later, or however the ticker is set). This provides a simple retry mechanism.
- If sending succeeds, we immediately update that row in the outbox (setting `published_at` or a similar flag). This marks it as done, so we won’t send it again. If the update fails (perhaps transient DB issue), our code logs it but doesn’t retry immediately. In such a case, the event might be sent again next time (because it wasn’t marked). This is exactly the scenario of at-least-once delivery causing a duplicate. Handling that thoroughly might involve wrapping the send+update in a transaction or using a "send once" guarantee from the broker, but those are advanced topics. For now, the simple approach works with the expectation that consumers can handle the occasional duplicate.
- The loop runs forever (until context is canceled, e.g., when shutting down the service). We use a ticker to pause a bit between polls to avoid hammering the DB constantly. One second is fine for many cases; you could tune this or even make it event-driven (like using PostgreSQL NOTIFY/LISTEN to wake up when new events come, or simply no sleep if you expect low volume). But a small delay is acceptable since it’s asynchronous anyway.

The consumer service ties the whole flow together: an order gets created (and outbox entry written), then within a second or so, the outbox service sees it and publishes to Kafka. If you were to run this system and create, say, 5 orders, you’d find 5 messages in the Kafka topic **orders.events** — each containing the data of an order in JSON form. If a message fails to send due to a broker outage, the outbox entry remains and will send once the broker is back (ensuring eventual delivery).

From the perspective of a developer or an architect, this pattern offloads the reliability concern to the outbox and consumer: the Orders API code can remain clean and not worry about Kafka failures at request time. Meanwhile, the system as a whole guarantees that no event is missed.

## Thinking Architecturally: Decoupling, Consistency, and Maintainability

Good architecture is about anticipating complexity before it becomes a problem. Instead of simply writing code that works, backend developers should aim to build systems that are **resilient, adaptable, and easy to reason about**. Below are key architectural principles that can guide your thinking — especially when building services that interact with databases and message brokers.

### Decouple Through Events

When services communicate **asynchronously** using events rather than direct calls, they become more flexible and independent. For example, instead of an Orders service calling Inventory or Billing services directly, it can simply emit an `OrderCreated` event. Any service that cares can subscribe and react on its own terms. This kind of decoupling improves **scalability**, reduces tight coupling, and allows individual services to evolve independently.

> *Design tip: Whenever possible, prefer* ***event-based communication*** *between systems to reduce coordination and failure propagation.*

### Ensure Data Consistency Across Boundaries

When your workflow spans multiple systems (like a database and Kafka), you need a way to ensure they stay consistent — especially in failure scenarios. A pattern like **Transactional Outbox** lets you save both the core data (e.g. an order) and the outbound event **in a single DB transaction**, ensuring they succeed or fail together.

> Design tip: Avoid naïve “double-writes” to different systems. Use **atomic patterns** like Outbox to guarantee consistency between your database and event streams.

### Design for Failure (It Will Happen)

Reliable systems embrace the idea that **failures are normal**. Brokers crash, networks flake out, services restart mid-transaction. A robust design ensures that your system still behaves correctly in those moments. For instance, if Kafka is temporarily unavailable, your service should still be able to accept new orders — by queuing the event in the DB to be published later.

> Design tip: Use **graceful degradation** — isolate failure domains so one broken dependency doesn’t take down your entire service.

### Keep Code Maintainable with Layered Separation

Organizing code into layers — like domain, use case, and infrastructure — makes systems **easier to test, change, and scale**. Business logic stays clean and independent of tech details. Infrastructure (like Postgres or Kafka) is plugged in as needed. This means you can change or upgrade one part without rewriting everything.

### Understand the Trade-offs

Every architectural choice comes with trade-offs. Using an outbox pattern, for example, introduces additional services and code — but buys you consistency and resilience. For critical flows (like payments or orders), that complexity is justified. For less critical cases (like logging analytics), a simpler, less reliable setup may be acceptable.

### Plan for Extensibility

A good architecture doesn’t just solve today’s problems — it prepares for future ones. If tomorrow you need to publish a new type of event (like `OrderCancelled`), the system should support that without a full rewrite. If you need to run multiple consumers, your design should support scaling. Structuring your system around well-defined contracts and interfaces makes this easy.

> Design tip: Choose patterns that make **change cheap**. Favor clear boundaries, reusable logic, and loosely coupled components.

In short, architectural thinking is about **designing for clarity, resilience, and growth**. These principles apply whether you’re working on a startup MVP or a distributed enterprise platform. As a developer, learning to spot these patterns — and knowing when to apply them — will help you build systems that go beyond “it works on my machine” and into production with confidence.

## Conclusion and Next Steps

We’ve covered a lot of ground: from understanding event-driven design and the transactional outbox pattern, to examining a Clean Architecture code structure and stepping through the code of an order creation flow. By now, you should have a solid understanding of how the **go-orders-outbox** project achieves reliable event publishing and a maintainable design.

To recap, the Orders service creates an order and an outbox event in one go, and a separate process ensures the event is delivered to Kafka, decoupling the processes but keeping them consistent. The code is organized so that each piece has a clear role, making it easier to reason about and extend.

**What can you do next with this knowledge or project?** Here are some ideas to continue learning and improving the system:

1. **Add Retry & Backoff Logic:** In the current setup, if the Kafka publish fails, the outbox consumer just tries again on the next tick (every second). You could enhance this by implementing exponential backoff or a maximum retry count. For instance, maintain a retry count in the outbox table or use a backoff algorithm in the code to gradually increase the wait time for persistent failures. This would make the system more robust in handling longer outages or errors.
2. **Improve Observability:** Integrate logging and monitoring. You could add structured logs or even distributed tracing to follow an order from creation to event publication. Another great addition is metrics — for example, track the number of pending outbox messages, or the rate of events published, using a tool like Prometheus. Observability will help you see that your outbox is working (or alert you if it’s backing up).
3. **Handle Updates and Deletes:** Currently, the system likely focuses on new orders. But real systems also have updates (status changes, etc.) and deletions (order cancelled). Try extending the pattern: whenever an order is updated or deleted, insert a corresponding event in the outbox (e.g., “OrderUpdated”, “OrderCancelled”). Ensure your code and database schema can support multiple event types and that the consumer handles each appropriately (perhaps with different Kafka topics or messages types).
4. **Deduplication Strategy:** For advanced learning, consider how you might ensure exactly-once processing. This could involve using unique message keys (so Kafka compaction could remove duplicates), or designing the consumers of events to track processed event IDs. You could also experiment with wrapping the “mark as published” update and the send operation in a transaction if using Kafka’s transaction API or a tool like Debezium for outbox reading.
5. **External Consumer Simulation:** To see the full event-driven flow, you might write a simple consumer (in Go or any language) that subscribes to the Kafka topic (orders.events) and prints out messages or updates another service. This would emulate, say, an Inventory service reacting to Order events. It’s a good exercise to use a Kafka client and verify that the events indeed come through with the data you expect.
6. **Read Through the Repository:** Finally, go to the go-orders-outbox repository and browse the actual code. Match it with the concepts you learned here. Seeing the real code (which may use different function names or a framework) will solidify your understanding. Don’t hesitate to clone it and run it locally to play around.

By exploring these next steps, you’ll deepen your practical knowledge. The lessons from this project — designing for consistency, using patterns to handle failure, and organizing code cleanly — apply to many other scenarios in software development. As you progress in your career, you’ll repeatedly encounter situations where you’ll think back to the principles discussed here.

**Happy coding and architecting!** With this foundation, you’re better equipped to build systems that aren’t just functional, but also resilient and well-structured. Keep experimenting, and remember that good architecture is an evolving process of learning and improvement. The more you practice these concepts, the more they become second nature when designing your own projects. Now, go build something amazing!

💻 **Full source code on GitHub:**  
[https://github.com/steffanharmaajarvi/go-orders-outbox](https://github.com/steffanharmaajarvi/go-orders-outbox)

## 👨💻 About the Author

I’m a backend engineer with 7 years of experience working with Go, distributed systems, and event-driven architectures. I enjoy building scalable, resilient systems with a clean and pragmatic design approach.

You can find me on:

- 💼 [LinkedIn](http://linkedin.com/in/steffan-kharmaaiarvi-72b804213/)
- 💻 [GitHub](https://github.com/steffanharmaajarvi)

Backend engineer | Go, distributed systems, event-driven architecture | Writing about clean code and resilient design

## Responses (5)

Riyad\_Karim

What are your thoughts?  

```c
Great article! Helped me get a great feeling for how to implement this pattern.I also just wanted to let you know that you excluded the outbox repository folder from your git repo. The gitignore may be the issue here.
```

1

```c
Redpanda is not a broker, it just suitable UI for KAFKA&Shema registry
```

## More from Steffan Kharmaaiarvi

## Recommended from Medium

[

See more recommendations

](https://medium.com/?source=post_page---read_next_recirc--3928bf315e0a---------------------------------------)