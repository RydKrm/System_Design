# Database Scan Methods: A Comprehensive Study

## Table of Contents

1. [Introduction](#introduction)
2. [Table Scan (Sequential Scan)](#table-scan)
3. [Index Scan](#index-scan)
4. [Bitmap Scan](#bitmap-scan)
5. [Time Complexity Analysis](#time-complexity)
6. [Space Complexity Analysis](#space-complexity)
7. [Comparative Analysis](#comparative-analysis)
8. [Practical Recommendations](#recommendations)

---

## Introduction

When a database management system (DBMS) needs to retrieve data from a table, it must decide **how** to access that data. This decision is crucial because it directly impacts the performance of your queries. Think of it like searching for a book in a library—you could search shelf by shelf, use the card catalog, or use a combination of both methods.

The three primary scanning methods are:

- **Table Scan (Sequential Scan)**: Reading every row in the table
- **Index Scan**: Using an index structure to find specific rows
- **Bitmap Scan**: Creating a bitmap of matching rows before fetching them

Each method has its own strengths, weaknesses, and ideal use cases. Understanding these methods will help you write better queries and design more efficient databases.

---

## Table Scan (Sequential Scan)

### What is a Table Scan?

A **table scan**, also called a **sequential scan**, is the simplest way to retrieve data from a database. The database engine reads **every single row** in the table from beginning to end, checking each row to see if it matches the query conditions.

**Analogy**: Imagine you're looking for a specific student's record in a physical filing cabinet. With a table scan, you would open the first drawer, check every file from front to back, then move to the next drawer, and continue until you've checked every single file in the cabinet.

### How Does it Work?

1. **Start at the beginning**: The database starts reading from the first page (block) of the table
2. **Read sequentially**: It reads each row one after another in physical storage order
3. **Check condition**: For each row, it evaluates whether the row satisfies the WHERE clause
4. **Collect matches**: If a row matches, it's added to the result set
5. **Continue until end**: This process continues until the last row is examined

### Visual Representation

```
Table: Students (10,000 rows)
Query: SELECT * FROM Students WHERE age = 25;

[Row 1: age=20] ❌ → Check → Not matched
[Row 2: age=22] ❌ → Check → Not matched
[Row 3: age=25] ✓ → Check → MATCHED!
[Row 4: age=19] ❌ → Check → Not matched
[Row 5: age=25] ✓ → Check → MATCHED!
...
[Row 10,000: age=30] ❌ → Check → Not matched

Result: Must read ALL 10,000 rows to find matches
```

### When is Table Scan Used?

**The database optimizer chooses a table scan when:**

1. **No index exists**: There's no index on the columns used in the WHERE clause
2. **Retrieving most rows**: When your query will return a large percentage of the table (typically >15-20%)
3. **Small tables**: The table is so small that creating/using an index would be slower
4. **Query doesn't filter**: Using SELECT \* without a WHERE clause
5. **Data type mismatch**: When implicit conversion prevents index usage

### Performance Characteristics

**Time Complexity**: **O(n)** where n is the total number of rows

- Best case: O(n) - must scan entire table
- Average case: O(n)
- Worst case: O(n)

**Why always O(n)?** Because even if the matching row is the first one, the database doesn't know if there are more matches later, so it must read the entire table.

**Space Complexity**: **O(1)** for the scan operation itself

- Only needs to hold one page of data in memory at a time
- Does not require additional data structures
- Very memory-efficient

### Advantages of Table Scan

1. **Simple and predictable**: Easy for the database to execute
2. **No overhead**: No index maintenance or storage required
3. **Good for small tables**: Efficient when the table has few rows
4. **Efficient for large result sets**: When returning most of the table, a scan can be faster than index lookups
5. **Sequential I/O**: Reading data sequentially is faster than random access on traditional hard drives

### Disadvantages of Table Scan

1. **Slow for large tables**: Performance degrades linearly with table size
2. **Inefficient for selective queries**: Wastes time reading irrelevant rows
3. **Resource intensive**: Consumes significant I/O and CPU for large tables
4. **Doesn't scale well**: As your table grows, queries become proportionally slower

### Example Scenario

**Table**: `Orders` with 10 million rows
**Query**: `SELECT * FROM Orders WHERE order_id = 12345;`
**Without index**: Table scan reads all 10 million rows
**Time**: Approximately 30-60 seconds
**I/O Operations**: 10 million rows must be read from disk

---

## Index Scan

### What is an Index Scan?

An **index scan** uses a special data structure called an **index** to quickly locate the rows that match your query conditions. Instead of reading every row, the database uses the index to jump directly to the relevant data.

**Analogy**: Think of the index in a textbook. When you want to find information about "Binary Trees," you don't read every page. Instead, you look up "Binary Trees" in the index at the back, which tells you exactly which pages to turn to (e.g., pages 45, 127, 203).

### Understanding Database Indexes

An index is a separate data structure that maintains a **sorted copy** of one or more columns along with **pointers** to the actual table rows. Most databases use a **B-Tree** (Balanced Tree) or **B+Tree** structure for indexes.

**B-Tree Structure Visual:**

```
                    [50]
                   /    \
              [25]        [75]
             /    \      /    \
         [10]   [35]  [60]   [90]
        /  \    /  \   /  \   /  \
      [5][15][30][40][55][65][80][95]
```

Each leaf node contains:

- The indexed column value
- A pointer (row ID) to the actual row in the table

### How Does Index Scan Work?

**Step-by-step process:**

1. **Parse the query**: Database identifies which columns are in the WHERE clause
2. **Check for indexes**: Optimizer checks if an index exists on those columns
3. **Traverse the index**: Starting from the root of the B-Tree:
   - Compare the search value with node values
   - Navigate left or right based on comparison
   - Continue until reaching the leaf node
4. **Find matching entries**: Locate all index entries that match the condition
5. **Fetch table rows**: Use the pointers to retrieve actual rows from the table
6. **Return results**: Assemble and return the result set

### Visual Example

```
Table: Employees (100,000 rows)
Index on: employee_id (B-Tree)
Query: SELECT * FROM Employees WHERE employee_id = 5047;

Step 1: Start at root of B-Tree
        [5000]
       /      \
   [<5000]   [>=5000]  → Go right (5047 >= 5000)

Step 2: Navigate to next level
        [7500]
       /      \
   [<7500]   [>=7500]  → Go left (5047 < 7500)

Step 3: Reach leaf node
   [5000, 5025, 5047, 5050, 5075...]
              ↑
         Found 5047!
         Pointer: Row location = Block 247, Offset 15

Step 4: Jump directly to table row at Block 247, Offset 15
        ✓ Retrieved in ~3-4 I/O operations instead of 100,000!
```

### Types of Index Scans

#### 1. **Unique Index Scan**

- Used when the index guarantees only one matching row
- Most efficient type of index scan
- Example: Primary key lookup

#### 2. **Range Index Scan**

- Used for range queries (>, <, BETWEEN)
- Scans multiple consecutive entries in the index
- Example: `WHERE age BETWEEN 25 AND 35`

#### 3. **Index-Only Scan**

- All required columns are in the index itself
- No need to access the table at all
- Fastest possible scan
- Example: `SELECT employee_id FROM Employees WHERE employee_id > 1000`

### Performance Characteristics

**Time Complexity**: **O(log n + k)** where n is total rows, k is matching rows

- **O(log n)**: Time to traverse the B-Tree to find the first match
- **O(k)**: Time to retrieve k matching rows

**Examples:**

- Finding one row in 1 million rows: log₂(1,000,000) + 1 ≈ 20 + 1 = 21 operations
- Finding one row in 1 billion rows: log₂(1,000,000,000) + 1 ≈ 30 + 1 = 31 operations

**Space Complexity**: **O(n)** for storing the index

- Index requires additional storage (typically 10-30% of table size)
- Must be maintained during INSERT, UPDATE, DELETE operations
- Trade-off: Use disk space to gain query speed

### Advantages of Index Scan

1. **Extremely fast**: Logarithmic search time for large tables
2. **Scalable**: Performance degrades slowly as table grows
3. **Efficient for selective queries**: Perfect when retrieving small percentage of rows
4. **Supports sorting**: Can retrieve data in sorted order without sorting
5. **Range queries**: Excellent for BETWEEN, >, < operations

### Disadvantages of Index Scan

1. **Storage overhead**: Indexes consume disk space
2. **Maintenance cost**: INSERTs, UPDATEs, DELETEs are slower because indexes must be updated
3. **Random I/O**: Fetching rows from table requires random disk access (slower than sequential)
4. **Not always used**: Optimizer may ignore index if it thinks table scan is faster
5. **Multiple matches**: If many rows match, fetching each individually can be slow

### When is Index Scan Most Effective?

**Ideal scenarios:**

1. **High selectivity**: Query returns <5-15% of table rows
2. **Exact match queries**: `WHERE id = 12345`
3. **Range queries on indexed columns**: `WHERE date BETWEEN '2024-01-01' AND '2024-12-31'`
4. **Sorted output**: `ORDER BY indexed_column`
5. **Join operations**: When joining on indexed foreign keys

### Example Scenario

**Table**: `Customers` with 50 million rows
**Index**: B-Tree index on `customer_id` (Primary Key)
**Query**: `SELECT * FROM Customers WHERE customer_id = 9876543;`

**With Index Scan:**

- Tree traversal: ~26 comparisons (log₂(50,000,000))
- I/O operations: 4-5 (including table row fetch)
- Time: ~10 milliseconds

**Without Index (Table Scan):**

- Rows examined: 50,000,000
- I/O operations: 50,000,000
- Time: 5-10 minutes

**Performance improvement: ~30,000x faster!**

---

## Bitmap Scan

### What is a Bitmap Scan?

A **bitmap scan** is a hybrid approach that combines the benefits of index scans with efficient table access. It's particularly useful when you need to combine multiple conditions or when many rows match your criteria.

**Analogy**: Imagine you're organizing a school event and need to find students who are (1) in Grade 10 AND (2) enrolled in the Science club. Instead of checking each student one by one, you create two lists: one of all Grade 10 students and another of all Science club members. Then you find the overlap between these lists. Finally, you use this combined list to efficiently gather the actual student records.

### How Does Bitmap Scan Work?

A bitmap scan operates in **two distinct phases**:

#### Phase 1: Bitmap Index Scan (Building the Bitmap)

1. **Scan the index**: Use one or more indexes to find matching row IDs
2. **Create a bitmap**: Build a bit array where each bit represents a page (block) in the table
   - Bit = 1: This page contains at least one matching row
   - Bit = 0: This page has no matching rows
3. **Combine bitmaps** (if multiple conditions): Use AND/OR operations on bitmaps

#### Phase 2: Bitmap Heap Scan (Fetching Rows)

1. **Read the bitmap**: Identify which pages need to be fetched
2. **Sequential access**: Read only the marked pages in physical order
3. **Filter rows**: Within each page, check which rows actually match
4. **Return results**: Assemble the final result set

### Visual Representation

```
Table: Products (500,000 rows stored in 10,000 pages)
Index 1: category = 'Electronics'
Index 2: price < 500

Query: SELECT * FROM Products
       WHERE category = 'Electronics' AND price < 500;

STEP 1: Scan Index 1 (category)
Find row IDs: [5, 47, 89, 123, 245, ...]
Create Bitmap A:
Page:  [1] [2] [3] [4] [5] [6] [7] [8] ...
Bit:    1   0   1   1   0   1   0   0  ...

STEP 2: Scan Index 2 (price)
Find row IDs: [12, 45, 89, 156, 245, ...]
Create Bitmap B:
Page:  [1] [2] [3] [4] [5] [6] [7] [8] ...
Bit:    1   1   0   1   1   0   0   1  ...

STEP 3: Combine Bitmaps (AND operation)
Bitmap A:  1   0   1   1   0   1   0   0  ...
Bitmap B:  1   1   0   1   1   0   0   1  ...
Result:    1   0   0   1   0   0   0   0  ...
           ↑           ↑
     (Read pages 1 and 4 only)

STEP 4: Fetch only marked pages sequentially
Read Page 1 → Check rows → Return matches
Read Page 4 → Check rows → Return matches

Result: Read 2 pages instead of 10,000!
```

### The Bitmap Data Structure

**What is a bitmap?**

A bitmap is an array of bits (0s and 1s). In database bitmap scans:

```
Bitmap for 16 pages (2 bytes = 16 bits):
Bit position: 15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
Bit value:     0  1  0  0  1  0  0  1  1  0  1  1  0  0  1  1
Page number:  15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0

Pages to read: 0, 1, 4, 5, 7, 8, 11, 14
```

**Space efficiency**: Each page requires only 1 bit

- 10,000 pages = 10,000 bits = 1.25 KB
- Far more compact than storing actual row IDs

### Types of Bitmap Operations

#### 1. **Bitmap AND** (for AND conditions)

```
Condition: category = 'Books' AND price < 20
Bitmap A (Books):    1 0 1 1 0 1
Bitmap B (< $20):    1 1 0 1 1 0
Result (A AND B):    1 0 0 1 0 0
                     ↑       ↑
            (Only pages 0 and 3 match both)
```

#### 2. **Bitmap OR** (for OR conditions)

```
Condition: category = 'Books' OR category = 'Music'
Bitmap A (Books):    1 0 1 0 0 1
Bitmap B (Music):    0 1 0 1 0 0
Result (A OR B):     1 1 1 1 0 1
                     ↑ ↑ ↑ ↑   ↑
            (Pages 0,1,2,3,5 match either)
```

### When Does Database Use Bitmap Scan?

**The optimizer chooses bitmap scan when:**

1. **Multiple conditions**: Query has AND/OR conditions on different indexed columns
2. **Moderate selectivity**: Expected to return 5-25% of table rows
3. **Large result sets**: Too many matches for efficient index scan
4. **Multiple indexes available**: Can combine several indexes effectively
5. **Avoiding random I/O**: When sequential page reads are more efficient

### Performance Characteristics

**Time Complexity**: **O(m × log n + p)** where:

- m = number of indexes used
- n = total rows in table
- p = number of pages containing matching rows

**Breakdown:**

- **O(m × log n)**: Scanning m indexes, each taking O(log n)
- **O(m × p)**: Creating and combining m bitmaps
- **O(p)**: Reading p pages from the table sequentially

**Space Complexity**: **O(p/8) bytes** for bitmap storage

- Each page requires 1 bit
- 8 pages = 1 byte
- Very space-efficient for representing large result sets

### Advantages of Bitmap Scan

1. **Efficient multiple conditions**: Excellent for AND/OR queries across multiple columns
2. **Combines indexes**: Can use multiple indexes together effectively
3. **Sequential I/O**: Reads table pages in order, faster on HDDs
4. **Memory efficient**: Bitmaps are very compact
5. **Reduces random access**: Groups row fetches by page
6. **Moderate result sets**: Better than index scan when many rows match

### Disadvantages of Bitmap Scan

1. **Overhead**: Building bitmaps takes time and memory
2. **Page-level granularity**: Still reads entire pages even if only one row matches
3. **Not for small results**: Overkill when only a few rows match
4. **Requires indexes**: Still needs indexes on relevant columns
5. **Complex queries**: Can become complicated with many conditions

### Bitmap Scan vs Index Scan: When to Use Which?

**Use Index Scan when:**

- Very few rows match (high selectivity)
- Simple single-condition queries
- Exact match lookups

**Use Bitmap Scan when:**

- Multiple conditions with AND/OR
- Moderate number of matches (thousands to millions)
- Combining multiple indexes
- Need to avoid excessive random I/O

### Example Scenario

**Table**: `Orders` with 100 million rows, 1 million pages
**Indexes**:

- Index on `customer_id`
- Index on `order_date`
- Index on `status`

**Query**:

```sql
SELECT * FROM Orders
WHERE customer_id IN (12, 45, 78, 99)
  AND order_date >= '2024-01-01'
  AND status = 'SHIPPED';
```

**Bitmap Scan Process:**

1. **Bitmap A** (customer_id): Scan index → 2 million matching rows → 50,000 pages
2. **Bitmap B** (order_date): Scan index → 10 million matching rows → 200,000 pages
3. **Bitmap C** (status): Scan index → 30 million matching rows → 600,000 pages
4. **Combine**: A AND B AND C → 150,000 rows in 5,000 pages
5. **Read**: Sequentially read only 5,000 pages

**Result**:

- Read 5,000 pages instead of 1 million
- Sequential access pattern (efficient)
- Time: ~30 seconds instead of 10 minutes

---

## Time Complexity Analysis

Time complexity tells us **how query performance changes** as the dataset grows. Let's analyze each scan method in detail.

### Notation Guide

- **n**: Total number of rows in the table
- **k**: Number of rows that match the query
- **m**: Number of indexes being used
- **p**: Number of pages (blocks) containing matching rows
- **b**: Tree branching factor (children per node)

### Table Scan Time Complexity

**Formula**: **O(n)**

**What this means:**

- If you double the table size, query time doubles
- Linear relationship between rows and time
- Predictable but doesn't scale well

**Detailed breakdown:**

1. **Reading pages**: n rows / rows_per_page = n/r page reads → O(n)
2. **Checking conditions**: n condition evaluations → O(n)
3. **Collecting results**: k rows added to result set → O(k)
4. **Total**: O(n) + O(n) + O(k) = **O(n)**

**Performance at different scales:**

| Rows       | Pages (8KB) | Time Estimate |
| ---------- | ----------- | ------------- |
| 1,000      | ~10         | 0.1 seconds   |
| 100,000    | ~1,000      | 10 seconds    |
| 1,000,000  | ~10,000     | 100 seconds   |
| 10,000,000 | ~100,000    | 1,000 seconds |

**Notice**: 10x more rows = 10x more time (linear)

### Index Scan Time Complexity

**Formula**: **O(log_b(n) + k)**

**Components:**

1. **Index traversal**: O(log_b(n))
   - b = branching factor (typically 100-200 for B-Trees)
   - Height of tree grows logarithmically
2. **Fetching matching rows**: O(k)
   - Must retrieve each of k matching rows
   - Random I/O to table pages

**Why logarithmic?**

B-Tree height calculation:

```
Height = log_b(n)

For b=100 (typical):
n = 1,000,000 → height = log₁₀₀(1,000,000) = 3
n = 100,000,000 → height = log₁₀₀(100,000,000) = 4

Only one more level needed for 100x more data!
```

**Performance at different scales:**

| Rows          | Tree Height | k=1 (ms) | k=100 (ms) | k=10,000 (ms) |
| ------------- | ----------- | -------- | ---------- | ------------- |
| 1,000         | 2           | 2        | 12         | 1,020         |
| 100,000       | 3           | 3        | 13         | 1,030         |
| 10,000,000    | 4           | 4        | 14         | 1,040         |
| 1,000,000,000 | 5           | 5        | 15         | 1,050         |

**Key insight**: Index lookup time barely increases (4ms → 5ms) even when table grows 100x!

### Bitmap Scan Time Complexity

**Formula**: **O(m × log_b(n) + p)**

**Components:**

1. **Scanning m indexes**: O(m × log_b(n))
   - Each index scan is O(log_b(n))
   - Must scan all m indexes
2. **Building bitmaps**: O(m × k)
   - Mark bits for k matching rows
   - Do this for each of m indexes
3. **Combining bitmaps**: O(p)
   - AND/OR operations on bitmaps
   - p is number of pages
4. **Reading pages**: O(p)
   - Sequential read of p pages
   - Much faster than random k reads

**Performance comparison:**

**Example**: 10 million rows, need 100,000 matching rows from 5,000 pages

**Index Scan**:

- Index lookup: 4 comparisons
- Row fetches: 100,000 random I/Os
- Time: ~10 minutes (random access dominates)

**Bitmap Scan**:

- Index scans: 4 comparisons × 2 indexes = 8
- Bitmap operations: ~1 million bits (125 KB)
- Page reads: 5,000 sequential I/Os
- Time: ~30 seconds (sequential access is fast)

### Comparative Time Analysis Graph

```
Query Time vs. Number of Rows (k=1% of n)

Time (log scale)
     |
10s  |                                    ╱Table Scan
     |                                 ╱
     |                              ╱
 1s  |                           ╱
     |                        ╱
     |                     ╱
0.1s |  Bitmap ________▁▁▁
     |  Index  _____▁▁▁
0.01s|────────────────────────────────────> Rows
     0    100K   1M    10M   100M

Conclusion: Index/Bitmap scale much better than Table Scan
```

### Real-World Time Example

**Table**: `Transactions` with 50 million rows
**Query**: Find all transactions for customer_id = 12345

**Without Index (Table Scan)**:

```
Operations: 50,000,000 row reads
I/O Pattern: Sequential but exhaustive
Disk time: 500,000 pages × 10ms = 5,000 seconds
CPU time: 50,000,000 condition checks ≈ 50 seconds
Total: ~84 minutes
```

**With Index on customer_id (Index Scan)**:

```
Operations:
  - Index traversal: 26 comparisons (log₂(50M))
  - Row fetches: 150 rows × random I/O
I/O Pattern: Random access
Index time: 26 comparisons × 0.1ms = 2.6ms
Row fetch: 150 random I/Os × 10ms = 1,500ms
Total: ~1.5 seconds
```

**Speedup: 3,360x faster!**

---

## Space Complexity Analysis

Space complexity tells us **how much memory or disk space** each method requires. This is crucial for understanding resource usage.

### Table Scan Space Complexity

**Formula**: **O(1)** for the scan operation

**What this means:**

- Constant memory footprint
- Only needs to hold one page in memory at a time
- Does not create additional data structures

**Detailed breakdown:**

**Memory Requirements:**

1. **Buffer pool page**: 8 KB (holds current page being scanned)
2. **Result buffer**: Space for k matching rows (varies)
3. **Query execution context**: ~1-2 KB (negligible)

**Total working memory**: ~8-16 KB + result set size

**Advantages:**

- Minimal memory impact
- No preprocessing storage needed
- Works even with very limited RAM

**Storage Requirements:**

- No additional disk space needed
- Only the table itself is stored

### Index Scan Space Complexity

**Formula**: **O(n)** for index storage

**What this means:**

- Index requires significant disk space
- Size grows linearly with table rows
- Trade disk space for query speed

**Detailed breakdown:**

**Index Storage Size Calculation:**

For a B-Tree index:

```
Index Size = n × (key_size + pointer_size) × overhead_factor

Typical values:
- key_size: 4-8 bytes (integer) to 50-100 bytes (varchar)
- pointer_size: 6-8 bytes (row ID)
- overhead_factor: 1.3-1.7 (tree structure overhead)

Example for 10M rows, integer key (4 bytes):
Index Size = 10,000,000 × (4 + 8) × 1.5
          = 10,000,000 × 12 × 1.5
          = 180,000,000 bytes
          = ~172 MB
```

**Memory During Query:**

1. **Index pages in buffer pool**: Typically 3-5 pages (tree height)
2. **Table pages for matching rows**: k pages
3. **Total working memory**: ~(5 × 8KB) + (k × 8KB)

**Multiple Indexes:**

- Each index requires its own space
- 5 indexes on a 10M row table: ~860 MB additional storage

**Maintenance Overhead:**

- INSERT: Must update all indexes
- UPDATE: Must update indexes on changed columns
- DELETE: Must remove entries from all indexes

### Bitmap Scan Space Complexity

**Formula**: **O(p/8)** bytes for bitmap storage

**What this means:**

- Very space-efficient representation
- Size depends on number of pages, not rows
- Multiple bitmaps can be combined efficiently

**Detailed breakdown:**

**Bitmap Size Calculation:**

```
Bitmap Size (bytes) = Total_Pages / 8

Examples:
- 1,000 pages → 125 bytes
- 10,000 pages → 1.25 KB
- 100,000 pages → 12.5 KB
- 1,000,000 pages → 125 KB

For context: 1,000,000 pages ≈ 8 GB of table data
```

**Memory During Bitmap Scan:**

1. **Index pages**: m indexes × 3-5 pages each
2. **Bitmaps**: m bitmaps × (p/8) bytes
3. **Page buffer**: Reading p pages sequentially
4. **Result set**: k matching rows

**Example calculation** (10M rows, 100K pages, 2 conditions):

```
Index pages: 2 × 5 × 8KB = 80 KB
Bitmaps: 2 × (100,000/8) = 25 KB
Page buffer: 8 KB (one at a time)
Total working memory: ~113 KB + result set
```

**Bitmap operations are cheap:**

- AND: Bitwise operation, extremely fast
- OR: Bitwise operation, extremely fast
- NOT: Simple bit flip

### Space Comparison Table

| Method      | Index Storage   | Working Memory | Scalability |
| ----------- | --------------- | -------------- | ----------- |
| Table Scan  | 0 (none)        | ~8 KB          | O(1)        |
| Index Scan  | 10-30% of table | ~40 KB         | O(n)        |
| Bitmap Scan | 10-30% of table | ~100 KB        | O(p/8)      |

### Real-World Space Example

**Table**: `Users` - 100 million rows, 10 GB storage

**Scenario 1: No Indexes (Table Scan Only)**

```
Table storage: 10 GB
Index storage: 0 GB
Total: 10 GB
Query memory: 8 KB
```

**Scenario 2: Single Index on user_id**

```
Table storage: 10 GB
Index storage: 1.5 GB (15% of table)
Total: 11.5 GB
Query memory: 40 KB
```

**Scenario 3: Five Indexes (user_id, email, created_at, country, age)**

```
Table storage: 10 GB
Index storage: 7.5 GB (5 indexes × 1.5 GB)
Total: 17.5 GB (75% overhead!)
Query memory: 100-200 KB
```

**Tradeoff**: 75% more disk space → 1000x faster queries

### Memory Pressure Considerations

**When memory is limited:**

1. **Table Scan wins**: Needs only 8 KB
2. **Index Scan struggles**: Must cache index pages
3. **Bitmap Scan moderate**: Bitmaps are small but multiple indexes consume memory

**When disk space is limited:**

1. **Table Scan wins**: No additional storage
2. **Selective indexing**: Create only critical indexes
3. **Partial indexes**: Index only a subset of rows

---

## Comparative Analysis

Let's compare all three methods across various dimensions to understand when to use each.

### Performance Comparison Table

| Criteria                | Table Scan        | Index Scan           | Bitmap Scan         |
| ----------------------- | ----------------- | -------------------- | ------------------- |
| **Best for table size** | Small (<10K rows) | Large (any size)     | Large (any size)    |
| **Best selectivity**    | >20% of rows      | <5% of rows          | 5-25% of rows       |
| **Multiple conditions** | ❌ Poor           | ⚠️ Uses one index    | ✅ Excellent        |
| **Small result set**    | ❌ Slow           | ✅ Fast              | ⚠️ Overhead         |
| **Large result set**    | ✅ Efficient      | ❌ Slow (random I/O) | ✅ Efficient        |
| **Sequential I/O**      | ✅ Yes            | ❌ No (random)       | ✅ Yes              |
| **Memory usage**        | ✅ Minimal (8KB)  | ⚠️ Moderate (40KB)   | ⚠️ Moderate (100KB) |
| **Disk overhead**       | ✅ None           | ❌ 10-30%            | ❌ 10-30%           |
| **Setup required**      | ✅ None           | ❌ Create index      | ❌ Create indexes   |
| **Maintenance cost**    | ✅ None           | ❌ High              | ❌ High             |
| **Sorting support**     | ❌ No             | ✅ Yes               | ⚠️ Partial          |
| **Range queries**       | ❌ Slow           | ✅ Excellent         | ✅ Good             |

### Decision Matrix: Which Scan to Use?

#### Use **Table Scan** when:

✅ **Table is small** (< 1,000-10,000 rows)

```sql
-- Example: Configuration table with 50 rows
SELECT * FROM app_config WHERE setting_name = 'timeout';
-- Table scan is faster than index overhead
```

✅ **Retrieving most rows** (> 20-30% of table)

```sql
-- Example: Monthly report needs 80% of transactions
SELECT * FROM transactions
WHERE transaction_date >= '2024-11-01';
-- Index would require too many random I/Os
```

✅ **No suitable index exists**

```sql
-- Example: Ad-hoc query on non-indexed column
SELECT * FROM logs WHERE message LIKE '%error%';
-- Creating index just for this query isn't worth it
```

✅ **Full table processing**

```sql
-- Example: Batch job processing all records
SELECT * FROM customers WHERE is_active = true;
-- If is_active is true for most customers
```

#### Use **Index Scan** when:

✅ **High selectivity** (< 5% of rows)

```sql
-- Example: Finding one specific user
SELECT * FROM users WHERE user_id = 12345;
-- Returns 1 row from 100 million
```

✅ **Exact match queries**

```sql
-- Example: Login authentication
SELECT * FROM accounts
WHERE email = 'user@example.com' AND status = 'active';
-- Email indexed, returns 0-1 rows
```

✅ **Range queries with small result**

```sql
-- Example: Recent high-value orders
SELECT * FROM orders
WHERE order_date > '2024-11-10' AND amount > 10000;
-- Returns 100 rows from 50 million
```

✅ **Sorted results needed**

```sql
-- Example: Pagination
SELECT * FROM products
WHERE category = 'Electronics'
ORDER BY created_at DESC
LIMIT 20;
-- Index on (category, created_at) provides sorted results
```

#### Use **Bitmap Scan** when:

✅ **Multiple AND/OR conditions**

```sql
-- Example: Complex filtering
SELECT * FROM properties
WHERE city = 'New York'
  AND bedrooms >= 3
  AND price < 500000
  AND has_parking = true;
-- Combines multiple indexes efficiently
```

✅ **Moderate selectivity** (5-25% of rows)

```sql
-- Example: Category-based search
SELECT * FROM products
WHERE category IN ('Electronics', 'Computers', 'Phones');
-- Returns 2 million rows from 10 million
```

✅ **Multiple indexes available**

```sql
-- Example: E-commerce search
SELECT * FROM items
WHERE brand = 'Samsung' AND price BETWEEN 200 AND 1000;
-- Indexes on brand and price can be combined
```

✅ **Avoiding random I/O patterns**

```sql
-- Example: Report with multiple filters
SELECT * FROM sales
WHERE region IN ('North', 'South')
  AND product_type = 'Premium'
  AND sale_date >= '2024-01-01';
-- Bitmap groups page reads efficiently
```

### Performance Graph: Selectivity vs Query Time

```
Query Time (seconds)
     |
  10 |                  Table Scan ━━━━━━━━━━━
     |                            ╱
     |                         ╱
   5 |                      ╱
     |                   ╱
     |                ╱
   1 |             ╱
     |          ╱        Bitmap Scan ▬▬▬▬▬▬▬▬
     |       ╱                        ╱
     |    ╱                        ╱
 0.1 | ╱                        ╱
     |▔▔▔▔▔▔▔▔▔▔ Index Scan ▁▁╱
     |━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━> Selectivity (% of rows)
     0%      5%      10%     15%     20%    25%

Sweet spots:
- Index Scan: 0-5%
- Bitmap Scan: 5-25%
- Table Scan: 25-100%
```

### Cost Analysis: 100 Million Row Table

Let's analyze a real-world scenario with concrete numbers.

**Table**: `transactions` - 100 million rows, 8 GB total size

#### Scenario 1: Find one specific transaction

**Query**:

```sql
SELECT * FROM transactions WHERE transaction_id = 'TX-12345';
```

**Selectivity**: 0.000001% (1 row)

| Method      | Operations               | I/O      | Time      | Winner?    |
| ----------- | ------------------------ | -------- | --------- | ---------- |
| Table Scan  | 100M row reads           | 1M pages | 2.5 hours | ❌         |
| Index Scan  | 27 comparisons + 1 fetch | 5 pages  | 50ms      | ✅ Winner! |
| Bitmap Scan | Overkill overhead        | 10 pages | 100ms     | ❌         |

**Conclusion**: Index Scan wins by massive margin (180,000x faster)

#### Scenario 2: Complex multi-condition query

**Query**:

```sql
SELECT * FROM transactions
WHERE customer_type = 'Premium'
  AND amount BETWEEN 1000 AND 5000
  AND status = 'Completed'
  AND transaction_date >= '2024-01-01';
```

**Selectivity**: 8% (8 million rows)

| Method      | Operations                            | I/O        | Time       | Winner?    |
| ----------- | ------------------------------------- | ---------- | ---------- | ---------- |
| Table Scan  | 100M row reads                        | 1M pages   | 2.5 hours  | ❌         |
| Index Scan  | 8M random fetches                     | 8M pages   | 2 hours    | ❌         |
| Bitmap Scan | 4 index scans + 100K sequential pages | 100K pages | 15 minutes | ✅ Winner! |

**Conclusion**: Bitmap Scan wins by combining indexes and using sequential I/O

#### Scenario 3: Monthly report (large result set)

**Query**:

```sql
SELECT * FROM transactions
WHERE transaction_date >= '2024-11-01';
```

**Selectivity**: 40% (40 million rows)

| Method      | Operations            | I/O        | Time      | Winner?    |
| ----------- | --------------------- | ---------- | --------- | ---------- |
| Table Scan  | 100M row reads        | 1M pages   | 2.5 hours | ✅ Winner! |
| Index Scan  | 40M random fetches    | 40M pages  | 10+ hours | ❌         |
| Bitmap Scan | 400K sequential pages | 400K pages | 1 hour    | ⚠️ OK      |

**Conclusion**: Table Scan wins because sequential read of entire table is faster than fetching 40% randomly

### Index Types and Their Impact

Different index types affect scan performance differently.

#### B-Tree Index (Most Common)

```
Structure:
                [50|100]
               /    |    \
          [25]    [75]    [125]
         /  \     /  \     /  \
    [10][40][60][90][110][140]

Characteristics:
- Balanced tree, all leaves at same depth
- Supports: =, <, >, <=, >=, BETWEEN, LIKE 'prefix%'
- Order preserved: Good for ORDER BY
- Range scans: Excellent
```

**Best for**: General-purpose indexing, primary keys, foreign keys

#### Hash Index

```
Hash Function: hash(key) → bucket_number

Key: "user123" → Hash: 7283 → Bucket: 83
Key: "user456" → Hash: 1847 → Bucket: 47

Characteristics:
- O(1) average lookup time
- Supports: Only = (equality)
- No range scans, no sorting
- Collision handling required
```

**Best for**: Exact match lookups only, cache key lookups

#### Bitmap Index (Different from Bitmap Scan!)

```
A true bitmap index stores bitmaps for each distinct value.

Column: gender (only 2 values: M, F)
Bitmap for 'M': 1010110101...
Bitmap for 'F': 0101001010...

Characteristics:
- Excellent for low-cardinality columns
- Very space-efficient
- Fast AND/OR/NOT operations
- Updates are expensive
```

**Best for**: Data warehouses, columns with few distinct values

#### GiST/GIN Indexes (PostgreSQL)

```
GiST (Generalized Search Tree):
- Full-text search
- Geometric data
- Custom data types

GIN (Generalized Inverted Index):
- Array containment: WHERE tags @> ARRAY['sql']
- JSON queries: WHERE data @> '{"key": "value"}'
- Full-text search
```

**Best for**: Complex data types, full-text search, JSON queries

### Query Optimizer Decision Process

When you execute a query, the database optimizer follows this process:

```
1. PARSE QUERY
   ↓
2. IDENTIFY AVAILABLE INDEXES
   ↓
3. ESTIMATE SELECTIVITY
   │
   ├─> < 5% of rows → Consider INDEX SCAN
   ├─> 5-25% of rows → Consider BITMAP SCAN
   └─> > 25% of rows → Consider TABLE SCAN
   ↓
4. CALCULATE COST FOR EACH METHOD
   │
   ├─> Table Scan Cost = (pages × seq_page_cost) + (rows × cpu_cost)
   ├─> Index Scan Cost = (index_pages × random_page_cost) + (rows × random_page_cost) + cpu_cost
   └─> Bitmap Scan Cost = (index_pages × seq_page_cost) + (bitmap_pages × seq_page_cost) + cpu_cost
   ↓
5. CHOOSE LOWEST COST METHOD
   ↓
6. EXECUTE PLAN
```

**Cost parameters** (typical values):

- `seq_page_cost = 1.0` (baseline: sequential page read)
- `random_page_cost = 4.0` (random I/O is 4x slower)
- `cpu_tuple_cost = 0.01` (checking one row)
- `cpu_operator_cost = 0.0025` (one operation)

**Example calculation**:

**Query**: `SELECT * FROM users WHERE age = 25;`
**Table**: 1 million rows, 10,000 pages, 50,000 matching rows (5%)

**Table Scan Cost**:

```
= (10,000 pages × 1.0) + (1,000,000 rows × 0.01)
= 10,000 + 10,000
= 20,000
```

**Index Scan Cost**:

```
= (4 index pages × 4.0) + (50,000 rows × 4.0) + (50,000 × 0.01)
= 16 + 200,000 + 500
= 200,516
```

**Bitmap Scan Cost**:

```
= (4 index pages × 1.0) + (5,000 pages × 1.0) + (50,000 × 0.01)
= 4 + 5,000 + 500
= 5,504
```

**Winner**: Table Scan (cost: 20,000) - at 5% selectivity, table scan is still competitive!

### Impact of Different Storage Media

Storage type dramatically affects which scan method is best.

#### Traditional HDD (Hard Disk Drive)

**Characteristics**:

- Sequential read: ~100-200 MB/s
- Random read: ~100-200 IOPS (I/O operations per second)
- Random access is **very expensive**

**Impact on scans**:

- **Table Scan**: Excellent (sequential reads)
- **Index Scan**: Poor (random reads kill performance)
- **Bitmap Scan**: Good (converts random to sequential)

**Recommendation**: Favor bitmap scan or table scan on HDDs

#### SSD (Solid State Drive)

**Characteristics**:

- Sequential read: ~500-3500 MB/s
- Random read: ~10,000-100,000 IOPS
- Random access is **much cheaper**

**Impact on scans**:

- **Table Scan**: Good (fast sequential reads)
- **Index Scan**: Much better (random reads less painful)
- **Bitmap Scan**: Still good (less advantage over index scan)

**Recommendation**: Index scan becomes more attractive on SSDs

#### NVMe SSD (Latest technology)

**Characteristics**:

- Sequential read: ~3,000-7,000 MB/s
- Random read: ~500,000-1,000,000 IOPS
- Random vs sequential gap is **smallest**

**Impact on scans**:

- **Table Scan**: Excellent
- **Index Scan**: Excellent
- **Bitmap Scan**: Good but less advantage

**Recommendation**: Index scan is highly effective on NVMe

### Storage Performance Comparison

```
Random Read Performance (IOPS)

1M  |                                         ┃ NVMe
    |                                         ┃
100K|                               ┃ SSD    ┃
    |                               ┃         ┃
10K |                               ┃         ┃
    |                     ┃         ┃         ┃
1K  |         ┃ HDD       ┃         ┃         ┃
    |         ┃           ┃         ┃         ┃
100 |─────────┃───────────┃─────────┃─────────┃────>

Impact on Index Scan:
- HDD: Index scan often avoided (too slow)
- SSD: Index scan becomes practical
- NVMe: Index scan is excellent choice
```

---

## Practical Recommendations

### General Best Practices

#### 1. **Create Indexes Strategically**

**Do Index:**

- Primary keys (usually automatic)
- Foreign keys used in joins
- Columns in WHERE clauses (if selective)
- Columns in ORDER BY (for sorting)
- Columns in GROUP BY (for aggregation)

**Don't Over-Index:**

- Columns that are rarely queried
- Columns with low selectivity (e.g., boolean with 50/50 split)
- Every column "just in case"
- Small tables (< 1,000 rows)

**Example**:

```sql
-- Good: Selective column, frequently queried
CREATE INDEX idx_users_email ON users(email);
-- Bad: Low selectivity, rarely queried
CREATE INDEX idx_users_is_active ON users(is_active);
```

#### 2. **Composite Indexes for Multiple Conditions**

When queries filter on multiple columns, consider composite indexes.

**Column order matters!**

```sql
-- Query pattern:
SELECT * FROM orders
WHERE customer_id = ? AND order_date > ?;

-- Good: customer_id first (more selective)
CREATE INDEX idx_orders_customer_date
ON orders(customer_id, order_date);

-- Less effective: reversed order
CREATE INDEX idx_orders_date_customer
ON orders(order_date, customer_id);
```

**Rule of thumb**: Most selective column first, then decreasing selectivity

#### 3. **Monitor Query Execution Plans**

Always check how your database is executing queries.

**PostgreSQL**:

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';
```

**MySQL**:

```sql
EXPLAIN
SELECT * FROM users WHERE email = 'user@example.com';
```

**SQL Server**:

```sql
SET SHOWPLAN_ALL ON;
SELECT * FROM users WHERE email = 'user@example.com';
```

**Look for**:

- Scan type used (Seq Scan, Index Scan, Bitmap Scan)
- Estimated vs actual rows
- Execution time
- Cost estimates

#### 4. **Update Statistics Regularly**

Database optimizers rely on statistics to make decisions.

**PostgreSQL**:

```sql
ANALYZE users;  -- Update statistics for users table
VACUUM ANALYZE users;  -- Vacuum and analyze
```

**MySQL**:

```sql
ANALYZE TABLE users;
```

**Why it matters**: Outdated statistics can cause the optimizer to choose wrong scan method.

#### 5. **Consider Partial Indexes**

Index only the rows you actually query.

**PostgreSQL example**:

```sql
-- Only index active users (if you rarely query inactive ones)
CREATE INDEX idx_active_users_email
ON users(email)
WHERE is_active = true;
```

**Benefits**:

- Smaller index (faster, less disk space)
- Faster updates (fewer index entries to maintain)
- More efficient for targeted queries

#### 6. **Use Covering Indexes**

Include all queried columns in the index to avoid table access.

**Example**:

```sql
-- Query:
SELECT user_id, email, created_at
FROM users
WHERE email = 'user@example.com';

-- Covering index (includes all selected columns):
CREATE INDEX idx_users_email_covering
ON users(email, user_id, created_at);

-- Result: Index-only scan (no table access needed!)
```

### Database-Specific Tips

#### PostgreSQL

**Unique features**:

- Excellent bitmap scan implementation
- Parallel query execution
- Partial indexes
- Expression indexes

**Tips**:

```sql
-- Force index usage (testing only!)
SET enable_seqscan = off;

-- See actual I/O:
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users WHERE age > 25;

-- Reindex periodically:
REINDEX TABLE users;
```

#### MySQL

**Unique features**:

- InnoDB: Clustered index on primary key
- Uses index merge for multiple indexes
- Loose index scan optimization

**Tips**:

```sql
-- See index usage:
SHOW INDEX FROM users;

-- Force specific index:
SELECT * FROM users
FORCE INDEX (idx_email)
WHERE email = 'user@example.com';

-- Analyze table:
ANALYZE TABLE users;
```

#### SQL Server

**Unique features**:

- Clustered vs non-clustered indexes
- Included columns in indexes
- Index recommendations via DMVs

**Tips**:

```sql
-- See execution plan:
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Create index with included columns:
CREATE NONCLUSTERED INDEX idx_users_email
ON users(email)
INCLUDE (first_name, last_name);

-- Find missing indexes:
SELECT * FROM sys.dm_db_missing_index_details;
```

### Common Pitfalls to Avoid

#### 1. **Index Not Used Due to Type Mismatch**

```sql
-- Column user_id is INT
-- This query won't use index:
SELECT * FROM users WHERE user_id = '12345';  -- String literal!

-- Correct:
SELECT * FROM users WHERE user_id = 12345;  -- Integer literal
```

#### 2. **Functions on Indexed Columns**

```sql
-- Won't use index on email:
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Better: Store emails in lowercase
SELECT * FROM users WHERE email = 'user@example.com';

-- Or create expression index (PostgreSQL):
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

#### 3. **Wildcard at Beginning of LIKE**

```sql
-- Won't use index:
SELECT * FROM products WHERE name LIKE '%phone%';

-- Will use index:
SELECT * FROM products WHERE name LIKE 'phone%';
```

#### 4. **OR Conditions on Different Columns**

```sql
-- Often can't use indexes efficiently:
SELECT * FROM users
WHERE email = 'user@example.com' OR username = 'user123';

-- Better: Use UNION
SELECT * FROM users WHERE email = 'user@example.com'
UNION
SELECT * FROM users WHERE username = 'user123';
```

#### 5. **Too Many Indexes**

```sql
-- Don't do this:
CREATE INDEX idx1 ON users(email);
CREATE INDEX idx2 ON users(email, first_name);
CREATE INDEX idx3 ON users(email, first_name, last_name);
CREATE INDEX idx4 ON users(email, created_at);

-- This is redundant! The composite indexes can serve
-- queries on their leading columns.
```

### Performance Tuning Checklist

✅ **Before querying**:

- [ ] Identify columns in WHERE, JOIN, ORDER BY
- [ ] Check if appropriate indexes exist
- [ ] Verify statistics are up to date
- [ ] Consider query selectivity

✅ **After getting slow queries**:

- [ ] Run EXPLAIN/EXPLAIN ANALYZE
- [ ] Check actual scan method used
- [ ] Compare estimated vs actual rows
- [ ] Look for full table scans on large tables
- [ ] Identify missing indexes
- [ ] Check for index scans with many random I/Os

✅ **When creating indexes**:

- [ ] Consider query patterns
- [ ] Evaluate selectivity
- [ ] Think about composite indexes
- [ ] Consider included/covering columns
- [ ] Assess maintenance cost vs query benefit

✅ **Regular maintenance**:

- [ ] Update statistics weekly/monthly
- [ ] Rebuild fragmented indexes
- [ ] Remove unused indexes
- [ ] Monitor index size growth
- [ ] Review slow query logs

---

## Conclusion

Understanding database scan methods is crucial for writing efficient queries and designing performant databases. Let's summarize the key takeaways:

### Quick Reference Guide

| Your Situation            | Recommended Scan      | Reason                                       |
| ------------------------- | --------------------- | -------------------------------------------- |
| Finding one row by ID     | **Index Scan**        | O(log n) is unbeatable for single lookups    |
| Small table (< 10K rows)  | **Table Scan**        | Index overhead not worth it                  |
| Getting > 25% of rows     | **Table Scan**        | Sequential read faster than many random I/Os |
| Multiple AND conditions   | **Bitmap Scan**       | Efficiently combines multiple indexes        |
| Range query, small result | **Index Scan**        | Leverages sorted index structure             |
| No indexes available      | **Table Scan**        | Only option                                  |
| SSD/NVMe storage          | **Index Scan**        | Random I/O penalty is minimal                |
| Traditional HDD           | **Bitmap/Table Scan** | Avoid random I/O                             |

### Final Thoughts

**Database performance is about tradeoffs**:

- **Space vs Time**: Indexes use disk space to save query time
- **Read vs Write**: Indexes speed up reads but slow down writes
- **Flexibility vs Performance**: No index = flexible but slow; many indexes = fast but rigid

**The optimizer is smart but not perfect**:

- It makes decisions based on statistics
- Statistics can be outdated
- Sometimes you need to help it with hints
- Always verify with EXPLAIN

**Start simple, optimize when needed**:

1. Begin with primary keys and foreign keys indexed
2. Monitor slow queries
3. Add indexes based on actual usage patterns
4. Don't over-optimize prematurely

**Remember**: The best scan method depends on your specific data, queries, and hardware. Use EXPLAIN to understand what your database is doing, and make informed decisions based on measurements, not assumptions.

---

## Appendix: Practice Examples

### Example 1: E-Commerce Product Search

**Scenario**: Product catalog with 10 million products

```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR(200),
    category VARCHAR(50),
    price DECIMAL(10,2),
    brand VARCHAR(100),
    in_stock BOOLEAN,
    created_at TIMESTAMP
);
```

**Query 1**: Find specific product

```sql
SELECT * FROM products WHERE product_id = 12345;
```

**Answer**: Index Scan on PRIMARY KEY (instant)

**Query 2**: Category browsing

```sql
SELECT * FROM products
WHERE category = 'Electronics'
AND price BETWEEN 100 AND 500
AND in_stock = true;
```

**Answer**: Bitmap Scan combining indexes on (category, price, in_stock)

**Query 3**: Monthly report

```sql
SELECT * FROM products
WHERE created_at >= '2024-11-01';
```

**Answer**: Depends on selectivity. If 40% of products, Table Scan. If 5%, Index Scan.

### Example 2: Social Media Platform

**Scenario**: User posts table with 1 billion rows

```sql
CREATE TABLE posts (
    post_id BIGINT PRIMARY KEY,
    user_id INT,
    content TEXT,
    created_at TIMESTAMP,
    likes_count INT,
    is_public BOOLEAN
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_created ON posts(created_at);
```

**Query 1**: User's recent posts

```sql
SELECT * FROM posts
WHERE user_id = 98765
ORDER BY created_at DESC
LIMIT 20;
```

**Answer**: Index Scan on (user_id, created_at) composite index if exists

**Query 2**: Trending posts today

```sql
SELECT * FROM posts
WHERE created_at >= CURRENT_DATE
AND likes_count > 1000
AND is_public = true;
```

**Answer**: Bitmap Scan combining three indexes

**Query 3**: Full text search (no index)

```sql
SELECT * FROM posts
WHERE content LIKE '%database%';
```

**Answer**: Table Scan (unavoidable without full-text index)

---

## Glossary

- **B-Tree**: Balanced tree data structure that maintains sorted data and allows logarithmic time searches, insertions, and deletions.
- **Bitmap**: Array of bits (0s and 1s) used to represent presence/absence of data, extremely space-efficient.
- **Cardinality**: Number of distinct values in a column. High cardinality = many distinct values (good for indexing). Low cardinality = few distinct values (poor for traditional indexes).
- **Covering Index**: Index that contains all columns needed by a query, allowing index-only scan without accessing the table.
- **IOPS**: Input/Output Operations Per Second, a measure of storage performance.
- **Optimizer**: Component of DBMS that chooses the most efficient execution plan for a query.
- **Predicate**: Condition in a WHERE clause that filters rows.
- **Selectivity**: Percentage of rows that match a query condition. High selectivity = few matches (good for indexes). Low selectivity = many matches (may favor table scan).
- **Sequential Scan**: Reading data in physical storage order (same as table scan).
- **Tuple**: Database term for a row in a table.
