const express = require("express");
const app = express();

// Middleware to check Basic Auth
const basicAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).send("Authorization header is missing");
  }

  const [type, credentials] = authHeader.split(" ");
  if (type !== "Basic") {
    return res.status(401).send("Invalid authentication type");
  }

  const decodedCredentials = Buffer.from(credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = decodedCredentials.split(":");

  // Check username and password (this would typically query a database)
  if (username === "admin" && password === "password123") {
    return next();
  } else {
    return res.status(401).send("Invalid credentials");
  }
};

app.get("/protected", basicAuth, (req, res) => {
  res.send("Access granted to protected route");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
