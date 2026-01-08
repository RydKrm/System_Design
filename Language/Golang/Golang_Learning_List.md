# Go Learning TODO Checklist

A structured checklist to master Go from fundamentals to production-level topics.

---

## 🧱 Foundations
- Hello World
-  Variables [[Language/Golang/Docs/01.Variable|01.Variable]]
- Loop [[03.Loop.go]]

---

## 📦 Data Structures
-  Arrays [[02.Array#**Introduction to Arrays in Go**]]
-  Slices[[02.Array#**Slices The Dynamic Arrays of Go**]]
-  Maps [[03.Maps]]
-  Strings[[05.String]]
-  Pointers [[06.Pointer]]

---

## 🧠 Functions
-  Functions [[06.Functions#Introduction Why Functions Exist]]
-  Multiple Return Values[[06.Functions#Basic Function Syntax]]
-  Variadic Functions [[06.Functions#Variadic Functions]]
-  Closures[[07.Closure#]]

---

## 🧩 Structs & Interfaces
-  Structs[[04.Structs]]
-  Methods[[04.01.Methods_Of_Structure]]
-  Interfaces[[07.Interface]]
-  Enums
-  Struct Embedding[[04.Structs#Composition and Embedding]]
-  Generics[[08.Generic]]

---

## ⚠️ Error Handling
-  Errors[[11.Error]]
-  Custom Errors[[11.Error#Custom Error Types]]
-  Panic[[12.Panic_Recover_And_Defer#What is Panic?]]
-  Defer[[12.Panic_Recover_And_Defer#What is Defer?]]
-  Recover[[12.Panic_Recover_And_Defer#What is Recover?]]

---

## 🔁 Concurrency
-  Goroutines[[13.0.Goroutines]]
-  Goroutines Concurrency  [[13.04.Gorourines_Concurrancy]]  [[13.05.Goroutines_Concurrancy_And_Parallalism]]
-  Goroutines Use case [[13.02.Goroutines_Usecase]]
-  Goroutines Internal Architecture [[13.1.Goroutines_Internal_Archetecture]] 
-  Channels[[14.00.Channel_Basic]][[14.01.Channel]]
-  Channel Buffering[[14.02.Channel_Advance#Buffering and Memory]]
-  Channel Synchronization[[14.02.Channel_Advance#Channel Synchronization { channel-synchronization}]]
-  Channel Directions[[14.02.Channel_Advance#Channel Directions { channel-directions}]]
-  Select[[14.02.Channel_Advance#Select Statement { select}]]
-  Timeouts[[14.02.Channel_Advance#Timeouts { timeouts}]]
-  Non-Blocking Channel Operations[[14.02.Channel_Advance#Non-Blocking Channel Operations { non-blocking}]]
-  Closing Channels[[14.02.Channel_Advance#Closing Channels { closing-channels}]]
-  Range over Channels[[14.02.Channel_Advance#Range over Channels { range-channels}]]

---

## 🧵 Concurrency Patterns
-  Worker Pools[[15.Concurrency_Patterns#Worker Pools { worker-pools}]]
-  WaitGroups[[15.Concurrency_Patterns#WaitGroups { waitgroups}]]
-  Rate Limiting[[15.Concurrency_Patterns#Rate Limiting Strategies]]
-  Atomic Counters[[15.Concurrency_Patterns#Atomic Pointers and Values]]
-  Mutexes[[15.Concurrency_Patterns#Mutexes { mutexes}]]
-  Stateful Goroutines[[15.Concurrency_Patterns#Stateful Goroutines { stateful-goroutines}]]

--- 
## ⏱️ Time
-  Timers[[16.Time#Introduction to Time in Go]]
-  Tickers[[16.Time#Tickers]]
-  Epoch [[16.Time#Epoch Time]]
-  Time Formatting / Parsing[[16.Time#Time Formatting and Parsing]]


---

## 🔢 Utilities
-  Sorting[[19.Sorting#Basic Sorting - Primitives { basic-sorting}]]
-  Sorting by Functions[[19.Sorting#Custom Type Sorting { custom-sorting}]]
-  SHA256 Hashes[[17.Encryption_Decryption#What is SHA256?]]
-  Base64 Encoding[[17.Encryption_Decryption#Part 2 Base64 Encoding]]

---

## 📝 Strings & Text
-  String Functions[[05.String#Part 2 String Functions]]
-  String Formatting[[05.String#Part 3 String Formatting]]
-  Text Templates[[05.String#Part 4 Text Templates]]
-  Regular Expressions[[05.String#Part 5 Regular Expressions]]

---
## 📁 Files & OS
-  Reading Files[[18.Files#Reading Files]]
-  Writing Files[[18.Files#Writing Files]]
-  Line Filters[[18.Files#Line Filtering and Processing]]
-  File Paths[[18.Files#File Paths and Cross-Platform Compatibility]]
-  Directories[[18.Files#Directory Operations]]
-  Temporary Files and Directories[[18.Files#Temporary Files and Directories]]
-  Embed Directive[[18.Files#Embedded File Systems]]

---

## 🧪 Testing & Tooling
- Testing and Benchmarking [[20.Testing]]
-  Logging

---

## 🖥️ CLI & Environment
-  Command-Line Arguments [[21.Command#From Basic Arguments to Advanced CLI Tools]]
-  Command-Line Flags[[21.Command#Advanced Flag Patterns]]
-  Command-Line Subcommands[[21.Command#Why Subcommands?]]
-  Environment Variables[[21.Command#Environment Variable Integration]]

---

## 🌐 Networking & Web

-  HTTP Internal Architecture [[22.00.HTTP_Internal_Archetecture]] 
-  HTTP Client [[22.01.HTTP_Server_Client#HTTP Client { http-client}]]
-  HTTP Server[[22.01.HTTP_Server_Client#HTTP Server { http-server}]]
-  TCP Server[[22.01.HTTP_Server_Client#TCP Server { tcp-server}]]
-  HTTP Context [[22.02.HTTP_Context]]


---

## 🧩OOP
- Philosophy [[24.OOP#Go's OOP Philosophy]]
- Encapsulation [[24.OOP#Encapsulation { encapsulation}]]
- Polymorphism [[24.OOP#Polymorphism through Interfaces { polymorphism}]]
- Interface Segregation [[24.OOP#Interface Segregation { interface-segregation}]]
- Dependancy-Injection [[24.OOP#Dependency Injection { dependency-injection}]]

---
## 🔢 Core
- Go Runtime [[25.Go_Runtimes]]
- Go Server [[26.Go_Server]]
- Go Request Response [[27.GO_Request_Response_Cycle]]
- Go Concurrent Request [[28.Go_Concurrent_Request]]


> Progress slowly, practice daily, and revisit concurrency often. This checklist follows the traditional Go learning path used in real-world backend systems.


## 🧰 Tool
-  Build A CLI Tools [[29.Build_A_CLI_Tool]]