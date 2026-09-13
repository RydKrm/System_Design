## 📚 Overview & Master Catalogs

### 📑 Complete Case Catalogs & Reference Compendiums
- Scaling Failure Cases — Complete Volume 1 (57 Production Cases) [[case_study_lists]]
- Scaling Failure Cases — Complete Volume 2 (Sharding, Distributed Systems & DR) [[case_study_lists_2]]
- Database Performance Improvement Case Studies — Master Summary [[performance_case_study_list]]
- Database Mastery Curriculum & Theory [[../Learning_List|Database Foundations & Architecture]]

---

## ⚡ Phase 1 — Query Scaling Failures

### 🔁 Query Execution & Plan Anti-Patterns
- The N+1 Query Disaster [[Query_Case/1.N+1 Query Disaster]]
  - The Innocent-Looking Code That Will Burn Your Server Down [[Query_Case/1.N+1 Query Disaster#The Innocent-Looking Code That Will Burn Your Server Down]]
  - What Is Actually Happening at the Database Level [[Query_Case/1.N+1 Query Disaster#What Is Actually Happening — The Crime Scene]]
  - The Solution — Thinking in Sets, Not Loops [[Query_Case/1.N+1 Query Disaster#The Solution — Thinking in Sets, Not Loops]]
- The OFFSET Pagination Collapse [[Query_Case/02.Offset_Pagination_Collapse]]
  - What OFFSET Actually Does — The Dirty Secret Nobody Tells You [[Query_Case/02.Offset_Pagination_Collapse#What OFFSET Actually Does — The Dirty Secret Nobody Tells You]]
  - The Performance Cliff — Why It Degrades Over Time [[Query_Case/02.Offset_Pagination_Collapse#The Performance Cliff — Why It Gets Worse Over Time]]
  - Solution — Keyset (Cursor) Pagination [[Query_Case/02.Offset_Pagination_Collapse#The Solution — Keyset Pagination (Cursor-Based Pagination)]]
- The COUNT(*) Bottleneck [[Query_Case/03.Count_Bottleneck]]
  - What COUNT(*) Actually Does — Why Knowing Everything Costs [[Query_Case/03.Count_Bottleneck#What COUNT(*) Actually Does — Why a Number Is Not Free]]
  - Interaction with MVCC & Visibility Checks [[Query_Case/03.Count_Bottleneck#Why It Gets Worse — The Interaction With Table Size and Concurrency]]
  - Solution One — Counter Tables and Incremental Updates [[Query_Case/03.Count_Bottleneck#Solution 1 — The Pre-Computed Counter Table]]
  - Solution Two — Approximate Counts with HyperLogLog & pg_class [[Query_Case/03.Count_Bottleneck#Solution 3 — HyperLogLog for Approximate Counts]]

### 🔍 Scans, Over-Fetching & Filter Pitfalls
- The SELECT * Over-Fetch [[Query_Case/08.SELECT_Over-Fetch]]
  - How the Database Retrieves Your Data — The Full Journey [[Query_Case/08.SELECT_Over-Fetch#2. How a Database Actually Retrieves Your Data — The Full Journey]]
  - Network, Memory & TOAST Waste [[Query_Case/08.SELECT_Over-Fetch#4. The Mathematics of Waste — Making the Cost Concrete]]
  - Solution One — Explicit Column Projections [[Query_Case/08.SELECT_Over-Fetch#The Fundamental Fix — Explicit Column Lists]]
  - Solution Two — Covering Indexes for Index-Only Scans [[Query_Case/08.SELECT_Over-Fetch#Covering Indexes — Moving the Solution to the Storage Layer]]
- The Wildcard Leading LIKE Killer [[Query_Case/07.Wildcard_leading_like_killer]]
  - Why the Leading Wildcard Destroys B-Tree Indexes [[Query_Case/07.Wildcard_leading_like_killer#3. Why the Leading Wildcard Destroys Index Usage]]
  - Solution One — Suffix Inversion for End-Wildcard Queries [[Query_Case/07.Wildcard_leading_like_killer#Solution 1 — PostgreSQL Full-Text Search with tsvector and GIN Index]]
  - Solution Two — Trigram Indexes with pg_trgm (PostgreSQL) [[Query_Case/07.Wildcard_leading_like_killer#Solution 2 — Trigram Index with pg_trgm Extension]]
  - Solution Three — Full-Text Search with tsvector and GIN [[Query_Case/07.Wildcard_leading_like_killer#Solution 1 — PostgreSQL Full-Text Search with tsvector and GIN Index]]
- The Function in WHERE Clause Index Bypass [[Query_Case/09.WHERE_Clause_Index_Bypass]]
  - Understanding What an Index Actually Stores [[Query_Case/09.WHERE_Clause_Index_Bypass#2. Understanding What an Index Actually Stores]]
  - What the Database Engine Is Forced to Do [[Query_Case/09.WHERE_Clause_Index_Bypass#3. What the Database Engine Is Forced to Do]]
  - Solution One — Rewrite to Compare Raw Column Values [[Query_Case/09.WHERE_Clause_Index_Bypass#1. The Query That Looks Perfectly Reasonable]]
  - Solution Two — Expression (Functional) Indexes [[Query_Case/09.WHERE_Clause_Index_Bypass#8. The Alternative Solution — Expression Indexes]]
- The OR Condition Index Breakdown [[Query_Case/10.OR_Condition_Index_Breakdown]]
  - Why Two Indexes Cannot Both Be Used for OR [[Query_Case/10.OR_Condition_Index_Breakdown#2. Why Two Indexes Cannot Both Be Used for OR — The Core Problem]]
  - Reading the Evidence in EXPLAIN [[Query_Case/10.OR_Condition_Index_Breakdown#3. Reading the Evidence in EXPLAIN]]
  - Solution One — The UNION ALL Rewrite [[Query_Case/10.OR_Condition_Index_Breakdown#5. Solution One — UNION ALL Across Separate Queries]]

### 📐 Joins, Sets & Complex Queries
- The Missing Composite Index Column Order [[Query_Case/11.Missing_Composite_Index_Order]]
  - What a Composite Index Actually Is [[Query_Case/11.Missing_Composite_Index_Order#2. What a Composite Index Actually Is]]
  - The Left-Prefix Rule — The Governing Law of Composite Indexes [[Query_Case/11.Missing_Composite_Index_Order#3. The Left-Prefix Rule — The Governing Law of Composite Indexes]]
  - The Golden Rule — Equality First, Range Second [[Query_Case/11.Missing_Composite_Index_Order#3. The Left-Prefix Rule — The Governing Law of Composite Indexes]]
- The ORDER BY Non-Index Column Sort Spill [[Query_Case/12.ORDER_BY_Non-Index_Column_Sort_Spill]]
  - The Sort Algorithm and Why Memory Matters (work_mem) [[Query_Case/12.ORDER_BY_Non-Index_Column_Sort_Spill#3. The Sort Algorithm and Why Memory Matters]]
  - Diagnostic Signature in EXPLAIN ANALYZE [[Query_Case/12.ORDER_BY_Non-Index_Column_Sort_Spill#4. The Diagnostic Signature in EXPLAIN ANALYZE]]
  - Solution One — Composite Index Covering Both Filter and Sort [[Query_Case/12.ORDER_BY_Non-Index_Column_Sort_Spill#6. Solution One — Index the ORDER BY Column]]
- The Unbounded IN Clause [[Query_Case/06.Unbounded_IN_Case]]
  - What the Database Planner Has to Do With an IN List [[Query_Case/06.Unbounded_IN_Case#What the Database Planner Has to Do With an IN List — The Hidden Cost]]
  - Solution One — Array Parameter with = ANY(?) [[Query_Case/06.Unbounded_IN_Case]]
  - Solution Two — Temporary Table and JOIN [[Query_Case/06.Unbounded_IN_Case#Solution 2 — Temporary Table + JOIN]]
  - Solution Three — Application-Side Chunking [[Query_Case/06.Unbounded_IN_Case]]
- The Cartesian Product Accident [[Query_Case/13.Cartesian_Product_Accident]]
  - What a Cartesian Product Actually Means — The Mathematics [[Query_Case/13.Cartesian_Product_Accident#2. What a Cartesian Product Actually Means — The Mathematics]]
  - The Multiplicative Disaster at Scale [[Query_Case/13.Cartesian_Product_Accident#4. The Multiplicative Disaster — Making the Scale Concrete]]
  - Solution One — Always Use Explicit ANSI JOIN Syntax [[Query_Case/13.Cartesian_Product_Accident#7. Solution One — Always Use Explicit JOIN Syntax]]
  - Solution Two — Statement-Level Query Timeouts [[Query_Case/13.Cartesian_Product_Accident#8. Solution Two — Statement-Level Query Timeouts]]
- The DISTINCT Performance Trap [[Query_Case/14. DISTINCT_Performance_Trap]]
  - The Mental Model — DISTINCT Is a Hidden GROUP BY [[Query_Case/14. DISTINCT_Performance_Trap#3. The Mental Model — DISTINCT Is a Hidden GROUP BY]]
  - The DISTINCT on JOIN Problem [[Query_Case/14. DISTINCT_Performance_Trap#10. The DISTINCT on JOIN Problem — Where It Becomes Truly Expensive]]
  - Solution One — EXISTS for Presence Checking [[Query_Case/14. DISTINCT_Performance_Trap#6. Solution One — EXISTS for Presence Checking]]
- The Deep Recursive CTE Stack Overflow [[Query_Case/15.Deep_Recursive_CTE_Stack_Overflow]]
  - How Recursive CTEs Work Internally [[Query_Case/15.Deep_Recursive_CTE_Stack_Overflow#2. How Recursive CTEs Work — The Mechanism You Must Understand]]
  - Why Cycles Always Appear in Real-World Data [[Query_Case/15.Deep_Recursive_CTE_Stack_Overflow#3. The Real-World Trigger — Why Cycles Always Appear]]
  - Solution One — PostgreSQL CYCLE Clause [[Query_Case/15.Deep_Recursive_CTE_Stack_Overflow#6. Solution One — PostgreSQL CYCLE Clause (PostgreSQL 14+)]]
  - Solution Three — Depth Limit Guard [[Query_Case/15.Deep_Recursive_CTE_Stack_Overflow#8. Solution Three — Depth Limit Guard]]

### 💥 Row Contention in Queries
- The Hot Row Bottleneck (Seat Booking & Inventory) [[Query_Case/04.Hot_Row_Bottleneck]]
  - What a Database Lock Is — The Foundation [[Query_Case/04.Hot_Row_Bottleneck#What a Database Lock Is — The Foundation You Must Understand First]]
  - The Queue That Brings Everything Down [[Query_Case/04.Hot_Row_Bottleneck#The Queue That Brings Everything Down]]
  - Solution One — Sharded Counters [[Query_Case/04.Hot_Row_Bottleneck#Solution 1 — Sharded Counters]]
  - Solution Two — SELECT FOR UPDATE SKIP LOCKED [[Query_Case/04.Hot_Row_Bottleneck]]
- The Missing Foreign Key Index [[Query_Case/05.Missing Foreign Key Index]]
  - What a Foreign Key Actually Does During a DELETE [[Query_Case/05.Missing Foreign Key Index#What a Foreign Key Actually Does During a DELETE — The Unseen Work]]
  - Why Nobody Notices Until It Is Too Late [[Query_Case/05.Missing Foreign Key Index#Why Nobody Notices Until It Is Too Late]]
  - The Solution — Index Every Foreign Key [[Query_Case/05.Missing Foreign Key Index#The Solution — Index Every Foreign Key Column]]

---

## 📇 Phase 2 — Index Design & Bloat Failures

### 🌲 Index Traps & Maintenance Crises
- The Missing Foreign Key Index (Cascade Lock Bomb) [[index_Case/16.Missing_Foreign_Key_Index]]
  - Understanding the Foundation — What Is a Foreign Key? [[index_Case/16.Missing_Foreign_Key_Index#Chapter 1: Understanding the Foundation — What Is a Foreign Key?]]
  - The Act of Deletion and What PostgreSQL Must Do [[index_Case/16.Missing_Foreign_Key_Index#Chapter 2: The Act of Deletion and What PostgreSQL Must Do]]
  - The Bomb — No Index on the Foreign Key Column [[index_Case/16.Missing_Foreign_Key_Index#Chapter 3: The Bomb — No Index on the Foreign Key Column]]
  - The Fix — Adding the Missing Index Concurrently [[index_Case/16.Missing_Foreign_Key_Index#The Missing Foreign Key Index]]
- The Index That Never Gets Used [[index_Case/17.Index_That_Never_Gets_Used]]
  - The Five Reasons Indexes Go Unused [[index_Case/17.Index_That_Never_Gets_Used#The Index That Never Gets Used]]
  - Auditing pg_stat_user_indexes for Zero-Scan Indexes [[index_Case/17.Index_That_Never_Gets_Used#Chapter 8: The Solution for Low Selectivity — Partial Indexes]]
  - Cost of Unused Indexes on Disk, RAM & Writes [[index_Case/17.Index_That_Never_Gets_Used#The Index That Never Gets Used]]
- The Index Bloat Explosion [[index_Case/18.Index_Bloat_Explosion]]
  - How B-Trees Fragment — Page Splits & Dead Tuples [[index_Case/18.Index_Bloat_Explosion#Chapter 5: How to See the Bloat — Measuring What Is Invisible]]
  - Diagnosing Bloat with pgstattuple [[index_Case/18.Index_Bloat_Explosion]]
  - The Solution — Rebuilding Bloated Indexes with REINDEX CONCURRENTLY [[index_Case/18.Index_Bloat_Explosion#Chapter 10: The Complete Mental Model — Lifecycle of a Bloated Index]]
- The Over-Indexed Write Table [[index_Case/19.Over-Indexed_Write_Table]]
  - The Cost of an Index on Write Operations [[index_Case/19.Over-Indexed_Write_Table#The Over-Indexed Write Table]]
  - Breaking HOT (Heap-Only Tuple) Optimization [[index_Case/19.Over-Indexed_Write_Table#Chapter 4: Reading the Evidence — `pg_stat_user_indexes`]]
  - The Solution — Pruning Redundant and Low-Value Indexes [[index_Case/19.Over-Indexed_Write_Table#Chapter 5: The Correct Way to Drop Indexes — Safely and Concurrently]]
- The Partial Index That Doesn't Match the Query [[index_Case/20.Partial_Index_That_Doesn't_Match_the_Query]]
  - The Predicate Mismatch Problem [[index_Case/20.Partial_Index_That_Doesn't_Match_the_Query#Chapter 5: Diagnosing the Problem — EXPLAIN ANALYZE and pg_stat_user_indexes]]
  - Why the Planner Rejects Non-Matching Filters [[index_Case/20.Partial_Index_That_Doesn't_Match_the_Query]]
  - The Solution — Perfect Alignment Between Index and Query [[index_Case/20.Partial_Index_That_Doesn't_Match_the_Query#Chapter 6: The Solutions — Aligning Index and Query]]
- The Index on a Low-Cardinality Boolean Column [[index_Case/21.Index_Low-Cardinality_Boolean_Column]]
  - The Cardinality Problem — Why Booleans Break Indexes [[index_Case/21.Index_Low-Cardinality_Boolean_Column#Understanding the Problem — The Nature of Cardinality]]
  - Cost Model — Why Sequential Scan Wins on 50/50 Data [[index_Case/21.Index_Low-Cardinality_Boolean_Column#Case Study 21 — The Index on a Low-Cardinality Boolean Column]]
  - The Solution — Partial Index on the Minority Value [[index_Case/21.Index_Low-Cardinality_Boolean_Column#The Solution — Partial Indexes]]

---

## 🏛 Phase 3 — Schema & Data Modeling Anti-Patterns

### 🧩 Schema Anti-Patterns
- The EAV (Entity-Attribute-Value) Trap [[Schema_Case/01.The_EAV_Entity_Attribute_Value_Trap]]
  - What EAV Is — The Pattern and Its Origin [[Schema_Case/01.The_EAV_Entity_Attribute_Value_Trap#What EAV Is — The Pattern and Its Origin]]
  - Query Complexity Explosion — Self-Joins as Far as the Eye Can See [[Schema_Case/01.The_EAV_Entity_Attribute_Value_Trap#The Query Complexity Explosion — Self-Joins as Far as the Eye Can See]]
  - Solution One — Normalized Columns for Known Attributes [[Schema_Case/01.The_EAV_Entity_Attribute_Value_Trap#Solution One — Normalized Columns: The Right Tool for Known Attributes]]
  - Solution Two — JSONB Column for Flexible Attributes [[Schema_Case/01.The_EAV_Entity_Attribute_Value_Trap#Solution Two — JSONB Column: For Genuinely Flexible Attributes]]
- The God Table Anti-Pattern [[Schema_Case/02.The_God_Table]]
  - What the God Table Is — One Table to Rule Them All [[Schema_Case/02.The_God_Table#What the God Table Is — The Anti-Pattern Formally Named]]
  - Why the God Table Fails — Five Compounding Problems [[Schema_Case/02.The_God_Table#Why the God Table Fails — Five Compounding Problems]]
  - Solution One — Separate Tables with Shared Linkage [[Schema_Case/02.The_God_Table#Solution One — Proper Separate Tables with a Shared Notifications Linkage]]
  - Solution Three — Class Table Inheritance [[Schema_Case/02.The_God_Table#Solution Three — Class Table Inheritance: The Best of Both Worlds]]
- The Polymorphic Association Without an Index [[Schema_Case/03.The_Polymorphic_Association_Without_An_Index]]
  - Understanding Polymorphic Associations — The Two-Column Pointer [[Schema_Case/03.The_Polymorphic_Association_Without_An_Index#Understanding Polymorphic Associations — The Two-Column Pointer]]
  - Why the Bug Is Invisible at Small Scale [[Schema_Case/03.The_Polymorphic_Association_Without_An_Index#Why the Bug Is Invisible at Small Scale]]
  - The Fix — A Composite Index in the Correct Column Order [[Schema_Case/03.The_Polymorphic_Association_Without_An_Index#The Fix — A Composite Index in the Correct Column Order]]
  - The Deeper Solution — Separate Tables Per Entity Type [[Schema_Case/03.The_Polymorphic_Association_Without_An_Index#The Deeper Solution — Separate Tables Per Entity Type]]

### 🔢 Types, Semantics & Deletions
- Storing Money as FLOAT Disaster [[Schema_Case/04.Storing_Money_As_Float_Disaster]]
  - The Physics of Floating-Point — Why 0.1 Does Not Exist in Binary [[Schema_Case/04.Storing_Money_As_Float_Disaster#The Physics of Floating-Point — Why 0.1 Does Not Exist in Binary]]
  - How Errors Accumulate — The $0.03 Mystery Explained [[Schema_Case/04.Storing_Money_As_Float_Disaster#How Errors Accumulate — The $0.03 Mystery Explained]]
  - Solution One — NUMERIC(19,4): The Correct Type for Money [[Schema_Case/04.Storing_Money_As_Float_Disaster#Solution One — `NUMERIC(19,4)`: The Correct Type for Money]]
  - Solution Two — Store in Smallest Currency Unit as INTEGER [[Schema_Case/04.Storing_Money_As_Float_Disaster#Solution Two — Store in Smallest Currency Unit as INTEGER]]
- Storing Timestamps Without Timezone [[Schema_Case/05.Storing_Timestamps_Without_Timezone]]
  - TIMESTAMP vs TIMESTAMPTZ — The Critical Difference [[Schema_Case/05.Storing_Timestamps_Without_Timezone#`TIMESTAMP` vs `TIMESTAMPTZ` — The Critical Difference]]
  - The Three Failure Scenarios When Naive Timestamps Break [[Schema_Case/05.Storing_Timestamps_Without_Timezone#The Three Failure Scenarios — When Naive Timestamps Break]]
  - The Correct Solution — TIMESTAMPTZ Everywhere [[Schema_Case/05.Storing_Timestamps_Without_Timezone#The Correct Solution — `TIMESTAMPTZ` Everywhere]]
  - Writing Correct Go Code — UTC by Default, Always [[Schema_Case/05.Storing_Timestamps_Without_Timezone#Writing Correct Go Code — UTC by Default, Always]]
- Unconstrained String Length [[Schema_Case/06.Unconstrained_String_Length]]
  - Understanding PostgreSQL String Storage — What Actually Happens [[Schema_Case/06.Unconstrained_String_Length#Understanding PostgreSQL String Storage — What Actually Happens]]
  - The Four Damage Vectors — One Unconstrained Column, Four Problems [[Schema_Case/06.Unconstrained_String_Length#The Four Damage Vectors — One Unconstrained Column, Four Problems]]
  - The Correct Schema — Sensible Limits for Every String Column [[Schema_Case/06.Unconstrained_String_Length#The Correct Schema — Sensible Limits for Every String Column]]
  - Reference Length Limits Cheat Sheet [[Schema_Case/06.Unconstrained_String_Length#Reference Length Limits — A Practical Cheat Sheet]]
- The Missing Soft Delete Index [[Schema_Case/07.The_Missing_Soft_Delete_Index]]
  - Why Standard Indexes Cannot Help WHERE deleted_at IS NULL [[Schema_Case/07.The_Missing_Soft_Delete_Index#Why Standard Indexes Cannot Help `WHERE deleted_at IS NULL`]]
  - The Partial Index — The Correct Solution [[Schema_Case/07.The_Missing_Soft_Delete_Index#The Partial Index — The Correct Solution]]
  - The Unique Partial Index — Enforcing Uniqueness on Active Rows [[Schema_Case/07.The_Missing_Soft_Delete_Index#The Unique Partial Index — The Bonus Benefit]]
  - Complete Soft-Delete Schema Template [[Schema_Case/07.The_Missing_Soft_Delete_Index#A Complete Soft-Delete Schema Template]]
- The Nullable Column with False NULL Semantics [[Schema_Case/08.The_Nullable_Column_With_False_NULL_Semantics]]
  - What NULL Actually Means — The SQL Standard Definition [[Schema_Case/08.The_Nullable_Column_With_False_NULL_Semantics#What NULL Actually Means — The SQL Standard Definition]]
  - The Three-State Encoding — How the Bug Multiplies [[Schema_Case/08.The_Nullable_Column_With_False_NULL_Semantics#The Three-State Encoding — How the Bug Multiplies]]
  - Solution One — Separate Columns for Separate Concepts [[Schema_Case/08.The_Nullable_Column_With_False_NULL_Semantics#Solution One — Separate Columns for Separate Concepts]]
  - Solution Two — PostgreSQL ENUM Type for Status [[Schema_Case/08.The_Nullable_Column_With_False_NULL_Semantics#Solution Two — PostgreSQL ENUM Type for Status]]

---

## 🔒 Phase 4 — Concurrency, Locks & Transactions

### ⚔ Concurrency Anomalies & Deadlocks
- The Hot Row Bottleneck (Serialization Ceiling) [[Concurrency_Case/01.The_Hot_Row_Bottleneck]]
  - What Happens When Two Transactions Touch the Same Row [[Concurrency_Case/01.The_Hot_Row_Bottleneck#What Actually Happens When Two Transactions Touch the Same Row]]
  - Why Hardware Cannot Save You — The Serialization Ceiling [[Concurrency_Case/01.The_Hot_Row_Bottleneck#Why Hardware Cannot Save You — The Serialization Ceiling]]
  - Solution One — Sharded Counters: Spreading the Heat [[Concurrency_Case/01.The_Hot_Row_Bottleneck#Solution One — Sharded Counters: Spreading the Heat]]
  - Solution Two — Queue and Batch: Eliminating Real-Time Row Writes [[Concurrency_Case/01.The_Hot_Row_Bottleneck#The Setup — Ten Thousand People, One Row]]
- The Deadlock Cascade [[Concurrency_Case/02.The_Deadlock_Cascade]]
  - The Mechanics of a Deadlock — The Four Conditions [[Concurrency_Case/02.The_Deadlock_Cascade#Case Study 02 — The Deadlock Cascade]]
  - The PostgreSQL Deadlock Detection Engine [[Concurrency_Case/02.The_Deadlock_Cascade#PostgreSQL Configuration — Tuning the Deadlock Detector]]
  - Solution One — Enforce Global Lock Acquisition Ordering [[Concurrency_Case/02.The_Deadlock_Cascade#The Fix — Lock Acquisition Order is Everything]]
  - Solution Two — Explicit Statement Lock Timeouts [[Concurrency_Case/02.The_Deadlock_Cascade]]
- The Lost Update Under Concurrency [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency]]
  - The Core Crime — Read-Modify-Write Without Protection [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency#The Isolation Level Connection — Why Read Committed Is Not Enough]]
  - Why Read Committed Does Not Protect You [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency#The Isolation Level Connection — Why Read Committed Is Not Enough]]
  - Solution One — Atomic Updates in SQL (The Simplest Fix) [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency#Solution One — The Atomic Increment: The Right Tool, Always]]
  - Solution Two — Optimistic Locking with a Version Column [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency#Solution Three — Optimistic Locking with Version Column]]
  - Solution Three — Pessimistic Locking with SELECT FOR UPDATE [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency#Solution Two — `SELECT FOR UPDATE`: Lock Before Reading]]
- The Phantom Read Double-Booking [[Concurrency_Case/04.The_Phantom_Read_Double_Booking]]
  - The Phantom Defined — A Row Appears from Nowhere [[Concurrency_Case/04.The_Phantom_Read_Double_Booking#Case Study 04 — The Phantom Read Double-Booking]]
  - Why Row-Level Locks Cannot Lock Rows That Do Not Exist Yet [[Concurrency_Case/04.The_Phantom_Read_Double_Booking#Solution Four — Advisory Locks: Application-Level Mutual Exclusion]]
  - Solution One — Explicit Exclusion Constraints (PostgreSQL) [[Concurrency_Case/04.The_Phantom_Read_Double_Booking#Solution One — Unique Constraint: The Database-Level Safety Net]]
  - Solution Two — Serializable Isolation Level [[Concurrency_Case/04.The_Phantom_Read_Double_Booking#Solution Three — Serializable Isolation: Catch the Write Skew Automatically]]
- The Write Skew on a Multi-Row Constraint [[Concurrency_Case/05.The_Write_Skew_On_Multi_Row_Constraint]]
  - The On-Call Doctor Problem — The Classic Write Skew [[Concurrency_Case/05.The_Write_Skew_On_Multi_Row_Constraint#Case Study 05 — The Write Skew on a Multi-Row Constraint]]
  - Why Repeatable Read Does Not Prevent Write Skew [[Concurrency_Case/05.The_Write_Skew_On_Multi_Row_Constraint#The Snapshot Isolation Failure — Why Even Repeatable Read Is Insufficient]]
  - Solution One — Materialize the Conflict with a Shared Lock Row [[Concurrency_Case/05.The_Write_Skew_On_Multi_Row_Constraint#Solution Three — Materialize the Constraint into a Single Lockable Row]]
  - Solution Two — Serializable Isolation Level [[Concurrency_Case/05.The_Write_Skew_On_Multi_Row_Constraint#Solution One — Serializable Isolation: The Complete Answer]]

### 💥 Large Transaction Failures
- The Bulk Delete Lock Explosion [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion]]
  - The Anatomy of a Bulk DELETE — What PostgreSQL Does [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion#What a Bulk Delete Actually Does — Inside the Engine]]
  - Why Autovacuum Starves and Tables Swell [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion#Tuning the Batch Size and Sleep — Finding the Right Balance]]
  - Solution One — Chunked Deletion with Sleep Intervals [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion#Solution One — Batch Deletes with Commits and Sleep]]
  - Solution Two — Partition-Based Deletion with DROP TABLE [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion#Solution Two — Table Partitioning: The Zero-Downtime Alternative]]
- The Transaction Too Large to Rollback [[Concurrency_Case/07.The_Transaction_Too_Large_To_Rollback]]
  - The Mechanics of a Huge Transaction — What the Database Stores [[Concurrency_Case/07.The_Transaction_Too_Large_To_Rollback#Case Study 07 — The Transaction Too Large to Rollback]]
  - The Crash Recovery Trap — Why the Database Refuses to Start [[Concurrency_Case/07.The_Transaction_Too_Large_To_Rollback#The Mechanics of Rollback — Why It Costs as Much as the Forward Operation]]
  - Solution One — Batch the Operation Across Multiple Transactions [[Concurrency_Case/07.The_Transaction_Too_Large_To_Rollback#Solution One — Batched Updates with Progress Tracking]]
  - Solution Two — A Safe Large Migration Pattern in Go [[Concurrency_Case/07.The_Transaction_Too_Large_To_Rollback#Solution Two — Pre-Validate Before Touching Data]]

---

## 🔌 Phase 5 — Connection Pooling & Traffic Storms

### 🌊 Connection Pool & Storm Dynamics
- The Connection Pool Exhaustion [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion]]
  - What Is a Database Connection, Really? [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion#What Is a Database Connection, Really?]]
  - The Anti-Pattern — Connections Per Request [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion#The Anti-Pattern — Connections Per Request]]
  - Why It Works at 10 RPS But Fails at 1,000 RPS [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion#The Scale Trigger — Why It Works at 10 RPS But Fails at 1,000 RPS]]
  - Solution One — Correct Application Pool Sizing Formula [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion#Layer 1 — Fix Your Application Pool Settings (Go's `database/sql`)]]
  - Solution Two — Connection Pooling with PgBouncer [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion]]
- The Idle Connection Leak [[Connection_Pool_Case/02.The_Idle_Connection_Leak]]
  - How Connections Leak — Five Common Patterns [[Connection_Pool_Case/02.The_Idle_Connection_Leak#How the Leak Actually Happens — The Real Code Patterns]]
  - Why Idle Connections Waste RAM and Kill Scale [[Connection_Pool_Case/02.The_Idle_Connection_Leak#Case Study 22 — The Idle Connection Leak]]
  - Solution One — The Ironclad Connection Lifecycle in Go [[Connection_Pool_Case/02.The_Idle_Connection_Leak#Case Study 22 — The Idle Connection Leak]]
  - Solution Two — Database-Level Timeout Safeguards [[Connection_Pool_Case/02.The_Idle_Connection_Leak]]
- The Long-Running Transaction Lock Escalation [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation]]
  - The Core Problem — Transactions Are Not Free [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation#Understanding Transactions and Locks — The Foundation]]
  - Holding Locks While Waiting for External APIs [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation#Pattern One: External API Calls Inside a Transaction]]
  - Solution One — Remove Network Calls from Transactions [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation#Pattern One: External API Calls Inside a Transaction]]
  - Solution Two — Transaction Timeouts and Idle-in-Transaction Limits [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation#Pattern Two: Analytics Queries Inside a Transaction]]
- The Cascading Slow Query Timeout Storm [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm]]
  - The Anatomy of a Cascade — The Seven Stages [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm#Little's Law — The Mathematics of the Cascade]]
  - The Poison Retry Pattern — Why Retrying Makes It Worse [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm]]
  - Solution One — Statement Timeouts with cancellation [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm#Layer One — `statement_timeout`: The Emergency Kill Switch]]
  - Solution Two — Exponential Backoff with Full Jitter [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm]]
  - Solution Three — Circuit Breakers (Fail Fast) [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm]]

---

## 🚀 Phase 6 — Performance Optimization: Index Improvements

### 🌲 Real-World Index Optimization Case Studies
- Missing Index: 45 Seconds → 2 Milliseconds [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization]]
  - How Data Actually Lives in a Database Heap [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization#First, Understand How Data Actually Lives in a Database]]
  - The Sequential Scan: A Nightmare at Scale [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization#The Sequential Scan: A Nightmare at Scale]]
  - Reading the Crime Scene: EXPLAIN ANALYZE [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization#Reading the Crime Scene: EXPLAIN ANALYZE]]
  - The Solution: CREATE INDEX CONCURRENTLY [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization#The Case of the Missing Index: How One Line of SQL Saved an E-Commerce Platform]]
- Covering Index Eliminates Table Heap Access: 800ms → 5ms [[Performance_Optimization_Case_Study/Index_Optimization/02.Covering_Index_Eliminates]]
  - Understanding Heap Fetch Bottlenecks [[Performance_Optimization_Case_Study/Index_Optimization/02.Covering_Index_Eliminates#The Two-Step Dance: Index Scan + Heap Fetch]]
  - The Covering Index: Making the Index Autonomous [[Performance_Optimization_Case_Study/Index_Optimization/02.Covering_Index_Eliminates#The Covering Index: When the Index Itself Becomes the Answer]]
  - The INCLUDE Clause (PostgreSQL 11+) [[Performance_Optimization_Case_Study/Index_Optimization/02.Covering_Index_Eliminates#The `INCLUDE` Clause: PostgreSQL's Alternative Syntax]]
- Partial Index Shrinks Size 95%, Query 200× Faster [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index]]
  - The Root Cause: High-Water Mark of Historical Data [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index#The Partial Index: When Indexing Less Means Querying Faster]]
  - The Insight: Indexing the Needle, Not the Haystack [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index#The Partial Index: When Indexing Less Means Querying Faster]]
  - The Solution: The Partial Index [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index#The Partial Index: When Indexing Less Means Querying Faster]]
  - The Buffer Cache Multiplier Effect [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index#The Buffer Cache Fit: Why 400MB Changes Everything]]
- Expression Index on Function: 12 Seconds → 8ms [[Performance_Optimization_Case_Study/Index_Optimization/04.Expression_Index]]
  - The Root Cause: Functions Destroy B-Tree Usability [[Performance_Optimization_Case_Study/Index_Optimization/04.Expression_Index#The Important Constraint: Immutability of Functions]]
  - The Solution: The Expression Index [[Performance_Optimization_Case_Study/Index_Optimization/04.Expression_Index#The Expression Index: When Your Function Breaks Your Index]]
  - Generated Virtual Columns vs Expression Indexes [[Performance_Optimization_Case_Study/Index_Optimization/04.Expression_Index#Citext: An Alternative Approach for Case-Insensitive Columns]]
- Composite Index Column Order: Sequence Is Everything [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index]]
  - Understanding the B-Tree: How Composite Keys Are Ordered [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index#How a Composite B-Tree Index Is Physically Organised]]
  - The Range Column Trap [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index#The Composite Index Column Order: Sequence Is Everything]]
  - The Golden Rule: Equality First, Range Second [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index#Why Range Conditions Must Come Last: The Broken Prefix Property]]

---

## 🔄 Phase 7 — Performance Optimization: Query Rewrites

### ⚡ Production Query Transformation Case Studies
- Subquery to JOIN Rewrite (450× Speedup) [[Performance_Optimization_Case_Study/Query_Rewrite/01.Subquery_To_Join_Rewrite]]
  - The Root Cause: The Correlated Subquery Trap [[Performance_Optimization_Case_Study/Query_Rewrite/01.Subquery_To_Join_Rewrite#The Root Cause: The Correlated Subquery Trap]]
  - Why Doesn't the Planner Optimize This? [[Performance_Optimization_Case_Study/Query_Rewrite/01.Subquery_To_Join_Rewrite#But Wait — Why Doesn't the Planner Optimize This?]]
  - The Solution: Rewriting as a Set-Oriented JOIN [[Performance_Optimization_Case_Study/Query_Rewrite/01.Subquery_To_Join_Rewrite#The Solution: Rewriting as an Explicit JOIN]]
- Cursor Pagination Replaces OFFSET (2,666× Speedup) [[Performance_Optimization_Case_Study/Query_Rewrite/02.Cursor_Pagination_Replaces_OFFSET]]
  - The Secret Life of OFFSET: Why the DB Does All That Work [[Performance_Optimization_Case_Study/Query_Rewrite/02.Cursor_Pagination_Replaces_OFFSET#Understanding How OFFSET Actually Works Inside the Database]]
  - The Solution: Cursor (Keyset) Pagination [[Performance_Optimization_Case_Study/Query_Rewrite/02.Cursor_Pagination_Replaces_OFFSET#The Solution: Keyset Pagination (Cursor Pagination)]]
  - Composite Cursor for Multi-Column Ties [[Performance_Optimization_Case_Study/Query_Rewrite/02.Cursor_Pagination_Replaces_OFFSET#The Composite Cursor: Solving the Tie-Breaking Problem]]
- EXISTS Replaces COUNT (4,000× Speedup) [[Performance_Optimization_Case_Study/Query_Rewrite/03.EXISTS_Replaces_COUNT]]
  - The Difference Between Counting and Asking [[Performance_Optimization_Case_Study/Query_Rewrite/03.EXISTS_Replaces_COUNT#When the Difference Is Most Dramatic — and When It Disappears]]
  - The Short-Circuiting Mechanism of EXISTS [[Performance_Optimization_Case_Study/Query_Rewrite/03.EXISTS_Replaces_COUNT#The Solution: EXISTS and Its Power to Short-Circuit]]
  - The Solution: Replacing COUNT with EXISTS [[Performance_Optimization_Case_Study/Query_Rewrite/03.EXISTS_Replaces_COUNT#The Question the Database Was Forced to Over-Answer: How Replacing COUNT with EXISTS Made an Authorization Check 4,000× Faster]]
- Window Function Replaces Correlated Subquery (120s → 800ms) [[Performance_Optimization_Case_Study/Query_Rewrite/04.Window_Function_Replaces_Correlated_Subquery]]
  - The Root Cause: Repeated Scans of the Same Data [[Performance_Optimization_Case_Study/Query_Rewrite/04.Window_Function_Replaces_Correlated_Subquery#The Mental Model: What We Really Want the Database to Do]]
  - The Solution: The Window Function Single-Pass [[Performance_Optimization_Case_Study/Query_Rewrite/04.Window_Function_Replaces_Correlated_Subquery#The Report That Re-Read Ten Million Orders Ten Million Times: How a Window Function Replaced a Two-Minute Query with an 800ms One]]
  - Why Window Functions Win: Algorithmic Complexity [[Performance_Optimization_Case_Study/Query_Rewrite/04.Window_Function_Replaces_Correlated_Subquery]]
- CTE Materialization Forces Efficient Plan (45s → 200ms) [[Performance_Optimization_Case_Study/Query_Rewrite/05.CTE_Materialization_Forces_Efficient_Plan]]
  - PostgreSQL 12's Change: Inlining CTEs by Default [[Performance_Optimization_Case_Study/Query_Rewrite/05.CTE_Materialization_Forces_Efficient_Plan#The PostgreSQL 12 Change That Started Everything]]
  - The Solution: The MATERIALIZED Keyword [[Performance_Optimization_Case_Study/Query_Rewrite/05.CTE_Materialization_Forces_Efficient_Plan#The Solution: Forcing CTE Materialization]]
  - When to Force Materialization vs When to Allow Inlining [[Performance_Optimization_Case_Study/Query_Rewrite/05.CTE_Materialization_Forces_Efficient_Plan#When to Use MATERIALIZED and When to Avoid It]]
- Batching Replaces Per-Row Updates (3 Hours → 4 Mins) [[Performance_Optimization_Case_Study/Query_Rewrite/06.Batching_Replaces_Per_Row_Updates]]
  - The Math of Round-Trips: Why Network Latency Kills [[Performance_Optimization_Case_Study/Query_Rewrite/06.Batching_Replaces_Per_Row_Updates#The Write-Ahead Log: Why Bulk Operations Are Easier on the Database Internals]]
  - Solution One: The CASE Expression Batch [[Performance_Optimization_Case_Study/Query_Rewrite/06.Batching_Replaces_Per_Row_Updates#The Migration That Talked to the Database Fifty Million Times: How Batching Replaced Three Hours of Per-Row Updates with Four Minutes]]
  - Solution Three: UPDATE from VALUES (PostgreSQL) [[Performance_Optimization_Case_Study/Query_Rewrite/06.Batching_Replaces_Per_Row_Updates#The Migration That Talked to the Database Fifty Million Times: How Batching Replaced Three Hours of Per-Row Updates with Four Minutes]]
- Avoiding DISTINCT with Proper JOIN (240× Speedup) [[Performance_Optimization_Case_Study/Query_Rewrite/07.Avoiding_DISTINCT_With_Proper_JOIN]]
  - The True Mechanism: Why the JOIN Produces Duplicates [[Performance_Optimization_Case_Study/Query_Rewrite/07.Avoiding_DISTINCT_With_Proper_JOIN#The Query That Built a Mountain to Climb Over: How Replacing JOIN + DISTINCT with EXISTS Achieved a 240× Speedup]]
  - The Memory Spilling Hazard of DISTINCT [[Performance_Optimization_Case_Study/Query_Rewrite/07.Avoiding_DISTINCT_With_Proper_JOIN#The Query That Built a Mountain to Climb Over: How Replacing JOIN + DISTINCT with EXISTS Achieved a 240× Speedup]]
  - The Solution: The Semi-Join (EXISTS) [[Performance_Optimization_Case_Study/Query_Rewrite/07.Avoiding_DISTINCT_With_Proper_JOIN#The Semi-Join: What the Planner Does With EXISTS]]
- Rewriting OR to UNION ALL (Index Unlock) [[Performance_Optimization_Case_Study/Query_Rewrite/08.Rewriting_OR_to_UNION_ALL]]
  - Understanding Why OR Defeats Index Usage [[Performance_Optimization_Case_Study/Query_Rewrite/08.Rewriting_OR_to_UNION_ALL#Understanding Why OR Defeats Index Usage]]
  - The Solution: UNION ALL Gives Each Branch Its Own Index [[Performance_Optimization_Case_Study/Query_Rewrite/08.Rewriting_OR_to_UNION_ALL#The Solution: UNION ALL Gives Each Branch Its Own Index]]
  - Handling Duplicates with UNION vs UNION ALL [[Performance_Optimization_Case_Study/Query_Rewrite/08.Rewriting_OR_to_UNION_ALL#Understanding the UNION vs UNION ALL Choice]]
- Pre-Aggregated Summary Table (45s → 2ms) [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table]]
  - The Problem: Counting the Past Every Morning [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table#The Dashboard That Counted Five Hundred Million Orders Every Morning: How Pre-Aggregation Reduced a 45-Second Load to 2ms]]
  - Understanding the Nature of the Data: Historical Immutability [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table#Understanding the Nature of the Data: Historical Immutability]]
  - The Solution: A Pre-Aggregated Summary Table [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table#The Solution: A Pre-Aggregated Summary Table]]
  - Maintenance Strategy: Incremental Aggregation with Triggers/Jobs [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table#The Solution: A Pre-Aggregated Summary Table]]
- Pushing Filters Into Subquery (3 Mins → 8 Seconds) [[Performance_Optimization_Case_Study/Query_Rewrite/10.Push_Filters_Into_Subquery]]
  - Understanding Query Structure: Inside-Out Evaluation [[Performance_Optimization_Case_Study/Query_Rewrite/10.Push_Filters_Into_Subquery#Understanding the Query Structure: Inside-Out Evaluation]]
  - The Cost of Joining Before Filtering [[Performance_Optimization_Case_Study/Query_Rewrite/10.Push_Filters_Into_Subquery#The Cost of Joining Before Filtering: A Mathematical Perspective]]
  - The Solution: Moving the Filter Inside the Subquery [[Performance_Optimization_Case_Study/Query_Rewrite/10.Push_Filters_Into_Subquery#The Solution: Moving the Filter Inside the Subquery]]

---

## 🛠 Phase 8 — Performance Optimization: Schema Evolution

### 🏗 Structural Schema Redesign Case Studies
- Normalizing Denormalized Table: 80% Storage Saved, 3× Write Throughput [[Performance_Optimization_Case_Study/Schema_Design_Improvement/01.Normalizing_Denormalized_Table]]
  - Measuring Redundancy: Where the Bytes Are Going [[Performance_Optimization_Case_Study/Schema_Design_Improvement/01.Normalizing_Denormalized_Table#Measuring the Redundancy: Where the Bytes Are Going]]
  - The Write Performance Impact: Every Byte Has a Cost [[Performance_Optimization_Case_Study/Schema_Design_Improvement/01.Normalizing_Denormalized_Table#The Write Performance Impact: Every Byte Has a Cost]]
  - The Solution: Normalizing the Redundant Text [[Performance_Optimization_Case_Study/Schema_Design_Improvement/01.Normalizing_Denormalized_Table#The Table That Memorised Everything It Already Knew: How Normalizing a Logging Schema Reduced Storage by 80% and Tripled Write Throughput]]
  - The Zero-Downtime Migration Pattern [[Performance_Optimization_Case_Study/Schema_Design_Improvement/01.Normalizing_Denormalized_Table#The Migration Strategy: Moving from Denormalized to Normalized]]
- Partitioning Old Table: 6-Hour Nightly Delete → 3-Second DROP [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table]]
  - Understanding Why Bulk DELETE is Catastrophically Expensive [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table#Understanding Why Bulk DELETE is Catastrophically Expensive]]
  - The Insight: Data Expiry is a Table-Level Operation [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table#The Insight: Data Expiry is a Table-Level Operation]]
  - How PostgreSQL Range Partitioning Works [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table#How PostgreSQL Range Partitioning Works]]
  - The Solution: Range Partitioning by Date [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table#The Deletion That Took Six Hours Every Night: How Table Partitioning Turned a Nightly I/O Crisis into a Three-Second DROP]]
- Status Column Eliminates Heavy Anti-Join (200× Speedup) [[Performance_Optimization_Case_Study/Schema_Design_Improvement/03.Status_Column_Eliminates_JOIN]]
  - Understanding the Anti-Join: Why It Is Expensive [[Performance_Optimization_Case_Study/Schema_Design_Improvement/03.Status_Column_Eliminates_JOIN#Understanding the Anti-Join: Why It Is Expensive]]
  - The Root Cause: Normalisation in the Wrong Place [[Performance_Optimization_Case_Study/Schema_Design_Improvement/03.Status_Column_Eliminates_JOIN#The Root Cause: Normalisation in the Wrong Place]]
  - The Solution: Add `is_read`, Add a Partial Index [[Performance_Optimization_Case_Study/Schema_Design_Improvement/03.Status_Column_Eliminates_JOIN#The Solution: Add `is_read`, Add a Partial Index]]
- Numeric Instead of VARCHAR: Fixes Sort Order & Restores Indexes [[Performance_Optimization_Case_Study/Schema_Design_Improvement/04.Numeric_Instead_of_VARCHAR]]
  - Understanding Lexicographic vs Numeric Sort Order [[Performance_Optimization_Case_Study/Schema_Design_Improvement/04.Numeric_Instead_of_VARCHAR#Understanding Lexicographic vs Numeric Sort Order]]
  - The Workaround That Cannot Use an Index [[Performance_Optimization_Case_Study/Schema_Design_Improvement/04.Numeric_Instead_of_VARCHAR#The Workaround That Cannot Use an Index]]
  - The Root Cause: Data Stored in the Wrong Type [[Performance_Optimization_Case_Study/Schema_Design_Improvement/04.Numeric_Instead_of_VARCHAR#The Root Cause: Data Stored in the Wrong Type]]
  - The Solution: Changing the Column Type [[Performance_Optimization_Case_Study/Schema_Design_Improvement/04.Numeric_Instead_of_VARCHAR#The Root Cause: Data Stored in the Wrong Type]]

---

## 🎯 Quick Problem-to-Solution Diagnostic Matrix

| Production Symptom | Root Failure Case Study | Recommended Performance Solution |
| :--- | :--- | :--- |
| **Deep pagination timing out** | [[Query_Case/02.Offset_Pagination_Collapse]] | [[Performance_Optimization_Case_Study/Query_Rewrite/02.Cursor_Pagination_Replaces_OFFSET]] |
| **Simple count query freezes dashboard** | [[Query_Case/03.Count_Bottleneck]] | [[Performance_Optimization_Case_Study/Query_Rewrite/03.EXISTS_Replaces_COUNT]] / [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table]] |
| **Parent-child query running N+1 times** | [[Query_Case/1.N+1 Query Disaster]] | Set-oriented batch join or DataLoader |
| **Foreign key delete locks entire child table** | [[Query_Case/05.Missing Foreign Key Index]] / [[index_Case/16.Missing_Foreign_Key_Index]] | [[Performance_Optimization_Case_Study/Index_Optimization/01.Index_Optimization]] |
| **Leading wildcard `%text` kills index** | [[Query_Case/07.Wildcard_leading_like_killer]] | Trigram GIN (`pg_trgm`) or Full-Text search |
| **Query ignores index on transformed column** | [[Query_Case/09.WHERE_Clause_Index_Bypass]] | [[Performance_Optimization_Case_Study/Index_Optimization/04.Expression_Index]] |
| **Multi-column OR bypasses individual indexes** | [[Query_Case/10.OR_Condition_Index_Breakdown]] | [[Performance_Optimization_Case_Study/Query_Rewrite/08.Rewriting_OR_to_UNION_ALL]] |
| **Composite index exists but is ignored** | [[Query_Case/11.Missing_Composite_Index_Order]] | [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index]] |
| **ORDER BY causes disk sort spills in EXPLAIN** | [[Query_Case/12.ORDER_BY_Non-Index_Column_Sort_Spill]] | [[Performance_Optimization_Case_Study/Index_Optimization/05.Composite_Index]] |
| **DISTINCT hides duplicated JOIN rows** | [[Query_Case/14. DISTINCT_Performance_Trap]] | [[Performance_Optimization_Case_Study/Query_Rewrite/07.Avoiding_DISTINCT_With_Proper_JOIN]] |
| **Table bloated by soft-delete queries** | [[Schema_Case/07.The_Missing_Soft_Delete_Index]] | [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index]] |
| **High write volume choked by index updates** | [[index_Case/19.Over-Indexed_Write_Table]] | [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index]] |
| **B-Tree index bloated and fragmented** | [[index_Case/18.Index_Bloat_Explosion]] | `REINDEX CONCURRENTLY` |
| **Index on boolean column ignored** | [[index_Case/21.Index_Low-Cardinality_Boolean_Column]] | [[Performance_Optimization_Case_Study/Index_Optimization/03.Partial_Index]] |
| **Row lock queue under high concurrent writes** | [[Concurrency_Case/01.The_Hot_Row_Bottleneck]] / [[Query_Case/04.Hot_Row_Bottleneck]] | Sharded counters & batching |
| **Deadlock errors under concurrent updates** | [[Concurrency_Case/02.The_Deadlock_Cascade]] | Enforce global primary key acquisition ordering |
| **Concurrent lost updates on row balance** | [[Concurrency_Case/03.The_Lost_Update_Under_Concurrency]] | Atomic SQL increment or Optimistic Locking |
| **Double-booking due to phantom reads** | [[Concurrency_Case/04.The_Phantom_Read_Double_Booking]] | Exclusion constraints (`EXCLUDE USING gist`) |
| **Bulk DELETE freezes production & spikes WAL** | [[Concurrency_Case/06.The_Bulk_Delete_Lock_Explosion]] | [[Performance_Optimization_Case_Study/Schema_Design_Improvement/02.Partitioning_Old_Table]] |
| **Connection pool exhaustion during traffic spike**| [[Connection_Pool_Case/01.The_Connection_Pool_Exhaustion]]| Sizing formula + PgBouncer transaction pooling |
| **Idle connections accumulating and leaking RAM** | [[Connection_Pool_Case/02.The_Idle_Connection_Leak]] | Go `defer rows.Close()` + `idle_in_transaction_session_timeout` |
| **Slow queries causing cascading timeout storm** | [[Connection_Pool_Case/04.The_Cascading_Slow_Query_Timeout_Storm]] | Statement timeouts + Circuit Breakers + Exponential Jitter |
| **Long-running analytics lock live transactions** | [[Connection_Pool_Case/03.The_Long_Running_Transaction_Lock_Escalation]] | [[Performance_Optimization_Case_Study/Query_Rewrite/09.Pre_Aggregated_Summary_Table]] |
