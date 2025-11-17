# Database Transactions and Isolation Levels: A Comprehensive Guide

## Chapter 1: Understanding Database Transactions

### 1.1 What is a Transaction?

A **transaction** is a sequence of one or more database operations (such as SELECT, INSERT, UPDATE, DELETE) that are treated as a single logical unit of work. A transaction must satisfy four properties, collectively known as **ACID properties**:

- **Atomicity**: All operations in a transaction complete successfully, or none of them do. It's an "all-or-nothing" proposition.
- **Consistency**: A transaction brings the database from one valid state to another valid state, maintaining all defined rules and constraints.
- **Isolation**: Concurrent transactions execute independently without interfering with each other.
- **Durability**: Once a transaction is committed, its changes are permanent, even in the event of system failure.

### 1.2 Why Do We Need Transactions?

Consider a banking scenario where you transfer $500 from Account A to Account B. This involves two operations:

1. Deduct $500 from Account A
2. Add $500 to Account B

If the system crashes after step 1 but before step 2, $500 would disappear from the system. Transactions ensure that either both operations complete or neither does, maintaining data integrity.

---

## Chapter 2: Concurrency Problems in Database Systems

When multiple transactions execute simultaneously (concurrency), several problems can arise if proper isolation is not maintained. These problems are known as **read phenomena**.

### 2.1 Dirty Read

#### Definition

A **dirty read** occurs when one transaction reads data that has been modified by another transaction but not yet committed. If the modifying transaction rolls back, the first transaction has read data that never actually existed in the database.

#### Example Scenario

**Initial State:**

```
Product Table:
ID | Name    | Stock
1  | Laptop  | 10
```

**Timeline of Events:**

| Time | Transaction A                             | Transaction B                          |
| ---- | ----------------------------------------- | -------------------------------------- |
| T1   | BEGIN TRANSACTION                         |                                        |
| T2   | UPDATE Product SET Stock = 5 WHERE ID = 1 |                                        |
| T3   | (Stock is now 5, but not committed)       | BEGIN TRANSACTION                      |
| T4   |                                           | SELECT Stock FROM Product WHERE ID = 1 |
| T5   |                                           | (Reads Stock = 5) ← **DIRTY READ**     |
| T6   | ROLLBACK                                  |                                        |
| T7   | (Stock returns to 10)                     |                                        |
| T8   |                                           | Uses Stock = 5 for calculations        |

#### Detailed Explanation

In this example, Transaction B reads the stock value of 5, which was written by Transaction A but not yet committed. When Transaction A rolls back, the stock value returns to 10. However, Transaction B has already made decisions based on the incorrect value of 5. This is a dirty read because Transaction B read "dirty" (uncommitted) data.

#### Problems Created

1. **Incorrect Business Decisions**: Transaction B might decide not to order more laptops because it thinks there are 5 in stock, when actually there are 10.
2. **Data Inconsistency**: Calculations or reports based on dirty data will be incorrect.
3. **Cascading Errors**: If Transaction B updates other tables based on the dirty read, the inconsistency spreads throughout the database.

#### Solution

Prevent dirty reads by using isolation levels that do not allow reading uncommitted data. Use **READ COMMITTED** or higher isolation levels.

---

### 2.2 Non-Repeatable Read

#### Definition

A **non-repeatable read** occurs when a transaction reads the same row twice and gets different values because another transaction modified and committed the data between the two reads.

#### Example Scenario

**Initial State:**

```
Account Table:
ID | Name   | Balance
1  | John   | 1000
```

**Timeline of Events:**

| Time | Transaction A                                    | Transaction B                                  |
| ---- | ------------------------------------------------ | ---------------------------------------------- |
| T1   | BEGIN TRANSACTION                                |                                                |
| T2   | SELECT Balance FROM Account WHERE ID = 1         |                                                |
| T3   | (Reads Balance = 1000)                           |                                                |
| T4   |                                                  | BEGIN TRANSACTION                              |
| T5   |                                                  | UPDATE Account SET Balance = 1500 WHERE ID = 1 |
| T6   |                                                  | COMMIT                                         |
| T7   | SELECT Balance FROM Account WHERE ID = 1         |                                                |
| T8   | (Reads Balance = 1500) ← **NON-REPEATABLE READ** |                                                |
| T9   | (Same query, different result!)                  |                                                |

#### Detailed Explanation

Transaction A reads John's balance twice within the same transaction. The first read returns 1000, but the second read returns 1500 because Transaction B modified and committed the balance in between. Transaction A expected to read the same value both times (repeatable read), but it didn't happen. The read was "non-repeatable."

#### Problems Created

1. **Inconsistent Calculations**: If Transaction A calculates interest based on the first read and then tries to verify the balance with a second read, the values won't match.
2. **Report Inconsistency**: A financial report generated by Transaction A might show different values for the same account at different points within the report.
3. **Business Logic Errors**: If your application logic assumes data remains constant within a transaction, non-repeatable reads will cause unexpected behavior.

#### Solution

Use **REPEATABLE READ** or **SERIALIZABLE** isolation level to ensure that once data is read in a transaction, it remains unchanged for subsequent reads within the same transaction.

---

### 2.3 Phantom Read

#### Definition

A **phantom read** occurs when a transaction executes a query twice, and the second execution returns additional rows (or fewer rows) that satisfy the query condition because another transaction inserted or deleted rows and committed the changes between the two executions.

#### Example Scenario

**Initial State:**

```
Employee Table:
ID | Name    | Department | Salary
1  | Alice   | Sales      | 50000
2  | Bob     | Sales      | 55000
```

**Timeline of Events:**

| Time | Transaction A                                                | Transaction B                                              |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| T1   | BEGIN TRANSACTION                                            |                                                            |
| T2   | SELECT \* FROM Employee WHERE Department = 'Sales'           |                                                            |
| T3   | (Returns 2 rows: Alice and Bob)                              |                                                            |
| T4   |                                                              | BEGIN TRANSACTION                                          |
| T5   |                                                              | INSERT INTO Employee VALUES (3, 'Charlie', 'Sales', 60000) |
| T6   |                                                              | COMMIT                                                     |
| T7   | SELECT \* FROM Employee WHERE Department = 'Sales'           |                                                            |
| T8   | (Returns 3 rows: Alice, Bob, and Charlie) ← **PHANTOM READ** |                                                            |
| T9   | (A new "phantom" row appeared!)                              |                                                            |

#### Detailed Explanation

Transaction A executes the same query twice to find all employees in the Sales department. The first execution returns 2 rows, but the second execution returns 3 rows because Transaction B inserted a new employee (Charlie) and committed. The new row is called a "phantom" because it appears out of nowhere from Transaction A's perspective, even though Transaction A is reading the same data with the same query.

#### Problems Created

1. **Statistical Inconsistency**: If Transaction A is calculating the average salary of Sales employees, the first calculation and second calculation will be different.
2. **Report Discrepancies**: A report showing "Page 1 of 2" might end up having different totals when you reach "Page 2" because new rows appeared.
3. **Business Logic Failures**: If your application makes decisions based on a record count (e.g., "if more than 10 employees, hire a manager"), phantom reads can cause incorrect decisions.

#### Solution

Use **SERIALIZABLE** isolation level, which prevents other transactions from inserting, updating, or deleting rows that would affect the result set of the current transaction's queries.

---

## Chapter 3: Transaction Isolation Levels

Database systems provide different **isolation levels** to balance between data consistency and system performance. Higher isolation levels provide greater consistency but reduce concurrency and performance.

### 3.1 READ UNCOMMITTED (Level 0)

#### Description

This is the lowest isolation level. Transactions can read uncommitted changes made by other transactions. This level provides no protection against any of the read phenomena.

#### Characteristics

- **Dirty Reads**: Allowed ✓
- **Non-Repeatable Reads**: Allowed ✓
- **Phantom Reads**: Allowed ✓
- **Performance**: Highest
- **Consistency**: Lowest

#### Example and Use Case

```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN TRANSACTION;
SELECT * FROM Products;
-- This can read uncommitted data from other transactions
COMMIT;
```

**Use Case:** This level is rarely used in production systems. It might be acceptable for generating approximate reports or dashboard statistics where absolute accuracy is not critical, and you need maximum performance. For example, displaying an approximate count of website visitors where being off by a few doesn't matter.

#### Why It's Problematic

Imagine a banking application using this level. A transaction reading account balances might see money that was temporarily added but then rolled back. This could lead to approving loans based on funds that don't actually exist.

---

### 3.2 READ COMMITTED (Level 1)

#### Description

This isolation level prevents dirty reads by ensuring that transactions can only read data that has been committed. However, it still allows non-repeatable reads and phantom reads.

#### Characteristics

- **Dirty Reads**: Prevented ✗
- **Non-Repeatable Reads**: Allowed ✓
- **Phantom Reads**: Allowed ✓
- **Performance**: High
- **Consistency**: Moderate

#### Example and Detailed Explanation

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;

-- First read
SELECT Balance FROM Account WHERE ID = 1;
-- Returns: 1000

-- Another transaction updates and commits the balance to 1500

-- Second read
SELECT Balance FROM Account WHERE ID = 1;
-- Returns: 1500 (different from first read)

COMMIT;
```

**Explanation:** At READ COMMITTED level, each individual SELECT statement sees a snapshot of committed data at the moment the statement begins. If another transaction commits changes between two SELECT statements, the second SELECT will see the new committed data. This prevents dirty reads (you never see uncommitted data), but allows non-repeatable reads and phantom reads.

**Use Case:** This is the default isolation level in many database systems (PostgreSQL, SQL Server, Oracle). It's suitable for most applications where occasional inconsistencies within a transaction are acceptable, such as:

- Web applications displaying product catalogs
- Content management systems
- Social media feeds

#### How It Prevents Dirty Reads

The database maintains both old (committed) and new (uncommitted) versions of modified rows. Transactions at READ COMMITTED level only see the committed versions, never the uncommitted ones. When a transaction commits, its changes become visible to other transactions at READ COMMITTED level.

---

### 3.3 REPEATABLE READ (Level 2)

#### Description

This isolation level prevents dirty reads and non-repeatable reads. Once a transaction reads a row, that row's values will remain consistent for all subsequent reads within the same transaction, even if other transactions modify and commit changes. However, phantom reads can still occur.

#### Characteristics

- **Dirty Reads**: Prevented ✗
- **Non-Repeatable Reads**: Prevented ✗
- **Phantom Reads**: Allowed ✓ (in most databases)
- **Performance**: Moderate
- **Consistency**: High

#### Example and Detailed Explanation

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;

-- First read
SELECT Balance FROM Account WHERE ID = 1;
-- Returns: 1000

-- Another transaction tries to update the balance
-- UPDATE Account SET Balance = 1500 WHERE ID = 1
-- This transaction will be BLOCKED until our transaction commits

-- Second read
SELECT Balance FROM Account WHERE ID = 1;
-- Returns: 1000 (same as first read - repeatable!)

-- Now check all accounts with balance > 500
SELECT COUNT(*) FROM Account WHERE Balance > 500;
-- Returns: 5 accounts

-- Another transaction inserts a new account with balance = 2000 and commits

-- Check again
SELECT COUNT(*) FROM Account WHERE Balance > 500;
-- Returns: 6 accounts (phantom read - new row appeared!)

COMMIT;
```

**Explanation:** At REPEATABLE READ level, the database creates a snapshot of all data read by the transaction. Once you read a row, that specific row is "locked" in the snapshot. Other transactions cannot modify rows you've read until you commit. However, other transactions can still insert new rows, which will appear in subsequent queries (phantom reads).

**Use Case:** Suitable for applications requiring consistent reads throughout a transaction:

- Financial reports that must show consistent balances
- Inventory management systems that need stable stock counts during processing
- Reservation systems where availability must remain constant during booking

#### How It Prevents Non-Repeatable Reads

Most databases implement this using one of two mechanisms:

1. **Locking**: When you read a row, a shared lock is placed on it. Other transactions cannot modify that row until you release the lock (by committing or rolling back).

2. **Multi-Version Concurrency Control (MVCC)**: The database maintains multiple versions of each row. Your transaction sees the version that existed when your transaction started, regardless of what other transactions do.

---

### 3.4 SERIALIZABLE (Level 3)

#### Description

This is the highest isolation level. It completely isolates transactions from each other, making them behave as if they were executed serially (one after another) rather than concurrently. It prevents all three read phenomena: dirty reads, non-repeatable reads, and phantom reads.

#### Characteristics

- **Dirty Reads**: Prevented ✗
- **Non-Repeatable Reads**: Prevented ✗
- **Phantom Reads**: Prevented ✗
- **Performance**: Lowest
- **Consistency**: Highest

#### Example and Detailed Explanation

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;

-- First query to count employees in Sales
SELECT COUNT(*) FROM Employee WHERE Department = 'Sales';
-- Returns: 2

-- Another transaction tries to insert a new Sales employee
-- INSERT INTO Employee VALUES (3, 'Charlie', 'Sales', 60000)
-- This transaction will be BLOCKED until our transaction commits

-- Second query - still returns 2 (no phantom!)
SELECT COUNT(*) FROM Employee WHERE Department = 'Sales';
-- Returns: 2 (consistent!)

-- Even range queries are protected
SELECT AVG(Salary) FROM Employee WHERE Department = 'Sales';
-- This will return the same result if executed multiple times
-- because no new rows can be inserted into the range

COMMIT;
```

**Explanation:** At SERIALIZABLE level, the database ensures that the result of executing concurrent transactions is the same as if they were executed one at a time in some order. The database uses range locks or predicate locks to prevent other transactions from inserting, updating, or deleting rows that would affect the result set of queries in the current transaction.

**Use Case:** Critical applications where absolute consistency is required:

- Banking transactions and account transfers
- Stock trading systems
- Airline seat reservations
- Any system where race conditions could cause financial loss or legal issues

#### How It Prevents Phantom Reads

SERIALIZABLE uses several techniques:

1. **Range Locks**: Instead of locking individual rows, the database locks ranges of the index. For example, if you query "WHERE Department = 'Sales'", the database locks the entire "Sales" section of the Department index, preventing insertions.

2. **Predicate Locks**: The database remembers the conditions of your queries and blocks any operations by other transactions that would affect those conditions.

3. **Serialization Graph Checking**: Some databases (like PostgreSQL with SSI - Serializable Snapshot Isolation) detect conflicts between transactions and abort one of them if a non-serializable pattern is detected.

#### Performance Considerations

SERIALIZABLE comes with significant overhead:

- Transactions may wait longer for locks
- Deadlocks occur more frequently
- Transaction throughput decreases
- Some transactions may be aborted and need to retry

---

## Chapter 4: Comparison Table of Isolation Levels

| Isolation Level  | Dirty Read | Non-Repeatable Read | Phantom Read | Performance | Use Case                        |
| ---------------- | ---------- | ------------------- | ------------ | ----------- | ------------------------------- |
| READ UNCOMMITTED | Yes        | Yes                 | Yes          | Fastest     | Approximate reports, statistics |
| READ COMMITTED   | No         | Yes                 | Yes          | Fast        | General web applications        |
| REPEATABLE READ  | No         | No                  | Yes          | Moderate    | Financial reports, inventory    |
| SERIALIZABLE     | No         | No                  | No           | Slowest     | Banking, critical transactions  |

---

## Chapter 5: Practical Solutions and Best Practices

### 5.1 Choosing the Right Isolation Level

**Step 1: Analyze Your Application Requirements**

- What happens if you read slightly stale data?
- Do you need absolute consistency within a transaction?
- How critical is it that data doesn't change during your transaction?

**Step 2: Consider the Trade-offs**

- Higher isolation = Better consistency + Lower performance
- Lower isolation = Worse consistency + Higher performance

**Step 3: Use Different Levels for Different Transactions**
You don't need to use the same isolation level for all transactions. For example:

- Use READ COMMITTED for displaying product catalogs
- Use SERIALIZABLE for processing payments

### 5.2 Code Example: Setting Isolation Levels

**In SQL:**

```sql
-- Method 1: Set for session
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Method 2: Set for specific transaction
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;
-- Your SQL statements here
COMMIT;
```

**In Application Code (using Python with psycopg2):**

```python
import psycopg2

conn = psycopg2.connect("dbname=mydb user=myuser")

# Set isolation level
conn.set_isolation_level(
    psycopg2.extensions.ISOLATION_LEVEL_REPEATABLE_READ
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM accounts WHERE id = 1")
# ... rest of your code
conn.commit()
conn.close()
```

### 5.3 Handling Concurrency Issues

**Optimistic Locking:**

```sql
-- Add a version column to your table
ALTER TABLE Account ADD COLUMN version INT DEFAULT 0;

-- When updating, check the version
UPDATE Account
SET Balance = 1500, version = version + 1
WHERE ID = 1 AND version = 5;

-- If no rows were updated, version changed (conflict detected)
```

**Pessimistic Locking:**

```sql
BEGIN TRANSACTION;
-- Lock the row immediately
SELECT * FROM Account WHERE ID = 1 FOR UPDATE;
-- Now you can safely update
UPDATE Account SET Balance = 1500 WHERE ID = 1;
COMMIT;
```

---

## Chapter 6: Summary and Key Takeaways

### 6.1 Quick Reference Guide

**Problem: You read data that was rolled back**

- **Type:** Dirty Read
- **Solution:** Use READ COMMITTED or higher

**Problem: Same query returns different values in one transaction**

- **Type:** Non-Repeatable Read
- **Solution:** Use REPEATABLE READ or SERIALIZABLE

**Problem: New rows appear in subsequent queries**

- **Type:** Phantom Read
- **Solution:** Use SERIALIZABLE

### 6.2 General Guidelines

1. **Default Choice:** Start with READ COMMITTED for most applications
2. **Critical Transactions:** Use SERIALIZABLE for financial operations
3. **Read-Heavy Operations:** Consider REPEATABLE READ for reports
4. **Performance Critical:** Only use READ UNCOMMITTED if consistency doesn't matter
5. **Always Test:** Test your application under concurrent load to verify isolation behavior

### 6.3 Final Thoughts

Understanding transaction isolation is crucial for building reliable database applications. While higher isolation levels provide better consistency, they come at the cost of performance and concurrency. The key is to find the right balance for your specific use case, understanding that different parts of your application may require different isolation levels.

Remember: **There is no one-size-fits-all solution**. Analyze your requirements, understand the trade-offs, and choose the isolation level that best meets your needs while maintaining acceptable performance.
