# Production-Grade Golang Project Infrastructure

## Architecture for 1M Users & 10K Products

---

## Table of Contents

1. [Project Structure](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#project-structure)
2. [Architecture Overview](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#architecture-overview)
3. [Database Design](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#database-design)
4. [Caching Strategy](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#caching-strategy)
5. [Message Queue Setup](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#message-queue-setup)
6. [API Gateway & Load Balancing](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#api-gateway--load-balancing)
7. [Microservices Design](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#microservices-design)
8. [Monitoring & Observability](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#monitoring--observability)
9. [Security & Authentication](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#security--authentication)
10. [Deployment & Scaling](https://claude.ai/chat/e317525c-af75-4455-8007-a97358a26276#deployment--scaling)

---

## Project Structure

```
project-root/
├── cmd/
│   ├── api/                    # API server entry point
│   │   └── main.go
│   ├── worker/                 # Background workers
│   │   └── main.go
│   └── migrate/                # Database migrations
│       └── main.go
├── internal/
│   ├── domain/                 # Business entities
│   │   ├── user/
│   │   │   ├── entity.go
│   │   │   ├── repository.go
│   │   │   └── service.go
│   │   └── product/
│   │       ├── entity.go
│   │       ├── repository.go
│   │       └── service.go
│   ├── handler/                # HTTP handlers
│   │   ├── user_handler.go
│   │   └── product_handler.go
│   ├── middleware/             # HTTP middleware
│   │   ├── auth.go
│   │   ├── ratelimit.go
│   │   └── logging.go
│   ├── repository/             # Data access layer
│   │   ├── postgres/
│   │   │   ├── user_repo.go
│   │   │   └── product_repo.go
│   │   └── mongodb/
│   │       └── analytics_repo.go
│   ├── service/                # Business logic
│   │   ├── user_service.go
│   │   └── product_service.go
│   ├── cache/                  # Cache layer
│   │   ├── redis.go
│   │   └── cache_service.go
│   ├── queue/                  # Message queue
│   │   ├── rabbitmq.go
│   │   └── publisher.go
│   └── config/                 # Configuration
│       └── config.go
├── pkg/                        # Public libraries
│   ├── logger/
│   ├── validator/
│   ├── jwt/
│   └── utils/
├── api/                        # API definitions
│   ├── openapi/
│   └── proto/                  # gRPC definitions (if needed)
├── migrations/                 # Database migrations
│   └── 001_initial_schema.sql
├── deployments/                # Deployment configs
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   └── kubernetes/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── scripts/                    # Utility scripts
│   ├── setup.sh
│   └── deploy.sh
├── tests/
│   ├── integration/
│   └── e2e/
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## Architecture Overview

### High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   CDN (Static)  │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Load Balancer  │
                                    │    (Nginx)      │
                                    └────────┬────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
                ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
                │  API Server 1 │   │  API Server 2 │   │  API Server N │
                └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
                        │                    │                    │
        ┌───────────────┼────────────────────┼────────────────────┼──────────────┐
        │               │                    │                    │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌──────────▼──────────┐ ┌───────▼────────┐ ┌──▼───────┐
│   Redis      │ │ PostgreSQL │ │      MongoDB        │ │   RabbitMQ     │ │ Worker   │
│   Cluster    │ │  (Primary) │ │   (Analytics)       │ │                │ │ Services │
└──────────────┘ └─────┬──────┘ └─────────────────────┘ └────────────────┘ └──────────┘
                       │
                ┌──────▼──────┐
                │ PostgreSQL  │
                │  (Replica)  │
                └─────────────┘
```

### Technology Stack

- **Primary Database**: PostgreSQL (transactional data)
- **NoSQL Database**: MongoDB (analytics, logs, events)
- **Cache Layer**: Redis Cluster
- **Message Queue**: RabbitMQ
- **API Gateway**: Nginx / Kong
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger
- **Container Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions / GitLab CI

---

## Database Design

### PostgreSQL Schema (Primary Database)

```sql
-- Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- Products Table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);

-- Orders Table
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    shipping_address JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Items Table
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Sessions Table (for auth)
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### Database Connection Pool Configuration

```go
// internal/config/database.go
package config

import (
    "fmt"
    "time"
    
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type DatabaseConfig struct {
    Host            string
    Port            int
    User            string
    Password        string
    DBName          string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
}

func NewPostgresDB(cfg DatabaseConfig) (*gorm.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
        cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
    )
    
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err
    }
    
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }
    
    // Connection pool settings for high-load
    sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)       // 100 for production
    sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)       // 25 for production
    sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime) // 5 minutes
    
    return db, nil
}
```

### MongoDB Schema (Analytics & Events)

```go
// internal/domain/analytics/event.go
package analytics

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type UserEvent struct {
    ID         primitive.ObjectID `bson:"_id,omitempty"`
    UserID     int64             `bson:"user_id"`
    EventType  string            `bson:"event_type"`
    EventData  map[string]interface{} `bson:"event_data"`
    IPAddress  string            `bson:"ip_address"`
    UserAgent  string            `bson:"user_agent"`
    Timestamp  time.Time         `bson:"timestamp"`
}

type ProductView struct {
    ID         primitive.ObjectID `bson:"_id,omitempty"`
    ProductID  int64             `bson:"product_id"`
    UserID     int64             `bson:"user_id,omitempty"`
    SessionID  string            `bson:"session_id"`
    Timestamp  time.Time         `bson:"timestamp"`
    Duration   int               `bson:"duration_seconds"`
}
```

---

## Caching Strategy

### Redis Configuration

```go
// internal/cache/redis.go
package cache

import (
    "context"
    "encoding/json"
    "time"
    
    "github.com/redis/go-redis/v9"
)

type RedisCache struct {
    client *redis.ClusterClient
}

func NewRedisCluster(addrs []string, password string) *RedisCache {
    client := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs:        addrs,
        Password:     password,
        PoolSize:     100,
        MinIdleConns: 20,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
    
    return &RedisCache{client: client}
}

func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    
    return r.client.Set(ctx, key, data, expiration).Err()
}

func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
    val, err := r.client.Get(ctx, key).Result()
    if err != nil {
        return err
    }
    
    return json.Unmarshal([]byte(val), dest)
}

func (r *RedisCache) Delete(ctx context.Context, keys ...string) error {
    return r.client.Del(ctx, keys...).Err()
}

// Cache patterns for different use cases
const (
    UserCacheKey     = "user:%d"
    ProductCacheKey  = "product:%d"
    ProductListKey   = "products:list:%s"
    SessionCacheKey  = "session:%s"
)

// Cache TTLs
const (
    UserCacheTTL     = 15 * time.Minute
    ProductCacheTTL  = 30 * time.Minute
    SessionCacheTTL  = 24 * time.Hour
)
```

### Caching Layers

1. **L1 Cache**: In-memory (application level) using sync.Map or similar
2. **L2 Cache**: Redis for distributed caching
3. **L3 Cache**: Database read replicas

```go
// internal/service/product_service.go
package service

import (
    "context"
    "fmt"
    "time"
)

type ProductService struct {
    repo  ProductRepository
    cache CacheService
}

func (s *ProductService) GetProduct(ctx context.Context, id int64) (*Product, error) {
    // Try cache first
    cacheKey := fmt.Sprintf(cache.ProductCacheKey, id)
    var product Product
    
    err := s.cache.Get(ctx, cacheKey, &product)
    if err == nil {
        return &product, nil
    }
    
    // Cache miss - fetch from database
    product, err = s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Update cache
    _ = s.cache.Set(ctx, cacheKey, product, cache.ProductCacheTTL)
    
    return &product, nil
}
```

---

## Message Queue Setup

### RabbitMQ Configuration

```go
// internal/queue/rabbitmq.go
package queue

import (
    "context"
    "encoding/json"
    "fmt"
    
    amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQ struct {
    conn    *amqp.Connection
    channel *amqp.Channel
}

func NewRabbitMQ(url string) (*RabbitMQ, error) {
    conn, err := amqp.Dial(url)
    if err != nil {
        return nil, err
    }
    
    channel, err := conn.Channel()
    if err != nil {
        return nil, err
    }
    
    // Set prefetch count for fair dispatch
    err = channel.Qos(10, 0, false)
    if err != nil {
        return nil, err
    }
    
    return &RabbitMQ{
        conn:    conn,
        channel: channel,
    }, nil
}

// Queue names
const (
    OrderProcessingQueue  = "order.processing"
    EmailNotificationQueue = "email.notification"
    InventoryUpdateQueue  = "inventory.update"
    AnalyticsQueue        = "analytics.events"
)

func (r *RabbitMQ) DeclareQueue(name string) error {
    _, err := r.channel.QueueDeclare(
        name,
        true,  // durable
        false, // auto-delete
        false, // exclusive
        false, // no-wait
        amqp.Table{
            "x-message-ttl": int32(86400000), // 24 hours
            "x-max-length":  int32(100000),   // max 100k messages
        },
    )
    return err
}

func (r *RabbitMQ) Publish(ctx context.Context, queue string, message interface{}) error {
    body, err := json.Marshal(message)
    if err != nil {
        return err
    }
    
    return r.channel.PublishWithContext(
        ctx,
        "",    // exchange
        queue, // routing key
        false, // mandatory
        false, // immediate
        amqp.Publishing{
            ContentType:  "application/json",
            Body:         body,
            DeliveryMode: amqp.Persistent,
        },
    )
}

func (r *RabbitMQ) Consume(queue string, handler func([]byte) error) error {
    msgs, err := r.channel.Consume(
        queue,
        "",    // consumer tag
        false, // auto-ack
        false, // exclusive
        false, // no-local
        false, // no-wait
        nil,   // args
    )
    if err != nil {
        return err
    }
    
    for msg := range msgs {
        if err := handler(msg.Body); err != nil {
            msg.Nack(false, true) // requeue
        } else {
            msg.Ack(false)
        }
    }
    
    return nil
}
```

### Background Workers

```go
// cmd/worker/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
)

type OrderMessage struct {
    OrderID int64 `json:"order_id"`
    UserID  int64 `json:"user_id"`
}

func main() {
    mq, err := queue.NewRabbitMQ("amqp://user:password@localhost:5672/")
    if err != nil {
        log.Fatal(err)
    }
    
    // Declare queues
    mq.DeclareQueue(queue.OrderProcessingQueue)
    
    // Start worker
    log.Println("Worker started...")
    err = mq.Consume(queue.OrderProcessingQueue, processOrder)
    if err != nil {
        log.Fatal(err)
    }
}

func processOrder(body []byte) error {
    var msg OrderMessage
    if err := json.Unmarshal(body, &msg); err != nil {
        return err
    }
    
    log.Printf("Processing order: %d for user: %d", msg.OrderID, msg.UserID)
    
    // Process order logic
    // 1. Validate inventory
    // 2. Process payment
    // 3. Update order status
    // 4. Send notification
    
    return nil
}
```

---

## API Gateway & Load Balancing

### Nginx Configuration

```nginx
# /etc/nginx/nginx.conf
upstream api_servers {
    least_conn;
    server api-1:8080 max_fails=3 fail_timeout=30s;
    server api-2:8080 max_fails=3 fail_timeout=30s;
    server api-3:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;
    
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    limit_conn conn_limit 10;
    
    location /api/ {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # Health checks
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

### API Server with Middleware

```go
// cmd/api/main.go
package main

import (
    "log"
    "net/http"
    "time"
    
    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.New()
    
    // Middleware
    router.Use(gin.Recovery())
    router.Use(middleware.Logger())
    router.Use(middleware.CORS())
    router.Use(middleware.RateLimit())
    
    // Public routes
    public := router.Group("/api/v1")
    {
        public.POST("/auth/login", handler.Login)
        public.POST("/auth/register", handler.Register)
    }
    
    // Protected routes
    protected := router.Group("/api/v1")
    protected.Use(middleware.AuthRequired())
    {
        protected.GET("/users/me", handler.GetCurrentUser)
        protected.GET("/products", handler.ListProducts)
        protected.GET("/products/:id", handler.GetProduct)
        protected.POST("/orders", handler.CreateOrder)
        protected.GET("/orders", handler.ListOrders)
    }
    
    // Admin routes
    admin := router.Group("/api/v1/admin")
    admin.Use(middleware.AuthRequired(), middleware.AdminOnly())
    {
        admin.POST("/products", handler.CreateProduct)
        admin.PUT("/products/:id", handler.UpdateProduct)
        admin.DELETE("/products/:id", handler.DeleteProduct)
    }
    
    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })
    
    server := &http.Server{
        Addr:           ":8080",
        Handler:        router,
        ReadTimeout:    10 * time.Second,
        WriteTimeout:   10 * time.Second,
        MaxHeaderBytes: 1 << 20,
    }
    
    log.Println("Server starting on :8080")
    log.Fatal(server.ListenAndServe())
}
```

---

## Microservices Design

### Service Communication Patterns

```go
// internal/service/order_service.go
package service

import (
    "context"
    "errors"
)

type OrderService struct {
    orderRepo    OrderRepository
    productSvc   ProductService
    userSvc      UserService
    paymentSvc   PaymentService
    cache        CacheService
    queue        QueueService
}

func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    // 1. Validate user
    user, err := s.userSvc.GetUser(ctx, req.UserID)
    if err != nil {
        return nil, errors.New("user not found")
    }
    
    // 2. Validate products and check inventory
    var totalAmount float64
    for _, item := range req.Items {
        product, err := s.productSvc.GetProduct(ctx, item.ProductID)
        if err != nil {
            return nil, err
        }
        
        if product.StockQuantity < item.Quantity {
            return nil, errors.New("insufficient stock")
        }
        
        totalAmount += product.Price * float64(item.Quantity)
    }
    
    // 3. Create order
    order := &Order{
        UserID:      req.UserID,
        TotalAmount: totalAmount,
        Status:      "pending",
    }
    
    if err := s.orderRepo.Create(ctx, order); err != nil {
        return nil, err
    }
    
    // 4. Publish to message queue for async processing
    s.queue.Publish(ctx, queue.OrderProcessingQueue, map[string]interface{}{
        "order_id": order.ID,
        "user_id":  order.UserID,
    })
    
    // 5. Invalidate cache
    s.cache.Delete(ctx, fmt.Sprintf("user:%d:orders", req.UserID))
    
    return order, nil
}
```

---

## Monitoring & Observability

### Prometheus Metrics

```go
// internal/middleware/metrics.go
package middleware

import (
    "time"
    
    "github.com/gin-gonic/gin"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    dbQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Database query duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"operation", "table"},
    )
)

func PrometheusMetrics() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start).Seconds()
        status := c.Writer.Status()
        
        httpRequestsTotal.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            fmt.Sprintf("%d", status),
        ).Inc()
        
        httpRequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
        ).Observe(duration)
    }
}
```

### Structured Logging

```go
// pkg/logger/logger.go
package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

var Log *zap.Logger

func InitLogger(env string) {
    var config zap.Config
    
    if env == "production" {
        config = zap.NewProductionConfig()
    } else {
        config = zap.NewDevelopmentConfig()
    }
    
    config.EncoderConfig.TimeKey = "timestamp"
    config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    
    var err error
    Log, err = config.Build()
    if err != nil {
        panic(err)
    }
}

// Usage:
// logger.Log.Info("User created", 
//     zap.Int64("user_id", user.ID),
//     zap.String("email", user.Email),
// )
```

---

## Security & Authentication

### JWT Authentication

```go
// pkg/jwt/jwt.go
package jwt

import (
    "time"
    
    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID int64  `json:"user_id"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateToken(userID int64, email, role, secret string) (string, error) {
    claims := Claims{
        UserID: userID,
        Email:  email,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}

func ValidateToken(tokenString, secret string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(secret), nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }
    
    return nil, errors.New("invalid token")
}
```

### Rate Limiting Middleware

```go
// internal/middleware/ratelimit.go
package middleware

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
    "golang.org/x/time/rate"
)

var limiters = make(map[string]*rate.Limiter)

func RateLimit() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        
        limiter, exists := limiters[ip]
        if !exists {
            // 100 requests per second with burst of 200
            limiter = rate.NewLimiter(100, 200)
            limiters[ip] = limiter
        }
        
        if !limiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded",
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

---

## Deployment & Scaling

### Dockerfile

```dockerfile
# deployments/docker/Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/api/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./main"]
```

### Kubernetes Deployment

```yaml
# deployments/kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api-server
        image: your-registry/api-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-server-service
spec:
  selector:
    app: api-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Docker Compose (Development)

```yaml
# deployments/docker/docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: ../..
      dockerfile: deployments/docker/Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=appdb
      - REDIS_URL=redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    command: postgres -c wal_level=replica

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin
    volumes:
      - mongodb_data:/data/db

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  postgres_data:
  mongodb_data:
```

---

## Performance Optimization Tips

### Database Optimization

- Use connection pooling (100 max connections, 25 idle)
- Implement read replicas for read-heavy operations
- Use database indexes strategically
- Partition large tables (orders, events)
- Use prepared statements

### Caching Strategy

- Cache hot data (products, user sessions)
- Use cache-aside pattern
- Implement cache warming for predictable data
- Set appropriate TTLs based on data volatility

### API Optimization

- Implement request batching
- Use HTTP/2 for multiplexing
- Enable gzip compression
- Implement pagination for list endpoints
- Use ETags for conditional requests

### Scalability

- Horizontal scaling with Kubernetes HPA
- Vertical scaling for databases
- Use CDN for static assets
- Implement circuit breakers for external services
- Database sharding for massive scale

---

## Environment Configuration

```go
// internal/config/config.go
package config

import (
    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    RabbitMQ RabbitMQConfig
    JWT      JWTConfig
}

type ServerConfig struct {
    Port         string
    Environment  string
    LogLevel     string
}

type JWTConfig struct {
    Secret     string
    Expiration int
}

func LoadConfig() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("./config")
    viper.AutomaticEnv()
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }
    
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, err
    }
    
    return &config, nil
}
```

---

## Conclusion

This infrastructure is designed to handle:

- **1M concurrent users** with horizontal scaling
- **10K products** with efficient caching and indexing
- **High availability** with replicas and load balancing
- **Fault tolerance** with message queues and circuit breakers
- **Observability** with metrics, logging, and tracing

### Next Steps

1. Set up CI/CD pipeline
2. Implement comprehensive testing (unit, integration, e2e)
3. Configure monitoring alerts
4. Set up disaster recovery plan
5. Implement security hardening
6. Performance testing and optimization
7. Documentation and runbooks

### Recommended Tools

- **Load Testing**: k6, Apache JMeter
- **API Documentation**: Swagger/OpenAPI
- **Database Migration**: golang-migrate
- **Testing**: testify, gomock
- **Linting**: golangci-lint