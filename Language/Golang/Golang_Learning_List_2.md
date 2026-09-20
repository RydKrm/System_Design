# Go (Golang) Case Studies — Volume 2

> Continuing from Volume 1's 46 cases. Same structure throughout: **Situation → Problem → Root Cause → Solution → Result → Lesson** Covering error handling, interface design, testing patterns, build & deployment, scheduler internals, advanced concurrency, WebSocket, middleware, and more.

---

## Part 11 — Error Handling Failure Cases

### 11.1 The Error That Was Checked but Ignored

- **Situation:** File upload service — saving uploaded files to disk
- **Problem:** Corrupted files were being stored silently — users downloaded files with missing content
- **Root cause:**
    
    ```go
    f, err := os.Create(path)if err != nil { return err }defer f.Close() // Close() error ignored heren, err := io.Copy(f, src)if err != nil { return err }_ = n // bytes written ignored// f.Close() called by defer — but if disk is full,// Close() flushes the buffer and fails — error silently discarded
    ```
    
    `defer f.Close()` ignores the error — on a full disk, `Close()` flushes pending buffered data and fails — the file is truncated — the error is swallowed — the caller thinks the write succeeded
- **Solution:**
    
    ```go
    f, err := os.Create(path)if err != nil { return err }defer func() {    closeErr := f.Close()    if err == nil { err = closeErr } // capture close error if no prior error}()_, err = io.Copy(f, src)return err
    ```
    
    Or use a named return to capture the close error in the defer
- **Result:** Disk-full errors now surface to the caller — corrupted files eliminated
- **Lesson:** `defer f.Close()` silently discards the close error — for file writes, the close error is as important as the write error (buffered data is flushed on close); always capture and propagate it

### 11.2 The Sentinel Error That Broke Package Boundaries

- **Situation:** Library package exposing a database abstraction — consumers checking for specific errors
- **Problem:** After a library version upgrade, consumer code stopped handling "not found" correctly — errors that used to match now didn't
- **Root cause:**
    
    ```go
    // library v1:var ErrNotFound = errors.New("not found")// consumer:if err == lib.ErrNotFound { handleNotFound() }// library v2 (wrapped the error for more context):return fmt.Errorf("user %d: %w", id, ErrNotFound)// consumer: err == lib.ErrNotFound now FALSE because the error is wrapped
    ```
    
    The library wrapped its sentinel error for better context — the consumer's `==` comparison broke silently — `err == ErrNotFound` is false for wrapped errors
- **Solution:** Use `errors.Is()` for error comparison — it unwraps the chain:
    
    ```go
    if errors.Is(err, lib.ErrNotFound) { handleNotFound() } // works for wrapped errors
    ```
    
    Library authors: always wrap with `%w` not `%v` so errors remain unwrappable:
    
    ```go
    return fmt.Errorf("user %d: %w", id, ErrNotFound) // unwrappablereturn fmt.Errorf("user %d: %v", id, ErrNotFound) // NOT unwrappable
    ```
    
- **Result:** Error checks survive library updates that add context wrapping
- **Lesson:** Never use `==` to compare errors — always use `errors.Is()` and `errors.As()`; always use `%w` when wrapping errors so they remain unwrappable by consumers

### 11.3 The Error String That Was Used as Program Logic

- **Situation:** Payment service — parsing errors from a third-party payment gateway SDK
- **Problem:** Error handling logic broke after an SDK patch version update — payments that should have been retried were not retried
- **Root cause:**
    
    ```go
    if err.Error() == "rate limit exceeded" {    retry() // logic based on error string}
    ```
    
    The SDK patch changed the error string to `"rate limit exceeded (429)"` — the string comparison broke — no retry happened — payments failed permanently instead of retrying
- **Solution:** Use typed errors — check the error type, not the string:
    
    ```go
    var rateLimitErr *sdk.RateLimitErrorif errors.As(err, &rateLimitErr) {    retry() // logic based on error TYPE — string can change, type cannot}
    ```
    
    For third-party SDKs that don't use typed errors: use error codes if available (`err.Code == 429`) rather than strings
- **Result:** Error handling survives SDK updates that change error message wording
- **Lesson:** Error strings are for humans, not programs — never write logic that depends on `err.Error()` string content; use typed errors with `errors.As()` or error codes

### 11.4 The Panic Used as Error Handling

- **Situation:** Configuration loading package — used across 15 microservices
- **Problem:** Any misconfiguration caused all 15 services to crash on startup — a single bad config value in one service's environment took all of them down (shared config loading library)
- **Root cause:**
    
    ```go
    func LoadConfig() Config {    port, err := strconv.Atoi(os.Getenv("PORT"))    if err != nil {        panic(fmt.Sprintf("invalid PORT: %v", err)) // PANIC for recoverable error    }    return Config{Port: port}}
    ```
    
    `panic` for configuration errors forces the caller to use `recover()` or crash — there is no way to handle the error gracefully — the correct approach is returning an error
- **Solution:**
    
    ```go
    func LoadConfig() (Config, error) {    port, err := strconv.Atoi(os.Getenv("PORT"))    if err != nil {        return Config{}, fmt.Errorf("invalid PORT %q: %w", os.Getenv("PORT"), err)    }    return Config{Port: port}, nil}
    ```
    
    Reserve `panic` for truly unrecoverable states (programming errors, invariant violations) — configuration errors are always recoverable (fix the config, restart)
- **Result:** Services handle configuration errors gracefully — log the error, exit with a helpful message instead of a panic stack trace
- **Lesson:** `panic` is for programmer errors and invariant violations — never for user input, configuration, or external system errors; return errors for anything the caller might want to handle

### 11.5 The Error Wrapped So Many Times It Lost Meaning

- **Situation:** Deep call stack in a microservice — `handler → service → repository → db`
- **Problem:** Error messages in logs were: `"handle request: process order: save order: execute query: execute query: execute query: sql: no rows in result set"` — wrapped so many times the original error was buried — log search for `"no rows"` found nothing in the wrapped message
- **Root cause:**
    
    ```go
    // repository:return fmt.Errorf("execute query: %w", err)// service:return fmt.Errorf("save order: %w", err)// handler:return fmt.Errorf("process order: %w", err)// middleware:return fmt.Errorf("handle request: %w", err)
    ```
    
    Every layer added a prefix — 4 layers × wrapping = hard to read message — and the database driver itself had already wrapped the error twice
- **Solution:** Add context only at meaningful boundaries — not at every function:
    
    ```go
    // Repository: add the SQL context (most specific)return fmt.Errorf("get order %d: %w", orderID, err)// Service: add business context only if it adds information// (skip wrapping if the repo error is already clear)// Handler: log the full error but return a user-facing messagelog.Error("order processing failed", "error", err, "order_id", orderID)return ErrInternalServer // user sees a clean message
    ```
    
    Use structured logging with the error as a field — the full chain is preserved in the log without polluting the error message
- **Lesson:** Wrap errors to add context not already in the inner error — "save order: sql: no rows" is redundant if the repo error already says "get order 123: sql: no rows"; structured logging with `"error", err` preserves the full chain without excessive wrapping

### 11.6 The Error Returned After Resource Was Already Used

- **Situation:** HTTP handler returning an error after partially writing a response
- **Problem:** Client received a garbled response — partial JSON followed by an error message — JSON parsers failed — clients showed corrupt data
- **Root cause:**
    
    ```go
    func handler(w http.ResponseWriter, r *http.Request) {    data, err := fetchData()    if err != nil {        http.Error(w, "internal error", 500) // BUG: headers already sent        return    }    w.Header().Set("Content-Type", "application/json")    json.NewEncoder(w).Encode(data) // if this partially writes then errors...    // ...the caller cannot undo the partial write}
    ```
    
    Once `w.WriteHeader()` or any write to `w` is called, the HTTP status code is committed — calling `http.Error()` after a partial write appends to the response body — the client receives mixed content
- **Solution:** Never write to `ResponseWriter` before all error-prone operations complete:
    
    ```go
    func handler(w http.ResponseWriter, r *http.Request) {    data, err := fetchData()    if err != nil {        http.Error(w, "internal error", 500) // safe — nothing written yet        return    }    // Buffer the response or ensure Encode cannot fail for this data type    buf := &bytes.Buffer{}    if err := json.NewEncoder(buf).Encode(data); err != nil {        http.Error(w, "encoding error", 500)        return    }    w.Header().Set("Content-Type", "application/json")    w.Write(buf.Bytes()) // write only after all errors checked}
    ```
    
- **Lesson:** HTTP responses are a one-way door — once you start writing, you cannot change the status code or undo partial writes; always validate and prepare the full response before writing the first byte

---

## Part 12 — Interface and Design Failure Cases

### 12.1 The Interface That Was Too Large

- **Situation:** Repository layer — `UserRepository` interface
- **Problem:** Every test that needed to mock the user repository had to implement 22 methods — most tests only used 2–3 methods — test setup took more time than the test itself
- **Root cause:**
    
    ```go
    type UserRepository interface {    Create(ctx context.Context, u *User) error    GetByID(ctx context.Context, id int64) (*User, error)    GetByEmail(ctx context.Context, email string) (*User, error)    Update(ctx context.Context, u *User) error    Delete(ctx context.Context, id int64) error    List(ctx context.Context, filter UserFilter) ([]*User, error)    Count(ctx context.Context, filter UserFilter) (int64, error)    // ... 15 more methods}
    ```
    
    A 22-method interface violates the Interface Segregation Principle — any mock must implement all 22 methods
- **Solution:** Role-based interfaces — define small interfaces where they are consumed:
    
    ```go
    // In the authentication package — only what auth needs:type UserFinder interface {    GetByEmail(ctx context.Context, email string) (*User, error)}// In the admin package — only what admin needs:type UserLister interface {    List(ctx context.Context, filter UserFilter) ([]*User, error)    Count(ctx context.Context, filter UserFilter) (int64, error)}
    ```
    
    The concrete `PostgresUserRepository` implements all methods — each consumer only sees the methods it needs — mocks only implement the small interface
- **Result:** Test mock setup reduced from 22 methods to 1–3 per test — tests readable and focused
- **Lesson:** "Accept interfaces, return structs" — define interfaces at the point of use, not at the point of implementation; small, focused interfaces make code testable without mocking frameworks

### 12.2 The Interface Satisfied by the Wrong Type

- **Situation:** Payment processor — interface for different payment providers
- **Problem:** A mock payment provider was accidentally used in production — real charges were not made — orders appeared paid but no money moved
- **Root cause:**
    
    ```go
    type PaymentProvider interface {    Charge(amount int64, currency string) (string, error)}var provider PaymentProvider = &MockProvider{} // dev default// Production config loading failed silently — provider was never set to StripeProvider// Because MockProvider satisfied the interface, the type system didn't catch it
    ```
    
    The interface abstraction that made the code testable also made a configuration bug invisible — the mock satisfied the interface perfectly — no compile-time or runtime type error
- **Solution:** Require explicit production initialization — fail loudly if the provider is not configured:
    
    ```go
    func NewPaymentService(providerType string, cfg Config) (*PaymentService, error) {    switch providerType {    case "stripe":        return &PaymentService{provider: NewStripeProvider(cfg)}, nil    case "mock":        if cfg.Env == "production" {            return nil, errors.New("cannot use mock payment provider in production")        }        return &PaymentService{provider: &MockProvider{}}, nil    default:        return nil, fmt.Errorf("unknown payment provider: %s", providerType)    }}
    ```
    
- **Result:** Production service fails to start if configured with mock provider — configuration errors caught at startup
- **Lesson:** Interfaces that make testing easy can also hide configuration bugs — add explicit guards that prevent test/mock implementations from running in production

### 12.3 The nil Interface That Was Not nil

- **Situation:** Error handling in a service — checking if an error interface value is nil
- **Problem:** Code checked `if err != nil` but the error was always "not nil" even when no error occurred — led to false error responses to clients
- **Root cause:**
    
    ```go
    type MyError struct{ msg string }func (e *MyError) Error() string { return e.msg }func doWork() error {    var err *MyError = nil // typed nil pointer    if somethingFailed {        err = &MyError{"something went wrong"}    }    return err // returns (*MyError)(nil) — NOT nil interface}// caller:if err := doWork(); err != nil { // TRUE even when err is (*MyError)(nil)    log.Error("failed") // false positive}
    ```
    
    In Go, an interface holds (type, value) — `(*MyError)(nil)` has type `*MyError` and value `nil` — the interface is not nil because the type is set — only `(nil, nil)` is a nil interface
- **Solution:** Return the `error` interface directly, never a typed nil:
    
    ```go
    func doWork() error {    if somethingFailed {        return &MyError{"something went wrong"} // returns non-nil interface    }    return nil // returns nil interface — (nil, nil) — correctly nil}
    ```
    
    Never assign a concrete type to an error variable and then return it — always return `nil` directly
- **Result:** Zero false-positive error detections
- **Lesson:** This is one of Go's most famous gotchas — a typed nil pointer returned as an interface is not nil; always return `nil` directly for no-error cases, never a typed nil variable

### 12.4 The Stringer That Triggered Infinite Recursion

- **Situation:** Custom type implementing `fmt.Stringer` for debug logging
- **Problem:** Service crashed with stack overflow whenever a value of this type was logged
- **Root cause:**
    
    ```go
    type Config struct {    Name string    Port int}func (c Config) String() string {    return fmt.Sprintf("Config: %v", c) // INFINITE RECURSION    // fmt.Sprintf with %v calls c.String() again    // which calls fmt.Sprintf which calls c.String()...}
    ```
    
    `fmt.Sprintf("%v", c)` checks if `c` implements `fmt.Stringer` — it does — calls `c.String()` — which calls `fmt.Sprintf("%v", c)` — infinite recursion — stack overflow
- **Solution:**
    
    ```go
    func (c Config) String() string {    return fmt.Sprintf("Config: {Name:%s Port:%d}", c.Name, c.Port) // explicit fields    // Or cast to avoid Stringer interface:    type configAlias Config    return fmt.Sprintf("Config: %v", configAlias(c)) // alias doesn't implement Stringer}
    ```
    
- **Result:** Zero stack overflows from String() methods
- **Lesson:** Never use `%v` on the receiver type inside its own `String()` method — it calls `String()` again; use field-by-field formatting or cast to a type alias that does not implement `Stringer`

---

## Part 13 — Channel Pattern Failure Cases

### 13.1 The Buffered Channel Used as a Semaphore — Wrong Buffer Size

- **Situation:** Background job runner — limiting concurrent jobs using a buffered channel
- **Problem:** Jobs were running without any concurrency limit — the semaphore was not working
- **Root cause:**
    
    ```go
    sem := make(chan struct{}, 0) // zero-buffered = synchronous = semaphore of 1// Developer thought buffer size 0 means "no limit" — it means the OPPOSITE// Each send blocks until a receive — effectively serializes all goroutines// Actually: they changed it to:sem := make(chan struct{}) // unbuffered — trying to send blocks until receivefor _, job := range jobs {    sem <- struct{}{} // this BLOCKS until someone receives    go func(j Job) {        // nobody reads from sem — deadlock    }(job)}
    ```
    
    Confusion between buffered and unbuffered channels as semaphores — the pattern requires a buffered channel with buffer size equal to the concurrency limit
- **Solution:**
    
    ```go
    const maxConcurrent = 10sem := make(chan struct{}, maxConcurrent) // buffer size = concurrency limitfor _, job := range jobs {    sem <- struct{}{} // blocks when 10 goroutines are running    go func(j Job) {        defer func() { <-sem }() // release slot when done        process(j)    }(job)}
    ```
    
- **Lesson:** Buffered channel as semaphore: buffer size = maximum concurrent goroutines; `send` acquires the semaphore (blocks if full), `receive` releases it; `make(chan struct{}, N)` allows N concurrent goroutines

### 13.2 The Pipeline That Leaked on Error

- **Situation:** Data processing pipeline — multiple stages connected by channels
- **Problem:** When the pipeline was cancelled mid-flight, goroutines from earlier stages leaked — pprof showed goroutines stuck on channel sends that nobody was reading
- **Root cause:**
    
    ```go
    func stage1(in <-chan Item) <-chan Result {    out := make(chan Result)    go func() {        for item := range in {            out <- process(item) // BLOCKS if downstream cancels and stops reading        }        close(out)    }()    return out}// If the downstream consumer returns early (error or cancellation),// stage1 goroutine is stuck on `out <- process(item)` forever
    ```
    
    When a downstream stage stops consuming, upstream stages block on sends — goroutines accumulate
- **Solution:** Use context cancellation to unblock upstream stages:
    
    ```go
    func stage1(ctx context.Context, in <-chan Item) <-chan Result {    out := make(chan Result)    go func() {        defer close(out)        for item := range in {            select {            case out <- process(item): // send result            case <-ctx.Done(): return  // bail out if context cancelled            }        }    }()    return out}
    ```
    
    Cancel the context when any stage errors or the pipeline is done — all stages unblock and exit
- **Lesson:** In a pipeline, every `send` on a channel must have a `ctx.Done()` case — downstream cancellation must propagate upstream; use a shared context for the entire pipeline

### 13.3 The Fan-Out That Missed Results

- **Situation:** Parallel search — fan-out to 5 search indexes, collect first result
- **Problem:** Occasionally the "first result" was returned but it was from a slower index — the fastest result was missed
- **Root cause:**
    
    ```go
    results := make(chan Result, 5)for _, index := range indexes {    go func(idx Index) {        results <- idx.Search(query) // all results go to same channel    }(index)}return <-results // read one result — but is it the FASTEST one?
    ```
    
    `<-results` reads from the channel — but Go does not guarantee FIFO ordering when multiple goroutines send simultaneously — the first goroutine to schedule may not be the fastest searcher — the result returned is non-deterministic
- **Solution:** Use a select with per-goroutine channels:
    
    ```go
    type indexedResult struct{ idx int; result Result; latency time.Duration }results := make(chan indexedResult, len(indexes))for i, index := range indexes {    go func(i int, idx Index) {        start := time.Now()        r := idx.Search(query)        results <- indexedResult{i, r, time.Since(start)}    }(i, index)}first := <-results // first one to arrive is the fastest
    ```
    
    Or use `context` to cancel the remaining goroutines once the first result arrives
- **Lesson:** A shared result channel with multiple senders does not guarantee the fastest result is delivered first — the Go scheduler determines order; for true "first wins" semantics, use `select` across per-goroutine channels

### 13.4 The Timer That Was Never Stopped

- **Situation:** Retry logic — using `time.NewTimer` for exponential backoff
- **Problem:** Memory leak — each failed request left a timer goroutine running — under high error rates, hundreds of timer goroutines accumulated
- **Root cause:**
    
    ```go
    func retryWithBackoff(fn func() error) error {    for i := 0; i < 3; i++ {        err := fn()        if err == nil { return nil }        timer := time.NewTimer(time.Duration(i+1) * time.Second)        <-timer.C // wait for the timer        // timer.Stop() never called — even though timer already fired,        // the timer's internal goroutine is not cleaned up without Stop()    }    return errors.New("max retries exceeded")}
    ```
    
    `time.NewTimer` allocates a timer and an internal goroutine — after `<-timer.C` reads the value, the goroutine is done but the timer object is not GC'd until explicitly stopped or the channel is drained again — in high-retry scenarios, this causes goroutine and memory accumulation
- **Solution:**
    
    ```go
    timer := time.NewTimer(backoffDuration)defer timer.Stop() // always stop the timerselect {case <-timer.C:    // timer fired — proceed with retrycase <-ctx.Done():    timer.Stop()    return ctx.Err()}
    ```
    
    Or use `time.After()` for simple cases — but note it creates a timer that cannot be stopped (leaks until it fires)
- **Lesson:** Always call `timer.Stop()` after using a `time.NewTimer` — the timer's resources are not freed until stopped; `time.After()` cannot be stopped and leaks until it fires — never use it inside a select with a long-running context

---

## Part 14 — Build, Deployment, and Configuration Failure Cases

### 14.1 The init() That Caused Non-Deterministic Startup Order

- **Situation:** Go service with multiple packages each using `init()` for initialization
- **Problem:** Service behavior differed between runs — sometimes it worked, sometimes it panicked on startup — non-deterministic
- **Root cause:**
    
    ```go
    // package database/init.go:var DB *sql.DBfunc init() { DB = mustConnect(os.Getenv("DB_URL")) }// package cache/init.go:var Cache *redis.Clientfunc init() { Cache = mustConnect(os.Getenv("REDIS_URL")) }// package service/init.go:var Svc = NewService(database.DB, cache.Cache) // assumes DB and Cache are initialized
    ```
    
    `init()` order within a package is defined by file order — but across packages, order depends on import order which can vary — `service.init()` ran before `database.init()` on some builds — `database.DB` was nil when `NewService` was called
- **Solution:** Avoid `init()` for anything that depends on other package initialization — use explicit initialization in `main()`:
    
    ```go
    func main() {    db := database.Connect(os.Getenv("DB_URL"))    cache := cache.Connect(os.Getenv("REDIS_URL"))    svc := service.New(db, cache) // explicit dependency order    // ...}
    ```
    
    Reserve `init()` for truly package-local, dependency-free initialization (registering codecs, setting defaults)
- **Lesson:** `init()` across packages has non-deterministic ordering relative to each other — never rely on cross-package init ordering; use explicit initialization in `main()` with dependency injection

### 14.2 The Build Tag That Was Silently Ignored

- **Situation:** Integration tests — guarded by a build tag to avoid running in unit test CI
- **Problem:** Integration tests were running in the unit test CI pipeline despite the build tag — external service calls failing and breaking the CI pipeline
- **Root cause:**
    
    ```go
    // integration_test.go// +build integration   // OLD syntax — space before +build required// (blank line required between +build and package declaration)package service_test
    ```
    
    Missing blank line between the `// +build` comment and `package` declaration — Go silently ignored the build tag — the file was always compiled
- **Solution:** Use the new `//go:build` syntax (Go 1.17+) which is more explicit:
    
    ```go
    //go:build integrationpackage service_test
    ```
    
    Run `go build -v ./...` and `go vet ./...` to catch invalid build tags; use `gotestsum` which enforces tag correctness
- **Result:** Integration tests only run when `-tags integration` is passed — unit CI unaffected
- **Lesson:** Build tag syntax is fragile with the old `// +build` format — use `//go:build` syntax in Go 1.17+ which has no formatting requirements; always verify tags work with `go list -tags integration ./...`

### 14.3 The GOMEMLIMIT That Was Set Too Low

- **Situation:** Go service deployed in Kubernetes — container memory limit 512MB
- **Problem:** Service was being OOM-killed by Kubernetes randomly — Go runtime's `GOGC` was not preventing the heap from exceeding the container limit
- **Root cause:** `GOGC=100` (default) means GC runs when heap size doubles — if the live heap is 300MB, GC won't run until total heap reaches 600MB — exceeding the 512MB container limit — Kubernetes kills the container
- **Solution (Go 1.19+):** Set `GOMEMLIMIT`:
    
    ```go
    // In environment or code:// GOMEMLIMIT=480MiB (leave 32MB headroom below the 512MB limit)import "runtime/debug"func main() {    debug.SetMemoryLimit(480 * 1024 * 1024) // 480MB}
    ```
    
    `GOMEMLIMIT` tells the Go GC to run more aggressively as memory approaches the limit — the GC will sacrifice CPU to prevent OOM rather than waiting for the heap to double
- **Result:** Zero OOM kills — GC runs more frequently near the memory limit but prevents container death
- **Lesson:** In containerized environments, always set `GOMEMLIMIT` to ~90% of the container memory limit — `GOGC` alone is not sufficient to prevent OOM in memory-constrained environments

### 14.4 The Environment Variable Read Outside of main()

- **Situation:** Configuration package — reading env vars at package initialization
- **Problem:** Unit tests that set environment variables programmatically sometimes had their values overridden by `init()` reading the env before the test setup ran
- **Root cause:**
    
    ```go
    // config/config.govar Port = os.Getenv("PORT") // read at package init time
    ```
    
    Package-level `var` initialization runs when the package is first imported — before test `TestMain` or individual test setup — any `os.Setenv("PORT", "9090")` in a test ran after the package variable was already set to the old value
- **Solution:** Read configuration lazily (on first use) or in a function called from `main()`:
    
    ```go
    func GetPort() string {    
       return os.Getenv("PORT") 
       // read on every call — tests can override before calling
       }
    ```
    
    Or use a configuration struct initialized from main: `cfg := config.Load()` — tests call `Load()` after setting env vars
- **Result:** Tests can control environment configuration — no more initialization-order-dependent test failures
- **Lesson:** Reading env vars at package scope (`var x = os.Getenv(...)`) runs before tests can set up their environment — read configuration in functions or constructors, not in package-level var initialization

### 14.5 The CGO Dependency That Broke Cross-Compilation

- **Situation:** Go service that needed to cross-compile for Linux from a Mac
- **Problem:** `go build` produced a binary that crashed on the target Linux server with `exec format error` or linked against the wrong libc version
- **Root cause:** The service indirectly imported a package that used CGO (`github.com/mattn/go-sqlite3`) — CGO requires a C compiler and links against the host system's libc — cross-compiling CGO is complex and requires a cross-compiler toolchain — the resulting binary had incorrect library dependencies
- **Solution:**
    
    ```go
    // Option 1: Build inside a Docker container matching the target environment//
     docker run --rm -v $(pwd):/app golang:1.22 go build -o /app/service .
     // Option 2: Use CGO_ENABLED=0 for pure Go builds:// 
     CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o service .
     // Option 3: Replace CGO dependency with pure Go alternative
     // go-sqlite3 (CGO) → modernc.org/sqlite (pure Go)
    ```
    
    Use `CGO_ENABLED=0` whenever possible — pure Go binaries are statically linked and run on any Linux regardless of libc version
- **Result:** Zero binary compatibility issues — pure Go binaries run on any target architecture
- **Lesson:** CGO breaks cross-compilation and static linking — avoid CGO dependencies when possible; prefer pure Go alternatives; use `CGO_ENABLED=0` by default and opt into CGO only when necessary

---

## Part 15 — Middleware and Handler Failure Cases

### 15.1 The Middleware That Modified the Request After Handler Ran

- **Situation:** Logging middleware — logging request details after the handler completed
- **Problem:** Request body was empty in the logs — `Body: ""`
- **Root cause:**
    
    ```go
    func loggingMiddleware(next http.Handler) http.Handler {    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {        next.ServeHTTP(w, r) // handler runs FIRST — reads and closes body        
    body, _ := io.ReadAll(r.Body) // body already consumed — reads nothing 
           log.Info("request", "body", string(body))    
    })}
    ```
    
    `http.Request.Body` is a `ReadCloser` — once read, it is exhausted — reading it after the handler has already read it returns empty
- **Solution:** Read and buffer the body before passing to the handler:
    
    ```go
    func loggingMiddleware(next http.Handler) http.Handler {   
     return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { 
            body, _ := io.ReadAll(r.Body)        
            r.Body.Close()        r.Body = io.NopCloser(bytes.NewReader(body)) 
            // restore for handler        
            log.Info("request", "body", string(body))        
            next.ServeHTTP(w, r)    
            })
        }
    ```
    
    Note: buffering the body in middleware loads it into memory — for large bodies, log only size/metadata, not the full body
- **Lesson:** `http.Request.Body` is a stream — it can be read only once; middleware that needs the body must buffer it and restore it before passing to the next handler

### 15.2 The Response Writer Wrapped Without Capturing Status Code

- **Situation:** Metrics middleware — recording HTTP status codes for Prometheus
- **Problem:** All requests were logged as status 200 — error responses not tracked
- **Root cause:**
    
    ```go
    func metricsMiddleware(next http.Handler) http.Handler {    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            next.ServeHTTP(w, r)        
    // w.StatusCode doesn't exist — http.ResponseWriter has no StatusCode field      
            metrics.RecordRequest(r.URL.Path, 200) // hardcoded 200   
        }
        )
    }
    ```
    
    `http.ResponseWriter` does not expose the status code after writing — you must wrap it to capture it
- **Solution:** Wrap `ResponseWriter` to capture the status code:
    
    ```go
    type statusRecorder struct {    
    http.ResponseWriter    
    statusCode int
    }
    func (r *statusRecorder) WriteHeader(code int) {    
    r.statusCode = code    
    r.ResponseWriter.WriteHeader(code)}
    func metricsMiddleware(next http.Handler) http.Handler {    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {                  rec := &statusRecorder{ResponseWriter: w, statusCode: 200
    }       
     next.ServeHTTP(rec, r)        
     metrics.RecordRequest(r.URL.Path, rec.statusCode)    
     })}
    ```
    
- **Result:** Accurate status code metrics — error rates visible in Prometheus
- **Lesson:** `http.ResponseWriter` is write-only — wrap it with a recorder struct that captures the status code; the default captured code should be 200 because handlers that don't call `WriteHeader` implicitly use 200

### 15.3 The Panic Recovery Middleware That Hid All Stack Traces

- **Situation:** HTTP service with panic recovery middleware
- **Problem:** When the service panicked, operations got a generic "500 Internal Server Error" with no diagnostic information — panics were happening but root cause was unknown — debugging took days per incident
- **Root cause:**
    
    ```go
    func recoveryMiddleware(next http.Handler) http.Handler {    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {        defer func() {            if err := recover(); err != nil {                http.Error(w, "Internal Server Error", 500)                // panic recovered but NOT logged — stack trace lost forever            }        }()        next.ServeHTTP(w, r)    })}
    ```
    
    `recover()` was called but the panic value and stack trace were not logged
- **Solution:**
    
    ```go
    defer func() {    if err := recover(); err != nil {        // Log panic with full stack trace        log.Error("panic recovered",            "error", err,            "stack", string(debug.Stack()),            "path", r.URL.Path,            "method", r.Method,        )        http.Error(w, "Internal Server Error", 500)    }}()
    ```
    
- **Result:** Every recovered panic logged with full stack trace — root cause identified within minutes instead of days
- **Lesson:** A panic recovery without logging the panic value and `debug.Stack()` is worse than useless — it hides bugs; always log the full stack trace before returning a 500 response

### 15.4 The Timeout Middleware That Did Not Cancel Processing

- **Situation:** Go HTTP service with a request timeout middleware
- **Problem:** Timeout middleware returned a 503 to the client after 5 seconds — but the handler continued running for another 25 seconds — DB connections and goroutines were not freed
- **Root cause:**
    
    ```go
    func timeoutMiddleware(next http.Handler) http.Handler {    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {        done := make(chan struct{})        go func() {            next.ServeHTTP(w, r)            close(done)        }()        select {        case <-done:        case <-time.After(5 * time.Second):            http.Error(w, "timeout", 503)            // handler goroutine is still running — cannot be stopped        }    })}
    ```
    
    Sending a response to the client does not stop the handler goroutine — the goroutine runs to completion regardless — resources held until it finishes
- **Solution:** Use `http.TimeoutHandler` (built-in) which uses context cancellation:
    
    ```go
    mux := http.NewServeMux()// Wrap with built-in timeout handler:handler := http.TimeoutHandler(mux, 5*time.Second, "timeout")
    ```
    
    Or pass a deadline context to the handler and check `ctx.Done()` in all blocking operations:
    
    ```go
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)defer cancel()r = r.WithContext(ctx)next.ServeHTTP(w, r)
    ```
    
- **Lesson:** A timeout that only affects the response but not the processing is half a timeout — use `context.WithTimeout` so all downstream DB calls, HTTP calls, and goroutines respect the cancellation

---

## Part 16 — WebSocket and Streaming Failure Cases

### 16.1 The WebSocket That Was Never Closed Properly

- **Situation:** Real-time notification service using WebSocket — Go server with `gorilla/websocket`
- **Problem:** Server goroutine count grew by 2 per connection (read goroutine + write goroutine) — connections that were broken from the client side (tab closed, network drop) left goroutines running indefinitely — after 48 hours, 50,000 zombie goroutines consumed 2.5GB of memory
- **Root cause:**
    
    ```go
    func handleWS(conn *websocket.Conn) {    go readPump(conn)  // goroutine to read messages    go writePump(conn) // goroutine to write messages    // Neither goroutine has a way to detect the other has stopped    // If the client closes the connection:    // readPump gets an error and returns — but writePump keeps running}
    ```
    
    No coordination between read and write goroutines — one stopping does not stop the other
- **Solution:** Use a shared done channel or context:
    
    ```go
    func handleWS(conn *websocket.Conn, send <-chan Message) {    ctx, cancel := context.WithCancel(context.Background())    defer cancel() // cancels both goroutines on function return        go func() {        defer cancel()        for {            if _, _, err := conn.ReadMessage(); err != nil {                return // read error (client disconnect) → cancel context            }        }    }()        // Set ping/pong handlers for liveness    conn.SetPongHandler(func(string) error {        conn.SetReadDeadline(time.Now().Add(60 * time.Second))        return nil    })        ticker := time.NewTicker(30 * time.Second)    defer ticker.Stop()        for {        select {        case msg := <-send:            conn.WriteJSON(msg)        case <-ticker.C:            conn.WriteMessage(websocket.PingMessage, nil) // liveness check        case <-ctx.Done():            conn.WriteMessage(websocket.CloseMessage,                websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))            return        }    }}
    ```
    
- **Result:** When a client disconnects, the read goroutine errors → cancels context → write goroutine exits → both goroutines cleaned up within seconds
- **Lesson:** WebSocket connections need: (1) ping/pong for liveness detection; (2) read deadline reset on pong; (3) shared context so read and write goroutines exit together; always set read and write deadlines

### 16.2 The WebSocket Hub That Blocked on Slow Clients

- **Situation:** Chat service — broadcast hub sending messages to all connected clients
- **Problem:** One slow client (mobile on 2G) caused all other clients to wait — message delivery to fast clients delayed by seconds
- **Root cause:**
    
    ```go
    type Hub struct {    clients map[*Client]bool    broadcast chan Message}func (h *Hub) run() {    for msg := range h.broadcast {        for client := range h.clients {            client.send <- msg // BLOCKS if client's buffer is full        }    }}
    ```
    
    The hub iterates all clients and sends to each — if one client's `send` channel buffer is full (slow client), the send blocks — all other clients wait
- **Solution:** Non-blocking send with slow client detection and disconnection:
    
    ```go
    func (h *Hub) run() {    for msg := range h.broadcast {        for client := range h.clients {            select {            case client.send <- msg: // non-blocking attempt            default:                // Client's buffer is full — it's too slow                close(client.send)                delete(h.clients, client) // remove slow client            }        }    }}
    ```
    
- **Result:** Slow clients are disconnected — fast clients receive messages without delay
- **Lesson:** In a broadcast hub, never do a blocking send to individual clients — use a non-blocking `select` with a `default` case that disconnects slow clients rather than penalizing fast ones

### 16.3 The SSE Handler That Leaked on Client Disconnect

- **Situation:** Server-Sent Events (SSE) endpoint for real-time dashboard updates
- **Problem:** Every client that closed their browser tab left a goroutine running on the server — after 1,000 disconnected clients, 1,000 goroutines were stuck writing to closed connections
- **Root cause:**
    
    ```go
    func sseHandler(w http.ResponseWriter, r *http.Request) {    flusher := w.(http.Flusher)    for {        event := <-events        fmt.Fprintf(w, "data: %s\n\n", event)        flusher.Flush() // blocks/errors if client disconnected but code doesn't check    }}
    ```
    
    `fmt.Fprintf` to a disconnected client returns an error — but the error is ignored — the goroutine loops forever
- **Solution:** Use `r.Context()` — it is cancelled when the client disconnects:
    
    ```go
    func sseHandler(w http.ResponseWriter, r *http.Request) {    flusher := w.(http.Flusher)    w.Header().Set("Content-Type", "text/event-stream")    w.Header().Set("Cache-Control", "no-cache")    for {        select {        case event := <-events:            fmt.Fprintf(w, "data: %s\n\n", event)            flusher.Flush()        case <-r.Context().Done():            return // client disconnected — goroutine exits cleanly        }    }}
    ```
    
- **Lesson:** `r.Context()` is cancelled when the HTTP client disconnects — always use it in streaming handlers to detect disconnection; without it, streaming goroutines run forever after the client is gone

---

## Part 17 — Scheduler and Runtime Failure Cases

### 17.1 The Goroutine That Starved the Scheduler

- **Situation:** CPU-intensive Go service — image processing
- **Problem:** Under load, some goroutines did not progress for minutes — P99 latency grew from 50ms to 8 seconds — service appeared frozen for some requests
- **Root cause:**
    
    ```go
    func processImage(data []byte) []byte {    for i := range data {        data[i] = expensiveTransform(data[i]) // CPU-bound loop — never yields    }    return data}
    ```
    
    A tight CPU-bound loop without any blocking calls never yields to the Go scheduler — Go's cooperative scheduler relies on goroutines yielding at function calls, channel operations, or `runtime.Gosched()` — a tight loop with no blocking points starves other goroutines on the same OS thread
- **Solution:** Insert explicit scheduler yield points in long CPU-bound loops:
    
    ```go
    for i := range data {    if i%1000 == 0 {        runtime.Gosched() // yield to the scheduler periodically    }    data[i] = expensiveTransform(data[i])}
    ```
    
    Or: use `GOMAXPROCS = runtime.NumCPU()` (default) so other goroutines run on other OS threads; for truly CPU-bound work, use a worker pool with controlled concurrency
- **Result:** Scheduler starvation eliminated — all goroutines make progress
- **Lesson:** Go's scheduler is cooperative for CPU-bound work — a tight loop without blocking operations can starve other goroutines; insert `runtime.Gosched()` in CPU-bound loops or ensure `GOMAXPROCS` matches CPU count

### 17.2 The LockOSThread That Leaked an OS Thread

- **Situation:** CGO-heavy service — calling a C library that required thread-local state
- **Problem:** After 24 hours, the service had 10,000 OS threads — OS was struggling to schedule them — memory usage from thread stacks was high
- **Root cause:**
    
    ```go
    func callCLibrary() {    runtime.LockOSThread() // locks this goroutine to the current OS thread    defer cLib.Cleanup() // but NOT runtime.UnlockOSThread()    cLib.Initialize()    result := cLib.Process()    // goroutine returns — but the OS thread is permanently locked to this goroutine    // a NEW OS thread is created for every new goroutine after this}
    ```
    
    `runtime.LockOSThread()` without `runtime.UnlockOSThread()` — when the goroutine exits, the OS thread is retired — but Go creates a new OS thread for every subsequent goroutine — one `LockOSThread` without unlock → one permanently consumed OS thread
- **Solution:**
    
    ```go
    func callCLibrary() {    runtime.LockOSThread()    defer runtime.UnlockOSThread() // MUST pair with Lock    cLib.Initialize()    defer cLib.Cleanup()    // ...}
    ```
    
    Every `LockOSThread` must be paired with `UnlockOSThread` before the goroutine exits
- **Lesson:** `runtime.LockOSThread()` without `UnlockOSThread()` permanently consumes an OS thread — always defer `UnlockOSThread()` immediately after `LockOSThread()`

### 17.3 The GOMAXPROCS That Was Set to 1 in a Container

- **Situation:** Go microservice deployed in Kubernetes — container resource request: 100m CPU (0.1 CPU cores)
- **Problem:** Service was extremely slow — 10× slower than on developer laptops — goroutines were not running in parallel despite available logic suggesting they should
- **Root cause:** Kubernetes CPU limits are enforced via cgroups — older Go versions (pre-1.5) and some container environments reported only 1 CPU to the Go runtime — `GOMAXPROCS=1` — all goroutines ran on a single OS thread — no parallelism even on a multi-core node
- **Solution:** Use `go.uber.org/automaxprocs` — automatically sets `GOMAXPROCS` correctly from the container's cgroup CPU quota:
    
    ```go
    import _ "go.uber.org/automaxprocs" // sets GOMAXPROCS on init from cgroup quota
    ```
    
    Or explicitly: `runtime.GOMAXPROCS(runtime.NumCPU())` — but `automaxprocs` is more accurate in containers
- **Result:** `GOMAXPROCS` correctly set to the container's CPU allocation — parallelism restored — throughput matched expectations
- **Lesson:** In Kubernetes, CPU requests/limits affect what `GOMAXPROCS` the Go runtime sees — use `automaxprocs` to correctly configure parallelism from the cgroup quota rather than the node's physical CPU count

---

## Part 18 — Advanced Concurrency Patterns That Failed

### 18.1 The sync.Map Used Where a Regular Map Was Better

- **Situation:** Configuration store — many goroutines reading, rare writes
- **Problem:** After migrating from `sync.RWMutex` + `map` to `sync.Map` (thinking it was always better for concurrent maps), read performance degraded 40%
- **Root cause:** `sync.Map` is optimized for specific access patterns:
    - Many goroutines reading the same keys (the "read-mostly" case)
    - Disjoint key sets per goroutine (each goroutine writes to its own keys) For the configuration store, all goroutines read the same small set of keys — `sync.Map` uses a double-map (read-map + dirty-map) with pointer indirection — more expensive than a simple `RWMutex + map[string]interface{}` for this access pattern
- **Benchmark:**
    
    ```
    BenchmarkRWMutexRead-8    200ns/opBenchmarkSyncMapRead-8    320ns/op (60% slower for this pattern)
    ```
    
- **Solution:** Revert to `sync.RWMutex + map` for read-heavy, few-key workloads; use `sync.Map` for: per-goroutine key isolation, append-only patterns, or when avoiding lock contention across many disjoint keys
- **Lesson:** `sync.Map` is not a drop-in replacement for `RWMutex + map` — benchmark your specific access pattern; for read-heavy workloads with a shared key set, `RWMutex + map` is typically faster

### 18.2 The errgroup That Hid the First Error

- **Situation:** Parallel data fetching — using `errgroup` to fetch from 5 sources simultaneously
- **Problem:** When two sources failed simultaneously, only one error was returned — the other was silently lost — debugging partial failures was impossible
- **Root cause:**
    
    ```go
    g, ctx := errgroup.WithContext(context.Background())for _, src := range sources {    src := src    g.Go(func() error {        return src.Fetch(ctx)    })}err := g.Wait() // returns ONLY the first non-nil error — others discarded
    ```
    
    `errgroup.Wait()` returns only the first error — subsequent errors from other goroutines are lost — useful for "stop on first error" but not for "collect all errors"
- **Solution:** For collecting all errors, use a custom error aggregator:
    
    ```go
    var mu sync.Mutexvar errs []errorvar wg sync.WaitGroupfor _, src := range sources {    src := src    wg.Add(1)    go func() {        defer wg.Done()        if err := src.Fetch(ctx); err != nil {            mu.Lock()            errs = append(errs, fmt.Errorf("source %s: %w", src.Name, err))            mu.Unlock()        }    }()}wg.Wait()return errors.Join(errs...) // Go 1.20+ joins multiple errors
    ```
    
- **Lesson:** `errgroup` is "cancel on first error" semantics — it is not "collect all errors"; for collecting multiple errors, use a mutex-protected error slice and `errors.Join()` (Go 1.20+)

### 18.3 The Channel Direction That Allowed a Read-Only Channel to Be Closed

- **Situation:** Data pipeline — producer sends on a channel, consumer reads
- **Problem:** Occasionally the consumer goroutine closed the channel it was supposed to only read from — causing a panic in the producer when it tried to send
- **Root cause:**
    
    ```go
    func startPipeline() {    ch := make(chan int, 100)    go producer(ch) // passes bidirectional channel    go consumer(ch) // passes bidirectional channel — can send OR close}func consumer(ch chan int) { // bidirectional — can close    close(ch) // BUG: consumer should never close what producer sends on}
    ```
    
    Both goroutines received bidirectional channels — no compile-time enforcement of who can send/receive/close
- **Solution:** Use directional channel types to enforce roles:
    
    ```go
    func producer(ch chan<- int) { // send-only — cannot close or receive    ch <- 42}func consumer(ch <-chan int) { // receive-only — cannot send or close    val := <-ch}func startPipeline() {    ch := make(chan int, 100)    go producer(ch)  // chan int implicitly converts to chan<- int    go consumer(ch)  // chan int implicitly converts to <-chan int}
    ```
    
    The producer closes the channel when done (it owns the channel) — the consumer cannot close it (compile error)
- **Lesson:** Use directional channel types (`chan<-` and `<-chan`) to enforce ownership at compile time — the type system prevents consumers from accidentally closing channels they don't own

---

## Part 19 — Go Microservice Architecture Case Studies

### 19.1 The Service That Shared a Database With Another Service

- **Situation:** Two Go microservices (`order-service` and `inventory-service`) both connecting to the same PostgreSQL database
- **Problem:** A schema migration by the order-service team broke the inventory-service — adding a NOT NULL column to `products` caused inventory-service queries to fail — two teams blocked each other constantly
- **Root cause:** Shared database between services — tight coupling at the data layer — one team's schema change becomes another team's outage
- **Solution:** Database per service — `order-service` owns `orders_db`, `inventory-service` owns `inventory_db` — cross-service data needs handled by:
    - Synchronous: gRPC call (order-service calls inventory-service's gRPC API)
    - Asynchronous: Kafka events (inventory-service publishes stock changes, order-service consumes)
    - Eventual: each service maintains its own read model of the other's data via event sync
- **Result:** Teams deploy independently — no cross-service schema dependencies — outage isolation
- **Lesson:** A database shared between microservices is a microservices anti-pattern — it creates the tightest possible coupling; database per service is a hard rule, not a recommendation

### 19.2 The Service Mesh That Made Debugging Impossible

- **Situation:** Go microservices with Istio service mesh — mTLS, retry, and circuit breaking in the mesh
- **Problem:** A service was returning 503s — investigation showed the upstream service was healthy — requests were succeeding at the upstream — but something in the mesh was retrying and triggering rate limiting — logs showed no errors at the Go service level
- **Root cause:** Istio was automatically retrying 503s — the upstream service returned one 503 (briefly overloaded) — Istio retried — the retry also got a 503 (from the retry itself being retried) — Istio's retry storm hit the upstream's rate limiter — all subsequent requests got 429 from the rate limiter — Istio interpreted 429 as retryable and retried again — infinite retry storm — none of this visible in the Go service's own logs because it happened in the mesh sidecar
- **Solution:** Disable mesh-level retries for most services — implement retries explicitly in the Go client with proper backoff:
    
    ```go
    // In Go code — explicit, visible, debuggable:for attempt := 0; attempt < 3; attempt++ {    resp, err := client.Call(ctx, req)    if err == nil { return resp, nil }    if !isRetryable(err) { return nil, err }    time.Sleep(backoff(attempt))}
    ```
    
    Application-level retries are logged, traced, and testable — mesh-level retries are invisible
- **Lesson:** Service mesh automatic retries can amplify failures instead of handling them — application-level retries with explicit backoff and circuit breaking are more debuggable; don't let the mesh make retry decisions the application doesn't know about

### 19.3 The Distributed Tracing That Was Not Propagated

- **Situation:** Go microservices with OpenTelemetry distributed tracing
- **Problem:** Traces were incomplete — a request visible in service A's trace disappeared — not visible in service B's trace — could not correlate cross-service latency
- **Root cause:**
    
    ```go
    // service A — creates a span and stores it in context:ctx, span := tracer.Start(ctx, "call-service-b")defer span.End()// calls service B via HTTP:req, _ := http.NewRequestWithContext(ctx, "GET", serviceBURL, nil)client.Do(req) // context has span — but trace headers NOT injected into HTTP request
    ```
    
    The trace context was in the Go `context.Context` but was not propagated into the HTTP request headers — service B received a request with no trace headers — it started a new root span — the two traces were unlinked
- **Solution:** Use OpenTelemetry's HTTP propagator to inject trace headers:
    
    ```go
    import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"// Option 1: Use otelhttp transport (auto-propagates):client := &http.Client{    Transport: otelhttp.NewTransport(http.DefaultTransport),}// Option 2: Manually inject:otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
    ```
    
- **Result:** Full distributed traces across all services — cross-service latency visible — bottlenecks identifiable
- **Lesson:** Distributed tracing requires explicit propagation of trace context in every cross-service call (HTTP headers, gRPC metadata, Kafka message headers) — the `context.Context` does not automatically propagate across network boundaries

---

## Master Summary Table — Volume 2

|#|Case|Category|Key Lesson|
|---|---|---|---|
|11.1|defer f.Close() swallowed disk-full error|Error Handling|Capture close error in named return or closure|
|11.2|Sentinel error broke with wrapping|Error Handling|errors.Is() not == for error comparison|
|11.3|Error string used as logic broke on SDK update|Error Handling|errors.As() with typed errors — never string comparison|
|11.4|panic() for config error crashed all services|Error Handling|panic for programmer errors only; return error for everything else|
|11.5|Error wrapped so many times it lost meaning|Error Handling|Wrap at meaningful boundaries; use structured logging|
|11.6|Error returned after response partially written|Error Handling|Never write to ResponseWriter before all errors are checked|
|12.1|Interface with 22 methods killed testability|Interface Design|Small, role-based interfaces defined at point of use|
|12.2|Mock provider used in production|Interface Design|Guard against mock implementations in production|
|12.3|Typed nil returned as error interface|Interface Design|Return nil directly — never return typed nil as interface|
|12.4|String() caused infinite recursion|Interface Design|Never use %v on receiver in its own String() method|
|13.1|Wrong buffer size for semaphore channel|Channels|buffer size = concurrency limit for semaphore pattern|
|13.2|Pipeline leaked goroutines on cancellation|Channels|Every pipeline send must have ctx.Done() case|
|13.3|Fan-out did not return fastest result|Channels|Per-goroutine channels for true "first wins" semantics|
|13.4|Timer never stopped leaked goroutines|Channels|Always defer timer.Stop(); never use time.After in long-lived select|
|14.1|init() order non-deterministic|Build/Deploy|Avoid cross-package init() dependencies; use explicit main() init|
|14.2|Build tag silently ignored|Build/Deploy|Use //go:build syntax (Go 1.17+)|
|14.3|GOMEMLIMIT not set caused OOM kills|Build/Deploy|Set GOMEMLIMIT to 90% of container memory limit|
|14.4|Env vars read at package init time|Build/Deploy|Read config in functions, not package-level var init|
|14.5|CGO broke cross-compilation|Build/Deploy|CGO_ENABLED=0 for portable binaries; pure Go alternatives|
|15.1|Body consumed before middleware read it|Middleware|Buffer and restore body in middleware that needs it|
|15.2|Status code not captured from ResponseWriter|Middleware|Wrap ResponseWriter with statusRecorder struct|
|15.3|Panic recovery hid all stack traces|Middleware|Log panic value + debug.Stack() before returning 500|
|15.4|Timeout returned 503 but handler kept running|Middleware|Use context.WithTimeout to propagate cancellation|
|16.1|WebSocket goroutines leaked on disconnect|WebSocket|Shared context; ping/pong with read deadline reset|
|16.2|Slow WebSocket client blocked all others|WebSocket|Non-blocking send with default case; disconnect slow clients|
|16.3|SSE handler leaked on client disconnect|WebSocket|r.Context().Done() detects client disconnect in streaming|
|17.1|CPU-bound loop starved scheduler|Runtime|runtime.Gosched() in tight loops; GOMAXPROCS = NumCPU|
|17.2|LockOSThread without Unlock leaked threads|Runtime|Always defer UnlockOSThread after LockOSThread|
|17.3|GOMAXPROCS=1 in container|Runtime|automaxprocs sets correct parallelism from cgroup quota|
|18.1|sync.Map slower than RWMutex for shared keys|Concurrency|Benchmark before switching; sync.Map for disjoint keys|
|18.2|errgroup hid all but the first error|Concurrency|errgroup is "stop on first"; errors.Join for collecting all|
|18.3|Consumer closed read-only channel|Concurrency|Directional channels enforce ownership at compile time|
|19.1|Shared DB between services caused coupling|Architecture|Database per service is mandatory, not optional|
|19.2|Service mesh retries created retry storm|Architecture|Explicit app-level retries beat invisible mesh-level retries|
|19.3|Trace context not propagated across services|Architecture|Inject trace headers explicitly in every outbound call|

---

_Volume 1: 46 cases. Volume 2: 36 cases. Combined: 82 Go case studies._

_The ten commandments of Go production code:_ _1. Every blocking goroutine needs a timeout or cancellable context_ _2. Always run go test -race in CI — data races are silent production bombs_ _3. Never create goroutines proportional to input size — always use a worker pool_ _4. defer is function-scoped — never defer resource cleanup inside a loop_ _5. return nil directly for no-error — never return a typed nil as an error interface_ _6. errors.Is() and errors.As() — never == for error comparison_ _7. http.Client and grpc.ClientConn are created once and shared — never per request_ _8. Set GOMEMLIMIT and use automaxprocs in every containerized deployment_ _9. Every pipeline channel send needs a ctx.Done() case — downstream cancellation must propagate up_ _10. Database per service — a shared DB between microservices is a coupling time bomb_