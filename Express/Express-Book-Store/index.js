require("dotenv/config");
const express = require("express");
const bookRouter = require("./routes/book.routes");
const { loggerMiddleware } = require("./middlewares/logger");

const app = express();
const PORT = 4000;

// Middleware
app.use(express.json());

app.use(loggerMiddleware);

function customMiddleware(req, res, next) {
  console.log("I am a custom Middleware");
  next();
}

// Path Middleware->GET,POST any request /books
app.use("/books", function (req, res, next) {
  console.log("Path match middleware");
  next();
});

// app.use(function(req,res,next){
//   console.log("I am Middleware A")
//   next()
// })
// app.use(function(req,res,next){
//   console.log("I am Middleware B")
//   next()
// })

// Routes
app.use("/books", bookRouter);

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
