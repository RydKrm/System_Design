// API1-2023-Broken-Object-Level-Authorization/user/user_route.js

const auth = require("../auth");

const express = require("express");
const jwt = require("jsonwebtoken");
const userRouter = express.Router();

// Simulate an array as a database for storing users
exports.userList = [];

/**
 * User Registration Route
 * POST /register
 *
 * This route registers a new user by accepting `username`, `email`, and `password`.
 * The user details are pushed into the `userList` array, simulating a database.
 *
 * @param {string} req.body.username - The username of the new user.
 * @param {string} req.body.email - The email address of the new user.
 * @param {string} req.body.password - The password of the new user.
 *
 * @returns {Object} - A success message and status 201 if the user is created successfully,
 * or a 400 status with an error message if any required fields are missing.
 */
userRouter.post("/register", (req, res) => {
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
 * User Login Route
 * POST /login
 *
 * This route handles user login by checking the provided `username` and `password`.
 * If the credentials are correct, a JWT token is generated with the user's ID and role.
 *
 * @param {string} req.body.username - The username used to log in.
 * @param {string} req.body.password - The password used to log in.
 *
 * @returns {Object} - A success message with a JWT token if the login is successful,
 * or error messages with appropriate status codes for invalid credentials or missing fields.
 */
userRouter.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Check if both username and password are provided
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide username and password",
    });
  }

  // Check if the user exists in the simulated database (userList)
  const user = userList.find((user) => user.username === username);
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
    { _id: user._id, role: "user" },
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
 * Get User Information
 * GET /getUserInfo
 *
 * This route retrieves the logged-in user's information using the JWT token.
 * The `auth` middleware ensures that only users with the correct role can access this route.
 *
 * @param {Array} roles - Array of roles allowed to access this route (in this case, only 'user').
 *
 * @returns {Object} - The user's information if found,
 * or an error message with status 404 if the user is not found.
 */
userRouter.get("/getUserInfo", auth(["user"]), async (req, res) => {
  const userId = req.user._id;

  // Find the user in the simulated database (userList) by ID
  const user = userList.find((user) => user._id === userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Return user information
  return res.status(200).json({
    success: true,
    user,
  });
});

module.exports = userRouter;
