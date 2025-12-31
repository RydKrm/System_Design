## 📖 SQL Operation 
- SQL Operation [[SQL_Operation]]

## 📑Database Problem List 
- SQL Problem [[SQL_Problem]]

## 🫥 Transection

- What and Why? [[transection#1.1 What is a Transaction?]]
- Concurrency Problems
- Dirty Read [[transection#2.1 Dirty Read]]
- Non-Repeatable Read [[transection#2.2 Non-Repeatable Read]]
- Phantom Read [[transection#2.3 Phantom Read]]
- Transaction Isolation Level
- Read Uncommitted [[transection#3.1 READ UNCOMMITTED (Level 0)]]
- Read Committed [[transection#3.2 READ COMMITTED (Level 1)]]
- Repeatable Read [[transection#3.3 REPEATABLE READ (Level 2)]]
- Serializable [[transection#3.4 SERIALIZABLE (Level 3)]]
- Best Practices [[transection#Chapter 5 Practical Solutions and Best Practices]]

## 🧃 Database Storage

 -  Table Foundation [[01.storage#1. **Table The Foundation**]]
 - Row ID [[01.storage#2. **Row_ID The Unique Identifier**]]
 - I/O [[01.storage#4. **IO (Input/Output) The Data Highway**]]
 - Database Heap [[01.storage#5. **Database Heap Structure The Unordered Storage**]]
 - Index Data Structure [[01.storage#6. **Index Data Structure B-Tree (The Smart Organizer)**]]
 - Row Oriented Database [[02.row_base_db_vs_col_base_db#**Part 1 Row-Based (Row-Oriented) Databases**]]
 - Column Oriented Database [[02.row_base_db_vs_col_base_db#**Part 2 Column-Based (Column-Oriented) Databases**]]

## 📇 Index

- introduction [[index#Chapter 1 Introduction to Database Indexes]]
- How It Work [[index#Chapter 2 How Indexes Work Inside the Database]]
- Index Memory management [[index#Chapter 3 Index Memory Management System]]
- Create Index [[index#Chapter 4 Creating Indexes on Columns]]
- Multiple Column Index [[index#Chapter 5 Multiple Column Indexes (Composite Indexes)]]
- Query Execution [[index#Chapter 6 Query Execution with Indexes]]
- Best Practice [[index#Chapter 7 Real-World Examples and Best Practices]]

## "🔭" Database Scan

- Introduction [[scaning#Introduction]]
- Table Scan [[scaning#Table Scan (Sequential Scan)]]
- Index Scan [[scaning#Index Scan]]
- Bitmap Scan [[scaning#Bitmap Scan]]
- Time Complexity [[scaning#Time Complexity Analysis]]
- Space Complexity [[scaning#Space Complexity Analysis]]
- Practical Recommendation [[scaning#Practical Recommendations]]

## 🌴Database Tree

- What and Why? [[01.Database_Tree#Chapter 1 Why Do We Need Trees in Databases?]]
- Understanding Binary Search Tree [[01.Database_Tree#Chapter 2 Understanding Binary Search Trees (BST)]]
- Problem With Binary Tree [[01.Database_Tree#Chapter 3 The Problem with Binary Trees in Databases]]
- B Tree [[01.Database_Tree#Chapter 4 B-Trees The Database Solution]]
- B+ Tree [[01.Database_Tree#Chapter 5 B+ Trees The Most Popular Choice]]
- B+ Tree Data Storage [[01.Database_Tree#Chapter 6 How Data is Stored in B+ Trees]]
- B+ Tree Query Works [[01.Database_Tree#Chapter 7 How Queries Work in B+ Trees]]
- All Usecase of DB Tree [[01.Database_Tree#Chapter 8 All Use Cases of Database Trees]]


## 💫 Partition
- What and Why? [[01.Partition#What is Database Partitioning?]][[01.Partition#Why Do We Need Partitioning?]]
- Benefits of Partitioning [[01.Partition#Benefits of Partitioning]]
- Types of Partitioning [[01.Partition#Types of Partitioning]]
- Practical Implementation [[01.Partition#Practical Implementation]]
- CRUD Operation [[01.Partition#CRUD Operations in Partitioned Tables]]
- Performance Comparison [[01.Partition#Performance Comparison]]
- Best Practices [[01.Partition#Best Practices]]

## 🔒 Database Lock 

- Why Need Locks? [[01.exclusive_and_shared_locking#Understanding Why We Need Database Locks]]
- Two Types of Locks [[01.exclusive_and_shared_locking#The Two Fundamental Types of Locks]]
- Lock Compatibility Matrix [[01.exclusive_and_shared_locking#Lock Compatibility Matrix]]
- How Lock Works [[01.exclusive_and_shared_locking#How Locks Work During CRUD Operations]]
- Deadlock [[01.exclusive_and_shared_locking#Deadlocks When Locks Go Wrong]]
- Isolation Level and Locking [[01.exclusive_and_shared_locking#Isolation Levels and Locking Behavior]]

## ❗ Concurrency Issues

- Deadlock [[01.Concurrency_Issues#1. Deadlock in Database]]
- Two Phase Locking Protocol [[01.Concurrency_Issues#2. Two-Phase Locking (2PL) Protocol]]
- Race Condition [[01.Concurrency_Issues#3. Race Condition in Database]]

## 🖱 Database Cursors 

- What and Why? [[01.Cursors#What is a Database Cursor?]]
- How it's works [[01.Cursors#How Database Cursors Work The Internal Mechanism]]
- Server-side VS Client Side cursor [[01.Cursors#Server-Side Cursors vs Client-Side Cursors]]
- Performance Comparison [[01.Cursors#Performance Comparison and Trade-offs]]
- Best Practices [[01.Cursors#Modern Alternatives and Best Practices]]

## 🔁 Database Replica

- Why we need replica?? [[01.Why_we_need_it]]
- Master Slave Replica [[02.Master_Slave]]
- Master Master Replica [[03.Master_Master]]