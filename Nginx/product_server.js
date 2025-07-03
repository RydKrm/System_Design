const express = require("express");
const app = express();

const PORT = 3003;

app.get("/api/product", (req, res) => {
  res.status(200).json({ message: "Health checking from product ..." });
});

app.get("/api/product/hello", (req, res) => {
  res.status(200).json({
    message: `Hello from product server on ${PORT} `,
  });
});

app.listen(PORT, () => {
  console.log(`Product server is running on port ${PORT}`);
});
