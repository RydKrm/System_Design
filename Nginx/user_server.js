const express = require("express");
const app = express();

const PORT = 3001;

app.get("/api/user", (req, res) => {
  res.status(200).json({ message: "Health checking from user ..." });
});

app.get("/api/user/hello", (req, res) => {
  res.status(200).json({
    message: `Hello from user server on ${PORT} `,
  });
});

app.listen(PORT, () => {
  console.log(`User server is running on port ${PORT}`);
});
