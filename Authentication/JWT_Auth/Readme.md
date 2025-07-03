# Grocery Store Mobile App - JWT Authentication

This document outlines the implementation of JWT (JSON Web Token) authentication for the Grocery Store Mobile App, providing a secure and stateless method for user authentication.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Login](#login)
- [Accessing Protected Resources](#accessing-protected-resources)
- [Token Expiration](#token-expiration)
- [Benefits of JWT Authentication](#benefits-of-jwt-authentication)
- [Real-World Use Case](#real-world-use-case)
- [License](#license)

## Overview

JWT authentication allows users to securely transmit information as a JSON object. It is commonly used for authenticating users in web applications, including mobile apps. This implementation enables users to log in, access their carts, and manage their orders securely.

## Getting Started

### Prerequisites

- Node.js
- Express.js
- JSON Web Token (JWT) library

## Login

When a user logs into the app, they will provide their email and password. The server will verify the credentials and issue a JWT.

### Example Code

```javascript
const jwt = require("jsonwebtoken");

// User login route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate user credentials (placeholder)
  const user = await findUserByEmail(email);
  if (user && validatePassword(password, user.password)) {
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.json({ token });
  }
  res.status(401).send("Invalid credentials");
});
```

## Accessing Protected Resources

Once the user has the JWT, they can access protected resources by sending the token with their requests.

### Example Code

```javascript
// View cart route
app.get("/api/cart", authenticateToken, (req, res) => {
  const cartItems = getCartItems(req.user.id); // Retrieve cart items for the user
  res.json(cartItems);
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) return res.sendStatus(401); // No token provided

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user; // Attach user info to request
    next();
  });
}
```

## Token Expiration

The JWT is valid for a certain period (e.g., 1 hour). After it expires, if the user attempts to access their cart, they will receive an unauthorized error. In this scenario, the user must log in again to obtain a new token.

## Benefits of JWT Authentication

- **Stateless**: The server does not need to store session data, as the JWT contains all the information needed for authentication.
- **Compact**: JWTs are compact and can be easily transmitted in HTTP headers or as URL parameters.
- **Secure**: JWTs can be signed and optionally encrypted, ensuring that the information cannot be tampered with.
- **Cross-Domain Support**: JWTs can be used across different domains, which is useful in microservices or distributed systems.

## Real-World Use Case

When a user logs into the grocery store app, they receive a JWT that allows them to browse products, add items to their cart, and checkout securely, all while ensuring their session remains authenticated without requiring server-side sessions.
