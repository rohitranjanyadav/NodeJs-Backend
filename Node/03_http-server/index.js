const http = require("node:http");

const server = http.createServer((req, res) => {
  console.log("Request received");
  res.writeHead(200);
  res.end("Thanks for visiting the server!");
});

server.listen(8000, () => {
  console.log(`Http server is running on port 8000`);
});
