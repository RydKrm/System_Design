const express = require("express");
const app = express();

const PORT = 3002;

app.use(express.json());

// Route handlers
app.get("/api/order", (req, res) => {
  res.status(200).json({ message: "Health checking from order ..." });
});

app.get("/api/order/hello", (req, res) => {
  console.log("Route /api/order/hello was hit");
  res.status(200).json({
    message: `Hello from order server on ${PORT} `,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Order server is running on port ${PORT}`);
});
