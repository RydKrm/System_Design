# Go (Golang) Case Studies — Failure Cases, Performance Improvements & Real Architectures

> Every case follows the same structure: **Situation → Problem → Root Cause → Solution → Result → Lesson** Covering goroutine failures, memory leaks, concurrency bugs, performance improvements, real company architectures, and production war stories specific to Go systems.

---

## How to Study a Go Case

For every case, extract these six answers:

1. **What was the scale?** — Goroutines, RPS, memory usage, latency targets
2. **What broke or what needed improving?**
3. **What tool revealed the root cause?** — pprof, race detector, trace, go vet, metrics
4. **What was the single biggest lever?** — Goroutine design, memory allocation, sync primitive, GC tuning
5. **What was the before/after?** — Always quantify
6. **What would have prevented it?** — Code review, linting, load testing, profiling in CI

---

## Part 1 — Goroutine Failure Cases

### 1.1 The Goroutine Leak That Consumed All Memory

- **Situation:** REST API service — spawning a goroutine per request for background processing
- **Problem:** Service memory grew from 200MB to 8GB over 12 hours — OOM killed the process every morning
- **Root cause:** Each request launched `go processBackground(ctx)` — but `processBackground` called an external HTTP service — the external service occasionally hung — the goroutine waited forever — no timeout was set — goroutines accumulated: `go tool pprof` showed 180,000 goroutines all stuck on `http.Client.Do`
- **Symptoms:** Memory climbing linearly with time, goroutine count visible in `runtime.NumGoroutine()` climbing endlessly, OOM at ~180K goroutines (~50KB each = 9GB)
- **Solution:** Set timeout on the HTTP client: `client := &http.Client{Timeout: 5 * time.Second}` — goroutines now unblock within 5 seconds maximum; use `context.WithTimeout` passed to the goroutine — cancel the context if the parent request ends; add `defer cancel()` everywhere a context is created
- **Result:** Goroutine count stabilized under 500 — memory flat at 220MB — no more OOM
- **Lesson:** Every goroutine that calls a blocking operation (HTTP, DB, channel, syscall) must have a timeout or a cancellable context — a goroutine without a way to exit is a permanent memory leak

### 1.2 The Goroutine Explosion From Unbounded Fan-Out

- **Situation:** Data processing service — for each item in an input list, launch a goroutine to process it
- **Problem:** A request with 100,000 items launched 100,000 goroutines simultaneously — each goroutine made a database query — the DB connection pool was exhausted — all goroutines blocked waiting for a connection — memory spiked to 5GB — service crashed
- **Root cause:** `for _, item := range items { go process(item) }` — unbounded goroutine creation proportional to input size — no concurrency limit
- **Symptoms:** Memory spike on large requests, DB connection pool exhaustion (`too many clients`), goroutine count in pprof proportional to input size
- **Solution:** Worker pool pattern with bounded concurrency:
    
    ```go
    sem := make(chan struct{}, 50) // max 50 concurrent goroutinesfor _, item := range items {    sem <- struct{}{}    go func(i Item) {        defer func() { <-sem }()        process(i)    }(item)}// drain: wait for all to finishfor i := 0; i < cap(sem); i++ { sem <- struct{}{} }
    ```
    
    Or use `golang.org/x/sync/errgroup` with `SetLimit(50)`
- **Result:** Max 50 concurrent goroutines regardless of input size — DB connections bounded — memory flat
- **Lesson:** Never create goroutines proportional to input size without a concurrency limit — always use a semaphore, worker pool, or `errgroup.SetLimit()`

### 1.3 The Goroutine That Panicked and Took Down the Entire Service

- **Situation:** Go HTTP server — one endpoint triggered a nil pointer dereference
- **Problem:** A single request caused a panic — the entire service crashed — all other concurrent requests failed — 30-second downtime until the process restarted
- **Root cause:** `http.Server` does recover panics within individual handlers (Go's net/http does wrap handlers in a recover) — BUT the goroutine in this case was launched manually for background work from within the handler — the background goroutine panicked — manual goroutines do NOT have automatic panic recovery — the panic propagated to the runtime and killed the process
- **Symptoms:** Process crash with panic stack trace, all requests failed simultaneously, restart required
- **Solution:** Every goroutine that is not directly managed by `net/http` must have a `recover()`:
    
    ```go
    go func() {    defer func() {        if r := recover(); r != nil {            log.Error("panic in background goroutine", "error", r,                "stack", debug.Stack())        }    }()    doWork()}()
    ```
    
    Wrap in a helper: `safeGo(func() { doWork() })` that includes the recover
- **Result:** Background goroutine panics logged and recovered — service continues serving other requests
- **Lesson:** Only goroutines run by `net/http` have automatic panic recovery — every manually launched goroutine needs its own `defer recover()` or one process panic brings down the entire service

### 1.4 The Goroutine That Closed a Channel Twice

- **Situation:** Worker pipeline — coordinator goroutine closes the results channel when work is done
- **Problem:** Intermittent panics: `panic: close of closed channel` — happened 1–2 times per hour under load — caused process restart each time
- **Root cause:** Two code paths could both close the same channel — the "normal completion" path and the "timeout/cancel" path — under concurrent execution, both paths could execute close-to-simultaneously — the second `close()` panicked
- **Symptoms:** Random panics with `close of closed channel`, intermittent (race condition), stack trace pointing to two different close locations
- **Solution:** Use `sync.Once` to guarantee close happens exactly once:
    
    ```go
    var once sync.OncecloseOnce := func() { once.Do(func() { close(ch) }) }// Now call closeOnce() from both paths — safe
    ```
    
    Or use a dedicated "done" channel + `select` to signal completion without closing the results channel
- **Result:** Zero `close of closed channel` panics
- **Lesson:** In Go, a channel must be closed exactly once — when multiple goroutines might close the same channel, use `sync.Once`; the general rule: only the sender should close a channel, and only one sender should exist

### 1.5 The Select Statement That Always Chose the Same Case

- **Situation:** Rate limiter — reading from a tokens channel AND a deadline channel in a select
- **Problem:** The deadline was being ignored — requests kept processing even after the deadline passed — SLA violations
- **Root cause:**
    
    ```go
    select {case <-tokenBucket:    process() // this case was always readycase <-ctx.Done():    return ErrDeadlineExceeded}
    ```
    
    When `tokenBucket` is always ready (bucket never empty), Go's select pseudo-randomly picks among ready cases — but if `tokenBucket` fills up faster than it's consumed, it is always ready — statistically the `ctx.Done()` case was rarely selected even when the deadline had passed
- **Root cause (deeper):** Select picks uniformly among ready cases — if the token bucket channel is always full, the deadline case is selected with probability `1/(N ready cases)` — deadline missed in expectation
- **Solution:** Check context cancellation first with a non-blocking select:
    
    ```go
    select {case <-ctx.Done():    return ErrDeadlineExceededdefault:}select {case <-tokenBucket:    process()case <-ctx.Done():    return ErrDeadlineExceeded}
    ```
    
    The first non-blocking select checks if the context is already cancelled before attempting to acquire the token
- **Lesson:** Go's `select` does not prioritize cases — when deadline/cancellation must be checked, do a non-blocking check first before blocking on other channels

### 1.6 The WaitGroup That Caused a Deadlock

- **Situation:** Concurrent image processing — WaitGroup to wait for all goroutines
- **Problem:** Service hung completely on large batches — no output, no errors, 100% CPU, never finished
- **Root cause:**
    
    ```go
    var wg sync.WaitGroupfor _, img := range images {    wg.Add(1)    go func() { // BUG: closure captures loop variable        defer wg.Done()        process(img) // img is always the last image in the loop    }()}wg.Wait()
    ```
    
    Two bugs: (1) closure captured the loop variable `img` — all goroutines processed the last image — (2) one goroutine panicked on the last image (nil pointer) — panic not recovered — `wg.Done()` never called — `wg.Wait()` blocked forever
- **Solution:**
    
    ```go
    for _, img := range images {    img := img // shadow the variable — each goroutine gets its own copy    wg.Add(1)    go func() {        defer wg.Done() // always called, even on panic (defer runs before panic unwinds)        defer func() {            if r := recover(); r != nil { log.Error("panic", "err", r) }        }()        process(img)    }()}
    ```
    
- **Result:** All goroutines process their correct image — panics recovered — `wg.Done()` always called — no deadlock
- **Lesson:** Two rules: (1) always shadow loop variables when capturing in goroutines — `item := item`; (2) `defer wg.Done()` must be the first defer so it runs even on panic; use `recover()` in goroutines to prevent `Done()` from being skipped

---

## Part 2 — Memory and Allocation Failure Cases

### 2.1 The String Concatenation That Allocated 100MB Per Request

- **Situation:** Report generation service — building a large CSV report as a string
- **Problem:** Service was slow and memory-intensive — P99 latency 8 seconds for a 50,000-row report — memory usage 2GB
- **Root cause:**
    
    ```go
    var result stringfor _, row := range rows {    result += formatRow(row) // allocates a new string on every iteration}
    ```
    
    String concatenation in a loop creates a new string allocation on every `+=` — 50,000 iterations = 50,000 allocations — total allocated memory ≈ O(N²) due to copying the growing string each time — pprof showed 99% of allocations from `runtime.concatstrings`
- **Solution:** Use `strings.Builder`:
    
    ```go
    var sb strings.Buildersb.Grow(estimatedSize) // pre-allocate if size is knownfor _, row := range rows {    sb.WriteString(formatRow(row)) // zero extra allocation}result := sb.String()
    ```
    
    Or write directly to `http.ResponseWriter` using `csv.NewWriter(w)` — never build the whole string
- **Result:** Memory per request 100MB → 2MB, P99 latency 8,000ms → 200ms, GC pressure eliminated
- **Lesson:** Never concatenate strings in a loop with `+` — use `strings.Builder` with `Grow()` for known sizes; for HTTP responses, stream directly to the writer instead of building in memory

### 2.2 The JSON Unmarshal Into interface{} That Exhausted Memory

- **Situation:** API gateway — deserializing incoming JSON requests for logging
- **Problem:** Memory usage 3× higher than expected — GC running 40% of the time — service latency unpredictable
- **Root cause:**
    
    ```go
    var payload interface{}json.Unmarshal(body, &payload) // allocates map[string]interface{} for every object
    ```
    
    `json.Unmarshal` into `interface{}` allocates `map[string]interface{}` for JSON objects and `[]interface{}` for arrays — all values boxed as `interface{}` — every string, number, boolean stored as a heap allocation — for a 10KB JSON body this creates hundreds of small allocations — GC must trace and collect all of them
- **Solution:** Unmarshal into a concrete struct — zero interface boxing:
    
    ```go
    type Request struct {    UserID int    `json:"user_id"`    Action string `json:"action"`}var req Requestjson.Unmarshal(body, &req) // only allocates the struct itself
    ```
    
    For truly dynamic JSON: use `json.RawMessage` to defer parsing, or use `jsonparser` (zero-allocation JSON parsing by path)
- **Result:** Allocations per request reduced 90%, GC frequency 40% → 5%, P99 latency improved 60%
- **Lesson:** `json.Unmarshal` into `interface{}` is an allocation explosion — always unmarshal into concrete structs; if the schema is unknown, use `json.RawMessage` or a streaming parser

### 2.3 The Slice That Held a Reference to a Huge Array

- **Situation:** Log processing service — reading large log files and extracting specific lines
- **Problem:** Memory usage growing continuously despite log files being "processed and discarded" — pprof heap profile showed enormous allocations that should have been freed
- **Root cause:**
    
    ```go
    data, _ := os.ReadFile(logFile) // reads entire 500MB file into memorylines := bytes.Split(data, []byte("\n"))errorLines := [][]byte{}for _, line := range lines {    if bytes.Contains(line, []byte("ERROR")) {        errorLines = append(errorLines, line) // sub-slice of the 500MB data    }}// data and lines go out of scope but errorLines keeps the 500MB alive
    ```
    
    Each element of `errorLines` is a sub-slice of the original `data` byte slice — it holds a reference to the entire 500MB backing array — the GC cannot collect `data` as long as `errorLines` exists
- **Solution:** Copy the extracted data to break the reference:
    
    ```go
    errorLine := make([]byte, len(line))copy(errorLine, line) // independent copy — data can be GC'derrorLines = append(errorLines, errorLine)
    ```
    
    Or use `bufio.Scanner` to read line by line instead of loading the entire file
- **Result:** Memory usage per file 500MB → 2MB (only the extracted lines retained) — GC able to collect processed files
- **Lesson:** A sub-slice holds a reference to the entire backing array — `append(result, bigSlice[i:j]...)` keeps `bigSlice` alive until `result` is gone; always `copy()` when you want to retain a small portion of a large allocation

### 2.4 The Map That Was Never Cleaned Up

- **Situation:** In-memory cache in a Go service — map used to cache user sessions
- **Problem:** Memory grew without bound — service OOM'd after 72 hours of running
- **Root cause:**
    
    ```go
    var cache = map[string]*Session{}func getSession(id string) *Session {    if s, ok := cache[id]; ok { return s }    s := loadFromDB(id)    cache[id] = s // added forever, never removed    return s}
    ```
    
    Sessions were added to the map but never removed — the map grew to contain every session that had ever existed — millions of entries — no TTL, no eviction, no size limit
- **Symptoms:** Memory growing linearly with unique users, map size in pprof always climbing
- **Solution:** Use a TTL cache: `github.com/patrickmn/go-cache` or `github.com/dgraph-io/ristretto` — automatic TTL expiry and size-bounded eviction; or Redis for distributed session storage with `EXPIRE`; or add a background goroutine that periodically sweeps and deletes expired entries
- **Result:** Memory bounded by cache size limit (set to 100MB) — LRU eviction when full
- **Lesson:** An in-memory map used as a cache must have explicit eviction — TTL, LRU, or size bounds; a map without eviction is a memory leak proportional to the number of unique keys ever inserted

### 2.5 The Defer in a Loop That Held Resources Too Long

- **Situation:** File processing service — opening and processing 10,000 files
- **Problem:** Service crashed with `too many open files` — OS file descriptor limit reached
- **Root cause:**
    
    ```go
    for _, path := range filePaths {    f, _ := os.Open(path)    defer f.Close() // defer runs when the FUNCTION returns, not when the loop iteration ends    process(f)}// All 10,000 files remain open until the outer function returns
    ```
    
    `defer` executes when the enclosing function returns — in a loop, all deferred calls accumulate — 10,000 `defer f.Close()` calls stack up — all 10,000 files are open simultaneously
- **Solution:** Use a closure to scope the defer:
    
    ```go
    for _, path := range filePaths {    
        func() {        
          f, _ := os.Open(path)        
          defer f.Close() // now defers within the closure scope        
          process(f)    
        }() // immediately invoked — file closes after each iteration}
    ```
    
    Or call `f.Close()` explicitly (checking the error) instead of using defer in the loop
- **Result:** Maximum 1 file open at a time — file descriptor count stays at 1 instead of 10,000
- **Lesson:** `defer` is function-scoped, not block-scoped — never use `defer` inside a loop for resources; use an inner closure or explicit cleanup

### 2.6 The Goroutine Stack Explosion From Deep Recursion

- **Situation:** Tree traversal service — recursive processing of deeply nested JSON structures
- **Problem:** Processing documents with 50,000-level nesting caused stack overflow: `runtime: goroutine stack exceeds 1000000000-byte limit` — service crashed
- **Root cause:** Go goroutine stacks grow dynamically (start at 8KB, grow as needed up to 1GB default) — a 50,000-deep recursive call grew the stack to 1GB — each stack frame held local variables and pointers — stack growth exceeded the limit
- **Symptoms:** `goroutine stack exceeds 1000000000-byte limit`, process crash for deeply nested inputs
- **Solution:** Convert recursive traversal to iterative using an explicit stack data structure:
    
    ```go
    stack := []Node{root}for len(stack) > 0 {    
       node := stack[len(stack)-1]    
       stack = stack[:len(stack)-1]    
       process(node)    
        for _, child := range node.Children {        
          stack = append(stack, child)    
        }
    }
    ```
    
    Validate and reject inputs with nesting depth > safe limit; set `debug.SetMaxStack()` to limit explosion
- **Result:** Zero stack overflows — iterative traversal uses O(depth) heap memory (controlled) instead of O(depth) stack memory (capped at 1GB)
- **Lesson:** Deep recursion in Go will eventually hit the 1GB stack limit — for user-controlled input depth, always use iterative approaches with explicit stacks on the heap

---

## Part 3 — Concurrency Bug Cases

### 3.1 The Data Race That Corrupted a Map

- **Situation:** Configuration hot-reload service — background goroutine reloads config, all request handlers read config
- **Problem:** Intermittent panics: `concurrent map read and map write` — service crashed randomly 2–3 times per day
- **Root cause:**
    
    ```go
    var config map[string]string // shared between goroutines with no synchronizationgo 
    func() {    
        for {        
        config = loadConfig() // WRITE: replaces the map        
        time.Sleep(30 * time.Second)    
        }
    }()
    // Request handlers: 
    value := config[key] // READ: concurrent with WRITE
    ```
    
    Map reads and writes are not safe for concurrent use — Go's race detector would catch this immediately but was not enabled in development
- **Solution:** Use `sync.RWMutex` to protect the map:
    
    ```go
    var mu sync.RWMutexvar config map[string]string
    // Writer:
    mu.Lock()config = loadConfig()mu.Unlock()// Readers:
    mu.RLock()value := config[key]mu.RUnlock()
    ```
    
    Or use `atomic.Value` for lock-free reads of the entire config (store and load the whole map atomically):
    
    ```go
    var configAtomic atomic.ValueconfigAtomic.Store(loadConfig()) // store new map
    atomicallycfg := configAtomic.Load().(map[string]string) // load atomically — zero lock
    ```
    
- **Result:** Zero concurrent map panics — `atomic.Value` approach gives zero-contention reads
- **Lesson:** Go maps are NOT safe for concurrent reads and writes — always protect with `sync.RWMutex` or use `sync.Map`; run the race detector (`go test -race`) in CI always — it would have caught this immediately

### 3.2 The Race Condition on a Struct Field

- **Situation:** Counter service — tracking request counts per endpoint
- **Problem:** Counter values were consistently lower than expected — 5–15% of increments were silently lost under load
- **Root cause:**
    
    ```go
    type Counter struct {    count int64}func (c *Counter) Increment() {    c.count++ // NOT atomic — read-modify-write as 3 separate operations}
    ```
    
    `c.count++` compiles to: load `count` into register → add 1 → store back — under concurrent goroutines, two goroutines can both load the same value, both add 1, both store the same result — net effect: two increments but count only increased by 1
- **Solution:** Use `sync/atomic`:
    
    ```go
    func (c *Counter) Increment() {    atomic.AddInt64(&c.count, 1) // single atomic instruction, no race possible}func (c *Counter) Value() int64 {    return atomic.LoadInt64(&c.count)}
    ```
    
- **Result:** Counter values accurate to 100% under any concurrent load
- **Lesson:** `count++` on a shared integer is a data race — use `sync/atomic` for counters; the race detector (`go test -race`) catches this pattern; never share a mutable integer between goroutines without atomic operations or mutex

### 3.3 The Channel Send to a Closed Channel Panic

- **Situation:** Request timeout implementation — result channel used to return a value from a goroutine
- **Problem:** Intermittent panics: `panic: send on closed channel` — happened under high load
- **Root cause:**
    
    ```go
    func doWithTimeout(ctx context.Context) (Result, error) {    ch := make(chan Result, 1)    go func() {        result := doWork()        ch <- result // PANIC if context already cancelled and ch was closed    }()    select {    case result := <-ch:        return result, nil    case <-ctx.Done():        close(ch) // closes ch when timeout fires        return Result{}, ErrTimeout    }}
    ```
    
    Race: if `doWork()` finishes and attempts to send on `ch` at the same moment the timeout fires and closes `ch` — send on closed channel panics
- **Solution:** Never close a channel that has active senders — use a buffered channel of size 1 and let the goroutine send without the receiver closing the channel:
    
    ```go
    ch := make(chan Result, 1) // buffered: goroutine can send without receivergo func() {    ch <- doWork() // goroutine always sends, never blocked by a closed channel}()select {case result := <-ch:    return result, nilcase <-ctx.Done():    return Result{}, ErrTimeout // ch is NOT closed — goroutine's send is buffered}
    ```
    
    The goroutine's result goes into the buffer — if nobody reads it, it is GC'd when `ch` goes out of scope
- **Result:** Zero `send on closed channel` panics
- **Lesson:** The golden rule: only the sender closes a channel, and only when there is exactly one sender; never close a channel from the receiver side when the sender is still active

### 3.4 The Mutex That Was Copied

- **Situation:** Worker pool implementation — `Worker` struct containing a `sync.Mutex`
- **Problem:** Mutex was not working — concurrent access to the protected field was causing data corruption despite the mutex being locked correctly in code
- **Root cause:**
    
    ```go
    type Worker struct {    mu    sync.Mutex    state map[string]int}func process(w Worker) { // BUG: w is passed by VALUE — mutex is COPIED    w.mu.Lock()    defer w.mu.Unlock()    w.state["key"]++}
    ```
    
    Passing a `sync.Mutex` by value copies it — the copied mutex is in the "unlocked" state regardless of the original's state — the copy and the original are independent — locking the copy has no effect on the original — `go vet` reports this as an error
- **Solution:** Always pass structs containing mutexes by pointer:
    
    ```go
    func process(w *Worker) { // pointer receiver — shares the actual mutex    w.mu.Lock()    defer w.mu.Unlock()    w.state["key"]++}
    ```
    
    Use `go vet` in CI — it detects `sync.Mutex` copied by value
- **Result:** Mutex works correctly — state protected under concurrent access
- **Lesson:** `sync.Mutex`, `sync.WaitGroup`, `sync.Once` — any sync primitive must never be copied after first use; always use pointer receivers for structs containing sync primitives; `go vet` catches this

### 3.5 The Once That Was Used to Initialize a Nil Pointer

- **Situation:** Singleton database connection pool — `sync.Once` used to initialize
- **Problem:** Intermittent nil pointer dereferences on the DB connection — only happened on startup under high load
- **Root cause:**
    
    ```go
    var (    once sync.Once    db   *sql.DB)func getDB() *sql.DB {    once.Do(func() {        var err error        db, err = sql.Open("postgres", dsn)        if err != nil {            log.Fatal(err) // if this is reached, process exits — fine        }    })    return db // if sql.Open panics (not errors), once.Do completes but db is nil}
    ```
    
    `sync.Once` marks the initialization as "done" after the function returns — even if the function panicked and was recovered externally, or if `db` was set to nil by a deferred call — subsequent calls to `getDB()` return nil without re-running the init
- **Solution:** Check the result after `once.Do`:
    
    ```go
    func getDB() (*sql.DB, error) {    once.Do(func() {        var err error        db, err = sql.Open("postgres", dsn)        if err != nil {            dbErr = err        }    })    return db, dbErr}
    ```
    
    Return both the DB and the error — callers check the error
- **Lesson:** `sync.Once` guarantees the function runs once — it does not guarantee the initialization succeeded; always store and return the initialization error alongside the initialized value

### 3.6 The Context Cancellation That Was Ignored

- **Situation:** Batch processing service — context passed through a call chain but never checked
- **Problem:** When a client disconnected or timed out, the server continued processing the request for 30 seconds — wasting CPU, DB connections, and goroutines on work whose result nobody would receive
- **Root cause:**
    
    ```go
    func handleRequest(ctx context.Context, req Request) Response {    items := fetchItems(ctx) // context passed here    results := make([]Result, 0)    for _, item := range items {        result := processItem(item) // context NOT passed — cannot be cancelled        results = append(results, result)    }    return aggregate(results)}
    ```
    
    Context cancellation propagates only if the code explicitly checks it — the loop never checked `ctx.Done()` — even though the client was gone, processing continued
- **Solution:** Check context at every loop iteration for long-running operations:
    
    ```go
    for _, item := range items {    select {    case <-ctx.Done():        return Response{}, ctx.Err() // bail out immediately    default:    }    result, err := processItem(ctx, item) // pass context down    if err != nil { return Response{}, err }    results = append(results, result)}
    ```
    
- **Result:** Work stops within one iteration of a cancellation — resources freed immediately — server throughput improved because cancelled work no longer consumes resources
- **Lesson:** Passing a context is not enough — you must check `ctx.Done()` in every blocking or long-running operation; context cancellation is cooperative in Go — nothing stops automatically unless you check

---

## Part 4 — HTTP and Network Failure Cases

### 4.1 The Default HTTP Client That Leaked Connections

- **Situation:** Microservice making outbound HTTP calls to downstream services
- **Problem:** After 24 hours, the service had 50,000 open file descriptors — `EMFILE: too many open files` — connections to downstream services began failing
- **Root cause:**
    
    ```go
    resp, err := http.Get(url) // uses http.DefaultClientif err != nil { return err }// forgot to read and close the bodyreturn resp.StatusCode
    ```
    
    Two bugs: (1) `http.DefaultClient` has no timeout — connections can hang forever; (2) the response body was not read and closed — Go's HTTP client reuses connections only if the body is fully read and closed — an unclosed body means the connection is not returned to the pool — a new connection is opened for the next request — file descriptor leak
- **Solution:**
    
    ```go
    client := &http.Client{Timeout: 10 * time.Second}resp, err := client.Get(url)if err != nil { return err }defer resp.Body.Close()body, err := io.ReadAll(resp.Body) // must read fully for connection reuseif err != nil { return err }
    ```
    
- **Result:** File descriptors stable — connections properly returned to pool — zero `EMFILE` errors
- **Lesson:** Always: (1) use a custom `http.Client` with a `Timeout`; (2) `defer resp.Body.Close()` immediately after checking `err`; (3) read the body fully before closing (even if you don't need it) — `io.Copy(io.Discard, resp.Body)` — failing to read prevents connection reuse

### 4.2 The HTTP Server With No Timeouts

- **Situation:** Internal API service — using `http.ListenAndServe(":8080", mux)`
- **Problem:** Slow clients or clients that sent request headers very slowly held goroutines and connections indefinitely — under a slow-client attack, the service accumulated 100,000 goroutines and crashed
- **Root cause:** `http.ListenAndServe` creates an `http.Server` with zero timeouts — an attacker or buggy client that connects but sends headers slowly holds the connection forever — one goroutine per connection — unlimited goroutine accumulation
- **Solution:**
    
    ```go
    srv := &http.Server{    Addr:         ":8080",    Handler:      mux,    ReadTimeout:  5 * time.Second,  // time to read entire request including body    WriteTimeout: 10 * time.Second, // time to write the response    IdleTimeout:  120 * time.Second, // keep-alive connection idle timeout    ReadHeaderTimeout: 2 * time.Second, // time to read request headers only}srv.ListenAndServe()
    ```
    
- **Result:** Slow clients disconnected after 2 seconds of header reading — goroutine count stable under any client behavior
- **Lesson:** `http.ListenAndServe` with no timeouts is an invitation for a slow-client DoS attack; always configure all four timeouts on `http.Server` — they protect against different attack vectors

### 4.3 The Transport That Wasn't Reused

- **Situation:** High-throughput service making 50,000 HTTP requests/minute to an external API
- **Problem:** Service was slow despite the external API being fast — each request took 200–400ms — external API latency was 20ms — 180–380ms unaccounted for
- **Root cause:**
    
    ```go
    func callAPI(url string) ([]byte, error) {    client := &http.Client{Timeout: 10 * time.Second} // NEW client per call    resp, err := client.Get(url)    // ...}
    ```
    
    A new `http.Client` is created per call — `http.Client` contains a `Transport` — `Transport` manages the connection pool — a new `Transport` per call means no connection reuse — every request pays TCP handshake overhead (100ms+) and TLS handshake overhead (another 100ms+)
- **Solution:** Create the client once and reuse it:
    
    ```go
    var apiClient = &http.Client{    Timeout: 10 * time.Second,    Transport: &http.Transport{        MaxIdleConns:        100,        MaxIdleConnsPerHost: 20,        IdleConnTimeout:     90 * time.Second,    },}func callAPI(url string) ([]byte, error) {    resp, err := apiClient.Get(url) // reuses connections from the pool
    ```
    
- **Result:** Latency 200–400ms → 25ms — TCP and TLS handshake eliminated for 98% of requests
- **Lesson:** `http.Client` must be created once and shared — creating a new client per request defeats connection pooling; the transport's connection pool is the most valuable part of the HTTP client

### 4.4 The gRPC Connection That Was Created Per Request

- **Situation:** Go microservices communicating via gRPC
- **Problem:** gRPC call latency averaged 150ms — the downstream service processed requests in 5ms — 145ms overhead per call
- **Root cause:**
    
    ```go
    func callUserService(userID int) (*User, error) {    conn, err := grpc.Dial(userServiceAddr, grpc.WithTransportCredentials(...))    defer conn.Close() // connection closed after every call    client := pb.NewUserServiceClient(conn)    return client.GetUser(ctx, &pb.GetUserRequest{UserId: int64(userID)})}
    ```
    
    Each call creates a new gRPC connection — gRPC connections include: TCP handshake + TLS handshake + HTTP/2 connection setup + gRPC channel establishment — total: 100–200ms — then closed immediately after one RPC
- **Solution:** Create the gRPC connection once at startup and reuse it for all calls:
    
    ```go
    var userConn *grpc.ClientConnfunc init() {    var err error    userConn, err = grpc.Dial(userServiceAddr,        grpc.WithTransportCredentials(...),        grpc.WithKeepaliveParams(keepalive.ClientParameters{            Time:    10 * time.Second,            Timeout: 3 * time.Second,        }),    )    if err != nil { log.Fatal(err) }}var userClient = pb.NewUserServiceClient(userConn)
    ```
    
- **Result:** gRPC call latency 150ms → 6ms — connection overhead eliminated — throughput increased 20×
- **Lesson:** gRPC connections are expensive to establish — create them once at startup and reuse; the `grpc.ClientConn` is goroutine-safe and designed for long-lived reuse

### 4.5 The JSON Encoding That Blocked the Response Writer

- **Situation:** API service returning large JSON responses — up to 50MB for data export endpoints
- **Problem:** During large exports, the server held the entire response in memory before sending — peak memory 4GB during concurrent exports — out-of-memory crashes
- **Root cause:**
    
    ```go
    func exportHandler(w http.ResponseWriter, r *http.Request) {    data := loadAllData() // loads 50MB into memory    bytes, _ := json.Marshal(data) // marshals entire 50MB into another byte slice    w.Write(bytes) // writes 50MB in one call}
    ```
    
    Two 50MB allocations (the data + the JSON bytes) per concurrent export — 10 concurrent exports = 1GB just for marshal buffers
- **Solution:** Stream the JSON encoding directly to the response writer:
    
    ```go
    func exportHandler(w http.ResponseWriter, r *http.Request) {    w.Header().Set("Content-Type", "application/json")    enc := json.NewEncoder(w)    // Stream records one at a time    fmt.Fprint(w, "[")    first := true    for row := range streamDataFromDB(r.Context()) {        if !first { fmt.Fprint(w, ",") }        enc.Encode(row) // encodes directly to w, no intermediate buffer        first = false    }    fmt.Fprint(w, "]")}
    ```
    
- **Result:** Memory per export 50MB → 2MB (only one row in memory at a time) — 25 concurrent exports possible without OOM
- **Lesson:** Never `json.Marshal` a large dataset into a byte slice — stream with `json.NewEncoder(w)` directly to the response writer; the client receives data as it is generated rather than waiting for the full response

---

## Part 5 — Database and External Service Failure Cases

### 5.1 The SQL Query Built by String Formatting

- **Situation:** Search API — dynamic filters applied to a database query
- **Problem:** Security audit discovered SQL injection vulnerability — and separately, the queries were slow because they were never cached as prepared statements
- **Root cause:**
    
    ```go
    query := fmt.Sprintf(    "SELECT * FROM products WHERE category = '%s' AND price < %d",    category, maxPrice,)db.Query(query) // different SQL string every call — no prepared statement caching
    ```
    
    Two problems: (1) `category` comes from user input — SQL injection if it contains `'` — (2) every call generates a different SQL string — the DB cannot cache the query plan
- **Solution:** Always use parameterized queries:
    
    ```go
    db.QueryContext(ctx,    "SELECT * FROM products WHERE category = $1 AND price < $2",    category, maxPrice,)
    ```
    
    Or use `sqlc` — generates type-safe Go functions from SQL — SQL injection is structurally impossible
- **Result:** SQL injection eliminated structurally — query plan caching enabled — query latency reduced 40%
- **Lesson:** Never use `fmt.Sprintf` to build SQL strings — always use parameterized queries; `sqlc` makes SQL injection impossible by design

### 5.2 The DB Connection Pool Set Too Small

- **Situation:** Go web service using `database/sql` — PostgreSQL backend
- **Problem:** Under load, requests queued waiting for a DB connection — P99 latency 8 seconds — database was at 5% CPU (not the bottleneck)
- **Root cause:**
    
    ```go
    db, _ := sql.Open("pgx", dsn)// No pool configuration — defaults: MaxOpenConns=0 (unlimited), MaxIdleConns=2
    ```
    
    `MaxIdleConns=2` means only 2 connections are kept in the pool when idle — under load, new connections must be established for every request above 2 — TCP + TLS overhead per new connection — and `MaxOpenConns=0` means unlimited connections could be opened — creating thousands of connections to PostgreSQL
- **Solution:**
    
    ```go
    db.SetMaxOpenConns(25)              // limit total connectionsdb.SetMaxIdleConns(25)              // keep all open connections in pool when idledb.SetConnMaxLifetime(5 * time.Minute)  // recycle connections periodicallydb.SetConnMaxIdleTime(1 * time.Minute)  // close idle connections after 1 minute
    ```
    
    Formula: `MaxOpenConns = (num_cores * 2) + num_disk_spindles` — for cloud VMs, typically 10–50
- **Result:** Connection pool sized correctly — no new connection overhead per request — P99 latency 8,000ms → 45ms
- **Lesson:** Always configure `database/sql` pool settings explicitly — defaults are wrong for any production service; `MaxIdleConns` should equal `MaxOpenConns` so connections are reused, not discarded

### 5.3 The Scan That Allocated a New Struct Per Row

- **Situation:** High-traffic reporting endpoint — fetching 10,000 rows per request
- **Problem:** GC pausing for 50–100ms during large queries — high allocation rate visible in pprof
- **Root cause:**
    
    ```go
    var results []*Product // slice of POINTERSfor rows.Next() {    p := &Product{} // new heap allocation per row = 10,000 allocations    rows.Scan(&p.ID, &p.Name, &p.Price)    results = append(results, p)}
    ```
    
    10,000 rows = 10,000 `Product` structs allocated on the heap = 10,000 GC-tracked objects — GC must trace all of them on every collection cycle
- **Solution:** Use a slice of values (not pointers) — pre-allocate with known capacity:
    
    ```go
    results := make([]Product, 0, 10000) // pre-allocated, no pointer indirectionvar p Productfor rows.Next() {    rows.Scan(&p.ID, &p.Name, &p.Price)    results = append(results, p) // p is copied into the slice — one contiguous allocation}
    ```
    
    The entire slice is one heap allocation — GC traces one object instead of 10,000
- **Result:** GC pause 50–100ms → 2ms — allocation count per request 10,000 → 1
- **Lesson:** Prefer `[]Struct` over `[]*Struct` when the struct is small — contiguous allocation reduces GC pressure dramatically; pre-allocate with `make([]T, 0, capacity)` when the size is known

### 5.4 The Redis Client Without a Timeout

- **Situation:** Go service using Redis for session storage — `go-redis/v9`
- **Problem:** When Redis became slow (GC pause on Redis), all Go service goroutines blocked on Redis calls — connection pool exhausted — HTTP requests started timing out — cascading failure
- **Root cause:**
    
    ```go
    rdb := redis.NewClient(&redis.Options{    Addr: "redis:6379",    // No timeouts configured})val, err := rdb.Get(ctx, key).Result() // blocks indefinitely if Redis is slow
    ```
    
    Default `go-redis` has no read/write timeout — a slow Redis blocks the goroutine — with 1,000 concurrent requests, 1,000 goroutines can be stuck waiting on Redis — connection pool exhausted — new requests cannot get a Redis connection — service appears down even though Redis is just slow
- **Solution:**
    
    ```go
    rdb := redis.NewClient(&redis.Options{    Addr:         "redis:6379",    DialTimeout:  2 * time.Second,    ReadTimeout:  1 * time.Second,    WriteTimeout: 1 * time.Second,    PoolSize:     50,    PoolTimeout:  2 * time.Second,})
    ```
    
    Also: use `context.WithTimeout` on every Redis call as an application-level safeguard
- **Result:** Redis slowness now causes fast failures (1-second timeout) instead of indefinite blocking — cascading failure prevented
- **Lesson:** Every external service client (Redis, HTTP, gRPC, DB) must have timeouts — a slow external service without timeouts will eventually exhaust your goroutine pool and take down your service

---

## Part 6 — Performance Improvement Case Studies

### 6.1 sync.Pool Reduced GC Pressure 80%

- **Situation:** HTTP proxy service — allocating a `[]byte` buffer for each request to copy the body
- **Problem:** 10,000 requests/second × 32KB buffer per request = 320MB/second of allocations — GC running constantly — P99 latency spiky at GC pause times (20–50ms pauses)
- **Root cause:** `buf := make([]byte, 32*1024)` on every request — 10,000 new allocations/second — GC must collect all of them
- **Solution:**
    
    ```go
    var bufPool = sync.Pool{    New: func() interface{} { return make([]byte, 32*1024) },}func handleRequest(w http.ResponseWriter, r *http.Request) {    buf := bufPool.Get().([]byte)    defer bufPool.Put(buf)    // use buf to copy body    io.CopyBuffer(w, r.Body, buf)}
    ```
    
- **Result:** GC pressure reduced 80% — allocations 320MB/second → 64MB/second (only for the ~20% of requests where the pool runs empty) — P99 GC pauses 50ms → 8ms
- **Lesson:** `sync.Pool` is purpose-built for temporary buffers — get a buffer, use it, return it to the pool — the GC periodically clears the pool but pool objects survive at least one GC cycle; ideal for request-scoped allocations of the same type and size

### 6.2 Replacing Mutex With Atomic: 3× Throughput

- **Situation:** Rate limiter — using `sync.Mutex` to protect a counter
- **Problem:** Under high concurrency (10,000 goroutines), the mutex became a bottleneck — 80% of goroutine time spent waiting for the mutex — throughput plateau
- **Root cause:**
    
    ```go
    type RateLimiter struct {    mu    sync.Mutex    count int64}func (r *RateLimiter) Increment() int64 {    r.mu.Lock()    defer r.mu.Unlock()    r.count++    return r.count}
    ```
    
    Mutex serializes all goroutines — 10,000 goroutines all compete for one lock — each goroutine waits for all others
- **Solution:**
    
    ```go
    type RateLimiter struct {    count int64}func (r *RateLimiter) Increment() int64 {    return atomic.AddInt64(&r.count, 1)}
    ```
    
    `atomic.AddInt64` is a single CPU instruction (lock xadd) — no goroutine blocking — all goroutines proceed concurrently
- **Result:** Throughput 3× improvement — goroutine wait time eliminated — works correctly under any concurrency
- **Lesson:** For simple integer operations (counter, flag, pointer swap), `sync/atomic` is always faster than `sync.Mutex` — use a mutex only when you need to protect a multi-step operation

### 6.3 Profiling Revealed One Function Using 60% of CPU

- **Situation:** Data transformation service — processing 1 million JSON records per minute
- **Problem:** Service used 8 CPU cores at 95% — could not keep up with the input rate
- **Investigation:** `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30` — CPU profile showed 60% of CPU in `encoding/json.Marshal` called inside a hot loop
- **Root cause:** JSON marshaling inside a tight loop with repeated allocation — each call to `json.Marshal` used reflection to inspect struct fields at runtime
- **Solution:** Replace `encoding/json` with `github.com/bytedance/sonic` (SIMD-accelerated JSON) or use `github.com/mailru/easyjson` (code-generated JSON marshaling — no reflection):
    
    ```bash
    easyjson -all types.go  # generates MyStruct.MarshalJSON() without reflection
    ```
    
- **Result:** JSON marshaling CPU reduced from 60% to 18% of total CPU — overall throughput 2.5× improvement — same hardware
- **Lesson:** Profile before optimizing — `pprof` consistently reveals that 1–2 functions consume the majority of CPU; code-generated JSON (easyjson, protobuf) outperforms reflection-based JSON by 3–5×

### 6.4 Channel vs Mutex Benchmark: Right Tool for the Right Job

- **Situation:** Team debate: should the work queue use a channel or a mutex-protected slice?
- **Benchmark conducted:**
    
    ```go
    // Channel approach: make(chan Job, 1000)// Mutex approach: sync.Mutex + []Job
    ```
    
- **Results at 1,000 goroutines:**
    - Channel: 4.2ns/op — zero contention for buffered channel under cap
    - Mutex + slice: 18.7ns/op — mutex contention at high goroutine count
    - Mutex + slice (low contention): 3.1ns/op — faster than channel when contention is low
- **Conclusion:**
    - Channels win for producer-consumer patterns with many goroutines — built-in backpressure
    - Mutex wins for simple shared state access with few goroutines and low contention
    - `sync.Map` wins for concurrent map access with high read ratio and low write ratio
- **Lesson:** Channels are not universally faster than mutexes — benchmark your specific access pattern; channels add goroutine scheduling overhead for low-contention cases; for simple shared state with low concurrency, a mutex is often faster

### 6.5 Struct Layout Optimization: 30% Memory Reduction

- **Situation:** In-memory data structure holding 10 million sensor records
- **Problem:** Memory usage 12GB — far more than expected for the data volume
- **Root cause:**
    
    ```go
    type Sensor struct {    ID        uint8    // 1 byte    // 7 bytes padding    Timestamp int64    // 8 bytes    Active    bool     // 1 byte    // 7 bytes padding    Value     float64  // 8 bytes    Name      string   // 16 bytes (pointer + length)} // Total: 48 bytes due to alignment padding
    ```
    
    Go pads struct fields for alignment — `uint8` followed by `int64` requires 7 bytes of padding — the struct is 48 bytes instead of the 34 bytes of actual data (29% overhead)
- **Solution:** Order fields from largest to smallest alignment requirement:
    
    ```go
    type Sensor struct {    Timestamp int64    // 8 bytes    Value     float64  // 8 bytes    Name      string   // 16 bytes    ID        uint8    // 1 byte    Active    bool     // 1 byte    // 6 bytes padding at end (acceptable)} // Total: 40 bytes — 17% smaller
    ```
    
    Use `go vet -structtag` or `fieldalignment` tool from `golang.org/x/tools/go/analysis/passes/fieldalignment`
- **Result:** Per-struct size 48 → 40 bytes — for 10M records: 480GB → 400GB... actually 480MB → 400MB — 16% memory reduction — also improved cache efficiency (more structs fit in CPU cache line)
- **Lesson:** Struct field ordering affects memory layout — sort fields from largest to smallest — use `fieldalignment` to detect and fix padding waste automatically

### 6.6 Replacing Global Logger With Zero-Allocation Logger: 15% Throughput Gain

- **Situation:** High-throughput API service — logging every request with the standard `log` package
- **Problem:** `log` package uses a global mutex and allocates strings for formatting — under 50,000 req/sec, logging was consuming 15% of CPU
- **Root cause:** `log.Printf("request: %s %s %d", method, path, status)` — allocates a formatted string, acquires a mutex, writes — 3 allocations per log line under `encoding/json` for structured logging
- **Solution:** Migrate to `go.uber.org/zap` with `zap.Logger` (zero-allocation structured logging):
    
    ```go
    logger.Info("request",    zap.String("method", method),    zap.String("path", path),    zap.Int("status", status),)
    ```
    
    Zap uses a pre-allocated buffer pool — zero allocations for the common case — no global mutex — concurrent writes use atomic operations
- **Result:** Logging CPU overhead 15% → 2% — throughput increased 15% — same information logged
- **Lesson:** The standard `log` package is not suitable for high-throughput services — use `zap` or `zerolog` (both zero-allocation); switching loggers is a one-time change that pays throughput dividends permanently

### 6.7 Pre-allocating Slices: Allocation Count Reduced 90%

- **Situation:** Data aggregation service — building result slices in hot paths
- **Problem:** High allocation rate — GC pauses of 30–50ms every few seconds
- **Root cause:**
    
    ```go
    var results []intfor _, v := range data {    results = append(results, transform(v)) // grows slice multiple times}
    ```
    
    `append` doubles the slice capacity when full — for 10,000 items: 13 reallocations (1→2→4→8...→8192→16384) — each reallocation copies all existing elements — total allocated: ~3× the final size
- **Solution:**
    
    ```go
    results := make([]int, 0, len(data)) // pre-allocate exact capacityfor _, v := range data {    results = append(results, transform(v)) // zero reallocations}
    ```
    
- **Result:** Allocations per operation reduced 90% — GC pause frequency halved — throughput 25% improvement in the hot path
- **Lesson:** When the final slice size is known (or estimable), always `make([]T, 0, cap)` — it costs nothing and eliminates all append reallocations; this is one of the most common and easiest Go performance improvements

---

## Part 7 — Real Company Go Architecture Case Studies

### 7.1 Uber — Go for the Dispatch System

- **Situation:** Uber's driver dispatch system — matching riders to nearby drivers in real time
- **Scale:** 15 million trips/day, sub-second matching latency, global deployment
- **Go architecture decisions:**
    1. Goroutines for each dispatch computation — lightweight concurrency allows thousands of simultaneous matching computations
    2. Custom memory allocator for location data structures — avoided GC pressure from millions of small allocations per second
    3. `sync.Pool` for request context objects — reused across goroutines
    4. Protobuf for internal communication — 3–5× smaller than JSON, zero-allocation deserialization with generated code
- **Performance achieved:** 99th percentile dispatch latency < 500ms globally — Go's low-latency GC was critical
- **Lesson:** Go's concurrency model (goroutines + channels) is well-suited for dispatch systems where thousands of independent computations run simultaneously; protobuf over JSON is the right choice for internal microservice communication at scale

### 7.2 Cloudflare — Go for the Edge Network

- **Situation:** Cloudflare — handling 55 million HTTP requests/second globally — written primarily in Go
- **Key Go usage:** DNS resolver, HTTP proxy, Workers (serverless runtime), DDoS mitigation — all in Go
- **Performance challenges solved:**
    1. **GC pauses:** At 55M req/sec, a 10ms GC pause means 550,000 requests delayed — tuned `GOGC=400` (collect less frequently), `GOMEMLIMIT` to bound total memory — reduced GC frequency by 4× at the cost of higher memory usage
    2. **Goroutine scheduling:** Custom `runtime.LockOSThread()` for network-intensive goroutines to prevent OS thread switching overhead
    3. **Zero-copy networking:** `syscall.Sendfile` and `net.UnixConn` for data paths where allocation would be the bottleneck
- **Lesson:** At extreme request rates, Go's GC must be explicitly tuned — `GOGC` and `GOMEMLIMIT` are the two most important levers; zero-copy networking is necessary when data movement dominates

### 7.3 Docker — Go for Container Runtime

- **Situation:** Docker (and containerd, runc) — all written in Go — the foundation of container infrastructure
- **Why Go was chosen over C/C++:** Memory safety without GC overhead for CLI tools, goroutines for parallel container operations, simple cross-compilation for multiple architectures
- **Key Go patterns used:**
    1. `context.Context` throughout for cancellation propagation — stopping a docker run cancels all child goroutines
    2. `io.Reader`/`io.Writer` interface composition for streaming logs — any log destination implements the same interface
    3. `sync.WaitGroup` for parallel container startup — `docker-compose up` starts all services concurrently
- **Lesson:** Go's interfaces and composition enable clean abstraction in system software — the `io.Reader`/`io.Writer` pattern allows swapping log destinations without changing the streaming code

### 7.4 Dropbox — Migrating Python to Go: 25× Throughput

- **Situation:** Dropbox's file metadata service — originally Python — handling file sync events for 500M+ users
- **Problem:** Python's GIL limited CPU parallelism — at 500M users, the metadata service was the throughput bottleneck — adding more Python processes was expensive
- **Migration to Go:**
    1. Rewrote the metadata service in Go — same logic, same external interfaces
    2. Go's real concurrency (no GIL) allowed CPU-bound operations to run in parallel
    3. gRPC replaced the Python-to-Python Thrift calls — lower latency, stronger typing
- **Result:** 25× throughput improvement on the same hardware — Python service required 50 machines — Go service required 2 machines for the same load
- **Lesson:** Go's real concurrency (goroutines on multiple OS threads without GIL) delivers dramatically better CPU-bound throughput than Python; migration effort is justified when the bottleneck is the language runtime

### 7.5 CockroachDB — Distributed SQL in Go

- **Situation:** CockroachDB — a distributed SQL database — written entirely in Go
- **Why Go for a database:** Low-latency GC suitable for database workloads, goroutines map naturally to concurrent client connections, cross-compilation for Linux/Mac/Windows from a single codebase
- **Key Go patterns:**
    1. **Context propagation:** Every query carries a `context.Context` — client disconnects automatically cancel the query
    2. **Goroutine-per-connection:** Each client connection is a goroutine — 10,000 clients = 10,000 goroutines — Go's scheduler handles this efficiently
    3. **Custom memory management for hot paths:** Arena allocators bypass the GC for short-lived allocations in the query execution path
    4. **`sync/atomic` for Raft log counters** — lock-free consensus progress tracking
- **Lesson:** Go is suitable for high-performance systems software including databases — the GC is manageable with profiling and arena allocation for hot paths

### 7.6 Grafana — Go Monolith to Microservices

- **Situation:** Grafana — originally a Go monolith — migrating to Go microservices
- **Problem during migration:** Service boundaries were unclear — data sharing between services required either shared DB (coupling) or API calls (latency)
- **Go-specific challenges:**
    1. **Shared global state:** The monolith used package-level variables (`var db *sql.DB`) — in microservices, these had to become service-local with explicit initialization
    2. **Context propagation across service boundaries:** Request-scoped values (user ID, trace ID) had to be explicitly forwarded in gRPC metadata — no longer automatically available via package-level state
    3. **Interface mocking for tests:** Go interfaces enabled test doubles — every external dependency was accessed through an interface — microservice boundaries emerged from testing boundaries
- **Lesson:** Package-level global state is the primary obstacle when splitting a Go monolith into microservices — design services with explicit dependency injection from day one; Go interfaces naturally define service boundaries

### 7.7 Monzo — Banking in Go: Safety at Financial Scale

- **Situation:** Monzo bank — built entirely on Go microservices from day one — 8 million customers
- **Key Go architecture decisions for financial correctness:**
    1. **Context cancellation for every DB transaction:** A cancelled context rolls back any open transaction automatically — no orphaned transactions
    2. **Idempotency keys as function parameters:** Every state-changing function takes an `idempotencyKey string` — forces developers to think about exactly-once at the API design level
    3. **Explicit error wrapping:** `fmt.Errorf("payment %s: %w", id, err)` — every error carries context about where it happened — critical for financial audit trails
    4. **`go-money` library for monetary amounts:** Never `float64` — always `int64` (pence) with currency code — struct-typed to prevent accidentally adding GBP and EUR
- **Lesson:** Go's explicit error handling, strong typing, and context propagation make it naturally suited for financial systems where every operation must be traceable, cancellable, and correct

---

## Part 8 — Go Profiling and Debugging Case Studies

### 8.1 pprof Revealed a Regex Compiled in a Hot Path

- **Situation:** Log parsing service — classifying log lines by matching against 20 regex patterns
- **Problem:** Service using 95% CPU for processing 100,000 log lines/second
- **Investigation:** CPU pprof profile: `go tool pprof http://localhost:6060/debug/pprof/profile`
- **Finding:** 70% of CPU in `regexp.Compile` — the regex was being compiled on every log line
- **Root cause:**
    
    ```go
    func classifyLog(line string) string {    if regexp.MustCompile(`ERROR.*database`).MatchString(line) { // compiled per call        return "db-error"    }
    ```
    
- **Solution:**
    
    ```go
    var dbErrorRegex = regexp.MustCompile(`ERROR.*database`) // compiled once at initfunc classifyLog(line string) string {    if dbErrorRegex.MatchString(line) { return "db-error" }}
    ```
    
- **Result:** CPU usage 95% → 18% — throughput 6× improvement — same hardware
- **Lesson:** `regexp.Compile` is expensive — never call it inside a hot function; always compile regexes as package-level variables at initialization time

### 8.2 Heap Profile Revealed a String Interning Opportunity

- **Situation:** DNS resolver service — maintaining a table of recently resolved domain names
- **Problem:** Memory usage 4GB for a table of 10 million domains — expected ~1GB
- **Investigation:** `go tool pprof http://localhost:6060/debug/pprof/heap` — top allocations: `strings` in `domainTable` — each domain stored as a `string` — same domains stored multiple times in different parts of the cache
- **Root cause:** "google.com" stored as a separate string allocation in each cache entry that referenced it — 100 cache entries for "google.com" = 100 separate string allocations of "google.com"
- **Solution:** String interning — deduplicate strings using a map:
    
    ```go
    var intern = map[string]string{}func internString(s string) string {    if v, ok := intern[s]; ok { return v } // return the shared copy    intern[s] = s    return s}// When storing a domain: entry.Domain = internString(domain)
    ```
    
    All references to "google.com" now share one string allocation
- **Result:** Memory 4GB → 1.1GB — 73% reduction — the domain table now scales with unique domains, not total references
- **Lesson:** String interning is effective when the same string values appear many times — a single map lookup trades CPU for significant memory savings

### 8.3 Goroutine Dump Revealed a Deadlock

- **Situation:** CI/CD pipeline service — intermittently hung during test runs — no output, no error, just silence for 10 minutes then a timeout
- **Investigation:** Sent `SIGQUIT` to the hung process — Go runtime dumps all goroutine stacks to stderr
- **Finding:** All goroutines were blocked:
    - Goroutine 1: `sync.(*Mutex).Lock()` waiting for `buildMu`
    - Goroutine 47: `sync.(*Mutex).Lock()` waiting for `logMu`
    - Goroutine 52: holding `logMu`, waiting for `buildMu`
    - Goroutine 1: holding `buildMu`, waiting for `logMu` — Classic deadlock: goroutine 1 holds `buildMu` and wants `logMu` — goroutine 52 holds `logMu` and wants `buildMu`
- **Root cause:** Two mutexes acquired in different orders by different code paths
- **Solution:** Establish a consistent lock ordering (always acquire `buildMu` before `logMu`) and document it; use `go build -race` to detect lock ordering issues at test time; use `golang.org/x/sync/errgroup` instead of manual mutex management
- **Lesson:** Send `SIGQUIT` to a hung Go process — the goroutine dump reveals deadlocks, livelocks, and stuck goroutines instantly; deadlocks always involve circular lock dependency — establish and enforce lock ordering

### 8.4 Trace Tool Revealed Goroutine Scheduling Latency

- **Situation:** Low-latency API — target P99 latency 10ms — actual P99 25ms
- **Problem:** 15ms unexplained latency — pprof showed no expensive function — the CPU was available
- **Investigation:** Go execution trace: `go tool trace http://localhost:6060/debug/pprof/trace?seconds=5`
- **Finding:** Goroutines were ready to run (not blocked on I/O or mutex) but waiting 10–15ms for the Go scheduler to assign them to an OS thread — `GOMAXPROCS` was set to 2 on an 8-core machine
- **Root cause:** `GOMAXPROCS=2` — only 2 goroutines could run simultaneously — 100 goroutines competing for 2 slots — scheduling latency was the bottleneck, not computation
- **Solution:** `runtime.GOMAXPROCS(runtime.NumCPU())` — or simply don't set `GOMAXPROCS` (default is `NumCPU()` since Go 1.5) — the container had `GOMAXPROCS=2` hardcoded from an old configuration
- **Result:** P99 latency 25ms → 9ms — the 15ms gap was pure scheduling wait time — eliminated by using all 8 CPU cores
- **Lesson:** The execution trace tool reveals scheduling latency — invisible to pprof; always check `GOMAXPROCS` in containerized environments (some older container runtimes incorrectly report 1 CPU to the Go runtime)

---

## Part 9 — Testing and Reliability Failure Cases

### 9.1 The Race Condition Found Only in Production

- **Situation:** User authentication service — login endpoint
- **Problem:** Intermittent authentication failures in production — rate 0.01% of logins — not reproducible in testing
- **Root cause:** Found after enabling `-race` flag in production canary:
    
    ```go
    var currentUser *Usergo func() { currentUser = authenticate(token) }() // writes currentUser// handler immediately reads currentUser after launching goroutineif currentUser != nil { // RACE: reads currentUser before goroutine finishes
    ```
    
    The handler read `currentUser` before the goroutine had written to it — race condition — 99.99% of the time the goroutine finished fast enough — 0.01% of the time it did not
- **Solution:** Run `go test -race` in CI — this race would have been caught immediately; fix the race: wait for the goroutine result via a channel, not a shared variable
- **Result:** Zero authentication race conditions after fix
- **Lesson:** Run `go test -race` in CI — always — the race detector has near-zero false positive rate and catches races that only manifest under production load; a race that appears 0.01% of the time is still a bug

### 9.2 The Test That Passed Locally but Failed in CI

- **Situation:** Concurrent test suite — tests using `time.Sleep` for synchronization
- **Problem:** Tests passed locally (developer's fast MacBook) — failed intermittently in CI (slow Linux container) — `sleep(10ms)` was not enough time for a goroutine to complete on a loaded CI machine
- **Root cause:**
    
    ```go
    go doBackgroundWork()time.Sleep(10 * time.Millisecond) // assumes goroutine finishes in 10msassert.Equal(t, expected, result) // result not ready on slow CI
    ```
    
    `time.Sleep` for synchronization is a race condition — goroutine scheduling is non-deterministic — the goroutine may take longer than 10ms under CPU pressure
- **Solution:** Use proper synchronization for tests:
    
    ```go
    done := make(chan struct{})go func() {    doBackgroundWork()    close(done)}()select {case <-done:case <-time.After(5 * time.Second):    t.Fatal("background work timed out")}assert.Equal(t, expected, result)
    ```
    
    Or use `sync.WaitGroup` — deterministic, correct, fast
- **Lesson:** Never use `time.Sleep` for test synchronization — it is a race condition that passes on fast machines and fails on slow ones; use channels, `sync.WaitGroup`, or `testify/mock` built-in wait mechanisms

### 9.3 The Integration Test That Left Goroutines Running

- **Situation:** Integration test suite — tests creating servers and clients
- **Problem:** Test suite became slower over time — after 100 test runs, overall test time 10× longer than at the start — some tests failed with port already in use
- **Root cause:** Each test created an HTTP server and a background goroutine — tests did not clean up — goroutines and servers leaked between tests — ports from old tests were still bound — background goroutines from old tests still running and interfering
- **Solution:**
    
    ```go
    func TestServer(t *testing.T) {    srv := httptest.NewServer(handler)    t.Cleanup(func() { srv.Close() }) // cleanup registered with testing.T        ctx, cancel := context.WithCancel(context.Background())    t.Cleanup(cancel) // cancels context when test ends — kills goroutines        go backgroundWorker(ctx) // goroutine exits when ctx is cancelled}
    ```
    
    `t.Cleanup()` runs cleanup functions when the test ends (including on test failure) — always register cleanup for servers, goroutines, and DB connections
- **Lesson:** Use `t.Cleanup()` for all test resource cleanup — it runs even on test failure; always pass a `context.Context` to test goroutines and cancel it in cleanup — goroutine leaks between tests cause flaky, slow test suites

---

## Part 10 — gRPC and Microservice Failure Cases

### 10.1 The gRPC Stream That Never Closed

- **Situation:** Go service using bidirectional gRPC streaming for real-time data
- **Problem:** Memory grew 50MB per hour — pprof showed goroutine count climbing — all stuck in `grpc.(*recvBufferReader).Read`
- **Root cause:**
    
    ```go
    stream, _ := client.StreamData(ctx)go func() {    for {        msg, err := stream.Recv()        if err != nil { return } // error closes goroutine        process(msg)    }}()// If the server stops sending but doesn't close the stream,// stream.Recv() blocks forever — goroutine leaks
    ```
    
    The server never called `stream.CloseSend()` — the client's `stream.Recv()` blocked forever — goroutine leaked with its gRPC buffer
- **Solution:** Pass context with timeout: `ctx, cancel := context.WithTimeout(ctx, 30*time.Second)` — even if the server doesn't close, the client times out; implement server-side stream health: send periodic heartbeats, close the stream on inactivity; use `grpc.KeepaliveParams` to detect dead connections
- **Lesson:** gRPC streams that are never closed leak goroutines — always use context timeouts and implement keepalive/heartbeat for long-lived streams

### 10.2 The Middleware That Swallowed Errors

- **Situation:** Go gRPC interceptor chain — logging middleware wrapping all RPCs
- **Problem:** Errors from downstream services were being silently swallowed — clients received a generic "internal error" instead of the specific error from the downstream service
- **Root cause:**
    
    ```go
    func loggingInterceptor(ctx context.Context, req interface{},    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {    resp, err := handler(ctx, req)    if err != nil {        log.Error("RPC failed", "method", info.FullMethod)        return nil, status.Error(codes.Internal, "internal error") // wraps ALL errors    }    return resp, nil}
    ```
    
    The interceptor caught every error and replaced it with a generic `Internal` error — the specific gRPC status code (NotFound, PermissionDenied, etc.) was lost
- **Solution:**
    
    ```go
    func loggingInterceptor(...) (interface{}, error) {    resp, err := handler(ctx, req)    if err != nil {        log.Error("RPC failed", "method", info.FullMethod, "error", err)        return nil, err // return the ORIGINAL error — don't replace it    }    return resp, nil}
    ```
    
- **Lesson:** Middleware must propagate errors faithfully — never replace a specific error with a generic one; use `status.FromError(err)` to extract and log gRPC status codes without changing them

### 10.3 The Circuit Breaker That Was Never Tripped

- **Situation:** Go microservice calling three downstream services — one frequently slow
- **Problem:** When Service C became slow (500ms responses), requests to the calling service became slow — they waited for Service C on every call — P99 latency 600ms instead of 20ms
- **Root cause:** No circuit breaker — every request to the calling service made a fresh call to Service C — even when Service C was known to be slow — the calling service absorbed Service C's latency
- **Solution:** Implement circuit breaker with `github.com/sony/gobreaker`:
    
    ```go
    cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{    Name:        "service-c",    MaxRequests: 5,                // allow 5 requests in half-open state    Interval:    10 * time.Second,  // count window    Timeout:     30 * time.Second,  // time before attempting to close    ReadyToTrip: func(counts gobreaker.Counts) bool {        return counts.ConsecutiveFailures > 5 // trip after 5 consecutive failures    },})result, err := cb.Execute(func() (interface{}, error) {    return callServiceC(ctx, req)})
    ```
    
    When the circuit is open: requests to Service C fail immediately (fast fail) instead of waiting 500ms
- **Result:** When Service C is down — calling service P99 latency 2ms (fast fail) instead of 600ms (waiting) — other features unaffected by Service C's state
- **Lesson:** Circuit breakers are mandatory for any synchronous call to a downstream service — without them, one slow downstream service degrades all functionality of the calling service

---

## Master Summary Table

|#|Case|Category|Key Lesson|
|---|---|---|---|
|1.1|Goroutine leak from missing timeout|Goroutine|Every blocking goroutine needs a timeout or cancellable context|
|1.2|Goroutine explosion from unbounded fan-out|Goroutine|Worker pool with semaphore — never goroutines proportional to input|
|1.3|Goroutine panic crashed the service|Goroutine|Every manually launched goroutine needs defer recover()|
|1.4|Closed channel panicked|Goroutine|sync.Once for close; only sender closes|
|1.5|Select ignored deadline|Goroutine|Check ctx.Done() first with non-blocking select|
|1.6|WaitGroup deadlock from closure + panic|Goroutine|Shadow loop vars; defer wg.Done() is first defer|
|2.1|String concatenation O(N²)|Memory|strings.Builder with Grow(); stream to writer|
|2.2|JSON to interface{} allocation explosion|Memory|Unmarshal into concrete structs always|
|2.3|Sub-slice held 500MB backing array|Memory|copy() to break reference to large backing array|
|2.4|Map cache without eviction = memory leak|Memory|Every in-memory cache needs TTL or size limit|
|2.5|defer in loop held all file descriptors|Memory|defer is function-scoped; use inner closure or explicit close|
|2.6|Deep recursion exceeded stack limit|Memory|Iterative traversal with explicit stack for unbounded depth|
|3.1|Concurrent map read/write panic|Concurrency|Maps not safe for concurrent use; sync.RWMutex or atomic.Value|
|3.2|count++ data race lost increments|Concurrency|atomic.AddInt64 for shared counters|
|3.3|Send on closed channel|Concurrency|Buffered channel; never close from receiver|
|3.4|Mutex copied by value|Concurrency|Pointer receivers for structs with sync primitives|
|3.5|sync.Once hid init failure|Concurrency|Store and return init error from Once|
|3.6|Context cancellation ignored|Concurrency|Check ctx.Done() in every loop iteration|
|4.1|Default HTTP client leaked connections|HTTP|Always read+close body; custom client with timeout|
|4.2|HTTP server with no timeouts|HTTP|All four timeouts on http.Server are mandatory|
|4.3|HTTP transport created per request|HTTP|http.Client created once and shared — never per request|
|4.4|gRPC connection per request|HTTP|gRPC ClientConn created once at startup|
|4.5|JSON Marshal into memory before response|HTTP|json.NewEncoder(w) streams directly to response writer|
|5.1|SQL built with fmt.Sprintf|Database|Parameterized queries always; sqlc for structural safety|
|5.2|DB pool too small|Database|SetMaxOpenConns=SetMaxIdleConns; size for your workload|
|5.3|[]*Struct vs []Struct|Database|[]Struct is one allocation; []*Struct is N allocations|
|5.4|Redis client without timeout|Database|All external clients need DialTimeout+ReadTimeout+WriteTimeout|
|6.1|Buffer allocation per request|Performance|sync.Pool for same-type temporary allocations|
|6.2|Mutex on a counter|Performance|sync/atomic for simple integer operations|
|6.3|JSON reflection in hot path|Performance|easyjson or sonic; profile before optimizing|
|6.5|Poor struct field ordering|Performance|fieldalignment tool; largest fields first|
|6.6|Standard log package under load|Performance|zap or zerolog for high-throughput logging|
|6.7|Slice without pre-allocation|Performance|make([]T, 0, cap) when size is known|
|7.1|Uber dispatch in Go|Architecture|goroutines + protobuf for concurrent dispatch|
|7.4|Dropbox Python → Go|Architecture|25× throughput; Go concurrency vs Python GIL|
|7.7|Monzo banking in Go|Architecture|Context + idempotency keys + go-money for financial correctness|
|8.1|Regex compiled in hot path|Profiling|Package-level var for compiled regex; pprof reveals it|
|8.3|Deadlock found via goroutine dump|Profiling|SIGQUIT dumps all goroutine stacks; consistent lock ordering|
|8.4|GOMAXPROCS=2 on 8-core machine|Profiling|Execution trace reveals scheduling latency|
|9.1|Race found only in production|Testing|go test -race in CI always|
|9.2|time.Sleep for test synchronization|Testing|Channels or WaitGroup for test sync; never Sleep|
|9.3|Goroutine leak between tests|Testing|t.Cleanup() + context cancel for all test resources|
|10.1|gRPC stream never closed|gRPC|Context timeout + keepalive for long-lived streams|
|10.2|Middleware swallowed errors|gRPC|Middleware must propagate original errors|
|10.3|No circuit breaker on slow downstream|gRPC|gobreaker for every synchronous downstream call|

---

_Total: 46 cases across 10 parts._

_The five most critical Go production rules:_ _1. Every goroutine that blocks must have a timeout or a cancellable context — goroutine leaks are memory leaks_ _2. Run go test -race in CI — always — data races cause bugs that appear 0.01% of the time in production_ _3. Never use http.DefaultClient or grpc.Dial per request — connection pools must be shared and long-lived_ _4. defer is function-scoped, not block-scoped — never defer resource cleanup inside a loop_ _5. context.Context must be checked, not just passed — cancellation is cooperative; nothing stops automatically_