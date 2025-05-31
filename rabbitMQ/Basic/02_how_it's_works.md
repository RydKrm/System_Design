## 🧠 Brief Theory: How RabbitMQ Works

#### RabbitMQ uses a message queue model with 4 main components:

```css
[ Producer ] → [ Exchange ] → [ Queue ] → [ Consumer ]
```

#### 1. Producer

The service or app that sends messages.

#### 2. Exchange

Takes incoming messages from the producer and routes them to one or more queues.
Types of exchanges:

- Direct: Routes by specific key
- Fanout: Broadcasts to all queues
- Topic: Routes based on pattern
- Headers: Routes by headers

#### 3.Queue

A buffer where messages wait to be processed. Think of it like a line.

#### 4. Consumer

A service that reads and processes messages from the queue.

## 📦 Real-World Analogy

#### 📮 Scenario: Sending Emails After User Sign-Up

Let’s say you have a User Registration Service and an Email Service.

#### 🔄 Flow:

- 1. A user signs up (Producer).
     Your backend sends a message:
     { type: "email", content: "Send welcome email to john@example.com" }

- 2. RabbitMQ receives it via an Exchange.
     Exchange checks routing rules and pushes it to an emailQueue.

- 3. The message sits in the emailQueue (Queue) until a consumer picks it up.
- 4. The Email Service (Consumer) is listening to that queue.
     It receives the message and sends the actual email.

- 5. Once processed, the consumer acknowledges the message, and it's removed from the queue.

### Sending Message

```javascript
// producer.js
const amqp = require("amqplib");

async function send() {
  const conn = await amqp.connect("amqp://localhost");
  const ch = await conn.createChannel();

  const queue = "emailQueue";
  const msg = "Send welcome email to john@example.com";

  await ch.assertQueue(queue, { durable: true });
  ch.sendToQueue(queue, Buffer.from(msg));

  console.log("Message sent:", msg);
  setTimeout(() => conn.close(), 500);
}

send();
```

### Receive Message

```javascript
// consumer.js
const amqp = require("amqplib");

async function receive() {
  const conn = await amqp.connect("amqp://localhost");
  const ch = await conn.createChannel();

  const queue = "emailQueue";

  await ch.assertQueue(queue, { durable: true });

  console.log("Waiting for messages in", queue);
  ch.consume(queue, (msg) => {
    if (msg !== null) {
      console.log("Received:", msg.content.toString());
      // Here you'd send the email...
      ch.ack(msg);
    }
  });
}

receive();
```

### ✅ Summary

| Step | What Happens?                                    |
| ---- | ------------------------------------------------ |
| 1️⃣   | User signs up → Producer sends message           |
| 2️⃣   | Message goes to Exchange → Routed to Queue       |
| 3️⃣   | Email service (Consumer) reads from queue        |
| 4️⃣   | Email is sent → Message acknowledged and removed |
