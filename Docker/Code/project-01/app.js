const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.get("/health", async (req, res) => {
  res.status(200).json({
    message: "Health is okay",
  });
});
const port = 8000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
