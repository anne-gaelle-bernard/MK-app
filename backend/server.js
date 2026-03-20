const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MK App backend running",
    stack: "JavaScript backend"
  });
});

app.listen(port, () => {
  console.log(`MK App backend listening on http://localhost:${port}`);
});
