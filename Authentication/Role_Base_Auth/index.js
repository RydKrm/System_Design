const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const userRouter = require("./user/user_route");
const adminRouter = require("./admin/adminRouter");

// Initialize dotenv to load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Basic route
app.get("/", (req, res) => {
  res.send("Hello World! From API1-2023-Broken-Object-Level-Authorization");
});

app.use("/api/user", userRouter);

app.use("/api/admin", adminRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
