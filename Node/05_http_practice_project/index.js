const fs = require("node:fs");
const http = require("node:http");

const server = http.createServer(function (req, res) {
  const method = req.method;
  const path = req.url;

  const log = `[${Date.now()}: ${method} ${path}]\n`;

  fs.appendFileSync("log.txt", log);

  switch (method) {
    case "GET":
      switch (path) {
        case "/":
          return res.writeHead(200).end("Hello from the server👋");
        case "/contact-us":
          return res.writeHead(200).end("Email: rowhit0831@gmail.com");
        case "/tweet":
          return res.writeHead(200).end("\nTweet1\nTweet2");
      }
      break;
    case "POST":
      switch (path) {
        case "/tweet":
          return res.writeHead(201).end("Tweet created");
      }
  }

  res.writeHead(404).end("Not Found");
});

server.listen(8000, () => console.log(`HTTP Server is running on PORT:8000`));
