# Cookie-based-authentication

Cookie-based authentication is a method where the server generates a unique session ID upon user login and sends it back to the client's browser as a cookie. This cookie is stored on the client's machine and is sent with each subsequent request to the server. The server validates the cookie to authenticate the user.

### Key Points:

- **Login:** User provides credentials (e.g., username and password). If valid, the server creates a session and sends a cookie with the session ID.
- **Storage:** The cookie can be stored in memory or on disk, depending on the browser settings.
- **Automatic Sending:** The cookie is automatically included in the header of HTTP requests to the server.
- **Validation:** The server checks the session ID in the cookie to verify the user's identity.
- **Security:** Cookies can have attributes like HttpOnly, Secure, and SameSite to enhance security.

### Advantages:

- Simplifies the user experience by keeping the user logged in across sessions.
- Stateless from the server's perspective, reducing server load.

### Disadvantages:

- Vulnerable to attacks like Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) if not properly secured.
