# Database Index: A Complete Deep Dive Guide

## Table of Contents

1. Introduction to Database Indexes
2. How Indexes Work Inside the Database
3. Index Memory Management System
4. Creating Indexes on Columns
5. Multiple Column Indexes (Composite Indexes)
6. Query Execution with Indexes
7. Real-World Examples and Best Practices

---

## Chapter 1: Introduction to Database Indexes

### What is a Database Index?

Think of a database index like the index at the back of a textbook. When you want to find information about "photosynthesis" in a biology book, you don't read every page from start to finish. Instead, you flip to the index, find "photosynthesis," see it's on page 247, and jump directly there.

A database index works exactly the same way. Without an index, the database has to read every single row in a table to find what you're looking for (this is called a **full table scan**). With an index, the database can jump directly to the relevant rows.

### The Problem Without Indexes

Imagine you have a student database with 1 million records:

```
Students Table (1,000,000 rows)
--------------------------------
| ID  | Name      | Age | Grade |
|-----|-----------|-----|-------|
| 1   | Alice     | 20  | A     |
| 2   | Bob       | 22  | B     |
| 3   | Charlie   | 21  | A     |
| ... | ...       | ... | ...   |
| 1M  | Zachary   | 23  | C     |
```

When you search for "WHERE Name = 'Bob'", the database must:

1. Read row 1 → Not Bob
2. Read row 2 → Found Bob! But must continue...
3. Read row 3 → Not Bob
4. Continue through all 1,000,000 rows

This is extremely slow! The time complexity is O(n), meaning if you double the data, search time doubles too.

### The Solution: Indexes

With an index on the Name column, the database maintains a separate, sorted structure that looks like this:

```
Name Index (Sorted)
-------------------
Alice    → Row 1
Bob      → Row 2
Charlie  → Row 3
...
Zachary  → Row 1M
```

Now the database can use efficient search algorithms (like binary search) to find "Bob" in just log₂(1,000,000) ≈ 20 comparisons instead of 1,000,000!

---

## Chapter 2: How Indexes Work Inside the Database

### The B-Tree Data Structure

Most databases use a data structure called a **B-Tree** (Balanced Tree) or **B+Tree** to implement indexes. Let me explain this with a visual representation.

#### Understanding the B-Tree Structure

```
                    [50]
                   /    \
                  /      \
              [25]        [75]
             /   \        /   \
            /     \      /     \
        [10,20] [30,40] [60,70] [80,90]
```

**How it works:**

1. **Root Node**: The top node [50] contains a key value that divides the data
2. **Internal Nodes**: [25] and [75] further subdivide the data
3. **Leaf Nodes**: [10,20], [30,40], etc., contain the actual data pointers

#### Why B-Tree is Perfect for Databases

**Property 1: Self-Balancing**
The tree automatically stays balanced. If you insert 1000 values on the left side, the tree reorganizes itself to maintain balance, ensuring search operations remain fast.

**Property 2: Multiple Keys per Node**
Unlike a binary tree (2 children max), a B-Tree node can have many children (typically hundreds). This is crucial for databases because:

- One disk read can fetch an entire node
- Fewer disk reads = faster queries
- Tree height stays small even with billions of records

**Property 3: Sorted Order**
All keys are maintained in sorted order, making range queries (like "BETWEEN 10 AND 50") extremely efficient.

### Step-by-Step: How a Search Works

Let's search for the value 35 in our B-Tree:

```
Step 1: Start at root [50]
        35 < 50, so go LEFT

Step 2: Arrive at [25]
        35 > 25, so go RIGHT

Step 3: Arrive at [30,40]
        30 < 35 < 40, found in this leaf node!

Total comparisons: 3
Total disk reads: 3
```

Without an index, we might need to scan thousands or millions of rows. With an index, we need only log₂(n) comparisons, where n is the number of entries.

### Real B+Tree Structure (Used in PostgreSQL, MySQL)

In production databases, the actual structure is a **B+Tree**, which is slightly different:

```
                     [50]
                    /    \
                   /      \
               [25]        [75]
              /   \        /   \
             /     \      /     \
    [10|20|30] → [40|50|60] → [70|80|90]
     ↓  ↓  ↓       ↓  ↓  ↓       ↓  ↓  ↓
    Row Row Row  Row Row Row  Row Row Row
    Ptr Ptr Ptr  Ptr Ptr Ptr  Ptr Ptr Ptr
```

**Key differences:**

1. **All data is in leaf nodes**: Internal nodes only contain keys for navigation
2. **Leaf nodes are linked**: The → arrows show that leaf nodes form a linked list
3. **Better for range scans**: Because leaves are linked, scanning from 30 to 70 just means following the linked list

### Index Entry Structure

Each entry in an index contains:

```
┌─────────────────────────────────┐
│  Index Entry                    │
├─────────────────────────────────┤
│  Key Value: "Bob"              │
│  Row Pointer: 0x7FF8A2B3      │ → Points to actual row in table
└─────────────────────────────────┘
```

The **Row Pointer** (also called Row ID or TID) is the physical address on disk where the complete row is stored.

---

## Chapter 3: Index Memory Management System

### Memory Hierarchy in Database Systems

Databases work with multiple layers of memory:

```
┌──────────────────────────────────────┐
│  CPU Cache (L1, L2, L3)              │  ← Fastest (nanoseconds)
│  Size: KB to MB                      │
├──────────────────────────────────────┤
│  RAM (Buffer Pool/Cache)             │  ← Very Fast (microseconds)
│  Size: GB                            │
├──────────────────────────────────────┤
│  SSD Storage                         │  ← Fast (milliseconds)
│  Size: GB to TB                      │
├──────────────────────────────────────┤
│  HDD Storage                         │  ← Slow (milliseconds)
│  Size: TB                            │
└──────────────────────────────────────┘
```

### The Buffer Pool (Index Cache)

The **Buffer Pool** (called **InnoDB Buffer Pool** in MySQL or **Shared Buffers** in PostgreSQL) is where indexes are cached in RAM.

#### How Buffer Pool Works

**Initial State** (Cold Start):

```
RAM Buffer Pool: [Empty]
Disk: [Index Pages: P1, P2, P3, P4, ... P1000]
```

**First Query** - SELECT \* FROM users WHERE name = 'Alice':

```
1. Check Buffer Pool → Not found
2. Read Index Page P1 from disk → Load into RAM
3. Search in P1 → Find pointer to row
4. Read Data Page from disk

RAM Buffer Pool: [P1]
```

**Second Query** - SELECT \* FROM users WHERE name = 'Bob':

```
1. Check Buffer Pool → P1 already in RAM!
2. Search in P1 → Find pointer to row
3. Read Data Page (might be cached too)

RAM Buffer Pool: [P1]  ← No disk read needed!
```

**Subsequent Queries**:

```
RAM Buffer Pool: [P1, P2, P5, P7, ...]  ← Most frequently used pages
```

### Page Structure

Databases don't read individual index entries. They read entire **pages** (usually 8KB or 16KB).

```
┌─────────────────────────────────────────┐
│  Index Page (8KB)                       │
├─────────────────────────────────────────┤
│  Page Header (metadata)                 │
│  - Page ID: 42                          │
│  - Next Page: 43                        │
│  - Free Space: 2KB                      │
├─────────────────────────────────────────┤
│  Index Entries:                         │
│    [Key: "Alice"  | Ptr: Row #1]       │
│    [Key: "Bob"    | Ptr: Row #2]       │
│    [Key: "Carol"  | Ptr: Row #5]       │
│    [... 500 more entries ...]          │
├─────────────────────────────────────────┤
│  Free Space: 2KB                        │
└─────────────────────────────────────────┘
```

**Why pages matter:**

- **Disk I/O is expensive**: Reading 1 byte takes the same time as reading 8KB
- **Spatial locality**: Related data is stored together
- **Fewer disk operations**: One read brings many index entries into memory

### Memory Management Strategies

#### 1. LRU (Least Recently Used) Algorithm

The buffer pool can't hold all index pages. When full, it must evict pages:

```
Buffer Pool (Max 3 pages):

Access P1: [P1]
Access P2: [P1, P2]
Access P3: [P1, P2, P3]  ← Buffer full
Access P4: [P2, P3, P4]  ← P1 evicted (least recently used)
Access P2: [P3, P4, P2]  ← P2 moved to front
```

#### 2. Index Scan vs. Table Scan Decision

The database optimizer decides whether to use an index:

```
Scenario A: SELECT * FROM users WHERE age = 25
- Total rows: 1,000,000
- Matching rows: 100 (0.01%)
- Decision: USE INDEX
- Why: Reading 100 rows via index < Reading 1M rows

Scenario B: SELECT * FROM users WHERE age > 18
- Total rows: 1,000,000
- Matching rows: 950,000 (95%)
- Decision: SKIP INDEX, do TABLE SCAN
- Why: Reading 950K rows via index (random access)
       > Reading 1M rows sequentially
```

### Memory Overhead of Indexes

Every index consumes memory:

```
Example Table: 1,000,000 rows
Row size: 200 bytes
Table size: ~200 MB

Index on Name column:
- Key size: ~20 bytes
- Pointer size: 8 bytes
- Entry size: ~28 bytes
- Index size: ~28 MB (14% overhead)

Index on (Name, Age):
- Key size: ~24 bytes
- Pointer size: 8 bytes
- Entry size: ~32 bytes
- Index size: ~32 MB (16% overhead)
```

**Trade-off**: More indexes = Faster queries BUT More memory + Slower writes

---

## Chapter 4: Creating Indexes on Columns

### When to Create an Index

You should create an index when:

1. **Frequent WHERE clause searches**

   ```sql
   SELECT * FROM users WHERE email = 'user@example.com';
   -- Create index: CREATE INDEX idx_email ON users(email);
   ```

2. **JOIN operations**

   ```sql
   SELECT * FROM orders JOIN users ON orders.user_id = users.id;
   -- Create index: CREATE INDEX idx_user_id ON orders(user_id);
   ```

3. **ORDER BY and GROUP BY**

   ```sql
   SELECT * FROM products ORDER BY price;
   -- Create index: CREATE INDEX idx_price ON products(price);
   ```

4. **Foreign key columns**
   ```sql
   ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users(id);
   -- Good practice: CREATE INDEX idx_fk_user ON orders(user_id);
   ```

### The Index Creation Process

When you execute `CREATE INDEX idx_name ON users(name)`:

**Step 1: Preparation**

```
Database: "Creating index idx_name on users(name)..."
- Acquire table lock (may be shared lock in modern DBs)
- Allocate space for index structure
```

**Step 2: Scanning the Table**

```
Progress: 0%
├─ Row 1: name='Alice'   → Add to temporary sort buffer
├─ Row 2: name='Charlie' → Add to temporary sort buffer
├─ Row 3: name='Bob'     → Add to temporary sort buffer
├─ ...
└─ Progress: 100%
```

**Step 3: Sorting**

```
Temporary buffer (unsorted):
['Alice', 'Charlie', 'Bob', ...]

Sorting in progress... (O(n log n) operation)

Temporary buffer (sorted):
['Alice', 'Bob', 'Charlie', ...]
```

**Step 4: Building the B-Tree**

```
Create leaf nodes from sorted data:
[Alice, Andrew, Anna] → [Bob, Brian, Bruce] → [Carol, Charlie, Chris]

Create internal nodes:
[Andrew] → [Brian] → [Carol]

Create root node:
[Brian]

Final B-Tree:
                [Brian]
               /       \
          [Andrew]    [Carol]
          /      \    /     \
    [Alice...] [Bob...] [Carol...] [...]
```

**Step 5: Writing to Disk**

```
Write index pages to disk
Update system catalog
Release locks
Index creation complete!
```

### Index Types Based on Column Data Type

#### 1. B-Tree Index (Default)

Best for: Integers, Strings, Dates

```sql
CREATE INDEX idx_age ON users(age);
-- Stored as: [15, 18, 20, 22, 25, 30, ...]
```

#### 2. Hash Index

Best for: Exact match lookups (WHERE col = value)

```sql
CREATE INDEX idx_hash_email ON users USING HASH (email);
-- Stored as: hash('alice@ex.com') → pointer
-- Fast: O(1) for exact match
-- Limitation: Cannot do range queries (>, <, BETWEEN)
```

#### 3. Full-Text Index

Best for: Text search

```sql
CREATE FULLTEXT INDEX idx_fulltext_desc ON products(description);
-- Enables: SELECT * FROM products WHERE MATCH(description) AGAINST('laptop');
```

#### 4. Spatial Index

Best for: Geographic data (GIS)

```sql
CREATE SPATIAL INDEX idx_location ON stores(coordinates);
-- For queries like: Find all stores within 5km radius
```

### Primary Key: The Special Index

When you create a primary key, an index is automatically created:

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,  -- Automatic index created!
    name VARCHAR(100)
);
```

In **MySQL InnoDB**, the primary key index is special:

```
Clustered Index (Primary Key):
┌──────────────────────────────────────┐
│ Index Node                           │
│ Key: id=1                            │
│ Data: [id=1, name='Alice', age=20]  │ ← Full row stored here!
└──────────────────────────────────────┘

Secondary Index (on name):
┌──────────────────────────────────────┐
│ Index Node                           │
│ Key: name='Alice'                    │
│ Pointer: id=1                        │ ← Points to primary key!
└──────────────────────────────────────┘
```

This is called a **Clustered Index** – the actual table data is stored in primary key order.

---

## Chapter 5: Multiple Column Indexes (Composite Indexes)

### What is a Composite Index?

A composite (or compound) index covers multiple columns:

```sql
CREATE INDEX idx_name_age ON users(name, age);
```

This creates a single index with both columns together, not two separate indexes.

### How Composite Indexes are Structured

Think of a composite index like a phone book: sorted first by last name, then by first name within each last name.

```
Composite Index on (last_name, first_name):

├─ [Anderson, Alice]    → Row Pointer
├─ [Anderson, Bob]      → Row Pointer
├─ [Anderson, Charlie]  → Row Pointer
├─ [Brown, Alice]       → Row Pointer
├─ [Brown, David]       → Row Pointer
├─ [Smith, Emily]       → Row Pointer
└─ [Smith, Frank]       → Row Pointer
```

**Structure in B-Tree:**

```
Root: ["Brown"]
      /          \
["Anderson"]   ["Smith"]
    /    \        /    \
[A,Alice] [A,Charlie] [S,Emily] [S,Frank]
[A,Bob]   [B,Alice]   [S,David] [...]
```

### The Left-Most Prefix Rule

**Critical Concept**: A composite index on (A, B, C) can be used for queries on:

- (A) ✓
- (A, B) ✓
- (A, B, C) ✓

But NOT efficiently for:

- (B) ✗
- (C) ✗
- (B, C) ✗

**Example:**

```sql
CREATE INDEX idx_composite ON users(last_name, first_name, age);

-- These queries USE the index efficiently:
SELECT * FROM users WHERE last_name = 'Smith';
-- Uses: [last_name] part of index

SELECT * FROM users WHERE last_name = 'Smith' AND first_name = 'John';
-- Uses: [last_name, first_name] parts

SELECT * FROM users WHERE last_name = 'Smith' AND first_name = 'John' AND age = 25;
-- Uses: [last_name, first_name, age] full index

-- These queries CANNOT use the index efficiently:
SELECT * FROM users WHERE first_name = 'John';
-- Index is sorted by last_name first, can't skip to first_name

SELECT * FROM users WHERE age = 25;
-- Index is sorted by last_name first, can't skip to age

SELECT * FROM users WHERE first_name = 'John' AND age = 25;
-- Missing the left-most column (last_name)
```

**Why?** Because the index is sorted like:

```
[Anderson, Alice, 20]
[Anderson, Bob, 25]     ← Can't jump to "Bob" without knowing last name
[Brown, Alice, 22]
[Brown, Bob, 30]        ← Can't jump to age=30 without knowing last+first name
[Smith, Carol, 28]
```

### Choosing Column Order in Composite Indexes

**Rule of Thumb**: Put the most selective (unique) column first.

**Example: Bad Order**

```sql
-- Bad: gender has only 2-3 values
CREATE INDEX idx_bad ON users(gender, email);

Index structure:
├─ [Female, alice@ex.com]
├─ [Female, beth@ex.com]
├─ [Female, carol@ex.com]
│  ... 500,000 more Female entries ...
├─ [Male, dave@ex.com]
│  ... 500,000 more Male entries ...
└─ [Other, eve@ex.com]

Query: WHERE gender='Female' AND email='alice@ex.com'
Problem: Must scan through ~500,000 Female entries to find alice
```

**Example: Good Order**

```sql
-- Good: email is unique
CREATE INDEX idx_good ON users(email, gender);

Index structure:
├─ [alice@ex.com, Female]
├─ [beth@ex.com, Female]
├─ [carol@ex.com, Male]
├─ [dave@ex.com, Male]
└─ ...

Query: WHERE email='alice@ex.com' AND gender='Female'
Benefit: Immediately finds alice (1 entry), then checks gender
```

### Index Intersection

Some databases can use multiple single-column indexes together:

```sql
CREATE INDEX idx_age ON users(age);
CREATE INDEX idx_city ON users(city);

SELECT * FROM users WHERE age = 25 AND city = 'New York';
```

**How it works:**

```
Step 1: Use idx_age
Result: {Row IDs: 5, 12, 28, 45, 89, 102, ...}  (10,000 rows)

Step 2: Use idx_city
Result: {Row IDs: 3, 12, 15, 45, 67, 102, ...}  (8,000 rows)

Step 3: Intersection (AND operation)
Result: {Row IDs: 12, 45, 102}  (3 rows)

Step 4: Fetch actual rows
```

**Limitation**: Index intersection is often slower than a composite index because:

- Must scan two indexes
- Must perform set intersection operation
- Multiple disk accesses

**Better approach:**

```sql
CREATE INDEX idx_age_city ON users(age, city);  -- Much faster!
```

---

## Chapter 6: Query Execution with Indexes

### The Query Optimizer

When you execute a query, the database doesn't immediately run it. First, the **Query Optimizer** analyzes it.

```
Your Query:
  SELECT * FROM orders
  WHERE customer_id = 123
  AND status = 'shipped'
  ORDER BY order_date;

↓ Passes to Query Optimizer

Query Optimizer asks:
  1. What indexes exist?
     - idx_customer_id on customer_id
     - idx_status on status
     - idx_date on order_date

  2. What are the statistics?
     - Total rows: 1,000,000
     - Rows with customer_id=123: ~50 rows
     - Rows with status='shipped': ~700,000 rows

  3. Which execution plan is cheapest?

↓ Generates Execution Plan

Execution Plan:
  1. Use idx_customer_id (most selective) → Get 50 row IDs
  2. For each row, check status='shipped' (filter)
  3. Sort by order_date
```

### Execution Plan Analysis

Let's see what happens step-by-step for a query:

```sql
SELECT name, email
FROM users
WHERE age > 25 AND city = 'London'
ORDER BY name;
```

**Scenario 1: No Indexes**

```
┌─────────────────────────────────┐
│ Full Table Scan                 │
├─────────────────────────────────┤
│ 1. Read row 1 from disk         │
│    Check: age > 25? city=London?│
│ 2. Read row 2 from disk         │
│    Check: age > 25? city=London?│
│ 3. Read row 3 from disk         │
│    ... Continue for all 1M rows │
│ 4. Collect matching rows        │
│ 5. Sort by name (expensive!)    │
└─────────────────────────────────┘

Cost: 1,000,000 row reads + sort
Time: 30 seconds (hypothetical)
```

**Scenario 2: Index on city**

```
┌─────────────────────────────────┐
│ Index Scan on idx_city          │
├─────────────────────────────────┤
│ 1. Look up 'London' in index    │
│    Tree traversal: 3-4 nodes    │
│ 2. Get row IDs: [5, 19, 23, ...│
│    (50,000 rows in London)      │
│ 3. For each row ID:             │
│    - Fetch row from disk        │
│    - Check: age > 25?           │
│ 4. Collect matching rows        │
│    (25,000 rows match)          │
│ 5. Sort by name                 │
└─────────────────────────────────┘

Cost: 4 index reads + 50,000 row reads + sort
Time: 5 seconds (hypothetical)
```

**Scenario 3: Composite Index on (city, age)**

```
┌─────────────────────────────────┐
│ Index Scan on idx_city_age      │
├─────────────────────────────────┤
│ 1. Look up 'London' in index    │
│    Tree traversal: 3-4 nodes    │
│ 2. Scan forward where age > 25  │
│    Index organized:             │
│    [London, 18] → Skip          │
│    [London, 22] → Skip          │
│    [London, 26] → Take ✓        │
│    [London, 28] → Take ✓        │
│    ... (25,000 matching)        │
│ 3. Get row IDs from index       │
│ 4. Fetch rows from disk         │
│ 5. Sort by name                 │
└─────────────────────────────────┘

Cost: 4 index reads + 25,000 row reads + sort
Time: 3 seconds (hypothetical)
```

**Scenario 4: Composite Index on (city, age, name)**

```
┌─────────────────────────────────┐
│ Index-Only Scan idx_city_age_nm │
├─────────────────────────────────┤
│ 1. Look up 'London' in index    │
│ 2. Scan where age > 25          │
│ 3. Index contains name!         │
│    Already sorted by name!      │
│ 4. Return directly from index   │
│    No need to fetch table rows! │
└─────────────────────────────────┘

Cost: 4 index reads only
Time: 0.5 seconds (hypothetical)
No table access needed!
```

### Index-Only Scans (Covering Index)

A **covering index** contains all columns needed by the query:

```sql
CREATE INDEX idx_cover ON users(city, age, name, email);

SELECT name, email
FROM users
WHERE city = 'London' AND age > 25;
```

**Without covering index:**

```
Index → Get row IDs → Fetch rows from table → Get name, email
```

**With covering index:**

```
Index → Get name, email directly from index → Done!
```

**Visualization:**

```
Regular Index:
┌────────────────────┐      ┌──────────────────────────┐
│ Index              │      │ Table                    │
│ [city, age] → ID   │ ───> │ ID → [full row data]     │
└────────────────────┘      └──────────────────────────┘
       ↓                              ↓
  Quick lookup              Expensive disk access

Covering Index:
┌────────────────────────────────────────┐
│ Index                                  │
│ [city, age, name, email] → All needed │
└────────────────────────────────────────┘
       ↓
  Everything in one place!
```

### Range Queries with Indexes

```sql
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
```

**How the index helps:**

```
B-Tree Index on price:
                [300]
               /     \
          [150]       [450]
          /   \       /    \
    [50,100] [200] [350] [500,600]

Search for BETWEEN 100 AND 500:

Step 1: Find starting point (100)
        Traverse: Root[300] → Left[150] → Right[200]
        Start at: [100] in leaf node

Step 2: Scan sequentially through linked leaves
        [100, 120, 150] → [200, 250, 280] → [350, 400, 450] → [500]
                                                                 ↑
                                                              Stop here

Step 3: Collect all row pointers in range
        Result: 150 products

Cost: log(n) to find start + k sequential reads (k = result size)
```

### JOIN Operations with Indexes

```sql
SELECT o.id, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';
```

**Without indexes:**

```
Nested Loop Join (Brute Force):

For each order in orders:  (1,000,000 orders)
    For each user in users:  (100,000 users)
        If order.user_id == user.id:
            Return matched row

Total comparisons: 1,000,000 × 100,000 = 100 billion!
Time: Hours or days
```

**With index on users.id:**

```
Index Nested Loop Join:

For each order in orders:  (1,000,000 orders)
    Look up user_id in index:  (log₂(100,000) ≈ 17 comparisons)
        Return matched row

Total comparisons: 1,000,000 × 17 = 17 million
Time: Seconds
```

**Execution steps:**

```
1. Scan orders table (filter status='pending')
   Result: 50,000 pending orders

2. For each pending order:
   ┌────────────────────────────┐
   │ order: {id: 1, user_id: 42}│
   └────────────────────────────┘
         ↓
   Look up in users index:
   ┌────────────────────────────┐
   │ B-Tree on users.id         │
   │ Search for id=42           │
   │ Found at: Row pointer X    │
   └────────────────────────────┘
         ↓
   Fetch user row:
   ┌────────────────────────────┐
   │ {id: 42, name: 'Alice'}   │
   └────────────────────────────┘

3. Combine and return:
   {order_id: 1, user_name: 'Alice'}
```

---

## Chapter 7: Real-World Examples and Best Practices

### Example 1: E-Commerce Order System

**Table Structure:**

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,           -- Auto-indexed
    user_id BIGINT,
    status VARCHAR(20),
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Common Queries:**

```sql
-- Query 1: Get user's orders
SELECT * FROM orders WHERE user_id = 12345;

-- Query 2: Get recent pending orders
SELECT * FROM orders
WHERE status = 'pending'
AND created_at > NOW() - INTERVAL 7 DAY;

-- Query 3: Get orders by date range
SELECT * FROM orders
WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31';

-- Query 4: Admin dashboard - orders by status
SELECT status, COUNT(*)
FROM orders
GROUP BY status;
```

**Optimal Indexing Strategy:**

```sql
-- Index 1: For query 1
CREATE INDEX idx_user_id ON orders(user_id);

-- Index 2: For query 2 (composite for efficiency)
CREATE INDEX idx_status_created ON orders(status, created_at);

-- Index 3: For query 3
CREATE INDEX idx_created ON orders(created_at);

-- Index 4: For query 4
CREATE INDEX idx_status ON orders(status);
```

**Analysis:**

```
Query 1: WHERE user_id = 12345
Uses: idx_user_id
Benefit: O(log n) instead of O(n)
From: 2 seconds → 0.01 seconds

Query 2: WHERE status = 'pending' AND created_at > date
Uses: idx_status_created (composite!)
Path: status='pending' → scan created_at range
From: 5 seconds → 0.05 seconds

Query 3: WHERE created_at BETWEEN date1 AND date2
Uses: idx_created
Benefit: Range scan on sorted index
From: 3 seconds → 0.02 seconds

Query 4: GROUP BY status
Uses: idx_status
Benefit: Index already groups by status
From: 10 seconds → 0.1 seconds
```

**Trade-offs:**

```
Storage overhead: 4 indexes × ~15% each = ~60% extra storage
Write performance: Each INSERT must update 5 structures (1 table + 4 indexes)
Benefit: Read queries 100-200x faster
Decision: Worth it for read-heavy workload!
```

### Example 2: Social Media Posts

**Table Structure:**

```sql
CREATE TABLE posts (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    content TEXT,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

**Common Query Pattern:**

```sql
-- Get user's feed: recent posts from followed users
SELECT p.id, p.content, p.likes_count, p.created_at
FROM posts p
WHERE p.user_id IN (
    SELECT followed_id FROM follows WHERE follower_id = 12345
)
AND p.is_deleted = FALSE
ORDER BY p.created_at DESC
LIMIT 20;
```

**Initial Index (Naive):**

```sql
CREATE INDEX idx_user_created ON posts(user_id, created_at);
```

**Problem:** The query needs to scan deleted posts and filter them out.

**Better Index:**

```sql
CREATE INDEX idx_user_notdeleted_created
ON posts(user_id, is_deleted, created_at);
```

**Why better?**

```
Naive Index Structure:
posts(user_id, created_at)
├─ [User 123, 2025-01-01] → Row (is_deleted=true) ✗ Skip
├─ [User 123, 2025-01-02] → Row (is_deleted=false) ✓ Take
├─ [User 123, 2025-01-03] → Row (is_deleted=true) ✗ Skip
└─ [User 123, 2025-01-04] → Row (is_deleted=false) ✓ Take

Must read many rows, then filter

Better Index Structure:
posts(user_id, is_deleted, created_at)
├─ [User 123, false, 2025-01-04] → Row ✓
├─ [User 123, false, 2025-01-02] → Row ✓
├─ [User 123, false, 2025-01-01] → Row ✓
└─ [User 123, true, ...] → Entire section skipped!

Directly access only non-deleted posts!
```

### Example 3: Real-Time Analytics

**Scenario:** Track page views

```sql
CREATE TABLE page_views (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    page_url VARCHAR(500),
    country VARCHAR(2),
    viewed_at TIMESTAMP
);

-- Billions of rows, inserted continuously
```

**Query Requirement:**

```sql
-- Dashboard query: Views per country in last 24 hours
SELECT country, COUNT(*) as views
FROM page_views
WHERE viewed_at > NOW() - INTERVAL 24 HOUR
GROUP BY country;
```

**Index Strategy:**

```sql
-- Composite index with time first (most selective for recent data)
CREATE INDEX idx_time_country ON page_views(viewed_at, country);
```

**Why this works:**

```
Index Scan Path:
1. Find start point: viewed_at = 24 hours ago
2. Scan forward sequentially (all entries are recent)
3. Group by country while scanning (index already has country!)

Without index:
- Scan billions of rows
- Filter for last 24 hours
- Group results
Time: 5 minutes

With index:
- Jump to 24 hours ago in index
- Scan only ~10 million recent entries
- Group while scanning
Time: 2 seconds
```

**Advanced optimization - Partitioning:**

```sql
-- Partition table by date
CREATE TABLE page_views (
    id BIGINT,
    user_id BIGINT,
    page_url VARCHAR(500),
    country VARCHAR(2),
    viewed_at TIMESTAMP
) PARTITION BY RANGE (viewed_at) (
    PARTITION p_2025_01 VALUES LESS THAN ('2025-02-01'),
    PARTITION p_2025_02 VALUES LESS THAN ('2025-03-01'),
    PARTITION p_2025_03 VALUES LESS THAN ('2025-04-01')
);

-- Index only needed on recent partitions
CREATE INDEX idx_time_country ON page_views(viewed_at, country);
```

**Result:**

```
Query now only scans current partition (1/12 of data)
Old partitions can be archived or dropped
Index maintenance only on active partition
```

### Best Practices Summary

#### 1. Index Cardinality Matters

**Cardinality** = Number of unique values in a column

```
High Cardinality (Good for indexing):
- email: 1,000,000 unique values in 1,000,000 rows
- user_id: 1,000,000 unique values
- order_number: Nearly all unique

Low Cardinality (Poor for indexing):
- gender: 2-3 unique values in 1,000,000 rows
- is_active: 2 unique values (true/false)
- status: 5-10 unique values
```

**Example:**

```sql
-- Bad index (low cardinality)
CREATE INDEX idx_gender ON users(gender);

Query: SELECT * FROM users WHERE gender = 'Female';
Result: Returns 500,000 rows (50% of table)
Problem: Index doesn't help much, might be slower than table scan!

-- Good index (high cardinality)
CREATE INDEX idx_email ON users(email);

Query: SELECT * FROM users WHERE email = 'alice@example.com';
Result: Returns 1 row
Benefit: Index immediately finds the row
```

#### 2. Monitor Index Usage

Most databases provide tools to check if indexes are used:

**PostgreSQL:**

```sql
-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Find unused indexes
SELECT
    schemaname || '.' || tablename as table,
    indexname as index,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**MySQL:**

```sql
-- Enable index usage tracking
SET GLOBAL userstat = ON;

-- Check index statistics
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME,
    ROWS_READ
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database';
```

**What to do with unused indexes:**

```
If idx_scan = 0 (never used):
1. Verify it's truly unused (check for weekly/monthly queries)
2. Consider dropping it
3. Monitor for complaints after dropping
4. Benefit: Faster writes, less storage

Example:
DROP INDEX idx_unused_status ON orders;
```

#### 3. Index Maintenance

Indexes need periodic maintenance:

**Fragmentation over time:**

```
Freshly built index (optimal):
[1][2][3][4][5][6][7][8][9][10]
└─────────────────────────────┘
    All pages 100% full

After many inserts/deletes (fragmented):
[1][2][_][4][_][6][7][_][9][10]
 90% 80% 0% 60% 0% 70% 90% 0% 85% 95%
└──────────────────────────────────┘
    Average: 67% full, many gaps

Problem: More disk reads needed, slower queries
```

**Rebuilding indexes:**

**PostgreSQL:**

```sql
-- Rebuild single index
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE users;

-- Rebuild entire database (maintenance window)
REINDEX DATABASE mydb;
```

**MySQL:**

```sql
-- Rebuild table and all its indexes
OPTIMIZE TABLE users;

-- Or rebuild specific index
ALTER TABLE users DROP INDEX idx_email, ADD INDEX idx_email(email);
```

**Schedule:**

```
High-write tables: Rebuild indexes monthly
Medium-write tables: Rebuild quarterly
Low-write tables: Rebuild annually
```

#### 4. Partial Indexes (PostgreSQL Feature)

Create indexes on subset of rows:

```sql
-- Only index active users
CREATE INDEX idx_active_users
ON users(email)
WHERE is_active = TRUE;

-- Only index recent orders
CREATE INDEX idx_recent_orders
ON orders(created_at)
WHERE created_at > '2025-01-01';
```

**Benefits:**

```
Full index:
- Size: 100 MB
- Covers: 1,000,000 rows

Partial index (WHERE is_active = TRUE):
- Size: 30 MB (70% reduction!)
- Covers: 300,000 active users
- Faster: Smaller index = fewer disk reads
- Cheaper: Less storage, faster writes
```

#### 5. Functional Indexes

Index on expressions:

```sql
-- Index on lowercase email
CREATE INDEX idx_email_lower
ON users(LOWER(email));

-- Now this query uses the index:
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- Index on calculated field
CREATE INDEX idx_full_name
ON users((first_name || ' ' || last_name));

-- Index on date extraction
CREATE INDEX idx_order_year_month
ON orders(EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at));
```

#### 6. Write Performance Impact

**Understanding the cost:**

```
Without indexes:
INSERT INTO users (name, email, age) VALUES ('Alice', 'a@ex.com', 25);

Steps:
1. Write row to table → 1 disk write
Total: 1 write operation

With 3 indexes (name, email, age):
INSERT INTO users (name, email, age) VALUES ('Alice', 'a@ex.com', 25);

Steps:
1. Write row to table → 1 disk write
2. Update index on name → 1 disk write (maybe 2-3 if B-tree splits)
3. Update index on email → 1 disk write
4. Update index on age → 1 disk write
Total: 4-6 write operations

Slowdown: 4-6x slower inserts!
```

**Bulk insert optimization:**

```sql
-- Slow: Insert with indexes
INSERT INTO users (name, email) VALUES ('Alice', 'a@ex.com');
INSERT INTO users (name, email) VALUES ('Bob', 'b@ex.com');
-- ... 1 million times

-- Fast: Disable indexes, bulk insert, rebuild
ALTER TABLE users DISABLE KEYS;  -- MySQL

COPY users FROM 'data.csv';  -- PostgreSQL

ALTER TABLE users ENABLE KEYS;
-- Or REINDEX TABLE users;
```

**Result:**

```
With indexes enabled: 10 hours
With indexes disabled: 30 minutes + 15 minutes rebuild = 45 minutes
Speedup: 13x faster!
```

---

## Chapter 8: Advanced Topics

### 1. Index Statistics and Selectivity

**Selectivity** = Percentage of rows that match a condition

```sql
-- High selectivity (good for index)
SELECT * FROM users WHERE email = 'alice@example.com';
-- Selectivity: 1/1,000,000 = 0.0001% (very selective)

-- Low selectivity (bad for index)
SELECT * FROM users WHERE country = 'USA';
-- Selectivity: 700,000/1,000,000 = 70% (not selective)
```

**Database statistics:**

```sql
-- PostgreSQL: Update statistics for query planner
ANALYZE users;

-- This collects:
-- - Number of rows
-- - Number of distinct values per column
-- - Most common values
-- - Histogram of value distribution
```

**Why statistics matter:**

```
Query: SELECT * FROM orders WHERE status = 'pending';

If statistics are outdated:
Optimizer thinks: "Only 1% of orders are pending"
Decision: Use index
Reality: 90% of orders are pending
Result: Index scan reads 900,000 rows (slow!)

If statistics are current:
Optimizer knows: "90% of orders are pending"
Decision: Skip index, do table scan
Result: Sequential scan reads 1,000,000 rows (faster!)
```

### 2. Index Compression

Modern databases compress indexes:

```sql
-- PostgreSQL: Create compressed index
CREATE INDEX idx_compressed ON large_table(text_column)
WITH (fillfactor = 70);  -- Leave 30% space for updates

-- MySQL InnoDB: Uses prefix compression automatically
CREATE INDEX idx_text ON articles(title);
```

**How compression works:**

```
Uncompressed index:
['Application', 'Application Server', 'Application Development']
Storage: 60 bytes

Prefix compressed:
['Application', ' Server'(prefix=11), ' Development'(prefix=11)]
Storage: 35 bytes (40% savings!)
```

### 3. Index-Organized Tables (Clustered Indexes)

**MySQL InnoDB** stores table data in primary key order:

```
Regular table (heap):
Table data: [Random order of rows]
Index: [Sorted pointers to rows]

Clustered index table (InnoDB):
Primary key index: [Contains actual row data in sorted order]
Secondary indexes: [Point to primary key values]
```

**Impact on range queries:**

```sql
-- Query: Get orders 100-200 for a user
SELECT * FROM orders
WHERE user_id = 123
AND id BETWEEN 100 AND 200;

With clustered index on (user_id, id):
- Rows are physically stored together
- Sequential disk read (fast!)
- No separate table lookup needed

Without clustering:
- Rows scattered across disk
- Random disk reads (slow!)
- Must look up each row separately
```

**Choosing the right primary key:**

```sql
-- Bad: UUID primary key
CREATE TABLE orders (
    id UUID PRIMARY KEY,  -- Random values!
    user_id BIGINT,
    created_at TIMESTAMP
);

Problem: UUIDs are random, causing:
- Fragmented storage
- Lots of page splits during inserts
- Poor cache locality

-- Better: Auto-increment primary key
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- Sequential!
    uuid UUID UNIQUE,  -- For external API
    user_id BIGINT,
    created_at TIMESTAMP
);

Benefit: Sequential inserts go to end of table
- No page splits
- Better cache performance
- Compact storage
```

### 4. Invisible Indexes (Testing)

**MySQL 8.0+** supports invisible indexes:

```sql
-- Make index invisible (optimizer won't use it)
ALTER TABLE users ALTER INDEX idx_email INVISIBLE;

-- Test queries without the index
SELECT * FROM users WHERE email = 'test@example.com';
-- Query planner ignores idx_email

-- If performance is fine, drop the index
DROP INDEX idx_email ON users;

-- If performance degrades, make it visible again
ALTER TABLE users ALTER INDEX idx_email VISIBLE;
```

**Use case:** Safely test removing unused indexes in production!

### 5. Multi-Column Statistics

**PostgreSQL** can track correlation between columns:

```sql
-- Create extended statistics
CREATE STATISTICS stats_city_age
ON city, age
FROM users;

-- Analyze to collect statistics
ANALYZE users;
```

**Why this matters:**

```
Query: SELECT * FROM users WHERE city = 'NYC' AND age < 30;

Without multi-column stats:
Optimizer estimates independently:
- city='NYC': 10% of rows
- age<30: 30% of rows
- Combined estimate: 10% × 30% = 3%

Reality: Young people cluster in cities!
- Actual: 15% (correlation not independent)

With multi-column stats:
Optimizer knows actual correlation
- Better estimate: 15%
- Better query plan chosen
```

---

## Chapter 9: Common Pitfalls and Solutions

### Pitfall 1: Over-Indexing

**Problem:**

```sql
-- Every column has an index!
CREATE INDEX idx_name ON users(name);
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_age ON users(age);
CREATE INDEX idx_city ON users(city);
CREATE INDEX idx_country ON users(country);
CREATE INDEX idx_status ON users(status);
CREATE INDEX idx_created ON users(created_at);
CREATE INDEX idx_updated ON users(updated_at);
```

**Consequences:**

```
Write operation cost:
INSERT INTO users VALUES (...);

Must update:
- Main table: 1 write
- 8 indexes: 8 writes
- B-tree rebalancing: 2-3 additional writes per index
Total: 1 + 8 + 16 = 25 writes!

Storage cost:
- Table: 1 GB
- Indexes: 8 × 150 MB = 1.2 GB
- Total: 2.2 GB (120% overhead!)

Memory pressure:
- Less space for data caching
- More cache evictions
- Slower overall performance
```

**Solution:**

```sql
-- Analyze actual query patterns
-- Keep only indexes that are used frequently

-- Drop unused indexes
DROP INDEX idx_status;  -- Never used in WHERE
DROP INDEX idx_country;  -- Low selectivity
DROP INDEX idx_updated;  -- Rarely queried

-- Create composite indexes for common query patterns
CREATE INDEX idx_city_age ON users(city, age);  -- Replaces two indexes
```

### Pitfall 2: Wrong Column Order in Composite Index

**Problem:**

```sql
-- Query pattern:
SELECT * FROM orders
WHERE status = 'pending'
AND created_at > '2025-01-01';

-- Bad index order:
CREATE INDEX idx_bad ON orders(created_at, status);
```

**Why it's bad:**

```
Index structure:
├─ [2025-01-01, pending]
├─ [2025-01-01, shipped]
├─ [2025-01-01, delivered]
├─ [2025-01-02, pending]
├─ [2025-01-02, shipped]
├─ [2025-01-03, pending]
└─ ...

Query execution:
1. Find created_at > '2025-01-01' ✓
2. Must scan all dates, filtering status='pending' ✗
   (Reads many entries for shipped, delivered, cancelled...)

Efficiency: 30% of index scanned
```

**Solution:**

```sql
-- Good index order:
CREATE INDEX idx_good ON orders(status, created_at);

Index structure:
├─ [delivered, 2025-01-01]
├─ [delivered, 2025-01-02]
├─ [pending, 2025-01-01] ← Start here
├─ [pending, 2025-01-02]
├─ [pending, 2025-01-03]
├─ [shipped, 2025-01-01]
└─ ...

Query execution:
1. Find status='pending' ✓
2. Scan where created_at > '2025-01-01' ✓
   (Only reads pending orders!)

Efficiency: 5% of index scanned (6x improvement!)
```

### Pitfall 3: Indexing Foreign Keys (Forgotten)

**Problem:**

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,  -- No index!
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Common query:
SELECT * FROM orders WHERE user_id = 123;
```

**Impact:**

```
Without index on user_id:
Query: Get all orders for user 123
Execution: Full table scan (1,000,000 rows)
Time: 5 seconds

With index on user_id:
Query: Get all orders for user 123
Execution: Index lookup (50 rows)
Time: 0.01 seconds
```

**Solution:**

```sql
-- Always index foreign keys
CREATE INDEX idx_fk_user ON orders(user_id);
```

**Rule of thumb:** If you have a FOREIGN KEY, you need an INDEX on it!

### Pitfall 4: Not Considering NULL Values

**Important:** NULL handling varies by database!

**PostgreSQL:**

```sql
CREATE INDEX idx_email ON users(email);

-- This query uses the index:
SELECT * FROM users WHERE email = 'alice@example.com';

-- This query DOES NOT use the index:
SELECT * FROM users WHERE email IS NULL;
```

**Solution:**

```sql
-- Create partial index for NULL checks
CREATE INDEX idx_email_null ON users(email) WHERE email IS NULL;

-- Or use composite index with NOT NULL column
CREATE INDEX idx_email_status ON users(email, account_status);
-- Now: WHERE email IS NULL uses the index
```

**MySQL:**

```sql
-- MySQL InnoDB includes NULLs in indexes
CREATE INDEX idx_email ON users(email);

-- Both queries use the index:
SELECT * FROM users WHERE email = 'alice@example.com';  ✓
SELECT * FROM users WHERE email IS NULL;  ✓
```

### Pitfall 5: String Prefix Too Long/Short

**Problem:**

```sql
-- Index entire long string column
CREATE INDEX idx_description ON products(description);
-- description is VARCHAR(5000)

Cost:
- Huge index size: 500 MB
- Slow updates
- Most searches only need first 50 chars
```

**Solution:**

```sql
-- Index only prefix (MySQL)
CREATE INDEX idx_description_prefix ON products(description(50));

-- Query:
SELECT * FROM products WHERE description LIKE 'Gaming laptop%';
-- Uses prefix index efficiently!

-- But this query won't use the index fully:
SELECT * FROM products WHERE description LIKE '%laptop%';
-- Must scan all matching prefixes

Benefits:
- Index size: 500 MB → 25 MB (95% reduction!)
- Faster writes
- Sufficient for most queries
```

**Choosing prefix length:**

```sql
-- Find optimal prefix length
SELECT
    COUNT(DISTINCT LEFT(description, 10)) / COUNT(*) as selectivity_10,
    COUNT(DISTINCT LEFT(description, 20)) / COUNT(*) as selectivity_20,
    COUNT(DISTINCT LEFT(description, 50)) / COUNT(*) as selectivity_50,
    COUNT(DISTINCT description) / COUNT(*) as selectivity_full
FROM products;

Results:
selectivity_10:   0.45  (45% unique)
selectivity_20:   0.78  (78% unique)
selectivity_50:   0.95  (95% unique)
selectivity_full: 0.98  (98% unique)

Decision: Use prefix length 50 (good balance!)
```

---

## Chapter 10: Monitoring and Troubleshooting

### Finding Slow Queries

**PostgreSQL:**

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

**MySQL:**

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second

-- View slow queries
SELECT
    DIGEST_TEXT as query,
    COUNT_STAR as executions,
    AVG_TIMER_WAIT/1000000000 as avg_time_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 20;
```

### Explaining Query Plans

**EXPLAIN command shows how database executes a query:**

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';
```

**PostgreSQL output:**

```
Index Scan using idx_email on users  (cost=0.42..8.44 rows=1 width=100)
  Index Cond: (email = 'alice@example.com'::text)

Reading this:
- "Index Scan" = Using index (good!)
- "idx_email" = Which index
- "cost=0.42..8.44" = Estimated cost (lower is better)
- "rows=1" = Estimated rows returned
```

**MySQL output:**

```
+----+-------+-------+------+---------+-------+------+
| id | type  | key   | rows | filtered| Extra |
+----+-------+-------+------+---------+-------+------+
|  1 | ref   |idx_em |    1 |  100.00 | NULL  |
+----+-------+-------+------+---------+-------+------+

Reading this:
- type="ref" = Index lookup (good!)
- key="idx_em" = Using idx_email
- rows=1 = Will read 1 row
```

**Bad query plan example:**

```sql
EXPLAIN SELECT * FROM users WHERE YEAR(created_at) = 2025;

Output:
Full Table Scan on users  (cost=1000000)
  Filter: (YEAR(created_at) = 2025)

Problem: Function on column prevents index use!

Solution: Rewrite query
SELECT * FROM users
WHERE created_at >= '2025-01-01'
  AND created_at < '2026-01-01';

New output:
Index Range Scan using idx_created_at  (cost=42)
  Index Cond: (created_at >= '2025-01-01' AND created_at < '2026-01-01')
```

### Index Health Checks

**Check index bloat:**

```sql
-- PostgreSQL: Check index bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE WHEN idx_scan = 0 THEN 'Unused' ELSE 'Used' END as status
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Vacuum and analyze:**

```sql
-- PostgreSQL: Clean up and update statistics
VACUUM ANALYZE users;

-- MySQL: Optimize table
OPTIMIZE TABLE users;
```

---

## Conclusion: The Art of Database Indexing

Indexing is a balancing act:

```
┌─────────────────────────────────────────┐
│          Index Trade-offs               │
├─────────────────────────────────────────┤
│                                         │
│  More Indexes                           │
│       ↓                                 │
│  + Faster reads                         │
│  + Better query performance             │
│  - Slower writes                        │
│  - More storage                         │
│  - More memory                          │
│                                         │
│  The goal: Find the sweet spot         │
│  where benefits > costs                 │
│                                         │
└─────────────────────────────────────────┘
```

**Key Takeaways:**

1. **Understand your queries** - Index what you search for
2. **Use composite indexes wisely** - Order matters!
3. **Monitor index usage** - Drop unused indexes
4. **Consider write costs** - Every index slows inserts
5. **Maintain indexes** - Rebuild periodically
6. **Profile before optimizing** - Measure, don't guess
7. **Start simple** - Add complexity only when needed

**The Golden Rule:**

> "Index for your queries, not your columns"

An index is only valuable if it makes your actual queries faster. Design indexes based on real query patterns, not theoretical possibilities.

---

## Further Learning Resources

- PostgreSQL Documentation: Index Types and Concepts
- MySQL Documentation: Optimization and Indexes
- "Use The Index, Luke" - Markus Winand (free online book)
- Database Internals by Alex Petrov
- High Performance MySQL by Baron Schwartz

Remember: Mastering indexes takes practice. Start with simple cases, measure the impact, and gradually build your intuition for when and how to index effectively!
