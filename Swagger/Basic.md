# OpenAPI Swagger in Golang with Gin Framework

### A Complete Production-Level Guide

---

## Table of Contents

1. [What is OpenAPI / Swagger?](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#1-what-is-openapi--swagger)
2. [How Swagger Works in a Go Project](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#2-how-swagger-works-in-a-go-project)
3. [Project Architecture Overview](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#3-project-architecture-overview)
4. [Installation & Setup](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#4-installation--setup)
5. [Applying Swagger to Your Module → Controller → Service Pattern](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#5-applying-swagger-to-your-module--controller--service-pattern)
6. [Swagger Annotations — Complete Reference](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#6-swagger-annotations--complete-reference)
7. [Authentication Documentation (JWT / Bearer)](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#7-authentication-documentation-jwt--bearer)
8. [Request & Response Schema Documentation](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#8-request--response-schema-documentation)
9. [Swagger UI Setup in Gin](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#9-swagger-ui-setup-in-gin)
10. [Environment-Based Swagger (Hide in Production)](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#10-environment-based-swagger-hide-in-production)
11. [Versioning APIs with Swagger](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#11-versioning-apis-with-swagger)
12. [Grouping APIs with Tags](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#12-grouping-apis-with-tags)
13. [Common Production Patterns](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#13-common-production-patterns)
14. [Full Working Example — Module Feature](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#14-full-working-example--module-feature)
15. [Generated Swagger JSON Structure](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#15-generated-swagger-json-structure)
16. [Best Practices Checklist](https://claude.ai/chat/12e0af63-beb2-441c-8683-084646c76ad8#16-best-practices-checklist)

---

## 1. What is OpenAPI / Swagger?

Imagine you are building a large restaurant kitchen. You have many chefs (developers), many waiters (frontend/mobile teams), and many customers (external integrations). Without a proper menu — nobody knows what dishes are available, what ingredients go in, and what you get back on the plate. **OpenAPI is that menu for your API.**

OpenAPI is a **specification standard** (a set of rules) for describing REST APIs in a machine-readable format (JSON or YAML). Swagger is the original name of this specification and also the name of the toolset built around it. Today, they are often used interchangeably.

When you write Swagger annotations in your Go code, a tool called `swag` reads those annotations and **automatically generates** an `openapi.json` (or `swagger.json`) file. That file is then served through a beautiful interactive UI called **Swagger UI**, where developers can read documentation and even test the API directly from the browser.

```
+------------------+        +-----------+        +------------------+        +-------------+
|  Your Go Code    |        |  swag CLI |        |  swagger.json /  |        | Swagger UI  |
|  with @swag      | -----> |  (Parser) | -----> |  docs/ folder    | -----> | (Browser)   |
|  comments        |        |           |        |  auto-generated  |        |             |
+------------------+        +-----------+        +------------------+        +-------------+
```

---

## 2. How Swagger Works in a Go Project

The tool we use in Go is called **`swag`** — it is a command-line program that scans your Go source code, finds special comment annotations that start with `// @`, and generates documentation files automatically. You do not write JSON or YAML by hand. You write comments, and `swag` does the rest.

The flow works like this: every time you add or change a route or its annotations, you run `swag init` in your project root, and it regenerates the documentation. In a CI/CD pipeline, this command is run automatically before building the Docker image so the docs are always up to date.

```
Developer writes
@Summary, @Param,
@Success annotations          swag init              docs/
in controller file   ------>  (regenerates)  ------>  swagger.json
                                                       swagger.yaml
                                                       docs.go
                                                            |
                                                            v
                                               Gin serves /swagger/index.html
```

The three files generated inside a `docs/` folder are `swagger.json`, `swagger.yaml`, and `docs.go`. The `docs.go` file is a Go file that embeds the JSON content so it can be imported and served by your Gin application without needing to serve static JSON files separately.

---

## 3. Project Architecture Overview

Your project follows the **Module → Controller → Service** pattern with dependency injection, which is an excellent, clean architecture. Here is how Swagger fits into each layer:

```
+=====================================================================+
|                         YOUR PROJECT                                |
+=====================================================================+
|                                                                     |
|   main.go                                                           |
|   └── Initializes Gin router                                        |
|   └── Registers /swagger/* route  <-- SWAGGER UI LIVES HERE         |
|   └── Calls each module's setup                                     |
|                                                                     |
|   module/module.go  (Wire everything together)                      |
|   └── Creates Service                                               |
|   └── Creates Controller (injects Service)                          |
|   └── Calls Router function                                         |
|                                                                     |
|   module/controller.go  <-- SWAGGER ANNOTATIONS LIVE HERE           |
|   └── Defines route handlers                                        |
|   └── @Summary, @Param, @Success, @Router comments go here          |
|                                                                     |
|   module/service.go  (Business logic, no annotations needed)        |
|   └── Actual database/business logic                                |
|                                                                     |
|   domain/models.go  <-- SWAGGER SCHEMA ANNOTATIONS LIVE HERE        |
|   └── Struct tags: swaggertype, example                             |
|                                                                     |
|   docs/  (AUTO-GENERATED, never edit manually)                      |
|   └── swagger.json                                                  |
|   └── swagger.yaml                                                  |
|   └── docs.go                                                       |
|                                                                     |
+=====================================================================+
```

The most important thing to remember is this: **Swagger annotations belong in your controller layer, not the service layer.** The controller is the HTTP boundary of your application — it knows about request/response shapes, HTTP status codes, and route paths. The service is pure business logic and should not be concerned with HTTP documentation.

---

## 4. Installation & Setup

### Step 1: Install the `swag` CLI tool

```bash
go install github.com/swaggo/swag/cmd/swag@latest
```

After installation, verify it works:

```bash
swag --version
# Output: swag version v1.16.x
```

### Step 2: Add required Go dependencies

```bash
go get -u github.com/swaggo/swag
go get -u github.com/swaggo/gin-swagger
go get -u github.com/swaggo/files
```

Your `go.mod` will now include these three packages. Here is what each one does: `github.com/swaggo/swag` is the core library, `github.com/swaggo/gin-swagger` is the Gin middleware that serves the Swagger UI, and `github.com/swaggo/files` provides the static files (HTML, CSS, JS) for the Swagger UI browser interface.

### Step 3: Project directory structure after setup

```
your-project/
├── main.go
├── go.mod
├── go.sum
├── docs/                    <-- auto-generated by swag init
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── module/
│   ├── module.go
│   ├── controller.go
│   └── service.go
├── domain/
│   └── models.go
├── middleware/
│   └── auth.go
└── utils/
    └── response.go
```

---

## 5. Applying Swagger to Your Module → Controller → Service Pattern

### Step 1: Add the global API info annotation to `main.go`

The first thing `swag` needs is a **general info block** — this describes your entire API (title, version, base URL, authentication type). This block must go in your `main.go` file, directly above the `main()` function.

```go
// main.go
package main

import (
    "os"

    "github.com/gin-gonic/gin"
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"

    _ "your-project/docs" // ← IMPORTANT: import the auto-generated docs package
    "your-project/module"
)

// @title           My Production API
// @version         1.0
// @description     This is the backend API for My Application.
// @termsOfService  https://myapp.com/terms

// @contact.name   API Support Team
// @contact.url    https://myapp.com/support
// @contact.email  support@myapp.com

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      api.myapp.com
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and the JWT token.

// @schemes http https
func main() {
    router := gin.Default()

    // Swagger UI route (conditionally registered — see section 10)
    if os.Getenv("APP_ENV") != "production" {
        router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
    }

    v1 := router.Group("/api/v1")

    module.ModuleModule(v1, db)

    router.Run(":8080")
}
```

### Step 2: Update your Module file (no changes needed)

Your `module.go` file is fine as-is. It is the wiring layer, not the HTTP layer, so it needs no annotations.

```go
// module/module.go
package module

import (
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

func ModuleModule(router *gin.RouterGroup, db *gorm.DB) {
    moduleService := NewModuleService(db)
    moduleController := NewModuleController(&moduleService)
    ModuleRouter(router, moduleController)
}
```

### Step 3: Update your Controller with Swagger annotations

This is where most of the work happens. Every route handler gets a set of comment annotations directly above it. These comments are not regular Go comments — they are instructions for the `swag` parser.

```go
// module/controller.go
package module

import (
    "github.com/gin-gonic/gin"
    "your-project/middleware"
    "your-project/utils"
)

type ModuleController struct {
    service ModuleServiceInterface
}

func NewModuleController(service *ModuleServiceInterface) *ModuleController {
    return &ModuleController{service: *service}
}

func ModuleRouter(router *gin.RouterGroup, controller *ModuleController) {
    router.GET("/modules/list", middleware.Auth([]string{"admin"}), controller.GetModuleList)
}

// GetModuleList godoc
// @Summary      Get list of all modules
// @Description  Returns a list of all modules available for the given company.
// @Description  Requires a valid Bearer JWT token with admin role.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        company_id  header  string  true  "Company ID from JWT context"
// @Success      200  {object}  utils.APIResponse{data=[]domain.Module}  "List of modules"
// @Failure      400  {object}  utils.APIResponse  "company_id is missing"
// @Failure      401  {object}  utils.APIResponse  "Unauthorized — invalid or missing token"
// @Failure      500  {object}  utils.APIResponse  "Internal server error"
// @Router       /modules/list [get]
func (c *ModuleController) GetModuleList(ctx *gin.Context) {
    companyID, ok := ctx.Get("company_id")
    if !ok {
        utils.SendResponse(ctx, utils.SendData(400, "company_id is required"))
        return
    }
    response := c.service.GetModule(companyID.(string))
    utils.SendResponse(ctx, response)
}
```

Notice how the handler is now a **named method** on the controller struct instead of an anonymous function. This is required for `swag` to find and parse the annotations. Anonymous functions inside `router.GET(...)` cannot be annotated.

### Step 4: Annotate your Domain models

Your `domain.Module` struct should have Swagger-aware tags so the documentation shows the correct field types and example values.

```go
// domain/module.go
package domain

import "time"

// Module represents a feature module available to a company
// @Description Module is a feature set that can be enabled per company
type Module struct {
    ID          uint      `json:"id"          gorm:"primaryKey"          example:"1"`
    Name        string    `json:"name"        gorm:"column:name"         example:"Payroll Module"`
    Description string    `json:"description" gorm:"column:description"  example:"Handles all payroll operations"`
    IsActive    bool      `json:"is_active"   gorm:"column:is_active"    example:"true"`
    CreatedAt   time.Time `json:"created_at"                             example:"2024-01-15T10:30:00Z"`
    UpdatedAt   time.Time `json:"updated_at"                             example:"2024-06-01T08:00:00Z"`
}
```

### Step 5: Annotate your shared response wrapper

Since you use a common `utils.APIResponse` wrapper for all responses, Swagger needs to know its shape. Annotate it once and reuse everywhere.

```go
// utils/response.go
package utils

// APIResponse is the standard response envelope for all API endpoints
// @Description Standard JSON response structure returned by all endpoints
type APIResponse struct {
    StatusCode int         `json:"status_code"           example:"200"`
    Message    string      `json:"message"               example:"Success"`
    Data       interface{} `json:"data,omitempty"`
}

func SendData(code int, args ...interface{}) APIResponse {
    // your existing implementation
}

func SendResponse(ctx *gin.Context, response APIResponse) {
    // your existing implementation
}
```

### Step 6: Generate the documentation

Run this command from your project root every time you change annotations:

```bash
swag init --generalInfo main.go --output docs/
```

You can also add this as a `Makefile` target:

```makefile
# Makefile
.PHONY: swagger

swagger:
    swag init --generalInfo main.go --output docs/ --parseDependency --parseInternal

run: swagger
    go run main.go
```

---

## 6. Swagger Annotations — Complete Reference

Every annotation begins with `// @` followed by a keyword. Here is the full reference with examples.

### Route-Level Annotations

```go
// @Summary      Short one-line summary shown in the endpoint list
// @Description  Longer multi-line description.
// @Description  You can add multiple @Description lines.
// @Tags         Modules
// @Accept       json
// @Produce      json
```

`@Tags` groups your endpoints in the UI. Use consistent naming — all module routes should have `@Tags Modules`, all auth routes should have `@Tags Auth`, etc.

`@Accept` and `@Produce` describe the Content-Type the endpoint reads and writes. In most REST APIs this will always be `json`.

### Parameter Annotations

The `@Param` annotation has a fixed format with five parts separated by spaces:

```
// @Param  <name>  <in>  <type>  <required>  "<description>"
```

The `<in>` field tells Swagger where the parameter lives. It can be `path`, `query`, `header`, `body`, or `formData`.

```go
// Path parameter — part of the URL like /modules/:id
// @Param  id  path  int  true  "Module ID"

// Query parameter — like /modules/list?page=1&limit=10
// @Param  page   query  int     false  "Page number (default: 1)"
// @Param  limit  query  int     false  "Items per page (default: 20)"
// @Param  search query  string  false  "Search by module name"

// Header parameter — like Authorization or X-Company-ID
// @Param  Authorization  header  string  true  "Bearer JWT token"

// Request body — for POST/PUT/PATCH requests
// @Param  request  body  CreateModuleRequest  true  "Module creation payload"
```

### Response Annotations

```go
// Simple success response with a single object
// @Success  200  {object}  utils.APIResponse{data=domain.Module}  "Module found"

// Success response with an array
// @Success  200  {object}  utils.APIResponse{data=[]domain.Module}  "List of modules"

// Success with no body (like DELETE)
// @Success  204  {object}  nil  "Deleted successfully"

// Error responses
// @Failure  400  {object}  utils.APIResponse  "Bad request"
// @Failure  401  {object}  utils.APIResponse  "Unauthorized"
// @Failure  403  {object}  utils.APIResponse  "Forbidden — insufficient permissions"
// @Failure  404  {object}  utils.APIResponse  "Module not found"
// @Failure  422  {object}  utils.APIResponse  "Validation error"
// @Failure  500  {object}  utils.APIResponse  "Internal server error"
```

### Router Annotation

This is required on every handler. It tells Swagger the URL path and HTTP method.

```go
// @Router  /modules/list [get]
// @Router  /modules/{id} [get]
// @Router  /modules [post]
// @Router  /modules/{id} [put]
// @Router  /modules/{id} [delete]
```

---

## 7. Authentication Documentation (JWT / Bearer)

In your project you use JWT-based authentication through a middleware. Here is how to document it properly so the Swagger UI provides a token input box.

### Define the security scheme in `main.go`

```go
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter the token as: "Bearer <your-jwt-token>"
```

### Apply security to protected routes

```go
// GetModuleList godoc
// @Security  BearerAuth
// ... other annotations
```

When a user opens the Swagger UI, they will see a green **Authorize** button at the top. They paste their JWT token there once, and all subsequent "Try it out" calls will automatically include the `Authorization: Bearer <token>` header.

### Documenting multiple roles

You can document required roles in the description:

```go
// @Description  **Required Role:** `admin`
// @Description  This endpoint is restricted to users with the admin role.
// @Security  BearerAuth
```

---

## 8. Request & Response Schema Documentation

For `POST`, `PUT`, and `PATCH` endpoints, you need request body schemas. Define these as separate structs in your domain or a dedicated `dto` (Data Transfer Object) package.

### Request DTOs

```go
// dto/module_dto.go
package dto

// CreateModuleRequest defines the body for creating a new module
// @Description Payload required to create a new module
type CreateModuleRequest struct {
    Name        string `json:"name"        binding:"required,min=3,max=100" example:"Payroll Module"`
    Description string `json:"description" binding:"required"               example:"Handles payroll operations"`
    IsActive    bool   `json:"is_active"                                    example:"true"`
}

// UpdateModuleRequest defines the body for updating an existing module
type UpdateModuleRequest struct {
    Name        string `json:"name"        binding:"omitempty,min=3,max=100" example:"Updated Module Name"`
    Description string `json:"description" binding:"omitempty"               example:"Updated description"`
    IsActive    *bool  `json:"is_active"   binding:"omitempty"               example:"false"`
}
```

### Using DTOs in Controller annotations

```go
// CreateModule godoc
// @Summary      Create a new module
// @Description  Creates a new module for the company. Admin access required.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateModuleRequest                    true  "Module creation data"
// @Success      201      {object}  utils.APIResponse{data=domain.Module}      "Module created successfully"
// @Failure      400      {object}  utils.APIResponse                          "Validation error"
// @Failure      401      {object}  utils.APIResponse                          "Unauthorized"
// @Failure      500      {object}  utils.APIResponse                          "Server error"
// @Router       /modules [post]
func (c *ModuleController) CreateModule(ctx *gin.Context) {
    var req dto.CreateModuleRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.SendResponse(ctx, utils.SendData(400, err.Error()))
        return
    }
    response := c.service.CreateModule(req)
    utils.SendResponse(ctx, response)
}
```

### Documenting paginated responses

For endpoints that return paginated data, define a pagination wrapper struct:

```go
// utils/pagination.go
package utils

// PaginatedData is used for paginated API responses
type PaginatedData struct {
    Items      interface{} `json:"items"`
    Total      int64       `json:"total"        example:"150"`
    Page       int         `json:"page"         example:"1"`
    Limit      int         `json:"limit"        example:"20"`
    TotalPages int         `json:"total_pages"  example:"8"`
}
```

Use it in annotations like this:

```go
// @Success 200 {object} utils.APIResponse{data=utils.PaginatedData{items=[]domain.Module}} "Paginated module list"
```

---

## 9. Swagger UI Setup in Gin

Here is a complete and production-ready `main.go` setup with Swagger properly integrated:

```go
// main.go
package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"
    "gorm.io/gorm"

    _ "your-project/docs"
    "your-project/module"
)

// @title           Company Management API
// @version         2.1.0
// @description     Production-level REST API for managing company modules, users, and settings.

// @contact.name   Backend Team
// @contact.email  backend@company.com

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token. Example: "Bearer eyJhbGciOiJI..."

// @schemes http https
func main() {
    db := initDB() // your database init

    router := gin.Default()

    // Health check (always available)
    router.GET("/health", func(ctx *gin.Context) {
        ctx.JSON(200, gin.H{"status": "ok", "version": "2.1.0"})
    })

    // Swagger UI — only in non-production environments
    if os.Getenv("APP_ENV") != "production" {
        url := ginSwagger.URL("/swagger/doc.json") // points to swagger.json
        router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, url))
        log.Println("Swagger UI available at http://localhost:8080/swagger/index.html")
    }

    // API v1 routes
    v1 := router.Group("/api/v1")
    {
        module.ModuleModule(v1, db)
        // user.UserModule(v1, db)
        // auth.AuthModule(v1, db)
    }

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    if err := router.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
```

After running `swag init` and starting the server, visit:

```
http://localhost:8080/swagger/index.html
```

---

## 10. Environment-Based Swagger (Hide in Production)

In production, you generally do not want to expose your Swagger UI to the public internet. There are three strategies for this.

### Strategy 1: Environment variable toggle (simplest)

```go
if os.Getenv("APP_ENV") != "production" {
    router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
```

Set `APP_ENV=production` in your production environment variables (Docker, Kubernetes, etc.) and the UI will not be registered.

### Strategy 2: Build tags (compile-time removal)

Create two files — one that registers Swagger, one that does not. Use Go build tags to choose which one compiles:

```go
// swagger_dev.go
//go:build !production
// +build !production

package main

import (
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"
    _ "your-project/docs"
)

func registerSwagger(router *gin.Engine) {
    router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
```

```go
// swagger_prod.go
//go:build production
// +build production

package main

func registerSwagger(router *gin.Engine) {
    // no-op in production build
}
```

In your `main.go` just call `registerSwagger(router)`. When building for production use:

```bash
go build -tags production -o app .
```

### Strategy 3: IP whitelist middleware (for internal team access)

If you want Swagger available in production but only for your internal team:

```go
func SwaggerIPWhitelist() gin.HandlerFunc {
    allowedIPs := map[string]bool{
        "10.0.0.1":   true, // VPN IP
        "192.168.1.1": true, // Office IP
    }

    return func(ctx *gin.Context) {
        clientIP := ctx.ClientIP()
        if !allowedIPs[clientIP] {
            ctx.AbortWithStatusJSON(403, gin.H{"error": "Access denied"})
            return
        }
        ctx.Next()
    }
}

// In main.go
swaggerGroup := router.Group("/swagger", SwaggerIPWhitelist())
swaggerGroup.GET("/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
```

---

## 11. Versioning APIs with Swagger

In a production project you will eventually need v2 of your API. Here is how to handle versioning cleanly.

### URL-based versioning (most common approach)

```go
// main.go

// @title     My API
// @version   2.0
// @BasePath  /api/v2

func main() {
    router := gin.Default()

    v1 := router.Group("/api/v1")
    v2 := router.Group("/api/v2")

    // v1 modules
    moduleV1.ModuleModule(v1, db)

    // v2 modules (new features, breaking changes)
    moduleV2.ModuleModule(v2, db)
}
```

For separate Swagger docs per version, you can run `swag init` with a different output folder and serve two Swagger UIs:

```bash
# Generate v1 docs
swag init --generalInfo api/v1/main_info.go --output docs/v1/

# Generate v2 docs
swag init --generalInfo api/v2/main_info.go --output docs/v2/
```

---

## 12. Grouping APIs with Tags

Tags in Swagger create collapsible sections in the Swagger UI. Each section groups all related endpoints together. Define your tags globally in `main.go` so they appear with descriptions:

```go
// @tag.name         Auth
// @tag.description  Authentication endpoints — login, logout, refresh token

// @tag.name         Modules
// @tag.description  Module management — list, create, update, delete company modules

// @tag.name         Users
// @tag.description  User management — CRUD operations for company users

// @tag.name         Settings
// @tag.description  Company configuration and settings
```

Then in each controller, use the matching tag:

```go
// @Tags  Auth
// @Tags  Modules
// @Tags  Users
```

The resulting Swagger UI looks like this:

```
[ Auth ]        ▼
  POST  /auth/login
  POST  /auth/refresh
  DELETE /auth/logout

[ Modules ]     ▼
  GET   /modules/list
  POST  /modules
  GET   /modules/{id}
  PUT   /modules/{id}
  DELETE /modules/{id}

[ Users ]       ▼
  ...
```

---

## 13. Common Production Patterns

### Pattern 1: Documenting file upload endpoints

```go
// UploadModuleIcon godoc
// @Summary      Upload module icon
// @Tags         Modules
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        module_id  path      int    true  "Module ID"
// @Param        icon       formData  file   true  "Icon image file (PNG, JPG, max 2MB)"
// @Success      200        {object}  utils.APIResponse{data=string}  "URL of uploaded icon"
// @Failure      400        {object}  utils.APIResponse               "Invalid file type or size"
// @Router       /modules/{module_id}/icon [post]
func (c *ModuleController) UploadIcon(ctx *gin.Context) { ... }
```

### Pattern 2: Documenting an enum/constant field

```go
// dto/module_dto.go

// ModuleStatus represents the possible states of a module
// @Enum active inactive suspended
type ModuleStatus string

const (
    ModuleStatusActive    ModuleStatus = "active"
    ModuleStatusInactive  ModuleStatus = "inactive"
    ModuleStatusSuspended ModuleStatus = "suspended"
)

type UpdateModuleStatusRequest struct {
    // Status of the module
    // Enum: active, inactive, suspended
    Status ModuleStatus `json:"status" binding:"required,oneof=active inactive suspended" enums:"active,inactive,suspended" example:"active"`
}
```

### Pattern 3: Documenting deprecated endpoints

When you deprecate an old endpoint (it still works but will be removed), mark it clearly:

```go
// GetModuleListV1 godoc
// @Summary      [DEPRECATED] Get module list
// @Description  **This endpoint is deprecated. Use GET /v2/modules/list instead.**
// @Deprecated
// @Tags         Modules
// @Router       /v1/modules/list [get]
func (c *ModuleController) GetModuleListV1(ctx *gin.Context) { ... }
```

### Pattern 4: Documenting WebSocket / long-poll endpoints

Swagger does not natively support WebSocket documentation, but you can document the connection endpoint and include protocol details in the description:

```go
// ModuleUpdatesWebSocket godoc
// @Summary      WebSocket — real-time module updates
// @Description  Connect via WebSocket to receive real-time module status updates.
// @Description
// @Description  **Protocol:** WebSocket (ws:// or wss://)
// @Description  **Connection:** `ws://localhost:8080/ws/modules?token=<jwt>`
// @Description
// @Description  **Incoming message format:**
// @Description  `{"type": "module_updated", "data": {"id": 1, "name": "..."}}`
// @Tags         WebSocket
// @Param        token  query  string  true  "JWT token for authentication"
// @Success      101  {string}  string  "Switching protocols"
// @Router       /ws/modules [get]
func (c *ModuleController) ModuleUpdatesWS(ctx *gin.Context) { ... }
```

---

## 14. Full Working Example — Module Feature

Below is the complete, production-ready implementation of your module feature with full Swagger documentation.

### `main.go`

```go
package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"

    _ "your-project/docs"
    "your-project/module"
)

// @title           Company API
// @version         1.0
// @description     REST API for company module management.
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
    dsn := os.Getenv("DATABASE_URL")
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    router := gin.Default()

    if os.Getenv("APP_ENV") != "production" {
        router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
    }

    v1 := router.Group("/api/v1")
    module.ModuleModule(v1, db)

    router.Run(":8080")
}
```

### `domain/module.go`

```go
package domain

import "time"

// Module represents a feature module in the system
type Module struct {
    ID          uint      `json:"id"          gorm:"primaryKey"         example:"1"`
    Name        string    `json:"name"        gorm:"column:name"        example:"Payroll"`
    Description string    `json:"description" gorm:"column:description" example:"Payroll management"`
    IsActive    bool      `json:"is_active"   gorm:"column:is_active"   example:"true"`
    CompanyID   string    `json:"company_id"  gorm:"column:company_id"  example:"comp_abc123"`
    CreatedAt   time.Time `json:"created_at"                            example:"2024-01-01T00:00:00Z"`
    UpdatedAt   time.Time `json:"updated_at"                            example:"2024-06-01T00:00:00Z"`
}
```

### `dto/module_dto.go`

```go
package dto

// CreateModuleRequest is the request body for creating a module
type CreateModuleRequest struct {
    Name        string `json:"name"        binding:"required,min=2"  example:"Payroll Module"`
    Description string `json:"description" binding:"required"         example:"Handles payroll operations"`
    IsActive    bool   `json:"is_active"                              example:"true"`
}

// UpdateModuleRequest is the request body for updating a module
type UpdateModuleRequest struct {
    Name        string `json:"name"        binding:"omitempty,min=2"  example:"Updated Module"`
    Description string `json:"description" binding:"omitempty"         example:"Updated description"`
    IsActive    *bool  `json:"is_active"                               example:"false"`
}
```

### `module/module.go`

```go
package module

import (
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

func ModuleModule(router *gin.RouterGroup, db *gorm.DB) {
    moduleService := NewModuleService(db)
    moduleController := NewModuleController(&moduleService)
    ModuleRouter(router, moduleController)
}
```

### `module/controller.go`

```go
package module

import (
    "strconv"

    "github.com/gin-gonic/gin"
    "your-project/domain"
    "your-project/dto"
    "your-project/middleware"
    "your-project/utils"
)

type ModuleController struct {
    service ModuleServiceInterface
}

func NewModuleController(service *ModuleServiceInterface) *ModuleController {
    return &ModuleController{service: *service}
}

func ModuleRouter(router *gin.RouterGroup, controller *ModuleController) {
    modules := router.Group("/modules")
    {
        modules.GET("/list",  middleware.Auth([]string{"admin"}), controller.GetModuleList)
        modules.GET("/:id",   middleware.Auth([]string{"admin"}), controller.GetModuleByID)
        modules.POST("",      middleware.Auth([]string{"admin"}), controller.CreateModule)
        modules.PUT("/:id",   middleware.Auth([]string{"admin"}), controller.UpdateModule)
        modules.DELETE("/:id", middleware.Auth([]string{"admin"}), controller.DeleteModule)
    }
}

// GetModuleList godoc
// @Summary      Get all modules for a company
// @Description  Returns a complete list of modules associated with the authenticated company.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  utils.APIResponse{data=[]domain.Module}  "Modules retrieved"
// @Failure      400  {object}  utils.APIResponse  "company_id missing from context"
// @Failure      401  {object}  utils.APIResponse  "Unauthorized"
// @Failure      500  {object}  utils.APIResponse  "Database error"
// @Router       /modules/list [get]
func (c *ModuleController) GetModuleList(ctx *gin.Context) {
    companyID, ok := ctx.Get("company_id")
    if !ok {
        utils.SendResponse(ctx, utils.SendData(400, "company_id is required"))
        return
    }
    response := c.service.GetModule(companyID.(string))
    utils.SendResponse(ctx, response)
}

// GetModuleByID godoc
// @Summary      Get a single module by ID
// @Description  Returns the details of a specific module by its numeric ID.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Module ID"
// @Success      200  {object}  utils.APIResponse{data=domain.Module}  "Module found"
// @Failure      400  {object}  utils.APIResponse  "Invalid ID format"
// @Failure      401  {object}  utils.APIResponse  "Unauthorized"
// @Failure      404  {object}  utils.APIResponse  "Module not found"
// @Failure      500  {object}  utils.APIResponse  "Server error"
// @Router       /modules/{id} [get]
func (c *ModuleController) GetModuleByID(ctx *gin.Context) {
    id, err := strconv.Atoi(ctx.Param("id"))
    if err != nil {
        utils.SendResponse(ctx, utils.SendData(400, "invalid module ID"))
        return
    }
    response := c.service.GetModuleByID(uint(id))
    utils.SendResponse(ctx, response)
}

// CreateModule godoc
// @Summary      Create a new module
// @Description  Creates a new feature module and assigns it to the authenticated company.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateModuleRequest                 true  "Module data"
// @Success      201      {object}  utils.APIResponse{data=domain.Module}   "Module created"
// @Failure      400      {object}  utils.APIResponse  "Validation failed"
// @Failure      401      {object}  utils.APIResponse  "Unauthorized"
// @Failure      500      {object}  utils.APIResponse  "Server error"
// @Router       /modules [post]
func (c *ModuleController) CreateModule(ctx *gin.Context) {
    var req dto.CreateModuleRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.SendResponse(ctx, utils.SendData(400, err.Error()))
        return
    }
    companyID, _ := ctx.Get("company_id")
    response := c.service.CreateModule(req, companyID.(string))
    utils.SendResponse(ctx, response)
}

// UpdateModule godoc
// @Summary      Update an existing module
// @Description  Updates the details of an existing module. Only provided fields are updated.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                      true  "Module ID"
// @Param        request  body      dto.UpdateModuleRequest  true  "Fields to update"
// @Success      200      {object}  utils.APIResponse{data=domain.Module}  "Module updated"
// @Failure      400      {object}  utils.APIResponse  "Validation error"
// @Failure      401      {object}  utils.APIResponse  "Unauthorized"
// @Failure      404      {object}  utils.APIResponse  "Module not found"
// @Failure      500      {object}  utils.APIResponse  "Server error"
// @Router       /modules/{id} [put]
func (c *ModuleController) UpdateModule(ctx *gin.Context) {
    id, err := strconv.Atoi(ctx.Param("id"))
    if err != nil {
        utils.SendResponse(ctx, utils.SendData(400, "invalid module ID"))
        return
    }
    var req dto.UpdateModuleRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        utils.SendResponse(ctx, utils.SendData(400, err.Error()))
        return
    }
    response := c.service.UpdateModule(uint(id), req)
    utils.SendResponse(ctx, response)
}

// DeleteModule godoc
// @Summary      Delete a module
// @Description  Permanently deletes a module by its ID. This action cannot be undone.
// @Tags         Modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "Module ID"
// @Success      200  {object}  utils.APIResponse  "Module deleted successfully"
// @Failure      400  {object}  utils.APIResponse  "Invalid ID"
// @Failure      401  {object}  utils.APIResponse  "Unauthorized"
// @Failure      404  {object}  utils.APIResponse  "Module not found"
// @Failure      500  {object}  utils.APIResponse  "Server error"
// @Router       /modules/{id} [delete]
func (c *ModuleController) DeleteModule(ctx *gin.Context) {
    id, err := strconv.Atoi(ctx.Param("id"))
    if err != nil {
        utils.SendResponse(ctx, utils.SendData(400, "invalid module ID"))
        return
    }
    response := c.service.DeleteModule(uint(id))
    utils.SendResponse(ctx, response)
}
```

### `module/service.go`

```go
package module

import (
    "your-project/domain"
    "your-project/dto"
    "your-project/utils"

    "gorm.io/gorm"
)

type ModuleService struct {
    db *gorm.DB
}

type ModuleServiceInterface interface {
    GetModule(companyId string) utils.APIResponse
    GetModuleByID(id uint) utils.APIResponse
    CreateModule(req dto.CreateModuleRequest, companyID string) utils.APIResponse
    UpdateModule(id uint, req dto.UpdateModuleRequest) utils.APIResponse
    DeleteModule(id uint) utils.APIResponse
}

func NewModuleService(db *gorm.DB) ModuleServiceInterface {
    return &ModuleService{db: db}
}

func (s *ModuleService) GetModule(companyId string) utils.APIResponse {
    var modules []domain.Module
    if err := s.db.Where("company_id = ?", companyId).Find(&modules).Error; err != nil {
        return utils.SendData(500, err.Error())
    }
    return utils.SendData(200, "Modules retrieved", modules)
}

func (s *ModuleService) GetModuleByID(id uint) utils.APIResponse {
    var module domain.Module
    if err := s.db.First(&module, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return utils.SendData(404, "Module not found")
        }
        return utils.SendData(500, err.Error())
    }
    return utils.SendData(200, "Module found", module)
}

func (s *ModuleService) CreateModule(req dto.CreateModuleRequest, companyID string) utils.APIResponse {
    module := domain.Module{
        Name:        req.Name,
        Description: req.Description,
        IsActive:    req.IsActive,
        CompanyID:   companyID,
    }
    if err := s.db.Create(&module).Error; err != nil {
        return utils.SendData(500, err.Error())
    }
    return utils.SendData(201, "Module created", module)
}

func (s *ModuleService) UpdateModule(id uint, req dto.UpdateModuleRequest) utils.APIResponse {
    var module domain.Module
    if err := s.db.First(&module, id).Error; err != nil {
        return utils.SendData(404, "Module not found")
    }
    updates := map[string]interface{}{}
    if req.Name != "" {
        updates["name"] = req.Name
    }
    if req.Description != "" {
        updates["description"] = req.Description
    }
    if req.IsActive != nil {
        updates["is_active"] = *req.IsActive
    }
    if err := s.db.Model(&module).Updates(updates).Error; err != nil {
        return utils.SendData(500, err.Error())
    }
    return utils.SendData(200, "Module updated", module)
}

func (s *ModuleService) DeleteModule(id uint) utils.APIResponse {
    if err := s.db.Delete(&domain.Module{}, id).Error; err != nil {
        return utils.SendData(500, err.Error())
    }
    return utils.SendData(200, "Module deleted")
}
```

---

## 15. Generated Swagger JSON Structure

When you run `swag init`, the `docs/swagger.json` file will look like this (abbreviated):

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Company API",
    "version": "1.0",
    "description": "REST API for company module management."
  },
  "host": "localhost:8080",
  "basePath": "/api/v1",
  "securityDefinitions": {
    "BearerAuth": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header"
    }
  },
  "paths": {
    "/modules/list": {
      "get": {
        "summary": "Get all modules for a company",
        "tags": ["Modules"],
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Modules retrieved",
            "schema": {
              "$ref": "#/definitions/APIResponse"
            }
          },
          "401": { "description": "Unauthorized" },
          "500": { "description": "Database error" }
        }
      }
    },
    "/modules/{id}": {
      "get": { ... },
      "put": { ... },
      "delete": { ... }
    },
    "/modules": {
      "post": { ... }
    }
  },
  "definitions": {
    "Module": {
      "type": "object",
      "properties": {
        "id":          { "type": "integer", "example": 1 },
        "name":        { "type": "string",  "example": "Payroll" },
        "description": { "type": "string",  "example": "Payroll management" },
        "is_active":   { "type": "boolean", "example": true },
        "company_id":  { "type": "string",  "example": "comp_abc123" }
      }
    }
  }
}
```

---

## 16. Best Practices Checklist

Before deploying to production, verify each item in this checklist:

**Annotation Completeness** Every route must have `@Summary`, `@Tags`, `@Produce`, `@Security` (if protected), at least one `@Success`, and at least one `@Failure` for 400, 401, and 500.

**Handler Functions Must Be Named Methods** Anonymous functions like `func(ctx *gin.Context) { ... }` cannot be annotated. Always extract them into named methods on the controller struct.

**Use DTOs for Request Bodies** Never annotate raw `map[string]interface{}` as a request body. Always define a proper struct in a `dto` package.

**Never Edit the `docs/` Folder Manually** The entire `docs/` folder is auto-generated. Any manual edits will be overwritten the next time `swag init` runs. Add it to your `.gitignore` or commit it — but never hand-edit it.

**Regenerate Docs in CI/CD** Add `swag init` as a step in your CI/CD pipeline before building the binary so the docs are always synchronized with the code.

**Use `--parseDependency` Flag for External Struct References** If your domain models or DTOs are in separate packages from your controllers, always run:

```bash
swag init --parseDependency --parseInternal
```

**Hide Swagger UI in Production** Use environment variables or build tags to prevent the Swagger UI from being publicly accessible in production. The raw `swagger.json` should also be protected.

**Document ALL Error Responses** At minimum document 400, 401, 403, 404, and 500 for every endpoint. This helps frontend developers handle errors correctly without guessing.

**Use `example` Struct Tags Generously** The Swagger UI's "Try it out" feature pre-fills forms with example values. Well-chosen examples save time for every developer using the API.

---

_Generated for production-level Golang + Gin + Swagger integration guide_ _Stack: Go, Gin, GORM, swaggo/swag, PostgreSQL, JWT Auth_