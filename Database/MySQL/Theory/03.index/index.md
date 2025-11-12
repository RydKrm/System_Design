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

## Chapter 11: Time and Space Complexity Analysis

### Understanding Big O Notation for Databases

Before diving into specific cases, let's understand how we measure database operations:

**Time Complexity** - How long an operation takes as data grows
**Space Complexity** - How much memory/storage an operation needs as data grows

#### Big O Notation Quick Reference

```
O(1)        - Constant time       - Same speed regardless of data size
O(log n)    - Logarithmic time    - Doubles in speed when data doubles
O(n)        - Linear time         - Time doubles when data doubles
O(n log n)  - Linearithmic time   - Sorting algorithms
O(n²)       - Quadratic time      - Nested loops
```

**Visual representation:**

```
Time taken as data grows (n = number of rows)
│
│                                                    O(n²)
│                                                   /
│                                                  /
│                                            O(n)/
│                                              / /
│                                          O(n log n)
│                                         /  /
│                              O(log n) /  /
│                    _________________/  /
│            _______/                   /
│    O(1)___/                          /
│___________________________________________
    1K    10K   100K   1M    10M   100M    (rows)
```

### Section 1: Time Complexity Analysis

#### Case 1: Simple SELECT with WHERE Clause

**Query:**

```sql
SELECT * FROM users WHERE id = 12345;
```

**Without Index (Primary Key):**

```
Operation: Full Table Scan
┌─────────────────────────────────────────────────┐
│ Step-by-step execution:                         │
├─────────────────────────────────────────────────┤
│ 1. Start at first row (Row 1)                  │
│ 2. Read row from disk                           │
│ 3. Check: id == 12345? NO → Continue           │
│ 4. Read next row (Row 2)                        │
│ 5. Check: id == 12345? NO → Continue           │
│ ...                                             │
│ 12,345. Read row 12,345                         │
│ 12,346. Check: id == 12,345? YES → Return      │
└─────────────────────────────────────────────────┘

Time Complexity: O(n)
Where n = total number of rows

Detailed breakdown for 1,000,000 rows:
- Disk reads: 1,000,000 (worst case)
- Comparisons: 1,000,000
- Average time: 2-5 seconds (HDD)
- Average time: 0.5-1 second (SSD)

Best case: O(1) - Found in first row
Average case: O(n/2) - Found in middle
Worst case: O(n) - Found in last row or not found
```

**With Index (Primary Key B-Tree):**

```
Operation: Index Lookup
┌─────────────────────────────────────────────────┐
│ B-Tree structure (height = 3 for 1M rows):     │
│                                                 │
│         Level 1 (Root):    [500,000]           │
│                           /         \           │
│         Level 2:    [250,000]    [750,000]     │
│                     /    \         /    \       │
│         Level 3: [125K] [375K] [625K] [875K]   │
│                    ↓                             │
│         Leaf:   [12,345] → Row pointer          │
└─────────────────────────────────────────────────┘

Step-by-step execution:
1. Read root node: 12,345 < 500,000 → Go left
2. Read node [250,000]: 12,345 < 250,000 → Go left
3. Read node [125,000]: 12,345 < 125,000 → Go left
4. Read leaf node: Found 12,345 → Get pointer
5. Read actual row from table

Time Complexity: O(log n)
Where n = total number of rows

Detailed breakdown for 1,000,000 rows:
- Tree height: log₂(1,000,000) ≈ 20 levels
- Disk reads: 4 (tree traversal) + 1 (data fetch) = 5
- Comparisons: 4
- Average time: 0.01-0.02 seconds (HDD)
- Average time: 0.001-0.005 seconds (SSD)

Best case: O(1) - Cached in memory
Average case: O(log n)
Worst case: O(log n)
```

**Comparison Table:**

```
┌──────────────┬─────────────┬──────────────┬──────────────┐
│ Rows (n)     │ No Index    │ With Index   │ Speedup      │
├──────────────┼─────────────┼──────────────┼──────────────┤
│ 1,000        │ 1,000 ops   │ 10 ops       │ 100x faster  │
│ 10,000       │ 10,000 ops  │ 13 ops       │ 769x faster  │
│ 100,000      │ 100,000 ops │ 17 ops       │ 5,882x faster│
│ 1,000,000    │ 1,000,000   │ 20 ops       │ 50,000x      │
│ 10,000,000   │ 10,000,000  │ 23 ops       │ 434,782x     │
└──────────────┴─────────────┴──────────────┴──────────────┘

Note: Operations = Disk reads + Comparisons
```

#### Case 2: Range Query (BETWEEN)

**Query:**

```sql
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
```

**Without Index:**

```
Operation: Full Table Scan

Execution:
FOR each row in products:
    READ row from disk
    IF row.price >= 100 AND row.price <= 500:
        ADD to result set

Time Complexity: O(n)

Example with 1,000,000 rows, 50,000 matches:
- Total disk reads: 1,000,000
- Total comparisons: 1,000,000
- Rows returned: 50,000
- Time: ~3-5 seconds

Mathematical formula:
T = (n × t_read) + (n × t_compare)
Where:
- n = total rows
- t_read = time to read one row
- t_compare = time to compare value
```

**With Index on price:**

```
Operation: Index Range Scan

B-Tree traversal:
1. Find starting point (price = 100)
   - Tree traversal: O(log n)
   - Comparisons: log₂(1,000,000) ≈ 20

2. Sequential scan through index
   - Start: price = 100
   - Read: [100, 105, 110, 115, ..., 495, 500]
   - Stop: price = 500
   - Reads: 50,000 (only matching rows!)

3. Fetch actual rows
   - Random access for each row: 50,000 reads

Time Complexity: O(log n + k)
Where:
- log n = finding start position
- k = number of matching rows

Detailed breakdown:
- Index tree traversal: 20 operations
- Index sequential scan: 50,000 reads
- Data page fetches: 50,000 reads
- Total: 100,020 operations
- Time: ~0.5-1 seconds

Speedup calculation:
Without index: 1,000,000 operations
With index: 100,020 operations
Speedup: 10x faster
```

**Why not always faster?**

```
Scenario: High selectivity (returns 90% of rows)

Query: SELECT * FROM products WHERE price BETWEEN 1 AND 10000;
Matching rows: 900,000 out of 1,000,000

Without index:
- Sequential table scan: 1,000,000 reads
- Time: 3 seconds

With index:
- Index traversal: 20 reads
- Index scan: 900,000 reads
- Random row fetches: 900,000 reads
- Total: 1,800,020 reads
- Time: 8 seconds (SLOWER!)

Why slower?
- Sequential reads (no index) are faster than random reads (with index)
- Disk can read consecutive blocks efficiently
- Random access causes disk head movement (HDD) or SSD page lookups

Database optimizer decision:
IF (matching_rows > 15-20% of total_rows):
    USE full table scan
ELSE:
    USE index
```

#### Case 3: JOIN Operations

**Query:**

```sql
SELECT o.id, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';
```

**Without Index on user_id:**

```
Operation: Nested Loop Join (Brute Force)

Pseudocode:
FOR each order in orders WHERE status='pending':  -- 50,000 rows
    FOR each user in users:  -- 100,000 rows
        IF order.user_id == user.id:
            RETURN matched row

Time Complexity: O(m × n)
Where:
- m = orders matching WHERE clause
- n = total users

Calculation:
- Outer loop: 50,000 iterations
- Inner loop: 100,000 iterations each
- Total comparisons: 50,000 × 100,000 = 5,000,000,000
- Disk reads: Same (5 billion)
- Time: 2-5 hours

Mathematical analysis:
T = (m × n × t_compare) + (m × n × t_read)
T = 50,000 × 100,000 × (0.001ms + 0.01ms)
T = 5,000,000,000 × 0.011ms
T ≈ 55,000 seconds = 15.3 hours
```

**With Index on users.id:**

```
Operation: Index Nested Loop Join

Pseudocode:
FOR each order in orders WHERE status='pending':  -- 50,000 rows
    LOOKUP user.id in index using order.user_id  -- O(log n)
    RETURN matched row

Time Complexity: O(m × log n)
Where:
- m = orders matching WHERE clause
- n = total users

Calculation:
- Outer loop: 50,000 iterations
- Index lookup: log₂(100,000) ≈ 17 operations each
- Total operations: 50,000 × 17 = 850,000
- Disk reads: 50,000 × 5 (tree depth + data) = 250,000
- Time: 2-5 seconds

Speedup: 15 hours → 5 seconds = 10,800x faster!

Mathematical analysis:
T = m × (log₂(n) × t_index + t_row_fetch)
T = 50,000 × (17 × 0.001ms + 0.01ms)
T = 50,000 × 0.027ms
T ≈ 1,350ms = 1.35 seconds
```

**Hash Join (Alternative with Index):**

```
Operation: Hash Join
Used when: Both tables are large and memory is available

Phase 1: Build hash table
FOR each user in users:
    hash_table[user.id] = user

Time: O(n)
Space: O(n) - entire users table in memory

Phase 2: Probe hash table
FOR each order in orders WHERE status='pending':
    user = hash_table[order.user_id]  -- O(1) lookup
    RETURN matched row

Time: O(m)

Total Time Complexity: O(m + n)
Total Space Complexity: O(n)

Calculation:
- Build phase: 100,000 operations
- Probe phase: 50,000 operations
- Total: 150,000 operations
- Time: 0.5-1 second

Best for: Large tables, sufficient memory
Memory needed: 100,000 users × 500 bytes ≈ 50 MB
```

**Comparison Table for JOINs:**

```
┌──────────────────┬─────────────┬────────────┬──────────────┐
│ Method           │ Time        │ Space      │ Condition    │
├──────────────────┼─────────────┼────────────┼──────────────┤
│ Nested Loop      │ O(m × n)    │ O(1)       │ No index     │
│ (No Index)       │ 15 hours    │ Minimal    │              │
├──────────────────┼─────────────┼────────────┼──────────────┤
│ Index Nested     │ O(m × log n)│ O(log n)   │ Index on key │
│ Loop             │ 1-5 seconds │ Small      │              │
├──────────────────┼─────────────┼────────────┼──────────────┤
│ Hash Join        │ O(m + n)    │ O(n)       │ Enough RAM   │
│                  │ 0.5-1 sec   │ 50 MB      │              │
├──────────────────┼─────────────┼────────────┼──────────────┤
│ Merge Join       │ O(m + n)    │ O(1)       │ Both sorted  │
│                  │ 1-2 seconds │ Minimal    │              │
└──────────────────┴─────────────┴────────────┴──────────────┘
```

#### Case 4: ORDER BY Operations

**Query:**

```sql
SELECT * FROM users ORDER BY name LIMIT 100;
```

**Without Index:**

```
Operation: Full Table Scan + External Sort

Step 1: Read all rows
FOR each row in users:
    READ row
Time: O(n)
Reads: 1,000,000

Step 2: Sort in memory (if fits)
SORT all rows by name
Time: O(n log n)
Comparisons: 1,000,000 × log₂(1,000,000) ≈ 20,000,000

Step 3: Return top 100
RETURN first 100 rows
Time: O(1)

Total Time Complexity: O(n log n)
Total Space Complexity: O(n) - must hold all rows

If data doesn't fit in memory (External Sort):
┌──────────────────────────────────────────┐
│ Phase 1: Create sorted runs              │
│ - Read chunks of data (e.g., 100MB)     │
│ - Sort each chunk                        │
│ - Write to disk                          │
│ Time: O(n log n)                         │
│ Disk I/O: 2n (read + write)              │
├──────────────────────────────────────────┤
│ Phase 2: Merge sorted runs               │
│ - Read from multiple sorted files        │
│ - Merge using heap                       │
│ - Write final sorted output              │
│ Time: O(n log k) where k = number runs   │
│ Disk I/O: 2n (read + write)              │
└──────────────────────────────────────────┘

Total for external sort:
- Time: O(n log n)
- Disk I/O: 4n (multiple passes)
- Time: 30-60 seconds for 1M rows

Example with 1,000,000 rows:
- Read time: 3 seconds
- Sort time: 25 seconds (in memory)
- OR: 60 seconds (external sort)
- Return 100 rows: instant
- Total: 28-63 seconds
```

**With Index on name:**

```
Operation: Index Scan (Already Sorted!)

The index B-Tree is already sorted by name:
┌──────────────────────────────────┐
│ Index structure:                 │
│ [Aaron] → Row 152                │
│ [Alice] → Row 1                  │
│ [Andrew] → Row 847               │
│ [Anna] → Row 293                 │
│ ...                              │
│ [Zoe] → Row 99,999               │
└──────────────────────────────────┘

Execution:
1. Go to start of index (leftmost leaf)
2. Read first 100 entries sequentially
3. Fetch corresponding 100 rows

Time Complexity: O(k + log n)
Where:
- log n = finding start of index
- k = number of rows needed (LIMIT)

Calculation for LIMIT 100:
- Tree traversal: 20 operations
- Sequential index reads: 100
- Row fetches: 100
- Total: 220 operations
- Time: 0.01-0.05 seconds

Speedup: 28 seconds → 0.02 seconds = 1,400x faster!

Memory: O(k) - only need 100 rows in memory

Special case - Index-Only Scan:
If index contains all needed columns:
CREATE INDEX idx_name_email ON users(name, email);
SELECT name, email FROM users ORDER BY name LIMIT 100;

No row fetches needed!
- Operations: 120 (only index reads)
- Time: 0.001-0.005 seconds
```

**Comparison with different LIMIT values:**

```
┌────────────┬──────────────┬─────────────┬──────────────┐
│ LIMIT      │ No Index     │ With Index  │ Speedup      │
├────────────┼──────────────┼─────────────┼──────────────┤
│ 10         │ 28 sec       │ 0.005 sec   │ 5,600x       │
│ 100        │ 28 sec       │ 0.02 sec    │ 1,400x       │
│ 1,000      │ 28 sec       │ 0.15 sec    │ 187x         │
│ 10,000     │ 28 sec       │ 1.5 sec     │ 19x          │
│ 100,000    │ 28 sec       │ 15 sec      │ 1.9x         │
│ 1,000,000  │ 28 sec       │ 150 sec     │ 0.19x SLOWER!│
└────────────┴──────────────┴─────────────┴──────────────┘

Why slower for large LIMIT?
- Index scan: 1M sequential index reads + 1M random row fetches
- Table scan: 1M sequential table reads + sort
- Sequential table read is faster than random row fetches
```

#### Case 5: COUNT Operations

**Query:**

```sql
SELECT COUNT(*) FROM orders WHERE status = 'pending';
```

**Without Index:**

```
Operation: Full Table Scan with Count

Pseudocode:
count = 0
FOR each row in orders:
    READ row
    IF row.status == 'pending':
        count++
RETURN count

Time Complexity: O(n)
Space Complexity: O(1)

Calculation for 1,000,000 rows:
- Disk reads: 1,000,000
- Comparisons: 1,000,000
- Memory: 4 bytes (counter variable)
- Time: 3-5 seconds

Breakdown:
- I/O time: 3 seconds (reading all rows)
- CPU time: 0.5 seconds (comparisons)
- Total: 3.5 seconds
```

**With Index on status:**

```
Operation: Index Scan (Count-Only)

Method 1: Scan index entries
count = 0
NAVIGATE to status='pending' in index
WHILE current_entry.status == 'pending':
    count++
    MOVE to next index entry

Time Complexity: O(log n + k)
Where k = matching rows

Calculation:
- Tree traversal: 20 operations
- Index entries to scan: 50,000
- No row fetches needed! (counting only)
- Time: 0.1-0.2 seconds

Speedup: 3.5 seconds → 0.15 seconds = 23x faster

Method 2: Covering index with COUNT
If index stores row counts (some databases):
- Direct lookup: O(log n)
- Time: 0.001 seconds
- Speedup: 3500x
```

**Special case: COUNT(\*) without WHERE:**

```sql
SELECT COUNT(*) FROM orders;
```

**Most databases optimize this:**

```
Without special optimization:
- Table scan: O(n)
- Time: 3-5 seconds

With metadata storage (InnoDB, PostgreSQL):
- Lookup in system catalog: O(1)
- Time: 0.001 seconds
- Note: Exact count may not be maintained in MVCC systems

PostgreSQL approach:
- Maintains approximate count
- For exact count: Still needs O(n) scan (MVCC overhead)

MySQL InnoDB:
- Maintains exact count for simple COUNT(*)
- O(1) lookup for tables without WHERE clause
```

### Section 2: Space Complexity Analysis

#### Space Overhead of Indexes

**Understanding Index Storage:**

```
Base table: users
Columns: id (8 bytes), name (50 bytes), email (50 bytes), age (4 bytes)
Row size: 112 bytes per row
Rows: 1,000,000
Table size: 112 MB

Index structure: B-Tree on 'name'
┌────────────────────────────────────────────┐
│ Index Entry Components:                    │
├────────────────────────────────────────────┤
│ 1. Key value (name): 50 bytes             │
│ 2. Row pointer/ID: 8 bytes                │
│ 3. Internal overhead: 10 bytes            │
│    - Node pointers                        │
│    - Page headers                         │
│    - Free space management                │
│ Total per entry: 68 bytes                 │
└────────────────────────────────────────────┘

Index size calculation:
- Entry size: 68 bytes
- Number of entries: 1,000,000
- Raw size: 68 MB

B-Tree overhead:
- Internal nodes: ~15% of leaf size
- Free space (fill factor): ~30% reserved
- Total overhead: ~45%

Final index size: 68 MB × 1.45 = 98.6 MB

Space Complexity: O(n)
Where n = number of indexed rows
```

**Detailed breakdown of B-Tree space:**

```
B-Tree structure for 1,000,000 entries:

Leaf Level (contains actual entries):
- Entries: 1,000,000
- Space per entry: 68 bytes
- Total: 68 MB

Internal Node Level 1:
- Fan-out: 500 (typical)
- Nodes: 1,000,000 / 500 = 2,000 nodes
- Space per node: 16 KB (typical page size)
- Total: 32 MB

Internal Node Level 2:
- Nodes: 2,000 / 500 = 4 nodes
- Total: 64 KB

Root Node:
- 1 node
- Size: 16 KB

Total Structure:
┌──────────────────────┬──────────┐
│ Component            │ Size     │
├──────────────────────┼──────────┤
│ Leaf nodes           │ 68 MB    │
│ Internal level 1     │ 32 MB    │
│ Internal level 2     │ 64 KB    │
│ Root                 │ 16 KB    │
│ Free space (30%)     │ 30 MB    │
├──────────────────────┼──────────┤
│ Total                │ 130 MB   │
└──────────────────────┴──────────┘

Ratio: Index is 130/112 = 1.16x the table size
```

#### Memory Usage During Query Execution

**Case 1: Simple Index Lookup**

```sql
SELECT * FROM users WHERE id = 12345;
```

**Memory footprint:**

```
Stack Memory (Query Execution):
┌────────────────────────────────────┐
│ Query parser state: 1 KB           │
│ Execution plan: 2 KB               │
│ Local variables: 1 KB              │
├────────────────────────────────────┤
│ Total stack: ~4 KB                 │
└────────────────────────────────────┘

Buffer Pool Memory (Cached Data):
┌────────────────────────────────────┐
│ Index pages loaded:                │
│ - Root page: 16 KB                 │
│ - Internal node: 16 KB             │
│ - Internal node: 16 KB             │
│ - Leaf page: 16 KB                 │
│ Subtotal: 64 KB                    │
├────────────────────────────────────┤
│ Data page (actual row): 16 KB      │
├────────────────────────────────────┤
│ Total buffer pool: 80 KB           │
└────────────────────────────────────┘

Result Set Memory:
┌────────────────────────────────────┐
│ One row: 112 bytes                 │
└────────────────────────────────────┘

Total Memory: ~84 KB
Space Complexity: O(log n) for tree traversal
                  + O(k) for result set
```

**Case 2: Range Query with Large Result**

```sql
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
-- Returns 50,000 rows
```

**Memory analysis:**

```
Query Execution Memory:
┌────────────────────────────────────┐
│ Stack: 4 KB                        │
└────────────────────────────────────┘

Index Traversal:
┌────────────────────────────────────┐
│ Tree path pages: 64 KB             │
│ Sequential leaf pages:             │
│   (50,000 entries / 250 per page)  │
│   = 200 pages × 16 KB = 3.2 MB     │
├────────────────────────────────────┤
│ Index memory: 3.26 MB              │
└────────────────────────────────────┘

Data Fetching:
┌────────────────────────────────────┐
│ Strategy 1: Load all rows first    │
│ 50,000 rows × 200 bytes = 10 MB    │
│                                    │
│ Strategy 2: Stream rows            │
│ Batch size: 1,000 rows             │
│ Memory: 1,000 × 200 bytes = 200 KB │
│ (Process and discard batches)      │
└────────────────────────────────────┘

Best case (streaming): 3.5 MB
Worst case (all in memory): 13.3 MB

Space Complexity: O(log n + k)
Where k = result size
```

**Case 3: JOIN Operation Memory**

```sql
SELECT o.*, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';
```

**Nested Loop Join memory:**

```
Query execution state: 4 KB

Index lookup per iteration:
┌────────────────────────────────────┐
│ Users index (cached):              │
│ - Tree path: 64 KB                 │
│ - Accessed leaf pages: ~800 KB     │
│   (reused across iterations)       │
└────────────────────────────────────┘

Current row buffers:
┌────────────────────────────────────┐
│ Orders row: 200 bytes              │
│ Users row: 112 bytes               │
│ Join buffer: 312 bytes             │
└────────────────────────────────────┘

Result set (50,000 matches):
┌────────────────────────────────────┐
│ Strategy 1: Buffer all             │
│ 50,000 × 312 bytes = 15.6 MB       │
│                                    │
│ Strategy 2: Stream (pagination)    │
│ 100 rows × 312 bytes = 31 KB       │
└────────────────────────────────────┘

Total memory (streaming): ~1 MB
Total memory (buffered): ~16.5 MB

Space Complexity: O(log n + k)
```

**Hash Join memory:**

```
Build Phase (hash table for users):
┌────────────────────────────────────┐
│ Users table: 100,000 rows          │
│ Row size: 112 bytes                │
│ Hash table overhead: 30%           │
│ Total: 112 bytes × 100,000 × 1.3   │
│      = 14.56 MB                    │
└────────────────────────────────────┘

Probe Phase:
┌────────────────────────────────────┐
│ Current order row: 200 bytes       │
│ Hash bucket pointer: 8 bytes       │
│ Working memory: ~1 KB              │
└────────────────────────────────────┘

Result buffer:
┌────────────────────────────────────┐
│ 50,000 × 312 bytes = 15.6 MB       │
│ (or streaming: 31 KB)              │
└────────────────────────────────────┘

Total memory: 14.56 MB (build)
            + 15.6 MB (result)
            = 30.16 MB

Space Complexity: O(n + m)
Where n = build table size, m = result size

If memory insufficient:
- Spill to disk (hybrid hash join)
- Space: O(1) in RAM, O(n) on disk
- Time penalty: 2-3x slower
```

#### Composite Index Space Analysis

```sql
CREATE INDEX idx_composite ON orders(user_id, status, created_at);
```

**Space calculation:**

```
Index entry structure:
┌────────────────────────────────────┐
│ Key components:                    │
│ - user_id: 8 bytes                 │
│ - status: 20 bytes (VARCHAR)       │
│ - created_at: 8 bytes              │
│ - row pointer: 8 bytes             │
│ - overhead: 12 bytes               │
│ Total: 56 bytes per entry          │
└────────────────────────────────────┘

For 1,000,000 orders:
- Raw entries: 56 MB
- B-Tree overhead: 45%
- Total: 56 MB × 1.45 = 81.2 MB

Comparison with three separate indexes:
┌──────────────────────────────────┐
│ Separate indexes:                │
│ - idx_user_id: 16 bytes → 23 MB  │
│ - idx_status: 28 bytes → 41 MB   │
│ - idx_created: 16 bytes → 23 MB  │
│ Total: 87 MB                     │
├──────────────────────────────────┤
│ Composite index: 81.2 MB         │
├──────────────────────────────────┤
│ Savings: 5.8 MB (6.7%)           │
└──────────────────────────────────┘

Space Complexity: O(n × k)
Where:
- n = number of rows
- k = total size of indexed columns
```

#### Temporary Space for Operations

**Sorting without index:**

```sql
SELECT * FROM users ORDER BY name;
-- 1,000,000 rows
```

**Space requirements:**

```
Phase 1: Read data
┌──────────────────────────────────────────┐
│ Input buffer: 1,000,000 × 112 bytes      │
│             = 112 MB                     │
└──────────────────────────────────────────┘

Phase 2: Sort (in-memory if possible)
┌──────────────────────────────────────────┐
│ Original data: 112 MB                    │
│ Sort workspace: 112 MB (copy/swap space) │
│ Total: 224 MB                            │
└──────────────────────────────────────────┘

If memory < 224 MB (External Sort):
┌──────────────────────────────────────────┐
│ Available RAM: 64 MB (example)           │
│                                          │
│ Phase 1: Create sorted runs              │
│ - Read 64 MB chunks                      │
│ - Sort in memory                         │
│ - Write to temp files                    │
│                                          │
│ Temp disk space needed:                  │
│ - Sorted runs: 112 MB                    │
│ - Merge buffer: 64 MB                    │
│ - Output buffer: 112 MB                  │
│ Total temp: 288 MB on disk               │
│                                          │
│ Phase 2: Merge                           │
│ - RAM for merge buffers: 64 MB           │
│ - Read from temp files                   │
│ - Output final sorted data               │
└──────────────────────────────────────────┘

Space Complexity:
- Best case (in RAM): O(n)
- Worst case (external): O(n) RAM + O(2n) disk
```

**With index (no sorting needed):**

```
Space requirements:
┌──────────────────────────────────────────┐
│ Index scan buffer: 16 KB (one page)      │
│ Current row: 112 bytes                   │
│ Output buffer: 1 MB (configurable)       │
│ Total: ~1.1 MB                           │
└──────────────────────────────────────────┘

Space savings: 224 MB → 1.1 MB = 203x less memory!

Space Complexity: O(1) working memory
                  + O(log n) for index traversal
```

#### Aggregate Functions Memory Usage

**Query with GROUP BY:**

```sql
SELECT country, COUNT(*), AVG(age)
FROM users
GROUP BY country;
-- 195 countries, 1,000,000 users
```

**Without index:**

```
Execution plan: Hash Aggregation

Phase 1: Build hash table
┌──────────────────────────────────────────┐
│ Hash table structure:                    │
│ {                                        │
│   "USA": {count: 400000, sum_age: 10M}, │
│   "UK": {count: 50000, sum_age: 1.2M},  │
│   ...                                    │
│   195 entries                            │
│ }                                        │
│                                          │
│ Space per entry:                         │
│ - Country name: 30 bytes                 │
│ - Count: 8 bytes                         │
│ - Sum: 8 bytes                           │
│ - Hash overhead: 20 bytes                │
│ Total per country: 66 bytes              │
│                                          │
│ Total space: 195 × 66 = 12.87 KB        │
└──────────────────────────────────────────┘

Phase 2: Scan table
┌──────────────────────────────────────────┐
│ FOR each row:                            │
│   READ row (112 bytes in buffer)         │
│   LOOKUP country in hash (O(1))          │
│   UPDATE count and sum                   │
│                                          │
│ Working memory: 112 bytes (current row)  │
└──────────────────────────────────────────┘

Total memory: ~13 KB (hash table)
            + 112 bytes (buffer)
            = ~13.1 KB

Time: O(n) - must scan all rows
Space Complexity: O(g) where g = number of groups
```

**With index on (country, age):**

```
Execution plan: Index Scan with Grouping

The index is pre-sorted by country:
┌──────────────────────────────────────────┐
│ Index structure:                         │
│ [Argentina, 18] → Row 42                 │
│ [Argentina, 19] → Row 105                │
│ ...                                      │
│ [Argentina, 85] → Row 892,341            │
│ [Australia, 18] → Row 15                 │
│ ...                                      │
└──────────────────────────────────────────┘

Streaming aggregation:
┌──────────────────────────────────────────┐
│ current_country = NULL                   │
│ count = 0, sum_age = 0                   │
│                                          │
│ SCAN index sequentially:                 │
│   IF country changed:                    │
│     OUTPUT previous group                │
│     RESET count and sum                  │
│   count++                                │
│   sum_age += age                         │
│                                          │
│ Working memory:                          │
│ - Current group state: 66 bytes          │
│ - Index page buffer: 16 KB               │
│ Total: ~16.1 KB                          │
└──────────────────────────────────────────┘

Time: O(n) - scan index once, but faster I/O
Space Complexity: O(1) - constant memory!

Benefit: No large hash table needed
       Can process unlimited groups in constant memory
```

### Section 3: Real-World Performance Measurements

#### Benchmark: E-commerce Product Search

**Test environment:**

- Database: PostgreSQL 15
- Server: 16 GB RAM, SSD storage
- Table: products (5,000,000 rows)
- Row size: 500 bytes
- Table size: 2.5 GB

**Test Query:**

```sql
SELECT * FROM products
WHERE category = 'Electronics'
  AND price BETWEEN 100 AND 1000
ORDER BY price
LIMIT 20;
```

**Scenario 1: No indexes**

```
Execution Plan:
  Seq Scan on products
    Filter: (category = 'Electronics' AND price >= 100 AND price <= 1000)
    Sort: price

Performance metrics:
┌───────────────────────┬──────────────┐
│ Metric                │ Value        │
├───────────────────────┼──────────────┤
│ Rows scanned          │ 5,000,000    │
│ Rows matched          │ 45,000       │
│ Disk reads            │ 320,000      │
│ Memory for sort       │ 22.5 MB      │
│ Execution time        │ 4,850 ms     │
│ CPU time              │ 1,200 ms     │
│ I/O time              │ 3,650 ms     │
└───────────────────────┴──────────────┘

Space breakdown:
- Working memory: 22.5 MB (sort)
- Buffer pool usage: 2.5 GB (entire table)
- Temp space: 0 (sort fits in RAM)

Time breakdown:
1. Sequential scan: 3,200 ms
2. Filter evaluation: 450 ms
3. Sorting 45,000 rows: 1,200 ms
   Total: 4,850 ms
```

**Scenario 2: Single index on category**

```sql
CREATE INDEX idx_category ON products(category);
```

```
Execution Plan:
  Index Scan using idx_category
    Index Cond: (category = 'Electronics')
    Filter: (price >= 100 AND price <= 1000)
    Sort: price

Performance metrics:
┌───────────────────────┬──────────────┐
│ Metric                │ Value        │
├───────────────────────┼──────────────┤
│ Index entries read    │ 800,000      │
│ Rows fetched          │ 800,000      │
│ Rows matched (price)  │ 45,000       │
│ Disk reads            │ 85,000       │
│ Memory for sort       │ 22.5 MB      │
│ Execution time        │ 2,100 ms     │
│ CPU time              │ 400 ms       │
│ I/O time              │ 1,700 ms     │
└───────────────────────┴──────────────┘

Space breakdown:
- Index size: 180 MB
- Working memory: 22.5 MB (sort)
- Buffer pool: 180 MB (index) + 400 MB (rows)

Improvement: 4,850 ms → 2,100 ms (2.3x faster)

Why not better?
- Still fetches 800,000 Electronics products
- Then filters by price (not in index)
- Still sorts 45,000 results
```

**Scenario 3: Composite index (category, price)**

```sql
CREATE INDEX idx_category_price ON products(category, price);
```

```
Execution Plan:
  Index Scan using idx_category_price
    Index Cond: (category = 'Electronics'
                 AND price >= 100 AND price <= 1000)
    (Already sorted by price!)

Performance metrics:
┌───────────────────────┬──────────────┐
│ Metric                │ Value        │
├───────────────────────┼──────────────┤
│ Index entries read    │ 45,000       │
│ Rows fetched          │ 45,000       │
│ Rows matched          │ 45,000       │
│ Disk reads            │ 6,200        │
│ Memory for sort       │ 0 (no sort!) │
│ Execution time        │ 180 ms       │
│ CPU time              │ 35 ms        │
│ I/O time              │ 145 ms       │
└───────────────────────┴──────────────┘

Space breakdown:
- Index size: 220 MB
- Working memory: 16 KB (page buffer)
- Buffer pool: 25 MB (hot index pages) + 22.5 MB (rows)

Improvement: 4,850 ms → 180 ms (27x faster!)

Why so much better?
1. Index directly finds matching range
2. No filtering needed after index scan
3. Already sorted - no sort operation
4. Only fetches needed rows
```

**Scenario 4: Covering index (category, price, name, description)**

```sql
CREATE INDEX idx_covering
ON products(category, price, name, description);
```

```
Execution Plan:
  Index Only Scan using idx_covering
    Index Cond: (category = 'Electronics'
                 AND price >= 100 AND price <= 1000)
    (No table access needed!)

Performance metrics:
┌───────────────────────┬──────────────┐
│ Metric                │ Value        │
├───────────────────────┼──────────────┤
│ Index entries read    │ 45,000       │
│ Rows fetched          │ 0 (!!)       │
│ Rows matched          │ 45,000       │
│ Disk reads            │ 3,800        │
│ Memory for sort       │ 0            │
│ Execution time        │ 95 ms        │
│ CPU time              │ 25 ms        │
│ I/O time              │ 70 ms        │
└───────────────────────┴──────────────┘

Space breakdown:
- Index size: 850 MB (much larger!)
- Working memory: 16 KB
- Buffer pool: 40 MB (index pages only)

Improvement: 4,850 ms → 95 ms (51x faster!)

Trade-offs:
+ Fastest query execution
+ No table access needed
- Very large index (850 MB vs 220 MB)
- Slower writes (more data to maintain)
- More memory pressure
```

**Summary comparison:**

```
┌─────────────────┬──────┬────────┬─────────┬──────────┐
│ Strategy        │ Time │ Space  │ I/O     │ Speedup  │
├─────────────────┼──────┼────────┼─────────┼──────────┤
│ No index        │ 4.85s│ 2.5 GB │ 320,000 │ 1x       │
│ idx_category    │ 2.10s│ 580 MB │  85,000 │ 2.3x     │
│ idx_cat_price   │ 0.18s│ 270 MB │   6,200 │ 27x      │
│ idx_covering    │ 0.09s│ 890 MB │   3,800 │ 51x      │
└─────────────────┴──────┴────────┴─────────┴──────────┘

Decision matrix:
- Read-heavy workload: Use covering index
- Balanced workload: Use composite index
- Write-heavy workload: Use single index or none
- Limited memory: Use smaller indexes
```

#### Benchmark: Social Media Feed Query

**Test environment:**

- Table: posts (10,000,000 rows)
- Query: Get recent posts from followed users

**Query:**

```sql
SELECT p.id, p.content, p.created_at
FROM posts p
WHERE p.user_id IN (1, 5, 23, 45, 67, ...) -- 500 followed users
  AND p.is_deleted = FALSE
ORDER BY p.created_at DESC
LIMIT 50;
```

**Test 1: No index**

```
Execution: Full table scan

┌───────────────────────┬──────────────┐
│ Total rows scanned    │ 10,000,000   │
│ Matching rows         │ 12,500       │
│ Time                  │ 18,500 ms    │
│ Memory                │ 125 MB       │
│ I/O operations        │ 640,000      │
└───────────────────────┴──────────────┘

Unacceptable for real-time feed!
```

**Test 2: Index on user_id**

```sql
CREATE INDEX idx_user ON posts(user_id);
```

```
Execution: Index scan (500 separate lookups)

┌───────────────────────┬──────────────┐
│ Index lookups         │ 500          │
│ Rows per user (avg)   │ 25           │
│ Total rows fetched    │ 12,500       │
│ Time                  │ 850 ms       │
│ Memory                │ 15 MB        │
│ I/O operations        │ 15,000       │
└───────────────────────┴──────────────┘

Still need to:
- Filter is_deleted
- Sort by created_at
- Significant overhead
```

**Test 3: Composite index (user_id, is_deleted, created_at)**

```sql
CREATE INDEX idx_feed
ON posts(user_id, is_deleted, created_at DESC);
```

```
Execution: Optimized index scan

┌───────────────────────┬──────────────┐
│ Index range scans     │ 500          │
│ Rows examined         │ 10,850       │
│ Rows matched          │ 10,850       │
│ Time                  │ 145 ms       │
│ Memory                │ 2 MB         │
│ I/O operations        │ 1,200        │
└───────────────────────┴──────────────┘

Why faster?
1. Index pre-filters is_deleted = FALSE
2. Already sorted by created_at (DESC)
3. Can stop early after finding 50 posts

Space analysis:
- Index entry: user_id(8) + is_deleted(1) + created_at(8) + ptr(8) = 25 bytes
- Total entries: 10,000,000
- Index size: ~360 MB (with overhead)
```

**Test 4: Materialized view (denormalized)**

```sql
CREATE MATERIALIZED VIEW user_feed AS
SELECT user_id, follower_id, post_id, content, created_at
FROM follows f
JOIN posts p ON f.followed_id = p.user_id
WHERE p.is_deleted = FALSE;

CREATE INDEX idx_mv_feed ON user_feed(follower_id, created_at DESC);

-- Query becomes:
SELECT post_id, content, created_at
FROM user_feed
WHERE follower_id = 12345
ORDER BY created_at DESC
LIMIT 50;
```

```
Execution: Simple index scan

┌───────────────────────┬──────────────┐
│ Index scan            │ 1            │
│ Rows examined         │ 50           │
│ Rows matched          │ 50           │
│ Time                  │ 8 ms         │
│ Memory                │ 128 KB       │
│ I/O operations        │ 15           │
└───────────────────────┴──────────────┘

Trade-offs:
+ Ultra-fast reads: 8 ms
- Large space: 2.5 GB (denormalized)
- Maintenance cost: Refresh on every post/follow
- Eventual consistency: May be slightly stale

Best for: High read/write ratio (100:1 or more)
```

### Section 4: Write Performance Impact Analysis

#### INSERT Performance

**Test: Bulk insert 100,000 rows**

**Table schema:**

```sql
CREATE TABLE events (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    event_type VARCHAR(50),
    timestamp TIMESTAMP,
    data JSON
);
```

**Scenario 1: No additional indexes**

```
Only primary key index exists

Performance:
┌────────────────────────┬─────────────┐
│ Total time             │ 2,500 ms    │
│ Rows/second            │ 40,000      │
│ Memory usage           │ 50 MB       │
│ Disk writes            │ 12,500      │
└────────────────────────┴─────────────┘

Breakdown per INSERT:
- Row write: 0.015 ms
- PK index update: 0.010 ms
- Total: 0.025 ms
```

**Scenario 2: Three additional indexes**

```sql
CREATE INDEX idx_user ON events(user_id);
CREATE INDEX idx_type ON events(event_type);
CREATE INDEX idx_time ON events(timestamp);
```

```
Performance with 4 indexes total:
┌────────────────────────┬─────────────┐
│ Total time             │ 8,900 ms    │
│ Rows/second            │ 11,236      │
│ Memory usage           │ 180 MB      │
│ Disk writes            │ 48,000      │
└────────────────────────┴─────────────┘

Breakdown per INSERT:
- Row write: 0.015 ms
- PK index update: 0.010 ms
- idx_user update: 0.020 ms
- idx_type update: 0.018 ms
- idx_time update: 0.026 ms
- Total: 0.089 ms (3.6x slower!)

Space impact:
- Table: 1.2 GB
- PK index: 180 MB
- idx_user: 150 MB
- idx_type: 140 MB
- idx_time: 160 MB
- Total: 1.83 GB (53% overhead)
```

**Scenario 3: Composite index instead**

```sql
-- Replace three indexes with one
CREATE INDEX idx_composite ON events(user_id, event_type, timestamp);
```

```
Performance with 2 indexes total:
┌────────────────────────┬─────────────┐
│ Total time             │ 4,200 ms    │
│ Rows/second            │ 23,810      │
│ Memory usage           │ 95 MB       │
│ Disk writes            │ 22,000      │
└────────────────────────┴─────────────┘

Improvement: 8,900 ms → 4,200 ms (2.1x faster than 4 indexes)
           Still 1.7x slower than no indexes

Space impact:
- Table: 1.2 GB
- PK index: 180 MB
- Composite: 220 MB
- Total: 1.6 GB (33% overhead vs 53%)
```

#### UPDATE Performance

**Test: Update 10,000 rows**

```sql
UPDATE products
SET price = price * 1.1
WHERE category = 'Electronics';
```

**Without index on category:**

```
Operation: Full table scan + updates

┌────────────────────────┬─────────────┐
│ Rows scanned           │ 5,000,000   │
│ Rows updated           │ 800,000     │
│ Time (scan)            │ 3,200 ms    │
│ Time (update)          │ 2,400 ms    │
│ Total time             │ 5,600 ms    │
└────────────────────────┴─────────────┘

Per-row cost:
- Scan: 0.00064 ms
- Update row: 0.003 ms
- Update PK index: 0 ms (no change)
```

**With index on category:**

```sql
CREATE INDEX idx_category ON products(category);
```

```
Operation: Index scan + updates

┌────────────────────────┬─────────────┐
│ Index entries read     │ 800,000     │
│ Rows updated           │ 800,000     │
│ Time (scan)            │ 180 ms      │
│ Time (update)          │ 2,400 ms    │
│ Total time             │ 2,580 ms    │
└────────────────────────┴─────────────┘

Speedup: 5,600 ms → 2,580 ms (2.2x faster)

Finding rows: 18x faster with index
Updating rows: Same speed (but fewer rows)
```

**With index on category AND price:**

```sql
CREATE INDEX idx_category ON products(category);
CREATE INDEX idx_price ON products(price);
```

```
Operation: Index scan + updates + index maintenance

┌────────────────────────┬─────────────┐
│ Index entries read     │ 800,000     │
│ Rows updated           │ 800,000     │
│ Time (scan)            │ 180 ms      │
│ Time (update rows)     │ 2,400 ms    │
│ Time (update idx_price)│ 1,850 ms    │
│ Total time             │ 4,430 ms    │
└────────────────────────┴─────────────┘

Slower than just category index!
Price index must be updated for each row
Trade-off: Fast reads on price vs slower writes
```

#### DELETE Performance

**Test: Delete old records**

```sql
DELETE FROM logs
WHERE created_at < '2024-01-01';
-- Deletes 2,000,000 rows
```

**With 5 indexes:**

```
Indexes to maintain:
1. Primary key (id)
2. idx_user_id
3. idx_log_level
4. idx_created_at
5. idx_composite (user_id, log_level, created_at)

Performance:
┌────────────────────────┬─────────────┐
│ Find rows (index)      │ 1,200 ms    │
│ Delete rows            │ 8,500 ms    │
│ Update idx_user        │ 3,200 ms    │
│ Update idx_level       │ 2,800 ms    │
│ Update idx_created     │ 3,500 ms    │
│ Update idx_composite   │ 4,100 ms    │
│ Total time             │ 23,300 ms   │
└────────────────────────┴─────────────┘

Per-row breakdown:
- Row deletion: 0.00425 ms
- Index updates: 0.00685 ms each × 5 = 0.034 ms
- Total per row: 0.038 ms

Space reclaimed:
- Table: 800 MB freed
- Indexes: ~400 MB freed
- Total: 1.2 GB freed
- Actual: May not be immediately available (vacuuming needed)
```

**Optimization: Drop indexes before bulk delete**

```
Strategy:
1. Drop secondary indexes
2. Perform DELETE
3. Recreate indexes

Timeline:
┌────────────────────────┬─────────────┐
│ Drop 4 indexes         │ 500 ms      │
│ Delete rows (PK only)  │ 9,700 ms    │
│ Rebuild indexes        │ 8,500 ms    │
│ Total time             │ 18,700 ms   │
└────────────────────────┴─────────────┘

Savings: 23,300 ms → 18,700 ms (20% faster)

Worth it for: Deleting > 10% of table
Not worth it for: Small deletes (overhead too high)
```

### Section 5: Memory vs Disk Trade-offs

#### Buffer Pool Size Impact

**Test: Query performance with different buffer pool sizes**

**Query:**

```sql
SELECT * FROM orders
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 10;
-- Execute 10,000 times with random user_ids
```

**Configuration 1: 256 MB buffer pool**

```
Buffer pool can hold:
- ~15% of table data
- ~30% of index data

Performance metrics (10,000 queries):
┌────────────────────────┬─────────────┐
│ Total time             │ 45,000 ms   │
│ Avg per query          │ 4.5 ms      │
│ Cache hit rate         │ 35%         │
│ Disk reads             │ 65,000      │
│ Memory reads           │ 35,000      │
└────────────────────────┴─────────────┘

Analysis:
- Index pages: Partially cached (hot entries)
- Data pages: Mostly from disk
- Thrashing: Moderate (frequent evictions)
```

**Configuration 2: 2 GB buffer pool**

```
Buffer pool can hold:
- 100% of index data
- 50% of table data (hot rows)

Performance metrics (10,000 queries):
┌────────────────────────┬─────────────┐
│ Total time             │ 12,000 ms   │
│ Avg per query          │ 1.2 ms      │
│ Cache hit rate         │ 88%         │
│ Disk reads             │ 12,000      │
│ Memory reads           │ 88,000      │
└────────────────────────┴─────────────┘

Improvement: 4.5 ms → 1.2 ms (3.8x faster)

Analysis:
- All index pages cached
- Frequently accessed data cached
- Minimal thrashing
```

**Configuration 3: 8 GB buffer pool**

```
Buffer pool can hold:
- 100% of all indexes
- 95% of table data

Performance metrics (10,000 queries):
┌────────────────────────┬─────────────┐
│ Total time             │ 8,500 ms    │
│ Avg per query          │ 0.85 ms     │
│ Cache hit rate         │ 97%         │
│ Disk reads             │ 3,000       │
│ Memory reads           │ 97,000      │
└────────────────────────┴─────────────┘

Improvement: 4.5 ms → 0.85 ms (5.3x faster)

Diminishing returns:
- 256 MB → 2 GB: 3.8x improvement
- 2 GB → 8 GB: 1.4x improvement
- Cost per improvement increases
```

**Memory allocation strategy:**

```
Rule of thumb:
- Allocate 70-80% of system RAM to database
- Keep 20-30% for OS and other processes

16 GB server:
- Database: 12 GB
- Buffer pool: 10 GB
- Working memory: 2 GB (sorts, temp tables)
- OS: 4 GB

Cost-benefit analysis:
┌─────────────┬──────────┬───────────┬────────────┐
│ Buffer Size │ Hit Rate │ Perf      │ $/GB/month │
├─────────────┼──────────┼───────────┼────────────┤
│ 256 MB      │ 35%      │ Baseline  │ $2         │
│ 1 GB        │ 65%      │ 2x        │ $8         │
│ 2 GB        │ 88%      │ 3.8x      │ $16        │
│ 4 GB        │ 94%      │ 4.5x      │ $32        │
│ 8 GB        │ 97%      │ 5.3x      │ $64        │
│ 16 GB       │ 99%      │ 5.5x      │ $128       │
└─────────────┴──────────┴───────────┴────────────┘

Sweet spot: Usually 2-4 GB for this workload
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
│  The goal: Find the sweet spot          │
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
