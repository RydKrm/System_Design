const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Simulated user database
const users = {
  user1: "password123", // Example username/password
};

// Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Check credentials
  if (users[username] && users[username] === password) {
    req.session.userId = username; // Store user ID in session
    res.cookie("sessionId", req.session.id); // Set cookie
    return res.send("Login successful!");
  }
  res.status(401).send("Invalid credentials");
});

// Protected Route
app.get("/protected", (req, res) => {
  if (req.session.userId) {
    return res.send(`Welcome, ${req.session.userId}!`);
  }
  res.status(403).send("Access denied. Please log in.");
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(); // Destroy the session
  res.clearCookie("sessionId"); // Clear the cookie
  res.send("Logged out successfully!");
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
