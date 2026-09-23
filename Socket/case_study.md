# Socket & Real-Time — Complete Study & Failure Cases

> 11 Parts · 58 Cases — Real-world WebSocket, Socket.IO, TCP socket, and real-time system failure patterns, scaling studies, and production lessons for backend engineers.

---

## Part 1 — WebSocket Handshake & Connection Failures

### 1.1 WebSocket Upgrade Rejected by Proxy

- **What happens:** Client gets `400 Bad Request` or connection immediately closes when WebSocket is behind Nginx or AWS ALB — upgrade handshake silently dropped
- **Real pattern:** Nginx default config proxies HTTP/1.0, strips `Connection: Upgrade` and `Upgrade: websocket` headers — WebSocket handshake fails, client falls back to HTTP polling
- **Scale trigger:** Adding any reverse proxy (Nginx, HAProxy, Caddy) in front of a WebSocket server without explicit WebSocket config
- **Symptoms:** `WebSocket connection to 'wss://...' failed`, 101 Switching Protocols never received, Socket.IO silently uses HTTP long-polling fallback (slower, more overhead)
- **Solution:** Add to Nginx location block: `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host;`. For AWS ALB: use target group with `HTTP/1.1` protocol, enable stickiness, or use NLB for raw TCP pass-through.
- **Lesson:** Every proxy in the chain must explicitly support WebSocket upgrade. HTTP proxies don't inherit WebSocket support by default — it requires deliberate configuration.

---

### 1.2 TLS/SSL Termination Breaking WSS

- **What happens:** WebSocket works on `ws://` in development but `wss://` fails in production — TLS termination at load balancer not forwarding correctly
- **Real pattern:** Load balancer terminates TLS, forwards plain HTTP to backend. Backend serves `ws://`. Client tries `wss://`. Load balancer doesn't re-encrypt — protocol mismatch, connection refused or 502.
- **Scale trigger:** Production deployment with HTTPS/TLS, any environment with TLS offloading
- **Symptoms:** Works locally (no TLS), fails in production, mixed-content browser errors (`wss://` page trying `ws://` connection blocked)
- **Solution:** Backend only needs to serve `ws://` when TLS terminates at the load balancer — the LB handles TLS. Ensure backend WebSocket URL in client uses `wss://` (matching the public endpoint). Or terminate TLS at the app itself using `tls.Listen` in Go and serve `wss://` directly.
- **Lesson:** `wss://` is `ws://` over TLS. If TLS terminates at the load balancer, the backend serves `ws://` but clients connect via `wss://`. The LB bridges them.

---

### 1.3 WebSocket Handshake Timeout

- **What happens:** Client initiates WebSocket upgrade, server is slow to respond — connection times out at proxy layer before handshake completes
- **Real pattern:** Server-side handshake involves auth token validation + DB lookup taking 3 seconds. Nginx `proxy_read_timeout` defaults to 60s but `proxy_connect_timeout` defaults to 60s — actually fine. But AWS ALB idle timeout defaults to 60s and counts from request start, not connection establish.
- **Scale trigger:** Heavy auth logic in WebSocket upgrade handler, slow DB during peak, cold start of application
- **Symptoms:** Connection works most of the time, fails under load when DB is slow, `504 Gateway Timeout` on connection
- **Solution:** Move expensive auth out of the upgrade handler — validate JWT locally (no DB call) during handshake, load full user profile after connection established. Set generous proxy timeouts for WebSocket paths: `proxy_read_timeout 3600s` (WebSockets are long-lived). Separate timeout config for WebSocket paths vs regular HTTP.
- **Lesson:** WebSocket upgrade handlers should be fast — no DB calls, no external HTTP. Validate locally (JWT), load data asynchronously after connection is established.

---

### 1.4 CORS Misconfiguration on WebSocket

- **What happens:** WebSocket connection rejected with CORS error even though CORS is configured correctly for HTTP REST endpoints
- **Real pattern:** WebSocket upgrade is an HTTP request — browser sends `Origin` header. Server validates origin. Config allows `https://app.com` but client connects from `https://www.app.com` — origin mismatch, connection rejected.
- **Scale trigger:** Multiple frontend domains (www vs non-www), staging vs production origin mix-up, CDN changing origin
- **Symptoms:** `WebSocket connection blocked by CORS policy`, works in Postman (no Origin header), fails in browser
- **Solution:** In Go `gorilla/websocket`: `upgrader.CheckOrigin = func(r *http.Request) bool { return isAllowedOrigin(r.Header.Get("Origin")) }`. In Socket.IO Node: `cors: { origin: ["https://app.com", "https://www.app.com"] }`. Don't disable origin check entirely in production (`CheckOrigin: func(*http.Request) bool { return true }` is a security vulnerability).
- **Lesson:** WebSocket origin validation is a security control, not a bug. Maintain an explicit allowlist of origins. Never disable it in production.

---

### 1.5 HTTP/2 WebSocket Incompatibility

- **What happens:** Enabling HTTP/2 on the server breaks all WebSocket connections — WebSocket requires HTTP/1.1 upgrade which HTTP/2 doesn't support the same way
- **Real pattern:** Nginx configured with `http2` directive. All traffic upgrades to HTTP/2. WebSocket `Upgrade` mechanism is HTTP/1.1 specific — HTTP/2 uses `CONNECT` method (RFC 8441) which most implementations don't support.
- **Scale trigger:** Enabling HTTP/2 for performance, Nginx or CDN HTTP/2 config
- **Symptoms:** All WebSocket connections fail after enabling HTTP/2, REST API faster, real-time features completely broken
- **Solution:** Use separate server blocks or locations: HTTP/2 for static/REST paths, HTTP/1.1 for WebSocket paths. In Nginx: `location /socket.io/ { proxy_http_version 1.1; ... }` overrides HTTP/2 for that path. Or use HTTP/2 with WebSocket upgrade support (requires RFC 8441 support in both client and server — check compatibility).
- **Lesson:** WebSocket and HTTP/2 have compatibility nuances. Test WebSocket explicitly after any HTTP/2 configuration change.

---

## Part 2 — Connection Lifecycle Failures

### 2.1 Missing Heartbeat — Ghost Connections

- **What happens:** Client disconnects ungracefully (mobile network switch, browser tab crash) — server doesn't know connection is dead, holds resources for hours
- **Real pattern:** TCP connection appears open on server (OS still has socket state), client is gone. Server sends messages into the void. Connection count grows but no traffic flows. Eventually TCP keepalive closes it — but default TCP keepalive is 2 hours.
- **Scale trigger:** Mobile clients (frequent network switching), browser tabs closed without proper close event, NAT timeout dropping idle connections
- **Symptoms:** Connection count growing indefinitely, memory leak (per-connection state held), messages delivered to dead connections without error
- **Solution:** Implement application-level ping/pong: server sends `ping` frame every 25 seconds, expects `pong` within 10 seconds — if no pong, close the connection. In Go `gorilla/websocket`: `conn.SetReadDeadline(time.Now().Add(60 * time.Second))` and `conn.SetPongHandler(...)`. In Socket.IO: built-in ping/pong with `pingInterval` and `pingTimeout` config.
- **Lesson:** TCP keepalive is too slow for real-time applications. Implement application-level heartbeats — detect dead connections in seconds, not hours.

---

### 2.2 Goroutine Leak Per Connection

- **What happens:** Each WebSocket connection spawns goroutines that are never cleaned up when connection closes — goroutine count grows with connection churn, memory leak
- **Real pattern:** `go handleMessages(conn)` and `go readPump(conn)` started on connect. Connection closes. `readPump` exits on read error, but `handleMessages` blocks on a channel waiting for messages that will never come — leaked goroutine.
- **Scale trigger:** High connection churn (mobile clients reconnecting frequently), any WebSocket server with per-connection goroutines
- **Symptoms:** Goroutine count grows monotonically (`runtime.NumGoroutine()`), memory grows with connection count even after disconnect, eventual OOM
- **Solution:** Use `context.Context` with cancel for all per-connection goroutines: `ctx, cancel := context.WithCancel(context.Background())` — call `cancel()` in connection close handler. All goroutines select on `<-ctx.Done()` to exit. Or use done channel: `done := make(chan struct{})`, close it on disconnect.
- **Lesson:** Every goroutine spawned per connection must have a guaranteed exit path triggered by connection close. Context cancellation is the canonical Go pattern.

---

### 2.3 Write Deadlock — Concurrent Writes to WebSocket

- **What happens:** Two goroutines both write to the same WebSocket connection simultaneously — panic or data corruption because `gorilla/websocket` is not concurrent-write safe
- **Real pattern:** `conn.WriteMessage()` called from multiple goroutines (event dispatcher + ping sender + message handler). `gorilla/websocket` explicitly states: "Connections support one concurrent reader and one concurrent writer." Concurrent writes cause panic.
- **Scale trigger:** Any design where multiple goroutines can write to a single connection (common in pub/sub fan-out, ping goroutine + event goroutine)
- **Symptoms:** Intermittent panics: `concurrent write to websocket connection`, data corruption on client, connection drops
- **Solution:** Dedicated write goroutine per connection with a channel: `writeCh := make(chan []byte, 256)`. All senders push to channel. One goroutine reads from channel and calls `conn.WriteMessage()`. Serializes all writes without locking.
- **Lesson:** `gorilla/websocket` allows only one concurrent writer. Serialize writes through a buffered channel with a dedicated write goroutine.

---

### 2.4 Read Deadline Not Set — Connection Held Open Forever

- **What happens:** Client connects, sends no messages, server waits forever — malicious clients or network issues hold open thousands of zombie connections
- **Real pattern:** No `conn.SetReadDeadline()` set. Server's read loop `conn.ReadMessage()` blocks indefinitely. Attacker opens 10,000 connections, sends WebSocket upgrade but no messages — server holds 10,000 goroutines and connections indefinitely.
- **Scale trigger:** Public-facing WebSocket endpoint, any unauthenticated or slow-to-authenticate connection flow
- **Symptoms:** Connection count spikes without corresponding traffic, OOM under attack, legitimate users can't connect (file descriptor limit hit)
- **Solution:** Set read deadline immediately on connection: `conn.SetReadDeadline(time.Now().Add(10 * time.Second))`. Reset it on each received message (including pong): `conn.SetReadDeadline(time.Now().Add(pongWait))`. Connection that sends no messages in `pongWait` seconds is closed automatically.
- **Lesson:** Always set read deadlines on WebSocket connections. An undeadlined read is an indefinite goroutine block — a resource exhaustion vulnerability.

---

### 2.5 Connection Close Not Propagated — Resource Leak

- **What happens:** Server closes WebSocket connection but doesn't clean up connection registry, pub/sub subscriptions, or room membership — stale entries accumulate
- **Real pattern:** `hub.clients[conn] = true` on connect. Connection errors out, read loop exits. Nobody calls `hub.unregister <- conn`. Hub still tries to broadcast to closed connection, gets write errors, panics.
- **Scale trigger:** Any connection registry/hub pattern, pub/sub subscriptions, room membership tracking
- **Symptoms:** Write errors logged constantly, hub panics on closed connection write, stale subscriptions consuming memory
- **Solution:** Use deferred cleanup: `defer func() { hub.unregister <- conn; conn.Close() }()` at the top of the connection handler. Or use `context.Context` with a cleanup function. Ensure unregister is always called — not just on clean close but also on error.
- **Lesson:** Connection close must trigger cleanup of all associated state. Use `defer` in Go to guarantee cleanup regardless of how the connection exits.

---

## Part 3 — Scaling WebSocket Failures

### 3.1 Horizontal Scaling Without Shared State — Message Delivery Failure

- **What happens:** Socket.IO scaled to 3 instances, client A on instance 1 sends message to client B on instance 2 — B never receives it because instances don't share state
- **Real pattern:** `io.emit("message", data)` emits only to clients connected to the same Node.js process. With 3 instances behind a load balancer, 2/3 of target clients are on different instances.
- **Scale trigger:** Any horizontal scaling of Socket.IO or WebSocket servers beyond 1 instance
- **Symptoms:** Messages delivered to ~33% of intended recipients, non-deterministic delivery, bugs that disappear when testing with 1 instance
- **Solution:** Socket.IO Redis Adapter: `io.adapter(createAdapter(pubClient, subClient))` — all instances subscribe to Redis pub/sub. `io.emit()` publishes to Redis, all instances receive and deliver to their local clients. For raw WebSocket: implement pub/sub at application level (Redis, RabbitMQ).
- **Lesson:** WebSocket state (who is connected where) is per-process. Horizontal scaling requires an external pub/sub layer to coordinate message delivery across instances.

---

### 3.2 Sticky Sessions Required But Not Configured

- **What happens:** Socket.IO HTTP long-polling fallback breaks on round-robin load balancer — each polling request hits different server, server can't find session
- **Real pattern:** Socket.IO polling mode sends multiple HTTP requests per logical connection. Request 1 → Server A (creates session). Request 2 → Server B (no session found) → 400 error → reconnect loop.
- **Scale trigger:** Multiple Socket.IO instances, load balancer without sticky sessions, Socket.IO not forced to WebSocket-only
- **Symptoms:** Constant reconnection loops in client logs, `Session ID unknown` errors server-side, high HTTP polling traffic with no successful data exchange
- **Solution:** Option 1: Enable sticky sessions (IP hash or cookie-based) in load balancer — same client always hits same server. Option 2 (preferred): Force WebSocket transport only: `socket.io({ transports: ['websocket'] })` — eliminates polling, eliminates the need for sticky sessions. Option 3: Use Redis adapter which handles cross-server session state.
- **Lesson:** Socket.IO HTTP fallback requires sticky sessions. Force WebSocket-only transport in production to eliminate this entire class of problems.

---

### 3.3 File Descriptor Limit — Connections Rejected at Scale

- **What happens:** WebSocket server rejects new connections with `too many open files` when concurrent connections exceed OS file descriptor limit
- **Real pattern:** Linux default `ulimit -n` = 1024 per process. Each WebSocket connection = 1 file descriptor. At connection 1025, `accept()` fails: `EMFILE: too many open files`. New clients can't connect.
- **Scale trigger:** Any WebSocket server approaching 1000 concurrent connections on default Linux config
- **Symptoms:** `Error: EMFILE, too many open files` in server logs, new connections refused while existing ones work, scales to exactly 1024 then stops
- **Solution:** Increase file descriptor limit: `ulimit -n 65535` (session), set permanently in `/etc/security/limits.conf`: `* soft nofile 65535` and `* hard nofile 65535`. For Docker: `--ulimit nofile=65535:65535`. Plan capacity: 10K connections needs `ulimit -n 20000` (buffer for file handles, sockets, logs).
- **Lesson:** Default Linux file descriptor limit (1024) caps WebSocket concurrency at ~1000. This must be raised before production deployment. It's a known ceiling, not a bug.

---

### 3.4 Memory Per Connection Not Accounted For

- **What happens:** Server handles 10K connections fine, but at 50K connections OOM killed — nobody calculated per-connection memory overhead
- **Real pattern:** Each WebSocket connection in Node.js: ~50 KB overhead (read buffer + write buffer + socket object + event emitter). 50K connections × 50 KB = 2.5 GB just for connection overhead, before any application state.
- **Scale trigger:** Scaling beyond initial tested connection count, mobile apps (users keep connection open all day)
- **Symptoms:** Memory grows linearly with connection count, OOM at a specific connection number, no memory leak — just underestimated baseline cost
- **Solution:** Benchmark memory per connection before capacity planning: connect N clients, measure `process.memoryUsage()` or `docker stats`, divide. For Go: goroutine stack (2–8 KB) + read/write buffers (4 KB each) + app state. Set `maxmemory` alerts proportional to expected connection count.
- **Lesson:** WebSocket connections are not free. Measure memory cost per connection and size servers accordingly. 10K connections on a 512 MB server is not realistic.

---

### 3.5 CPU Bottleneck from JSON Serialization at Scale

- **What happens:** Broadcasting large JSON payloads to 10K connections saturates CPU — server can't keep up with serialization, message delivery falls behind
- **Real pattern:** `io.emit("update", largeObject)` — Socket.IO serializes the object once per connected client (or once with the adapter, but still heavy). 10K clients × 5 KB JSON × 10 broadcasts/sec = 500 MB/sec of serialization work.
- **Scale trigger:** High-frequency broadcasts to large numbers of connected clients, large message payloads
- **Symptoms:** CPU at 100%, message delivery lag growing over time, broadcast queue backing up
- **Solution:** Serialize once, send many: `const data = JSON.stringify(payload)` then `io.emit("update", data)` (send pre-serialized string). Use binary protocols (MessagePack, protobuf) for large frequent messages — 2–5× smaller, faster to serialize. Reduce broadcast frequency with delta updates (only send what changed).
- **Lesson:** Don't serialize inside the broadcast loop. Serialize once, distribute the bytes. Binary protocols compound the benefit at scale.

---

## Part 4 — Socket.IO Specific Failures

### 4.1 Room Memory Leak — Rooms Never Cleaned Up

- **What happens:** `socket.join(roomId)` called per user action but `socket.leave(roomId)` never called — room registry grows indefinitely with empty rooms
- **Real pattern:** Chat app creates room per conversation: `socket.join("chat:456")`. User closes chat but socket stays connected. Room `chat:456` stays in memory with 0 active members consuming room registry space. After a week: 100K ghost rooms.
- **Scale trigger:** Dynamic room creation (per-conversation, per-game, per-document), long-lived connections, users switching between many rooms
- **Symptoms:** Memory growing over time despite stable connection count, room count growing indefinitely in metrics
- **Solution:** Explicit cleanup: `socket.leave(roomId)` when user leaves context. On disconnect: Socket.IO auto-removes the socket from all rooms — but the room registry entry persists if other sockets reference it. For empty rooms: check `io.sockets.adapter.rooms.get(roomId)?.size === 0` after last member leaves and clean up associated metadata.
- **Lesson:** Socket.IO auto-removes a socket from rooms on disconnect, but room metadata you track externally is not auto-cleaned. Own your cleanup.

---

### 4.2 Event Name Collision — Silent Message Routing Failure

- **What happens:** Client and server both emit events named `"message"` — handler receives its own echoed event, creating infinite loop
- **Real pattern:** Server emits `socket.emit("message", data)`. Client has `socket.on("message", handler)` which calls `socket.emit("message", response)`. Server receives its own event back, re-emits, loop.
- **Scale trigger:** Generic event names (`message`, `data`, `update`, `event`) reused for multiple purposes
- **Symptoms:** Infinite message loop, event handler called exponentially, server CPU spikes, connection eventually killed by message rate limit
- **Solution:** Use namespaced event names: `"chat:message"`, `"game:state:update"`, `"notification:new"`. Document all event names in a shared schema file. Use TypeScript discriminated union types for event payloads to catch naming conflicts at compile time.
- **Lesson:** Socket.IO events share a flat namespace. Generic names cause collisions. Namespace all event names with the domain they belong to.

---

### 4.3 Acknowledgement Callback Memory Leak

- **What happens:** `socket.emit("event", data, callback)` used for request-response — client disconnects before acknowledging, callback held in memory forever
- **Real pattern:** Server emits with ack: `socket.emit("sync", payload, (response) => { ... })`. Client disconnects. Callback registered in Socket.IO's internal ack map — never called, never cleaned up. After millions of such emits: memory leak.
- **Scale trigger:** High-frequency request-response pattern using ack callbacks, unreliable clients (mobile), long-lived connections
- **Symptoms:** Memory grows proportional to unacknowledged message count, never releases
- **Solution:** Use acknowledgement timeout: `socket.timeout(5000).emit("sync", payload, (err, response) => { if (err) { /* timeout */ } })`. Socket.IO v4 supports timeout on ack. Or implement at application level: store ack callbacks with timestamp, clean up after N seconds in a setInterval sweep.
- **Lesson:** Acknowledgement callbacks without timeouts leak memory when the client disconnects. Always set a timeout on acks or implement a sweep to clean up stale ones.

---

### 4.4 Namespace Isolation Not Enforced

- **What happens:** Admin namespace events leaking to regular users because namespace authentication not properly implemented
- **Real pattern:** `/admin` namespace created: `io.of("/admin")`. Namespace middleware only checks if user is authenticated (not if they're admin). Any logged-in user can connect to `/admin` and receive admin events.
- **Scale trigger:** Any multi-role application with privileged namespaces or rooms
- **Symptoms:** Regular users receiving admin broadcasts, privilege escalation, data leak
- **Solution:** Namespace middleware must check role, not just auth: `io.of("/admin").use((socket, next) => { if (socket.user.role !== "admin") return next(new Error("Unauthorized")); next(); })`. Test with non-admin credentials explicitly. Separate namespaces for separate trust levels.
- **Lesson:** Socket.IO namespace existence does not imply authorization. Implement role-based middleware on every privileged namespace — authentication and authorization are separate checks.

---

### 4.5 Socket.IO Version Mismatch — Client/Server Incompatibility

- **What happens:** Client uses Socket.IO v2, server upgraded to v4 — connections establish but events not received, silent failure
- **Real pattern:** Socket.IO v3/v4 changed the protocol — v2 client and v3/v4 server are not compatible. Both sides appear connected but events don't route correctly.
- **Scale trigger:** Server-side dependency upgrade without coordinating client update, mobile apps (slow to update), embedded clients
- **Symptoms:** Connection appears successful (no error), but events never fire, no error messages, very hard to debug
- **Solution:** Pin Socket.IO versions in both client and server. When upgrading server, use `allowEIO3: true` option to support v2 clients during transition. Coordinate client and server upgrades or run multiple server versions during migration.
- **Lesson:** Socket.IO protocol versions are not backward compatible. Treat client and server Socket.IO versions as a matched pair. Upgrade both together or explicitly support legacy clients.

---

## Part 5 — Message Delivery & Ordering Failures

### 5.1 No Message Ordering Guarantee

- **What happens:** Messages sent in order 1, 2, 3 arrive at client as 1, 3, 2 — UI shows out-of-order chat messages, game state corruption
- **Real pattern:** Messages routed through Redis pub/sub across multiple Socket.IO instances. Instance A processes message 1 slowly (DB lookup), instance B processes message 2 quickly. Message 2 delivered before message 1.
- **Scale trigger:** Multi-instance deployment with Redis adapter, any async processing before delivery
- **Symptoms:** Out-of-order messages in chat, game state rollback issues, UI flickers with incorrect intermediate states
- **Solution:** Add sequence number to every message: `{ seq: monotonically_increasing_id, data: ... }`. Client buffers out-of-order messages and reorders before rendering. Use Redis INCR for global sequence per channel. Or use Kafka (strict partition ordering) instead of pub/sub for ordered streams.
- **Lesson:** Pub/sub systems don't guarantee order across multiple producers. If order matters, add sequence numbers and handle reordering at the client.

---

### 5.2 At-Most-Once vs At-Least-Once — Message Loss

- **What happens:** Server emits event to client that's momentarily disconnected — event lost, no retry, client misses critical update
- **Real pattern:** `socket.emit("order:status", update)` fired once when order ships. Client app backgrounded on mobile, Socket.IO disconnects. Client reconnects 30 seconds later — order status event already fired, never received, client shows wrong status indefinitely.
- **Scale trigger:** Mobile clients (frequent disconnects), transient network issues, any "fire and forget" emit for critical state
- **Symptoms:** Clients miss state updates on reconnect, stale UI persists after reconnect, users don't see important notifications
- **Solution:** Separate critical state from real-time events. On reconnect: always re-fetch current state from REST API, don't rely on receiving missed WebSocket events. For event replay: store last N events per channel in Redis List, client sends `lastSeq` on reconnect, server replays missed events.
- **Lesson:** WebSocket event delivery is at-most-once. Design critical state to be fetchable on demand — don't rely on event delivery for state that must be consistent.

---

### 5.3 Broadcast Storm — Fan-out Feedback Loop

- **What happens:** Server broadcasts state update to room → client receives update → client emits "ack" event → server broadcasts again → loop
- **Real pattern:** Collaborative document editor: server broadcasts doc change to room, each client sends `cursor:update` on receiving change, server broadcasts all cursor updates to room, which triggers more cursor updates.
- **Scale trigger:** Rooms with many connected clients, any feedback loop between server broadcast and client response
- **Symptoms:** Message rate grows exponentially, server CPU maxed, clients receive hundreds of messages per second instead of tens
- **Solution:** Break the loop: use `socket.broadcast.to(room).emit()` (excludes sender) instead of `io.to(room).emit()` (includes sender). Throttle client emissions with debounce (100ms). Server-side rate limit per socket. Separate state sync channels from reaction channels.
- **Lesson:** Broadcast → client response → broadcast is a feedback loop waiting to happen. Every real-time system needs explicit loop-breaking design: exclude sender, throttle, or separate channels.

---

### 5.4 Large Message Fragmentation

- **What happens:** Sending 10 MB binary blob over WebSocket — connection drops mid-transfer, partial data received, client crashes trying to parse incomplete message
- **Real pattern:** Sending initial game state (all entity positions) as one large JSON: `socket.emit("gameState", allEntities)`. 10 MB message fragmented across many WebSocket frames. Proxy timeout kills connection mid-transfer.
- **Scale trigger:** Large initial state sync, bulk data transfer over WebSocket, file upload via WebSocket
- **Symptoms:** Connections drop on large messages, clients receive malformed partial data, proxy logs show timeout on large transfers
- **Solution:** Never send large payloads over WebSocket. Paginate initial state (send first 100 entities, client requests more). For files/large data: use HTTP multipart upload + WebSocket for progress events. If large message unavoidable: implement chunking at application level with chunk acknowledgements.
- **Lesson:** WebSocket is designed for small, frequent messages — not large payload transfer. Split large payloads or use HTTP for bulk data.

---

### 5.5 Message Queue Backpressure Not Handled

- **What happens:** Server produces messages faster than client consumes them — write buffer fills, server memory grows, eventual OOM or connection drop
- **Real pattern:** Market data feed: server pushes 1000 price updates/sec to client. Client processes 100/sec. Goroutine write channel fills (buffered at 256): `writeCh <- msg` blocks. Sender goroutine stuck. All other operations on that connection stall.
- **Scale trigger:** High-frequency data feeds, slow clients (mobile, poor network), server pushing faster than client can consume
- **Symptoms:** Memory growing per connection, write channel blocks causing other goroutines to hang, connection eventually killed by write timeout
- **Solution:** Drop old messages when buffer full (for real-time data where old = stale): `select { case writeCh <- msg: default: /* drop old message */ }`. Or use ring buffer: always keep latest N messages. Add backpressure signal: if write buffer > 80% full, reduce message rate for that client. Never use unbounded channels.
- **Lesson:** Producers must respect consumer speed. For real-time data (prices, game state), drop stale messages rather than buffer them — old data is worse than no data.

---

## Part 6 — Authentication & Authorization Failures

### 6.1 Token Expiry Not Handled on Long-Lived Connections

- **What happens:** User's JWT expires after 1 hour, but WebSocket connection opened 2 hours ago is still active — all subsequent operations use an expired token
- **Real pattern:** Token validated only on WebSocket handshake (connection establishment). Connection lives for 8 hours (user has tab open all day). Token expired at hour 1. Operations at hour 4 use expired token — backend doesn't re-check.
- **Scale trigger:** Long-lived WebSocket connections (typical for real-time apps), any token with expiry shorter than expected session duration
- **Symptoms:** Users performing actions with expired credentials, security audit failure, "ghost" sessions after user account deactivated
- **Solution:** Re-validate token periodically on the server: on each message received, check token expiry. Or: client refreshes token before expiry and sends `auth:refresh` event with new token. Server updates socket auth state. On token validation failure: emit `auth:expired` event and close connection gracefully.
- **Lesson:** Authentication in WebSocket is not a one-time event at handshake. For long-lived connections, re-validate credentials periodically.

---

### 6.2 Unauthenticated Event Handlers

- **What happens:** Socket.IO event handlers execute without checking if the socket is authenticated — any connected client can trigger any event
- **Real pattern:** Auth middleware runs on connection. But individual event handlers (`socket.on("deleteUser", ...)`) don't re-check auth. Attacker connects, middleware passes (they're "authenticated"), but their session was invalidated — they can still call all event handlers.
- **Scale trigger:** Complex event routing, post-connect session invalidation (logout, ban, password change)
- **Symptoms:** Invalidated users still able to perform actions, privilege escalation via stale session
- **Solution:** Check auth on every sensitive event handler, not just on connect: `socket.on("deleteUser", async (data) => { if (!await isValidSession(socket.userId)) return; ... })`. Or implement per-event middleware: `socket.use((event, next) => { if (!socket.authenticated) return next(new Error("Unauthorized")); next(); })`.
- **Lesson:** Connection-time auth is necessary but not sufficient. Re-validate on sensitive operations — sessions can be invalidated after connection is established.

---

### 6.3 User ID Spoofing in Events

- **What happens:** Client sends `{ userId: 999, action: "deletePost" }` — server trusts the userId in the payload, user deletes someone else's post
- **Real pattern:** Server handler: `socket.on("deletePost", ({ userId, postId }) => { db.delete(postId, userId) })`. Attacker sends any userId. Server doesn't verify that `userId` matches the authenticated socket's user.
- **Scale trigger:** Any event where client sends identity in the payload, any action performed on behalf of a user
- **Symptoms:** Horizontal privilege escalation, IDOR vulnerabilities, users modifying other users' data
- **Solution:** Never trust user identity from event payload. Use identity from the authenticated socket: `socket.on("deletePost", ({ postId }) => { db.delete(postId, socket.userId) })`. `socket.userId` is set server-side during auth middleware — client cannot spoof it.
- **Lesson:** Identity must come from the server-side socket context (set during auth), never from client-sent event payload. This is the WebSocket equivalent of IDOR.

---

### 6.4 Broadcast to Wrong Room — Data Leak

- **What happens:** Server broadcasts private user data to a room but room ID comes from untrusted client — client supplies another user's room ID, receives their private data
- **Real pattern:** `socket.on("joinRoom", ({ roomId }) => { socket.join(roomId) })`. No validation that this user is authorized to join `roomId`. User joins `"private:user:999"` and receives that user's private events.
- **Scale trigger:** Any room-based system where room IDs are predictable or user-supplied
- **Symptoms:** Users receiving other users' private events, data leak via room manipulation
- **Solution:** Validate room membership server-side before join: `socket.on("joinRoom", async ({ roomId }) => { const allowed = await canJoinRoom(socket.userId, roomId); if (!allowed) return; socket.join(roomId); })`. Generate room IDs with crypto-random tokens, not sequential IDs. Never trust client-supplied room IDs for private data.
- **Lesson:** Room join requests are access control decisions. Always validate server-side. Client-supplied room IDs are untrusted input.

---

## Part 7 — TCP Socket Failures

### 7.1 Half-Open TCP Connection

- **What happens:** One side of TCP connection crashes, other side doesn't know — reads block forever, connection appears "open" but is dead
- **Real pattern:** Database server reboots. Go service has existing TCP connections to DB. From Go's perspective, connections are open (no FIN received during hard reboot). `db.Query()` blocks indefinitely on read — waiting for response that will never come.
- **Scale trigger:** Hard server crashes (power loss, OOM kill, kernel panic), network partition, NAT state timeout
- **Symptoms:** Goroutines stuck in DB query forever, connection pool appears available but all connections dead, request timeouts at application layer
- **Solution:** Set `SetDeadline` on all TCP connections: `conn.SetDeadline(time.Now().Add(30 * time.Second))`. For database pools: configure connection health checks (`db.SetConnMaxLifetime(5*time.Minute)`). Enable TCP keepalive: `tcpConn.SetKeepAlive(true); tcpConn.SetKeepAlivePeriod(30*time.Second)`.
- **Lesson:** TCP half-open connections are invisible to application code. Always set read/write deadlines and enable TCP keepalive to detect dead connections.

---

### 7.2 TCP TIME_WAIT Port Exhaustion

- **What happens:** Short-lived TCP connections exhausted all 65535 ephemeral ports — new connections fail with `cannot assign requested address`
- **Real pattern:** HTTP client making many short-lived connections (no keep-alive). Each connection leaves a socket in TIME_WAIT for 60 seconds. 1000 req/s × 60s TIME_WAIT = 60,000 ports in TIME_WAIT. Ephemeral port range (32768–60999 = 28231 ports) exhausted.
- **Scale trigger:** High-rate HTTP clients without connection reuse, microservices making many short-lived outbound connections
- **Symptoms:** `dial tcp: connect: cannot assign requested address`, high `TIME_WAIT` count in `ss -s`, only outbound connections affected
- **Solution:** Reuse connections (HTTP keep-alive, connection pooling). In Go: set `http.Transport.MaxIdleConnsPerHost`. Enable `SO_REUSEADDR`. Tune kernel: `net.ipv4.tcp_tw_reuse=1`, `net.ipv4.ip_local_port_range=1024 65535`. Use fewer, longer-lived connections.
- **Lesson:** TIME_WAIT is TCP's safety mechanism, not a bug. The fix is connection reuse, not disabling TIME_WAIT. Pool connections for high-frequency outbound HTTP.

---

### 7.3 Nagle's Algorithm Causing Latency

- **What happens:** Small WebSocket messages (game input, cursor position) experience 40ms latency — Nagle's algorithm batching small writes
- **Real pattern:** Nagle's algorithm holds small TCP segments waiting to combine them (reduces packet count). For real-time apps sending small frequent messages, this adds up to 200ms artificial latency.
- **Scale trigger:** Real-time applications sending small frequent messages (< 1 KB), gaming, collaborative tools, live cursors
- **Symptoms:** Consistent 40–200ms extra latency on small messages, latency disappears on large messages, delay is suspiciously round (40ms = typical Nagle wait)
- **Solution:** Disable Nagle's algorithm for real-time sockets: `tcpConn.SetNoDelay(true)`. This sets `TCP_NODELAY`. WebSocket libraries often do this by default — verify. Tradeoff: more TCP packets, slightly higher bandwidth usage, dramatically lower latency.
- **Lesson:** Nagle's algorithm optimizes for throughput, not latency. Real-time applications need `TCP_NODELAY`. Check if your WebSocket library sets it by default.

---

### 7.4 Slow Consumer — Receive Buffer Fills

- **What happens:** Slow client causes server-side send buffer to fill — `conn.Write()` blocks in Go, goroutine stuck, server can't process other connections on same goroutine
- **Real pattern:** Server sends data to client on slow mobile connection. TCP send buffer fills (default 212 KB). `conn.Write()` blocks waiting for client to ACK and free buffer space. Write goroutine stuck indefinitely.
- **Scale trigger:** Slow clients (mobile on 2G), large message payloads, any blocking write without deadline
- **Symptoms:** Write goroutines accumulate over time, memory grows with blocked goroutines, other operations on same connection stall
- **Solution:** Always use `conn.SetWriteDeadline(time.Now().Add(10 * time.Second))` before every write. If write times out, close the connection — slow clients are dropped rather than blocking the server. Tune `SO_SNDBUF` for expected throughput.
- **Lesson:** A slow client will block your write goroutine indefinitely without a write deadline. Write deadlines are as important as read deadlines.

---

## Part 8 — Real-Time System Design Failures

### 8.1 Polling Instead of Push — Wasted Resources

- **What happens:** Frontend polls `GET /api/notifications` every 2 seconds — 50,000 users × 30 polls/min = 1.5M requests/min for data that rarely changes
- **Real pattern:** No WebSocket implementation, frontend uses `setInterval` to check for updates. 99% of poll responses are `[]` (no new data). Database hit on every poll. Entire backend load is wasted "any updates?" traffic.
- **Scale trigger:** Any "real-time" feature implemented with polling, growing user base
- **Symptoms:** API call volume dominated by polling requests, DB reads mostly returning empty results, high infrastructure cost for near-zero user value per request
- **Solution:** Replace polling with WebSocket push: server emits `notification:new` only when there's actually a notification. Zero requests when nothing changes. For simpler cases without full WebSocket: Server-Sent Events (SSE) for server-to-client push with no client library needed.
- **Lesson:** Polling is a tax paid on every user every second. Push architecture pays only when something happens. The difference scales linearly with users and inversely with event frequency.

---

### 8.2 Presence System — Wrong Architecture

- **What happens:** "Online users" feature implemented with DB writes on connect/disconnect — at 10K concurrent connections, online/offline churn causes 100s of DB writes/sec
- **Real pattern:** `UPDATE users SET online=true WHERE id=?` on connect. `UPDATE users SET online=false WHERE id=?` on disconnect. Mobile users (frequent reconnect cycles): 10 connect/disconnect per minute × 10K users = 100K DB writes/min. DB bottleneck.
- **Scale trigger:** Mobile clients (high churn), any system tracking presence at DB layer
- **Symptoms:** DB write load proportional to connection churn, DB CPU high on presence updates, online status slightly inaccurate during disconnect storms
- **Solution:** Presence in Redis, not DB: `SETEX presence:user:123 30 1` — key exists = online, TTL = 30s. Client sends heartbeat every 15s to refresh TTL. On heartbeat miss, user appears offline automatically (TTL expiry). DB writes only for persistent profile changes, not ephemeral presence. Check presence: `EXISTS presence:user:123`.
- **Lesson:** Presence is ephemeral state — it belongs in Redis with TTL-based expiry, not in the database. DB is for durable state; Redis is for "right now" state.

---

### 8.3 Live Collaboration — Conflict Resolution Not Designed

- **What happens:** Two users edit same document simultaneously — both changes applied in order received by server, second change overwrites first, first user's work lost
- **Real pattern:** User A changes paragraph 1. User B changes paragraph 1 simultaneously. Server receives A's change, applies it. Server receives B's change, applies it — overwrites A's. A sees their change disappear. Classic last-write-wins with no conflict detection.
- **Scale trigger:** Any collaborative editing feature, shared whiteboards, multi-user forms
- **Symptoms:** Edits silently overwrite each other, users see their changes disappear, frustrating UX
- **Solution:** Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs): operations defined as transformable (insert at position X → transform against concurrent insert → correct position). Libraries: `yjs` (CRDT), `ShareDB` (OT). At minimum: vector clocks to detect conflicts and prompt user resolution.
- **Lesson:** Last-write-wins is not a collaboration strategy — it's data loss. Collaborative editing requires OT or CRDTs. Design conflict resolution before building the real-time layer.

---

### 8.4 Real-Time Leaderboard — Database Read Bottleneck

- **What happens:** Leaderboard updated in real-time pushed to all connected clients on every score change — 100 score changes/sec × DB query for top 10 = 100 heavy queries/sec
- **Real pattern:** `socket.on("scoreUpdate", async () => { const top10 = await db.query("SELECT ... ORDER BY score DESC LIMIT 10"); io.emit("leaderboard", top10) })`. At scale, every score update triggers a full sorted query.
- **Scale trigger:** High score change frequency, growing player base, any "live" sorted list
- **Symptoms:** DB CPU dominated by leaderboard queries, query time increasing as dataset grows, real-time updates causing DB overload
- **Solution:** Redis Sorted Set (`ZADD`, `ZREVRANGE`): `ZADD leaderboard score userId`, `ZREVRANGE leaderboard 0 9 WITHSCORES` — O(log N) insert, O(log N + K) range query, no DB. Update leaderboard in Redis on score change, push Redis-derived leaderboard to clients. Persist to DB asynchronously (not in the hot path).
- **Lesson:** Real-time leaderboards belong in Redis Sorted Sets, not relational DB. Redis was designed for this exact use case — O(log N) ranked operations.

---

### 8.5 Typing Indicator Flooding

- **What happens:** `"userTyping"` event emitted on every keypress — 10 active conversations × 5 users typing × 10 keypresses/sec = 500 WebSocket events/sec for typing indicators alone
- **Real pattern:** `input.addEventListener("keypress", () => socket.emit("typing", { roomId }))`. No debounce. Every keystroke = network event. With many active chats, typing traffic overwhelms the real message traffic.
- **Scale trigger:** Multiple active conversations, fast typists, any real-time input feedback without throttling
- **Symptoms:** High WebSocket event volume dominated by typing events, network traffic high, server event processing bottlenecked on typing noise
- **Solution:** Debounce typing events client-side: emit `typing:start` on first keypress, `typing:stop` after 2 seconds of inactivity. Server only broadcasts once per start/stop cycle, not per keypress. Rate limit on server: ignore typing events more frequent than 1 per second per user per room.
- **Lesson:** UI interaction events (typing, cursor move, scroll) must be debounced/throttled before emitting over WebSocket. Never emit per-keystroke.

---

## Part 9 — Connection Recovery Failures

### 9.1 Reconnect Without Exponential Backoff — Reconnect Storm

- **What happens:** Server goes down for 30 seconds — all 50K clients reconnect simultaneously the moment server comes back up — server immediately overwhelmed and crashes again
- **Real pattern:** Socket.IO default reconnect: tries every 1 second. 50K clients × 1 reconnect/sec when server returns = 50K connections in the first second. Server can handle 5K connections/sec. Server overwhelmed, crashes, clients retry, repeat.
- **Scale trigger:** Any service restart affecting many connected clients, deployment, crash recovery
- **Symptoms:** Server crashes in a loop on restart, never fully recovers, requires traffic shedding to stabilize
- **Solution:** Exponential backoff with jitter: `reconnectionDelay: 1000, reconnectionDelayMax: 30000, randomizationFactor: 0.5`. Reconnect wait = min(1s × 2^attempt, 30s) ± 50% jitter. 50K clients spread reconnects over 30 seconds instead of 1 second. Server can absorb the gradual reconnect curve.
- **Lesson:** Simultaneous reconnect is a self-inflicted DDoS. Exponential backoff with jitter is the only safe reconnect strategy at scale. Configure it before going to production.

---

### 9.2 State Sync on Reconnect — Missed Events Gap

- **What happens:** Client reconnects after 30-second outage — resumes listening for new events but never receives the events that happened during disconnection
- **Real pattern:** Client subscribed to `"order:updated"`. Disconnected at T=0. Order updated at T=10s and T=20s. Reconnected at T=30s. Events at T=10 and T=20 — gone. Client shows stale order status.
- **Scale trigger:** Any client disconnect, mobile backgrounding, network switch, browser tab sleep
- **Symptoms:** Stale UI persists after reconnect, users have to manually refresh to see updates, critical state updates missed
- **Solution:** On reconnect, always re-fetch current state via REST: `socket.on("connect", async () => { const state = await fetch("/api/state"); updateUI(state) })`. Design state to be fetchable — don't rely on event stream completeness. For event replay: store last N events per topic in Redis List, client sends `lastEventId` on reconnect, server replays from that point.
- **Lesson:** Reconnect ≠ resume. Always treat reconnect as a fresh start: re-fetch authoritative state from REST API before relying on new WebSocket events.

---

### 9.3 Client-Side Memory Leak on Reconnect

- **What happens:** Event listeners added on each reconnect without removing previous ones — after 10 reconnects, each event fires 10 times
- **Real pattern:** `socket.on("connect", () => { socket.on("message", handleMessage) })`. Each reconnect adds another `"message"` handler without removing the previous. After 10 reconnects: `handleMessage` called 10 times per message.
- **Scale trigger:** Long-running single-page apps, unstable connections (mobile), frequent reconnects
- **Symptoms:** Event handlers called multiple times, duplicate UI updates, memory growing with reconnect count, `handleMessage` running in parallel instances
- **Solution:** Register event handlers once, outside the `connect` handler. Or: remove listener before adding: `socket.off("message", handleMessage); socket.on("message", handleMessage)`. Socket.IO's `socket.once()` for one-time handlers. Structure: register all handlers at connection setup, not inside reconnect callbacks.
- **Lesson:** Event listeners accumulate on reconnect if not removed. Register socket event handlers once at setup, not inside connect/reconnect callbacks.

---

## Part 10 — Performance Optimization Cases

### 10.1 Binary Data vs JSON — Bandwidth Reduction

- **What happens:** Game server sending 60 position updates/sec per player in JSON — 2 KB per update × 1000 players = 2 MB/sec of JSON for position data alone
- **Real pattern:** `{ "playerId": "abc123", "x": 123.456, "y": 789.012, "rotation": 45.0, "timestamp": 1234567890 }` — 85 bytes of JSON for 4 floats + ID + timestamp. Same data in binary: 24 bytes (4 bytes × 4 numbers + 8 bytes timestamp).
- **Scale trigger:** High-frequency numeric data (games, IoT, financial), large number of connected clients
- **Symptoms:** High bandwidth cost, serialization CPU bottleneck, message latency from serialization time
- **Solution:** Use binary protocol: ArrayBuffer/TypedArray in browser, `[]byte` in Go. Or MessagePack (`msgpack` library): same structure as JSON but binary encoded — 30–50% smaller. For fixed-format data: manual binary packing with `DataView` / `binary.Write` in Go. Enable `perMessageDeflate` WebSocket compression for text data.
- **Lesson:** JSON is developer-friendly, not bandwidth-friendly. For high-frequency numeric data, binary encoding gives 3–5× bandwidth reduction with lower CPU cost.

---

### 10.2 Per-Event Database Query — The WebSocket N+1

- **What happens:** Every WebSocket event triggers a permission check DB query — 1000 events/sec = 1000 permission queries/sec on critical path
- **Real pattern:** `socket.on("*", async (event) => { const perms = await db.query("SELECT permissions FROM users WHERE id=?", socket.userId); if (!perms.includes(event)) return; })`. Permission check on every event, every time.
- **Scale trigger:** High event rate, large number of connected users, per-event auth middleware
- **Symptoms:** DB CPU dominated by permission queries, event handling latency proportional to DB latency, tight DB-WebSocket coupling
- **Solution:** Cache permissions in socket context on connect: `socket.permissions = await loadPermissions(userId)` — cached for connection lifetime. Refresh on permission change event (Redis pub/sub). Per-event DB query eliminated from hot path. Permission cache TTL = connection lifetime (re-loaded on reconnect).
- **Lesson:** Cache user permissions (and any auth data) in the socket context at connect time. The WebSocket hot path must not touch the database on every event.

---

### 10.3 Sending Full State on Every Update — Delta Updates

- **What happens:** Collaborative document broadcasts entire document on every keystroke — 100 KB document × 10 users typing × 10 changes/sec = 10 MB/sec of redundant data
- **Real pattern:** `io.to(docRoom).emit("docUpdate", fullDocument)`. Only 5 characters changed but entire 100 KB document sent to all users on every change.
- **Scale trigger:** Large shared state, frequent small updates, multiple collaborating users
- **Symptoms:** Bandwidth dominated by redundant state, client-side re-renders entire document on every keystroke, poor UX (cursor jumping)
- **Solution:** Send only the delta (what changed): `{ op: "insert", position: 42, chars: "hello" }`. Client applies delta to local state. Delta is 30 bytes instead of 100 KB — 3000× reduction. Use OT or CRDT delta format. For non-collaborative state: `JSON Patch` (RFC 6902) for structured diffs.
- **Lesson:** Never broadcast full state when only a delta changed. Calculate and send the minimum diff. This is the difference between a scalable real-time system and one that can't support 10 concurrent users.

---

## Part 11 — Production Monitoring & Ops Cases

### 11.1 No WebSocket Metrics — Flying Blind

- **What happens:** WebSocket server has issues but no metrics — can't tell if problem is connection count, message rate, error rate, or latency
- **Real pattern:** Standard HTTP metrics (request count, latency) don't apply to WebSockets. No instrumentation added. When users report issues, no data to diagnose — can't tell if it's 100 connections or 100,000, can't see message delivery failures.
- **Scale trigger:** Any production WebSocket deployment without monitoring
- **Symptoms:** Reactive debugging, user-reported issues with no data, can't distinguish connection problem from message delivery problem
- **Solution:** Instrument: (1) Current connection count gauge, (2) Connect/disconnect rate (churn), (3) Message send/receive rate per event type, (4) Write error rate, (5) Heartbeat timeout rate (proxy for network quality), (6) Room/subscription count. Expose as Prometheus metrics. Alert on: connection count drop > 20%, error rate > 1%, heartbeat timeout rate > 5%.
- **Lesson:** WebSocket servers need their own metrics. HTTP metrics don't capture connection lifecycle, event rates, or real-time delivery health. Instrument before going to production.

---

### 11.2 WebSocket Load Testing — Not Done Before Launch

- **What happens:** Production launch with 10K concurrent users — WebSocket server falls over at 2K connections, nobody tested concurrent connection load
- **Real pattern:** Unit tests test message handling. Integration tests test one connection. Nobody tested 10,000 simultaneous connections. Launch day: connection storm, file descriptor exhaustion, OOM, outage.
- **Scale trigger:** Any production launch, expected user count not validated under realistic concurrent load
- **Symptoms:** Service works in testing, fails at scale on launch, emergency scaling required during launch event
- **Solution:** Load test before launch with realistic concurrency. Tools: `artillery` with WebSocket plugin, `k6` with WebSocket support, `gatling` for JVM. Test: (1) Maximum concurrent connections, (2) Memory per connection, (3) Message throughput under load, (4) Reconnect storm recovery, (5) Graceful degradation at capacity.
- **Lesson:** WebSocket capacity is not derivable from unit tests. Load test to your expected peak × 2 before launch. Discover the ceiling in staging, not production.

---

### 11.3 Logging Every WebSocket Event — Log Storm

- **What happens:** Debug logging left enabled in production — `console.log("received:", event, data)` on every message × 10K connections × 100 events/sec = 1 billion log lines/day
- **Real pattern:** Development habit of logging all incoming events carried to production. 10K connections × 100 events/sec × average 200 bytes per log line = 200 MB/sec of logs. Disk fills in hours. Log shipper falls behind. Logging I/O saturates disk and CPU.
- **Scale trigger:** High-frequency event traffic, debug logging not removed before production, any log-everything approach
- **Symptoms:** Disk fills rapidly, log shipper (Fluentd, Filebeat) falling behind, I/O wait high, service performance degraded by logging overhead
- **Solution:** Structured logging with levels — DEBUG off in production. Log connection events (connect, disconnect, auth failure) — not every message. Aggregate message rates as metrics (Prometheus counter) not individual log lines. Sample high-frequency events: log 1 in 1000.
- **Lesson:** WebSocket event logging must be treated like query logging — sample or aggregate, never log everything. High-frequency events belong in metrics, not logs.

---

### 11.4 Graceful Shutdown Without Connection Draining

- **What happens:** Server restart drops all active WebSocket connections simultaneously — users see connection errors, all clients reconnect at once (reconnect storm)
- **Real pattern:** `process.exit(0)` on SIGTERM. 50K connections dropped simultaneously. All clients see `close` event, immediately reconnect. Server comes back up, hit by 50K reconnects in first second.
- **Scale trigger:** Any deployment or restart with concurrent active connections
- **Symptoms:** User experience disruption on every deploy, reconnect storm on restart, error spike in metrics during deployment
- **Solution:** Graceful shutdown: (1) Stop accepting new connections, (2) Send `server:restarting` event to all clients with delay: `socket.emit("reconnect:in", 30)`, (3) Client receives event, schedules reconnect with jitter after 30 seconds, (4) Wait for in-flight messages to complete, (5) Close connections cleanly. In Node.js: handle SIGTERM, use `io.close()` with callback.
- **Lesson:** Server restarts are not free for WebSocket users. Notify clients before disconnect and have them schedule reconnects with jitter — don't surprise them.