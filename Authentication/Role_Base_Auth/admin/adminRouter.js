const express = require("express");
const jwt = require("jsonwebtoken");
const auth = require("../auth");
const adminRouter = express.Router();

// Simulate an array as a database for storing users

/**
 * Admin Registration Route
 * POST /register
 *
 * This route registers a new admin by accepting a `username`, `email`, and `password`.
 * The details are pushed into the `userList` array, simulating a database.
 *
 * @param {string} req.body.username - The username of the new admin.
 * @param {string} req.body.email - The email address of the new admin.
 * @param {string} req.body.password - The password of the new admin.
 *
 * @returns {Object} - A success message and status 201 if the admin is created successfully,
 * or a 400 status with an error message if any required fields are missing.
 */
adminRouter.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  // Check if all required fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide username, email, and password",
    });
  }

  // Simulate saving the user to a database by adding them to the userList array
  userList.push({ ...req.body, _id: userList.length + 1 });

  return res.status(201).json({
    success: true,
    message: "User created successfully",
  });
});

/**
 * Admin Login Route
 * POST /login
 *
 * This route handles admin login by checking the provided `email` and `password`.
 * If the credentials are correct, a JWT token is generated with the user's ID and role.
 *
 * @param {string} req.body.email - The email address used to log in.
 * @param {string} req.body.password - The password used to log in.
 *
 * @returns {Object} - A success message with a JWT token if the login is successful,
 * or error messages with appropriate status codes for invalid credentials or missing fields.
 */
adminRouter.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Check if both email and password are provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  // Check if the user exists in the simulated database (userList)
  const user = userList.find((user) => user.email === email);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check if the provided password matches the stored password
  if (user.password !== password) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Generate a JWT token with the user's ID and role
  const token = jwt.sign(
    { _id: user._id, role: "admin" },
    process.env.JWT_TOKEN,
    { expiresIn: "1h" } // Token expires in 1 hour
  );

  return res.status(200).json({
    success: true,
    message: "User logged in successfully",
    token,
  });
});

/**
 * Get All Users (Admin-only)
 * GET /getAllUser
 *
 * This route fetches all users. It is restricted to users with the "admin" role.
 * The `auth` middleware ensures that only users with the correct role (admin) can access this route.
 *
 * @param {Array} roles - Array of roles allowed to access this route (in this case, only 'admin').
 *
 * @returns {Object} - A list of all users if the request is successful,
 * or an error message with status 404 if no users are found.
 */
adminRouter.get("/getAllUser", auth(["admin"]), (req, res) => {
  // Simulate fetching all users
  const user = userList;
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  return res.status(200).json({
    success: true,
    user,
  });
});

module.exports = adminRouter;
