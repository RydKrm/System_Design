## What is caching?
**Caching** is the process of **storing data temporarily** so it can be **quickly accessed later**, instead of recalculating or reloading it from a slower source (like a database or server).

✅ **Goal:** Make things faster.
🧠 **Example:** A browser caches images so websites load faster next time.

## Why is caching needed?
Caching can be used in **many aspects** of a system to improve **performance**, **scalability**, and **efficiency**. Here's a breakdown of the **main aspects** where caching is commonly used:

---

### 🔄 1. **Network / Web**

* **What:** Cache static assets (HTML, CSS, JS, images).
* **Tools:** Browser cache, CDN (Cloudflare, Akamai).
* **Goal:** Faster page load, less server load.

---

### 🧠 2. **Computation / Processing**

* **What:** Cache expensive calculations or function results.
* **Tools:** Memoization, in-memory cache (e.g., Python `functools.lru_cache`).
* **Goal:** Avoid recomputing the same thing repeatedly.

---

### 🗄️ 3. **Database / Querying**

* **What:** Cache frequent or heavy SQL/NoSQL queries.
* **Tools:** Redis, Memcached, Prisma caching, Hibernate 2nd-level cache.
* **Goal:** Reduce database load, increase query speed.

---

### 📦 4. **API / Microservices**

* **What:** Cache API responses or inter-service communication.
* **Tools:** HTTP cache headers, API Gateway, Redis.
* **Goal:** Reduce external calls, improve latency.

---

### 📲 5. **Frontend / UI**

* **What:** Cache UI data, component state, user preferences.
* **Tools:** React Query, MobX, Redux Toolkit with caching.
* **Goal:** Smooth UX, avoid unnecessary re-fetches.

---

### 🌍 6. **Edge / CDN Layer**

* **What:** Cache static or dynamic content near the user.
* **Tools:** CDN (Cloudflare, Fastly, Vercel).
* **Goal:** Global speed improvement, reduce origin hits.

---

### 🧰 7. **Operating System / File System**

* **What:** Cache file read/write operations, disk blocks.
* **Tools:** OS-level disk cache, file system buffers.
* **Goal:** Speed up disk I/O.

---

### 🧑‍💻 8. **AI / Machine Learning**

* **What:** Cache model predictions or vector embeddings.
* **Tools:** Redis, local storage.
* **Goal:** Faster inference, avoid duplicate computations.

