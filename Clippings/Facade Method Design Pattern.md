---
title: Facade Method Design Pattern
source: https://www.geeksforgeeks.org/system-design/facade-design-pattern-introduction/
author:
  - "[[Current_Tech_Stack]]"
published: 2017-07-05
created: 2026-05-05
description: "Your All-in-One Learning Portal: GeeksforGeeks is a comprehensive educational platform that empowers learners across domains-spanning computer science and programming, school education, upskilling, commerce, software tools, competitive exams, and more."
tags:
  - clippings
---
The Facade Design Pattern is a [structural pattern](https://www.geeksforgeeks.org/system-design/structural-design-patterns/) pattern that provides a simple and unified interface to a complex subsystem. It hides the internal complexity of the system, making it easier to use and maintain.

- Structuring a system into subsystems helps reduce overall complexity and improves organization. A common design goal is to minimize communication and dependencies between these subsystems.
- The Facade Pattern achieves this by introducing a facade object that acts as a single entry point, providing a simplified interface to the underlying subsystem functionality.

> ****Example:**** In a home automation system, a user controls lights, AC, and security cameras using a single app or panel. The control system acts as a Facade, hiding the complexity of multiple devices. It provides one simple interface to manage all subsystems efficiently.

![Fcade](https://media.geeksforgeeks.org/wp-content/uploads/20250909113721108916/Fcade.webp)

Facade Design Pattern

In the above diagram:

- Multiple clients (Client A, B, C) interact only with the Facade instead of directly accessing subsystem classes.
- The Facade provides a simple method (like doSomething()) and internally coordinates with different subsystem packages.
- Subsystem classes (Package 1–4) handle actual processing, while the Facade hides their complexity from the clients.

> ****Note****: Facade Method Design Pattern provides a unified interface to a set of interfaces in a subsystem. Facade defines a high-level interface that makes the subsystem easier to use.

## Real Life applications

The Facade Pattern is commonly used to provide a simplified interface to complex subsystems in real-world applications.

****1\. Home Automation Systems:**** Provides a single interface to control lighting, heating, and security systems while hiding the complexity of multiple underlying subsystems.

****2\. Video Streaming Platforms:**** Offers a unified interface for encoding, buffering, and video playback, simplifying interaction with complex media processing components.

****3\. Banking Systems:**** Exposes simple methods for balance checks and fund transfers while concealing complex backend operations from the client.

## Components

The Facade Pattern consists of key components that help simplify interactions with complex systems.

![component_of_facade_method_design_pattern](https://media.geeksforgeeks.org/wp-content/uploads/20260121161840033820/component_of_facade_method_design_pattern.webp)

Consider for example a programming environment that gives applications access to its compiler subsystem.

- This subsystem contains classes such as Scanner,Parser, ProgramNode, BytecodeStream, and ProgramNodeBuilder that implement the compiler.
- Compiler class acts as a facade: It offers clients a single, simple interface to the compilersubsystem.
- It glues together the classes that implement compilerfunctionality without hiding themcompletely.
- The compiler facade makes life easier for most programmers without hiding the lower-level functionality from the few that need it.

### 1\. Facade (Compiler)

Provides a simplified interface to interact with the complex compiler subsystem.

- Facade knows which subsystem classes are responsible for a request.
- It delegate client requests to appropriate subsystem objects.

### 2\. Subsystem classes (Scanner, Parser, ProgramNode, etc.)

These classes perform the core functionality of the compiler system.

- Implements subsystem functionality and handles the tasks assigned by the Facade object.
- Has no knowledge of the Facade, meaning it does not maintain any reference to it.

### 3\. Interface

Defines the set of high-level operations that the client can use.

- The Interface in the Facade Design Pattern refers to the set of simplified methods that the facade exposes to the client.
- It hides the complexities of the subsystem, ensuring that clients interact only with high-level operations, without dealing with the underlying details of the system.

## Working

The facade acts as a single entry point that coordinates and delegates requests to multiple subsystem classes.

- Client interacts only with the Facade class instead of multiple subsystem classes.
- Facade internally calls the required methods of different subsystems.
- Subsystem classes remain unchanged and unaware of the facade.
- The facade simplifies complex workflows into easy-to-use operations.

## Uses

The Facade Pattern is used to provide a simplified and unified interface to complex subsystems, making them easier for clients to use.

- Simplifies interaction with complex external systems such as databases or third-party APIs by hiding internal details.
- Helps in layering subsystems by defining clear boundaries and offering simple interfaces for each layer.
- Provides a single unified interface to multiple or diverse systems, improving usability and consistency.
- Shields client code from changes in internal implementations, reducing dependency and maintenance effort.

## Implementation Example

Problem Statement:

> Consider a hotel where multiple restaurants serve different types of food such as veg, non-veg, and mixed options. As a customer, you don’t interact with each restaurant directly or know their menus. Instead, you communicate with the hotel keeper, who understands the system and fetches the required menu for you. This simplifies your interaction by providing a single point of access to multiple services.

![file](https://media.geeksforgeeks.org/wp-content/uploads/20260121165051433300/file.webp)

This example shows the practical application of the design pattern using code.

### 1\. Interface of Hotel

> ****Note****: The hotel interface only returns Menus. Similarly, the Restaurant are of three types and can implement the hotel interface. Let’s have a look at the code for one of the Restaurants.

### 2\. NonVegRestaurant

### 3\. VegRestaurant

### 4\. VegNonBothRestaurant

****Now consider the facade Design Pattern with the help of code:****

### 1\. HotelKeeper

### 2\. HotelKeeper Implementation

> ****Note****: From this, It is clear that the complex implementation will be done by HotelKeeper himself. The client will just access the Hotel Keeper and ask for either Veg, NonVeg or VegNon Both Restaurant menu.

****How will the client program access this facade?****

In this way, the implementation is sent to the facade. The client is given just one interface and can access only that. This hides all the complexities.

## Advantages

The Facade Pattern simplifies interaction with complex systems by providing a unified and easy-to-use interface.

- ****Simplified Interface:**** Provides a clear interface while hiding system complexities.
- ****Reduced Coupling:**** Minimizes client dependency on system internals and promotes modularity.
- ****Encapsulation:**** Shields clients from subsystem changes by wrapping complex interactions.
- ****Improved Maintainability:**** Enables easier system changes, refactoring, and extensions without affecting clients.

## Disadvantages

While useful, the Facade Pattern can introduce limitations and additional abstraction in certain scenarios.

- ****Increased Complexity:**** Adds another abstraction layer, making code harder to understand and debug.
- ****Reduced Flexibility:**** Limits direct access to specific subsystem functionalities.
- ****Overengineering:**** Can add unnecessary complexity in simple systems.
- ****Potential Performance Overhead:**** Extra indirection may impact performance in critical scenarios.

7 Questions