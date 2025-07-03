# What is Session based auth?

Session-based authentication is a widely used method for managing user sessions on a web application. It involves creating a session on the server when a user logs in and using that session to track the user's authentication status.

### Key Concepts:

- **Session Creation:** When a user successfully logs in, the server creates a session and stores it in memory or a database. A unique session ID is generated, which identifies the session.

- **Session Storage:** The server can store session data (like user ID, permissions, etc.) on the server-side, allowing for secure data management.

- **Session ID:** The server sends the session ID back to the client as a cookie. This ID is used to identify the user's session on subsequent requests.

- **Automatic Sending:** The browser automatically includes the session cookie with each request to the server.

- **Session Validation:** For each incoming request, the server retrieves the session ID from the cookie, checks if it matches a valid session, and authenticates the user based on the session data.

- **Session Expiration:** Sessions typically have a time limit (session expiration) to enhance security. The server can also invalidate a session when the user logs out.

### Advantages:

- **Statefulness:** The server maintains the session state, making it easier to manage user data and permissions.
- **Security:** Sensitive information is stored on the server, reducing the risk of exposure.

### Disadvantages:

- **Scalability:** Managing sessions can become complex in distributed systems or when scaling horizontally, as session data must be shared across multiple servers.
- **Resource Usage:** Sessions consume server resources, and improperly managed sessions can lead to resource exhaustion.
