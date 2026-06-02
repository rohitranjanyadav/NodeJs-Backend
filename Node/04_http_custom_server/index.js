const http = require("node:http");

const server = http.createServer((req, res) => {
  console.log(`Incoming request at [${Date.now()}]`);
  console.log(req.headers);
  console.log(req.method);

  switch (req.url) {
    case "/":
      res.writeHead(200);
      return res.end("Home Page");
    case "/about":
      res.writeHead(200);
      return res.end("I am Rohit");
    case "/contact":
      res.writeHead(200);
      return res.end("Contact at rowhit0831@gmail.com");
    default:
      res.writeHead(404);
      res.end("page not found");
  }
});

server.listen(8000, () => console.log(`Server is running on PORT:8000`));
