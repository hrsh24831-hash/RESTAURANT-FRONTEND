const express = require("express");
const path = require("path");

const app = express();

// 🔥 IMPORTANT: serve frontend folder as root
app.use(express.static(path.join(__dirname)));

app.listen(3000, () => {
  console.log("Frontend running at http://127.0.0.1:3000");
});
