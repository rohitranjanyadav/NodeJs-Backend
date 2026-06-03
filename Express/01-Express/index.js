const express = require("express");

const app = express();

app.get("/", function (req, res) {
  res.end("HomePage");
});

app.get("/contact-us", function (req, res) {
  res.end("Contact us at: rowhit0831@gmail.com");
});

app.post("/comment", function (req, res) {
  res.status(201).end("Commented!");
});

app.listen(8000, () => console.log(`Server is running on PORT: 8000`));
