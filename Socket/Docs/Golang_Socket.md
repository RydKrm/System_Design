# Comprehensive Guide to Golang Socket Implementation

## Understanding Sockets: The Foundation of Real-Time Communication

Before we dive into the intricacies of socket implementation in Golang, let us first understand what sockets truly represent in the realm of network programming. In its most fundamental form, a socket is an endpoint for sending or receiving data across a computer network. Think of it as a door through which data flows bidirectionally between a client and a server. Unlike traditional HTTP requests where the client sends a request and waits for a response before closing the connection, sockets maintain a persistent connection that allows data to flow in both directions simultaneously, much like a telephone conversation where both parties can speak and listen at any time.

In the context of modern web applications, we primarily work with WebSockets, which is a protocol that provides full-duplex communication channels over a single TCP connection. The beauty of WebSockets lies in their ability to upgrade an initial HTTP connection into a long-lived socket connection, enabling real-time data transfer without the overhead of repeatedly establishing new connections. This is particularly crucial for applications that require instant updates, such as chat applications, live notifications, real-time dashboards, collaborative editing tools, and file upload progress tracking.

## The Architecture of Socket Communication

```
┌─────────────────────────────────────────────────────────────────────-┐
│                     WebSocket Connection Lifecycle                   │
├───────────────────────────────────────────────────────────────────-──┤
│                                                                      │
│  Client                                    Server                    │
│    │                                          │                      │
│    │  HTTP GET /ws (Upgrade Request)          │                      │
│    │ ────────────────────────────────────────>│                      │
│    │                                          │                      │
│    │  101 Switching Protocols                 │                      │
│    │ <────────────────────────────────────────│                      │
│    │                                          │                      │
│    │═══════════ WebSocket Connection ═════════│                      │
│    │          (Bidirectional Stream)          │                      │
│    │                                          │                      │
│    │  Message Frame (Text/Binary)             │                      │
│    │ ────────────────────────────────────────>│                      │
│    │                                          │                      │
│    │  Message Frame (Text/Binary)             │                      │
│    │ <────────────────────────────────────────│                      │
│    │                                          │                      │
│    │  Ping Frame (Heartbeat)                  │                      │
│    │ ────────────────────────────────────────>│                      │
│    │                                          │                      │
│    │  Pong Frame (Heartbeat Response)         │                      │
│    │ <────────────────────────────────────────│                      │
│    │                                          │                      │
│    │  Close Frame                             │                      │
│    │ ────────────────────────────────────────>│                      │
│    │                                          │                      │
│    │  Close Frame (Acknowledgment)            │                      │
│    │ <────────────────────────────────────────│                      │
│    │                                          │                      │
│    ✗                                          ✗                     │
│                                                                      │
└───────────────────────────────────────────────────────────────────-──┘
```

The diagram above illustrates the complete lifecycle of a WebSocket connection. Initially, the client initiates a standard HTTP request with special upgrade headers indicating the desire to establish a WebSocket connection. The server, upon recognizing these headers, responds with a 101 status code, signifying that it agrees to switch protocols. Once this handshake is complete, the connection transforms into a persistent bidirectional channel where both parties can send messages at any time without waiting for a request-response cycle.

## Core Socket Implementation in Golang

Golang provides excellent support for WebSocket implementation through the gorilla/websocket package, which is considered the de facto standard in the Go community. This package offers a robust and performant implementation that handles all the complexities of the WebSocket protocol, including frame parsing, masking, compression, and connection management. Let us explore how to implement a basic WebSocket server and then progressively build upon it to create production-grade systems.

The first step in implementing WebSocket functionality is to create an upgrader that converts HTTP connections into WebSocket connections. The upgrader is responsible for handling the handshake process and validating the upgrade request. Here is how we establish this fundamental component:

```go
package main

import (
    "log"
    "net/http"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // In production, implement proper origin checking
    },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Error upgrading connection:", err)
        return
    }
    defer conn.Close()

    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            log.Println("Error reading message:", err)
            break
        }
        
        log.Printf("Received: %s", message)
        
        err = conn.WriteMessage(messageType, message)
        if err != nil {
            log.Println("Error writing message:", err)
            break
        }
    }
}

func main() {
    http.HandleFunc("/ws", handleWebSocket)
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

This basic implementation demonstrates the fundamental pattern of WebSocket handling in Go. The upgrader transforms an incoming HTTP connection into a WebSocket connection, after which we enter a loop that continuously reads messages from the client and echoes them back. While this example is simplistic, it forms the foundation upon which we will build more sophisticated systems.

## Production-Grade WebSocket Architecture

In a production environment, managing WebSocket connections requires a much more sophisticated approach than our basic example. We need to handle multiple concurrent connections, implement proper connection pooling, manage message broadcasting, handle graceful shutdowns, implement reconnection logic, and ensure thread safety across all operations. Let us explore a production-ready architecture that addresses all these concerns.

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Production WebSocket Architecture                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┐         ┌─────────────────────────────────────┐      │
│  │   Clients    │         │         Load Balancer               │      │
│  │  (Browsers,  │────────>│     (NGINX / HAProxy)               │      │
│  │   Mobile)    │         │   - Sticky Sessions                 │      │
│  └──────────────┘         │   - Health Checks                   │      │
│                           └─────────────────────────────────────┘      │
│                                         │                              │
│                                         ▼                              │
│                           ┌──────────────────────────┐                 │
│                           │   WebSocket Server Pool  │                 │
│                           │   (Multiple Instances)   │                 │
│                           └──────────────────────────┘                 │
│                                         │                              │
│              ┌──────────────────────────┼──────────────────────┐       │
│              │                          │                      │       │
│              ▼                          ▼                      ▼       │
│    ┌─────────────────┐       ┌─────────────────┐   ┌─────────────────┐ │
│    │   Server Node 1 │       │   Server Node 2 │   │   Server Node 3 │ │
│    ├─────────────────┤       ├─────────────────┤   ├─────────────────┤ │
│    │ - Hub Manager   │       │ - Hub Manager   │   │ - Hub Manager   │ │
│    │ - Conn Pool     │       │ - Conn Pool     │   │ - Conn Pool     │ │
│    │ - Message Queue │       │ - Message Queue │   │ - Message Queue │ │
│    └─────────────────┘       └─────────────────┘   └─────────────────┘ │
│              │                          │                      │       │
│              └──────────────────────────┼──────────────────────┘       │
│                                         ▼                              │
│                           ┌──────────────────────────┐                 │
│                           │   Message Broker (Redis) │                 │
│                           │   - Pub/Sub Channels     │                 │
│                           │   - Presence Tracking    │                 │
│                           │   - Connection Registry  │                 │
│                           └──────────────────────────┘                 │
│                                         │                              │
│                                         ▼                              │
│                           ┌──────────────────────────┐                 │
│                           │   Database Layer         │                 │
│                           │   - PostgreSQL / MongoDB │                 │
│                           │   - Message History      │                 │
│                           │   - User Sessions        │                 │
│                           └──────────────────────────┘                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

This architecture diagram reveals the complexity required for a production-grade WebSocket system. At the foundation, we have multiple server nodes behind a load balancer, which distributes incoming connections across available instances. Each server node maintains its own hub manager that orchestrates connections and message routing. The critical component here is Redis, which serves as a message broker enabling communication between different server instances. When a message needs to be broadcast to users connected to different servers, Redis Pub/Sub ensures that all nodes receive and forward the message to their respective clients.

## The Hub Pattern: Managing Connections at Scale

The hub pattern is the cornerstone of scalable WebSocket applications in Go. A hub acts as a central registry and coordinator for all active connections, managing registration, deregistration, and message broadcasting. The hub runs in its own goroutine and uses channels to communicate with client connections, ensuring thread-safe operations without explicit locking. Let us examine a comprehensive hub implementation:

```go
package websocket

import (
    "encoding/json"
    "log"
    "sync"
    "time"
)

type Message struct {
    Type      string          `json:"type"`
    Sender    string          `json:"sender"`
    Recipient string          `json:"recipient,omitempty"`
    Room      string          `json:"room,omitempty"`
    Content   json.RawMessage `json:"content"`
    Timestamp time.Time       `json:"timestamp"`
}

type Client struct {
    ID       string
    UserID   string
    Rooms    map[string]bool
    Hub      *Hub
    Conn     *websocket.Conn
    Send     chan []byte
    mu       sync.RWMutex
}

type Hub struct {
    clients    map[string]*Client
    rooms      map[string]map[string]*Client
    register   chan *Client
    unregister chan *Client
    broadcast  chan *Message
    mu         sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[string]*Client),
        rooms:      make(map[string]map[string]*Client),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan *Message, 256),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.registerClient(client)
            
        case client := <-h.unregister:
            h.unregisterClient(client)
            
        case message := <-h.broadcast:
            h.broadcastMessage(message)
        }
    }
}

func (h *Hub) registerClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    h.clients[client.ID] = client
    log.Printf("Client registered: %s (User: %s)", client.ID, client.UserID)
    
    // Send connection acknowledgment
    ack := Message{
        Type:      "connection_ack",
        Sender:    "system",
        Content:   json.RawMessage(`{"status":"connected"}`),
        Timestamp: time.Now(),
    }
    
    data, _ := json.Marshal(ack)
    select {
    case client.Send <- data:
    default:
        close(client.Send)
        delete(h.clients, client.ID)
    }
}

func (h *Hub) unregisterClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if _, ok := h.clients[client.ID]; ok {
        delete(h.clients, client.ID)
        close(client.Send)
        
        // Remove from all rooms
        for room := range client.Rooms {
            if clients, ok := h.rooms[room]; ok {
                delete(clients, client.ID)
                if len(clients) == 0 {
                    delete(h.rooms, room)
                }
            }
        }
        
        log.Printf("Client unregistered: %s", client.ID)
    }
}

func (h *Hub) broadcastMessage(message *Message) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    
    data, err := json.Marshal(message)
    if err != nil {
        log.Printf("Error marshaling message: %v", err)
        return
    }
    
    if message.Recipient != "" {
        // Direct message to specific user
        h.sendToUser(message.Recipient, data)
    } else if message.Room != "" {
        // Broadcast to room
        h.sendToRoom(message.Room, data)
    } else {
        // Broadcast to all clients
        for _, client := range h.clients {
            select {
            case client.Send <- data:
            default:
                close(client.Send)
                delete(h.clients, client.ID)
            }
        }
    }
}

func (h *Hub) sendToUser(userID string, data []byte) {
    for _, client := range h.clients {
        if client.UserID == userID {
            select {
            case client.Send <- data:
            default:
                close(client.Send)
                delete(h.clients, client.ID)
            }
        }
    }
}

func (h *Hub) sendToRoom(room string, data []byte) {
    if clients, ok := h.rooms[room]; ok {
        for _, client := range clients {
            select {
            case client.Send <- data:
            default:
                close(client.Send)
                delete(h.clients, client.ID)
            }
        }
    }
}

func (h *Hub) JoinRoom(clientID, room string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    client, ok := h.clients[clientID]
    if !ok {
        return
    }
    
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[string]*Client)
    }
    
    h.rooms[room][clientID] = client
    client.Rooms[room] = true
    
    log.Printf("Client %s joined room %s", clientID, room)
}

func (h *Hub) LeaveRoom(clientID, room string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    client, ok := h.clients[clientID]
    if !ok {
        return
    }
    
    if clients, ok := h.rooms[room]; ok {
        delete(clients, clientID)
        if len(clients) == 0 {
            delete(h.rooms, room)
        }
    }
    
    delete(client.Rooms, room)
    log.Printf("Client %s left room %s", clientID, room)
}
```

This hub implementation showcases several critical production patterns. First, it uses channels for all inter-goroutine communication, ensuring thread safety without complex locking mechanisms. The registration and unregistration processes are handled through dedicated channels, preventing race conditions when clients connect or disconnect. The broadcast mechanism supports three modes of message delivery: direct messaging to a specific user, broadcasting to a room, and global broadcasting to all connected clients. This flexibility is essential for building diverse real-time applications.

## Client Connection Management

Each WebSocket client requires careful management of its read and write operations. In Go, we handle these operations in separate goroutines to prevent blocking and ensure smooth bidirectional communication. The read goroutine continuously listens for incoming messages from the client, while the write goroutine sends messages from the send channel to the client. Let us examine the complete client implementation:

```go
package websocket

import (
    "encoding/json"
    "log"
    "time"
    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 512 * 1024 // 512 KB
)

func NewClient(userID string, hub *Hub, conn *websocket.Conn) *Client {
    return &Client{
        ID:     uuid.New().String(),
        UserID: userID,
        Rooms:  make(map[string]bool),
        Hub:    hub,
        Conn:   conn,
        Send:   make(chan []byte, 256),
    }
}

func (c *Client) ReadPump() {
    defer func() {
        c.Hub.unregister <- c
        c.Conn.Close()
    }()
    
    c.Conn.SetReadDeadline(time.Now().Add(pongWait))
    c.Conn.SetReadLimit(maxMessageSize)
    c.Conn.SetPongHandler(func(string) error {
        c.Conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })
    
    for {
        _, messageData, err := c.Conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }
        
        var message Message
        if err := json.Unmarshal(messageData, &message); err != nil {
            log.Printf("Error unmarshaling message: %v", err)
            continue
        }
        
        message.Sender = c.UserID
        message.Timestamp = time.Now()
        
        // Handle different message types
        switch message.Type {
        case "join_room":
            var roomData struct {
                Room string `json:"room"`
            }
            if err := json.Unmarshal(message.Content, &roomData); err == nil {
                c.Hub.JoinRoom(c.ID, roomData.Room)
            }
            
        case "leave_room":
            var roomData struct {
                Room string `json:"room"`
            }
            if err := json.Unmarshal(message.Content, &roomData); err == nil {
                c.Hub.LeaveRoom(c.ID, roomData.Room)
            }
            
        case "message":
            c.Hub.broadcast <- &message
            
        default:
            log.Printf("Unknown message type: %s", message.Type)
        }
    }
}

func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.Conn.Close()
    }()
    
    for {
        select {
        case message, ok := <-c.Send:
            c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            w, err := c.Conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)
            
            // Add queued messages to current websocket message
            n := len(c.Send)
            for i := 0; i < n; i++ {
                w.Write([]byte{'\n'})
                w.Write(<-c.Send)
            }
            
            if err := w.Close(); err != nil {
                return
            }
            
        case <-ticker.C:
            c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

The client implementation incorporates several production-critical features. The read pump sets appropriate deadlines and size limits to prevent resource exhaustion from malicious or misbehaving clients. It also registers a pong handler that resets the read deadline whenever a pong frame is received, ensuring that idle connections are eventually closed. The write pump implements a heartbeat mechanism by sending ping frames at regular intervals, which the client must respond to with pong frames. This keeps the connection alive through intermediate proxies and load balancers that might otherwise close idle connections.

## Building a Real-Time Notification System

Now that we have established our foundational WebSocket infrastructure, let us examine how to leverage it for building a production-grade notification system. Real-time notifications are essential for modern applications, providing users with instant updates about events that matter to them. Our notification system will support multiple notification types, priority levels, delivery guarantees, and persistence for offline users.

```go
package notification

import (
    "context"
    "encoding/json"
    "time"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "github.com/go-redis/redis/v8"
)

type NotificationType string

const (
    TypeInfo    NotificationType = "info"
    TypeWarning NotificationType = "warning"
    TypeError   NotificationType = "error"
    TypeSuccess NotificationType = "success"
)

type Priority int

const (
    PriorityLow Priority = iota
    PriorityNormal
    PriorityHigh
    PriorityUrgent
)

type Notification struct {
    ID          string           `json:"id" bson:"_id"`
    UserID      string           `json:"user_id" bson:"user_id"`
    Type        NotificationType `json:"type" bson:"type"`
    Priority    Priority         `json:"priority" bson:"priority"`
    Title       string           `json:"title" bson:"title"`
    Message     string           `json:"message" bson:"message"`
    Data        interface{}      `json:"data,omitempty" bson:"data,omitempty"`
    Read        bool             `json:"read" bson:"read"`
    CreatedAt   time.Time        `json:"created_at" bson:"created_at"`
    DeliveredAt *time.Time       `json:"delivered_at,omitempty" bson:"delivered_at,omitempty"`
}

type NotificationService struct {
    hub         *websocket.Hub
    mongodb     *mongo.Database
    redis       *redis.Client
    ctx         context.Context
}

func NewNotificationService(hub *websocket.Hub, mongodb *mongo.Database, redisClient *redis.Client) *NotificationService {
    return &NotificationService{
        hub:     hub,
        mongodb: mongodb,
        redis:   redisClient,
        ctx:     context.Background(),
    }
}

func (ns *NotificationService) SendNotification(notification *Notification) error {
    notification.ID = uuid.New().String()
    notification.CreatedAt = time.Now()
    notification.Read = false
    
    // Persist notification to database
    collection := ns.mongodb.Collection("notifications")
    _, err := collection.InsertOne(ns.ctx, notification)
    if err != nil {
        return err
    }
    
    // Try to deliver via WebSocket
    message := websocket.Message{
        Type:      "notification",
        Sender:    "system",
        Recipient: notification.UserID,
        Timestamp: time.Now(),
    }
    
    content, err := json.Marshal(notification)
    if err != nil {
        return err
    }
    message.Content = content
    
    // Send through hub
    ns.hub.broadcast <- &message
    
    // Also publish to Redis for other server instances
    payload, _ := json.Marshal(message)
    ns.redis.Publish(ns.ctx, "notifications", payload)
    
    // Mark as delivered if user is online
    if ns.isUserOnline(notification.UserID) {
        now := time.Now()
        notification.DeliveredAt = &now
        collection.UpdateOne(ns.ctx, 
            bson.M{"_id": notification.ID},
            bson.M{"$set": bson.M{"delivered_at": now}},
        )
    }
    
    return nil
}

func (ns *NotificationService) isUserOnline(userID string) bool {
    result := ns.redis.Exists(ns.ctx, "online:"+userID)
    return result.Val() > 0
}

func (ns *NotificationService) BroadcastToRoom(room string, notification *Notification) error {
    notification.ID = uuid.New().String()
    notification.CreatedAt = time.Now()
    
    message := websocket.Message{
        Type:      "notification",
        Sender:    "system",
        Room:      room,
        Timestamp: time.Now(),
    }
    
    content, err := json.Marshal(notification)
    if err != nil {
        return err
    }
    message.Content = content
    
    ns.hub.broadcast <- &message
    
    payload, _ := json.Marshal(message)
    ns.redis.Publish(ns.ctx, "room:"+room, payload)
    
    return nil
}

func (ns *NotificationService) GetUndeliveredNotifications(userID string) ([]Notification, error) {
    collection := ns.mongodb.Collection("notifications")
    
    cursor, err := collection.Find(ns.ctx, bson.M{
        "user_id":      userID,
        "delivered_at": nil,
    })
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ns.ctx)
    
    var notifications []Notification
    if err := cursor.All(ns.ctx, &notifications); err != nil {
        return nil, err
    }
    
    return notifications, nil
}

func (ns *NotificationService) DeliverPendingNotifications(userID string) error {
    notifications, err := ns.GetUndeliveredNotifications(userID)
    if err != nil {
        return err
    }
    
    for _, notification := range notifications {
        message := websocket.Message{
            Type:      "notification",
            Sender:    "system",
            Recipient: userID,
            Timestamp: time.Now(),
        }
        
        content, _ := json.Marshal(notification)
        message.Content = content
        
        ns.hub.broadcast <- &message
        
        // Mark as delivered
        now := time.Now()
        collection := ns.mongodb.Collection("notifications")
        collection.UpdateOne(ns.ctx,
            bson.M{"_id": notification.ID},
            bson.M{"$set": bson.M{"delivered_at": now}},
        )
    }
    
    return nil
}
```

This notification service demonstrates how to build a robust real-time notification system on top of our WebSocket infrastructure. The service persists all notifications to MongoDB, ensuring that messages are never lost even if the user is offline. When a user connects, the system automatically delivers any pending notifications that were sent while they were disconnected. The integration with Redis enables the system to work across multiple server instances, with each server subscribing to notification channels and forwarding messages to its connected clients.

## Implementing a Production-Grade Chat Application

A chat application represents one of the most demanding use cases for WebSocket technology, requiring real-time message delivery, message history, typing indicators, read receipts, and presence tracking. Let us build a comprehensive chat system that handles all these features while maintaining scalability and reliability.

```go
package chat

import (
    "context"
    "encoding/json"
    "time"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "github.com/go-redis/redis/v8"
)

type MessageStatus string

const (
    MessageStatusSent      MessageStatus = "sent"
    MessageStatusDelivered MessageStatus = "delivered"
    MessageStatusRead      MessageStatus = "read"
)

type ChatMessage struct {
    ID           string        `json:"id" bson:"_id"`
    ConversationID string      `json:"conversation_id" bson:"conversation_id"`
    SenderID     string        `json:"sender_id" bson:"sender_id"`
    RecipientID  string        `json:"recipient_id" bson:"recipient_id"`
    Content      string        `json:"content" bson:"content"`
    Attachments  []Attachment  `json:"attachments,omitempty" bson:"attachments,omitempty"`
    Status       MessageStatus `json:"status" bson:"status"`
    CreatedAt    time.Time     `json:"created_at" bson:"created_at"`
    DeliveredAt  *time.Time    `json:"delivered_at,omitempty" bson:"delivered_at,omitempty"`
    ReadAt       *time.Time    `json:"read_at,omitempty" bson:"read_at,omitempty"`
}

type Attachment struct {
    Type     string `json:"type" bson:"type"`
    URL      string `json:"url" bson:"url"`
    Filename string `json:"filename" bson:"filename"`
    Size     int64  `json:"size" bson:"size"`
}

type Conversation struct {
    ID           string    `json:"id" bson:"_id"`
    Participants []string  `json:"participants" bson:"participants"`
    Type         string    `json:"type" bson:"type"` // "direct" or "group"
    LastMessage  *ChatMessage `json:"last_message,omitempty" bson:"last_message,omitempty"`
    UpdatedAt    time.Time `json:"updated_at" bson:"updated_at"`
    CreatedAt    time.Time `json:"created_at" bson:"created_at"`
}

type ChatService struct {
    hub         *websocket.Hub
    mongodb     *mongo.Database
    redis       *redis.Client
    ctx         context.Context
}

func NewChatService(hub *websocket.Hub, mongodb *mongo.Database, redisClient *redis.Client) *ChatService {
    return &ChatService{
        hub:     hub,
        mongodb: mongodb,
        redis:   redisClient,
        ctx:     context.Background(),
    }
}

func (cs *ChatService) SendMessage(message *ChatMessage) error {
    message.ID = uuid.New().String()
    message.CreatedAt = time.Now()
    message.Status = MessageStatusSent
    
    // Find or create conversation
    conversationID, err := cs.ensureConversation(message.SenderID, message.RecipientID)
    if err != nil {
        return err
    }
    message.ConversationID = conversationID
    
    // Persist message
    collection := cs.mongodb.Collection("messages")
    _, err = collection.InsertOne(cs.ctx, message)
    if err != nil {
        return err
    }
    
    // Update conversation
    cs.updateConversation(conversationID, message)
    
    // Send via WebSocket
    wsMessage := websocket.Message{
        Type:      "chat_message",
        Sender:    message.SenderID,
        Recipient: message.RecipientID,
        Timestamp: time.Now(),
    }
    
    content, _ := json.Marshal(message)
    wsMessage.Content = content
    
    cs.hub.broadcast <- &wsMessage
    
    // Publish to Redis for other instances
    payload, _ := json.Marshal(wsMessage)
    cs.redis.Publish(cs.ctx, "chat:"+conversationID, payload)
    
    // Check if recipient is online and update status
    if cs.isUserOnline(message.RecipientID) {
        cs.markAsDelivered(message.ID)
    }
    
    return nil
}

func (cs *ChatService) ensureConversation(user1, user2 string) (string, error) {
    collection := cs.mongodb.Collection("conversations")
    
    // Try to find existing conversation
    filter := bson.M{
        "type": "direct",
        "participants": bson.M{
            "$all": []string{user1, user2},
        },
    }
    
    var conversation Conversation
    err := collection.FindOne(cs.ctx, filter).Decode(&conversation)
    if err == nil {
        return conversation.ID, nil
    }
    
    // Create new conversation
    conversation = Conversation{
        ID:           uuid.New().String(),
        Participants: []string{user1, user2},
        Type:         "direct",
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    
    _, err = collection.InsertOne(cs.ctx, conversation)
    if err != nil {
        return "", err
    }
    
    return conversation.ID, nil
}

func (cs *ChatService) updateConversation(conversationID string, message *ChatMessage) error {
    collection := cs.mongodb.Collection("conversations")
    
    update := bson.M{
        "$set": bson.M{
            "last_message": message,
            "updated_at":   time.Now(),
        },
    }
    
    _, err := collection.UpdateOne(cs.ctx, bson.M{"_id": conversationID}, update)
    return err
}

func (cs *ChatService) markAsDelivered(messageID string) error {
    collection := cs.mongodb.Collection("messages")
    now := time.Now()
    
    update := bson.M{
        "$set": bson.M{
            "status":       MessageStatusDelivered,
            "delivered_at": now,
        },
    }
    
    _, err := collection.UpdateOne(cs.ctx, bson.M{"_id": messageID}, update)
    return err
}

func (cs *ChatService) markAsRead(messageID, userID string) error {
    collection := cs.mongodb.Collection("messages")
    now := time.Now()
    
    update := bson.M{
        "$set": bson.M{
            "status":  MessageStatusRead,
            "read_at": now,
        },
    }
    
    result, err := collection.UpdateOne(cs.ctx, 
        bson.M{"_id": messageID, "recipient_id": userID}, 
        update,
    )
    
    if err == nil && result.ModifiedCount > 0 {
        // Notify sender about read receipt
        var message ChatMessage
        collection.FindOne(cs.ctx, bson.M{"_id": messageID}).Decode(&message)
        
        receipt := map[string]interface{}{
            "message_id": messageID,
            "read_at":    now,
            "reader_id":  userID,
        }
        
        wsMessage := websocket.Message{
            Type:      "read_receipt",
            Sender:    userID,
            Recipient: message.SenderID,
            Timestamp: time.Now(),
        }
        
        content, _ := json.Marshal(receipt)
        wsMessage.Content = content
        
        cs.hub.broadcast <- &wsMessage
    }
    
    return err
}

func (cs *ChatService) GetConversationHistory(conversationID string, limit int64, offset int64) ([]ChatMessage, error) {
    collection := cs.mongodb.Collection("messages")
    
    opts := options.Find().
        SetSort(bson.D{{Key: "created_at", Value: -1}}).
        SetLimit(limit).
        SetSkip(offset)
    
    cursor, err := collection.Find(cs.ctx, 
        bson.M{"conversation_id": conversationID}, 
        opts,
    )
    if err != nil {
        return nil, err
    }
    defer cursor.Close(cs.ctx)
    
    var messages []ChatMessage
    if err := cursor.All(cs.ctx, &messages); err != nil {
        return nil, err
    }
    
    return messages, nil
}

func (cs *ChatService) BroadcastTypingIndicator(conversationID, userID string, isTyping bool) {
    indicator := map[string]interface{}{
        "conversation_id": conversationID,
        "user_id":        userID,
        "is_typing":      isTyping,
        "timestamp":      time.Now(),
    }
    
    wsMessage := websocket.Message{
        Type:      "typing_indicator",
        Sender:    userID,
        Room:      conversationID,
        Timestamp: time.Now(),
    }
    
    content, _ := json.Marshal(indicator)
    wsMessage.Content = content
    
    cs.hub.broadcast <- &wsMessage
    
    // Set expiration in Redis
    key := "typing:" + conversationID + ":" + userID
    if isTyping {
        cs.redis.Set(cs.ctx, key, "1", 5*time.Second)
    } else {
        cs.redis.Del(cs.ctx, key)
    }
}

func (cs *ChatService) isUserOnline(userID string) bool {
    result := cs.redis.Exists(cs.ctx, "online:"+userID)
    return result.Val() > 0
}

func (cs *ChatService) SetUserOnline(userID string) {
    cs.redis.Set(cs.ctx, "online:"+userID, "1", 0)
    
    // Broadcast presence update
    presence := map[string]interface{}{
        "user_id": userID,
        "status":  "online",
        "timestamp": time.Now(),
    }
    
    payload, _ := json.Marshal(presence)
    cs.redis.Publish(cs.ctx, "presence", payload)
}

func (cs *ChatService) SetUserOffline(userID string) {
    cs.redis.Del(cs.ctx, "online:"+userID)
    
    // Broadcast presence update
    presence := map[string]interface{}{
        "user_id":   userID,
        "status":    "offline",
        "last_seen": time.Now(),
    }
    
    payload, _ := json.Marshal(presence)
    cs.redis.Publish(cs.ctx, "presence", payload)
}
```

This chat service implementation provides a complete foundation for building production-grade messaging applications. The system handles message persistence, delivery tracking, read receipts, typing indicators, and presence management. The conversation model supports both direct messaging and group chats, with efficient query patterns for retrieving message history. The integration with Redis enables real-time features like typing indicators and presence updates to work seamlessly across multiple server instances.

## File Upload System with Real-Time Progress Tracking

Modern applications frequently require file upload capabilities with real-time progress tracking, allowing users to monitor the upload status and receive immediate feedback. WebSockets provide the perfect mechanism for this, enabling the server to push progress updates to the client as the upload proceeds. Let us implement a comprehensive file upload system with chunked uploads, resumable transfers, and real-time progress notifications.

```go
package fileupload

import (
    "context"
    "crypto/md5"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "os"
    "path/filepath"
    "time"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "github.com/go-redis/redis/v8"
)

type UploadStatus string

const (
    UploadStatusInitiated  UploadStatus = "initiated"
    UploadStatusProcessing UploadStatus = "processing"
    UploadStatusCompleted  UploadStatus = "completed"
    UploadStatusFailed     UploadStatus = "failed"
    UploadStatusCancelled  UploadStatus = "cancelled"
)

type FileUpload struct {
    ID            string       `json:"id" bson:"_id"`
    UserID        string       `json:"user_id" bson:"user_id"`
    Filename      string       `json:"filename" bson:"filename"`
    OriginalName  string       `json:"original_name" bson:"original_name"`
    ContentType   string       `json:"content_type" bson:"content_type"`
    Size          int64        `json:"size" bson:"size"`
    ChunkSize     int64        `json:"chunk_size" bson:"chunk_size"`
    TotalChunks   int          `json:"total_chunks" bson:"total_chunks"`
    UploadedChunks int         `json:"uploaded_chunks" bson:"uploaded_chunks"`
    Status        UploadStatus `json:"status" bson:"status"`
    Progress      float64      `json:"progress" bson:"progress"`
    FilePath      string       `json:"file_path" bson:"file_path"`
    Checksum      string       `json:"checksum" bson:"checksum"`
    CreatedAt     time.Time    `json:"created_at" bson:"created_at"`
    UpdatedAt     time.Time    `json:"updated_at" bson:"updated_at"`
    CompletedAt   *time.Time   `json:"completed_at,omitempty" bson:"completed_at,omitempty"`
}

type UploadService struct {
    hub         *websocket.Hub
    mongodb     *mongo.Database
    redis       *redis.Client
    uploadDir   string
    ctx         context.Context
}

func NewUploadService(hub *websocket.Hub, mongodb *mongo.Database, redisClient *redis.Client, uploadDir string) *UploadService {
    os.MkdirAll(uploadDir, 0755)
    
    return &UploadService{
        hub:       hub,
        mongodb:   mongodb,
        redis:     redisClient,
        uploadDir: uploadDir,
        ctx:       context.Background(),
    }
}

func (us *UploadService) InitiateUpload(userID, filename, contentType string, size int64) (*FileUpload, error) {
    chunkSize := int64(1024 * 1024) // 1 MB chunks
    totalChunks := int((size + chunkSize - 1) / chunkSize)
    
    upload := &FileUpload{
        ID:            uuid.New().String(),
        UserID:        userID,
        Filename:      fmt.Sprintf("%s_%s", upload.ID, filepath.Base(filename)),
        OriginalName:  filename,
        ContentType:   contentType,
        Size:          size,
        ChunkSize:     chunkSize,
        TotalChunks:   totalChunks,
        UploadedChunks: 0,
        Status:        UploadStatusInitiated,
        Progress:      0,
        FilePath:      filepath.Join(us.uploadDir, upload.Filename),
        CreatedAt:     time.Now(),
        UpdatedAt:     time.Now(),
    }
    
    collection := us.mongodb.Collection("uploads")
    _, err := collection.InsertOne(us.ctx, upload)
    if err != nil {
        return nil, err
    }
    
    // Create empty file
    file, err := os.Create(upload.FilePath)
    if err != nil {
        return nil, err
    }
    defer file.Close()
    
    // Pre-allocate file space
    file.Truncate(size)
    
    // Notify user
    us.notifyProgress(upload)
    
    return upload, nil
}

func (us *UploadService) UploadChunk(uploadID string, chunkNumber int, reader io.Reader) error {
    collection := us.mongodb.Collection("uploads")
    
    var upload FileUpload
    err := collection.FindOne(us.ctx, bson.M{"_id": uploadID}).Decode(&upload)
    if err != nil {
        return err
    }
    
    if upload.Status != UploadStatusInitiated && upload.Status != UploadStatusProcessing {
        return fmt.Errorf("upload is not in a valid state for chunk upload")
    }
    
    // Open file for writing
    file, err := os.OpenFile(upload.FilePath, os.O_WRONLY, 0644)
    if err != nil {
        return err
    }
    defer file.Close()
    
    // Calculate offset
    offset := int64(chunkNumber) * upload.ChunkSize
    _, err = file.Seek(offset, 0)
    if err != nil {
        return err
    }
    
    // Write chunk
    _, err = io.Copy(file, reader)
    if err != nil {
        return err
    }
    
    // Update upload record
    upload.UploadedChunks++
    upload.Progress = float64(upload.UploadedChunks) / float64(upload.TotalChunks) * 100
    upload.UpdatedAt = time.Now()
    
    if upload.UploadedChunks >= upload.TotalChunks {
        upload.Status = UploadStatusProcessing
        go us.finalizeUpload(uploadID)
    } else {
        upload.Status = UploadStatusProcessing
    }
    
    update := bson.M{
        "$set": bson.M{
            "uploaded_chunks": upload.UploadedChunks,
            "progress":        upload.Progress,
            "status":          upload.Status,
            "updated_at":      upload.UpdatedAt,
        },
    }
    
    _, err = collection.UpdateOne(us.ctx, bson.M{"_id": uploadID}, update)
    if err != nil {
        return err
    }
    
    // Notify progress
    us.notifyProgress(&upload)
    
    return nil
}

func (us *UploadService) finalizeUpload(uploadID string) error {
    collection := us.mongodb.Collection("uploads")
    
    var upload FileUpload
    err := collection.FindOne(us.ctx, bson.M{"_id": uploadID}).Decode(&upload)
    if err != nil {
        return err
    }
    
    // Calculate checksum
    file, err := os.Open(upload.FilePath)
    if err != nil {
        us.markUploadFailed(uploadID, err)
        return err
    }
    defer file.Close()
    
    hash := md5.New()
    if _, err := io.Copy(hash, file); err != nil {
        us.markUploadFailed(uploadID, err)
        return err
    }
    
    checksum := hex.EncodeToString(hash.Sum(nil))
    now := time.Now()
    
    update := bson.M{
        "$set": bson.M{
            "status":       UploadStatusCompleted,
            "progress":     100,
            "checksum":     checksum,
            "completed_at": now,
            "updated_at":   now,
        },
    }
    
    _, err = collection.UpdateOne(us.ctx, bson.M{"_id": uploadID}, update)
    if err != nil {
        return err
    }
    
    upload.Status = UploadStatusCompleted
    upload.Progress = 100
    upload.Checksum = checksum
    upload.CompletedAt = &now
    
    // Notify completion
    us.notifyProgress(&upload)
    
    return nil
}

func (us *UploadService) markUploadFailed(uploadID string, uploadErr error) {
    collection := us.mongodb.Collection("uploads")
    
    update := bson.M{
        "$set": bson.M{
            "status":     UploadStatusFailed,
            "updated_at": time.Now(),
        },
    }
    
    collection.UpdateOne(us.ctx, bson.M{"_id": uploadID}, update)
    
    var upload FileUpload
    collection.FindOne(us.ctx, bson.M{"_id": uploadID}).Decode(&upload)
    us.notifyProgress(&upload)
}

func (us *UploadService) notifyProgress(upload *FileUpload) {
    progress := map[string]interface{}{
        "upload_id":       upload.ID,
        "filename":        upload.OriginalName,
        "progress":        upload.Progress,
        "status":          upload.Status,
        "uploaded_chunks": upload.UploadedChunks,
        "total_chunks":    upload.TotalChunks,
        "size":            upload.Size,
    }
    
    if upload.CompletedAt != nil {
        progress["completed_at"] = upload.CompletedAt
        progress["checksum"] = upload.Checksum
    }
    
    wsMessage := websocket.Message{
        Type:      "upload_progress",
        Sender:    "system",
        Recipient: upload.UserID,
        Timestamp: time.Now(),
    }
    
    content, _ := json.Marshal(progress)
    wsMessage.Content = content
    
    us.hub.broadcast <- &wsMessage
}

func (us *UploadService) CancelUpload(uploadID, userID string) error {
    collection := us.mongodb.Collection("uploads")
    
    var upload FileUpload
    err := collection.FindOne(us.ctx, bson.M{
        "_id":     uploadID,
        "user_id": userID,
    }).Decode(&upload)
    
    if err != nil {
        return err
    }
    
    // Delete file
    os.Remove(upload.FilePath)
    
    // Update status
    update := bson.M{
        "$set": bson.M{
            "status":     UploadStatusCancelled,
            "updated_at": time.Now(),
        },
    }
    
    _, err = collection.UpdateOne(us.ctx, bson.M{"_id": uploadID}, update)
    if err != nil {
        return err
    }
    
    upload.Status = UploadStatusCancelled
    us.notifyProgress(&upload)
    
    return nil
}

func (us *UploadService) GetUploadStatus(uploadID, userID string) (*FileUpload, error) {
    collection := us.mongodb.Collection("uploads")
    
    var upload FileUpload
    err := collection.FindOne(us.ctx, bson.M{
        "_id":     uploadID,
        "user_id": userID,
    }).Decode(&upload)
    
    if err != nil {
        return nil, err
    }
    
    return &upload, nil
}
```

This file upload service demonstrates how to handle large file uploads with chunked transfers and real-time progress tracking. The system pre-allocates file space on disk, allowing chunks to be written at specific offsets regardless of the order in which they arrive. This enables resumable uploads where a failed transfer can be continued from the last successfully uploaded chunk. The WebSocket integration provides instant feedback to the user, updating the progress bar as each chunk is received and processed.

## Configuration and Server Setup

With all our services implemented, we need to tie everything together into a cohesive application with proper configuration management, graceful shutdown handling, and production-ready server setup. Let us examine the complete server implementation:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
    
    "github.com/gorilla/mux"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "github.com/go-redis/redis/v8"
)

type Config struct {
    ServerPort     string
    MongoURI       string
    MongoDB        string
    RedisAddr      string
    RedisPassword  string
    UploadDir      string
    AllowedOrigins []string
}

type Application struct {
    config             *Config
    hub                *websocket.Hub
    mongoClient        *mongo.Client
    redisClient        *redis.Client
    notificationService *notification.NotificationService
    chatService        *chat.ChatService
    uploadService      *fileupload.UploadService
}

func NewApplication(config *Config) (*Application, error) {
    // Initialize MongoDB
    mongoClient, err := mongo.Connect(context.Background(), options.Client().ApplyURI(config.MongoURI))
    if err != nil {
        return nil, err
    }
    
    // Initialize Redis
    redisClient := redis.NewClient(&redis.Options{
        Addr:     config.RedisAddr,
        Password: config.RedisPassword,
        DB:       0,
    })
    
    // Test connections
    if err := mongoClient.Ping(context.Background(), nil); err != nil {
        return nil, err
    }
    
    if err := redisClient.Ping(context.Background()).Err(); err != nil {
        return nil, err
    }
    
    // Initialize hub
    hub := websocket.NewHub()
    go hub.Run()
    
    // Initialize database
    mongodb := mongoClient.Database(config.MongoDB)
    
    // Initialize services
    notificationService := notification.NewNotificationService(hub, mongodb, redisClient)
    chatService := chat.NewChatService(hub, mongodb, redisClient)
    uploadService := fileupload.NewUploadService(hub, mongodb, redisClient, config.UploadDir)
    
    app := &Application{
        config:             config,
        hub:                hub,
        mongoClient:        mongoClient,
        redisClient:        redisClient,
        notificationService: notificationService,
        chatService:        chatService,
        uploadService:      uploadService,
    }
    
    // Subscribe to Redis channels for multi-instance support
    go app.subscribeToRedis()
    
    return app, nil
}

func (app *Application) subscribeToRedis() {
    pubsub := app.redisClient.Subscribe(context.Background(), "notifications", "presence", "chat:*")
    defer pubsub.Close()
    
    ch := pubsub.Channel()
    
    for msg := range ch {
        var wsMessage websocket.Message
        if err := json.Unmarshal([]byte(msg.Payload), &wsMessage); err != nil {
            log.Printf("Error unmarshaling Redis message: %v", err)
            continue
        }
        
        // Forward to local hub
        app.hub.broadcast <- &wsMessage
    }
}

func (app *Application) setupRoutes() *mux.Router {
    r := mux.NewRouter()
    
    // WebSocket endpoint
    r.HandleFunc("/ws", app.handleWebSocketConnection)
    
    // REST endpoints
    api := r.PathPrefix("/api").Subrouter()
    api.Use(app.authMiddleware)
    
    // Notification endpoints
    api.HandleFunc("/notifications", app.handleGetNotifications).Methods("GET")
    api.HandleFunc("/notifications/{id}/read", app.handleMarkNotificationRead).Methods("POST")
    
    // Chat endpoints
    api.HandleFunc("/conversations", app.handleGetConversations).Methods("GET")
    api.HandleFunc("/conversations/{id}/messages", app.handleGetMessages).Methods("GET")
    api.HandleFunc("/messages", app.handleSendMessage).Methods("POST")
    api.HandleFunc("/messages/{id}/read", app.handleMarkMessageRead).Methods("POST")
    
    // Upload endpoints
    api.HandleFunc("/uploads/initiate", app.handleInitiateUpload).Methods("POST")
    api.HandleFunc("/uploads/{id}/chunk/{chunk}", app.handleUploadChunk).Methods("POST")
    api.HandleFunc("/uploads/{id}/cancel", app.handleCancelUpload).Methods("POST")
    api.HandleFunc("/uploads/{id}/status", app.handleGetUploadStatus).Methods("GET")
    
    // Health check
    r.HandleFunc("/health", app.handleHealthCheck).Methods("GET")
    
    return r
}

func (app *Application) handleWebSocketConnection(w http.ResponseWriter, r *http.Request) {
    // Authenticate user (implement your auth logic)
    userID := r.URL.Query().Get("user_id")
    if userID == "" {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Error upgrading connection: %v", err)
        return
    }
    
    client := websocket.NewClient(userID, app.hub, conn)
    app.hub.register <- client
    
    // Mark user as online
    app.chatService.SetUserOnline(userID)
    
    // Deliver pending notifications
    go app.notificationService.DeliverPendingNotifications(userID)
    
    // Start client goroutines
    go client.WritePump()
    go client.ReadPump()
}

func (app *Application) authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Implement your authentication logic here
        // For example, validate JWT token from Authorization header
        
        next.ServeHTTP(w, r)
    })
}

func (app *Application) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"healthy"}`))
}

func (app *Application) Shutdown() {
    log.Println("Shutting down application...")
    
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    if err := app.mongoClient.Disconnect(ctx); err != nil {
        log.Printf("Error disconnecting MongoDB: %v", err)
    }
    
    if err := app.redisClient.Close(); err != nil {
        log.Printf("Error closing Redis: %v", err)
    }
    
    log.Println("Application shutdown complete")
}

func main() {
    config := &Config{
        ServerPort:     os.Getenv("PORT"),
        MongoURI:       os.Getenv("MONGO_URI"),
        MongoDB:        os.Getenv("MONGO_DB"),
        RedisAddr:      os.Getenv("REDIS_ADDR"),
        RedisPassword:  os.Getenv("REDIS_PASSWORD"),
        UploadDir:      os.Getenv("UPLOAD_DIR"),
        AllowedOrigins: []string{"http://localhost:3000"},
    }
    
    if config.ServerPort == "" {
        config.ServerPort = "8080"
    }
    
    app, err := NewApplication(config)
    if err != nil {
        log.Fatalf("Failed to initialize application: %v", err)
    }
    defer app.Shutdown()
    
    router := app.setupRoutes()
    
    server := &http.Server{
        Addr:         ":" + config.ServerPort,
        Handler:      router,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }
    
    // Graceful shutdown
    go func() {
        sigint := make(chan os.Signal, 1)
        signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
        <-sigint
        
        log.Println("Received shutdown signal")
        
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        
        if err := server.Shutdown(ctx); err != nil {
            log.Printf("Server shutdown error: %v", err)
        }
    }()
    
    log.Printf("Server starting on port %s", config.ServerPort)
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

## Production Deployment Considerations

When deploying WebSocket applications to production, several critical considerations must be addressed to ensure reliability, scalability, and performance. The first concern is load balancing, which requires special configuration because WebSocket connections are long-lived and stateful. Unlike traditional HTTP requests that complete quickly, WebSocket connections can persist for hours or even days. This necessitates the use of sticky sessions or consistent hashing to ensure that a client always connects to the same server instance for the duration of their session.

Your load balancer configuration should enable WebSocket protocol upgrades and maintain connection persistence. For NGINX, this means configuring the proxy module to support WebSocket headers and set appropriate timeouts. Here is an example NGINX configuration for WebSocket load balancing:

```nginx
upstream websocket_backend {
    ip_hash;
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    listen 80;
    server_name example.com;

    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

Redis serves as the backbone for multi-instance coordination in production deployments. When you have multiple server instances running behind a load balancer, Redis Pub/Sub enables these instances to communicate with each other and broadcast messages to clients connected to different servers. This architectural pattern ensures that when a user sends a message to another user, the message reaches its destination regardless of which server each user is connected to.

Monitoring and observability are paramount in production WebSocket deployments. You should implement comprehensive metrics collection for connection counts, message throughput, latency, error rates, and resource utilization. Tools like Prometheus and Grafana provide excellent visualization and alerting capabilities for these metrics. Additionally, distributed tracing with tools like Jaeger or Zipkin helps diagnose issues in complex multi-service architectures.

Security considerations include implementing proper authentication and authorization for WebSocket connections, validating message origins to prevent cross-site WebSocket hijacking attacks, implementing rate limiting to prevent abuse, and encrypting all WebSocket traffic using TLS. The CheckOrigin function in the WebSocket upgrader should validate that connections originate from trusted domains in production environments.

## Conclusion

Throughout this comprehensive guide, we have explored the complete landscape of WebSocket implementation in Golang, from fundamental concepts to production-grade architectures. We began with understanding the nature of sockets and WebSocket protocol, then built a robust hub-based architecture for managing connections at scale. We implemented three real-world applications: a notification system with offline message queuing, a full-featured chat application with presence tracking and read receipts, and a file upload system with chunked transfers and real-time progress updates.

The patterns and practices demonstrated here provide a solid foundation for building any real-time application in Go. The hub pattern enables scalable connection management, Redis integration facilitates multi-instance deployments, and the combination of MongoDB for persistence with WebSockets for real-time delivery creates a powerful architecture for modern applications. By following these patterns and understanding the underlying principles, you can build robust, scalable, and maintainable WebSocket applications that serve millions of concurrent users while maintaining excellent performance and reliability.