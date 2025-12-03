const express = require('express');
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello from the App!");
});

module.exports = router;
